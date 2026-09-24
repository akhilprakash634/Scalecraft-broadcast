import { NextResponse } from 'next/server';
import { getSessionClient } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import {
  generateFollowUpMessage,
  sendAndLogFollowUp
} from '@/lib/followup';

export async function POST(request: Request) {
  try {
    const client = await getSessionClient();
    if (!client) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, phone, customMessage } = await request.json();
    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    // Retrieve the lead cache to make sure client owns it
    const { data: lead, error: leadErr } = await supabaseAdmin
      .from('leads_cache')
      .select('*')
      .eq('phone', phone)
      .eq('client_id', client.clientId)
      .maybeSingle();

    if (leadErr || !lead) {
      return NextResponse.json({ error: 'Lead not found or unauthorized' }, { status: 404 });
    }

    if (action === 'preview') {
      try {
        const message = await generateFollowUpMessage(client, lead);
        return NextResponse.json({ success: true, message });
      } catch (err: any) {
        return NextResponse.json({ error: `Gemini preview failed: ${err.message}` }, { status: 500 });
      }
    }

    if (action === 'skip') {
      const { error: updateErr } = await supabaseAdmin
        .from('leads_cache')
        .update({
          follow_up_sent: true,
          follow_up_sent_at: new Date().toISOString(),
          follow_up_message: 'Skipped manually',
          follow_up_locked_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('phone', phone)
        .eq('client_id', client.clientId);

      if (updateErr) {
        return NextResponse.json({ error: `Failed to skip lead: ${updateErr.message}` }, { status: 500 });
      }
      return NextResponse.json({ success: true, status: 'skipped' });
    }

    if (action === 'send') {
      // 1. Claim lock
      const { data: claimed } = await supabaseAdmin.rpc('claim_followup_lead', {
        p_client_id: client.clientId,
        p_phone: phone
      });
      if (!claimed) {
        return NextResponse.json({ error: 'Lead is currently locked by another process or already sent' }, { status: 409 });
      }

      let message = customMessage || '';
      try {
        if (!message) {
          message = await generateFollowUpMessage(client, lead);
        }

        // Send & Log via WhatsApp bridge or Meta Cloud API
        await sendAndLogFollowUp(
          client,
          client.sshPrivateKey,
          phone,
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
          .eq('phone', phone);

        return NextResponse.json({ success: true, status: 'sent', message });
      } catch (err: any) {
        console.error(`[Manual Follow-up] Send failed for ${phone}:`, err.message);

        // Release lock
        await supabaseAdmin
          .from('leads_cache')
          .update({
            follow_up_locked_at: null,
            updated_at: new Date().toISOString()
          })
          .eq('phone', phone);

        return NextResponse.json({ error: `Manual send failed: ${err.message}` }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400 });
  } catch (error: any) {
    console.error('[Manual Action] Global catch error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
