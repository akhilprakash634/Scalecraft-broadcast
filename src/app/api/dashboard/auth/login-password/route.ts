import { NextResponse } from 'next/server';
import { getAgentClientByBotNumber } from '@/lib/agents';
import { signJWT } from '@/lib/jwt';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit } from '@/lib/rateLimit';
import bcrypt from 'bcryptjs';

function getClientIP(request: Request): string {
  return request.headers.get('x-forwarded-for')
    ?.split(',')[0]?.trim() || 
    request.headers.get('x-real-ip') || 
    'unknown';
}

// Auto-heal: Sync a Sanity client into Supabase portal_users & installation_status
async function syncClientToSupabase(clientRecord: any, passwordHash: string) {
  try {
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
      console.error('[Login] Auto-heal portal_users upsert error:', userErr.message);
    } else {
      console.log('[Login] Auto-heal: portal_users record synced for', clientRecord.whatsappBotNumber);
    }

    const { error: statusErr } = await supabaseAdmin
      .from('installation_status')
      .upsert({
        client_id: clientRecord._id,
        status: clientRecord.status || 'pending',
        current_step: 0,
        step_description: 'Migrated from Sanity',
        license_key: clientRecord.licenseKey || '',
        server_ip: clientRecord.serverIP || '',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'client_id' });

    if (statusErr) {
      console.error('[Login] Auto-heal installation_status upsert error:', statusErr.message);
    } else {
      console.log('[Login] Auto-heal: installation_status record synced for', clientRecord._id);
    }
  } catch (err: any) {
    console.error('[Login] Auto-heal exception:', err.message);
  }
}

export async function POST(request: Request) {
  try {
    const ip = getClientIP(request);
    const limitResult = await checkRateLimit(`login_password:${ip}`, 5, 15);
    if (!limitResult.allowed) {
      return NextResponse.json({ error: 'Too many login attempts. Please try again after 15 minutes.' }, { status: 429 });
    }

    const { botPhone, botNumber, password } = await request.json();
    const phoneInput = botPhone || botNumber;

    if (!phoneInput || !password) {
      return NextResponse.json({ error: 'WhatsApp bot number and password are required' }, { status: 400 });
    }

    const cleanedBotNumber = phoneInput.replace(/\D/g, '');
    // Query Supabase first
    const { data: portalUsers, error: supabaseErr } = await supabaseAdmin
      .from('portal_users')
      .select('*')
      .eq('bot_phone', cleanedBotNumber)
      .order('portal_created_at', { ascending: false });

    if (supabaseErr) {
      console.error('[Login] Supabase query error:', supabaseErr.message);
    }

    const portalUser = portalUsers && portalUsers.length > 0 ? portalUsers[0] : null;

    let resolvedClientId = '';
    let businessName = '';
    let resolvedBotNumber = '';
    let passwordHash = '';
    let needsSync = false;
    let sanityRecord: any = null;

    if (portalUser) {
      resolvedClientId = portalUser.client_id;
      businessName = portalUser.business_name;
      resolvedBotNumber = portalUser.bot_phone;
      passwordHash = portalUser.password_hash;
    } else {
      // Fallback to Sanity for old clients
      const clientRecord = await getAgentClientByBotNumber(cleanedBotNumber);
      if (!clientRecord) {
        return NextResponse.json({ error: 'Incorrect bot number or password.' }, { status: 401 });
      }

      if (!clientRecord.portalPassword) {
        return NextResponse.json({ 
          error: 'No password set for this account. Please login using the OTP method.' 
        }, { status: 401 });
      }

      resolvedClientId = clientRecord._id;
      businessName = clientRecord.businessName;
      resolvedBotNumber = clientRecord.whatsappBotNumber;
      passwordHash = clientRecord.portalPassword;
      sanityRecord = clientRecord;
      needsSync = true;
    }

    // Compare hashed password
    const isPasswordMatch = await bcrypt.compare(password, passwordHash);
    if (!isPasswordMatch) {
      return NextResponse.json({ error: 'Incorrect bot number or password.' }, { status: 401 });
    }

    // Auto-heal: sync this Sanity client into Supabase now that we've confirmed their password works
    if (needsSync && sanityRecord) {
      syncClientToSupabase(sanityRecord, passwordHash); // fire-and-forget
    }

    // Log the login timestamp to Supabase if the user exists in portal_users
    if (portalUser) {
      await supabaseAdmin
        .from('portal_users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', portalUser.id);
    }

    // Create JWT Session
    const payload = {
      clientId: resolvedClientId,
      botNumber: resolvedBotNumber,
      businessName: businessName,
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
    console.error('Password Login API Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
