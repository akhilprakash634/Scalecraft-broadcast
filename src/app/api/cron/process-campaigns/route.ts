import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendCloudApiBroadcast } from '@/lib/ssh'; // or we can implement inline

// This route acts as a background processor for campaigns
export async function POST(request: Request) {
  try {
    const { campaign_id, template_components, template_var_mapping, image_url } = await request.json();
    if (!campaign_id) {
      return NextResponse.json({ error: 'Missing campaign_id' }, { status: 400 });
    }

    // 1. Fetch Campaign
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from('whatsapp_campaigns')
      .select('*')
      .eq('id', campaign_id)
      .single();
      
    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // If campaign is stopped, don't process
    if (campaign.status === 'stopped' || campaign.status === 'completed') {
      return NextResponse.json({ success: true, message: 'Campaign is not in a runnable state' });
    }

    // 2. Fetch pending recipients
    const { data: pendingRecipients, error: recError } = await supabaseAdmin
      .from('whatsapp_campaign_recipients')
      .select('*, whatsapp_contacts(phone)')
      .eq('campaign_id', campaign_id)
      .in('status', ['pending', 'failed_retryable'])
      .limit(100); // Batch process

    if (recError) {
      return NextResponse.json({ error: 'Failed to fetch recipients' }, { status: 500 });
    }

    if (!pendingRecipients || pendingRecipients.length === 0) {
      // Mark campaign completed if all done
      await supabaseAdmin
        .from('whatsapp_campaigns')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', campaign_id);
      
      return NextResponse.json({ success: true, message: 'Campaign completed' });
    }

    // 3. Fetch Client credentials
    const { data: client, error: clientError } = await supabaseAdmin
      .from('agent_clients')
      .select('whatsapp_phone_number_id, whatsapp_access_token')
      .eq('id', campaign.business_id)
      .single();

    if (clientError || !client || !client.whatsapp_phone_number_id || !client.whatsapp_access_token) {
      return NextResponse.json({ error: 'Client credentials missing' }, { status: 400 });
    }

    // 4. Send messages
    const phoneNumberId = client.whatsapp_phone_number_id;
    const accessToken = client.whatsapp_access_token;
    const templateName = campaign.template_name;
    const templateLanguage = campaign.template_language || 'en';

    let successCount = 0;
    
    // In a real robust system, we would enqueue to pgmq. For now, simple loop in API.
    for (const rec of pendingRecipients) {
      // Check if paused or stopped mid-loop
      const { data: checkCamp } = await supabaseAdmin
        .from('whatsapp_campaigns')
        .select('status')
        .eq('id', campaign_id)
        .single();
        
      if (checkCamp && (checkCamp.status === 'paused' || checkCamp.status === 'stopped')) {
        break; // stop processing
      }

      try {
        const contact: any = Array.isArray(rec.whatsapp_contacts) ? rec.whatsapp_contacts[0] : rec.whatsapp_contacts;
        const phone = contact?.phone;
        const name = contact?.name || phone;
        
        if (!phone) {
          throw new Error('Contact phone missing');
        }

        const resolveVariable = (varIndex: number, scope: 'body' | 'header'): string => {
          const key = scope === 'header' ? `header_${varIndex}` : String(varIndex);
          const mapping = template_var_mapping?.[key];
          if (!mapping)                      return name;
          if (mapping === 'name')            return name;
          if (mapping === 'phone')           return phone;
          if (mapping.startsWith('custom:')) return mapping.slice(7) || phone;
          return name;
        };

        const metaComponents: any[] = [];
        if (template_components) {
          for (const comp of template_components) {
            if (comp.type === 'HEADER' && comp.format === 'IMAGE' && image_url) {
              metaComponents.push({ type: 'header', parameters: [{ type: 'image', image: { link: image_url } }] });
            }
            if (comp.type === 'HEADER' && comp.format === 'TEXT' && comp.text) {
              const varMatches: string[] = comp.text.match(/\{\{\d+\}\}/g) || [];
              if (varMatches.length > 0) {
                const indices = varMatches.map((m: string) => parseInt(m.replace(/\D/g, ''), 10));
                metaComponents.push({
                  type: 'header',
                  parameters: indices.map((n: number) => ({ type: 'text', text: resolveVariable(n, 'header') }))
                });
              }
            }
            if (comp.type === 'BODY' && comp.text) {
              const varMatches: string[] = comp.text.match(/\{\{\d+\}\}/g) || [];
              if (varMatches.length > 0) {
                const indices = varMatches.map((m: string) => parseInt(m.replace(/\D/g, ''), 10));
                metaComponents.push({
                  type: 'body',
                  parameters: indices.map((n: number) => ({ type: 'text', text: resolveVariable(n, 'body') }))
                });
              }
            }
          }
        }

        const payload: any = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: phone,
        };

        if (templateName) {
          payload.type = 'template';
          payload.template = {
            name: templateName,
            language: { code: templateLanguage }
          };
          if (metaComponents.length > 0) {
            payload.template.components = metaComponents;
          }
        } else {
          payload.type = 'text';
          payload.text = { body: campaign.name }; // Custom message fallback
        }

        const res = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });

        const result = await res.json();
        
        if (res.ok) {
          let loggedMessageContent = campaign.name;
          const bodyComp = template_components?.find((c: any) => c.type === 'BODY');
          if (bodyComp && bodyComp.text) {
            loggedMessageContent = bodyComp.text.replace(/\{\{(\d+)\}\}/g, (_: string, n: string) => {
              return resolveVariable(parseInt(n, 10), 'body');
            });
          }

          // 1. Ensure conversation exists
          let { data: conversation } = await supabaseAdmin
            .from('whatsapp_conversations')
            .select('id')
            .eq('business_id', campaign.business_id)
            .eq('contact_id', rec.contact_id)
            .maybeSingle();

          if (!conversation) {
            const { data: newConv } = await supabaseAdmin
              .from('whatsapp_conversations')
              .insert({
                business_id: campaign.business_id,
                contact_id: rec.contact_id,
                unread_count: 0
              }).select('id').single();
            conversation = newConv;
          }

          // 2. Insert Message
          const { data: newMessage } = await supabaseAdmin
            .from('whatsapp_messages')
            .insert({
              business_id: campaign.business_id,
              conversation_id: conversation!.id,
              contact_id: rec.contact_id,
              direction: 'outgoing',
              message_type: 'template',
              content: loggedMessageContent,
              whatsapp_message_id: result.messages?.[0]?.id,
              status: 'sent',
              campaign_id: campaign.id
            }).select('id').single();
          
          if (newMessage) {
            await supabaseAdmin.from('whatsapp_conversations').update({
              last_message_id: newMessage.id,
              last_message_at: new Date().toISOString()
            }).eq('id', conversation!.id);
          }

          // Update recipient
          const { error: updateError } = await supabaseAdmin
            .from('whatsapp_campaign_recipients')
            .update({ 
              status: 'sent',
              sent_at: new Date().toISOString(),
              error_message: null,
              message_id: newMessage?.id || null
            })
            .eq('id', rec.id);
            
          if (updateError) console.error('Failed to update recipient to sent:', updateError);
          successCount++;
        } else {
          // Update failed
          const { error: failError } = await supabaseAdmin
            .from('whatsapp_campaign_recipients')
            .update({ 
              status: 'failed', 
              error_message: result.error?.message || 'Unknown error',
              failed_at: new Date().toISOString()
            })
            .eq('id', rec.id);
            
          if (failError) console.error('Failed to update recipient to failed:', failError);
        }

        // Delay to respect rate limits (basic)
        await new Promise(resolve => setTimeout(resolve, 50));
        
      } catch (err: any) {
        await supabaseAdmin
          .from('whatsapp_campaign_recipients')
          .update({ 
            status: 'failed', 
            error_message: err.message
          })
          .eq('id', rec.id);
      }
    }

    // Trigger next batch if there's more to do
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin') || 'http://localhost:3000';
    if (successCount > 0) {
      fetch(`${baseUrl}/api/cron/process-campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          campaign_id, 
          template_components,
          template_var_mapping,
          image_url
        })
      }).catch(err => console.error('Failed to trigger next batch:', err.message));
    }

    return NextResponse.json({ success: true, processed: pendingRecipients.length });
  } catch (error: any) {
    console.error('Campaign Process API Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
