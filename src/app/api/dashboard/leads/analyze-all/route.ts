import { NextResponse } from 'next/server';
import { getSessionClient } from '@/lib/auth';
import { executeCommand, uploadFile, readFile } from '@/lib/ssh';
import { supabaseAdmin } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';

// Normalization function
function normalizePhone(phone: string): string {
  if (!phone) return '';
  const stripped = phone.replace(/\D/g, ''); // keep only digits
  if (stripped.length === 10 && !stripped.startsWith('91')) {
    return '91' + stripped;
  }
  if (stripped.length === 9 && !stripped.startsWith('971')) {
    return '971' + stripped;
  }
  return stripped;
}

// 5 core categories. To add more: add to CATEGORY_MAP, add keywords to analyze_leads.py, add UI badge and filter
const CATEGORY_MAP: Record<string, string> = {
  // LOCAL SERVICES
  'restaurant': 'local_services',
  'food': 'local_services',
  'cafe': 'local_services',
  'salon': 'local_services',
  'beauty': 'local_services',
  'spa': 'local_services',
  'gym': 'local_services',
  'fitness': 'local_services',
  'healthcare': 'local_services',
  'clinic': 'local_services',
  'hotel': 'local_services',
  'repair': 'local_services',
  'service': 'local_services',
  'local_services': 'local_services',

  // ECOMMERCE
  'retail': 'ecommerce',
  'product': 'ecommerce',
  'ecommerce': 'ecommerce',
  'shop': 'ecommerce',
  'clothing': 'ecommerce',
  'jewelry': 'ecommerce',
  'electronics': 'ecommerce',

  // REAL ESTATE
  'real_estate': 'real_estate',
  'property': 'real_estate',
  'realty': 'real_estate',
  'construction': 'real_estate',

  // PROFESSIONAL SERVICES
  'it': 'professional',
  'tech': 'professional',
  'education': 'professional',
  'coaching': 'professional',
  'legal': 'professional',
  'financial': 'professional',
  'consulting': 'professional',
  'agency': 'professional',
  'marketing': 'professional',
  'travel': 'professional',
  'professional': 'professional',

  // SCALECRAFT
  'scalecraft': 'scalecraft',
  'digital_products': 'scalecraft',
  'saas': 'scalecraft',
  'digital_saas': 'scalecraft',
};
const DEFAULT_CATEGORY = 'local_services';

