import { NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { supabaseAdmin } from '@/lib/supabase';
import { createOrder, incrementCouponUse, getClientById, updateClient } from '@/lib/db';
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

// Helper to generate random string for license key
function randStr(len: number) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
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
      console.warn('[SaaS Webhook] Failed to call /api/geo during checkout:', err);
    }

    // Enforce Webhook signature verification
    const signature = request.headers.get('x-razorpay-signature');
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    const isDev = process.env.NODE_ENV === 'development';

    if (!isDev) {
      if (!signature || !webhookSecret) {
        console.error('[Webhook] Missing webhook secret or signature.');
        return NextResponse.json({ error: 'Signature verification required' }, { status: 400 });
      }

      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      const expectedBuffer = Buffer.from(expectedSignature);
      const signatureBuffer = Buffer.from(signature);

      if (expectedBuffer.length !== signatureBuffer.length || !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)) {
        console.error('[Webhook] Signature verification failed.');
        return NextResponse.json({ error: 'Signature mismatch' }, { status: 400 });
      }
    }

    console.log(`[Webhook] Received webhook event: ${body.event}`);

    // ── PART 7: Handle payment_link.paid (billing renewal) ───────────────────
    if (body.event === 'payment_link.paid') {
      const linkEntity = body.payload?.payment_link?.entity;
      const linkNotes = linkEntity?.notes || {};

      if (linkNotes.type === 'renewal' && linkNotes.clientId) {
        const clientId = linkNotes.clientId;
        console.log(`[Webhook] payment_link.paid — renewal for clientId: ${clientId}`);

        // Fetch client record
        const { data: dbClient, error: clientErr } = await supabaseAdmin
          .from('agent_clients')
          .select('*')
          .eq('id', clientId)
          .maybeSingle();

        if (clientErr || !dbClient) {
          console.error('[Webhook] payment_link.paid — client not found:', clientId, clientErr?.message);
          return NextResponse.json({ success: true, message: 'Client not found — ignored' });
        }

        // Advance next_billing_date by 30 days from now
        const nextBillingDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        const wasPaused = !!dbClient.agent_paused_at;

        await supabaseAdmin
          .from('agent_clients')
          .update({
            billing_status: 'active',
            next_billing_date: nextBillingDate,
            last_payment_at: new Date().toISOString(),
            billing_reminder_count: 0,
            last_billing_reminder_sent_at: null,
            current_payment_link_id: null,
            current_payment_link_url: null,
            payment_link_expires_at: null,
            agent_paused_at: null,
            status: 'active',
          })
          .eq('id', clientId);

        // Resume Baileys/Hermes agent if it was paused
        if (wasPaused && dbClient.server_ip && dbClient.connection_type !== 'cloud_api') {
          try {
            const { executeCommand } = await import('@/lib/ssh');
            const sshKey = dbClient.ssh_private_key || process.env.SCALECRAFT_SSH_PRIVATE_KEY || '';
            await executeCommand(
              dbClient.server_ip,
              sshKey,
              'systemctl --user start hermes-gateway 2>/dev/null || pm2 start hermes 2>/dev/null || true',
              dbClient.server_user || 'ubuntu'
            );
            console.log(`[Webhook] payment_link.paid — Hermes agent resumed for client ${clientId}`);
          } catch (resumeErr: any) {
            console.error('[Webhook] payment_link.paid — agent resume SSH error (non-fatal):', resumeErr.message);
          }
        }

        // Send thank-you confirmation via ScaleCraft's platform WhatsApp number
        if (dbClient.owner_phone) {
          try {
            const { sendPlatformMessage } = await import('@/lib/platformMessage');
            const ownerName = dbClient.owner_name || 'there';
            const amount = dbClient.monthly_amount || 1299;
            const dueDateFormatted = new Date(nextBillingDate).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'long', year: 'numeric',
            });
            await sendPlatformMessage(
              dbClient.owner_phone,
              `Thank you for your payment, ${ownerName}! ✅\n\nYour ScaleCraft Agent is now active and running 24/7.\n\nNext renewal: ${dueDateFormatted} (₹${amount}).\n\nReach us anytime at https://thescalecraft.in`,
              {
                templateName: 'billing_renewal_confirmation',
                templateParams: [ownerName, dueDateFormatted, String(amount)],
                forceTemplate: false, // Use plain text if within 24h window
              }
            );
            console.log(`[Webhook] payment_link.paid — thank-you sent to +${dbClient.owner_phone}`);
          } catch (msgErr: any) {
            console.error('[Webhook] payment_link.paid — thank-you message failed (non-fatal):', msgErr.message);
          }
        }

        return NextResponse.json({
          success: true,
          message: `Renewal processed for client ${clientId}. Next billing: ${nextBillingDate}.`,
        });
      }

      // payment_link.paid but not a renewal — acknowledge and ignore
      return NextResponse.json({ success: true, message: `Ignored payment_link.paid (type: ${linkNotes.type || 'unknown'})` });
    }

    if (body.event !== 'payment.captured') {
      return NextResponse.json({ success: true, message: `Ignored event: ${body.event}` });
    }

    const payment = body.payload?.payment?.entity;
    if (!payment) {
      return NextResponse.json({ error: 'Payment entity not found in payload' }, { status: 400 });
    }

    let notes = payment.notes || {};
    const clientId = notes.clientId || notes.client_id;
    const planType = notes.plan_type || notes.planType || '';

    const isTrialOrder = payment.amount === 200 || planType === 'trial';
    const isSetupUpgrade = payment.amount === 699900 || payment.amount === 649900;
    // Fixed: supports dynamic DEFAULT_MONTHLY_PRICE and legacy 120000 (₹1,200) for backward compatibility.
    const isMonthlyUpgrade = payment.amount === (DEFAULT_MONTHLY_PRICE * 100) || payment.amount === 120000 || planType === 'monthly';
    const isUpgradeOrder = (isSetupUpgrade || isMonthlyUpgrade) && clientId;

    if (isTrialOrder || isUpgradeOrder) {
      let client: any = null;
      if (isTrialOrder) {
        if (payment.amount !== 200) {
          console.error('[Webhook] Invalid amount for trial payment:', payment.amount);
          return NextResponse.json({ error: 'Invalid trial payment amount' }, { status: 400 });
        }

        if (!clientId) {
          console.error('[Webhook] Missing clientId in notes for trial order.');
          return NextResponse.json({ error: 'Missing clientId' }, { status: 400 });
        }

        // Read current plan_type from database
        client = await getClientById(clientId);
        if (!client) {
          console.error('[Webhook] Client not found for trial activation:', clientId);
          return NextResponse.json({ error: 'Client not found' }, { status: 400 });
        }

        if (client.plan_type !== 'trial') {
          console.error('[Webhook] Client is not registered for trial plan:', client.plan_type);
          return NextResponse.json({ error: 'Client not registered for trial' }, { status: 400 });
        }

        if (client.trial_started_at) {
          console.log('[Webhook] Client trial already activated previously.');
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
          const mailOptions = {
            from: `"ScaleCraft" <${process.env.SMTP_EMAIL || 'sales@growyourbusiness.today'}>`,
            to: client.email,
            subject: 'Your ScaleCraft Agent Dashboard is Ready 🤖',
            text: `Hi ${client.owner_name},

Payment confirmed! We are setting up your WhatsApp AI Agent Trial. This takes about 10-15 minutes.

You can track your setup progress here:

Dashboard: https://thescalecraft.in/dashboard

Login with:
Bot WhatsApp Number: ${client.whatsapp_bot_number}
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
          await transporter.sendMail(mailOptions);
          console.log(`Welcome email sent to ${client.email}`);

          // Automatically trigger AWS provisioning
          try {
            const { origin } = new URL(request.url);
            const provisionUrl = `${origin}/api/admin/provision`;
            console.log(`[Webhook] Triggering provision for trial client ${clientId} at: ${provisionUrl}`);

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
                sanityDocumentId: clientId
              })
            }).then(async (res) => {
              if (!res.ok) {
                const text = await res.text();
                console.error(`[Webhook] Provision API responded with error status ${res.status}: ${text}`);
              } else {
                const json = await res.json();
                console.log(`[Webhook] Provision API successfully triggered for trial:`, json);
              }
            }).catch((err) => {
              console.error(`[Webhook] Fetch error while triggering Provision API:`, err.message);
            });
          } catch (err: any) {
            console.error(`[Webhook] Error constructing URL or dispatching provision trigger:`, err.message);
          }
        }
      } else if (isUpgradeOrder) {
        client = await getClientById(clientId);
        if (client && client.plan_type === 'trial') {
          console.log(`[Webhook] Upgrading trial client ${clientId} to standard.`);

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
            // Wire into recurring billing tracker
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
              console.log('[Webhook] Restarted paused agent successfully on upgrade.');
            } catch (restartErr: any) {
              console.error('[Webhook] Error restarting agent on VPS:', restartErr.message);
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
            console.error('[Webhook] Failed to send WhatsApp upgrade confirmation:', waErr.message);
          }
        }
      }

      // Write order to orders table
      try {
        const couponCode = notes.couponCode || notes.coupon_code || '';
        const originalPrice = notes.originalPrice ? parseFloat(notes.originalPrice) : (payment.amount / 100);
        const discountAmount = notes.discountAmount ? parseFloat(notes.discountAmount) : 0;
        const productId = notes.productId || 'scalecraft-agent-saas';
        const productName = notes.productName || 'ScaleCraft SaaS Agent';
        const productSlug = notes.productSlug || 'scalecraft-agent-saas';
        const notionUrl = notes.notionUrl || '';

        await createOrder({
          order_id: payment.order_id || `order_${Date.now()}`,
          payment_id: payment.id,
          customer_name: client ? client.owner_name : (notes.ownerName || notes.buyerName || notes.name || 'Valued Client'),
          customer_email: client ? client.email : (notes.email || notes.buyerEmail || payment.email || ''),
          customer_phone: client ? client.owner_phone : (notes.ownerPhone || ''),
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
          city: city,
          country_code: countryCode,
          razorpay_webhook_data: body
        });
      } catch (orderErr: any) {
        console.error('[Webhook] Error creating trial/upgrade order in Supabase:', orderErr.message);
      }

      return NextResponse.json({
        success: true,
        message: 'Trial or Upgrade event processed successfully.',
      });
    }

    // Idempotency check: verify if payment already processed
    const { data: existingPayment } = await supabaseAdmin
      .from('payment_events')
      .select('*')
      .eq('payment_id', payment.id)
      .maybeSingle();

    if (existingPayment) {
      console.log(`[Webhook] Payment ID ${payment.id} already processed. Skipping duplicate record creation.`);
      return NextResponse.json({ success: true, message: 'Payment already processed' });
    }

    // Extract information from payment entity and its notes
    notes = payment.notes || {};
    const businessName = notes.businessName || 'My Business';
    const ownerName = notes.ownerName || notes.buyerName || notes.name || 'Valued Client';
    const rawBotPhone = notes.botPhone || notes.whatsappBotNumber || notes.botNumber || '';
    const rawOwnerPhone = notes.ownerPhone || '';
    const email = notes.email || notes.buyerEmail || payment.email || '';
    const geminiApiKey = notes.geminiApiKey || '';
    const plan = notes.plan || 'starter';

    // Log the payment event to Supabase (masking sensitive email / details)
    const maskedEmail = email ? (email.substring(0, 3) + '...' + (email.split('@')[1] || '')) : '';
    await supabaseAdmin.from('payment_events').insert({
      payment_id: payment.id,
      event_type: body.event,
      amount: payment.amount,
      currency: payment.currency,
      email: maskedEmail,
      status: payment.status
    });

    if (!rawBotPhone) {
      console.error('[Webhook] No botPhone found in payment notes. Cannot create client account.');
      return NextResponse.json({ error: 'Bot phone number missing in notes' }, { status: 400 });
    }

    const cleanBotPhone = rawBotPhone.replace(/\D/g, '');
    const cleanOwnerPhone = rawOwnerPhone.replace(/\D/g, '');

    // 1. Generate credentials
    const plainPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // 2. Search for existing client or create new in Supabase
    const { data: existingClient, error: fetchError } = await supabaseAdmin
      .from('agent_clients')
      .select('*')
      .or(`whatsapp_bot_number.eq.${cleanBotPhone},email.eq.${email.toLowerCase().trim()}`)
      .maybeSingle();

    if (fetchError) {
      console.error('[Webhook] Error fetching existing client from Supabase:', fetchError.message);
    }

    let docId = '';
    let activeLicenseKey = '';
    if (existingClient) {
      docId = existingClient.id;
      activeLicenseKey = existingClient.license_key || `SCA-${randStr(5)}-${randStr(5)}`;
      console.log(`[Webhook] Client account already exists: ${existingClient.id}. Updating credentials.`);
    } else {
      docId = crypto.randomUUID();
      activeLicenseKey = `SCA-${randStr(5)}-${randStr(5)}`;
      console.log(`[Webhook] Client account is new. Generated ID: ${docId}`);
    }

    // Sync client to Supabase agent_clients table
    try {
      const { error: clientDbError } = await supabaseAdmin
        .from('agent_clients')
        .upsert({
          id: docId,
          email: email.toLowerCase().trim(),
          business_name: existingClient ? (existingClient.business_name || businessName) : businessName,
          owner_name: existingClient ? (existingClient.owner_name || ownerName) : ownerName,
          owner_phone: existingClient ? (existingClient.owner_phone || cleanOwnerPhone) : cleanOwnerPhone,
          gemini_api_key: existingClient ? (existingClient.gemini_api_key || geminiApiKey) : geminiApiKey,
          license_key: activeLicenseKey,
          plan: plan,
          setup_paid: true,
          monthly_active: true,
          whatsapp_bot_number: cleanBotPhone,
          portal_password: hashedPassword,
          portal_created_at: new Date().toISOString(),
          status: existingClient ? (existingClient.status || 'pending') : 'pending',
          server_user: existingClient ? (existingClient.server_user || 'ubuntu') : 'ubuntu',
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

      if (clientDbError) {
        console.error('[Webhook] Supabase agent_clients upsert error:', clientDbError);
      } else {
        console.log('[Webhook] Supabase agent_clients record upserted successfully.');
      }
    } catch (dbErr: any) {
      console.error('[Webhook] Exception syncing client to Supabase:', dbErr.message);
    }

    // Create order in Supabase
    try {
      const couponCode = notes.couponCode || notes.coupon_code || '';
      const originalPrice = notes.originalPrice ? parseFloat(notes.originalPrice) : (payment.amount / 100);
      const discountAmount = notes.discountAmount ? parseFloat(notes.discountAmount) : 0;
      const productId = notes.productId || 'scalecraft-agent-saas';
      const productName = notes.productName || 'ScaleCraft SaaS Agent';
      const productSlug = notes.productSlug || 'scalecraft-agent-saas';
      const notionUrl = notes.notionUrl || '';

      await createOrder({
        order_id: payment.order_id || `order_${Date.now()}`,
        payment_id: payment.id,
        customer_name: ownerName,
        customer_email: email,
        customer_phone: cleanOwnerPhone,
        sanity_product_id: productId,
        product_name: productName,
        product_slug: productSlug,
        amount: payment.amount / 100, // standard checkouts store in INR
        currency: payment.currency || 'INR',
        original_price: originalPrice,
        coupon_code: couponCode,
        discount_amount: discountAmount,
        status: 'completed',
        notion_url: notionUrl,
        city: city,
        country_code: countryCode,
        razorpay_webhook_data: body
      });

      // Increment coupon usage
      if (couponCode) {
        await incrementCouponUse(couponCode);
      }
    } catch (orderErr: any) {
      console.error('[Webhook] Error creating order in Supabase:', orderErr.message);
    }

    // Create/upsert portal_users record in Supabase
    const { error: userError } = await supabaseAdmin
      .from('portal_users')
      .upsert({
        client_id: docId,
        bot_phone: cleanBotPhone,
        email: email,
        owner_name: ownerName,
        business_name: businessName,
        password_hash: hashedPassword,
        portal_created_at: new Date().toISOString(),
      }, { onConflict: 'client_id' });

    if (userError) {
      console.error('[Webhook] Supabase portal_users upsert error:', userError);
    } else {
      console.log('[Webhook] Supabase portal_users record upserted successfully.');
    }

    // Create/upsert installation_status record in Supabase
    const { error: statusError } = await supabaseAdmin
      .from('installation_status')
      .upsert({
        client_id: docId,
        status: 'pending',
        current_step: 0,
        total_steps: 9,
        step_description: 'Payment confirmed, awaiting provisioning...',
        license_key: activeLicenseKey,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'client_id' });

    if (statusError) {
      console.error('[Webhook] Supabase installation_status upsert error:', statusError);
    } else {
      console.log('[Webhook] Supabase installation_status record upserted successfully.');
    }

    // 3. Send welcome email using nodemailer
    const mailOptions = {
      from: `"ScaleCraft" <${process.env.SMTP_EMAIL || 'sales@growyourbusiness.today'}>`,
      to: email,
      subject: 'Your ScaleCraft Agent Dashboard is Ready 🤖',
      text: `Hi ${ownerName},

Payment confirmed! We are setting up your WhatsApp AI Agent. This takes about 10-15 minutes.

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
      console.log(`[Webhook] Welcome email sent successfully to ${email}`);
    } catch (emailErr: any) {
      console.error('[Webhook] Failed to send welcome email:', emailErr.message);
      // fallback logging in dev environments
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[DEV ONLY] Webhook credentials email failed. Generated password was: ${plainPassword}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Client account initialized and welcome notification triggered successfully.',
    });
  } catch (error: any) {
    console.error('[Webhook] Exception in Razorpay webhook handler:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
