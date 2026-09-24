import { NextResponse } from 'next/server';
import { getSessionClient } from '@/lib/auth';
import { executeCommand, uploadFile, readFile, getClientServerIp, resolveHermesContext } from '@/lib/ssh';
import { supabaseAdmin } from '@/lib/supabase';
import { formatMediaMessage } from '@/lib/mediaMessage';
import { getClientAccessToken, updateSingleLeadInSheet } from '@/lib/googleSheets';
import { createHash } from 'crypto';

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

function calculateIntentScore(messages: any[], category: string): number {
  const userMessages = messages.filter(m => m.role === 'user');
  const userCombinedText = userMessages.map(m => m.content || '').join(' ').toLowerCase();
  
  const hasPhone = /\b[6-9]\d{9}\b/.test(userCombinedText);
  const hasEmail = /[\w\.-]+@[\w\.-]+\.\w+/.test(userCombinedText);
  
  const addressKws = ["street", "road", "house", "hno", "flat", "apartment", "pincode", "pin po", "near by", "opposite", "landmark", "address"];
  const hasAddress = addressKws.some(kw => userCombinedText.includes(kw));
  
  let contactScore = 0.0;
  if (hasPhone || hasEmail) contactScore += 1.5;
  if (hasAddress) contactScore += 1.5;

  const strongBuyPhrases = ["how do i pay", "payment link", "send account", "upi", "gpay", "phonepay", "bank details"];
  const mildBuyPhrases = ["interested", "yes", "ok", "sure", "tell me more", "send details", "sounds good"];
  
  const categoryKeywords: Record<string, string[]> = {
    local_services: ["booking", "appointment", "slot", "available", "table", "order", "delivery", "visit", "timing", "price", "how much", "when", "today", "tomorrow", "home service", "home delivery", "cost", "rate", "can i book", "want to order", "interested"],
    ecommerce: ["price", "cost", "available", "stock", "in stock", "delivery", "shipping", "cod", "buy", "order", "size", "color", "offer", "discount", "rate", "how much", "is it available", "can i order", "want to buy", "interested in buying"],
    real_estate: ["bhk", "bedroom", "flat", "apartment", "villa", "plot", "land", "price", "budget", "loan", "emi", "site visit", "visit", "sqft", "square feet", "location", "area", "available", "ready to move", "interested in buying", "looking for property"],
    professional: ["quote", "proposal", "price", "cost", "fees", "timeline", "when can you start", "package", "course", "batch", "admission", "demo", "trial", "portfolio", "sample", "how much", "interested", "need a website", "need an app", "need help with"],
    scalecraft: ["price", "cost", "setup", "install", "how much", "monthly", "whatsapp ai", "chatbot", "demo", "buy", "purchase", "payment", "link", "how to pay", "saas", "subscription", "agent", "interested", "want to try", "how does it work", "show me"]
  };
  const catBuyPhrases = categoryKeywords[category] || categoryKeywords['local_services'];

  const strongCount = strongBuyPhrases.filter(p => userCombinedText.includes(p)).length;
  const mildCount = mildBuyPhrases.filter(p => userCombinedText.includes(p)).length;
  const catBuyCount = catBuyPhrases.filter(p => userCombinedText.includes(p)).length;

  const buyingRaw = (2.0 * strongCount) + (1.0 * mildCount) + (1.0 * catBuyCount);
  const buyingScore = Math.min(5.0, buyingRaw);

  const fupPhrases = ["later", "tomorrow", "will decide", "need time", "will check", "maybe", "nokkatte", "nokeett", "parayam", "naale", "pinne", "chodichitt", "alochichitt", "nokkam", "vilikkam", "nokeettu", "alochikam", "next week", "next month", "will check later", "let me check", "will let you know"];
  const followupCount = fupPhrases.filter(p => userCombinedText.includes(p)).length;
  const followupScore = Math.min(2.0, 1.0 * followupCount);

  const negPhrases = ["not interested", "no thanks", "bye", "wrong number", "stop messaging", "unsubscribe"];
  const negativeCount = negPhrases.filter(p => userCombinedText.includes(p)).length;
  const negativePenalty = 3.0 * negativeCount;

  const total = contactScore + buyingScore + followupScore - negativePenalty;
  return Math.max(0, Math.min(10, Math.round(total)));
}

type Params = Promise<{ phone: string }>;