export async function POST(request: Request) {
  try {
    const client = await getSessionClient();
    if (!client) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { serverIP, sshPrivateKey, serverUser, clientId } = client;
    if (!serverIP || !sshPrivateKey) {
      return NextResponse.json({ error: 'Server details missing' }, { status: 400 });
    }

    // Fetch existing leads from database first to preserve manually set attributes (is_converted, is_dnd, notes, etc.)
    const { data: existingLeads } = await supabaseAdmin
      .from('leads_cache')
      .select('phone, name, intent, is_converted, is_dnd, session_file, total_messages, user_messages, agent_messages, last_message_at, follow_up_date, follow_up_sent, notes, summary, last_analyzed_message_hash')
      .eq('client_id', clientId);

    const existingLeadsMap = new Map<string, { 
      name?: string; 
      intent?: string; 
      is_converted?: boolean;
      is_dnd?: boolean;
      session_file?: string;
      total_messages?: number;
      user_messages?: number;
      agent_messages?: number;
      last_message_at?: string;
      follow_up_date?: string | null;
      follow_up_sent?: boolean;
      notes?: string;
      summary?: string;
      last_analyzed_message_hash?: string;
    }>();
    if (existingLeads) {
      existingLeads.forEach((l) => {
        existingLeadsMap.set(l.phone, {
          name: l.name || undefined,
          intent: l.intent || undefined,
          is_converted: !!l.is_converted,
          is_dnd: !!l.is_dnd,
          session_file: l.session_file || undefined,
          total_messages: l.total_messages || 0,
          user_messages: l.user_messages || 0,
          agent_messages: l.agent_messages || 0,
          last_message_at: l.last_message_at || undefined,
          follow_up_date: l.follow_up_date || null,
          follow_up_sent: !!l.follow_up_sent,
          notes: l.notes || undefined,
          summary: l.summary || undefined,
          last_analyzed_message_hash: l.last_analyzed_message_hash || undefined,
        });
      });
    }

    // Check if we need to clear the leads cache first
    const { searchParams } = new URL(request.url);
    const shouldClear = searchParams.get('clear') === 'true';

    if (shouldClear) {
      console.log(`[analyze-all] Clearing leads cache for client: ${clientId}`);
      await supabaseAdmin
        .from('leads_cache')
        .delete()
        .eq('client_id', clientId);
    }

    // Determine category based on client businessType
    const businessTypeRaw = (client as any).businessType || '';
    const category = CATEGORY_MAP[businessTypeRaw.toLowerCase()] || DEFAULT_CATEGORY;

    // 1. Read local Python script content
    let scriptContent = '';
    try {
      const scriptLocalPath = path.join(process.cwd(), 'server/scripts/analyze_leads.py');
      scriptContent = fs.readFileSync(scriptLocalPath, 'utf8');
    } catch (fsErr: any) {
      console.error('Failed to read local analyze_leads.py script:', fsErr.message);
      return NextResponse.json({ error: 'Failed to load lead analyzer script.' }, { status: 500 });
    }

    // 2. Upload script to remote server
    const remoteScriptPath = '/home/ubuntu/analyze_leads.py';
    const uploadSuccess = await uploadFile(serverIP, sshPrivateKey, scriptContent, remoteScriptPath, serverUser || 'ubuntu');
    if (!uploadSuccess) {
      return NextResponse.json({ error: 'Failed to upload script to VPS.' }, { status: 500 });
    }

    // 3. Execute script on remote VPS with category argument
    const execCmd = `python3 ${remoteScriptPath} --category "${category}" --products-file /home/ubuntu/products.json`;
    const result = await executeCommand(serverIP, sshPrivateKey, execCmd, serverUser || 'ubuntu');
    
    // Clean up script on remote VPS
    await executeCommand(serverIP, sshPrivateKey, `rm -f ${remoteScriptPath}`, serverUser || 'ubuntu');

    if (result.exitCode !== 0) {
      console.error('Remote analyze script failed:', result.stderr || result.stdout);
      return NextResponse.json({ error: `Remote script failed: ${result.stderr || 'unknown error'}` }, { status: 500 });
    }

    // 4. Read analysis output JSON from VPS
    const remoteOutputPath = '/home/ubuntu/lead_analysis.json';
    const outputContent = await readFile(serverIP, sshPrivateKey, remoteOutputPath, serverUser || 'ubuntu');
    
    // Clean up output file on remote VPS
    await executeCommand(serverIP, sshPrivateKey, `rm -f ${remoteOutputPath}`, serverUser || 'ubuntu');

    if (!outputContent) {
      return NextResponse.json({ error: 'Failed to retrieve analysis output from VPS.' }, { status: 500 });
    }

    let analyzedLeads: any[] = [];
    try {
      analyzedLeads = JSON.parse(outputContent);
    } catch (parseErr: any) {
      console.error('Failed to parse output JSON:', parseErr.message);
      return NextResponse.json({ error: 'Invalid analyzer output format.' }, { status: 500 });
    }


    // 5. Existing leads map is already loaded and populated before clearing the cache

    // 6. Build upsert payloads without overriding manual conversion details
    const nowIso = new Date().toISOString();

    const upsertDataList = analyzedLeads.map((lead: any) => {
      const existing = existingLeadsMap.get(lead.phone);
      const finalName = (existing?.name && /[a-zA-Z]/.test(existing.name))
        ? existing.name
        : (lead.shared_name || lead.phone);
      
      const finalIntent = (existing?.intent === 'converted' || existing?.is_converted)
        ? 'converted'
        : lead.intent;

      // Calculate cumulative message counts using delta aggregation
      let deltaUser = 0;
      let deltaAgent = 0;

      if (existing && existing.session_file === lead.session_file) {
        deltaUser = Math.max(0, lead.user_messages - (existing.user_messages || 0));
        deltaAgent = Math.max(0, lead.agent_messages - (existing.agent_messages || 0));
      } else {
        deltaUser = lead.user_messages;
        deltaAgent = lead.agent_messages;
      }

      const finalTotalMessages = (existing?.total_messages || 0) + deltaUser + deltaAgent;

      // Auto-calculate follow-up scheduling
      let finalFollowUpDate = existing?.follow_up_date ? new Date(existing.follow_up_date).toISOString() : null;
      let finalFollowUpSent = existing?.follow_up_sent ?? false;

      const lastMsgTime = lead.last_message ? new Date(lead.last_message).getTime() : 0;
      const existingLastMsgTime = existing?.last_message_at ? new Date(existing.last_message_at).getTime() : 0;

      // If there is a new message (last message time from VPS is newer than what we had in DB)
      if (lastMsgTime > existingLastMsgTime) {
        finalFollowUpSent = false; // Reset sent status for new conversation turn
        
        // Schedule follow up 24 hours after their last message if the intent is warm, hot, or follow_up
        if (['warm', 'hot', 'follow_up'].includes(finalIntent)) {
          finalFollowUpDate = new Date(lastMsgTime + 24 * 60 * 60 * 1000).toISOString();
        } else {
          finalFollowUpDate = null; // Clear if intent changed to spam, converted, etc.
        }
      } else if (!existing?.follow_up_date && !finalFollowUpSent && ['warm', 'hot', 'follow_up'].includes(finalIntent)) {
        // If no follow-up is set yet, set it for 24 hours after the last message
        if (lastMsgTime) {
          finalFollowUpDate = new Date(lastMsgTime + 24 * 60 * 60 * 1000).toISOString();
        } else {
          finalFollowUpDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        }
      }

      return {
        phone: lead.phone,
        client_id: clientId,
        name: finalName,
        intent: finalIntent,
        is_converted: existing?.is_converted ?? false,
        is_dnd: existing?.is_dnd ?? false,
        notes: existing?.notes || '',
        category: lead.category || category,
        requirements: lead.requirements || {},
        summary: existing?.summary || lead.summary,
        last_analyzed_message_hash: existing?.last_analyzed_message_hash || null,
        last_analyzed_at: nowIso,
        session_file: lead.session_file,
        total_messages: finalTotalMessages,
        user_messages: lead.user_messages,
        agent_messages: lead.agent_messages,
        first_message_at: lead.first_message,
        last_message_at: lead.last_message,
        last_customer_message_at: lead.last_customer_message_time || null,
        days_since_last: lead.days_since_last,
        language: lead.language,
        intent_score: lead.intent_score,
        buying_signals: lead.buying_signals,
        negative_signals: lead.negative_signals,
        follow_up_signals: lead.follow_up_signals,
        products_mentioned: lead.products_mentioned,
        shared_phone: lead.shared_phone,
        shared_name: lead.shared_name,
        updated_at: nowIso,
        follow_up_score: lead.follow_up_score || 0,
        follow_up_reason: lead.follow_up_reason || '',
        is_price_sensitive: !!lead.is_price_sensitive,
        price_signals_found: lead.price_signals_found || [],
        customer_questions: lead.customer_questions || 0,
        last_message_from: lead.last_message_from || 'unknown',
        follow_up_date: finalFollowUpDate,
        follow_up_sent: finalFollowUpSent,
      };
    });


    // 7. Upsert all leads to Supabase leads_cache table in batches of 100
    const batchSize = 100;
    let upsertCount = 0;
    for (let i = 0; i < upsertDataList.length; i += batchSize) {
      const batch = upsertDataList.slice(i, i + batchSize);
      const { error: dbError } = await supabaseAdmin
        .from('leads_cache')
        .upsert(batch, { onConflict: 'client_id,phone' });

      if (dbError) {
        console.error(`DB Upsert Error in batch starting at index ${i}:`, dbError.message);
        return NextResponse.json({ error: `Failed to save leads to database: ${dbError.message}` }, { status: 500 });
      }
      upsertCount += batch.length;
    }

    // 8. Count intent breakdown for response metrics
    const stats = {
      analyzed: upsertCount,
      converted: 0,
      hot: 0,
      warm: 0,
      follow_up: 0,
      cold: 0,
      not_interested: 0,
      spam: 0,
    };

    upsertDataList.forEach((lead: any) => {
      if (lead.is_converted) stats.converted++;
      else if (lead.intent === 'hot') stats.hot++;
      else if (lead.intent === 'warm') stats.warm++;
      else if (lead.intent === 'follow_up') stats.follow_up++;
      else if (lead.intent === 'cold') stats.cold++;
      else if (lead.intent === 'not_interested') stats.not_interested++;
      else if (lead.intent === 'spam') stats.spam++;
    });

    return NextResponse.json(stats);
  } catch (error: any) {
    console.error('Leads analyze-all API error:', error.message);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
