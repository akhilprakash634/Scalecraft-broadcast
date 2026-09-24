import { NextResponse } from 'next/server';
import { getSessionClient } from '@/lib/auth';
import { executeCommand, uploadFile, readFile, resolveHermesContext } from '@/lib/ssh';
import { supabaseAdmin } from '@/lib/supabase';
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

export async function POST(request: Request) {
  try {
    const client = await getSessionClient();
    if (!client) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { phone } = await request.json();
    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    const { serverIP, sshPrivateKey, serverUser, geminiApiKey } = client;
    if (!serverIP || !sshPrivateKey) {
      return NextResponse.json({ error: 'Server details missing' }, { status: 400 });
    }

    if (!geminiApiKey) {
      return NextResponse.json({ error: 'Gemini API key is not configured' }, { status: 400 });
    }

    // 1. Fetch last 10 messages from remote conversation via SSH using the pre-uploaded get_chat script
    const remoteScriptPath = `/home/ubuntu/.hermes/get_chat_${client._id}.py`;
    const execCmd = `python3 ${remoteScriptPath} "${phone}"`;
    const execRes = await executeCommand(serverIP, sshPrivateKey, execCmd, serverUser || 'ubuntu');

    let messages: any[] = [];
    try {
      const parsedData = JSON.parse(execRes.stdout);
      if (parsedData && Array.isArray(parsedData.messages)) {
        // Map it to the format expected by the analyzer:
        messages = parsedData.messages.map((m: any) => ({
          role: m.sender === 'customer' ? 'user' : 'assistant',
          content: m.text || '',
          timestamp: m.timestamp || ''
        }));
      }
    } catch {
      return NextResponse.json({ error: 'Failed to retrieve conversation logs from remote server' }, { status: 500 });
    }

    // Prune conversation history to keep context under 2500 characters
    let combined_len = 0;
    const pruned_messages = [];
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      const roleName = msg.role === 'assistant' ? 'Mia' : 'Customer';
      const msg_str = `${roleName}: ${msg.content}\n`;
      if (combined_len + msg_str.length > 2500) {
        break;
      }
      combined_len += msg_str.length;
      pruned_messages.unshift(msg);
    }
    messages = pruned_messages;

    if (messages.length === 0) {
      return NextResponse.json({ error: 'No conversation history found to analyze' }, { status: 400 });
    }

    // Generate hash of latest message to detect changes
    const latestMessage = messages[messages.length - 1];
    const messageHash = createHash('md5')
      .update(`${latestMessage?.content || ''}_${latestMessage?.timestamp || ''}`)
      .digest('hex');

    // Fetch existing details from database to check cache and names
    let existingLead: any = null;
    try {
      const { data } = await supabaseAdmin
        .from('leads_cache')
        .select('name, intent, summary, last_analyzed_message_hash, requirements, is_converted, is_dnd')
        .eq('phone', phone)
        .maybeSingle();
      existingLead = data;
    } catch (dbErr: any) {
      console.error('[Analyze Lead] Failed to query existing lead details:', dbErr.message);
    }

    if (existingLead?.last_analyzed_message_hash === messageHash) {
      return NextResponse.json({
        success: true,
        cached: true,
        analysis: {
          name: existingLead.name,
          wants: existingLead.requirements?.serviceRequired || '',
          budget: existingLead.requirements?.budget || '',
          objection: existingLead.requirements?.objection || '',
          intent: existingLead.intent,
          nextAction: existingLead.requirements?.nextAction || '',
          summary: existingLead.summary
        }
      });
    }

    // 1.5 Load products catalog list from VPS
    const ctx = resolveHermesContext(client);
    let productNames: string[] = [];
    try {
      const productsContent = await readFile(
        serverIP,
        sshPrivateKey,
        `${ctx.profileRoot}/products.json`,
        serverUser || 'ubuntu'
      );
      if (productsContent) {
        const productsData = JSON.parse(productsContent);
        if (Array.isArray(productsData)) {
          productNames = productsData.map((p: any) => p.name).filter(Boolean);
        }
      }
    } catch (err: any) {
      console.warn('[Analyze Lead] Failed to read products from VPS:', err.message);
    }

    // 2. Format conversation for Gemini prompt
    const conversationStr = messages
      .map((m) => `${m.role === 'assistant' ? 'Agent' : 'Customer'}: ${m.content}`)
      .join('\n');

    const systemInstruction = `You are an AI sales assistant. Analyze the provided sales conversation and extract customer details.
Specifically:
- Extract 'name': The customer's name (if known, else fallback to their phone number).
- Extract 'wants': A brief string summarizing what product or service the customer wants or is asking about.
- Extract 'budget': Any budget or price range mentioned by the customer.
- Extract 'objection': Any objections (e.g. price too high, need to check with boss/partner, timing).
- Extract 'intent': One of ["hot", "warm", "cold", "follow_up", "converted", "spam", "not_interested"].
- Extract 'nextAction': Next immediate step for the sales representative.
- Extract 'productsDiscussed': An array of product names mentioned in the conversation. Cross-reference them against the product catalog list if provided: ${JSON.stringify(productNames)}. Only include products that were actually discussed.
- Extract 'summary': Write a concise 1 to 2 sentence summary of the latest state of the relationship. It MUST explicitly name any specific products discussed, specific questions or objections raised (like pricing comparison or trial requests), and the current intent. Do NOT write generic one-liners like 'Asked about pricing' or 'General sales inquiry'.
  - Example summary: 'Asked about pricing for the AI Lead Finder System, compared it against the AI Systems Combo bundle, expressed interest in the 5-day trial'`;
    const userPrompt = `Conversation:\n${conversationStr}`;

    const schema = {
      type: "OBJECT",
      properties: {
        name: { type: "STRING" },
        wants: { type: "STRING" },
        budget: { type: "STRING" },
        objection: { type: "STRING" },
        intent: { 
          type: "STRING", 
          enum: ["hot", "warm", "cold", "follow_up", 
                 "converted", "spam", "not_interested"] 
        },
        nextAction: { type: "STRING" },
        summary: { type: "STRING" },
        language: { type: "STRING" },
        productsDiscussed: { 
          type: "ARRAY",
          items: { type: "STRING" }
        }
      },
      required: ["name", "wants", "intent", "summary"]
    };

    // 3. Request analysis from Gemini 2.5 Flash
    const headers = {
      'Content-Type': 'application/json',
      'x-goog-api-key': geminiApiKey
    };
    const body = JSON.stringify({
      contents: [{ parts: [{ text: userPrompt }] }],
      systemInstruction: { parts: [{ text: systemInstruction }] },
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema,
        maxOutputTokens: 350,
        temperature: 0.2,
      },
    });

    let geminiRes: Response;
    try {
      geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent`,
        { method: 'POST', headers, body }
      );
      if (!geminiRes.ok) {
        geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`,
          { method: 'POST', headers, body }
        );
      }
    } catch (err) {
      geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`,
        { method: 'POST', headers, body }
      );
    }

    if (!geminiRes.ok) {
      throw new Error(`Gemini API returned status ${geminiRes.status}`);
    }

    const geminiData = await geminiRes.json();
    const generatedJsonText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '{}';
    
    let analysis: any = {};
    try {
      analysis = JSON.parse(generatedJsonText);
    } catch {
      return NextResponse.json({ error: 'Failed to parse Gemini analysis output' }, { status: 500 });
    }

    // 4. Save analysis to remote lead_memory.json on server
    const memoryFilePath = '/home/ubuntu/.hermes/lead_memory.json';
    const getMemoryPython = `
import json, os
memory_file = "${memoryFilePath}"
phone = "${phone}"
new_analysis = ${JSON.stringify(analysis)}

memories = {}
if os.path.exists(memory_file):
    try:
        with open(memory_file) as f:
            memories = json.load(f)
    except Exception:
        pass

mem = memories.get(phone, {})
mem['name'] = new_analysis.get('name', mem.get('name', phone))
mem['intent'] = new_analysis.get('intent', mem.get('intent', 'warm'))
mem['summary'] = new_analysis.get('summary', mem.get('summary', ''))
mem['objections'] = new_analysis.get('objection', mem.get('objections', 'None'))
mem['nextAction'] = new_analysis.get('nextAction', mem.get('nextAction', ''))
mem['analyzedAt'] = "${new Date().toISOString()}"

memories[phone] = mem
with open(memory_file, 'w') as f:
    json.dump(memories, f, indent=2)
    `;

    const tmpSaveScriptPath = `/home/ubuntu/save_memory_${phone}.py`;
    await uploadFile(serverIP, sshPrivateKey, getMemoryPython, tmpSaveScriptPath, serverUser || 'ubuntu');
    await executeCommand(serverIP, sshPrivateKey, `python3 ${tmpSaveScriptPath}`, serverUser || 'ubuntu');
    await executeCommand(serverIP, sshPrivateKey, `rm ${tmpSaveScriptPath}`, serverUser || 'ubuntu');

    // 5. Cache inside Supabase
    try {
      const finalName = (existingLead?.name && /[a-zA-Z]/.test(existingLead.name))
        ? existingLead.name
        : (analysis.name || phone);

      const category = CATEGORY_MAP[((client as any).businessType || '').toLowerCase()] || 'local_services';
      const computedScore = calculateIntentScore(messages, category);

      await supabaseAdmin
        .from('leads_cache')
        .upsert({
          phone,
          client_id: client.clientId,
          name: finalName,
          intent: analysis.intent || 'warm',
          is_converted: existingLead?.is_converted ?? false,
          is_dnd: existingLead?.is_dnd ?? false,
          requirements: {
            tableBooking: analysis.intent === 'hot' && (analysis.wants?.toLowerCase().includes('table') || false),
            partySize: 0,
            bookingTime: '',
            contactPhone: phone,
            specialRequests: '',
            serviceRequired: analysis.wants || '',
            appointmentDate: '',
            propertyType: '',
            budget: analysis.budget || '',
            location: '',
            productInterest: [analysis.wants || ''],
            priceDiscussed: analysis.budget || '',
            objection: analysis.objection || '',
            nextAction: analysis.nextAction || ''
          },
          summary: analysis.summary || '',
          next_action: analysis.nextAction || '',
          intent_score: computedScore,
          last_analyzed_at: new Date().toISOString(),
          last_analyzed_message_hash: messageHash,
          analyzed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'client_id,phone' });
    } catch (dbErr: any) {
      console.error('[Analyze Lead] Failed to cache in Supabase:', dbErr.message);
    }

    return NextResponse.json({ success: true, analysis });
  } catch (error: any) {
    console.error('Analyze Lead API Error:', error.message);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
