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

    const clientIds = Array.from(new Set([client.clientId, client.id, client._id].filter(Boolean)));

    // 1. Total Contacts (leads_cache + contacts)
    const { count: contactsCount } = await supabaseAdmin
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .in('client_id', clientIds);

    const { count: leadsCount } = await supabaseAdmin
      .from('leads_cache')
      .select('*', { count: 'exact', head: true })
      .in('client_id', clientIds);

    const totalContacts = (contactsCount || 0) + (leadsCount || 0);

    // 2. Total Broadcasts
    const { count: regularCount } = await supabaseAdmin
      .from('broadcast_audit')
      .select('*', { count: 'exact', head: true })
      .in('client_id', clientIds);

    const { count: coldCount } = await supabaseAdmin
      .from('broadcast_jobs')
      .select('*', { count: 'exact', head: true })
      .in('client_id', clientIds);

    const totalBroadcasts = (regularCount || 0) + (coldCount || 0);

    // 3. Stats from broadcast_recipient_logs
    let sent = 0, delivered = 0, read = 0, failed = 0;
    
    // Using simple pagination to avoid memory limit on very large datasets
    let page = 0;
    const limit = 5000;
    let hasMore = true;

    while (hasMore) {
      const { data: logs, error } = await supabaseAdmin
        .from('broadcast_recipient_logs')
        .select('status')
        .in('client_id', clientIds)
        .range(page * limit, (page + 1) * limit - 1);

      if (error || !logs || logs.length === 0) {
        hasMore = false;
        break;
      }

      for (const log of logs) {
        const s = (log.status || 'sent').toLowerCase();
        if (s === 'sent') {
          sent++;
        } else if (s === 'delivered') {
          sent++;
          delivered++;
        } else if (s === 'read') {
          sent++;
          delivered++;
          read++;
        } else if (s === 'failed') {
          failed++;
        }
      }

      page++;
      if (logs.length < limit) {
        hasMore = false;
      }
    }

    // 4. Replies (sum of user_messages from leads)
    const { data: leadsData } = await supabaseAdmin
      .from('leads_cache')
      .select('user_messages')
      .in('client_id', clientIds);

    const replies = (leadsData || []).reduce((sum, lead) => sum + (lead.user_messages || 0), 0);

    return NextResponse.json({
      stats: {
        totalContacts,
        totalBroadcasts,
        sent,
        delivered,
        read,
        failed,
        replies,
      }
    });

  } catch (error: any) {
    console.error('Overview API Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
