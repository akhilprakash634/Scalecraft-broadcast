import { NextResponse } from 'next/server';
import { getSessionClient } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const client = await getSessionClient();
    if (!client) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const clientId = client.clientId || client.id || client._id;

    // 1. Fetch regular broadcasts from whatsapp_campaigns
    const { data: campaigns, error } = await supabaseAdmin
      .from('whatsapp_campaigns')
      .select('id, name, template_name, status, total_recipients, created_at, scheduled_at, updated_at')
      .eq('business_id', clientId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch campaigns:', error.message);
      return NextResponse.json({ error: 'Database error retrieving campaigns' }, { status: 500 });
    }

    if (!campaigns || campaigns.length === 0) {
      return NextResponse.json({ history: [] });
    }

    // 2. Fetch stats for these campaigns
    const campaignIds = campaigns.map(c => c.id);
    const { data: recipients, error: recError } = await supabaseAdmin
      .from('whatsapp_campaign_recipients')
      .select('campaign_id, status')
      .in('campaign_id', campaignIds);

    const { data: rotationRecipients } = await supabaseAdmin
      .from('whatsapp_broadcast_rotation_recipients')
      .select('campaign_id, whatsapp_broadcast_rotations(cycle_number)')
      .in('campaign_id', campaignIds);

    const rotationMap: Record<string, number> = {};
    if (rotationRecipients) {
      for (const r of rotationRecipients) {
        const rot = r.whatsapp_broadcast_rotations as any;
        if (r.campaign_id && rot?.cycle_number) {
          rotationMap[r.campaign_id] = rot.cycle_number;
        }
      }
    }

    const statsMap: Record<string, { sent: number; delivered: number; read: number; failed: number }> = {};
    for (const id of campaignIds) {
      statsMap[id] = { sent: 0, delivered: 0, read: 0, failed: 0 };
    }

    if (recipients) {
      for (const rec of recipients) {
        const cId = rec.campaign_id;
        const s = rec.status;
        if (s === 'sent') statsMap[cId].sent++;
        if (s === 'delivered') {
          statsMap[cId].sent++;
          statsMap[cId].delivered++;
        }
        if (s === 'read') {
          statsMap[cId].sent++;
          statsMap[cId].delivered++;
          statsMap[cId].read++;
        }
        if (s === 'failed') statsMap[cId].failed++;
      }
    }

    // 3. Map to UI expected format
    const history = campaigns.map((c) => {
      const counts = statsMap[c.id];
      const total = c.total_recipients || 0;
      
      let mappedStatus = c.status;
      if (mappedStatus === 'draft') mappedStatus = 'stopped';
      if (mappedStatus === 'scheduled') mappedStatus = 'paused';
      if (mappedStatus === 'processing') mappedStatus = 'running';

      return {
        id: c.id,
        type: 'regular',
        job_type: 'regular',
        campaign_type: c.template_name || c.name || 'Custom',
        campaignType: c.template_name || c.name || 'Custom',
        total_leads: total,
        totalLeads: total,
        sent: counts.sent,
        failed: counts.failed,
        status: mappedStatus,
        created_at: c.created_at,
        createdAt: c.created_at,
        completed_at: c.updated_at || c.created_at,
        completedAt: c.updated_at || c.created_at,
        message: c.name || 'Custom',
        rotationCycle: rotationMap[c.id] || null,
        statusCounts: counts,
      };
    });

    return NextResponse.json({ history });
  } catch (error: any) {
    console.error('Campaign History API Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const client = await getSessionClient();
    if (!client) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
    }

    const clientId = client.clientId || client.id || client._id;

    const { error } = await supabaseAdmin
      .from('whatsapp_campaigns')
      .delete()
      .eq('id', id)
      .eq('business_id', clientId);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Campaign record deleted successfully.' });
  } catch (error: any) {
    console.error('Delete Campaign API Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
