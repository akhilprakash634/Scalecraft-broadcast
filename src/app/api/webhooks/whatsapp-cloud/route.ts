import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const HERMES_PORT = 8090;

function getSharedServerUrl(): string {
  const ip = process.env.SHARED_SERVER_IP || '13.206.143.171';
  return `http://${ip}:${HERMES_PORT}`;
}

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
        .select('id, hermes_profile')
        .eq('whatsapp_verify_token', token)
        .maybeSingle();

      if (data) {
        // Valid token — respond directly with the challenge
        return new Response(challenge, {
          status: 200,
          headers: { 'Content-Type': 'text/plain' },
        });
      }
    }

    console.error('[WhatsApp Webhook] Verification failed or token mismatch');
    return new Response('Forbidden', { status: 403 });

  } catch (error) {
    console.error('[WhatsApp Webhook] GET error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

function getPhoneVariants(rawPhone: string): string[] {
  if (!rawPhone) return [];
  const digits = rawPhone.replace(/\D/g, '');
  const variants = new Set<string>();
  if (digits) {
    variants.add(digits);
    variants.add('+' + digits);
    if (digits.length >= 10) {
      variants.add(digits.slice(-10));
    }
  }
  return Array.from(variants);
}

// POST — Meta sends incoming messages and status receipts here
export async function POST(request: Request) {
  try {
    const body = await request.text();
    console.log('[RAW WEBHOOK]', body);
    const signature = request.headers.get('x-hub-signature-256') || '';
    const contentType = request.headers.get('content-type') || 'application/json';

    const sharedServerIp = process.env.SHARED_SERVER_IP || '13.206.143.171';
    let port = 8090; // default fallback

    try {
      const payload = JSON.parse(body);

      // Log raw payload for debugging Meta status receipt webhooks
      console.log('[Meta Webhook Incoming POST Payload]:', JSON.stringify(payload));

      // 1. Extract phone_number_id to route webhook to correct client port
      const phoneNumberId = payload.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;

      let clientId = '';
      let whatsappToken = '';

      if (phoneNumberId) {
        const { data } = await supabaseAdmin
          .from('agent_clients')
          .select('id, whatsapp_webhook_port, whatsapp_access_token')
          .eq('whatsapp_phone_number_id', phoneNumberId)
          .single();

        if (data) {
          if (data.whatsapp_webhook_port) port = data.whatsapp_webhook_port;
          clientId = data.id;
          whatsappToken = data.whatsapp_access_token || '';
        }
      }

      // 2. Process status receipts (delivered, read, failed) and incoming message read events
      const entries = payload.entry || [];
      for (const entry of entries) {
        const changes = entry.changes || [];
        for (const change of changes) {
          const value = change.value;

          // Status updates from Meta (sent, delivered, read, failed)
          if (value && Array.isArray(value.statuses)) {
            const statusPromises = value.statuses.map(async (statusItem: any) => {
              const wamid = statusItem.id;
              const newStatus = (statusItem.status || '').toLowerCase(); // 'sent' | 'delivered' | 'read' | 'failed'
              const recipientPhone = statusItem.recipient_id ? String(statusItem.recipient_id).replace(/\D/g, '') : null;

              console.log(`[WhatsApp Webhook Status Event] wamid=${wamid}, status=${newStatus}, recipient_id=${recipientPhone}`);

              if (newStatus) {
                let updated = false;

                const STATUS_RANK: Record<string, number> = {
                  sent: 1,
                  delivered: 2,
                  read: 3,
                  failed: 0, // Handled separately
                };

                const newRank = STATUS_RANK[newStatus] ?? 0;

                // Helper to execute atomic monotonic status update
                const updateStatusMonotonic = async (queryField: 'message_id' | 'phone', queryVal: any) => {
                  // Fetch current status first to enforce monotonic progression
                  let q = supabaseAdmin
                    .from('broadcast_recipient_logs')
                    .select('id, status');

                  if (queryField === 'message_id') {
                    q = q.eq('message_id', queryVal);
                  } else {
                    q = q.in('phone', queryVal);
                  }

                  const { data: rows } = await q;
                  if (!rows || rows.length === 0) return 0;

                  const eligibleIds: string[] = [];
                  for (const r of rows) {
                    const curStatus = (r.status || 'sent').toLowerCase();
                    const curRank = STATUS_RANK[curStatus] ?? 1;

                    // Failed logic: if already read, do not overwrite to failed from late/duplicate webhook
                    if (newStatus === 'failed') {
                      if (curStatus !== 'read') {
                        eligibleIds.push(r.id);
                      }
                      continue;
                    }

                    // For non-failed statuses: update if incoming rank >= existing rank
                    if (newRank >= curRank) {
                      eligibleIds.push(r.id);
                    }
                  }

                  if (eligibleIds.length === 0) {
                    return rows.length; // Matched but ignored due to monotonic guard (valid idempotent outcome)
                  }

                  const { data: updatedRows } = await supabaseAdmin
                    .from('broadcast_recipient_logs')
                    .update({
                      status: newStatus,
                      updated_at: new Date().toISOString(),
                    })
                    .in('id', eligibleIds)
                    .select('id');

                  return updatedRows?.length || eligibleIds.length;
                };

                // 1. Primary correlation: Match by Meta Message ID (wamid)
                if (wamid) {
                  let count = await updateStatusMonotonic('message_id', wamid);
                  
                  // Race condition mitigation: If Meta webhook arrives before ssh.ts finishes DB insertion,
                  // we wait a few seconds and retry.
                  if (count === 0) {
                    await new Promise(r => setTimeout(r, 4000));
                    count = await updateStatusMonotonic('message_id', wamid);
                  }

                  if (count > 0) {
                    updated = true;
                    console.log(`[WhatsApp Webhook] Monotonic update for wamid ${wamid} to '${newStatus}' (matched rows: ${count})`);
                  }
                }

                // 2. Fallback correlation: Match by recipient phone variants
                if (!updated && recipientPhone) {
                  const phoneVariants = getPhoneVariants(recipientPhone);
                  const count = await updateStatusMonotonic('phone', phoneVariants);
                  if (count > 0) {
                    updated = true;
                    console.log(`[WhatsApp Webhook] Fallback monotonic update for phone variants ${phoneVariants.join(',')} to '${newStatus}' (matched rows: ${count})`);
                  }
                }

                if (newStatus === 'read' && recipientPhone) {
                  const phoneVariants = getPhoneVariants(recipientPhone);
                  await supabaseAdmin
                    .from('leads_cache')
                    .update({
                      last_read_at: new Date().toISOString(),
                      updated_at: new Date().toISOString()
                    })
                    .in('phone', phoneVariants);
                }

                if (!updated) {
                  console.warn(`[WhatsApp Webhook WARNING] Received status '${newStatus}' for wamid=${wamid}, phone=${recipientPhone}, but NO rows matched in broadcast_recipient_logs!`);
                }
              }
            });
            await Promise.all(statusPromises);
          }

          // Inbound customer message replies (implicitly marks previous broadcast sent to this phone as read)
          if (value && Array.isArray(value.messages)) {
            for (const msg of value.messages) {
              const fromPhone = msg.from ? String(msg.from).replace(/\D/g, '') : null;
              if (fromPhone) {
                const phoneVariants = getPhoneVariants(fromPhone);

                console.log(`[WhatsApp Webhook] Inbound reply received from ${fromPhone} — marking broadcast logs as 'read'`);
                await supabaseAdmin
                  .from('broadcast_recipient_logs')
                  .update({
                    status: 'read',
                    updated_at: new Date().toISOString()
                  })
                  .in('phone', phoneVariants)
                  .neq('status', 'read');

                await supabaseAdmin
                  .from('leads_cache')
                  .update({
                    last_read_at: new Date().toISOString(),
                    last_customer_message_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  })
                  .in('phone', phoneVariants);
              }

              // Phase 1: Intercept incoming audio messages
              if ((msg.type === 'audio' || msg.type === 'voice') && msg[msg.type]?.id && whatsappToken && clientId && fromPhone) {
                try {
                  const mediaId = msg[msg.type].id;
                  const mimeType = msg[msg.type].mime_type || 'audio/ogg';
                  const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('mpeg') ? 'mp3' : 'ogg';
                  
                  // 1. Get media URL
                  const metaRes = await fetch(`https://graph.facebook.com/v19.0/${mediaId}`, {
                    headers: { 'Authorization': `Bearer ${whatsappToken}` }
                  });
                  const metaJson = await metaRes.json();
                  
                  if (metaJson.url) {
                    // 2. Download media binary
                    const audioRes = await fetch(metaJson.url, {
                      headers: { 'Authorization': `Bearer ${whatsappToken}` }
                    });
                    const audioBuffer = await audioRes.arrayBuffer();
                    
                    // 3. Upload to Supabase Storage
                    const fileName = `${clientId}/${Date.now()}_${mediaId}.${ext}`;
                    const { data: uploadData, error: uploadErr } = await supabaseAdmin.storage
                      .from('chat-media')
                      .upload(fileName, audioBuffer, {
                        contentType: mimeType,
                        upsert: true
                      });
                      
                    if (!uploadErr && uploadData) {
                      const { data: publicUrlData } = supabaseAdmin.storage
                        .from('chat-media')
                        .getPublicUrl(uploadData.path);
                        
                      const publicUrl = publicUrlData.publicUrl;
                      
                      // 4. Insert a shadow message for the CRM to render the audio
                      await supabaseAdmin.from('messages').insert({
                        lead_id: fromPhone,
                        client_id: clientId,
                        role: 'user',
                        content: `[media:audio:${publicUrl}]`,
                        source: 'whatsapp'
                      });
                      console.log(`[WhatsApp Webhook] Intercepted audio and saved to DB: ${publicUrl}`);
                    } else {
                      console.error(`[WhatsApp Webhook] Failed to upload audio:`, uploadErr);
                    }
                  }
                } catch (audioErr: any) {
                  console.error(`[WhatsApp Webhook] Audio interception failed:`, audioErr.message);
                }
              }
            }
          }
        }
      }
    } catch (err: any) {
      console.error('[WhatsApp Webhook] Payload processing error:', err.message);
    }

    const hermesUrl = `http://${sharedServerIp}:${port}/whatsapp/webhook`;

    try {
      await fetch(hermesUrl, {
        method: 'POST',
        headers: {
          'Content-Type': contentType,
          'x-hub-signature-256': signature,
        },
        body,
        signal: AbortSignal.timeout(30000),
      });
    } catch (err) {
      console.error('[Webhook] Forward failed:', err);
    }

    // Always return 200 to Meta
    return new Response('OK', { status: 200 });

  } catch (error) {
    console.error('[Webhook] POST error:', error);
    return new Response('OK', { status: 200 });
  }
}
