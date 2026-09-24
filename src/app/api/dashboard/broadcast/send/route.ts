import { NextResponse } from 'next/server';
import { getSessionClient } from '@/lib/auth';
import { getLeads, sendBroadcast, executeCommand, validatePhoneNumber, sendCloudApiBroadcast, normalizeAndValidatePhone, getClientServerIp } from '@/lib/ssh';
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
      message, 
      targetAudience, 
      groupTag: rawGroupTag,
      group_tag: rawGroupTag2,
      customPhones, 
      delaySeconds, 
      imageUrl, 
      useAi, 
      aiPrompt, 
      personalizedMessages, 
      timeWindow,
      templateName,
      templateLanguage: rawTemplateLanguage,
      templateComponents: rawTemplateComponents,
      templateVarMapping,
      batchSize,
    } = await request.json();

    // Mutable so live re-fetch can update them
    let templateLanguage: string = rawTemplateLanguage || 'en';
    let templateComponents: any[] | null = rawTemplateComponents || null;

    const serverIP = getClientServerIp(client);
    const { sshPrivateKey, serverUser } = client;
    if (!serverIP || !sshPrivateKey) {
      return NextResponse.json({ error: 'Server details missing' }, { status: 400 });
    }

    // Handle STOP campaign action
    if (action === 'stop') {
      console.log(`Stopping broadcast campaign on server ${serverIP}`);
      await executeCommand(
        serverIP,
        sshPrivateKey,
        'touch /home/ubuntu/broadcast_abort && tmux kill-session -t broadcast_campaign 2>/dev/null',
        serverUser || 'ubuntu'
      );

      const currentLog = await executeCommand(
        serverIP,
        sshPrivateKey,
        'cat /home/ubuntu/broadcast_log.txt 2>/dev/null || echo ""',
        serverUser || 'ubuntu'
      );
      
      let parsedLog = { sent: 0, failed: 0, total: 0, running: false };
      try {
        if (currentLog.stdout.trim()) {
          parsedLog = JSON.parse(currentLog.stdout.trim());
        }
      } catch {}
      parsedLog.running = false;
      
      await executeCommand(
        serverIP,
        sshPrivateKey,
        `echo '${JSON.stringify(parsedLog)}' > /home/ubuntu/broadcast_log.txt`,
        serverUser || 'ubuntu'
      );

      try {
        const query = supabaseAdmin
          .from('broadcast_audit')
          .update({ status: 'stopped', completed_at: new Date().toISOString() })
          .eq('client_id', client.clientId);

        if (jobId) {
          await query.eq('id', jobId);
        } else {
          await query.or('status.eq.running,status.eq.paused');
        }
      } catch (err: any) {
        console.error('Failed to update broadcast audit on stop:', err.message);
      }

      return NextResponse.json({ success: true, message: 'Broadcast campaign stopped successfully.' });
    }

    // Handle PAUSE campaign action
    if (action === 'pause') {
      console.log(`Pausing broadcast campaign on server ${serverIP}`);
      await executeCommand(
        serverIP,
        sshPrivateKey,
        'touch /home/ubuntu/broadcast_pause',
        serverUser || 'ubuntu'
      );

      try {
        const query = supabaseAdmin
          .from('broadcast_audit')
          .update({ status: 'paused' })
          .eq('client_id', client.clientId);

        if (jobId) {
          await query.eq('id', jobId);
        } else {
          await query.eq('status', 'running');
        }
      } catch (err: any) {
        console.error('Failed to update broadcast audit on pause:', err.message);
      }

      return NextResponse.json({ success: true, message: 'Broadcast campaign paused successfully.' });
    }

    // Handle RESUME campaign action
    if (action === 'resume') {
      console.log(`Resuming broadcast campaign on server ${serverIP}`);
      await executeCommand(
        serverIP,
        sshPrivateKey,
        'rm -f /home/ubuntu/broadcast_pause',
        serverUser || 'ubuntu'
      );

      try {
        const query = supabaseAdmin
          .from('broadcast_audit')
          .update({ status: 'running' })
          .eq('client_id', client.clientId);

        if (jobId) {
          await query.eq('id', jobId);
        } else {
          await query.eq('status', 'paused');
        }
      } catch (err: any) {
        console.error('Failed to update broadcast audit on resume:', err.message);
      }

      return NextResponse.json({ success: true, message: 'Broadcast campaign resumed successfully.' });
    }

    // Time window check: 9AM - 9PM local time
    const shouldCheckTimeWindow = timeWindow !== false;
    if (shouldCheckTimeWindow) {
      const now = new Date();
      const timezone = client.timezone || 'UTC';
      let currentHour = now.getHours();
      try {
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: timezone,
          hour: 'numeric',
          hour12: false,
        });
        currentHour = parseInt(formatter.format(now), 10);
      } catch (err: any) {
        console.warn(`[Broadcast] Timezone format failed for ${timezone}:`, err.message);
      }

      if (currentHour < 9 || currentHour >= 21) {
        return NextResponse.json({ error: `Campaigns can only be launched between 9 AM and 9 PM ${timezone} time.` }, { status: 400 });
      }
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    let metaLimit = 250;
    let metaTierName = 'TIER_250';

    // 1. Connection-specific daily campaign validation split
    if (client.connectionType === 'baileys') {
      const { count: todayCampaigns, error: countError } = await supabaseAdmin
        .from('broadcast_audit')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', client.clientId)
        .gte('started_at', startOfDay.toISOString());

      if (countError) {
        console.error('[Broadcast] DB count error:', countError.message);
      } else if (todayCampaigns && todayCampaigns >= 3) {
        return NextResponse.json({ error: 'Daily limit of 3 campaigns reached for Baileys connection.' }, { status: 429 });
      }
    } else {
      // It's Cloud API: Check Meta limit tier and quality rating
      let metaLimitTier = client.metaLimitTier;
      let metaQualityRating = client.metaQualityRating;
      let metaLimitExpiresAt = client.metaLimitExpiresAt;
      let tierFetchFailed = false;

      if (client.whatsappPhoneNumberId && client.whatsappAccessToken) {
        const now = new Date();
        if (!metaLimitExpiresAt || new Date(metaLimitExpiresAt) <= now || !metaLimitTier || !metaQualityRating) {
          try {
            const res = await fetch(`https://graph.facebook.com/v20.0/${client.whatsappPhoneNumberId}?fields=messaging_limit_tier,quality_rating`, {
              headers: {
                'Authorization': `Bearer ${client.whatsappAccessToken}`
              },
              cache: 'no-store'
            });
            if (res.ok) {
              const data = await res.json();
              metaLimitTier = data.messaging_limit_tier || metaLimitTier;
              metaQualityRating = data.quality_rating || metaQualityRating;
              metaLimitExpiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
              
              await supabaseAdmin
                .from('agent_clients')
                .update({
                  meta_limit_tier: metaLimitTier,
                  meta_quality_rating: metaQualityRating,
                  meta_limit_expires_at: metaLimitExpiresAt
                })
                .eq('id', client.clientId);
            } else {
              tierFetchFailed = true;
              console.error('[Broadcast Send] Meta Graph API returned non-OK status:', res.status);
            }
          } catch (err: any) {
            tierFetchFailed = true;
            console.error('[Broadcast Send] Failed to reach Meta Graph API:', err.message);
          }

          // Fail-closed: if the live fetch failed and we have NO cached tier at all, block the send.
          // This prevents silently oversending during a token-expiry or Meta outage window.
          if (tierFetchFailed && (!metaLimitTier || !metaQualityRating)) {
            return NextResponse.json({
              error: 'Unable to verify your Meta messaging limits (Graph API unavailable). Campaign blocked to protect your account. Please try again shortly or check your Access Token.'
            }, { status: 503 });
          }

          // If the fetch failed but we have stale cached data, proceed with it and warn in logs.
          if (tierFetchFailed) {
            console.warn(`[Broadcast Send] Proceeding with stale cached Meta tier (${metaLimitTier}) for client ${client.clientId} — live refresh failed.`);
          }
        }
      }

      metaTierName = metaLimitTier || 'TIER_250';
      const isQualityRed = (metaQualityRating || '').toUpperCase() === 'RED';

      if (isQualityRed) {
        return NextResponse.json({
          error: 'Campaign blocked: Your WhatsApp Business Phone Number quality rating is RED. Broadcast sending is paused to protect your number.'
        }, { status: 400 });
      }

      const tierMap: Record<string, number> = {
        TIER_250: 250,
        TIER_1K: 1000,
        TIER_10K: 10000,
        TIER_100K: 100000,
        TIER_UNLIMITED: 100000000
      };
      metaLimit = tierMap[metaTierName] || 250;
    }

    // Validate normal campaign send fields
    if (!useAi && (!message || message.length > 500)) {
      return NextResponse.json({ error: 'Message is required and must be under 500 characters' }, { status: 400 });
    }
    if (useAi && (!aiPrompt || aiPrompt.length > 1000)) {
      return NextResponse.json({ error: 'AI Instructions/Goal is required and must be under 1000 characters' }, { status: 400 });
    }

    const delay = parseInt(delaySeconds || (client.connectionType === 'cloud_api' ? '3' : '90'), 10);
    const minDelay = client.connectionType === 'cloud_api' ? 1 : 10;
    if (isNaN(delay) || delay < minDelay) {
      return NextResponse.json({ error: `Delay must be a valid number of seconds (minimum ${minDelay}s)` }, { status: 400 });
    }

    // Get recipient phone list
    const batchSizeNum = parseInt(batchSize, 10) || 1000;
    let phoneList: string[] = [];
    const skippedLogs: string[] = [];

    if (targetAudience === 'custom') {
      if (!Array.isArray(customPhones) || customPhones.length === 0) {
        return NextResponse.json({ error: 'Custom numbers list is empty' }, { status: 400 });
      }
      const invalidCustom: string[] = [];
      for (const p of customPhones) {
        const { cleaned, error } = normalizeAndValidatePhone(p);
        if (cleaned) {
          phoneList.push(cleaned);
        } else {
          invalidCustom.push(`"${p}" (reason: ${error})`);
        }
      }
      if (invalidCustom.length > 0) {
        return NextResponse.json({
          error: `Plausibility check failed for custom numbers:\n${invalidCustom.join('\n')}`
        }, { status: 400 });
      }
    } else {
      // For all other types (contact_group, all, followup), we need to fetch eligible contacts
      // AND we must apply the smart rotation logic.

      // 1. Fetch current rotation cycle start time
      let rotationCycleStart = '1970-01-01T00:00:00.000Z';
      let typeSpecificData: any = {};
      if (client.typeSpecificData) {
        try {
          typeSpecificData = JSON.parse(client.typeSpecificData);
          if (typeSpecificData.currentRotationCycleStart) {
             rotationCycleStart = typeSpecificData.currentRotationCycleStart;
          }
        } catch {}
      }

      // 2. Find all contacts that have already been contacted in THIS cycle
      const { data: contactedLogs } = await supabaseAdmin
        .from('broadcast_recipient_logs')
        .select('phone')
        .eq('client_id', client.clientId)
        .gte('sent_at', rotationCycleStart);
      
      const contactedPhonesSet = new Set((contactedLogs || []).map((x: any) => String(x.phone || '').replace(/\D/g, '')));

      // 3. Fetch all potential contacts
      const [contactsResult, leadsResult] = await Promise.all([
        supabaseAdmin.from('contacts').select('phone, group_tags').eq('client_id', client.clientId).eq('is_dnd', false),
        supabaseAdmin.from('leads_cache').select('phone').eq('client_id', client.clientId).eq('is_dnd', false).eq('is_converted', false)
      ]);

      const allRawPhones: string[] = [];

      if (targetAudience === 'contact_group') {
        const activeGroupTag = rawGroupTag || rawGroupTag2 || '';
        if (!activeGroupTag) {
          return NextResponse.json({ error: 'Group tag is required for Contact Group targeting' }, { status: 400 });
        }
        const cleanTag = activeGroupTag.trim().toLowerCase();
        const matched = (contactsResult.data || []).filter(c => Array.isArray(c.group_tags) && c.group_tags.some(t => String(t).trim().toLowerCase() === cleanTag));
        allRawPhones.push(...matched.map(c => c.phone));
      } else {
        // 'all' or 'followup' (simplifying for broadcast platform)
        allRawPhones.push(...(contactsResult.data || []).map(c => c.phone));
        allRawPhones.push(...(leadsResult.data || []).map(l => l.phone));
      }

      // Deduplicate all raw phones and filter valid ones
      const validUniquePhones = new Map<string, string>();
      for (const p of allRawPhones) {
        if (!p) continue;
        const { cleaned, error } = normalizeAndValidatePhone(p);
        if (cleaned) {
          validUniquePhones.set(cleaned, p); // Map cleaned -> original to deduplicate
        } else {
          skippedLogs.push(`[Skipped] ${p} - Malformed phone number: ${error}`);
        }
      }

      let eligiblePhones = Array.from(validUniquePhones.keys()).filter(p => !contactedPhonesSet.has(p));

      // 4. If no eligible phones remain, the cycle is complete. Start a new cycle!
      if (eligiblePhones.length === 0 && validUniquePhones.size > 0) {
        console.log(`[Rotation] Cycle complete for ${client.clientId}. Starting new cycle.`);
        rotationCycleStart = new Date().toISOString();
        typeSpecificData.currentRotationCycleStart = rotationCycleStart;
        
        await supabaseAdmin.from('agent_clients').update({
          type_specific_data: JSON.stringify(typeSpecificData)
        }).eq('id', client.clientId);

        // In the new cycle, ALL contacts are eligible again
        eligiblePhones = Array.from(validUniquePhones.keys());
      }

      // 5. Apply batch size
      phoneList = eligiblePhones.slice(0, batchSizeNum);
    }

    if (phoneList.length === 0) {
      return NextResponse.json({ error: 'No recipients found with valid phone formats' }, { status: 400 });
    }

    // --- Template handling: re-fetch live structure, run guards ---
    if (templateName && client.connectionType === 'cloud_api') {
      // A. Live re-fetch using correct ?name= filter (not Marketing API filtering=[] syntax)
      const wabaId = client.whatsappWabaId;
      const accessToken = client.whatsappAccessToken;
      if (wabaId && accessToken) {
        try {
          const tmplRes = await fetch(
            `https://graph.facebook.com/v20.0/${wabaId}/message_templates?name=${encodeURIComponent(templateName)}&fields=name,status,language,components`,
            { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' }
          );
          if (tmplRes.ok) {
            const tmplData = await tmplRes.json();
            const variants: any[] = tmplData.data || [];
            // Prefer the APPROVED variant that matches requested language; fall back to any APPROVED
            const requestedLang = rawTemplateLanguage || 'en';
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
              templateComponents = live.components || templateComponents;
              templateLanguage   = live.language   || templateLanguage;
            }
          }
        } catch (err: any) {
          console.warn('[Broadcast] Live template re-fetch failed, using client snapshot:', err.message);
        }
      }

      // B. Guard: IMAGE header template requires a campaign media URL
      const hasHeaderImage = templateComponents?.some(
        (c: any) => c.type === 'HEADER' && c.format === 'IMAGE'
      );
      if (hasHeaderImage && !imageUrl) {
        return NextResponse.json({
          error: 'This template requires a header image — attach campaign media before sending.'
        }, { status: 400 });
      }

      // C. Guard: dynamic-URL buttons are not yet supported
      const hasDynamicUrlButton = templateComponents?.some(
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
    if (templateName && client.connectionType === 'cloud_api' && templateVarMapping) {
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
        // contacts set first (lower priority), leads_cache overwrites (higher quality)
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
        // Phones not in either table fall back to the phone itself — never blank
      } catch (err: any) {
        console.warn('[Broadcast] Recipient name map build failed:', err.message);
      }
    }

    // 2. Connection-specific recipient limits check
    if (client.connectionType === 'baileys') {
      if (phoneList.length > 1000) {
        return NextResponse.json({ error: 'Max recipients per campaign is 1000' }, { status: 400 });
      }
    } else {
      // Cloud API: Count ALL unique phones sent to today (regardless of session state) —
      // Meta's daily unique recipient limit applies to every send, not just out-of-session ones.
      const { data: sentLogs, error: logsError } = await supabaseAdmin
        .from('broadcast_recipient_logs')
        .select('phone')
        .eq('client_id', client.clientId)
        .gte('sent_at', startOfDay.toISOString());

      if (logsError) {
        console.error('[Broadcast] DB logs query error:', logsError.message);
      }

      const sentTodaySet = new Set((sentLogs || []).map((x) => x.phone));

      // Count how many phones in this campaign haven't already been messaged today
      let newRecipientsCount = 0;
      for (const phone of phoneList) {
        if (!sentTodaySet.has(phone)) {
          newRecipientsCount++;
        }
      }

      const totalSentToday = sentTodaySet.size;
      const effectiveLimit = client.dailyBroadcastLimit != null
        ? Math.min(client.dailyBroadcastLimit, metaLimit)
        : metaLimit;
      const limitExceeded = totalSentToday + newRecipientsCount > effectiveLimit;

      if (limitExceeded) {
        return NextResponse.json({
          error: `Daily broadcast limit reached. You've sent to ${totalSentToday} of ${effectiveLimit} unique recipients allowed today. This campaign would add ${newRecipientsCount} more.`
        }, { status: 400 });
      }
    }

    // Log the broadcast starting
    let auditId = '';
    try {
      const { data: auditRecord, error: insertError } = await supabaseAdmin
        .from('broadcast_audit')
        .insert({
          client_id: client.clientId,
          campaign_type: targetAudience,
          recipient_count: phoneList.length,
          status: 'running',
          started_at: new Date().toISOString(),
          logs: skippedLogs,
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('[Broadcast] DB insert error:', insertError.message);
      } else if (auditRecord) {
        auditId = auditRecord.id;
      }
    } catch (err: any) {
      console.error('[Broadcast] Failed to log to audit table:', err.message);
    }

    if (client.connectionType === 'cloud_api') {
      const phoneNumberId = client.whatsappPhoneNumberId;
      const accessToken = client.whatsappAccessToken;

      if (!phoneNumberId || !accessToken) {
        return NextResponse.json({
          error: 'Cloud API credentials not configured'
        }, { status: 400 });
      }

      // Run Cloud API broadcast asynchronously
      sendCloudApiBroadcast(
        phoneList,
        message || '',
        phoneNumberId,
        accessToken,
        delay,
        templateName || undefined,
        templateLanguage || 'en',
        imageUrl || undefined,
        personalizedMessages || undefined,
        auditId || undefined,
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_ROLE_KEY || '',
        'broadcast_audit',
        0,
        0,
        client.clientId,
        client.metaThroughputLimit || 80,
        templateComponents || undefined,
        recipientNameMap,
        templateVarMapping || undefined,
        serverIP,
        sshPrivateKey,
        serverUser || 'ubuntu',
        client.hermesProfile || '',
      ).then(async () => {
        if (auditId) {
          await supabaseAdmin
            .from('broadcast_audit')
            .update({ status: 'completed', completed_at: new Date().toISOString() })
            .eq('id', auditId);
        }
      }).catch((err) => console.error('[CloudBroadcast] Error:', err));

      return NextResponse.json({
        success: true,
        message: 'Cloud API broadcast started',
        auditId,
        totalLeads: phoneList.length,
      });
    } else {
      // Launch Baileys campaign via SSH tmux helper
      const sessionName = await sendBroadcast(
        serverIP,
        sshPrivateKey,
        message || '',
        phoneList,
        delay,
        imageUrl,
        serverUser || 'ubuntu',
        !!useAi,
        aiPrompt || '',
        personalizedMessages,
        auditId || undefined,
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_ROLE_KEY || ''
      );

      return NextResponse.json({
        success: true,
        message: `Successfully launched broadcast campaign to ${phoneList.length} leads.`,
        sessionName,
        totalLeads: phoneList.length,
      });
    }
  } catch (error: any) {
    console.error('Broadcast Send API Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
