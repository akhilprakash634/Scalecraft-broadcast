/**
 * POST /api/admin/reminders/send
 *
 * Sends a manual billing or trial reminder from ScaleCraft's own platform WhatsApp number.
 * For billing reminders, creates a fresh Razorpay Payment Link if none exists or the existing
 * one has expired, then updates the client's billing reminder counters.
 *
 * Body: { clientId: string, type: 'billing' | 'trial' }
 *
 * Security:
 *  - Auth: isAdminAuthenticated() — 401 if not admin.
 *  - clientId validated as non-empty string; DB lookup by UUID primary key (no injection risk via ORM).
 *  - ownerPhone is digit-stripped in sendPlatformMessage before use.
 *  - Razorpay payment link notes carry only server-derived clientId and type — no user-controlled values.
 *  - Message preview returned to admin UI — all values come from DB (escaped by React JSX rendering).
 *  - TODO(security): Rate-limit per admin session to prevent accidental spam sends.
 */

import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { isAdminAuthenticated } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { mapDbClientToAgentClient } from '@/lib/agents';
import { sendPlatformMessage } from '@/lib/platformMessage';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

export async function POST(request: Request) {
  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { clientId, type } = body as { clientId?: string; type?: string };

    // Input validation
    if (!clientId || typeof clientId !== 'string' || clientId.trim().length === 0) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
    }
    if (type !== 'billing' && type !== 'trial') {
      return NextResponse.json({ error: 'type must be "billing" or "trial"' }, { status: 400 });
    }

    // Fetch client
    const { data: dbClient, error: dbErr } = await supabaseAdmin
      .from('agent_clients')
      .select('*')
      .eq('id', clientId.trim())
      .maybeSingle();

    if (dbErr) {
      console.error('[Reminders Send] DB error:', dbErr.message);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
    if (!dbClient) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const client = mapDbClientToAgentClient(dbClient)!;
    const { ownerName, ownerPhone, monthlyAmount, nextBillingDate, billingReminderCount } = client;

    if (!ownerPhone) {
      return NextResponse.json({ error: 'Client has no ownerPhone on record' }, { status: 400 });
    }

    // Pre-flight: verify platform credentials are configured before proceeding
    if (!process.env.SCALECRAFT_PLATFORM_CLIENT_ID) {
      return NextResponse.json(
        { error: 'SCALECRAFT_PLATFORM_CLIENT_ID env var is not set — configure it in .env.local / Vercel to point at ScaleCraft\'s own agent_clients row before sending reminders.' },
        { status: 503 }
      );
    }

    const now = new Date();
    const sentAt = now.toISOString();
    let messagePreview = '';

    // ─── BILLING REMINDER ─────────────────────────────────────────────────────
    if (type === 'billing') {
      const daysUntilDue = nextBillingDate
        ? Math.floor((new Date(nextBillingDate).getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
        : null;

      const duePart = daysUntilDue === null
        ? 'soon'
        : daysUntilDue < 0
          ? `overdue by ${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) === 1 ? '' : 's'}`
          : `due on ${formatDate(nextBillingDate!)}`;

      // Resolve payment link — reuse if still valid, else create fresh
      let paymentLinkUrl = client.currentPaymentLinkUrl;
      let paymentLinkId = client.currentPaymentLinkId;

      const linkExpired = !paymentLinkUrl
        || !client.paymentLinkExpiresAt
        || new Date(client.paymentLinkExpiresAt) <= now;

      if (linkExpired) {
        if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
          return NextResponse.json(
            { error: 'Razorpay credentials not configured (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET)' },
            { status: 503 }
          );
        }

        const razorpay = new Razorpay({
          key_id: process.env.RAZORPAY_KEY_ID,
          key_secret: process.env.RAZORPAY_KEY_SECRET,
        });

        const amountPaise = Math.round((monthlyAmount ?? 1299) * 100);
        const expiresAt = Math.floor((now.getTime() + 30 * 24 * 60 * 60 * 1000) / 1000); // 30 days

        let link: any;
        try {
          link = await (razorpay as any).paymentLink.create({
            amount: amountPaise,
            currency: 'INR',
            description: `ScaleCraft Agent Renewal — ${client.businessName}`,
            expire_by: expiresAt,
            notify: { sms: false, email: false }, // We handle notification ourselves
            reminder_enable: false,
            notes: {
              clientId: client.id,
              type: 'renewal',
              businessName: client.businessName,
            },
          });
        } catch (rzErr: any) {
          console.error('[Reminders Send] Razorpay payment link creation failed:', rzErr.message);
          return NextResponse.json(
            { error: 'Failed to create payment link: ' + rzErr.message },
            { status: 502 }
          );
        }

        paymentLinkId = link.id;
        paymentLinkUrl = link.short_url || link.id;
        const linkExpiresAt = new Date(expiresAt * 1000).toISOString();

        // Persist payment link on client record
        await supabaseAdmin
          .from('agent_clients')
          .update({
            current_payment_link_id: paymentLinkId,
            current_payment_link_url: paymentLinkUrl,
            payment_link_expires_at: linkExpiresAt,
          })
          .eq('id', client.id);
      }

      // Build message — wording matches the pending Meta billing_reminder template exactly:
      // Template body: "Hello {{1}}! Your ScaleCraft WhatsApp Agent subscription of ₹{{2}} is
      //   currently {{3}}. Please renew to avoid service interruption. Pay securely here: {{4}}"
      // Template params order: [ownerName, monthlyAmount, duePart, paymentLinkUrl]
      const msgBody = `Hello ${ownerName || 'there'}! Your ScaleCraft WhatsApp Agent subscription of ₹${monthlyAmount ?? 1299} is currently ${duePart}. Please renew to avoid service interruption. Pay securely here: ${paymentLinkUrl}`;

      messagePreview = msgBody;

      // Send via platform number as plain text (templates pending Meta approval)
      // TODO: Once billing_reminder template is APPROVED on Meta Business Manager, replace with:
      // await sendPlatformMessage(ownerPhone, msgBody, {
      //   templateName: 'billing_reminder',
      //   templateParams: [ownerName || 'there', String(monthlyAmount ?? 1299), duePart, paymentLinkUrl!],
      //   forceTemplate: true,
      // });
      await sendPlatformMessage(ownerPhone, msgBody);

      // Update reminder counters
      await supabaseAdmin
        .from('agent_clients')
        .update({
          last_billing_reminder_sent_at: sentAt,
          billing_reminder_count: (billingReminderCount ?? 0) + 1,
        })
        .eq('id', client.id);
    }

    // ─── TRIAL REMINDER ───────────────────────────────────────────────────────
    if (type === 'trial') {
      const daysUntilTrialEnd = client.trialEndsAt
        ? Math.floor((new Date(client.trialEndsAt).getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
        : null;

      const trialPart = daysUntilTrialEnd === null
        ? 'soon'
        : daysUntilTrialEnd <= 0
          ? 'today'
          : `in ${daysUntilTrialEnd} day${daysUntilTrialEnd === 1 ? '' : 's'}`;

      // Build message — wording matches the pending Meta trial_reminder template exactly:
      // Template body: "Hello {{1}}! Your ScaleCraft WhatsApp Agent free trial ends {{2}}.
      //   Upgrade now to keep your agent running around the clock: https://thescalecraft.in/upgrade"
      // Template params order: [ownerName, trialPart]
      const msgBody = `Hello ${ownerName || 'there'}! Your ScaleCraft WhatsApp Agent free trial ends ${trialPart}. Upgrade now to keep your agent running around the clock: https://thescalecraft.in/upgrade`;
      messagePreview = msgBody;

      // Send via platform number as plain text (templates pending Meta approval)
      // TODO: Once trial_reminder template is APPROVED on Meta Business Manager, replace with:
      // await sendPlatformMessage(ownerPhone, msgBody, {
      //   templateName: 'trial_reminder',
      //   templateParams: [ownerName || 'there', trialPart],
      //   forceTemplate: true,
      // });
      await sendPlatformMessage(ownerPhone, msgBody);

      // Mark trial reminder sent and increment count
      await supabaseAdmin
        .from('agent_clients')
        .update({
          trial_reminder_sent: true,
          // Also track count on a best-effort basis by reusing billing_reminder_count
          // for trial clients (the UI shows a unified "reminder count" column)
          billing_reminder_count: (billingReminderCount ?? 0) + 1,
          last_billing_reminder_sent_at: sentAt,
        })
        .eq('id', client.id);
    }

    return NextResponse.json({
      success: true,
      sentAt,
      messagePreview,
    });
  } catch (error: any) {
    // Surface the real error message to the admin (this is admin-only; not user-facing)
    console.error('[Admin Reminders Send] Unexpected error:', error.message);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
