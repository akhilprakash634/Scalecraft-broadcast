import { NextResponse } from 'next/server';
import { getSessionClient } from '@/lib/auth';
import { getLeads, executeCommand, uploadFile, readFile, hermesCmd, resolveHermesContext, normalizeAndValidatePhone } from '@/lib/ssh';
import { supabaseAdmin } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';

// Helper function to run lead analysis on VPS and sync to Supabase
async function runLeadsAnalysis(client: any) {
  const ctx = resolveHermesContext(client);
  const { sshPrivateKey, serverUser } = client;
  const serverIP = ctx.ip;
  const clientId = client.clientId;
  
  // Determine category based on client businessType
  const CATEGORY_MAP: Record<string, string> = {
    'restaurant': 'local_services', 'food': 'local_services', 'cafe': 'local_services',
    'salon': 'local_services', 'beauty': 'local_services', 'spa': 'local_services',
    'gym': 'local_services', 'fitness': 'local_services', 'healthcare': 'local_services',
    'clinic': 'local_services', 'hotel': 'local_services', 'repair': 'local_services',
    'service': 'local_services', 'local_services': 'local_services',
    'retail': 'ecommerce', 'product': 'ecommerce', 'ecommerce': 'ecommerce',
    'shop': 'ecommerce', 'clothing': 'ecommerce', 'jewelry': 'ecommerce',
    'electronics': 'ecommerce',
    'real_estate': 'real_estate', 'property': 'real_estate', 'realty': 'real_estate',
    'construction': 'real_estate',
    'it': 'professional', 'tech': 'professional', 'education': 'professional',
    'coaching': 'professional', 'legal': 'professional', 'financial': 'professional',
    'consulting': 'professional', 'agency': 'professional', 'marketing': 'professional',
    'travel': 'professional', 'professional': 'professional',
    'scalecraft': 'scalecraft', 'digital_products': 'scalecraft', 'saas': 'scalecraft', 'digital_saas': 'scalecraft'
  };
  const category = CATEGORY_MAP[((client.businessType || '') as string).toLowerCase()] || 'local_services';

  const scriptLocalPath = path.join(process.cwd(), 'server/scripts/analyze_leads.py');
  const scriptContent = fs.readFileSync(scriptLocalPath, 'utf8');

  const remoteScriptPath = `/home/ubuntu/analyze_leads_${client._id}.py`;
  await uploadFile(serverIP, sshPrivateKey, scriptContent, remoteScriptPath, serverUser || 'ubuntu');

  const productsPath = `${ctx.profileRoot}/products.json`;
  const remoteOutputPath = `/home/ubuntu/lead_analysis_${client._id}.json`;
  const profileArg = ctx.profile ? ` --profile "${ctx.profile}"` : "";

  const execCmd = `python3 ${remoteScriptPath} --category "${category}" --products-file "${productsPath}" --output-file "${remoteOutputPath}"${profileArg}`;
  await executeCommand(serverIP, sshPrivateKey, execCmd, serverUser || 'ubuntu');

  await executeCommand(serverIP, sshPrivateKey, `rm -f ${remoteScriptPath}`, serverUser || 'ubuntu');

  const outputContent = await readFile(serverIP, sshPrivateKey, remoteOutputPath, serverUser || 'ubuntu');
  await executeCommand(serverIP, sshPrivateKey, `rm -f ${remoteOutputPath}`, serverUser || 'ubuntu');

  if (!outputContent) return [];

  const analyzedLeads = JSON.parse(outputContent);

  const { data: existingLeads } = await supabaseAdmin
    .from('leads_cache')
    .select('phone, name, intent, is_converted, is_dnd, session_file, total_messages, user_messages, agent_messages, last_message_at, follow_up_date, follow_up_sent')
    .eq('client_id', clientId);

  const existingLeadsMap = new Map<string, any>();
  if (existingLeads) {
    existingLeads.forEach((l) => {
      existingLeadsMap.set(l.phone, l);
    });
  }

  const nowIso = new Date().toISOString();
  const upsertDataList = analyzedLeads.map((lead: any) => {
    const existing = existingLeadsMap.get(lead.phone);
    const finalName = (existing?.name && /[a-zA-Z]/.test(existing.name)) ? existing.name : (lead.shared_name || lead.phone);
    const finalIntent = (existing?.intent === 'converted' || existing?.is_converted) ? 'converted' : lead.intent;

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
      phone: normalizePhone(lead.phone),
      client_id: clientId,
      name: finalName,
      intent: finalIntent,
      is_converted: existing?.is_converted ?? false,
      is_dnd: existing?.is_dnd ?? false,
      category: lead.category || category,
      requirements: lead.requirements || {},
      summary: lead.summary,
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

  const batchSize = 100;
  for (let i = 0; i < upsertDataList.length; i += batchSize) {
    const batch = upsertDataList.slice(i, i + batchSize);
    await supabaseAdmin.from('leads_cache').upsert(batch, { onConflict: 'client_id,phone' });
  }

  return upsertDataList;
}

// Normalization function using standard helper
function normalizePhone(phone: string): string {
  if (!phone) return '';
  const { cleaned } = normalizeAndValidatePhone(phone);
  return cleaned || phone.replace(/\D/g, ''); // Fallback to digit-only raw if invalid
}

export async function GET(request: Request) {
  try {
    const client = await getSessionClient();
    if (!client) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sshPrivateKey, serverUser, clientId } = client;

    // Resolve the correct IP and profile root for both dedicated and shared/multi-tenant clients
    const ctx = resolveHermesContext(client);
    const resolvedIP = ctx.ip;
    const profileRoot = ctx.profileRoot; // e.g. ~/.hermes/profiles/{id} for multi-tenant

    if (!resolvedIP || !sshPrivateKey) {
      return NextResponse.json({ error: 'Server details missing' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const shouldSync = searchParams.get('sync') === 'true';
    const limitParam = searchParams.get('limit');
    const fieldsParam = searchParams.get('fields');
    const range = searchParams.get('range') || 'total';

    let startDate: Date | null = null;
    if (range !== 'total') {
      const now = new Date();
      const offset = 5.5 * 60 * 60 * 1000; // IST offset
      const localNow = new Date(now.getTime() + offset);

      const startOfDay = new Date(localNow);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const startOfToday = new Date(startOfDay.getTime() - offset);

      if (range === 'today') {
        startDate = startOfToday;
      } else if (range === 'week') {
        const startOfWeek = new Date(localNow);
        const day = startOfWeek.getUTCDay();
        const diff = startOfWeek.getUTCDate() - day + (day === 0 ? -6 : 1);
        startOfWeek.setUTCDate(diff);
        startOfWeek.setUTCHours(0, 0, 0, 0);
        startDate = new Date(startOfWeek.getTime() - offset);
      } else if (range === 'month') {
        const startOfMonth = new Date(localNow);
        startOfMonth.setUTCDate(1);
        startOfMonth.setUTCHours(0, 0, 0, 0);
        startDate = new Date(startOfMonth.getTime() - offset);
      }
    }

    // 1. Fetch leads from Supabase leads_cache first
    let query = supabaseAdmin
      .from('leads_cache')
      .select(fieldsParam || '*')
      .eq('client_id', clientId);

    if (startDate) {
      query = query.gte('last_message_at', startDate.toISOString());
    }

    query = query.order('last_message_at', { ascending: false });

    if (limitParam) {
      const limitVal = parseInt(limitParam, 10);
      if (!isNaN(limitVal)) {
        query = query.limit(limitVal);
      }
    }

    const { data: cachedLeads, error: dbError } = await query;

    if (dbError) {
      console.error('Failed to retrieve cached leads:', dbError.message);
      return NextResponse.json({ error: 'Database error retrieving leads' }, { status: 500 });
    }

    // If not requesting SSH sync, return cached leads immediately (Tier 1)
    if (!shouldSync) {
      return NextResponse.json({ needs_analysis: false, leads: cachedLeads || [] });
    }

    // 2. Combine count and newest file time check in a single SSH execution.
    // Multi-tenant sessions live in profileRoot/state.db (gateway_sessions table).
    // Dedicated VPS sessions may be in ~/.hermes/state.db or ~/.hermes/sessions/*.jsonl.
    const profileStateDb = `${profileRoot}/state.db`;
    const checkScript = `python3 -c "
import os, sqlite3, glob
count = 0
mtime = 0

# Priority 1: profile-specific state.db (multi-tenant gateway sessions)
profile_db = os.path.expanduser('${profileStateDb}')
if os.path.exists(profile_db):
    for table in ['gateway_sessions', 'sessions', 'agent_sessions']:
        try:
            c = sqlite3.connect(profile_db).execute(f'select count(*) from {table}')
            n = c.fetchone()[0]
            if n > 0:
                count = n
                mtime = int(os.path.getmtime(profile_db))
                break
        except:
            pass

# Priority 2: profile sessions dir .jsonl files
if count == 0:
    sessions_dir = os.path.expanduser('${profileRoot}/sessions')
    if os.path.isdir(sessions_dir):
        jsonl_files = glob.glob(os.path.join(sessions_dir, '*.jsonl'))
        count = len(jsonl_files)
        if jsonl_files:
            mtime = int(max(os.path.getmtime(f) for f in jsonl_files))

# Fallback: root ~/.hermes/state.db (dedicated VPS)
if count == 0:
    db = os.path.expanduser('~/.hermes/state.db')
    if os.path.exists(db):
        try:
            count = sqlite3.connect(db).execute('select count(*) from sessions').fetchone()[0]
            mtime = int(os.path.getmtime(db))
        except:
            pass

# Last resort: root sessions dir .jsonl files
if count == 0:
    jsonl_files = glob.glob(os.path.expanduser('~/.hermes/sessions/*.jsonl'))
    count = len(jsonl_files)
    if jsonl_files:
        mtime = int(max(os.path.getmtime(f) for f in jsonl_files))

print(f'count={count}')
print(f'mtime={mtime}')
" 2>/dev/null`;

    const statusCheck = await executeCommand(resolvedIP, sshPrivateKey, checkScript, serverUser || 'ubuntu');

    if (statusCheck.exitCode !== 0) {
      console.warn(`[GET leads] SSH status check failed (exitCode=${statusCheck.exitCode}) profile=${ctx.profile || 'dedicated'}: ${statusCheck.stderr || 'unknown error'}`);
      // Return cached leads to avoid deleting/resetting client's dashboard state during transient server failures
      return NextResponse.json({ needs_analysis: false, leads: cachedLeads || [] });
    }

    const lines = statusCheck.stdout.split('\n');
    let count = 0;
    let newestTimeEpoch = 0;
    for (const line of lines) {
      if (line.startsWith('count=')) count = parseInt(line.split('=')[1] || '0', 10);
      if (line.startsWith('mtime=')) newestTimeEpoch = parseInt(line.split('=')[1] || '0', 10);
    }
    const newestFileTimeMs = newestTimeEpoch * 1000;

    if (count === 0) {
      // Do NOT delete cached leads from Supabase here! Wiping cache on a GET request is dangerous.
      // If there are no conversations on the VPS, we just return empty/cached leads.
      return NextResponse.json({ needs_analysis: false, leads: cachedLeads || [], message: 'No conversations yet' });
    }

    const hasLeads = cachedLeads && cachedLeads.length > 0;
    const firstLead = hasLeads ? (cachedLeads as any)[0] : null;
    const lastAnalyzed = firstLead && firstLead.last_analyzed_at ? new Date(firstLead.last_analyzed_at).getTime() : 0;

    if (!hasLeads || !lastAnalyzed || lastAnalyzed < newestFileTimeMs) {
      // Trigger background analysis asynchronously so the user gets page data instantly
      runLeadsAnalysis(client).catch((err) => {
        console.error('Background leads analysis failed:', err.message);
      });

      return NextResponse.json({ needs_analysis: true, leads: cachedLeads || [] });
    }

    return NextResponse.json({ needs_analysis: false, leads: cachedLeads });

  } catch (error: any) {
    console.error('Leads GET API Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST() {
  try {
    const client = await getSessionClient();
    if (!client) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { serverIP, sshPrivateKey, serverUser, googleSheetId } = client;
    if (!serverIP || !sshPrivateKey) {
      return NextResponse.json({ error: 'Server details missing' }, { status: 400 });
    }

    if (!googleSheetId || !googleSheetId.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Google Sheet ID or Web App URL not configured. Please save your Sheet settings first.',
      }, { status: 400 });
    }

    // 1. Fetch leads from the VPS
    const leads = await getLeads(client, sshPrivateKey, serverUser || 'ubuntu');

    // 2. Direct Sync (The Easy Way) using Google Apps Script Web App URL
    if (googleSheetId.trim().startsWith('https://script.google.com')) {
      try {
        const response = await fetch(googleSheetId.trim(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leads }),
        });

        if (!response.ok) {
          throw new Error(`Google Apps Script returned status ${response.status}`);
        }

        const result = await response.json();
        if (result && result.success === false) {
          throw new Error(result.error || 'Unknown Apps Script error');
        }

        return NextResponse.json({ success: true, leads });
      } catch (err: any) {
        console.error('Google Web App sync error:', err.message);
        return NextResponse.json({
          success: false,
          error: `Google Apps Script Web App sync failed: ${err.message}`,
        }, { status: 500 });
      }
    }

    // 3. Regular Sheet ID Sync: Upload the python sync script and execute it
    let localScriptContent = '';
    try {
      const scriptLocalPath = path.join(process.cwd(), 'server/scripts/push_leads.py');
      localScriptContent = fs.readFileSync(scriptLocalPath, 'utf8');
    } catch (fsErr: any) {
      console.error('Failed to read local push_leads.py script:', fsErr.message);
      return NextResponse.json({
        success: false,
        error: 'Failed to read local sync script files for deployment.',
      }, { status: 500 });
    }

    // Upload push_leads.py to VPS
    const remoteScriptPath = '/home/ubuntu/push_leads.py';
    const uploadSuccess = await uploadFile(serverIP, sshPrivateKey, localScriptContent, remoteScriptPath, serverUser || 'ubuntu');
    if (!uploadSuccess) {
      return NextResponse.json({
        success: false,
        error: 'Failed to upload sync script to remote server.',
      }, { status: 500 });
    }

    // Ensure pip dependencies are installed and run the sync script
    const syncCmd = `pip3 install --quiet gspread google-auth && python3 ${remoteScriptPath}`;
    const result = await executeCommand(serverIP, sshPrivateKey, syncCmd, serverUser || 'ubuntu');

    if (result.exitCode !== 0) {
      // Check if credentials are missing
      const stderr = result.stderr || result.stdout || '';
      if (stderr.includes('Google Service account credentials not found')) {
        return NextResponse.json({
          success: false,
          error: 'Google Service account credentials not found on your server. To fix this, use the Google Apps Script Web App method (the Easy Way) below.',
        }, { status: 500 });
      }

      return NextResponse.json({
        success: false,
        error: `Sync script failed: ${stderr || 'exit code ' + result.exitCode}`,
      }, { status: 500 });
    }

    return NextResponse.json({ success: true, leads });
  } catch (error: any) {
    console.error('Leads POST API Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
