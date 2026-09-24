import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit } from '@/lib/rateLimit';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const { botPhone, email } = await request.json();

    if (!botPhone || !email) {
      return NextResponse.json({
        success: true,
        message: 'If this number exists, a reset link has been sent to your registered email.',
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Rate Limit: max 3 requests per email per hour
    const limitResult = await checkRateLimit(`forgot_password:${cleanEmail}`, 3, 60);
    if (!limitResult.allowed) {
      return NextResponse.json({
        success: false,
        message: 'Too many password reset requests. Please try again after an hour.',
      }, { status: 429 });
    }

    const cleanedBotPhone = botPhone.replace(/\D/g, '');

    // 1. Look up portal_users in Supabase by bot_phone
    const { data: portalUser, error: queryError } = await supabaseAdmin
      .from('portal_users')
      .select('*')
      .eq('bot_phone', cleanedBotPhone)
      .maybeSingle();

    if (queryError) {
      console.error('[Forgot Password] Supabase query error:', queryError.message);
    }

    // 2. If found AND email matches
    if (portalUser && portalUser.email?.toLowerCase().trim() === cleanEmail) {
      // a. Generate reset token
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

      // b. Store in Supabase portal_users
      const { error: updateError } = await supabaseAdmin
        .from('portal_users')
        .update({
          reset_token: token,
          reset_token_expires_at: expiresAt,
        })
        .eq('id', portalUser.id);

      if (updateError) {
        console.error('[Forgot Password] Supabase token save error:', updateError.message);
      } else {
        // c. Send email using existing email setup
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

          const resetLink = `https://thescalecraft.in/dashboard/reset-password?token=${token}`;
          const mailOptions = {
            from: `"ScaleCraft" <${process.env.SMTP_EMAIL || 'sales@growyourbusiness.today'}>`,
            to: cleanEmail,
            subject: 'Reset your ScaleCraft Dashboard Password',
            text: `Hi ${portalUser.owner_name || 'Grower'},

You requested a password reset for your ScaleCraft dashboard.

Click the link below to reset your password:
${resetLink}

This link expires in 30 minutes.

If you didn't request this, ignore this email. Your password will remain unchanged.

- ScaleCraft Team`,
          };

          await transporter.sendMail(mailOptions);
          console.log('[Forgot Password] Password reset email sent successfully to', cleanEmail);
        } catch (emailErr: any) {
          console.error('[Forgot Password] Email send exception:', emailErr.message);
        }
      }
    }

    // 3. Always return 200 with the same message (prevent user enumeration)
    return NextResponse.json({
      success: true,
      message: 'If this number exists, a reset link has been sent to your registered email.',
    });
  } catch (error: any) {
    console.error('[Forgot Password] API Route Error:', error.message);
    return NextResponse.json({
      success: true,
      message: 'If this number exists, a reset link has been sent to your registered email.',
    });
  }
}
