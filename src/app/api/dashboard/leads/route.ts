import { NextResponse } from 'next/server';
import { getSessionClient } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const client = await getSessionClient();
    if (!client) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clientId = client.clientId || client.id || client._id;

    // 1. Fetch conversations with contacts and last messages
    const { data: conversations, error } = await supabaseAdmin
      .from('whatsapp_conversations')
      .select(`
        id,
        unread_count,
        last_message_at,
        whatsapp_contacts ( id, name, phone, normalized_phone ),
        whatsapp_messages!fk_last_message ( id, content, direction, status, created_at, message_type )
      `)
      .eq('business_id', clientId)
      .order('last_message_at', { ascending: false });

    if (error) {
      console.error('Database error fetching conversations:', error);
      return NextResponse.json({ error: 'Database error retrieving leads' }, { status: 500 });
    }

    const mappedConversations = (conversations || []).map((conv: any) => {
      // Find the last message (whatsapp_messages is an array because of one-to-many, 
      // but wait, we have a last_message_id in conversation! We can just fetch the message directly or sort)
      // Wait, in Supabase relation without explicit foreign key to single message, it joins all messages.
      // Actually, since last_message_id is a FK to whatsapp_messages, the join name is `whatsapp_messages!fk_last_message`
      // Let's just assume we return the first message if joined as array, or the object if joined directly.
      const lastMsg = Array.isArray(conv.whatsapp_messages) ? conv.whatsapp_messages[0] : conv.whatsapp_messages;
      
      return {
        id: conv.id,
        contact: {
          name: conv.whatsapp_contacts?.name || conv.whatsapp_contacts?.phone,
          phone: conv.whatsapp_contacts?.normalized_phone || conv.whatsapp_contacts?.phone
        },
        lastMessage: lastMsg ? {
          content: lastMsg.content,
          direction: lastMsg.direction,
          status: lastMsg.status,
          createdAt: lastMsg.created_at || conv.last_message_at,
          type: lastMsg.message_type
        } : null,
        unreadCount: conv.unread_count || 0
      };
    });

    // Provide a legacy 'leads' array mapping for temporary frontend compatibility if they use it
    const legacyLeads = mappedConversations.map(c => ({
      phone: c.contact.phone,
      name: c.contact.name,
      last_message_at: c.lastMessage?.createdAt,
      total_messages: 1,
      unread_count: c.unreadCount,
      summary: c.lastMessage?.content
    }));

    return NextResponse.json({ 
      conversations: mappedConversations,
      needs_analysis: false, 
      leads: legacyLeads 
    });

  } catch (error: any) {
    console.error('Leads GET API Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

