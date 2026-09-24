import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const { token, newPassword, confirmPassword } = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // 1. Validate passwords match
    if (!newPassword || !confirmPassword) {
      return NextResponse.json({ error: 'Both password fields are required' }, { status: 400 });
    }
    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 });
    }

    // 2. Validate password strength (min 8 chars, has number, has letter)
    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long' }, { status: 400 });
    }
    if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return NextResponse.json({ error: 'Password must contain at least one letter and one number' }, { status: 400 });
    }

    // 3. Look up portal_users by reset_token
    const { data: portalUser, error: queryError } = await supabaseAdmin
      .from('portal_users')
      .select('*')
      .eq('reset_token', token)
      .maybeSingle();

    if (queryError) {
      console.error('[Reset Password] Supabase query error:', queryError.message);
      return NextResponse.json({ error: 'Database query error' }, { status: 500 });
    }

    if (!portalUser) {
      return NextResponse.json({ error: 'Invalid or expired password reset link' }, { status: 400 });
    }

    // 4. Check token not expired
    const expiresAt = portalUser.reset_token_expires_at;
    if (!expiresAt || new Date(expiresAt).getTime() < Date.now()) {
      return NextResponse.json({ error: 'This reset link has expired. Request a new one.' }, { status: 400 });
    }

    // 5. Hash new password with bcryptjs (rounds 10)
    const newHash = await bcrypt.hash(newPassword, 10);

    // 6. Update Supabase portal_users
    const { error: updateError } = await supabaseAdmin
      .from('portal_users')
      .update({
        password_hash: newHash,
        reset_token: null,
        reset_token_expires_at: null,
        password_changed_at: new Date().toISOString(),
      })
      .eq('id', portalUser.id);

    if (updateError) {
      console.error('[Reset Password] Supabase save error:', updateError.message);
      return NextResponse.json({ error: 'Failed to save new password' }, { status: 500 });
    }

    // 7. Send confirmation email
    try {
      const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.zoho.in',
        port: smtpPort,
        secure: smtpPort === 465,
        requireTLS: true,
        auth: {
          user: process.env.SMTP_EMAIL,
          pass: process.env.SMTP_PASSWORD,
        },
      });

      const mailOptions = {
        from: `"ScaleCraft" <${process.env.SMTP_EMAIL || 'sales@growyourbusiness.today'}>`,
        to: portalUser.email,
        subject: 'Your password has been changed',
        text: `Hi ${portalUser.owner_name || 'Grower'},

Your ScaleCraft dashboard password was successfully changed.

If you didn't make this change, contact us immediately on WhatsApp: +91 80780 04732

- ScaleCraft Team`,
      };

      await transporter.sendMail(mailOptions);
      console.log('[Reset Password] Password reset confirmation email sent successfully.');
    } catch (emailErr: any) {
      console.error('[Reset Password] Confirmation email send exception:', emailErr.message);
    }

    // 8. Return success
    return NextResponse.json({ success: true, message: 'Password reset successfully!' });
  } catch (error: any) {
    console.error('[Reset Password] API Route Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
