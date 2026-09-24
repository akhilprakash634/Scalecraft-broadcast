import { NextResponse } from 'next/server';
import { getSessionClient } from '@/lib/auth';
import { executeCommand, uploadFile } from '@/lib/ssh';
import { pruneConversationHistory } from '@/lib/tokenUtils';

export async function POST(request: Request) {
  try {
    const client = await getSessionClient();
    if (!client) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { leads } = await request.json();
    if (!Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json({ error: 'Leads list is required and cannot be empty' }, { status: 400 });
    }

    const { serverIP, sshPrivateKey, serverUser, geminiApiKey, businessName } = client;
    if (!serverIP || !sshPrivateKey) {
      return NextResponse.json({ error: 'Server details missing' }, { status: 400 });
    }

    const apiKey = geminiApiKey || '';
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key is not configured for your account. Please save it first.' }, { status: 400 });
    }

    // 1. Extract last 5 messages for all these phone numbers in a single remote Python run
    const phones = leads.map(l => l.phone);
    const extractPython = `
import json, os
phones = ${JSON.stringify(phones)}
sessions_file = os.path.expanduser('~/.hermes/sessions/sessions.json')
sessions_dir = os.path.expanduser('~/.hermes/sessions')

phone_to_session = {}
if os.path.exists(sessions_file):
    try:
        with open(sessions_file) as f:
            sessions = json.load(f)
        for key, val in sessions.items():
            if "whatsapp" in key:
                p = key.split(':')[-1]
                sid = val.get('session_id') if isinstance(val, dict) else val
                if sid and p in phones:
                    phone_to_session[p] = f"{sid}.jsonl"
    except:
        pass

if not phone_to_session and os.path.exists(sessions_dir):
    try:
        for fn in os.listdir(sessions_dir):
            if fn.endswith('.jsonl'):
                ph = fn[:-6]
                if ph in phones:
                    phone_to_session[ph] = fn
    except:
        pass

results = {}
for p in phones:
    results[p] = []
    session_file = phone_to_session.get(p)
    if not session_file:
        continue
    jsonl_path = os.path.join(sessions_dir, session_file)
    if os.path.exists(jsonl_path):
        msgs = []
        try:
            with open(jsonl_path, 'rb') as jf:
                for line in jf:
                    try:
                        data = json.loads(line.decode('utf-8'))
                        role = data.get('role', '')
                        sender = data.get('sender', '')
                        if role in ['session_meta', 'tool', 'system']:
                            continue
                        is_bot = role in ['assistant', 'agent'] or data.get('isBot', False) or 'agent' in sender
                        
                        text = data.get('content') or data.get('message', {}).get('text') or data.get('text')
                        if isinstance(text, list):
                            text_parts = []
                            for part in text:
                                if isinstance(part, dict):
                                    text_parts.append(part.get('text') or part.get('content') or '')
                                elif isinstance(part, str):
                                    text_parts.append(part)
                            text = " ".join(filter(None, text_parts))
                        elif isinstance(text, dict):
                            text = text.get('text') or text.get('content') or ''
                        elif not isinstance(text, str):
                            text = str(text) if text is not None else ''
                            
                        if not text and 'message' in data and isinstance(data['message'], str):
                            text = data['message']
                            
                        msgs.append({
                            "sender": "agent" if is_bot else "customer",
                            "text": text or '',
                            "timestamp": data.get('timestamp', '')
                        })
                    except:
                        pass
            # Prune conversation history to keep context under 2500 characters
            combined_len = 0
            pruned_msgs = []
            for msg in reversed(msgs):
                msg_str = f"{msg.get('sender')}: {msg.get('text', '')}\n"
                if combined_len + len(msg_str) > 2500:
                    break
                combined_len += len(msg_str)
                pruned_msgs.insert(0, msg)
            results[p] = pruned_msgs
        except:
            pass

print(json.dumps(results))
`;

    const tmpScriptPath = `/home/ubuntu/extract_last_messages.py`;
    const uploadSuccess = await uploadFile(serverIP, sshPrivateKey, extractPython, tmpScriptPath, serverUser || 'ubuntu');
    if (!uploadSuccess) {
      return NextResponse.json({ error: 'Failed to access remote server to fetch history' }, { status: 500 });
    }

    const execRes = await executeCommand(serverIP, sshPrivateKey, `python3 ${tmpScriptPath}`, serverUser || 'ubuntu');
    await executeCommand(serverIP, sshPrivateKey, `rm -f ${tmpScriptPath}`, serverUser || 'ubuntu');

    if (execRes.exitCode !== 0) {
      console.error('Remote history extraction failed:', execRes.stderr || execRes.stdout);
      return NextResponse.json({ error: 'Failed to fetch conversation history from VPS' }, { status: 500 });
    }

    let histories: Record<string, any[]> = {};
    try {
      histories = JSON.parse(execRes.stdout);
    } catch {
      return NextResponse.json({ error: 'Failed to parse chat history from server' }, { status: 500 });
    }

    // 2. Call Gemini for each lead in parallel

    const bName = businessName || 'our business';

    const generatePromises = leads.map(async (lead) => {
      const chat = histories[lead.phone] || [];
      const chatStr = pruneConversationHistory(
        chat.map(m => ({
          role: m.sender === 'agent' ? 'assistant' : 'user',
          content: m.text || ''
        })),
        2500
      );

      const systemInstruction = `You are a friendly sales assistant for ${bName}.
Write a SHORT follow-up WhatsApp message (max 2 sentences):
- Reference their specific interest naturally
- Sound human and warm, not salesy
- Write in ${lead.language || 'english'}
- End with a soft question or CTA
- If Malayalam: write in Malayalam script
- Return ONLY the message, nothing else`;
      
      const userPrompt = `Customer conversation:
${chatStr || 'No recent messages.'}

Profile:
- Intent: ${lead.intent || 'warm'}
- Products interested: ${JSON.stringify(lead.products_mentioned || [])}
- Buying signals: ${JSON.stringify(lead.buying_signals || [])}
- Days since last chat: ${lead.days_since_last || 0}
- Language: ${lead.language || 'english'}`;

      try {
        const headers = {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        };
        const body = JSON.stringify({
          contents: [{ parts: [{ text: userPrompt }] }],
          systemInstruction: { parts: [{ text: systemInstruction }] },
          generationConfig: {
            maxOutputTokens: 150,
            temperature: 0.7,
          },
        });

        let res: Response;
        try {
          res = await fetch(
            `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent`,
            { method: 'POST', headers, body }
          );
          if (!res.ok) {
            res = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`,
              { method: 'POST', headers, body }
            );
          }
        } catch (err) {
          res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`,
            { method: 'POST', headers, body }
          );
        }

        if (!res.ok) {
          throw new Error(`Gemini status ${res.status}`);
        }

        const data = await res.json();
        const msg = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
        return {
          phone: lead.phone,
          message: msg,
          success: true,
        };
      } catch (err: any) {
        console.error(`Gemini failed for lead ${lead.phone}:`, err.message);
        return {
          phone: lead.phone,
          message: `Hi! Just wanted to follow up on your enquiry about our services. Let me know if you have any questions!`,
          success: false,
        };
      }
    });

    const results = await Promise.all(generatePromises);
    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error('Leads generate-followup API Error:', error.message);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
