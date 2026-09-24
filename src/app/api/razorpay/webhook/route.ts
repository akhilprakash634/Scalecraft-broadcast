import { NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { supabaseAdmin } from '@/lib/supabase';
import { createOrder, incrementCouponUse, getOrderByRazorpayId, getClientById, updateClient } from '@/lib/db';
import { trialEndsAt, nextBillingDate, DEFAULT_MONTHLY_PRICE } from '@/lib/billingConstants';

// Nodemailer transport setup
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

// Helper to generate a random 8-character password with letters and numbers
function generatePassword() {
  const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const all = letters + numbers;

  let pass = '';
  // Ensure we have at least one letter and one number
  pass += letters[Math.floor(Math.random() * letters.length)];
  pass += numbers[Math.floor(Math.random() * numbers.length)];

  for (let i = 2; i < 8; i++) {
    pass += all[Math.floor(Math.random() * all.length)];
  }

  // Shuffle characters
  return pass.split('').sort(() => 0.5 - Math.random()).join('');
}

async function sendWelcomeEmail(email: string, ownerName: string, cleanBotPhone: string, plainPassword: string) {
  const mailOptions = {
    from: `"ScaleCraft" <${process.env.SMTP_EMAIL || 'sales@growyourbusiness.today'}>`,
    to: email,
    subject: 'Your ScaleCraft Agent Dashboard is Ready 🤖',
    text: `Hi ${ownerName},

Payment confirmed! We are setting up your WhatsApp AI Agent Trial. This takes about 10-15 minutes.

You can track your setup progress here:

Dashboard: https://thescalecraft.in/dashboard

Login with:
Bot WhatsApp Number: ${cleanBotPhone}
Password: ${plainPassword}

⚠️ Please save this password. You can change it after logging in.

Setup Steps:
✅ Payment confirmed
⏳ Server being created (Mumbai)
⏳ AI Agent being installed
⏳ WhatsApp connection ready

We will send another email when everything is ready to use.

- scalecraft team
thescalecraft.in`,
  };

  try {
    if (!email) {
      throw new Error('No email address available for welcome notifications.');
    }
    await transporter.sendMail(mailOptions);
    console.log(`[Razorpay Webhook] Welcome email sent successfully to ${email}`);
  } catch (emailErr: any) {
    console.error('[Razorpay Webhook] Failed to send welcome email:', emailErr.message);
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[DEV ONLY] Webhook credentials email failed. Generated password was: ${plainPassword}`);
    }
  }
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch (err) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // Enforce Webhook signature verification
    const signature = request.headers.get('x-razorpay-signature');
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    const isDev = process.env.NODE_ENV === 'development';

    if (!isDev) {
      if (!signature || !webhookSecret) {
        console.error('[Razorpay Webhook] Missing webhook secret or signature.');
        return NextResponse.json({ error: 'Signature verification required' }, { status: 400 });
      }

      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      if (expectedSignature !== signature) {
        console.error('[Razorpay Webhook] Signature verification failed.');
        return NextResponse.json({ error: 'Signature mismatch' }, { status: 400 });
      }
    }

    console.log(`[Razorpay Webhook] Received webhook event: ${body.event}`);

    if (body.event !== 'payment.captured') {
      return NextResponse.json({ success: true, message: `Ignored event: ${body.event}` });
    }

    const payment = body.payload?.payment?.entity;
    if (!payment) {
      return NextResponse.json({ error: 'Payment entity not found in payload' }, { status: 400 });
    }

    // Extract information from payment entity and its notes
    const notes = payment.notes || {};
    const customerName = notes.buyer_name || notes.name || payment.name || 'Valued Customer';
    const customerEmail = (notes.buyer_email || notes.email || payment.email || '').toLowerCase().trim();
    const customerPhone = notes.owner_phone || notes.phone || payment.contact || '';

    const couponCode = notes.coupon_code || '';
    const originalPrice = notes.originalPrice ? parseFloat(notes.originalPrice) : (payment.amount / 100);
    const discountAmount = notes.discountAmount ? parseFloat(notes.discountAmount) : 0;
    const productId = notes.productId || 'unknown';
    const productName = notes.productName || 'ScaleCraft Product';
    const productSlug = notes.productSlug || 'scalecraft-product';
    const notionUrl = notes.notionUrl || '';

    // Idempotency check: verify if payment already processed
    const existingOrder = await getOrderByRazorpayId(payment.order_id);
    if (!existingOrder) {
      // Get geolocation from request
      let city = 'India';
      let countryCode = 'IN';
      try {
        const { origin } = new URL(request.url);
        const geoRes = await fetch(`${origin}/api/geo`, {
          headers: {
            'x-forwarded-for': request.headers.get('x-forwarded-for') || '',
            'x-real-ip': request.headers.get('x-real-ip') || '',
            'cf-ipcountry': request.headers.get('cf-ipcountry') || '',
            'x-vercel-ip-country': request.headers.get('x-vercel-ip-country') || '',
            'x-vercel-ip-city': request.headers.get('x-vercel-ip-city') || '',
          },
          signal: AbortSignal.timeout(3500),
        });
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          city = geoData.city || 'India';
          countryCode = geoData.country_code || 'IN';
        }
      } catch (err) {
        console.warn('[Razorpay Webhook] Failed to call /api/geo during checkout:', err);
      }

      // Write to Supabase orders table
      await createOrder({
        order_id: payment.order_id || `order_${Date.now()}`,
        payment_id: payment.id,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        sanity_product_id: productId,
        product_name: productName,
        product_slug: productSlug,
        amount: payment.amount / 100,
        currency: payment.currency || 'INR',
        original_price: originalPrice,
        coupon_code: couponCode,
        discount_amount: discountAmount,
        status: 'completed',
        notion_url: notionUrl,
        city,
        country_code: countryCode,
        razorpay_webhook_data: body
      });

      // Increment coupon usage
      if (couponCode) {
        try {
          await incrementCouponUse(couponCode);
        } catch (couponErr: any) {
          console.error('[Razorpay Webhook] Error incrementing coupon use:', couponErr.message);
        }
      }
    } else {
      console.log(`[Razorpay Webhook] Order ID ${payment.order_id} already exists in DB. Skipping duplicate order creation.`);
    }

    // Handle Trial Activation or Trial Upgrade
    const clientId = notes.clientId || notes.client_id;
    const planType = notes.plan_type || notes.planType || '';

    // 1. Detect Trial Order (₹2 = 200 paise or notes.plan_type = 'trial')
    if (payment.amount === 200 || planType === 'trial') {
      if (payment.amount !== 200) {
        console.error('[Razorpay Webhook] Invalid amount for trial payment:', payment.amount);
        return NextResponse.json({ error: 'Invalid trial payment amount' }, { status: 400 });
      }

      if (!clientId) {
        console.error('[Razorpay Webhook] Missing clientId in notes for trial order.');
        return NextResponse.json({ error: 'Missing clientId' }, { status: 400 });
      }

      // Read current plan_type from database (do not trust request/body)
      const client = await getClientById(clientId);
      if (!client) {
        console.error('[Razorpay Webhook] Client not found for trial activation:', clientId);
        return NextResponse.json({ error: 'Client not found' }, { status: 400 });
      }

      if (client.plan_type !== 'trial') {
        console.error('[Razorpay Webhook] Client is not registered for trial plan:', client.plan_type);
        return NextResponse.json({ error: 'Client not registered for trial' }, { status: 400 });
      }

      if (client.trial_started_at) {
        console.log('[Razorpay Webhook] Client trial already activated previously.');
      } else {
        const plainPassword = generatePassword();
        const hashedPassword = await bcrypt.hash(plainPassword, 10);

        await updateClient(clientId, {
          plan_type: 'trial',
          trial_started_at: new Date().toISOString(),
          trial_ends_at: trialEndsAt(), // 5-day trial via shared billingConstants
          trial_reminder_sent: false,
          agent_paused_at: null,
          portal_password: hashedPassword,
          portal_created_at: new Date().toISOString(),
          status: 'pending',
          setup_paid: true,
          monthly_active: true,
          updated_at: new Date().toISOString()
        });

        // Create/upsert portal_users record
        await supabaseAdmin
          .from('portal_users')
          .upsert({
            client_id: clientId,
            bot_phone: client.whatsapp_bot_number,
            email: client.email,
            owner_name: client.owner_name,
            business_name: client.business_name,
            password_hash: hashedPassword,
            portal_created_at: new Date().toISOString(),
          }, { onConflict: 'client_id' });

        // Create/upsert installation_status record
        await supabaseAdmin
          .from('installation_status')
          .upsert({
            client_id: clientId,
            status: 'pending',
            current_step: 0,
            total_steps: 9,
            step_description: 'Payment confirmed, awaiting provisioning...',
            license_key: client.license_key,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'client_id' });

        // Send welcome credentials email
        await sendWelcomeEmail(client.email, client.owner_name, client.whatsapp_bot_number, plainPassword);

        // Automatically trigger AWS provisioning
        try {
          const { origin } = new URL(request.url);
          const provisionUrl = `${origin}/api/admin/provision`;
          console.log(`[Razorpay Webhook] Triggering provision for trial client ${clientId} at: ${provisionUrl}`);

          fetch(provisionUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-admin-secret': process.env.ADMIN_SECRET || ''
            },
            body: JSON.stringify({
              businessName: client.business_name,
              ownerName: client.owner_name,
              botPhone: client.whatsapp_bot_number,
              ownerPhone: client.owner_phone,
              email: client.email,
              geminiApiKey: client.gemini_api_key,
              plan: client.plan || 'saas',
              paymentId: payment.id,
              sanityDocumentId: clientId,
              connectionType: client.connection_type || 'baileys',
              whatsappPhoneNumberId: client.whatsapp_phone_number_id || null,
              whatsappAccessToken: client.whatsapp_access_token || null,
              whatsappAppSecret: client.whatsapp_app_secret || null,
              whatsappWabaId: client.whatsapp_waba_id || null
            })
          }).then(async (res) => {
            if (!res.ok) {
              const text = await res.text();
              console.error(`[Razorpay Webhook] Provision API responded with error status ${res.status}: ${text}`);
            } else {
              const json = await res.json();
              console.log(`[Razorpay Webhook] Provision API successfully triggered for trial:`, json);
            }
          }).catch((err) => {
            console.error(`[Razorpay Webhook] Fetch error while triggering Provision API:`, err.message);
          });
        } catch (err: any) {
          console.error(`[Razorpay Webhook] Error constructing URL or dispatching provision trigger:`, err.message);
        }
      }
    }

    // 2. Detect Trial Upgrade
    // Setup: ₹6,999 (699900 paise) current price; ₹6,499 (649900) kept for backward compat with existing payment links.
    // Monthly: ₹1,299 (129900 paise) — supports dynamic DEFAULT_MONTHLY_PRICE and legacy 120000 (₹1,200) for backward compatibility.
    const isSetupUpgrade = payment.amount === 699900 || payment.amount === 649900;
    const isMonthlyUpgrade = payment.amount === (DEFAULT_MONTHLY_PRICE * 100) || payment.amount === 120000 || planType === 'monthly';
    const isUpgradePayment = isSetupUpgrade || isMonthlyUpgrade;

    if (isUpgradePayment && clientId) {
      const client = await getClientById(clientId);
      if (client && client.plan_type === 'trial') {
        console.log(`[Razorpay Webhook] Upgrading trial client ${clientId} to standard.`);

        const updateFields: any = {
          plan_type: 'standard',
          trial_started_at: null,
          trial_ends_at: null,
          trial_reminder_sent: false,
          grace_period_ends_at: null,
          agent_paused_at: null,
          updated_at: new Date().toISOString()
        };

        if (isSetupUpgrade) {
          updateFields.setup_paid = true;
        }
        if (isMonthlyUpgrade) {
          updateFields.monthly_active = true;
          // Wire into recurring billing tracker (monthly_amount, next_billing_date, billing_status)
          updateFields.last_payment_at = new Date().toISOString();
          updateFields.next_billing_date = nextBillingDate(); // +30 days from today
          updateFields.billing_status = 'active';
          updateFields.monthly_amount = payment.amount / 100; // lock in actual paid amount
          updateFields.billing_reminder_count = 0;
          updateFields.last_billing_reminder_sent_at = null;
        }

        await updateClient(clientId, updateFields);

        // If agent was paused - restart it
        if (client.agent_paused_at) {
          try {
            const { executeCommand } = await import('@/lib/ssh');
            const privateKey = client.ssh_private_key || process.env.SCALECRAFT_SSH_PRIVATE_KEY || '';
            await executeCommand(
              client.server_ip,
              privateKey,
              'systemctl --user start hermes-gateway || pm2 start hermes',
              client.server_user || 'ubuntu'
            );
            console.log('[Razorpay Webhook] Restarted paused agent successfully on upgrade.');
          } catch (restartErr: any) {
            console.error('[Razorpay Webhook] Error restarting agent on VPS:', restartErr.message);
          }
        }

        // Send confirmation WhatsApp message
        try {
          const { sendWhatsAppMessage } = await import('@/lib/whatsapp');
          await sendWhatsAppMessage(
            client.owner_phone || client.whatsapp_bot_number,
            client.server_ip,
            client.ssh_private_key,
            `Welcome to ScaleCraft! 🎉\nYour agent is back live and running 24/7.\nThank you for upgrading! 😊`
          );
        } catch (waErr: any) {
          console.error('[Razorpay Webhook] Failed to send WhatsApp upgrade confirmation:', waErr.message);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Checkout order successfully recorded and client status updated in Supabase.',
    });
  } catch (error: any) {
    console.error('[Razorpay Webhook] Exception in webhook handler:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
