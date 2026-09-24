import { NextResponse } from 'next/server';
import { getAgentClientByBotNumber, updateAgentClientOtp } from '@/lib/agents';
import nodemailer from 'nodemailer';
import { checkRateLimit } from '@/lib/rateLimit';

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

export async function POST(request: Request) {
  try {
    const { botNumber } = await request.json();
    if (!botNumber) {
      return NextResponse.json({ error: 'WhatsApp bot number is required' }, { status: 400 });
    }

    // Clean and normalize input
    const cleanedBotNumber = botNumber.replace(/\D/g, '');

    // Rate Limit: max 3 requests per phone per 5 minutes
    const limitResult = await checkRateLimit(`send_otp:${cleanedBotNumber}`, 3, 5);
    if (!limitResult.allowed) {
      return NextResponse.json({ error: 'Too many OTP requests. Please try again after 5 minutes.' }, { status: 429 });
    }
    const clientRecord = await getAgentClientByBotNumber(cleanedBotNumber);

    if (!clientRecord) {
      return NextResponse.json({ error: 'Bot number not registered on ScaleCraft SaaS' }, { status: 404 });
    }

    if (clientRecord.status !== 'active' && clientRecord.status !== 'installed') {
      return NextResponse.json(
        { error: `Account status is currently ${clientRecord.status}. Please contact support.` },
        { status: 403 }
      );
    }

    if (!clientRecord.email) {
      return NextResponse.json({ error: 'No registered email found for this account. Contact support.' }, { status: 400 });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes validity

    // Save to Sanity
    const saved = await updateAgentClientOtp(clientRecord._id, otp, expiresAt);
    if (!saved) {
      return NextResponse.json({ error: 'Failed to generate OTP secure token. Try again.' }, { status: 500 });
    }

    // Deliver via Nodemailer Zoho SMTP
    const mailOptions = {
      from: `"ScaleCraft" <${process.env.SMTP_EMAIL || 'sales@growyourbusiness.today'}>`,
      to: clientRecord.email,
      subject: 'Your ScaleCraft Dashboard OTP',
      text: `Hi ${clientRecord.ownerName || 'Grower'},

Your ScaleCraft dashboard login OTP is:

${otp}

Valid for 5 minutes. Do not share this code.

If you didn't request this, ignore this email.

- scalecraft team
thescalecraft.in`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your ScaleCraft Dashboard OTP</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Outfit:wght@600;800;900&display=swap" rel="stylesheet">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Outfit:wght@600;800;900&display=swap');
    body {
      margin: 0;
      padding: 0;
      background-color: #F7F7F5;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F7F7F5; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F7F7F5; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #FFFFFF; border: 1px solid #EBEBEB; border-radius: 20px; box-shadow: 0 4px 30px rgba(0, 0, 0, 0.02); overflow: hidden; padding: 48px 36px; text-align: left;">
          <tr>
            <td align="center" style="padding-bottom: 36px; border-bottom: 1px solid #EBEBEB; text-align: center;">
              <h1 style="margin: 0; font-family: 'Outfit', -apple-system, sans-serif; font-size: 26px; font-weight: 900; color: #111110; letter-spacing: -0.5px; text-transform: uppercase;">
                ScaleCraft<span style="color: #0055FF;">.</span>
              </h1>
              <p style="margin: 6px 0 0 0; font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 700; color: #6F6E69; text-transform: uppercase; letter-spacing: 0.1em;">
                Premium Systems & Workspaces
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-top: 36px; padding-bottom: 24px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #1C1C1A;">
                Hi ${clientRecord.ownerName || 'Grower'},
              </p>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #1C1C1A;">
                Your ScaleCraft dashboard login OTP is:
              </p>
              <div style="background-color: #F7F7F5; border: 1px solid #EBEBEB; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
                <span style="font-family: monospace; font-size: 32px; font-weight: 900; color: #0055FF; letter-spacing: 4px;">
                  ${otp}
                </span>
              </div>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #6F6E69;">
                Valid for 5 minutes. Do not share this code.
              </p>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #6F6E69;">
                If you didn't request this, ignore this email.
              </p>
              <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #1C1C1A;">
                - scalecraft team<br/>
                <a href="https://thescalecraft.in" target="_blank" style="color: #0055FF; text-decoration: none;">thescalecraft.in</a>
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top: 32px; border-top: 1px solid #EBEBEB; text-align: center;">
              <p style="margin: 0; font-size: 11px; font-weight: 700; color: #AEACA5; text-transform: uppercase; letter-spacing: 0.05em;">
                &copy; ${new Date().getFullYear()} ScaleCraft. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`OTP email sent successfully to ${clientRecord.email}`);
    } catch (emailErr: any) {
      console.error('Failed to send OTP email:', emailErr.message);
      
      // Fallback: In local development, log OTP to console to unblock developer testing if email is not configured.
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[DEV ONLY] OTP email failed. OTP is: ${otp}`);
        return NextResponse.json({
          success: true,
          message: `[DEV] Email offline. OTP printed to console: ${otp}`,
          devMode: true,
        });
      }

      return NextResponse.json({
        error: 'Failed to deliver OTP to email. Please contact support.',
      }, { status: 504 });
    }

    return NextResponse.json({ success: true, message: 'OTP sent successfully to your registered email.' });
  } catch (error: any) {
    console.error('Send OTP Endpoint Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
