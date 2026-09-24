// Primary trigger: cron-job.org every 6 hours
// Fallback trigger: Vercel Cron daily at 9am IST
// Both secured with CRON_SECRET header

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAllAgentClients } from '@/lib/agents';
import {
  generateFollowUpMessage,
  sendViaWhatsAppBridge,
  logFollowUpToStateDb
} from '@/lib/followup';

const SAFETY_LIMITS = {
  maxLeadsPerRun: 20,
  maxFollowUpsPerLead: 1,
  minHoursBetween: 24,
  blackoutHours: [22, 23, 0, 1, 2, 3, 4, 5, 6], // 10pm - 7am IST
};

function isClientActive(client: any): boolean {
  if (client.status !== 'active') return false;
  if (client.agentPausedAt) return false;
  if (client.autoFollowUpEnabled === false) return false;

  if (client.planType === 'trial') {
    const now = Date.now();
    const trialEnds = client.trialEndsAt ? new Date(client.trialEndsAt).getTime() : 0;
    const graceEnds = client.gracePeriodEndsAt ? new Date(client.gracePeriodEndsAt).getTime() : (trialEnds + 3 * 24 * 60 * 60 * 1000);
    if (now > graceEnds) {
      return false;
    }
  }
  return true;
}

export async function GET(request: Request) {
  try {
    // 1. Verify this is called by Vercel Cron (or system internally)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'scalecraft-cron-secret-key-123';
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Blackout Hours check (IST is UTC + 5.5 hours)
    const hourIST = (new Date().getUTCHours() + 5.5) % 24;
    const currentHour = Math.floor(hourIST);
    if (SAFETY_LIMITS.blackoutHours.includes(currentHour)) {
      return NextResponse.json({
        skipped: true,
        reason: `Blackout hours (${currentHour} IST) - no messages sent`
      });
    }

    const now = new Date();
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    // 3. Query up to 20 eligible leads due for follow-up
    const { data: eligibleLeads, error: dbError } = await supabaseAdmin
      .from('leads_cache')
      .select('*')
      .lte('follow_up_date', now.toISOString())
      .eq('follow_up_sent', false)
      .eq('is_dnd', false)
      .eq('is_converted', false)
      .in('intent', ['warm', 'hot', 'follow_up'])
      .lt('follow_up_count', SAFETY_LIMITS.maxFollowUpsPerLead)
      .or(`follow_up_locked_at.is.null,follow_up_locked_at.lt.${tenMinutesAgo}`)
      .limit(SAFETY_LIMITS.maxLeadsPerRun);

    if (dbError) {
      console.error('[Cron Follow-up] DB query error:', dbError.message);
      return NextResponse.json({ error: 'Failed to query eligible leads' }, { status: 500 });
    }

    if (!eligibleLeads || eligibleLeads.length === 0) {
      return NextResponse.json({ processed: 0, message: 'No leads due for follow-up' });
    }

    // 4. Fetch all client profiles
    const allClients = await getAllAgentClients();
    const clientsMap = new Map<string, any>();
    allClients.forEach(c => {
      clientsMap.set(c.id, c);
    });

    const results = [];

    // 5. Process each lead
    for (const lead of eligibleLeads) {
      // Inbound customer response check: if customer replied after follow-up date was set, cancel follow-up!
      if (lead.last_customer_message_at && lead.follow_up_date) {
        const lastCustMsgTime = new Date(lead.last_customer_message_at).getTime();
        const followUpTime = new Date(lead.follow_up_date).getTime();
        if (lastCustMsgTime >= followUpTime - 5 * 60 * 1000) {
          await supabaseAdmin
            .from('leads_cache')
            .update({
              follow_up_sent: true,
              follow_up_sent_at: new Date().toISOString(),
              follow_up_message: 'Cancelled: Customer replied before follow-up',
              follow_up_locked_at: null,
              updated_at: new Date().toISOString()
            })
            .eq('client_id', lead.client_id)
            .eq('phone', lead.phone);

          results.push({
            lead: lead.phone,
            status: 'cancelled_customer_replied'
          });
          continue;
        }
      }

      // Safety: verify minimum time since last message
      if (lead.last_message_at) {
        const hoursSinceMessage = (Date.now() - new Date(lead.last_message_at).getTime()) / 3600000;
        if (hoursSinceMessage < SAFETY_LIMITS.minHoursBetween) {
          results.push({
            lead: lead.phone,
            status: 'skipped_too_recent',
            hoursSinceMessage: Math.round(hoursSinceMessage)
          });
          continue;
        }
      }

      // Multi-client safety check
      const client = clientsMap.get(lead.client_id);
      if (!client) {
        results.push({ lead: lead.phone, status: 'skipped_client_not_found' });
        continue;
      }

      if (!isClientActive(client)) {
        results.push({ lead: lead.phone, status: 'skipped_client_inactive_or_paused' });
        continue;
      }

      // ATOMIC CLAIM
      const { data: claimed } = await supabaseAdmin.rpc('claim_followup_lead', {
        p_client_id: lead.client_id,
        p_phone: lead.phone
      });
      if (!claimed) {
        results.push({ lead: lead.phone, status: 'skipped_already_claimed' });
        continue;
      }

      try {
        // Generate personalized message using Gemini
        const message = await generateFollowUpMessage(client, lead);

        // Send via WhatsApp bridge or Meta Cloud API
        await sendViaWhatsAppBridge(
          client,
          lead.phone,
          message,
          lead
        );

        // Log into state.db on VPS if SSH keys exist
        if (client.sshPrivateKey) {
          await logFollowUpToStateDb(
            client,
            client.sshPrivateKey,
            lead.phone,
            message,
            client.serverUser || 'ubuntu'
          );
        }

        // Mark as sent
        await supabaseAdmin
          .from('leads_cache')
          .update({
            follow_up_sent: true,
            follow_up_sent_at: new Date().toISOString(),
            follow_up_message: message,
            follow_up_count: (lead.follow_up_count || 0) + 1,
            follow_up_locked_at: null,
            updated_at: new Date().toISOString()
          })
          .eq('client_id', lead.client_id)
          .eq('phone', lead.phone);

        results.push({
          lead: lead.phone,
          status: 'sent',
          message_preview: message.slice(0, 50)
        });
      } catch (error: any) {
        console.error(`[Cron Follow-up] Failed to process lead ${lead.phone}:`, error.message);

        // Release lock on failure so it can retry
        await supabaseAdmin
          .from('leads_cache')
          .update({
            follow_up_locked_at: null,
            updated_at: new Date().toISOString()
          })
          .eq('client_id', lead.client_id)
          .eq('phone', lead.phone);

        results.push({
          lead: lead.phone,
          status: 'failed',
          error: error.message
        });
      }
    }

    return NextResponse.json({
      processed: results.length,
      results
    });
  } catch (error: any) {
    console.error('[Cron Follow-up] Global catch error:', error.message);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
