import { NextResponse } from 'next/server';
import { getSessionClient } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const client = await getSessionClient();
    if (!client) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');
    const clientId = client.clientId || client.id || client._id;
    let targetCampaignId = campaignId;

    if (!targetCampaignId) {
      // Find latest campaign
      const { data: latest } = await supabaseAdmin
        .from('whatsapp_campaigns')
        .select('id')
        .eq('business_id', clientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
        
      if (latest) targetCampaignId = latest.id;
    }

    if (!targetCampaignId) {
      return new Response('No campaign history found.', { status: 404 });
    }

    const { data: logs } = await supabaseAdmin
      .from('whatsapp_campaign_recipients')
      .select('status, error_message, whatsapp_contacts(phone)')
      .eq('campaign_id', targetCampaignId)
      .limit(1000); 

    if (!logs || logs.length === 0) {
      return new Response('No logs available for this campaign yet.', { status: 404 });
    }

    const formattedLogs = logs.map(l => {
      const contact: any = Array.isArray(l.whatsapp_contacts) ? l.whatsapp_contacts[0] : l.whatsapp_contacts;
      const phone = contact?.phone || 'Unknown';
      return `[${new Date().toLocaleTimeString()}] ${phone} - ${l.status.toUpperCase()} ${l.error_message ? `(${l.error_message})` : ''}`;
    }).join('\n');

    return new Response(formattedLogs, {
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': `attachment; filename="broadcast_full_log.txt"`,
      },
    });
  } catch (error: any) {
    console.error('Broadcast Full Log API Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
