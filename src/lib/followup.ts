import { executeCommand, getClientServerIp } from './ssh';
import { AgentClient } from './agents';
import { pruneConversationHistory } from './tokenUtils';

/**
 * Generate a personalized follow-up message using Gemini API
 */
export async function generateFollowUpMessage(
  client: AgentClient,
  lead: any
): Promise<string> {
  const context = lead.summary || lead.conversation_summary || 'General sales enquiry';
  const leadName = lead.name || lead.shared_name || 'there';
  const products = Array.isArray(lead.products_mentioned) ? lead.products_mentioned : [];
  const signals = Array.isArray(lead.buying_signals) ? lead.buying_signals : [];

  // 1. Fetch recent conversation history via SSH get_chat.py
  let chatHistory = '';
  try {
    const serverIP = getClientServerIp(client);
    if (serverIP && client.sshPrivateKey) {
      const remoteScriptPath = `/home/ubuntu/.hermes/get_chat_${client.id || client._id}.py`;
      const execCmd = `python3 ${remoteScriptPath} "${lead.phone}"`;
      const result = await executeCommand(
        serverIP,
        client.sshPrivateKey,
        execCmd,
        client.serverUser || 'ubuntu'
      );
      if (result.exitCode === 0) {
        const data = JSON.parse(result.stdout);
        if (data && Array.isArray(data.messages)) {
          // Prune conversation history to keep context concise but highly specific under token limits
          const mappedMsgs = data.messages.map((m: any) => ({
            role: m.sender === 'agent' ? 'assistant' : 'user',
            content: m.text || ''
          }));
          chatHistory = pruneConversationHistory(mappedMsgs, 2500);
        }
      }
    }
  } catch (err: any) {
    console.error(`[AI Follow-up] Failed to retrieve chat history for phone ${lead.phone}:`, err.message);
  }

  const systemInstruction = `You are Mia, AI sales assistant for ${client.businessName}.

Write ONE short, complete, natural follow-up WhatsApp message to ${leadName}:
- Exactly 1 to 2 complete sentences, strictly under 180 characters.
- Must reference their specific topic or product interest: ${products.length > 0 ? products.join(', ') : 'their recent inquiry'}.
- End with a soft open question (e.g. "Do you have any questions?", "Would you like me to send over the details?").
- Match their language (${lead.language || 'English'}).
- Never say "following up", "checking in", "haven't heard from you", or "went silent".

CRITICAL: Return ONLY the complete message text. Do not cut off mid-sentence. Do not wrap in quotes.`;

  const userPrompt = `Recent chat history between Customer and AI Assistant:
${chatHistory || 'No recent messages recorded.'}

Lead details:
- Name: ${leadName}
- Products discussed: ${JSON.stringify(products)}
- Buying signals: ${JSON.stringify(signals)}
- Summary: ${context}`;

  const apiKey = client.geminiApiKey || process.env.GOOGLE_API_KEY || '';
  if (!apiKey) {
    throw new Error('Gemini API key is not configured.');
  }

  const model = 'gemini-2.5-flash';
  const headers = {
    'x-goog-api-key': apiKey,
    'Content-Type': 'application/json'
  };
  const body = JSON.stringify({
    contents: [{ parts: [{ text: userPrompt }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: {
      maxOutputTokens: 350,
      temperature: 0.7
    }
  });

  let response: Response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent`,
      { method: 'POST', headers, body }
    );
    if (!response.ok) {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        { method: 'POST', headers, body }
      );
    }
  } catch (err) {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      { method: 'POST', headers, body }
    );
  }

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API call failed with status ${response.status}: ${errText}`);
  }

  const data = await response.json();
  let text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

  if (text) {
    // Strip leading/trailing double or single quotes if Gemini output wrapped them
    text = text.replace(/^["']|["']$/g, '').trim();
  }

  const prodStr = products.length > 0 ? ` for ${products[0]}` : '';
  return text || `Hi ${leadName}! 😊 Just checking if you had any questions about our services${prodStr}? Happy to help anytime!`;
}

/**
 * Send the generated message via WhatsApp bridge API or Meta Cloud API
 */
export async function sendViaWhatsAppBridge(
  clientOrIp: AgentClient | string,
  sshKeyOrPhone: string,
  phoneOrMessage: string,
  messageOrUser?: string,
  username = 'ubuntu',
  lead?: any
): Promise<boolean> {
  let client: AgentClient | null = null;
  let serverIP = '';
  let sshPrivateKey = '';
  let phone = '';
  let message = '';
  let leadObj: any = lead;

  if (typeof clientOrIp === 'object' && clientOrIp !== null) {
    client = clientOrIp;
    serverIP = getClientServerIp(client);
    sshPrivateKey = client.sshPrivateKey;
    phone = sshKeyOrPhone;
    message = phoneOrMessage;
    leadObj = messageOrUser || lead;
  } else {
    serverIP = clientOrIp as string;
    sshPrivateKey = sshKeyOrPhone;
    phone = phoneOrMessage;
    message = messageOrUser || '';
  }

  const cleanPhone = phone.replace(/\D/g, '');

  // OUTBOUND SAFETY GUARD: Prevent AI control tokens and errors from reaching customers
  const cleanText = message?.trim() || '';
  if (!cleanText) {
    console.error("[Outbound Guard] Suppressing empty message to", cleanPhone);
    return true; // Return true so caller thinks it succeeded and doesn't retry
  }
  if (cleanText === "[IGNORE]" || cleanText === "[SILENCE]") {
    console.log("[Outbound Guard] Suppressing AI control token response to", cleanPhone);
    return true;
  }
  if (cleanText.includes("⚠️ No reply") || cleanText.includes("empty content after retries")) {
    console.error("[Outbound Guard] Suppressing failed AI fallback response to", cleanPhone);
    return true;
  }

  // 1. Cloud API path
  if (client && client.connectionType === 'cloud_api') {
    if (!client.whatsappPhoneNumberId || !client.whatsappAccessToken) {
      throw new Error('Cloud API details (Phone Number ID or Access Token) missing for client.');
    }

    const lastCustMsg = leadObj?.last_customer_message_at ? new Date(leadObj.last_customer_message_at).getTime() : 0;
    const isWithin24h = lastCustMsg > 0 && (Date.now() - lastCustMsg) < 24 * 60 * 60 * 1000;

    if (isWithin24h) {
      // Send free-form text inside 24h window
      const res = await fetch(`https://graph.facebook.com/v20.0/${client.whatsappPhoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${client.whatsappAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanPhone,
          type: 'text',
          text: { body: message.trim() },
        }),
      });

      const resData = await res.json();
      if (!res.ok || resData.error) {
        throw new Error(`Cloud API free-form send failed: ${resData.error?.message || res.statusText}`);
      }
      return true;
    } else {
      // Outside 24h window — send approved template message
      const templateName = (client as any).followupTemplateName || 'followup_personalized';
      const templateLang = (client as any).followupTemplateLanguage || 'en';

      const res = await fetch(`https://graph.facebook.com/v20.0/${client.whatsappPhoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${client.whatsappAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: cleanPhone,
          type: 'template',
          template: {
            name: templateName,
            language: { code: templateLang },
            components: [
              {
                type: 'body',
                parameters: [{ type: 'text', text: message.trim() }],
              },
            ],
          },
        }),
      });

      const resData = await res.json();
      if (!res.ok || resData.error) {
        throw new Error(`Cloud API template send failed (${templateName}): ${resData.error?.message || 'Outside 24h window - approved template required.'}`);
      }
      return true;
    }
  }

  // 2. Baileys bridge path (over SSH)
  const bridgeUrl = `http://127.0.0.1:3009/send`;
  const payload = {
    chatId: `${phone}@s.whatsapp.net`,
    message: message.trim(),
  };

  const payloadJson = JSON.stringify(payload);
  const base64Payload = Buffer.from(payloadJson).toString('base64');

  const tempFile = `/tmp/wa_payload_${phone}_${Date.now()}.json`;
  const curlCommand = `echo "${base64Payload}" | base64 -d > ${tempFile} && curl -s -X POST ${bridgeUrl} -H "Content-Type: application/json" -d @${tempFile} && rm -f ${tempFile}`;

  const res = await executeCommand(serverIP, sshPrivateKey, curlCommand, username);
  if (res.exitCode !== 0) {
    throw new Error(`WhatsApp bridge failed (exitCode=${res.exitCode}): ${res.stderr || 'unknown error'}`);
  }
  return true;
}

