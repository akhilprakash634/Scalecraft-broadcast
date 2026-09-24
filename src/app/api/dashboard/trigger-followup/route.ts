import { NextResponse } from 'next/server';
import { getSessionClient } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { getClientServerIp } from '@/lib/ssh';
import {
  generateFollowUpMessage,
  sendAndLogFollowUp
} from '@/lib/followup';

const SAFETY_LIMITS = {
  maxLeadsPerRun: 6,
  maxFollowUpsPerLead: 1,
  minHoursBetween: 24,
  blackoutHours: [22, 23, 0, 1, 2, 3, 4, 5, 6], // 10pm - 7am IST
};

export async function POST(request: Request) {
  try {
    // 1. Verify session
    const client = await getSessionClient();
    if (!client) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (client.autoFollowUpEnabled === false) {
      return NextResponse.json({ 
        success: false, 
        message: 'Auto follow-ups are disabled in your settings.' 
      }, { status: 400 });
    }

    // 2. Blackout Hours check (IST is UTC + 5.5 hours)
    const hourIST = (new Date().getUTCHours() + 5.5) % 24;
    const currentHour = Math.floor(hourIST);
    if (SAFETY_LIMITS.blackoutHours.includes(currentHour)) {
      return NextResponse.json({ 
        success: false, 
        message: `Skipped: Currently in blackout hours (${currentHour} IST).` 
      });
    }

    const now = new Date();
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    // 3. Query eligible leads due for follow-up for this specific client only
    const { data: eligibleLeads, error: dbError } = await supabaseAdmin
      .from('leads_cache')
      .select('*')
      .eq('client_id', client.clientId)
      .lte('follow_up_date', now.toISOString())
      .eq('follow_up_sent', false)
      .eq('is_dnd', false)
      .eq('is_converted', false)
      .in('intent', ['warm', 'hot', 'follow_up', 'followup'])
      .lt('follow_up_count', SAFETY_LIMITS.maxFollowUpsPerLead)
      .or(`follow_up_locked_at.is.null,follow_up_locked_at.lt.${tenMinutesAgo}`)
      .limit(SAFETY_LIMITS.maxLeadsPerRun);

    if (dbError) {
      return NextResponse.json({ error: `Query error: ${dbError.message}` }, { status: 500 });
    }

    if (!eligibleLeads || eligibleLeads.length === 0) {
      return NextResponse.json({ success: true, processed: 0, message: 'No overdue follow-ups due right now.' });
    }

    const results = [];

    // 4. Process each lead
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
            .eq('client_id', client.clientId)
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

      // ATOMIC CLAIM
      const { data: claimed } = await supabaseAdmin.rpc('claim_followup_lead', {
        p_client_id: client.clientId,
        p_phone: lead.phone
      });
      if (!claimed) {
        results.push({ lead: lead.phone, status: 'skipped_already_claimed' });
        continue;
      }

      try {
        // Generate personalized message using Gemini
        const message = await generateFollowUpMessage(client, lead);

        // Send & Log via WhatsApp bridge or Meta Cloud API
        await sendAndLogFollowUp(
          client,
          client.sshPrivateKey,
          lead.phone,
          message,
          client.serverUser || 'ubuntu',
          lead
        );

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
          .eq('phone', lead.phone);

        results.push({
          lead: lead.phone,
          status: 'sent',
          message_preview: message.slice(0, 50)
        });
      } catch (error: any) {
        console.error(`[Manual Auto-Follow-up] Failed to process lead ${lead.phone}:`, error.message);
        
        // Release lock on failure
        await supabaseAdmin
          .from('leads_cache')
          .update({
            follow_up_locked_at: null,
            updated_at: new Date().toISOString()
          })
          .eq('phone', lead.phone);

        results.push({
          lead: lead.phone,
          status: 'failed',
          error: error.message
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results
    });
  } catch (error: any) {
    console.error('[Manual Auto-Follow-up] Global error:', error.message);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
