import { NextResponse } from 'next/server';
import { getSessionClient } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { normalizeAndValidatePhone } from '@/lib/ssh'; // still need this utility

export async function POST(request: Request) {
  try {
    const client = await getSessionClient();
    if (!client) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clientId = client.clientId || client.id || client._id;

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
      templateLanguage,
      templateComponents,
      templateVarMapping,
      batchSize,
    } = await request.json();

    // Handle STOP/PAUSE/RESUME
    if (action === 'stop' || action === 'pause' || action === 'resume') {
      const statusMap: Record<string, string> = {
        stop: 'stopped',
        pause: 'paused',
        resume: 'processing'
      };
      
      const targetStatus = statusMap[action];

      let updateData: any = { status: targetStatus };
      if (action === 'stop') {
        updateData.completed_at = new Date().toISOString();
      }
      
      let query = supabaseAdmin.from('whatsapp_campaigns').update(updateData);
      
      if (jobId) {
        query = query.eq('id', jobId);
      } else {
        if (action === 'stop' || action === 'pause') {
          query = query.in('status', ['processing', 'scheduled']);
        } else {
          query = query.eq('status', 'paused');
        }
      }

      await query.eq('business_id', clientId);
      return NextResponse.json({ success: true, message: `Campaign ${action}d successfully.` });
    }

    // New Campaign Send
    
    // Time window check: 9AM - 9PM local time
    if (timeWindow !== false) {
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
      } catch (err) {}

      if (currentHour < 9 || currentHour >= 21) {
        return NextResponse.json({ error: `Campaigns can only be launched between 9 AM and 9 PM ${timezone} time.` }, { status: 400 });
      }
    }

    // Cloud API Only Check
    if (client.connectionType !== 'cloud_api') {
      return NextResponse.json({ error: 'This feature is only available for WhatsApp Cloud API connections.' }, { status: 400 });
    }

    if (!templateName && !message) {
      return NextResponse.json({ error: 'Message or Template Name is required' }, { status: 400 });
    }

    let phoneList: string[] = [];
    
    if (targetAudience === 'custom') {
      if (!Array.isArray(customPhones) || customPhones.length === 0) {
        return NextResponse.json({ error: 'Custom numbers list is empty' }, { status: 400 });
      }
      const invalidCustom: string[] = [];
      for (const p of customPhones) {
        const cleaned = p.replace(/\D/g, ''); // Simple fallback if normalize fails
        if (cleaned.length >= 10) {
          phoneList.push(cleaned);
        } else {
          invalidCustom.push(`"${p}"`);
        }
      }
      if (invalidCustom.length > 0) {
        return NextResponse.json({
          error: `Invalid custom numbers:\n${invalidCustom.join('\n')}`
        }, { status: 400 });
      }
    } else if (targetAudience === 'rotation') {
      const bSize = batchSize ? parseInt(batchSize, 10) : 250;
      
      // 1. Get active rotation
      const { data: activeRotation } = await supabaseAdmin
        .from('whatsapp_broadcast_rotations')
        .select('*')
        .eq('business_id', clientId)
        .eq('status', 'active')
        .maybeSingle();

      if (!activeRotation) {
        return NextResponse.json({ error: 'No active rotation found. Please start a new rotation first.' }, { status: 400 });
      }

      // 2. Fetch used contacts for this rotation
      const { data: usedRecords } = await supabaseAdmin
        .from('whatsapp_broadcast_rotation_recipients')
        .select('contact_id')
        .eq('rotation_id', activeRotation.id);
      
      const usedIds = new Set((usedRecords || []).map(r => r.contact_id));

      // 3. Fetch all active contacts
      const { data: allContacts } = await supabaseAdmin
        .from('whatsapp_contacts')
        .select('id, normalized_phone')
        .eq('business_id', clientId)
        .eq('status', 'active');

      if (!allContacts) {
        return NextResponse.json({ error: 'No active contacts found.' }, { status: 400 });
      }

      // 4. Filter to unused
      const unusedContacts = allContacts.filter(c => !usedIds.has(c.id));
      
      if (unusedContacts.length === 0) {
        return NextResponse.json({ error: 'All eligible customers have been used in the current rotation. Please complete it and start a new one.' }, { status: 400 });
      }

      // 5. Take exactly the batch size
      const batchContacts = unusedContacts.slice(0, bSize);
      
      // Because we must ensure ATOMIC selection to avoid two concurrent campaigns overlapping,
      // we insert them into the `whatsapp_broadcast_rotation_recipients` right now without campaign_id.
      // If it succeeds, they are reserved. If someone else took them simultaneously, `ignoreDuplicates` will ignore them.
      
      const reservePayload = batchContacts.map(c => ({
        rotation_id: activeRotation.id,
        business_id: clientId,
        contact_id: c.id,
        status: 'pending' // Just reserving for now
      }));

      const { data: insertedReserves, error: reserveError } = await supabaseAdmin
        .from('whatsapp_broadcast_rotation_recipients')
        .upsert(reservePayload, { onConflict: 'rotation_id,contact_id', ignoreDuplicates: true })
        .select('id, contact_id');

      if (reserveError) {
        console.error('Reservation error:', reserveError);
        return NextResponse.json({ error: 'Failed to reserve contacts for rotation' }, { status: 500 });
      }
      
      const successfullyReservedIds = new Set((insertedReserves || []).map(r => r.contact_id));
      const finalizedContacts = batchContacts.filter(c => successfullyReservedIds.has(c.id));

      if (finalizedContacts.length === 0) {
        return NextResponse.json({ error: 'Failed to reserve any contacts. Another broadcast might be running simultaneously.' }, { status: 409 });
      }

      // Store the mapping so we can attach campaign_id later
      (request as any).reservedRotations = insertedReserves;
      (request as any).activeRotationId = activeRotation.id;
      
      phoneList = finalizedContacts.map(c => c.normalized_phone).filter(Boolean) as string[];
    } else {
      // In a real scenario you would query contacts table based on tags. 
      // For now, if it's 'all' we fetch all from whatsapp_contacts
      let query = supabaseAdmin.from('whatsapp_contacts').select('normalized_phone').eq('business_id', clientId);
      const { data: contacts } = await query;
      if (contacts) {
        phoneList = contacts.map(c => c.normalized_phone).filter(Boolean) as string[];
      }
    }

    // Deduplicate
    phoneList = Array.from(new Set(phoneList));

    if (phoneList.length === 0) {
      return NextResponse.json({ error: 'No valid recipients found' }, { status: 400 });
    }

    // Create the Campaign Record
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from('whatsapp_campaigns')
      .insert({
        business_id: clientId,
        name: templateName || 'Custom Broadcast',
        template_name: templateName || null,
        template_language: templateLanguage || null,
        total_recipients: phoneList.length,
        status: 'processing'
      })
      .select('id')
      .single();

    if (campaignError || !campaign) {
      console.error('Campaign creation failed:', campaignError?.message);
      return NextResponse.json({ error: 'Failed to create campaign record' }, { status: 500 });
    }

    // Get or Create Contacts for the recipients
    const recipientsToInsert: any[] = [];
    
    // Chunking to avoid large payload errors
    const chunkSize = 500;
    for (let i = 0; i < phoneList.length; i += chunkSize) {
      const phoneChunk = phoneList.slice(i, i + chunkSize);
      
      // Upsert contacts
      const contactsToUpsert = phoneChunk.map(p => ({
        business_id: clientId,
        phone: p,
        normalized_phone: p,
        status: 'active'
      }));
      
      const { data: insertedContacts, error: upsertError } = await supabaseAdmin
        .from('whatsapp_contacts')
        .upsert(contactsToUpsert, { onConflict: 'business_id, normalized_phone' })
        .select('id, normalized_phone');
        
      if (!upsertError && insertedContacts) {
        const chunkRecipients = insertedContacts.map(c => ({
          campaign_id: campaign.id,
          contact_id: c.id,
          status: 'pending'
        }));
        await supabaseAdmin.from('whatsapp_campaign_recipients').insert(chunkRecipients);
        
        // If this was a rotation campaign, also attach campaign_id to the rotation records
        const reservedList: any[] = (request as any).reservedRotations;
        if (reservedList && reservedList.length > 0) {
           const contactIdsInChunk = new Set(insertedContacts.map(c => c.id));
           const reservedToUpdate = reservedList.filter(r => contactIdsInChunk.has(r.contact_id));
           if (reservedToUpdate.length > 0) {
             const reservedIds = reservedToUpdate.map(r => r.id);
             await supabaseAdmin.from('whatsapp_broadcast_rotation_recipients')
               .update({ campaign_id: campaign.id })
               .in('id', reservedIds);
           }
        }
      }
    }

    // Trigger the background processor asynchronously
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin') || 'http://localhost:3000';
    fetch(`${baseUrl}/api/cron/process-campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        campaign_id: campaign.id, 
        template_components: templateComponents,
        template_var_mapping: templateVarMapping,
        image_url: imageUrl
      })
    }).catch(err => console.error('Failed to trigger campaign processor:', err.message));

    return NextResponse.json({
      success: true,
      message: 'Cloud API broadcast started',
      auditId: campaign.id,
      totalLeads: phoneList.length,
    });
  } catch (error: any) {
    console.error('Broadcast Send API Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