/**
 * Log the sent follow-up message in the remote SQLite database so the VPS AI agent remains context-aware
 */
export async function logFollowUpToStateDb(
  client: AgentClient,
  sshPrivateKey: string,
  phone: string,
  message: string,
  username = 'ubuntu'
): Promise<boolean> {
  const serverIP = getClientServerIp(client);
  const profile = client.hermesProfile || '';
  const profilePrefix = profile ? `profiles/${profile}/` : '';
  const base64Msg = Buffer.from(message).toString('base64');
  const logMsgScript = `python3 -c '
import sys, sqlite3, json, os, time, base64
phone = sys.argv[1]
msg = base64.b64decode(sys.argv[2]).decode("utf-8")
sessions_file = os.path.expanduser("~/.hermes/${profilePrefix}sessions/sessions.json")
db_path = os.path.expanduser("~/.hermes/${profilePrefix}state.db")
sid = None

def find_session_id(sessions, target_phone):
    target_clean = target_phone.replace("+", "").split(":")[0].split("@", 1)[0]
    for key, val in sessions.items():
        if "whatsapp" not in key.lower():
            continue
    k_phone = key.split(":")[-1] if ":" in key else ""
    if k_phone == target_clean:
        sid_val = val.get("session_id") if isinstance(val, dict) else val
        if sid_val:
            return sid_val
    session_dir = os.path.expanduser("${profile ? `~/.hermes/profiles/${profile}/platforms/whatsapp/session` : '~/.hermes/whatsapp/session'}")
    mapped_clean = None
    for suffix in ("", "_reverse"):
        mapping_path = os.path.join(session_dir, f"lid-mapping-{target_clean}{suffix}.json")
        if os.path.exists(mapping_path):
            try:
                with open(mapping_path) as mf:
                    mapped = json.load(mf)
                    mapped_clean = mapped.replace("+", "").split(":")[0].split("@", 1)[0]
                    break
            except:
                pass
    if mapped_clean:
        for key, val in sessions.items():
            if "whatsapp" not in key.lower():
                continue
            k_phone = key.split(":")[-1] if ":" in key else ""
            if k_phone == mapped_clean:
                sid_val = val.get("session_id") if isinstance(val, dict) else val
                if sid_val:
                    return sid_val
    for key, val in sessions.items():
        if "whatsapp" not in key.lower():
            continue
        if isinstance(val, dict) and "origin" in val:
            origin = val["origin"]
            chat_id = origin.get("chat_id", "")
            user_id = origin.get("user_id", "")
            chat_clean = chat_id.replace("+", "").split(":")[0].split("@", 1)[0]
            user_clean = user_id.replace("+", "").split(":")[0].split("@", 1)[0]
            if target_clean in [chat_clean, user_clean] or (mapped_clean and mapped_clean in [chat_clean, user_clean]):
                sid_val = val.get("session_id")
                if sid_val:
                    return sid_val
    return None

if os.path.exists(sessions_file):
    try:
        with open(sessions_file) as f:
            sessions = json.load(f)
        sid = find_session_id(sessions, phone)
    except:
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

  const res = await executeCommand(serverIP, sshPrivateKey, logMsgScript, username);
  return res.exitCode === 0;
}

/**
 * Send the generated message via WhatsApp bridge API or Cloud API, and log to state.db
 */
export async function sendAndLogFollowUp(
  client: AgentClient,
  sshPrivateKey: string,
  phone: string,
  message: string,
  username = 'ubuntu',
  lead?: any
): Promise<boolean> {
  // 1. Send via sendViaWhatsAppBridge (handles Cloud API vs Baileys bridge)
  await sendViaWhatsAppBridge(client, phone, message, lead);

  // 2. Log to state.db via SSH if VPS credentials exist
  const serverIP = getClientServerIp(client);
  const profile = client.hermesProfile || '';
  const profilePrefix = profile ? `profiles/${profile}/` : '';
  if (!serverIP || !sshPrivateKey) {
    return true;
  }

  const base64Msg = Buffer.from(message).toString('base64');
  const logMsgScript = `python3 -c '
import sys, sqlite3, json, os, time, base64
phone = sys.argv[1]
msg = base64.b64decode(sys.argv[2]).decode("utf-8")
sessions_file = os.path.expanduser("~/.hermes/${profilePrefix}sessions/sessions.json")
db_path = os.path.expanduser("~/.hermes/${profilePrefix}state.db")
sid = None

def find_session_id(sessions, target_phone):
    target_clean = target_phone.replace("+", "").split(":")[0].split("@", 1)[0]
    for key, val in sessions.items():
        if "whatsapp" not in key.lower():
            continue
        k_phone = key.split(":")[-1] if ":" in key else ""
        if k_phone == target_clean:
            sid_val = val.get("session_id") if isinstance(val, dict) else val
            if sid_val:
                return sid_val
    session_dir = os.path.expanduser("${profile ? `~/.hermes/profiles/${profile}/platforms/whatsapp/session` : '~/.hermes/whatsapp/session'}")
    mapped_clean = None
    for suffix in ("", "_reverse"):
        mapping_path = os.path.join(session_dir, f"lid-mapping-{target_clean}{suffix}.json")
        if os.path.exists(mapping_path):
            try:
                with open(mapping_path) as mf:
                    mapped = json.load(mf)
                    mapped_clean = mapped.replace("+", "").split(":")[0].split("@", 1)[0]
                    break
            except:
                pass
    if mapped_clean:
        for key, val in sessions.items():
            if "whatsapp" not in key.lower():
                continue
            k_phone = key.split(":")[-1] if ":" in key else ""
            if k_phone == mapped_clean:
                sid_val = val.get("session_id") if isinstance(val, dict) else val
                if sid_val:
                    return sid_val
    for key, val in sessions.items():
        if "whatsapp" not in key.lower():
            continue
        if isinstance(val, dict) and "origin" in val:
            origin = val["origin"]
            chat_id = origin.get("chat_id", "")
            user_id = origin.get("user_id", "")
            chat_clean = chat_id.replace("+", "").split(":")[0].split("@", 1)[0]
            user_clean = user_id.replace("+", "").split(":")[0].split("@", 1)[0]
            if target_clean in [chat_clean, user_clean] or (mapped_clean and mapped_clean in [chat_clean, user_clean]):
                sid_val = val.get("session_id")
                if sid_val:
                    return sid_val
    return None

if os.path.exists(sessions_file):
    try:
        with open(sessions_file) as f:
            sessions = json.load(f)
        sid = find_session_id(sessions, phone)
    except:
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

  const res = await executeCommand(serverIP, sshPrivateKey, logMsgScript, username);
  return res.exitCode === 0;
}

