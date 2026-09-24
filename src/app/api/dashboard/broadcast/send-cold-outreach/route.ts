import { NextResponse } from 'next/server';
import { getSessionClient } from '@/lib/auth';
import { sendColdOutreach, executeCommand, sendCloudApiBroadcast, normalizeAndValidatePhone, getClientServerIp } from '@/lib/ssh';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const client = await getSessionClient();
    if (!client) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      action,
      jobId,
      leads,
      templates,
      singleTemplate,
      isSingleTemplate,
      delaySeconds,
      timeWindow,
      dailyLimit,
      imageUrl,
      templateName,
      templateLanguage = 'en',
      templateComponents = null,
      templateVarMapping = null,
    } = await request.json();

    const serverIP = getClientServerIp(client);
    const { sshPrivateKey, serverUser } = client;
    if (!serverIP || !sshPrivateKey) {
      return NextResponse.json({ error: 'Server details missing' }, { status: 400 });
    }

    // Handle STOP campaign action
    if (action === 'stop') {
      console.log(`Stopping cold outreach campaign on server ${serverIP}`);
      // Touch abort file and kill tmux
      await executeCommand(
        serverIP,
        sshPrivateKey,
        'touch /home/ubuntu/cold_outreach_abort && tmux kill-session -t cold_outreach 2>/dev/null',
        serverUser || 'ubuntu'
      );

      // If jobId is provided, update Supabase directly
      if (jobId) {
        await supabaseAdmin
          .from('broadcast_jobs')
          .update({ status: 'stopped', completed_at: new Date().toISOString() })
          .eq('id', jobId);
      } else {
        // Fallback: update any running jobs for this client
        await supabaseAdmin
          .from('broadcast_jobs')
          .update({ status: 'stopped', completed_at: new Date().toISOString() })
          .eq('client_id', client.clientId)
          .eq('status', 'running');
      }

      return NextResponse.json({ success: true, message: 'Cold outreach campaign stopped successfully.' });
    }

    // Handle PAUSE campaign action
    if (action === 'pause') {
      console.log(`Pausing cold outreach campaign on server ${serverIP}`);
      await executeCommand(
        serverIP,
        sshPrivateKey,
        'touch /home/ubuntu/cold_outreach_pause',
        serverUser || 'ubuntu'
      );

      if (jobId) {
        await supabaseAdmin
          .from('broadcast_jobs')
          .update({ status: 'paused' })
          .eq('id', jobId);
      } else {
        await supabaseAdmin
          .from('broadcast_jobs')
          .update({ status: 'paused' })
          .eq('client_id', client.clientId)
          .eq('status', 'running');
      }

      return NextResponse.json({ success: true, message: 'Cold outreach campaign paused successfully.' });
    }

    // Handle RESUME campaign action
    if (action === 'resume') {
      console.log(`Resuming cold outreach campaign on server ${serverIP}`);
      // Clean pause flag
      await executeCommand(
        serverIP,
        sshPrivateKey,
        'rm -f /home/ubuntu/cold_outreach_pause',
        serverUser || 'ubuntu'
      );

      if (jobId) {
        await supabaseAdmin
          .from('broadcast_jobs')
          .update({ status: 'running' })
          .eq('id', jobId);
      } else {
        await supabaseAdmin
          .from('broadcast_jobs')
          .update({ status: 'running' })
          .eq('client_id', client.clientId)
          .eq('status', 'paused');
      }

      return NextResponse.json({ success: true, message: 'Cold outreach campaign resumed successfully.' });
    }

    // Validate request
    if (!Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json({ error: 'No leads selected for outreach' }, { status: 400 });
    }

    if (client.connectionType === 'cloud_api' && !templateName) {
      return NextResponse.json({
        error: 'A Meta-approved template name is required for cold outreach via Cloud API. Create templates at business.facebook.com/wa/manage/message-templates/',
      }, { status: 400 });
    }

    const cleanedLeads: any[] = [];
    for (const lead of leads) {
      if (!lead || !lead.phone) continue;
      const { cleaned } = normalizeAndValidatePhone(lead.phone);
      if (cleaned) {
        cleanedLeads.push({
          ...lead,
          phone: cleaned,
        });
      }
    }

    if (cleanedLeads.length === 0) {
      return NextResponse.json({ error: 'No valid phone numbers found after cleaning' }, { status: 400 });
    }

    const delay = parseInt(delaySeconds || (client.connectionType === 'cloud_api' ? '3' : '150'), 10);
    const minDelay = client.connectionType === 'cloud_api' ? 1 : 10;
    if (isNaN(delay) || delay < minDelay) {
      return NextResponse.json({ error: `Delay must be a valid number of seconds (minimum ${minDelay}s)` }, { status: 400 });
    }

    const limit = parseInt(dailyLimit || '15', 10);

    // 1. Fetch or Create the job in Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    let job: any = null;
    let initialSent = 0;
    let initialFailed = 0;

    if (jobId) {
      const { data: existingJob, error: fetchError } = await supabaseAdmin
        .from('broadcast_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (!fetchError && existingJob) {
        // Update status back to running
        const { data: updatedJob, error: updateError } = await supabaseAdmin
          .from('broadcast_jobs')
          .update({ status: 'running', completed_at: null })
          .eq('id', jobId)
          .select()
          .single();

        if (!updateError && updatedJob) {
          job = updatedJob;
          initialSent = existingJob.sent || 0;
          initialFailed = existingJob.failed || 0;
          console.log(`Resuming existing job ${jobId} with initialSent=${initialSent}, initialFailed=${initialFailed}`);
        }
      }
    }

    if (!job) {
      const { data: newJob, error: dbError } = await supabaseAdmin
        .from('broadcast_jobs')
        .insert({
          client_id: client.clientId,
          job_type: 'cold_outreach',
          total_leads: cleanedLeads.length,
          sent: 0,
          failed: 0,
          status: 'running',
        })
        .select()
        .single();

      if (dbError) {
        console.error('[Send Cold Outreach] Supabase insert error:', dbError.message);
        return NextResponse.json({
          error: 'Failed to create broadcast job in database. Please ensure the broadcast_jobs table has been created in your Supabase project.',
          details: dbError.message,
        }, { status: 500 });
      }
      job = newJob;
    }

    if (client.connectionType === 'cloud_api') {
      const phoneNumberId = client.whatsappPhoneNumberId;
      const accessToken = client.whatsappAccessToken;

      if (!phoneNumberId || !accessToken) {
        return NextResponse.json({
          error: 'Cloud API credentials not configured'
        }, { status: 400 });
      }

      const phoneList = cleanedLeads.map((lead: any) => lead.phone);

      // --- Template handling: re-fetch live structure, run guards ---
      let resolvedComponents = templateComponents;
      let resolvedLanguage = templateLanguage;

      if (templateName) {
        const wabaId = client.whatsappWabaId;
        if (wabaId && accessToken) {
          try {
            const tmplRes = await fetch(
              `https://graph.facebook.com/v20.0/${wabaId}/message_templates?name=${encodeURIComponent(templateName)}&fields=name,status,language,components`,
              { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' }
            );
            if (tmplRes.ok) {
              const tmplData = await tmplRes.json();
              const variants: any[] = tmplData.data || [];
              const requestedLang = templateLanguage || 'en';
              const live =
                variants.find(t => t.status === 'APPROVED' && t.language === requestedLang) ||
                variants.find(t => t.status === 'APPROVED') ||
                variants[0];
              if (live) {
                if (live.status !== 'APPROVED') {
                  return NextResponse.json({
                    error: `Template "${templateName}" is not APPROVED (current status: ${live.status}). Campaign blocked.`
                  }, { status: 400 });
                }
                resolvedComponents = live.components || resolvedComponents;
                resolvedLanguage   = live.language   || resolvedLanguage;
              }
            }
          } catch (err: any) {
            console.warn('[Cold Outreach] Live template re-fetch failed, using client snapshot:', err.message);
          }
        }

        // B. Guard: IMAGE header template requires a campaign media URL
        const hasHeaderImage = resolvedComponents?.some(
          (c: any) => c.type === 'HEADER' && c.format === 'IMAGE'
        );
        if (hasHeaderImage && !imageUrl) {
          return NextResponse.json({
            error: 'This template requires a header image — attach campaign media before sending.'
          }, { status: 400 });
        }

        // C. Guard: dynamic-URL buttons are not yet supported
        const hasDynamicUrlButton = resolvedComponents?.some(
          (c: any) =>
            c.type === 'BUTTONS' &&
            c.buttons?.some((b: any) => b.type === 'URL' && b.url?.includes('{{'))
        );
        if (hasDynamicUrlButton) {
          return NextResponse.json({
            error: 'This template uses a dynamic URL button, which is not yet supported. Use a template without dynamic button parameters.'
          }, { status: 400 });
        }
      }

      // D. Build dual-source recipient name map (contacts → leads_cache priority)
      let recipientNameMap: Record<string, string> = {};
      if (templateName && templateVarMapping) {
        try {
          const [leadsResult, contactsResult] = await Promise.all([
            supabaseAdmin
              .from('leads_cache')
              .select('phone, name')
              .eq('client_id', client.clientId)
              .in('phone', phoneList),
            supabaseAdmin
              .from('contacts')
              .select('phone, name')
              .eq('client_id', client.clientId)
              .in('phone', phoneList),
          ]);
          for (const row of (contactsResult.data || [])) {
            if (row.phone && row.name) {
              const normalized = normalizeAndValidatePhone(row.phone).cleaned || row.phone;
              recipientNameMap[normalized] = row.name;
            }
          }
          for (const row of (leadsResult.data || [])) {
            if (row.phone && row.name) {
              const normalized = normalizeAndValidatePhone(row.phone).cleaned || row.phone;
              recipientNameMap[normalized] = row.name;
            }
          }
        } catch (err: any) {
          console.warn('[Cold Outreach] Recipient name map build failed:', err.message);
        }
      }

      // Pre-calculate fallback personalized messages
      const personalizedMessages: Record<string, string> = {};
      cleanedLeads.forEach((lead: any) => {
        const phone = lead.phone;
        
        let templateText = '';
        if (isSingleTemplate) {
          templateText = singleTemplate || '';
        } else {
          const catGroup = lead.category_group || 'Other';
          templateText = (templates as Record<string, any>)?.[catGroup] || '';
          if (!templateText && templates) {
            templateText = (Object.values(templates as Record<string, any>)[0] as string) || 'Hello {business_name}';
          }
        }

        let msg = templateText;
        msg = msg.replace(/{business_name}/gi, lead.business_name || 'there');
        msg = msg.replace(/{city}/gi, lead.city || '');
        msg = msg.replace(/{rating}/gi, lead.rating || '');
        msg = msg.replace(/{reviews_count}/gi, lead.reviews_count || '');
        msg = msg.replace(/{category}/gi, lead.category || '');

        personalizedMessages[phone] = msg;
      });

      // Launch sequential Cloud API outreach
      sendCloudApiBroadcast(
        phoneList,
        '',
        phoneNumberId,
        accessToken,
        delay,
        templateName || undefined,
        resolvedLanguage || 'en',
        imageUrl || undefined,
        personalizedMessages,
        job.id,
        supabaseUrl,
        supabaseServiceKey,
        'broadcast_jobs',
        initialSent,
        initialFailed,
        client.clientId,
        client.metaThroughputLimit || 80,
        resolvedComponents || undefined,
        recipientNameMap,
        templateVarMapping || undefined,
        serverIP,
        sshPrivateKey,
        serverUser || 'ubuntu',
        client.hermesProfile || '',
      ).then(async () => {
        await supabaseAdmin
          .from('broadcast_jobs')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('id', job.id);
      }).catch(err => {
        console.error('[CloudBroadcast Outreach] Error:', err);
      });

      return NextResponse.json({
        success: true,
        message: `Successfully launched cold outreach to ${cleanedLeads.length} leads.`,
        jobId: job.id,
        totalLeads: cleanedLeads.length,
      });
    } else {
      // 2. Launch campaign via SSH tmux helper
      await sendColdOutreach(
        serverIP,
        sshPrivateKey,
        cleanedLeads,
        templates || {},
        singleTemplate || '',
        !!isSingleTemplate,
        delay,
        !!timeWindow,
        job.id,
        supabaseUrl,
        supabaseServiceKey,
        limit,
        imageUrl || '',
        serverUser || 'ubuntu',
        client.timezone || 'UTC',
        initialSent,
        initialFailed
      );

      return NextResponse.json({
        success: true,
        message: `Successfully launched cold outreach to ${cleanedLeads.length} leads.`,
        jobId: job.id,
        totalLeads: cleanedLeads.length,
      });
    }
  } catch (error: any) {
    console.error('Send Cold Outreach API Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
