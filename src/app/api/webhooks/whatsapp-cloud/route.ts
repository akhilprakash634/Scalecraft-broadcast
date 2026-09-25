import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import crypto from 'crypto';

// GET — Meta calls this to verify the webhook
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token) {
      // Check if token matches any registered client
      const { data } = await supabaseAdmin
        .from('agent_clients')
        .select('id')
        .eq('whatsapp_verify_token', token)
        .maybeSingle();

      if (data) {
        return new Response(challenge, {
          status: 200,
          headers: { 'Content-Type': 'text/plain' },
        });
      }
    }
    return new Response('Forbidden', { status: 403 });
  } catch (error) {
    return new Response('Internal Server Error', { status: 500 });
  }
}

// POST — Meta sends incoming messages and status receipts here
export async function POST(request: Request) {
  try {
    const body = await request.text();
    const payload = JSON.parse(body);

    const eventHash = crypto.createHash('sha256').update(body).digest('hex');
    
    // Process idempotency
    const { data: existingEvent } = await supabaseAdmin
      .from('whatsapp_webhook_events')
      .select('id')
      .eq('event_hash', eventHash)
      .maybeSingle();
      
    if (existingEvent) {
      return new Response('OK', { status: 200 }); // Already processed
    }

    const phoneNumberId = payload.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;
    let clientId = '';
    let whatsappToken = '';

    if (phoneNumberId) {
      const { data } = await supabaseAdmin
        .from('agent_clients')
        .select('id, whatsapp_access_token, type_specific_data')
        .eq('whatsapp_phone_number_id', phoneNumberId)
        .single();
      if (data) {
        clientId = data.id;
        whatsappToken = data.whatsapp_access_token;
        if (!whatsappToken && data.type_specific_data) {
          try {
             const tsd = JSON.parse(data.type_specific_data);
             whatsappToken = tsd.whatsapp_access_token || '';
          } catch {}
        }
      }
    }

    if (!clientId) {
      return new Response('OK', { status: 200 });
    }

    // Log the event
    await supabaseAdmin.from('whatsapp_webhook_events').insert({
      business_id: clientId,
      event_hash: eventHash,
      payload: payload,
      processed: true
    });

    const entries = payload.entry || [];
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        const value = change.value;

        // Status updates (sent, delivered, read, failed)
        if (value && Array.isArray(value.statuses)) {
          for (const statusItem of value.statuses) {
            const wamid = statusItem.id;
            const newStatus = (statusItem.status || '').toLowerCase();
            const timestampStr = statusItem.timestamp ? new Date(parseInt(statusItem.timestamp) * 1000).toISOString() : new Date().toISOString();
            
            let errorMsg = null;
            let errorCode = null;
            if (statusItem.errors && statusItem.errors.length > 0) {
              errorCode = statusItem.errors[0].code;
              errorMsg = statusItem.errors[0].message;
            }

            const updateData: any = {
              status: newStatus,
              error_code: errorCode,
              error_message: errorMsg
            };
            if (newStatus === 'sent') updateData.sent_at = timestampStr;
            else if (newStatus === 'delivered') updateData.delivered_at = timestampStr;
            else if (newStatus === 'read') updateData.read_at = timestampStr;
            else if (newStatus === 'failed') updateData.failed_at = timestampStr;

            // Fetch existing message to check status rank
            const { data: existingMsg } = await supabaseAdmin
              .from('whatsapp_messages')
              .select('id, status, campaign_id, contact_id')
              .eq('whatsapp_message_id', wamid)
              .maybeSingle();

            if (existingMsg) {
              const STATUS_RANK: Record<string, number> = { failed: 0, queued: 1, sending: 2, sent: 3, delivered: 4, read: 5 };
              const currentRank = STATUS_RANK[existingMsg.status] || 0;
              const newRank = STATUS_RANK[newStatus] || 0;

              // Only update if rank is higher, except for failed (failed is final)
              if (newRank >= currentRank || newStatus === 'failed') {
                await supabaseAdmin.from('whatsapp_messages').update(updateData).eq('id', existingMsg.id);
                
                // If it's part of a campaign, update recipient
                if (existingMsg.campaign_id) {
                  await supabaseAdmin.from('whatsapp_campaign_recipients').update(updateData).eq('message_id', existingMsg.id);
                }
              }
            }
          }
        }

        // Inbound customer messages
        if (value && Array.isArray(value.messages)) {
          for (const msg of value.messages) {
            const fromPhone = msg.from;
            const wamid = msg.id;
            const timestampStr = msg.timestamp ? new Date(parseInt(msg.timestamp) * 1000).toISOString() : new Date().toISOString();
            
            const contactName = msg.context?.from || value.contacts?.[0]?.profile?.name || fromPhone;

            // 1. Find or create whatsapp_contacts
            let { data: contact } = await supabaseAdmin
              .from('whatsapp_contacts')
              .select('id')
              .eq('business_id', clientId)
              .eq('normalized_phone', fromPhone)
              .maybeSingle();

            if (!contact) {
              const { data: newContact } = await supabaseAdmin
                .from('whatsapp_contacts')
                .insert({
                  business_id: clientId,
                  name: contactName,
                  phone: fromPhone,
                  normalized_phone: fromPhone,
                  last_contacted_at: timestampStr
                }).select('id').single();
              contact = newContact;
            } else {
              await supabaseAdmin.from('whatsapp_contacts').update({ last_contacted_at: timestampStr }).eq('id', contact!.id);
            }

            // 2. Find or create whatsapp_conversations
            let { data: conversation } = await supabaseAdmin
              .from('whatsapp_conversations')
              .select('id, unread_count')
              .eq('business_id', clientId)
              .eq('contact_id', contact!.id)
              .maybeSingle();

            if (!conversation) {
              const { data: newConv } = await supabaseAdmin
                .from('whatsapp_conversations')
                .insert({
                  business_id: clientId,
                  contact_id: contact!.id,
                  unread_count: 0
                }).select('id, unread_count').single();
              conversation = newConv;
            }

            // 3. Process media if any
            let contentStr = '';
            let mediaUrl = null;
            if (msg.type === 'text') {
              contentStr = msg.text.body;
            } else {
               const mediaObj = msg[msg.type];
               if (mediaObj && mediaObj.id && whatsappToken) {
                 try {
                   // Download media
                   const metaRes = await fetch(`https://graph.facebook.com/v19.0/${mediaObj.id}`, { headers: { 'Authorization': `Bearer ${whatsappToken}` } });
                   const metaJson = await metaRes.json();
                   if (metaJson.url) {
                      const mediaRes = await fetch(metaJson.url, { headers: { 'Authorization': `Bearer ${whatsappToken}` } });
                      const mediaBuffer = await mediaRes.arrayBuffer();
                      const fileName = `${clientId}/${Date.now()}_${mediaObj.id}`;
                      const { data: uploadData } = await supabaseAdmin.storage.from('chat-media').upload(fileName, mediaBuffer, { upsert: true });
                      if (uploadData) {
                        const { data: publicUrlData } = supabaseAdmin.storage.from('chat-media').getPublicUrl(uploadData.path);
                        mediaUrl = publicUrlData.publicUrl;
                      }
                   }
                   contentStr = `[media:${msg.type}:${mediaUrl || mediaObj.id}]`;
                   if (msg.type === 'document' && mediaObj.caption) contentStr += ` ${mediaObj.caption}`;
                   if (msg.type === 'image' && mediaObj.caption) contentStr += ` ${mediaObj.caption}`;
                   if (msg.type === 'video' && mediaObj.caption) contentStr += ` ${mediaObj.caption}`;
                 } catch (e) {}
               }
            }

            // 4. Insert message
            const { data: newMessage } = await supabaseAdmin.from('whatsapp_messages').insert({
              business_id: clientId,
              conversation_id: conversation!.id,
              contact_id: contact!.id,
              direction: 'incoming',
              message_type: msg.type,
              content: contentStr,
              media_url: mediaUrl,
              whatsapp_message_id: wamid,
              status: 'received',
              created_at: timestampStr
            }).select('id').single();

            // 5. Update conversation
            if (newMessage) {
              await supabaseAdmin.from('whatsapp_conversations').update({
                last_message_id: newMessage.id,
                last_message_at: timestampStr,
                unread_count: (conversation!.unread_count || 0) + 1
              }).eq('id', conversation!.id);
            }
          }
        }
      }
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('[Webhook] POST error:', error);
    return new Response('OK', { status: 200 }); // Always 200 to prevent Meta retries
  }
}
