import { NextResponse } from 'next/server';
import { getSessionClient } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { formatMediaMessage } from '@/lib/mediaMessage';

type Params = Promise<{ phone: string }>;

export async function GET(request: Request, segmentData: { params: Params }) {
  try {
    const client = await getSessionClient();
    if (!client) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { phone } = await segmentData.params;
    if (!phone) {
      return NextResponse.json({ error: 'Phone parameter is required' }, { status: 400 });
    }

    const clientId = client.clientId || client.id || client._id;
    const phoneDigits = phone.replace(/\D/g, '');
    
    // Fallback normalizer
    const normalizedPhone = phoneDigits; // Assumes normalized_phone is pure digits

    // 1. Get contact
    const { data: contact } = await supabaseAdmin
      .from('whatsapp_contacts')
      .select('id, name, phone, normalized_phone, status')
      .eq('business_id', clientId)
      .eq('normalized_phone', normalizedPhone)
      .maybeSingle();

    if (!contact) {
      // If contact doesn't exist, return empty
      return NextResponse.json({ phone: normalizedPhone, name: normalizedPhone, messages: [] });
    }

    // 2. Get conversation
    const { data: conversation } = await supabaseAdmin
      .from('whatsapp_conversations')
      .select('id')
      .eq('business_id', clientId)
      .eq('contact_id', contact.id)
      .maybeSingle();

    if (!conversation) {
      return NextResponse.json({ phone: contact.phone, name: contact.name, messages: [] });
    }

    // 3. Get messages
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const { data: messagesData, error: msgError } = await supabaseAdmin
      .from('whatsapp_messages')
      .select('id, direction, content, message_type, media_url, status, created_at, error_message')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true }) // Old frontend expects chronological
      .range(offset, offset + limit - 1);

    if (msgError) {
      console.error('Failed to fetch messages:', msgError.message);
    }

    const mappedMessages = (messagesData || []).map(m => {
      // Re-map to legacy format for UI compatibility if needed, or stick to new
      return {
        id: m.id,
        sender: m.direction === 'incoming' ? 'customer' : 'agent',
        text: m.content || '',
        mediaUrl: m.media_url,
        mediaType: m.message_type,
        timestamp: m.created_at,
        status: m.status,
        error: m.error_message
      };
    });

    return NextResponse.json({
      phone: contact.normalized_phone,
      name: contact.name || contact.phone,
      contact_id: contact.id,
      conversation_id: conversation.id,
      messages: mappedMessages
    });

  } catch (error: any) {
    console.error('Conversation GET API Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: Request, segmentData: { params: Params }) {
  try {
    const client = await getSessionClient();
    if (!client) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { phone } = await segmentData.params;
    if (!phone) {
      return NextResponse.json({ error: 'Phone parameter is required' }, { status: 400 });
    }

    const clientId = client.clientId || client.id || client._id;
    const body = await request.json();
    const phoneDigits = phone.replace(/\D/g, '');

    // Get Contact & Conversation first
    let { data: contact } = await supabaseAdmin
      .from('whatsapp_contacts')
      .select('id, name')
      .eq('business_id', clientId)
      .eq('normalized_phone', phoneDigits)
      .maybeSingle();

    if (!contact) {
      const { data: newContact } = await supabaseAdmin.from('whatsapp_contacts').insert({
        business_id: clientId,
        phone: phoneDigits,
        normalized_phone: phoneDigits,
        name: phoneDigits
      }).select('id, name').single();
      contact = newContact;
    }

    let { data: conversation } = await supabaseAdmin
      .from('whatsapp_conversations')
      .select('id')
      .eq('business_id', clientId)
      .eq('contact_id', contact!.id)
      .maybeSingle();

    if (!conversation) {
      const { data: newConv } = await supabaseAdmin.from('whatsapp_conversations').insert({
        business_id: clientId,
        contact_id: contact!.id
      }).select('id').single();
      conversation = newConv;
    }

    if (body.action === 'send_message') {
      const { text, mediaUrl, mediaType, filename } = body;
      
      const cleanText = text?.trim() || '';
      if (!cleanText && !mediaUrl) {
        return NextResponse.json({ error: 'Message text or media is required' }, { status: 400 });
      }

      // OUTBOUND SAFETY GUARD
      if (cleanText === '[IGNORE]' || cleanText === '[SILENCE]') {
        return NextResponse.json({ success: true, suppressed: true, reason: 'AI control token' });
      }

      // Fetch Meta API Credentials
      const { data: clientData } = await supabaseAdmin
        .from('agent_clients')
        .select('whatsapp_phone_number_id, whatsapp_access_token')
        .eq('id', clientId)
        .single();

      if (!clientData?.whatsapp_phone_number_id || !clientData?.whatsapp_access_token) {
         return NextResponse.json({ error: 'Cloud API credentials not configured' }, { status: 400 });
      }

      const phoneNumberId = clientData.whatsapp_phone_number_id;
      const accessToken = clientData.whatsapp_access_token;

      let metaPayload: any = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phoneDigits,
      };

      if (mediaUrl && mediaType) {
        metaPayload.type = mediaType;
        if (mediaType === 'image') {
          metaPayload.image = { link: mediaUrl, caption: cleanText || undefined };
        } else if (mediaType === 'video') {
          metaPayload.video = { link: mediaUrl, caption: cleanText || undefined };
        } else if (mediaType === 'audio') {
          metaPayload.audio = { link: mediaUrl };
        } else if (mediaType === 'document') {
          metaPayload.document = { link: mediaUrl, filename: filename || 'Document', caption: cleanText || undefined };
        }
      } else {
        metaPayload.type = 'text';
        metaPayload.text = { body: cleanText };
      }

      const metaRes = await fetch(
        `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(metaPayload),
        }
      );

      if (!metaRes.ok) {
        const err = await metaRes.json();
        console.error('[CRM Send] Meta API error:', err);
        return NextResponse.json({
          error: `Failed to send via Cloud API: ${err.error?.message || 'Unknown error'}`,
        }, { status: 502 });
      }

      const metaData = await metaRes.json();
      const metaMessageId = metaData.messages?.[0]?.id;

      // Log Outgoing Message in DB
      const { data: insertedMessage } = await supabaseAdmin.from('whatsapp_messages').insert({
        business_id: clientId,
        conversation_id: conversation!.id,
        contact_id: contact!.id,
        direction: 'outgoing',
        message_type: mediaType || 'text',
        content: cleanText,
        media_url: mediaUrl || null,
        whatsapp_message_id: metaMessageId,
        status: metaMessageId ? 'sent' : 'failed'
      }).select('id').single();

      if (insertedMessage) {
        await supabaseAdmin.from('whatsapp_conversations').update({
          last_message_id: insertedMessage.id,
          last_message_at: new Date().toISOString()
        }).eq('id', conversation!.id);
      }

      return NextResponse.json({ success: true, responseData: metaData });
    }

    // Status / Contact updates
    const updatePayload: any = {};
    if (body.name !== undefined) updatePayload.name = body.name;
    if (body.status !== undefined || body.manual_status !== undefined) updatePayload.status = body.manual_status || body.status;
    
    if (Object.keys(updatePayload).length > 0) {
      await supabaseAdmin.from('whatsapp_contacts').update(updatePayload).eq('id', contact!.id);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Conversation PATCH API Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
