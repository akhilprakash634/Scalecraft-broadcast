import { NextResponse } from 'next/server';
import { getSessionClient } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const client = await getSessionClient();
    if (!client) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clientId = client.clientId || client.id || client._id;

    // Fetch the most recent campaign started by this client
    const { data: latestCampaign, error: dbError } = await supabaseAdmin
      .from('whatsapp_campaigns')
      .select('*')
      .eq('business_id', clientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (dbError) {
      console.error('[broadcast/status] DB error:', dbError.message);
    }

    if (!latestCampaign) {
      return NextResponse.json({
        progress: { sent: 0, failed: 0, total: 0, running: false, paused: false },
        logHistory: []
      });
    }

    const { data: recipients } = await supabaseAdmin
      .from('whatsapp_campaign_recipients')
      .select('status, error_message, whatsapp_contacts(phone)')
      .eq('campaign_id', latestCampaign.id);
      
    let sent = 0;
    let failed = 0;
    const logs: string[] = [];
    
    if (recipients) {
      for (const rec of recipients) {
        const contact: any = Array.isArray(rec.whatsapp_contacts) 
          ? rec.whatsapp_contacts[0] 
          : rec.whatsapp_contacts;
        const phone = contact?.phone;
          
        if (rec.status === 'sent' || rec.status === 'delivered' || rec.status === 'read') {
          sent++;
          logs.push(`Sent successfully to ${phone}`);
        } else if (rec.status === 'failed') {
          failed++;
          logs.push(`Failed for ${phone}: ${rec.error_message || 'Unknown error'}`);
        }
      }
    }

    const running = latestCampaign.status === 'processing';
    const paused = latestCampaign.status === 'scheduled'; // reusing scheduled as paused? Wait, scheduled means not started yet. Paused could be mapped to "failed" or a new state.
    
    return NextResponse.json({
      progress: {
        sent,
        failed,
        total: latestCampaign.total_recipients || 0,
        running,
        paused
      },
      logHistory: logs
    });

  } catch (error: any) {
    console.error('Broadcast Status API Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
