import { NextResponse } from 'next/server';
import { signJWT } from '@/lib/jwt';
import { supabaseAdmin } from '@/lib/supabase';
import { verify } from 'otplib';
import { logAdminAction } from '@/lib/adminAudit';
import { sendAdminAlert } from '@/lib/whatsapp';

function getClientIP(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
}

export async function POST(request: Request) {
  const ip = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || '';

  try {
    const body = await request.json();
    const { password, totpCode, website } = body;

    // Honeypot field check
    if (website) {
      console.warn(`[Admin Login] Honeypot field filled by bot from IP ${ip}`);
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 400 });
    }

    // Check Lockout
    const { data: lockoutRecord } = await supabaseAdmin
      .from('admin_config')
      .select('*')
      .eq('key', `lockout_until:ip:${ip}`)
      .maybeSingle();

    if (lockoutRecord && lockoutRecord.value) {
      const lockoutTime = new Date(lockoutRecord.value).getTime();
      if (lockoutTime > Date.now()) {
        return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
      }
    }

    const adminSecret = process.env.ADMIN_SECRET;
    if (!adminSecret) {
      console.error('ADMIN_SECRET environment variable is not configured');
      return NextResponse.json({ error: 'Admin access not configured on server' }, { status: 500 });
    }

    // Verify password
    if (password !== adminSecret) {
      return await handleFailedAttempt(ip, request);
    }

    // Check if 2FA is enabled
    const { data: enabledRecord } = await supabaseAdmin
      .from('admin_config')
      .select('*')
      .eq('key', 'totp_enabled')
      .maybeSingle();

    const is2faEnabled = enabledRecord?.value === 'true';

    if (is2faEnabled) {
      if (!totpCode) {
        // First step password verified, require TOTP code
        return NextResponse.json({ requires2fa: true });
      }

      // Fetch TOTP secret
      const { data: secretRecord } = await supabaseAdmin
        .from('admin_config')
        .select('*')
        .eq('key', 'totp_secret')
        .maybeSingle();

      const totpSecret = secretRecord?.value || process.env.ADMIN_TOTP_SECRET;

      if (!totpSecret) {
        return NextResponse.json({ error: '2FA is enabled but secret is missing on server' }, { status: 500 });
      }

      // Verify TOTP code using otplib functional verify API
      const result = await verify({
        token: totpCode,
        secret: totpSecret,
      });
      let isValid = result?.valid || false;

      // If not valid, check backup codes
      if (!isValid) {
        const { data: backupRecord } = await supabaseAdmin
          .from('admin_config')
          .select('*')
          .eq('key', 'backup_codes')
          .maybeSingle();

        if (backupRecord && backupRecord.value) {
          const backupCodes = JSON.parse(backupRecord.value);
          if (backupCodes.includes(totpCode)) {
            const newBackupCodes = backupCodes.filter((c: string) => c !== totpCode);
            await supabaseAdmin.from('admin_config').upsert({
              key: 'backup_codes',
              value: JSON.stringify(newBackupCodes),
            });
            isValid = true;
          }
        }
      }

      if (!isValid) {
        return await handleFailedAttempt(ip, request);
      }
    }

    // Success: reset attempts
    await supabaseAdmin.from('admin_config').delete().eq('key', `login_attempts:ip:${ip}`);
    await supabaseAdmin.from('admin_config').delete().eq('key', `lockout_until:ip:${ip}`);

    // Create JWT Session
    const payload = {
      role: 'admin',
      ip: ip,
      ua: userAgent,
      exp: Math.floor(Date.now() / 1000) + 4 * 60 * 60, // 4 hours expiration
      iat: Math.floor(Date.now() / 1000),
    };

    const token = await signJWT(payload, adminSecret);
    const response = NextResponse.json({ success: true, message: 'Logged in as Admin successfully' });

    response.cookies.set('scalecraft_admin_session', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 4 * 60 * 60, // 4 hours in seconds
      path: '/',
    });

    // Log success login
    await logAdminAction('Admin Login', { success: true }, request);

    return response;
  } catch (error: any) {
    console.error('Admin Login Endpoint Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

async function handleFailedAttempt(ip: string, request: Request) {
  // Fetch existing attempts
  const { data: attemptsRecord } = await supabaseAdmin
    .from('admin_config')
    .select('*')
    .eq('key', `login_attempts:ip:${ip}`)
    .maybeSingle();

  const attempts = attemptsRecord ? parseInt(attemptsRecord.value, 10) : 0;
  const newAttempts = attempts + 1;

  if (newAttempts >= 3) {
    const lockoutTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    await supabaseAdmin.from('admin_config').upsert({
      key: `lockout_until:ip:${ip}`,
      value: lockoutTime,
    });
    await supabaseAdmin.from('admin_config').delete().eq('key', `login_attempts:ip:${ip}`);

    // Log failed login audit
    await logAdminAction('Admin Login Fail', { success: false, attempts: newAttempts, lockout: true }, request);

    // Send Alert WhatsApp to Owner
    const alertMessage = `⚠️ ScaleCraft Admin Alert!\nFailed login attempts from IP: ${ip}\nTime: ${new Date().toLocaleString()}\nAction: Admin login locked for 30 minutes.\n\nIf this wasn't you, check your security immediately.\nContact: +91 80780 04732`;
    await sendAdminAlert(alertMessage);

    return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
  } else {
    await supabaseAdmin.from('admin_config').upsert({
      key: `login_attempts:ip:${ip}`,
      value: newAttempts.toString(),
    });

    // Log failed login audit
    await logAdminAction('Admin Login Fail', { success: false, attempts: newAttempts, lockout: false }, request);

    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }
}
