import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateSecret, verify, generateURI } from 'otplib';
import qrcode from 'qrcode';
import { logAdminAction } from '@/lib/adminAudit';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, code } = body;

    // Check if 2FA is already set up
    const { data: enabledRecord } = await supabaseAdmin
      .from('admin_config')
      .select('*')
      .eq('key', 'totp_enabled')
      .maybeSingle();

    const is2faEnabled = enabledRecord?.value === 'true';

    if (is2faEnabled) {
      return NextResponse.json({ error: '2FA is already set up and enabled' }, { status: 400 });
    }

    if (action === 'generate') {
      // Generate TOTP secret using otplib functional API
      const secret = generateSecret();
      const otpauthUrl = generateURI({
        secret,
        label: 'admin',
        issuer: 'ScaleCraft',
      });
      const qrCodeDataUrl = await qrcode.toDataURL(otpauthUrl);

      // Save secret to database as temporary secret
      await supabaseAdmin.from('admin_config').upsert({
        key: 'totp_secret_temp',
        value: secret,
      });

      return NextResponse.json({
        success: true,
        secret,
        qrCodeDataUrl,
      });
    }

    if (action === 'confirm') {
      if (!code) {
        return NextResponse.json({ error: 'Verification code is required' }, { status: 400 });
      }

      // Fetch the temp secret
      const { data: tempSecretRecord } = await supabaseAdmin
        .from('admin_config')
        .select('*')
        .eq('key', 'totp_secret_temp')
        .maybeSingle();

      const tempSecret = tempSecretRecord?.value;
      if (!tempSecret) {
        return NextResponse.json({ error: 'No 2FA setup in progress. Please generate a QR code first.' }, { status: 400 });
      }

      // Verify the code
      const result = await verify({
        token: code,
        secret: tempSecret,
      });

      if (!result || !result.valid) {
        return NextResponse.json({ error: 'Invalid verification code. Please try again.' }, { status: 400 });
      }

      // Generate 8 backup codes
      const backupCodes = Array.from({ length: 8 }, () =>
        Math.random().toString(36).substring(2, 10).toUpperCase()
      );

      // Save verified secret, enable 2FA, save backup codes, and remove temp secret
      await supabaseAdmin.from('admin_config').upsert({ key: 'totp_secret', value: tempSecret });
      await supabaseAdmin.from('admin_config').upsert({ key: 'totp_enabled', value: 'true' });
      await supabaseAdmin.from('admin_config').upsert({ key: 'backup_codes', value: JSON.stringify(backupCodes) });
      await supabaseAdmin.from('admin_config').delete().eq('key', 'totp_secret_temp');

      // Log success action
      await logAdminAction('Setup 2FA', { success: true }, request);

      return NextResponse.json({
        success: true,
        backupCodes,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('[Setup 2FA] API Route Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
