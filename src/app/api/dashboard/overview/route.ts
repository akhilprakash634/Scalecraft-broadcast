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

    // 1. Total Contacts (whatsapp_contacts)
    const { count: contactsCount } = await supabaseAdmin
      .from('whatsapp_contacts')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', clientId);

    const totalContacts = contactsCount || 0;

    // 2. Total Broadcasts (whatsapp_campaigns)
    const { count: campaignsCount } = await supabaseAdmin
      .from('whatsapp_campaigns')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', clientId);

    const totalBroadcasts = campaignsCount || 0;

    // 3. Stats from whatsapp_campaign_recipients
    let sent = 0, delivered = 0, read = 0, failed = 0;
    
    // Using simple pagination to avoid memory limit on very large datasets
    let page = 0;
    const limit = 5000;
    let hasMore = true;

    while (hasMore) {
      const { data: logs, error } = await supabaseAdmin
        .from('whatsapp_campaign_recipients')
        .select('status, whatsapp_campaigns!inner(business_id)')
        .eq('whatsapp_campaigns.business_id', clientId)
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

    // 4. Replies (count incoming messages in whatsapp_messages)
    const { count: repliesCount } = await supabaseAdmin
      .from('whatsapp_messages')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', clientId)
      .eq('direction', 'incoming');

    const replies = repliesCount || 0;

    // 5. Connection Status
    let whatsappStatus = 'Not Connected';
    if (client.whatsappAccessToken && client.whatsappPhoneNumberId) {
      whatsappStatus = 'Connected';
    }

    // 6. Recent Conversations (from whatsapp_conversations)
    const { data: recentConvs } = await supabaseAdmin
      .from('whatsapp_conversations')
      .select('whatsapp_contacts(name, phone), last_message_at, unread_count')
      .eq('business_id', clientId)
      .order('last_message_at', { ascending: false })
      .limit(5);

    const recentConversations = (recentConvs || []).map(conv => {
      const contact = Array.isArray(conv.whatsapp_contacts) ? conv.whatsapp_contacts[0] : conv.whatsapp_contacts;
      let customerName = contact?.phone || 'Unknown';
      if (contact?.name && /[a-zA-Z]/.test(contact.name)) {
        customerName = contact.name;
      }

      return {
        customer: customerName,
        lastMessage: conv.unread_count > 0 ? `${conv.unread_count} unread messages` : 'Active conversation',
        time: conv.last_message_at
      };
    });

    return NextResponse.json({
      stats: {
        totalContacts,
        totalBroadcasts,
        sent,
        delivered,
        read,
        failed,
        replies,
      },
      whatsappStatus,
      recentConversations,
    });

  } catch (error: any) {
    console.error('Overview API Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
