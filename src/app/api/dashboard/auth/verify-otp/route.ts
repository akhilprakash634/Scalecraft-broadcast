import { NextResponse } from 'next/server';
import { getAgentClientByBotNumber, clearAgentClientOtp } from '@/lib/agents';
import { signJWT } from '@/lib/jwt';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit } from '@/lib/rateLimit';
import bcrypt from 'bcryptjs';

// Random password generator
function generatePassword() {
  const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const all = letters + numbers;
  let pass = '';
  pass += letters[Math.floor(Math.random() * letters.length)];
  pass += numbers[Math.floor(Math.random() * numbers.length)];
  for (let i = 2; i < 8; i++) {
    pass += all[Math.floor(Math.random() * all.length)];
  }
  return pass.split('').sort(() => 0.5 - Math.random()).join('');
}

export async function POST(request: Request) {
  try {
    const { botNumber, otp } = await request.json();
    if (!botNumber || !otp) {
      return NextResponse.json({ error: 'WhatsApp bot number and OTP are required' }, { status: 400 });
    }

    const cleanedBotNumber = botNumber.replace(/\D/g, '');

    // Rate Limit: max 5 attempts per phone per 15 minutes
    const limitResult = await checkRateLimit(`verify_otp:${cleanedBotNumber}`, 5, 15);
    if (!limitResult.allowed) {
      return NextResponse.json({ error: 'Too many verification attempts. Please try again after 15 minutes.' }, { status: 429 });
    }
    const clientRecord = await getAgentClientByBotNumber(cleanedBotNumber);

    if (!clientRecord) {
      return NextResponse.json({ error: 'Client record not found' }, { status: 404 });
    }

    const { currentOtp, otpExpiresAt } = clientRecord;

    if (!currentOtp || !otpExpiresAt) {
      return NextResponse.json({ error: 'No OTP requested for this number' }, { status: 400 });
    }

    // Check if expired
    const isExpired = new Date(otpExpiresAt) < new Date();
    if (isExpired) {
      await clearAgentClientOtp(clientRecord._id);
      return NextResponse.json({ error: 'OTP has expired. Please request a new one.' }, { status: 400 });
    }

    // Check match
    if (currentOtp.trim() !== otp.trim()) {
      return NextResponse.json({ error: 'Invalid OTP code. Please try again.' }, { status: 400 });
    }

    // Success: clear OTP to prevent replay attacks
    await clearAgentClientOtp(clientRecord._id);

    // Auto-heal: ensure this client exists in Supabase portal_users
    try {
      const { data: existingUsers } = await supabaseAdmin
        .from('portal_users')
        .select('id, password_hash')
        .eq('bot_phone', cleanedBotNumber)
        .order('portal_created_at', { ascending: false });

      const existingUser = existingUsers && existingUsers.length > 0 ? existingUsers[0] : null;

      if (!existingUser) {
        console.log('[OTP Login] Client not in Supabase. Auto-healing...');

        // Get or generate a password hash for this client
        let passwordHash = clientRecord.portalPassword;
        let plainPassword: string | null = null;

        if (!passwordHash) {
          plainPassword = generatePassword();
          passwordHash = await bcrypt.hash(plainPassword, 10);

          // Save the hash back to Supabase so password login works too
          const { updateClient } = await import('@/lib/db');
          await updateClient(clientRecord._id, {
            portal_password: passwordHash,
            portal_created_at: new Date().toISOString()
          });
          console.log('[OTP Login] Generated and saved new portal password to Supabase.');
        }

        // Upsert into portal_users
        const { error: userErr } = await supabaseAdmin
          .from('portal_users')
          .upsert({
            client_id: clientRecord._id,
            bot_phone: clientRecord.whatsappBotNumber,
            email: (clientRecord.email || '').toLowerCase().trim(),
            owner_name: clientRecord.ownerName || '',
            business_name: clientRecord.businessName || '',
            password_hash: passwordHash,
            portal_created_at: clientRecord.portalCreatedAt || new Date().toISOString(),
          }, { onConflict: 'client_id' });

        if (userErr) {
          console.error('[OTP Login] Auto-heal portal_users upsert error:', userErr.message);
        } else {
          console.log('[OTP Login] Auto-heal: portal_users synced for', clientRecord.whatsappBotNumber);
        }

        // Upsert into installation_status
        const { error: statusErr } = await supabaseAdmin
          .from('installation_status')
          .upsert({
            client_id: clientRecord._id,
            status: clientRecord.status || 'pending',
            current_step: 0,
            step_description: 'Migrated from Sanity via OTP login',
            license_key: clientRecord.licenseKey || '',
            server_ip: clientRecord.serverIP || '',
            updated_at: new Date().toISOString(),
          }, { onConflict: 'client_id' });

        if (statusErr) {
          console.error('[OTP Login] Auto-heal installation_status upsert error:', statusErr.message);
        } else {
          console.log('[OTP Login] Auto-heal: installation_status synced for', clientRecord._id);
        }
      } else {
        // Update last login timestamp
        await supabaseAdmin
          .from('portal_users')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', existingUser.id);
      }
    } catch (syncErr: any) {
      console.error('[OTP Login] Supabase auto-heal exception (non-fatal):', syncErr.message);
    }

    // Create JWT Session
    const payload = {
      clientId: clientRecord._id,
      botNumber: clientRecord.whatsappBotNumber,
      businessName: clientRecord.businessName,
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days expiration
      iat: Math.floor(Date.now() / 1000),
    };

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return NextResponse.json({ error: 'Server authentication configuration error' }, { status: 500 });
    }
    const token = await signJWT(payload, secret);

    const response = NextResponse.json({ success: true, message: 'Logged in successfully' });

    // Set HTTP-only secure cookie
    response.cookies.set('scalecraft_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Verify OTP Endpoint Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