// Short TTL in-memory cache per client + phone to eliminate redundant SSH roundtrips on rapid polling
const chatMemoryCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 5000; // 5 seconds

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

    const cacheKey = `${client.clientId || client._id}:${phone}`;
    const now = Date.now();
    const cachedEntry = chatMemoryCache.get(cacheKey);

    const { searchParams } = new URL(request.url);
    const forceFresh = searchParams.get('fresh') === 'true';

    if (!forceFresh && cachedEntry && (now - cachedEntry.timestamp < CACHE_TTL_MS)) {
      return NextResponse.json(cachedEntry.data);
    }

    const serverIP = getClientServerIp(client);
    const { sshPrivateKey, serverUser } = client;
    if (!serverIP || !sshPrivateKey) {
      return NextResponse.json({ error: 'Server details missing' }, { status: 400 });
    }

    const profile = client.hermesProfile || '';
    const profilePrefix = profile ? `profiles/${profile}/` : '';

    // Execute get_chat.py on VPS directly to save SSH connection overhead
    const remoteScriptPath = `/home/ubuntu/.hermes/get_chat_${client._id}.py`;
    const execCmd = `python3 ${remoteScriptPath} "${phone}"`;

    let result = await executeCommand(serverIP, sshPrivateKey, execCmd, serverUser || 'ubuntu');
    let needsUpload = false;
    try {
      if (result.exitCode !== 0 || result.stdout.trim() === '') {
        needsUpload = true;
      } else {
        const parsed = JSON.parse(result.stdout);
        if (!parsed.messages || !result.stdout.includes('DEDUPLICATED_VERSION_5')) {
          needsUpload = true;
        }
      }
    } catch {
      needsUpload = true;
    }

    if (needsUpload) {
       const staticGetChatPython = `import sys, json, os, datetime, sqlite3
# DEDUPLICATED_VERSION_5
if len(sys.argv) < 2:
    print(json.dumps({"error": "Missing phone number"}))
    sys.exit(1)
phone = sys.argv[1]
sessions_file = os.path.expanduser('~/.hermes/${profilePrefix}sessions/sessions.json')
memory_file = os.path.expanduser('~/.hermes/${profilePrefix}lead_memory.json')

profile = "${profile}"
if profile:
    db_path = f"/home/ubuntu/.hermes/profiles/{profile}/state.db"
else:
    db_path = "/home/ubuntu/.hermes/state.db"

result = {"phone": phone, "name": phone, "messages": [], "memory": {}}

# Initialize session state
sessions = {}
sids = set()
phone_clean = phone.replace("+", "").split(":")[0].split("@", 1)[0]

# Load sessions.json if it exists (optional — not required for Cloud API clients)
if os.path.exists(sessions_file):
    try:
        with open(sessions_file) as f:
            sessions = json.load(f)
        target_clean = phone_clean
        for key, val in sessions.items():
            key_lower = key.lower()
            if "whatsapp" not in key_lower and "whatsapp_cloud" not in key_lower:
                continue
            k_phone = key.split(":")[-1] if ":" in key else ""
            if k_phone == target_clean:
                sid_val = val.get("session_id") if isinstance(val, dict) else val
                if sid_val:
                    sids.add(sid_val)
            elif isinstance(val, dict) and "origin" in val:
                origin = val["origin"]
                chat_id = origin.get("chat_id", "")
                user_id = origin.get("user_id", "")
                chat_clean = chat_id.replace("+", "").split(":")[0].split("@", 1)[0]
                user_clean = user_id.replace("+", "").split(":")[0].split("@", 1)[0]
                if target_clean in [chat_clean, user_clean]:
                    sid_val = val.get("session_id")
                    if sid_val:
                        sids.add(sid_val)
    except Exception:
        pass

# ALWAYS: Try SQLite sessions table (Cloud API stores sessions here, not sessions.json)
if os.path.exists(db_path):
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        phone_digits = ''.join(c for c in phone if c.isdigit())
        phone_last10 = phone_digits[-10:] if len(phone_digits) >= 10 else phone_digits
        cursor.execute("""
            SELECT id
            FROM sessions
            WHERE (
              session_key LIKE ?
              OR session_key LIKE ?
              OR session_key LIKE ?
              OR session_key LIKE ?
            )
        """, (
            f"%dm%{phone_clean}%",
            f"%dm%{phone_digits}%",
            f"%dm%{phone_last10}%",
            f"%{phone_digits}%",
        ))
        for r in cursor.fetchall():
            sids.add(r[0])
        conn.close()
    except Exception:
        pass

# ALWAYS: Try gateway_routing fallback
if os.path.exists(db_path):
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        phone_digits = ''.join(c for c in phone if c.isdigit())
        phone_last10 = phone_digits[-10:] if len(phone_digits) >= 10 else phone_digits
        cursor.execute("""
            SELECT gr.session_id
            FROM gateway_routing gr
            WHERE (
              gr.session_key LIKE ?
              OR gr.session_key LIKE ?
              OR gr.session_key LIKE ?
              OR gr.session_key LIKE ?
            )
        """, (
            f"%dm%{phone_clean}%",
            f"%dm%{phone_digits}%",
            f"%dm%{phone_last10}%",
            f"%{phone_digits}%",
        ))
        for r in cursor.fetchall():
            if r[0]:
                sids.add(r[0])
        conn.close()
    except Exception:
        pass

# ALWAYS: Fetch messages from SQLite if we have session ids
db_messages = []
valid_sids = [s for s in sids if s is not None]
if valid_sids and os.path.exists(db_path):
    _conn = None
    try:
        _conn = sqlite3.connect(db_path)
        _cur = _conn.cursor()
        _placeholders = ','.join('?' for _ in valid_sids)
        _cur.execute(f"""
            SELECT m.role, m.content, m.timestamp
            FROM messages m
            WHERE m.session_id IN ({_placeholders})
              AND m.role IN ('user', 'assistant', 'human', 'ai')
            ORDER BY m.timestamp ASC
        """, tuple(valid_sids))
        for m_role, m_content, m_timestamp in _cur.fetchall():
            is_bot = m_role in ['assistant', 'agent', 'ai']
            ts_str = ""
            if isinstance(m_timestamp, (int, float)):
                try:
                    ts_str = datetime.datetime.fromtimestamp(m_timestamp, datetime.timezone.utc).isoformat().replace('+00:00', 'Z')
                except:
                    ts_str = str(m_timestamp)
            else:
                ts_str = str(m_timestamp or '')
            # Handle content: could be str, list (LangChain), or dict
            text = ''
            if isinstance(m_content, str):
                text = m_content
            elif isinstance(m_content, list):
                parts = []
                for part in m_content:
                    if isinstance(part, dict):
                        parts.append(part.get('text') or part.get('content') or '')
                    elif isinstance(part, str):
                        parts.append(part)
                text = ' '.join(filter(None, parts))
            elif m_content is not None:
                text = str(m_content)
            db_messages.append({"sender": "agent" if is_bot else "customer", "text": text, "timestamp": ts_str})
    except Exception:
        pass
    finally:
        if _conn:
            try:
                _conn.close()
            except Exception:
                pass

# Optional: enrich empty customer messages with voice tag from tool_calls (safe, isolated)
if valid_sids and os.path.exists(db_path) and db_messages:
    try:
        _conn2 = sqlite3.connect(db_path)
        _cur2 = _conn2.cursor()
        _placeholders2 = ','.join('?' for _ in valid_sids)
        _cur2.execute(f"""
            SELECT m.role, m.tool_calls, m.timestamp
            FROM messages m
            WHERE m.session_id IN ({_placeholders2})
              AND m.role IN ('assistant', 'ai')
              AND m.tool_calls IS NOT NULL
              AND m.tool_calls != ''
            ORDER BY m.timestamp ASC
        """, tuple(valid_sids))
        tc_rows = _cur2.fetchall()
        _conn2.close()
        # Build a map: timestamp -> tool_calls for agent messages
        for tc_role, tc_json, tc_ts in tc_rows:
            try:
                tc_list = json.loads(tc_json)
                for tc in (tc_list if isinstance(tc_list, list) else []):
                    func = tc.get('function', tc)
                    name = func.get('name', '')
                    if not ('transcribe' in name.lower() or 'stt' in name.lower() or 'speech' in name.lower()):
                        continue
                    args = func.get('arguments', '{}')
                    if isinstance(args, str):
                        try: args = json.loads(args)
                        except: args = {}
                    path = args.get('audio_path') or args.get('audio') or args.get('path') or args.get('file') or ''
                    if not path:
                        continue
                    # Find the closest preceding empty customer message by timestamp
                    for i in range(len(db_messages) - 1, -1, -1):
                        m2 = db_messages[i]
                        if m2.get('sender') == 'customer' and not m2.get('text', '').strip():
                            if m2.get('timestamp', '') <= tc_ts:
                                m2['text'] = f"[Voice attached at: {path}]"
                                break
                        if m2.get('timestamp', '') > tc_ts:
                            continue
            except Exception:
                pass
    except Exception:
        pass

# ALWAYS: Fetch from jsonl if it exists (Baileys / legacy sessions)
jsonl_messages = []
if valid_sids:
    for sid in valid_sids:
        jsonl_path = os.path.expanduser(f'~/.hermes/${profilePrefix}sessions/{sid}.jsonl')
        if os.path.exists(jsonl_path):
            try:
                with open(jsonl_path, 'rb') as jf:
                    for line in jf:
                        try:
                            data = json.loads(line.decode('utf-8'))
                            role = data.get('role', '')
                            sender_id = data.get('sender', '')
                            if role in ['session_meta', 'tool', 'system']:
                                continue
                            is_bot = role in ['assistant', 'agent', 'ai'] or data.get('isBot', False) or 'agent' in sender_id
                            msg_text = data.get('content') or data.get('message', {}).get('text') or data.get('text')
                            if isinstance(msg_text, list):
                                text_parts = []
                                for part in msg_text:
                                    if isinstance(part, dict):
                                        text_parts.append(part.get('text') or part.get('content') or '')
                                    elif isinstance(part, str):
                                        text_parts.append(part)
                                msg_text = " ".join(filter(None, text_parts))
                            elif isinstance(msg_text, dict):
                                msg_text = msg_text.get('text') or msg_text.get('content') or ''
                            elif not isinstance(msg_text, str):
                                msg_text = str(msg_text) if msg_text is not None else ''
                            if not msg_text and 'message' in data and isinstance(data['message'], str):
                                msg_text = data['message']
                            ts_val = data.get('timestamp', '')
                            ts_str = ""
                            if isinstance(ts_val, (int, float)):
                                try:
                                    ts_str = datetime.datetime.fromtimestamp(ts_val, datetime.timezone.utc).isoformat().replace('+00:00', 'Z')
                                except:
                                    ts_str = str(ts_val)
                            else:
                                ts_str = str(ts_val or '')
                            jsonl_messages.append({"sender": "agent" if is_bot else "customer", "text": msg_text or '', "timestamp": ts_str})
                        except Exception:
                            pass
            except Exception:
                pass

# ALWAYS: Fetch sent messages from delivery_obligations (agent messages)
delivery_messages = []
if os.path.exists(db_path):
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("""
            SELECT 'assistant' as role, content, created_at as timestamp
            FROM delivery_obligations
            WHERE (session_key LIKE ? OR session_key LIKE ?)
              AND state = 'delivered'
              AND content IS NOT NULL
              AND content != ''
            ORDER BY created_at ASC
        """, (
            f"%whatsapp_cloud%dm%{phone_clean}%",
            f"%whatsapp%dm%{phone_clean}%",
        ))
        for d_role, d_content, d_timestamp in cursor.fetchall():
            ts_str = ""
            if isinstance(d_timestamp, (int, float)):
                try:
                    ts_str = datetime.datetime.fromtimestamp(d_timestamp, datetime.timezone.utc).isoformat().replace('+00:00', 'Z')
                except:
                    ts_str = str(d_timestamp)
            else:
                ts_str = str(d_timestamp or '')
            delivery_messages.append({"sender": "agent", "text": d_content or '', "timestamp": ts_str})
        conn.close()
    except Exception:
        pass

# Combine and deduplicate
combined = []
seen_keys = set()

# Add jsonl and db messages (exact duplicate filter)
for m in jsonl_messages + db_messages:
    txt = m.get('text', '').strip()
    snd = m.get('sender', '')
    ts = m.get('timestamp', '')
    key = (snd, txt, ts)
    if key not in seen_keys:
        seen_keys.add(key)
        combined.append(m)

# Add delivery obligations (agent messages only)
# Only add if the exact text is not already in combined
existing_agent_texts = {m['text'].strip() for m in combined if m['sender'] == 'agent'}
for m in delivery_messages:
    txt = m.get('text', '').strip()
    if txt not in existing_agent_texts:
        combined.append(m)
        existing_agent_texts.add(txt)

combined.sort(key=lambda x: x.get('timestamp', ''))
result['messages'] = combined

if os.path.exists(memory_file):
    try:
        with open(memory_file) as f:
            memories = json.load(f)
            if phone in memories:
                result['memory'] = memories[phone]
                result['name'] = memories[phone].get('name', phone)
    except Exception:
        pass
print(json.dumps(result))
`;
       await uploadFile(serverIP, sshPrivateKey, staticGetChatPython, remoteScriptPath, serverUser || 'ubuntu');
       result = await executeCommand(serverIP, sshPrivateKey, execCmd, serverUser || 'ubuntu');
    }

    try {
      const data = JSON.parse(result.stdout);
      
      // Auto-analysis: if conversation has changed since last analysis, trigger background Gemini update
      const messages = data.messages || [];
      if (messages.length > 0) {
        const last10 = messages.slice(-10);
        const messageHash = createHash('md5')
          .update(last10.map((m: any) => `${m.sender}:${m.text}`).join('|'))
          .digest('hex');

        // Check cached hash
        const { data: cachedLead } = await supabaseAdmin
          .from('leads_cache')
          .select('last_analyzed_message_hash, summary, intent_score')
          .eq('phone', phone)
          .eq('client_id', client.clientId)
          .single();

        if (!cachedLead || cachedLead.last_analyzed_message_hash !== messageHash) {
          // Fire analysis in background (non-blocking for the GET response)
          const analyzeUrl = new URL('/api/dashboard/leads/analyze', request.url);
          fetch(analyzeUrl.toString(), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cookie': request.headers.get('cookie') || '',
            },
            body: JSON.stringify({ phone }),
          }).catch((err) => {
            console.warn('[GET /leads/phone] Background analysis failed:', err.message);
          });
        }

        // Attach cached analysis data to the response
        if (cachedLead) {
          data.cachedAnalysis = {
            summary: cachedLead.summary || '',
            intentScore: cachedLead.intent_score ?? 0,
          };
        }
      }

      // Query authentic status receipts from broadcast_recipient_logs & leads_cache
      const phoneDigits = phone.replace(/\D/g, '');
      const phoneVariants = Array.from(new Set([phoneDigits, '+' + phoneDigits, phoneDigits.length >= 10 ? phoneDigits.slice(-10) : phoneDigits]));

      const clientIds = Array.from(new Set([client.clientId, client.id, client._id].filter(Boolean)));

      const { data: recipientLogs } = await supabaseAdmin
        .from('broadcast_recipient_logs')
        .select('message_id, status, created_at, updated_at')
        .in('client_id', clientIds)
        .in('phone', phoneVariants);

      const { data: leadCacheRecord } = await supabaseAdmin
        .from('leads_cache')
        .select('last_read_at, last_customer_message_at')
        .in('client_id', clientIds)
        .in('phone', phoneVariants)
        .maybeSingle();

      const lastReadAt = leadCacheRecord?.last_read_at ? new Date(leadCacheRecord.last_read_at).getTime() : 0;
      const lastCustomerMsgAt = leadCacheRecord?.last_customer_message_at ? new Date(leadCacheRecord.last_customer_message_at).getTime() : 0;

      if (Array.isArray(data.messages)) {
        data.messages = data.messages.map((m: any) => {
          if (m.sender === 'customer' || m.sender === 'user') {
            return { ...m, status: 'read', read: true };
          }

          const mTime = m.timestamp ? new Date(m.timestamp).getTime() : 0;
          let status: 'read' | 'delivered' | 'sent' | 'failed' = m.status || 'delivered';

          // Match exact recipient log row if present
          if (recipientLogs && recipientLogs.length > 0) {
            const logMatch = recipientLogs.find((l: any) => {
              if (!l.created_at) return false;
              const logTime = new Date(l.created_at).getTime();
              return Math.abs(logTime - mTime) < 120000;
            });
            if (logMatch?.status) {
              status = logMatch.status as any;
            }
          }

          if (status !== 'read' && ((lastReadAt > 0 && mTime <= lastReadAt) || (lastCustomerMsgAt > 0 && mTime <= lastCustomerMsgAt + 60000))) {
            status = 'read';
          }

          return {
            ...m,
            status,
            read: status === 'read'
          };
        });
      }

      chatMemoryCache.set(cacheKey, { data, timestamp: Date.now() });
      return NextResponse.json(data);
    } catch {
      return NextResponse.json({ error: 'Failed to retrieve conversation logs' }, { status: 500 });
    }
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

    chatMemoryCache.delete(`${client.clientId || client._id}:${phone}`);

    const body = await request.json();
    const serverIP = getClientServerIp(client);
    const { sshPrivateKey, serverUser } = client;
    if (!serverIP || !sshPrivateKey) {
      return NextResponse.json({ error: 'Server details missing' }, { status: 400 });
    }

    // If sending a direct WhatsApp chat message
    if (body.action === 'send_message') {
      const { text, mediaUrl, mediaType, filename } = body;
      
      const cleanText = text?.trim() || '';
      if (!cleanText && !mediaUrl) {
        return NextResponse.json({ error: 'Message text or media is required' }, { status: 400 });
      }

      // OUTBOUND SAFETY GUARD: Prevent AI control tokens and errors from reaching customers
      if (cleanText === '[IGNORE]' || cleanText === '[SILENCE]') {
        console.log('[AI Pipeline Guard] Suppressing AI control token response to', phone);
        return NextResponse.json({ success: true, suppressed: true, reason: 'AI control token' });
      }
      if (cleanText.includes('⚠️ No reply:') || cleanText.includes('the model returned empty content')) {
        console.error('[AI Pipeline Guard] Suppressing failed AI fallback response to', phone);
        return NextResponse.json({ success: true, suppressed: true, reason: 'AI provider error' });
      }

      try {
        let contentToLog = text || '';
        if (mediaUrl && mediaType) {
          contentToLog = formatMediaMessage(mediaType, mediaUrl, filename, text);
        }

        if (client.connectionType === 'cloud_api') {
          // Send via Meta WhatsApp Cloud API directly
          const phoneNumberId = client.whatsappPhoneNumberId;
          const accessToken = client.whatsappAccessToken;

          if (!phoneNumberId || !accessToken) {
            return NextResponse.json({ 
              error: 'Cloud API credentials not configured' 
            }, { status: 400 });
          }

          let metaPayload: any = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: phone,
          };

          if (mediaUrl && mediaType) {
            metaPayload.type = mediaType;
            if (mediaType === 'image') {
              metaPayload.image = { link: mediaUrl, caption: text || undefined };
            } else if (mediaType === 'audio') {
              metaPayload.audio = { link: mediaUrl };
            } else if (mediaType === 'video') {
              metaPayload.video = { link: mediaUrl, caption: text || undefined };
            } else if (mediaType === 'document') {
              metaPayload.document = { link: mediaUrl, filename: filename || 'Document', caption: text || undefined };
            }
          } else {
            metaPayload.type = 'text';
            metaPayload.text = { body: text.trim() };
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
          
          if (metaData.messages?.[0]?.id) {
            const cleanPhone = phone.replace(/\D/g, '');
            const e164Phone = cleanPhone;
            try {
              await supabaseAdmin
                .from('broadcast_recipient_logs')
                .insert({
                  client_id: client.clientId || client.id || client._id,
                  campaign_id: 'inbox_direct',
                  phone: e164Phone,
                  message_id: metaData.messages[0].id,
                  status: 'sent',
                  is_new_session: false,
                });
            } catch (err: any) {
              console.warn('[CRM Send] Recipient log insert error:', err.message);
            }
          }

          // Log sent message to state.db so it appears in CRM
          const profile = client.hermesProfile || '';
          const profilePrefix = profile ? `profiles/${profile}/` : '';
          const base64Msg = Buffer.from(contentToLog.trim()).toString('base64');
          const logMsgScript = `python3 -c '
import sys, sqlite3, json, os, time, base64
phone = sys.argv[1]
msg = base64.b64decode(sys.argv[2]).decode("utf-8")
sessions_file = os.path.expanduser("~/.hermes/${profilePrefix}sessions/sessions.json")

profile = "${profile}"
if profile:
    db_path = f"/home/ubuntu/.hermes/profiles/{profile}/state.db"
else:
    db_path = "/home/ubuntu/.hermes/state.db"

sid = None
if os.path.exists(sessions_file):
    try:
        with open(sessions_file) as f:
            sessions = json.load(f)
        def find_session_id(sessions, target_phone):
            target_clean = target_phone.replace("+", "").split(":")[0].split("@", 1)[0]
            for key, val in sessions.items():
                key_lower = key.lower()
                if "whatsapp" not in key_lower and "whatsapp_cloud" not in key_lower:
                    continue
                k_phone = key.split(":")[-1] if ":" in key else ""
                if k_phone == target_clean:
                    sid_val = val.get("session_id") if isinstance(val, dict) else val
                    if sid_val:
                        return sid_val
            return None
        sid = find_session_id(sessions, phone)
    except:
        pass
if not sid and os.path.exists(db_path):
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        phone_clean = phone.replace("+", "").split(":")[0].split("@", 1)[0]
        cursor.execute("""
            SELECT s.id, s.session_key
            FROM sessions s  
            WHERE (s.session_key LIKE ? OR s.session_key LIKE ?)
            ORDER BY s.id DESC
            LIMIT 1
        """, (
            f"%whatsapp_cloud%dm%{phone_clean}%",
            f"%whatsapp%dm%{phone_clean}%"
        ))
        row = cursor.fetchone()
        if row:
            sid = row[0]
        conn.close()
    except Exception as e:
        pass
if sid and os.path.exists(db_path):
    try:
        conn = sqlite3.connect(db_path)
        try:
            conn.execute("INSERT INTO messages (session_id, role, content, timestamp, observed, active) VALUES (?, ?, ?, ?, ?, ?)", (sid, "assistant", msg, time.time(), 1, 1))
        except Exception:
            try:
                conn.execute("INSERT INTO messages (session_id, role, content, timestamp) VALUES (?, ?, ?, ?)", (sid, "assistant", msg, time.time()))
            except Exception as e2:
                print("DB_INSERT_ERR:", e2)
        conn.commit()
        conn.close()
    except Exception as e:
        print("DB_LOG_ERR:", e)
' "${phone}" "${base64Msg}"`;
          await executeCommand(serverIP, sshPrivateKey, logMsgScript, serverUser || 'ubuntu');

          return NextResponse.json({ success: true, responseData: metaData });
        } else {
          // Baileys bridge
          let responseData;
          if (mediaUrl && mediaType) {
            const payloadStr = JSON.stringify({
              chatId: `${phone}@s.whatsapp.net`,
              mediaType: mediaType,
              caption: text || undefined
            });

            const sshCommand = `
              temp_file="/tmp/temp_media_${Date.now()}"
              cleanup() {
                rm -f "$temp_file"
              }
              trap cleanup EXIT
              curl -L -s -o "$temp_file" "${mediaUrl}"
              PAYLOAD_JSON=$(python3 -c "import json; d = json.loads('${payloadStr.replace(/'/g, "'\\''")}'); d['filePath'] = '$temp_file'; print(json.dumps(d))")
              curl -s -X POST http://127.0.0.1:3009/send-media -H "Content-Type: application/json" -d "$PAYLOAD_JSON"
            `;

            console.log(`Sending manual media message via bridge to ${phone}`);
            const res = await executeCommand(serverIP, sshPrivateKey, sshCommand, serverUser || 'ubuntu');
            if (res.exitCode !== 0) {
              throw new Error(res.stderr || 'SSH media curl execution failed');
            }
            responseData = JSON.parse(res.stdout);
          } else {
            const bridgeUrl = `http://127.0.0.1:3009/send`;
            const payload = {
              chatId: `${phone}@s.whatsapp.net`,
              message: text.trim(),
            };

            console.log(`Sending manual message via bridge to ${phone}`);
            const curlCommand = `curl -s -X POST ${bridgeUrl} -H "Content-Type: application/json" -d '${JSON.stringify(payload).replace(/'/g, "'\\''")}'`;
            const res = await executeCommand(serverIP, sshPrivateKey, curlCommand, serverUser || 'ubuntu');
            if (res.exitCode !== 0) {
              throw new Error(res.stderr || 'curl execution failed');
            }
            responseData = JSON.parse(res.stdout);
          }

          // Log the sent message directly to state.db database for persistence
          const profile = client.hermesProfile || '';
          const profilePrefix = profile ? `profiles/${profile}/` : '';
          const base64Msg = Buffer.from(contentToLog.trim()).toString('base64');
          const logMsgScript = `python3 -c '
import sys, sqlite3, json, os, time, base64
phone = sys.argv[1]
msg = base64.b64decode(sys.argv[2]).decode("utf-8")
sessions_file = os.path.expanduser("~/.hermes/${profilePrefix}sessions/sessions.json")

profile = "${profile}"
if profile:
    db_path = f"/home/ubuntu/.hermes/profiles/{profile}/state.db"
else:
    db_path = "/home/ubuntu/.hermes/state.db"

sid = None
if os.path.exists(sessions_file):
    try:
        with open(sessions_file) as f:
            sessions = json.load(f)
        def find_session_id(sessions, target_phone):
            target_clean = target_phone.replace("+", "").split(":")[0].split("@", 1)[0]
            for key, val in sessions.items():
                key_lower = key.lower()
                if "whatsapp" not in key_lower and "whatsapp_cloud" not in key_lower:
                    continue
                k_phone = key.split(":")[-1] if ":" in key else ""
                if k_phone == target_clean:
                    sid_val = val.get("session_id") if isinstance(val, dict) else val
                    if sid_val:
                        return sid_val
            return None
        sid = find_session_id(sessions, phone)
    except:
        pass
if not sid and os.path.exists(db_path):
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        phone_clean = phone.replace("+", "").split(":")[0].split("@", 1)[0]
        cursor.execute("""
            SELECT s.id, s.session_key
            FROM sessions s  
            WHERE (s.session_key LIKE ? OR s.session_key LIKE ?)
            ORDER BY s.id DESC
            LIMIT 1
        """, (
            f"%whatsapp_cloud%dm%{phone_clean}%",
            f"%whatsapp%dm%{phone_clean}%"
        ))
        row = cursor.fetchone()
        if row:
            sid = row[0]
        conn.close()
    except Exception as e:
        pass
if sid and os.path.exists(db_path):
    try:
        conn = sqlite3.connect(db_path)
        try:
            conn.execute("INSERT INTO messages (session_id, role, content, timestamp, observed, active) VALUES (?, ?, ?, ?, ?, ?)", (sid, "assistant", msg, time.time(), 1, 1))
        except Exception:
            try:
                conn.execute("INSERT INTO messages (session_id, role, content, timestamp) VALUES (?, ?, ?, ?)", (sid, "assistant", msg, time.time()))
            except Exception as e2:
                print("DB_INSERT_ERR:", e2)
        conn.commit()
        conn.close()
    except Exception as e:
        print("DB_LOG_ERR:", e)
' "${phone}" "${base64Msg}"`;
          await executeCommand(serverIP, sshPrivateKey, logMsgScript, serverUser || 'ubuntu');

          return NextResponse.json({ success: true, responseData });
        }
      } catch (err: any) {
        console.error('[CRM Send] Error:', err);
        return NextResponse.json({
          error: client.connectionType === 'cloud_api'
            ? 'Failed to send via WhatsApp Cloud API. Check your access token and phone number ID.'
            : 'Failed to deliver message. Make sure the WhatsApp agent bridge is active on port 3009.',
        }, { status: 502 });
      }
    }

    // Sync to Supabase cache first
    try {
      const newStatus = body.manual_status || body.status;
      if (newStatus) {
        const { data: currentLead } = await supabaseAdmin
          .from('leads_cache')
          .select('manual_status')
          .eq('phone', phone)
          .eq('client_id', client.clientId)
          .maybeSingle();

        if (currentLead && currentLead.manual_status !== newStatus) {
          const { data: clientData } = await supabaseAdmin
            .from('agent_clients')
            .select('crm_stage_templates, connection_type, whatsapp_phone_number_id, whatsapp_access_token')
            .eq('id', client.clientId)
            .maybeSingle();

          if (clientData) {
            const templates = clientData.crm_stage_templates || {};
            const configuredTemplate = templates[newStatus];

            if (configuredTemplate && configuredTemplate.trim()) {
              console.log(`[CRM Transition] Auto-sending template "${configuredTemplate}" to ${phone} for stage change: ${newStatus}`);
              if (clientData.connection_type === 'cloud_api' && clientData.whatsapp_phone_number_id && clientData.whatsapp_access_token) {
                fetch(
                  `https://graph.facebook.com/v20.0/${clientData.whatsapp_phone_number_id}/messages`,
                  {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${clientData.whatsapp_access_token}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      messaging_product: 'whatsapp',
                      recipient_type: 'individual',
                      to: phone,
                      type: 'template',
                      template: {
                        name: configuredTemplate.trim(),
                        language: { code: 'en' }
                      }
                    })
                  }
                ).then(async (res) => {
                  if (!res.ok) {
                    const errText = await res.text();
                    console.error('[CRM Transition] Meta template send failed:', errText);
                  }
                }).catch((e) => console.error('[CRM Transition] Error sending Meta template:', e.message));
              } else {
                const bridgeUrl = `http://127.0.0.1:3009/send`;
                const payload = {
                  chatId: `${phone}@s.whatsapp.net`,
                  message: `Hi! Just wanted to update your status to ${newStatus}. Let's connect!`,
                };
                const curlCommand = `curl -s -X POST ${bridgeUrl} -H "Content-Type: application/json" -d '${JSON.stringify(payload).replace(/'/g, "'\\''")}'`;
                executeCommand(serverIP, sshPrivateKey, curlCommand, serverUser || 'ubuntu')
                  .catch((e) => console.error('[CRM Transition] Baileys bridge message send failed:', e.message));
              }
            }
          }
        }
      }

      const updatePayload: Record<string, any> = {};
      if (body.name !== undefined) updatePayload.name = body.name;
      if (body.intent !== undefined) updatePayload.intent = body.intent;
      if (body.is_dnd !== undefined) updatePayload.is_dnd = body.is_dnd;
      if (body.is_converted !== undefined) updatePayload.is_converted = body.is_converted;
      if (body.notes !== undefined) updatePayload.notes = body.notes;
      if (body.follow_up_date !== undefined) updatePayload.follow_up_date = body.follow_up_date ? new Date(body.follow_up_date).toISOString() : null;
      if (body.follow_up_sent !== undefined) updatePayload.follow_up_sent = body.follow_up_sent;
      if (body.manual_status !== undefined) updatePayload.manual_status = body.manual_status;
      if (body.status !== undefined) updatePayload.manual_status = body.status; // backward compatibility

      if (Object.keys(updatePayload).length > 0) {
        updatePayload.updated_at = new Date().toISOString();
        const { error: dbError } = await supabaseAdmin
          .from('leads_cache')
          .update(updatePayload)
          .eq('phone', phone)
          .eq('client_id', client.clientId);

        if (dbError) {
          console.error('[PATCH Lead] Supabase Update Error:', dbError.message);
        } else {
          try {
            const { data: updatedLead } = await supabaseAdmin
              .from('leads_cache')
              .select('phone, name, intent, manual_status, category, notes, last_message_at')
              .eq('phone', phone)
              .eq('client_id', client.clientId)
              .maybeSingle();

            if (updatedLead) {
              const { data: clientObj } = await supabaseAdmin
                .from('agent_clients')
                .select('google_sheet_id')
                .eq('id', client.clientId)
                .single();

              if (clientObj?.google_sheet_id) {
                const accessToken = await getClientAccessToken(client.clientId);
                if (accessToken) {
                  updateSingleLeadInSheet(accessToken, clientObj.google_sheet_id, {
                    phone: updatedLead.phone,
                    name: updatedLead.name || '',
                    status: updatedLead.manual_status || updatedLead.intent || 'New',
                    category: updatedLead.category || '',
                    lastMessage: updatedLead.last_message_at ? new Date(updatedLead.last_message_at).toISOString() : '',
                    notes: updatedLead.notes || ''
                  }).catch((err: any) => console.error('[Sheets Sync] CRM->Sheet single row sync failed:', err.message));
                }
              }
            }
          } catch (sheetsErr: any) {
            console.error('[Sheets Sync] CRM->Sheet update error:', sheetsErr.message);
          }
        }
      }
    } catch (dbErr: any) {
      console.error('[PATCH Lead] Supabase Sync Catch Error:', dbErr.message);
    }

    // Otherwise, we are updating the lead's memory profile metadata in lead_memory.json
    const memoryFilePath = client.hermesProfile
      ? `/home/ubuntu/.hermes/profiles/${client.hermesProfile}/lead_memory.json`
      : '/home/ubuntu/.hermes/lead_memory.json';
    const currentMemoryText = await readFile(serverIP, sshPrivateKey, memoryFilePath, serverUser || 'ubuntu');

    let memories: Record<string, any> = {};
    if (currentMemoryText) {
      try {
        memories = JSON.parse(currentMemoryText.trim());
      } catch {
        memories = {};
      }
    }

    // Update specific lead record fields
    memories[phone] = {
      ...(memories[phone] || {}),
      name: body.name || memories[phone]?.name || phone,
      profession: body.profession || memories[phone]?.profession || 'Unknown',
      intent: body.intent || memories[phone]?.intent || 'warm',
      objections: body.objections || memories[phone]?.objections || 'None',
      summary: body.summary || memories[phone]?.summary || '',
      notes: body.notes || memories[phone]?.notes || '',
      status: body.status || memories[phone]?.status || 'Follow-up Needed',
    };

    const uploadSuccess = await uploadFile(
      serverIP,
      sshPrivateKey,
      JSON.stringify(memories, null, 2),
      memoryFilePath,
      serverUser || 'ubuntu'
    );

    if (!uploadSuccess) {
      return NextResponse.json({ error: 'Failed to save lead memories' }, { status: 500 });
    }

    return NextResponse.json({ success: true, memory: memories[phone] });
  } catch (error: any) {
    console.error('Conversation PATCH API Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
