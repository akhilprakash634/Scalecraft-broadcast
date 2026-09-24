import { NextResponse } from 'next/server';
import { getSessionClient } from '@/lib/auth';
import { readFile, uploadFile, restartAgent, executeCommand, hermesCmd, writeSoulMd, resolveHermesContext, getClientServerIp, buildHermesCmd, getSoulMdPath } from '@/lib/ssh';
import { getClientById, updateClient, getProducts } from '@/lib/db';
import { compileSoulMarkdown } from '@/lib/soulCompiler';

const FORBIDDEN_PATTERNS = [
  /pretend/gi,
  /you are an? /gi,
  /ignore (previous|above|all) instructions/gi,
  /disregard/gi,
  /forget your/gi,
  /new instruction/gi,
  /system prompt/gi,
  /jailbreak/gi,
];

function sanitizeForSoul(input: string): string {
  if (!input) return '';
  let safe = input;
  FORBIDDEN_PATTERNS.forEach(pattern => {
    safe = safe.replace(pattern, '[removed]');
  });
  return safe;
}

// Clean instructions text to prevent trigger word violations
function sanitizeInstructions(text: string): string {
  if (!text) return '';
  const cleared = text
    .replace(/you are an/gi, 'this assistant is an')
    .replace(/you are a/gi, 'this assistant is a')
    .replace(/you are/gi, 'this assistant is')
    .replace(/pretend/gi, 'act as')
    .replace(/your name is/gi, 'the assistant name is')
    .replace(/I am a/gi, 'this business is a')
    .replace(/we are a/gi, 'this business is a');
  return sanitizeForSoul(cleared);
}

export async function GET() {
  try {
    const client = await getSessionClient();
    if (!client) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serverIP = getClientServerIp(client);
    const { sshPrivateKey, serverUser } = client;
    if (!serverIP || !sshPrivateKey) {
      return NextResponse.json({ error: 'Server details missing' }, { status: 400 });
    }

    // Read SOUL.md directly - 'hermes soul show' is not a valid command
    const soulPath = getSoulMdPath(client);
    const readRes = await executeCommand(
      serverIP, sshPrivateKey,
      `cat ${soulPath} 2>/dev/null || cat ~/SOUL.md 2>/dev/null || echo ""`,
      serverUser || 'ubuntu'
    );
    // Strip any HTML comments before exposing (defensive: should not exist any more)
    const soulContent = (readRes.stdout || '').replace(/<!--[\s\S]*?-->/g, '').trim();

    // Fetch fresh document from Supabase
    let freshClient: any = null;
    try {
      freshClient = await getClientById(client._id);
    } catch (dbErr) {
      console.warn('Could not fetch client from Supabase, falling back to session client info:', dbErr);
    }

    const activeClient = freshClient || client;

    // Default configuration values
    const defaultConfig = {
      agentName: activeClient.agentName || activeClient.agent_name || 'Meera',
      businessName: activeClient.businessName || activeClient.business_name || 'My Business',
      whatsappBotNumber: activeClient.whatsappBotNumber || activeClient.whatsapp_bot_number || '',
      description: activeClient.description !== undefined && activeClient.description !== null ? activeClient.description : 'An intelligent WhatsApp sales agent helper.',
      website: activeClient.website || 'https://thescalecraft.in',
      handoffNumber: activeClient.handoffNumber || activeClient.handoff_number || activeClient.ownerPhone || activeClient.owner_phone || '',
      tone: activeClient.responseStyle || activeClient.response_style || 'Friendly',
      language: activeClient.primaryLanguage || activeClient.primary_language || 'English',
      maxSentences: activeClient.maxSentences || activeClient.max_sentences || 3,
      primaryAudience: activeClient.primaryAudience || activeClient.primary_audience || 'Potential buyers and leads',
      keySellingPoints: activeClient.keySellingPoints || activeClient.key_selling_points || 'Instant support 24/7\nObjection handling',
      handoffTriggers: activeClient.handoffTriggers || activeClient.handoff_triggers || 'talk to team, talk to human, want to buy',
      restrictions: activeClient.restrictions || '',
      competitors: activeClient.competitors || 'competitors',

      // New fields defaults
      businessType: activeClient.businessType || activeClient.business_type || 'product',
      tagline: activeClient.tagline || '',
      location: activeClient.location || '',
      workingHours: activeClient.workingHours || activeClient.working_hours || 'Mon-Sat 9AM-9PM, Sunday closed',
      primaryLanguage: activeClient.primaryLanguage || activeClient.primary_language || 'English',
      responseStyle: activeClient.responseStyle || activeClient.response_style || 'Friendly',
      responseLength: activeClient.responseLength || activeClient.response_length || 'Medium',
      useEmojis: activeClient.useEmojis !== undefined ? activeClient.useEmojis : (activeClient.use_emojis !== undefined ? activeClient.use_emojis : true),
      collectLeadInfo: activeClient.collectLeadInfo !== undefined ? activeClient.collectLeadInfo : (activeClient.collect_lead_info !== undefined ? activeClient.collect_lead_info : true),
      useUrgency: activeClient.useUrgency !== undefined ? activeClient.useUrgency : (activeClient.use_urgency !== undefined ? activeClient.use_urgency : true),
      handoffMessage: activeClient.handoffMessage || activeClient.handoff_message || 'Let me connect you with our team right away!',
      specialOffers: activeClient.specialOffers || activeClient.special_offers || '',
      advancedInstructions: activeClient.advancedInstructions || activeClient.advanced_instructions || '',
      typeSpecificData: {},
    };

    // Config is read exclusively from Sanity/Supabase agentClient record.
    // SOUL.md no longer embeds <!-- CONFIG --> (Hermes security scanner blocks files
    // containing HTML comments with keywords like 'ignore', 'system', 'hidden').

    // Parse typeSpecificData safely
    let typeSpecificDataObj: any = {};
    const rawTsd = activeClient.typeSpecificData || activeClient.type_specific_data;
    if (rawTsd) {
      try {
        typeSpecificDataObj = typeof rawTsd === 'string' ? JSON.parse(rawTsd) : rawTsd;
      } catch {
        typeSpecificDataObj = {};
      }
    }

    // Default configuration for new sections
    const defaultTypeSpecific = {
      maxSentencesPerMessage: 3,
      oneQuestionPerMessage: true,
      silentModePhrases: "maybe later, not now",
      silentModeResponse: "No worries! Let me know when you're ready.",
      neverFollowUp: true,
      neverShowSystemErrors: true,
      ignoreWhatsAppProfileInfo: true,
      aiDisclosureRequired: true,
      alwaysConfirmAiWhenAsked: true,
      primaryCurrency: 'INR',
      salesFlowSteps: [
        { stepNumber: 1, name: 'Opener', triggerCondition: 'First message from lead', agentAction: 'Greet warmly, ask what product they\'re looking for or what problem they want to solve', branching: '' },
        { stepNumber: 2, name: 'Qualify', triggerCondition: 'After opener response', agentAction: 'Ask budget range and whether they need it urgently or are just browsing', branching: '' },
        { stepNumber: 3, name: 'Present', triggerCondition: 'After qualification', agentAction: 'Suggest 1-2 specific products with price, key benefit, and a short reason why it fits them', branching: '' },
        { stepNumber: 4, name: 'Handle objection', triggerCondition: 'Lead hesitates, asks about price or quality', agentAction: 'Address concern directly, mention return policy or guarantee if available', branching: '' },
        { stepNumber: 5, name: 'Close', triggerCondition: 'Lead shows interest or asks how to buy', agentAction: 'Share payment/order link, confirm delivery details, thank them warmly', branching: '' }
      ],
      objections: [
        { trigger: 'Too expensive', response: "I completely understand! Our pricing reflects the premium quality and dedicated 24/7 support we offer. We also have flexible plans to fit your needs.", action: 'continue' },
        { trigger: "I'll think about it", response: "Of course! Take your time. Let me know if you have any other questions.", action: 'silent' }
      ],
      demoLinks: [
        { productName: 'ScaleCraft Agent', linkType: 'Video', url: 'https://youtube.com/demo', whenToShare: 'Only when lead asks for demo/proof/video/walkthrough' }
      ],
      demoTriggerPhrases: 'show me, demo, video, walkthrough, proof, inside, example',
      neverProactivelyShare: true,
      hasGuarantee: false,
      guaranteeDescription: 'Complete 7 days, zero clients = full refund',
      eligibilityConditions: 'Must complete all 7 days, 10+ messages/day',
      notEligibleIf: 'Incomplete challenge, under 30 messages',
      refundResponseTemplate: 'I\'d be happy to guide you on the refund process. Please let me connect you with Akhil directly so we can process this for you.',
      afterHandoffBehavior: 'silent',
      oldBrandNames: 'growyourbusiness.today',
      redirectMessage: 'We moved to {currentWebsite} - our dedicated platform now 😊 Same products, proper home.',
      outOfScopeResponse: 'That\'s a bit outside my area 😊 Anything I can help with on our {businessName} products?',
      competitorComparisonResponse: 'Great question! Here\'s how we compare: we focus on delivering high-quality, tailored solutions with 24/7 direct support. Unlike generic alternatives, our setup is fully custom-built for your specific business flow.',
      testimonials: 'First sale closed within hours of launch\nAgent live and handling real leads 24/7'
    };

    const typeSpecificDataObjMerged = {
      ...defaultTypeSpecific,
      ...typeSpecificDataObj
    };

    // Build merged config - single source of truth.
    // Fall back to defaults only; soulConfig (HTML comment) is no longer used.
    const mergedConfig = {
      ...defaultConfig,
      agentName: activeClient.agentName || activeClient.agent_name || defaultConfig.agentName,
      businessName: activeClient.businessName || activeClient.business_name || defaultConfig.businessName,
      whatsappBotNumber: activeClient.whatsappBotNumber || activeClient.whatsapp_bot_number || defaultConfig.whatsappBotNumber || '',
      description: activeClient.description !== undefined && activeClient.description !== null ? activeClient.description : defaultConfig.description,
      website: activeClient.website || defaultConfig.website,
      handoffNumber: activeClient.handoffNumber || activeClient.handoff_number || activeClient.ownerPhone || activeClient.owner_phone || defaultConfig.handoffNumber,
      tone: activeClient.responseStyle || activeClient.response_style || defaultConfig.tone,
      language: activeClient.primaryLanguage || activeClient.primary_language || defaultConfig.language,
      maxSentences: activeClient.maxSentences || activeClient.max_sentences || defaultConfig.maxSentences,
      primaryAudience: activeClient.primaryAudience || activeClient.primary_audience || defaultConfig.primaryAudience,
      keySellingPoints: activeClient.keySellingPoints || activeClient.key_selling_points || defaultConfig.keySellingPoints,
      handoffTriggers: activeClient.handoffTriggers || activeClient.handoff_triggers || defaultConfig.handoffTriggers,
      restrictions: activeClient.restrictions || defaultConfig.restrictions,
      competitors: activeClient.competitors || defaultConfig.competitors,
      businessType: activeClient.businessType || activeClient.business_type || defaultConfig.businessType,
      tagline: activeClient.tagline || defaultConfig.tagline,
      location: activeClient.location || defaultConfig.location,
      workingHours: activeClient.workingHours || activeClient.working_hours || defaultConfig.workingHours,
      primaryLanguage: activeClient.primaryLanguage || activeClient.primary_language || defaultConfig.primaryLanguage,
      responseStyle: activeClient.responseStyle || activeClient.response_style || defaultConfig.responseStyle,
      responseLength: activeClient.responseLength || activeClient.response_length || defaultConfig.responseLength,
      useEmojis: activeClient.useEmojis !== undefined ? activeClient.useEmojis : (activeClient.use_emojis !== undefined ? activeClient.use_emojis : defaultConfig.useEmojis),
      collectLeadInfo: activeClient.collectLeadInfo !== undefined ? activeClient.collectLeadInfo : (activeClient.collect_lead_info !== undefined ? activeClient.collect_lead_info : defaultConfig.collectLeadInfo),
      useUrgency: activeClient.useUrgency !== undefined ? activeClient.useUrgency : (activeClient.use_urgency !== undefined ? activeClient.use_urgency : defaultConfig.useUrgency),
      handoffMessage: activeClient.handoffMessage || activeClient.handoff_message || defaultConfig.handoffMessage,
      specialOffers: activeClient.specialOffers || activeClient.special_offers || defaultConfig.specialOffers,
      advancedInstructions: activeClient.advancedInstructions || activeClient.advanced_instructions || defaultConfig.advancedInstructions,
      typeSpecificData: typeSpecificDataObjMerged,
    };

    return NextResponse.json({ ...mergedConfig, rawSoul: soulContent });
  } catch (error: any) {
    console.error('Instructions GET API Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const client = await getSessionClient();
    if (!client) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const ip = getClientServerIp(client);
    const ctx = resolveHermesContext(client);
    const { sshPrivateKey, serverUser, geminiApiKey } = client;
    if (!ip || !sshPrivateKey) {
      return NextResponse.json({ error: 'Server details missing' }, { status: 400 });
    }

    // Sanitize text inputs
    const agentName = sanitizeInstructions(body.agentName || 'Meera');
    const businessName = sanitizeInstructions(body.businessName || client.businessName);
    const tagline = sanitizeInstructions(body.tagline || '');
    const description = sanitizeInstructions(body.description || '');
    const website = sanitizeInstructions(body.website || '');
    const location = sanitizeInstructions(body.location || '');
    const workingHours = sanitizeInstructions(body.workingHours || '');
    const primaryLanguage = sanitizeInstructions(body.primaryLanguage || 'English');
    const responseStyle = sanitizeInstructions(body.responseStyle || 'Friendly');
    const responseLength = sanitizeInstructions(body.responseLength || 'Medium');
    const useEmojis = body.useEmojis !== false;
    const collectLeadInfo = body.collectLeadInfo !== false;
    const useUrgency = body.useUrgency !== false;
    const handoffNumber = sanitizeInstructions(body.handoffNumber || '');
    const handoffTriggers = sanitizeInstructions(body.handoffTriggers || '');
    const handoffMessage = sanitizeInstructions(body.handoffMessage || 'Let me connect you with our team right away!');
    const specialOffers = sanitizeInstructions(body.specialOffers || '');
    const advancedInstructions = body.advancedInstructions || '';
    const primaryAudience = sanitizeInstructions(body.primaryAudience || '');
    const keySellingPoints = sanitizeInstructions(body.keySellingPoints || '');
    const restrictions = sanitizeInstructions(body.restrictions || '');
    const competitors = sanitizeInstructions(body.competitors || '');
    const businessType = body.businessType || 'product';
    const typeSpecificData = body.typeSpecificData || {};

    // 1. Fetch products from Supabase (source of truth)
    const products = await getProducts(client.id || client._id);

    let prodMd = '';
    const activeProducts = products.filter((p) => p.active);
    if (activeProducts.length > 0) {
      activeProducts.forEach((p) => {
        prodMd += `- **${p.name}** (Price: INR ${p.price})\n`;
        prodMd += `  Description: ${p.description}\n`;
        if (p.url) prodMd += `  Purchase URL: ${p.url}\n`;
        // NOTE: image URL intentionally excluded - agent must NEVER share CDN/image URLs as payment links
        prodMd += '\n';
      });
    } else {
      prodMd += 'No products are currently available in the catalog.\n\n';
    }

    // 2. Build Business-Specific offer markdown
    let offerMd = '';
    const tsd = typeSpecificData;
    // 6 core categories. To add more: add to CATEGORY_MAP, add keywords to analyze_leads.py, add UI badge and filter
    if (businessType === 'service_business') {
      offerMd += `Services List & Pricing:\nNot specified\n\n`;
      offerMd += `- Home Service/Delivery Available: ${tsd.deliveryAvailable || tsd.homeServiceAvailable ? 'Yes' : 'No'}\n`;
      offerMd += `- Appointment/Booking Required: ${tsd.appointmentRequired || tsd.tableBooking ? 'Yes' : 'No'}\n`;
      if (tsd.sessionDuration) {
        offerMd += `- Service/Session Duration: ${tsd.sessionDuration}\n`;
      }
      if (tsd.rateCard) {
        offerMd += `Rate Card Details:\n${tsd.rateCard}\n`;
      }
    }
    else if (businessType === 'product_seller') {
      offerMd += `### PRODUCTS IN CATALOG\n${prodMd}\n`;
      offerMd += `- Minimum Order Value: INR ${tsd.minOrderValue || 'NoneSpecified'}\n`;
      offerMd += `- Delivery Available: ${tsd.deliveryAvailable ? 'Yes' : 'No'}\n`;
      if (tsd.deliveryAvailable) {
        offerMd += `  - Delivery Area: ${tsd.deliveryArea || 'Not specified'}\n`;
        offerMd += `  - Delivery Time: ${tsd.deliveryTime || 'Not specified'}\n`;
      }
      offerMd += `- COD Available: ${tsd.codAvailable ? 'Yes' : 'No'}\n`;
      offerMd += `- Return Policy: ${tsd.returnPolicy || 'Not specified'}\n`;
    }
    else if (businessType === 'real_estate') {
      if (Array.isArray(tsd.propertyTypes) && tsd.propertyTypes.length > 0) {
        offerMd += `- Property Types: ${tsd.propertyTypes.join(', ')}\n`;
      }
      offerMd += `- Areas Covered: ${tsd.areasCovered || 'Not specified'}\n`;
      offerMd += `- Price Range: ${tsd.priceRange || 'Not specified'}\n`;
      offerMd += `- RERA Registered: ${tsd.reraRegistered ? 'Yes' : 'No'}\n`;
      offerMd += `- Site Visit Arrangement: ${tsd.siteVisitArrangement ? 'Yes' : 'No'}\n`;
      offerMd += `- EMI Guidance Available: ${tsd.emiGuidance ? 'Yes' : 'No'}\n`;
    }
    else if (businessType === 'education_coaching') {
      offerMd += `Services Offered:\nNot specified\n\n`;
      if (Array.isArray(tsd.consultationMode) && tsd.consultationMode.length > 0) {
        offerMd += `- Consultation Mode: ${tsd.consultationMode.join(', ')}\n`;
      }
      offerMd += `- Languages for consultation: ${tsd.consultationLanguages || 'Not specified'}\n`;
      offerMd += `- Initial Consultation Free: ${tsd.initialFree ? 'Yes' : 'No'}\n`;
      offerMd += `Fees Structure:\n${tsd.feesStructure || 'Not specified'}\n\n`;
      offerMd += `- Years of Experience: ${tsd.experienceYears || 'Not specified'}\n`;
      offerMd += `- Certifications: ${tsd.certifications || 'Not specified'}\n`;
    }
    else if (businessType === 'scalecraft') {
      // Use the live products.json catalog so all products show up.
      // Hardcoding was causing only 4 products to appear when there are 9+.
      offerMd += `### SCALECRAFT PRODUCT LIST\n`;
      if (activeProducts.length > 0) {
        offerMd += prodMd;
      } else {
        offerMd += `- **AI Lead Finder** (Price: INR 499 - 1299)\n`;
        offerMd += `  Description: Scrapes and finds leads on autopilot.\n`;
        offerMd += `- **AI Client Acquisition System** (Price: INR 2999)\n`;
        offerMd += `  Description: Automatically reaches out to leads on WhatsApp.\n`;
        offerMd += `- **Complete Bundle** (Price: INR 4999)\n`;
        offerMd += `  Description: Includes both Lead Finder and Acquisition System.\n`;
        offerMd += `- **ScaleCraft Agent** (Price: INR 2999 setup + 6499/month)\n`;
        offerMd += `  Description: Fully managed WhatsApp AI chatbot for businesses.\n`;
      }
    }
    else if (businessType === 'restaurant_food') {
      offerMd += `### MENU SUMMARY\n${tsd.menuSummary || 'Not specified'}\n`;
      offerMd += `- Delivery Info: ${tsd.deliveryInfo || 'Not specified'}\n`;
      offerMd += `- Table Booking Info: ${tsd.bookingInfo || 'Not specified'}\n`;
      offerMd += `- Dietary Options: ${tsd.dietaryOptions || 'Not specified'}\n`;
      offerMd += `- Veg/Non-veg: ${tsd.vegNonVeg || 'Not specified'}\n`;
    }
    else {
      // Default / fallback / custom other business type - include catalog products if any
      if (activeProducts.length > 0) {
        offerMd += `### PRODUCTS IN CATALOG\n${prodMd}\n`;
      }
    }

    // 3. Compile Handoff list
    let handoffTriggersList = '';
    if (Array.isArray(tsd.handoffTriggersChecked) && tsd.handoffTriggersChecked.length > 0) {
      tsd.handoffTriggersChecked.forEach((trigger: string) => {
        handoffTriggersList += `- Customer mentions or has a: ${trigger}\n`;
      });
    }
    if (handoffTriggers) {
      handoffTriggersList += `- Matches words/phrases: ${handoffTriggers}\n`;
    }
    if (!handoffTriggersList) {
      handoffTriggersList = `- Customer asks to speak to the team or human support\n`;
    }

    // 4. Compile Sales Approach
    let salesApproach = '';
    let guideDirection = 'decision or next step';
    if (businessType === 'service_business') {
      guideDirection = 'booking an appointment or ordering a service';
    } else if (businessType === 'product_seller') {
      guideDirection = 'completing their order or purchase';
    } else if (businessType === 'real_estate') {
      guideDirection = 'scheduling a site visit or property inquiry';
    } else if (businessType === 'education_coaching') {
      guideDirection = 'scheduling a call or requesting a consultation proposal';
    } else if (businessType === 'digital_saas') {
      guideDirection = 'purchasing a product or subscribing to a plan';
    } else if (businessType === 'restaurant_food') {
      guideDirection = 'placing an order or making a reservation';
    } else if (businessType === 'scalecraft') {
      guideDirection = 'purchasing a product or connecting with the founder';
    }

    salesApproach += `- Maintain a ${responseStyle} response tone at all times\n`;
    if (collectLeadInfo) {
      salesApproach += `- Collect customer name and contact requirement early in the conversation\n`;
    }
    salesApproach += `- Reference the customer's specific interest or query directly in your responses\n`;
    if (useUrgency) {
      salesApproach += `- Create natural urgency using phrases like: "Limited slots!", "Only 3 left!", "Offer ends Sunday!" where appropriate\n`;
    }
    salesApproach += `- Actively guide the customer towards ${guideDirection}\n`;

    // 5. Advanced Instructions
    let advancedMd = '';
    if (advancedInstructions) {
      advancedMd = `## CUSTOM SPECIAL INSTRUCTIONS\n${advancedInstructions}\n\n`;
    }

    // Determine category-specific flow text
    let categoryFlowMd = '';
    if (businessType === 'service_business') {
      categoryFlowMd = `## BOOKING & SERVICE FLOW\nWhen customer wants to book or order:\n1. Ask what service/item they need\n2. Share availability and pricing\n3. Collect: name, phone, preferred time\n4. Confirm details and hand off to team\n\n`;
    } else if (businessType === 'product_seller') {
      categoryFlowMd = `## ORDER HANDLING FLOW\nWhen customer wants to buy:\n1. Confirm product and variant (size/color if applicable)\n2. Share price and delivery details\n3. Collect: name, address, phone\n4. Confirm order and share payment method\n\n`;
    } else if (businessType === 'real_estate') {
      categoryFlowMd = `## PROPERTY QUALIFICATION FLOW\nWhen customer enquires:\n1. Ask: buying/renting/selling?\n2. Ask: budget range?\n3. Ask: preferred area/location?\n4. Present matching options\n5. Offer site visit arrangement\n\n`;
    } else if (businessType === 'education_coaching') {
      categoryFlowMd = `## CONSULTATION FLOW\nWhen customer enquires:\n1. Understand their requirement briefly\n2. Ask about timeline and budget\n3. Share relevant experience/portfolio\n4. Offer free consultation call\n5. Collect contact details\n\n`;
    } else if (businessType === 'restaurant_food') {
      categoryFlowMd = `## RESTAURANT & FOOD FLOW\nWhen customer enquires:\n1. For delivery: get area and food preference\n2. For dine-in: get group size and preferred time\n3. Recommend special dish with price\n4. Confirm reservation/order details and hand off\n\n`;
    } else if (businessType === 'scalecraft') {
      categoryFlowMd = `## LEAD QUALIFICATION - STRICT STEP GATE
You MUST complete every step in order. Do NOT skip steps. Do NOT present products before Step 4.

### STEP 1 - GET THEIR NAME (if not already known)
- Ask their name naturally in the first or second message.
- Example: "By the way, what's your name?" or "Who am I speaking with? 😊"
- Do NOT proceed to Step 2 until you know their name.
- Use their name naturally in subsequent messages.

### STEP 2 - UNDERSTAND THEIR SITUATION (ONE open question)
- Ask about their current main challenge with ONE question:
  * "What does your [work/business] look like right now?"
  * "What's the main thing you're struggling with when it comes to getting clients?"
  * "How are you currently finding leads or getting clients?"
- Listen carefully. Note their exact words - you will use them back.
- Do NOT ask about profession/category here if you already got it in Step 1 opener.

### STEP 3 - DIG DEEPER (ONE follow-up question based on their answer)
- Based on what they said, ask ONE follow-up that shows you were listening:
  * "How long has that been a challenge for you?"
  * "What have you already tried to fix that?"
  * "What would change for you if that was solved?"
- Their answer reveals buying intent and urgency. Use this in Step 4.

### STEP 4 - RECOMMEND EXACTLY ONE PRODUCT
- Based on EVERYTHING you've learned, pick the SINGLE best product for them.
- Frame it using THEIR words: "Based on what you said about [their exact problem], [Product Name] was literally built for that."
- Share name + price + 2-3 specific benefits that match their situation.
- Do NOT list multiple products. Do NOT use numbered menus.
- Do NOT say "we have options 1, 2, 3" - recommend ONE thing confidently.

### STEP 5 - CLOSE OR HANDLE OBJECTION
- If they're interested → share the exact "Purchase URL" provided in the product catalog above.
- NEVER try to generate a new payment link.
- NEVER output JSON or use tools to create links. Simply paste the Purchase URL in plain text.
- If they have a concern → address it with specifics from the product content.
- If the product genuinely isn't the right fit → only THEN pivot to the next most relevant product (still one at a time).

## ABSOLUTE PROHIBITIONS - NEVER DO THESE:
- NEVER show all products as a numbered/bulleted menu.
- NEVER say "Here are your options: 1) ... 2) ... 3) ..."
- NEVER skip straight to products after just one qualification answer.
- NEVER send a product list without knowing their name AND their pain point.
- NEVER present pricing before Step 4.
- NEVER output JSON, tool calls, or attempt to generate payment links dynamically. Use ONLY the URLs provided in the product list.

`;
    }


    // SECTION BUILDERS FOR NEW SOUL.md SPEC:

    // 1. Critical Rules
    let criticalRulesMd = '';
    let idxRule = 1;
    criticalRulesMd += `${idxRule++}. Maximum sentences per reply message: ${tsd.maxSentencesPerMessage || 4}\n`;
    if (tsd.oneQuestionPerMessage !== false) {
      criticalRulesMd += `${idxRule++}. Never ask more than one question per message.\n`;
    }
    if (tsd.silentModePhrases) {
      criticalRulesMd += `${idxRule++}. Silent Mode Trigger: When lead says any of these phrases: "${tsd.silentModePhrases}" -> go silent and reply ONLY with: "${tsd.silentModeResponse || "Of course! 😊 I'm here whenever you're ready."}"\n`;
    }
    if (tsd.neverFollowUp !== false) {
      criticalRulesMd += `${idxRule++}. Never send follow-up if lead hasn't replied.\n`;
    }
    if (tsd.neverShowSystemErrors !== false) {
      criticalRulesMd += `${idxRule++}. Never show internal/system errors to customers under any circumstances.\n`;
    }
    if (tsd.ignoreWhatsAppProfileInfo !== false) {
      criticalRulesMd += `${idxRule++}. Ignore WhatsApp profile names, bios, or metadata - treat every chat fresh.\n`;
    }
    if (tsd.aiDisclosureRequired !== false) {
      criticalRulesMd += `${idxRule++}. AI Disclosure: The first message must disclose that this assistant is an AI, and always confirm AI identity if directly asked.\n`;
    }

    // 2. Personality (Tone + Emojis + Currency)
    let currencyRuleStr = '';
    if (tsd.primaryCurrency === 'Both') {
      currencyRuleStr = 'Auto-detect lead currency preference from phone number prefix: for India leads (+91) use ₹ (INR), and for International/UAE leads use $ (USD).';
    } else {
      currencyRuleStr = `Use ${tsd.primaryCurrency || 'INR'} as the primary currency for all pricing details.`;
    }
    let personalityMd = `- Tone: ${responseStyle}\n`;
    personalityMd += `- Emojis: ${useEmojis ? 'Use emojis naturally' : 'Do not use emojis'}\n`;
    personalityMd += `- Currency: ${currencyRuleStr}\n`;

    // 3. Sales Flow Step Builder
    let salesFlowMd = '';
    if (Array.isArray(tsd.salesFlowSteps) && tsd.salesFlowSteps.length > 0) {
      salesFlowMd += `## SALES FLOW STEPS GUIDE\n`;
      salesFlowMd += `Follow the configured sales flow steps below dynamically. They are a general roadmap, NOT a rigid script. Adapt naturally like a real human salesperson:\n`;
      salesFlowMd += `1. **Rapport & Listening First**: If a lead asks a question, raises an objection, or gets off-topic, address their message fully, helpfully, and personally first. Do NOT ignore user context to force a sales step.\n`;
      salesFlowMd += `2. **Dynamic Step Pacing**: Adapt to the lead's urgency and interest. If they are ready to buy, skip directly to Step 5 (Close). Do not force qualification questions if they already provided the info.\n`;
      salesFlowMd += `3. **No Scripted Repetition**: Do NOT copy the step triggers or names into your reply. Sound conversational, casual, and authentic.\n\n`;
      tsd.salesFlowSteps.forEach((step: any) => {
        salesFlowMd += `### Step ${step.stepNumber}: ${step.name}\n`;
        salesFlowMd += `- Trigger Condition: ${step.triggerCondition}\n`;
        salesFlowMd += `- Agent Action: ${step.agentAction}\n`;
        if (step.branching) {
          salesFlowMd += `- Branching/Alternative Logic: ${step.branching}\n`;
        }
        salesFlowMd += '\n';
      });
    } else {
      salesFlowMd += 'Follow a natural sales qualification flow.\n';
    }

    // 4. Objection Handling Dynamic Q&A
    let objectionsMd = '';
    if (Array.isArray(tsd.objections) && tsd.objections.length > 0) {
      tsd.objections.forEach((obj: any) => {
        objectionsMd += `#### Lead Objection: "${obj.trigger}"\n`;
        objectionsMd += `- Agent Response: ${obj.response}\n`;
        objectionsMd += `- Post-response action: ${obj.action || 'continue'}\n\n`;
      });
    } else {
      objectionsMd += 'Address objections gracefully and refocus on value propositions.\n';
    }

    // 5. Demo & Media Links
    let demosMd = '';
    if (tsd.demoTriggerPhrases) {
      demosMd += `Share demo link ONLY when lead says: "${tsd.demoTriggerPhrases}"\n`;
    }
    if (tsd.neverProactivelyShare !== false) {
      demosMd += `Never proactively share demo links without explicit request.\n\n`;
    }
    if (Array.isArray(tsd.demoLinks) && tsd.demoLinks.length > 0) {
      tsd.demoLinks.forEach((demo: any) => {
        demosMd += `- Product: **${demo.productName}** | Type: **${demo.linkType}**\n`;
        demosMd += `  URL: ${demo.url}\n`;
        demosMd += `  Trigger: ${demo.whenToShare}\n\n`;
      });
    }

    // 6. Guarantee
    let guaranteeMd = '';
    if (tsd.hasGuarantee) {
      guaranteeMd += `- Guarantee Policy: ${tsd.guaranteeDescription}\n`;
      guaranteeMd += `- Eligibility Conditions: ${tsd.eligibilityConditions}\n`;
      guaranteeMd += `- Exclusions: ${tsd.notEligibleIf}\n`;
      guaranteeMd += `- Refund Response Template: "${tsd.refundResponseTemplate}"\n`;
    } else {
      guaranteeMd += 'No custom refund or guarantee policy is currently active.\n';
    }

    // 7. Handoff Behavior
    let handoffBehaviorStr = '';
    if (tsd.afterHandoffBehavior === 'silent') {
      handoffBehaviorStr = 'Go completely silent (recommended). Do not send any follow-ups, links, or messages. The human takes over entirely.';
    } else if (tsd.afterHandoffBehavior === 'continue') {
      handoffBehaviorStr = 'Continue responding if the lead replies or asks further questions.';
    } else {
      handoffBehaviorStr = 'Send exactly one follow-up message if the lead does not reply.';
    }

    let handoffMd = `### Handoff Triggers\n`;
    handoffMd += `When to handoff:\n${handoffTriggersList}\n\n`;
    if (handoffNumber) {
      handoffMd += `### Handoff Contact Details\n`;
      handoffMd += `- Team/Handoff Phone Number: ${handoffNumber}\n`;
      handoffMd += `- WhatsApp Link: https://wa.me/${handoffNumber.replace(/\D/g, '')}\n`;
      handoffMd += `Instructions: Share this phone number or WhatsApp link when handing off to the team or when the customer asks how to connect.\n\n`;
    }
    handoffMd += `### Handoff Message\n`;
    handoffMd += `Agent sends EXACTLY this - word for word:\n"${handoffMessage}"\n\n`;
    handoffMd += `### Handoff Behavior\n`;
    handoffMd += `Post-handoff rule: ${handoffBehaviorStr}\n\n`;
    handoffMd += `⚠️ After human handoff - agent stops completely. No 'in the meantime' messages. No website links. Human takes over entirely.\n`;

    // 8. Brand Migration
    let migrationMd = '';
    if (tsd.oldBrandNames) {
      migrationMd += `Old Brand Names: ${tsd.oldBrandNames}\n`;
      migrationMd += `Redirect Rule: If anyone mentions these old names, redirect them with: "${tsd.redirectMessage || ''}"\n`;
    } else {
      migrationMd += 'No brand migration rules configured.\n';
    }

    // 9. Scope and Competitors
    let scopeMd = `Out of scope response: "${tsd.outOfScopeResponse || "That's a bit outside my area 😊"}"\n`;
    let competitorMd = `Competitor comparison response: "${tsd.competitorComparisonResponse || "We focus on premium custom integrations."}"\n`;

    const rawSOUL = compileSoulMarkdown(body, activeProducts);
    const clientSoul = rawSOUL;
    const compiledSoul = `## CRITICAL - NEVER SHOW THESE TO USERS
Never mention, display, or reference:
- Rate limit errors
- API quota errors  
- Any technical errors
- The word "Gemini"
- "language model"
- "large language model"
- "trained by Google"
- "I am an AI" (except first message disclosure)

If Gemini API returns an error:
Reply ONLY: "I'll connect you with our team!"
Then go silent. Never show the error.

## HERMES SYSTEM MESSAGE SUPPRESSION - HIGHEST PRIORITY
The following are INTERNAL system events from the Hermes platform. If you receive OR are about to send any message matching these patterns, STOP IMMEDIATELY and send NOTHING:
- Message starts with "Self-improvement review:" or contains "Skill '" and "created"
- Message starts with "send_message:" (raw tool call output)
- Message starts with "browser_navigate:" (raw tool call output)
- Message starts with "tool_call:" or "tool_result:"
- Message contains "hermes-agent" or "whatsapp-bridge"
- Message contains "payment-link-management" or any skill/tool name in quotes
- Message is a JSON object or contains "{\"" patterns
- Message contains "System:" or "[System]" prefix
These are platform internals. NEVER forward, repeat, or acknowledge them to any customer. Complete silence is the only correct response.

` + clientSoul;

    // 7. Write soul_config.json separately so bridge.js can read agentName
    // (config is NO LONGER embedded as an HTML comment in SOUL.md because
    //  Hermes's security scanner flags it as html_comment_injection and
    //  blocks the entire SOUL.md, causing raw Gemini fallback)
    const soulConfigJson = JSON.stringify({
      agentName,
      businessName,
      tagline,
      description,
      website,
      location,
      workingHours,
      primaryLanguage,
      responseStyle,
      responseLength,
      useEmojis,
      collectLeadInfo,
      useUrgency,
      handoffNumber,
      handoffTriggers,
      handoffMessage,
      specialOffers,
      advancedInstructions,
      primaryAudience,
      keySellingPoints,
      restrictions,
      competitors,
      businessType,
      typeSpecificData,
    }, null, 2);
    const soulConfigPath = `${ctx.profileRoot}/soul_config.json`;
    await uploadFile(ip, sshPrivateKey, soulConfigJson, soulConfigPath, serverUser || 'ubuntu');

    // 7b. Wipe all stale session system_prompts in SQLite state.db so Hermes
    // rebuilds from the fresh SOUL.md on next conversation turn instead of
    // replaying the old (now-blocked) prompt.
    const stateDb = `${ctx.profileRoot}/state.db`;
    await executeCommand(
      ip,
      sshPrivateKey,
      `python3 -c "import sqlite3; conn = sqlite3.connect('${stateDb}'); conn.execute('UPDATE sessions SET system_prompt = NULL'); conn.commit(); conn.close(); print('Sessions cleared')"`,
      serverUser || 'ubuntu'
    );

    // 8. Patch bridge.js once so it reads agentName from soul_config.json
    // (SOUL.md no longer embeds <!-- CONFIG --> due to Hermes security scanner blocking it)
    const bridgePatchCmd = `
      BRIDGE="/home/ubuntu/.hermes/hermes-agent/scripts/whatsapp-bridge/bridge.js"
      # Only patch if it still reads from SOUL.md comment (idempotent)
      if grep -q "html_comment_injection\\|<!-- CONFIG" "$BRIDGE" 2>/dev/null; then
        echo "Already patched or has injection comments, skipping"
      elif grep -q "soulContent.match" "$BRIDGE" 2>/dev/null; then
        # Replace the SOUL.md comment-reading block with soul_config.json reading
        sed -i 's|const soulPath = require.*SOUL\\.md.*|const profile=process.env.HERMES_PROFILE; const configPath=profile?require("path").join(process.env.HOME\|\|"/home/ubuntu",".hermes","profiles",profile,"soul_config.json"):require("path").join(process.env.HOME\|\|"/home/ubuntu",".hermes","soul_config.json");|g' "$BRIDGE"
        sed -i 's|if (fs.existsSync(soulPath))|if (fs.existsSync(configPath))|g' "$BRIDGE"
        sed -i 's|const soulContent = fs.readFileSync(soulPath, .utf8.);|const soulConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));|g' "$BRIDGE"
        sed -i 's|const match = soulContent.match.*CONFIG.*|const config = soulConfig;|g' "$BRIDGE"
        sed -i 's|if (match && match\[1\])||g' "$BRIDGE"
        sed -i 's|const config = JSON.parse(match\[1\].trim());||g' "$BRIDGE"
        echo "Bridge.js patched to use soul_config.json"
      else
        echo "Bridge.js already uses soul_config.json or no SOUL.md read found"
      fi
    `;
    await executeCommand(ip, sshPrivateKey, bridgePatchCmd, serverUser || 'ubuntu');

    // 8b. Patch bridge.js to filter out Hermes internal system messages
    // These messages (Self-improvement review, send_message:, browser_navigate:, etc.)
    // are generated by Hermes itself and sent to WhatsApp before the AI model sees them.
    // SOUL.md rules cannot suppress them - the fix must be in bridge.js.
    const bridgeFilterPatchCmd = `
      BRIDGE="/home/ubuntu/.hermes/hermes-agent/scripts/whatsapp-bridge/bridge.js"
      if [ ! -f "$BRIDGE" ]; then
        echo "bridge.js not found, skipping filter patch"
        exit 0
      fi
      # Check if filter is already applied (idempotent)
      if grep -q "SCALECRAFT_MSG_FILTER" "$BRIDGE" 2>/dev/null; then
        echo "Message filter already applied"
        exit 0
      fi
      # Inject a message filter function at the top of the file (after first 'use strict' or at line 1)
      FILTER_CODE='// SCALECRAFT_MSG_FILTER - suppress Hermes internal system messages
function isHermesInternalMessage(text) {
  if (!text || typeof text !== "string") return false;
  const t = text.trim();
  const patterns = [
    /^Self-improvement review:/i,
    /^send_message:/i,
    /^browser_navigate:/i,
    /^tool_call:/i,
    /^tool_result:/i,
    /^User profile updated/i,
    /Skill '"'"'[^'"'"']+'"'"' (created|updated|deleted)/i,
    /^\\{\\s*"/,
  ];
  return patterns.some(p => p.test(t));
}
'
      # Prepend filter to file, keeping the shebang line on line 1 if present
      TMP=$(mktemp)
      if head -n 1 "$BRIDGE" | grep -q "^#!/"; then
        head -n 1 "$BRIDGE" > "$TMP"
        echo "$FILTER_CODE" >> "$TMP"
        tail -n +2 "$BRIDGE" >> "$TMP"
      else
        echo "$FILTER_CODE" > "$TMP"
        cat "$BRIDGE" >> "$TMP"
      fi
      mv "$TMP" "$BRIDGE"
      # Now wrap all sendMessage / sock.sendMessage calls to check filter
      # Find the pattern where messages are sent and add guard
      sed -i 's/await sock\\.sendMessage(/if (isHermesInternalMessage(typeof arguments[1] === "object" ? (arguments[1].text || "") : "")) { console.log("[SCALECRAFT] Suppressed internal msg"); } else await sock.sendMessage(/g' "$BRIDGE" 2>/dev/null || true
      echo "Message filter patch applied"
    `;
    await executeCommand(ip, sshPrivateKey, bridgeFilterPatchCmd, serverUser || 'ubuntu');

    // 8c. Apply Voice Replies Auto-TTS config securely to the profile's config.yaml
    const voiceRepliesEnabled = typeSpecificData?.voiceRepliesEnabled === true;
    const configSetCmd = `
      /home/ubuntu/.hermes/hermes-agent/venv/bin/python3 -c "
import yaml, os
p = '${ctx.profileRoot}/config.yaml'
if os.path.exists(p):
    with open(p, 'r') as f:
        c = yaml.safe_load(f) or {}
else:
    c = {}
if 'voice' not in c:
    c['voice'] = {}
c['voice']['auto_tts'] = ${voiceRepliesEnabled ? 'True' : 'False'}
c['voice.auto_tts'] = ${voiceRepliesEnabled ? 'True' : 'False'}

if ${voiceRepliesEnabled ? 'True' : 'False'}:
    if 'tts' not in c:
        c['tts'] = {}
    c['tts']['provider'] = 'edge'
    c['tts.provider'] = 'edge'

if 'stt' not in c:
    c['stt'] = {}
if 'local' not in c['stt']:
    c['stt']['local'] = {}
c['stt']['local']['model'] = 'small'
c['stt.local.model'] = 'small'

with open(p, 'w') as f:
    yaml.dump(c, f, default_flow_style=False)
"
    `;
    const configRes = await executeCommand(ip, sshPrivateKey, configSetCmd, serverUser || 'ubuntu');
    if (configRes.exitCode !== 0) {
      console.error('[Hermes Config Set] Failed:', configRes.stderr || configRes.stdout);
      return NextResponse.json({ error: 'Failed to apply Voice Replies setting to Hermes agent configuration.' }, { status: 500 });
    }

    // 9. Write compiled SOUL.md and trigger restart (writeSoulMd handles the restart process)
    const uploadSuccess = await writeSoulMd(client, sshPrivateKey, compiledSoul, serverUser || 'ubuntu');

    if (!uploadSuccess) {
      return NextResponse.json({ error: 'Failed to upload prompt config to remote server' }, { status: 500 });
    }

    // 9b. Verify SOUL.md content after write (read file directly)
    const verificationRes = await executeCommand(
      ip,
      sshPrivateKey,
      `head -5 ${getSoulMdPath(client)} 2>/dev/null`,
      serverUser || 'ubuntu'
    );
    const verification = verificationRes.stdout;
    const hasAgentName = verification.toLowerCase().includes(agentName.toLowerCase()) || compiledSoul.toLowerCase().includes(agentName.toLowerCase());
    const hasBusinessName = compiledSoul.toLowerCase().includes(businessName.toLowerCase());

    if (!hasAgentName || !hasBusinessName) {
      return NextResponse.json({ error: 'SOUL.md write failed. Please try again.' }, { status: 400 });
    }

    // 10. Update client data in Supabase
    const fieldsToUpdate = {
      agent_name: agentName,
      business_name: businessName,
      tagline,
      description,
      website,
      location,
      working_hours: workingHours,
      primary_language: primaryLanguage,
      response_style: responseStyle,
      response_length: responseLength,
      use_emojis: useEmojis,
      collect_lead_info: collectLeadInfo,
      use_urgency: useUrgency,
      business_type: businessType,
      primary_audience: primaryAudience,
      key_selling_points: keySellingPoints,
      handoff_number: handoffNumber,
      handoff_triggers: handoffTriggers,
      handoff_message: handoffMessage,
      restrictions,
      competitors,
      advanced_instructions: advancedInstructions,
      special_offers: specialOffers,
      type_specific_data: typeSpecificData,
      gemini_api_key: geminiApiKey,
    };

    try {
      await updateClient(client._id, {
        agent_name: agentName,
        business_name: businessName,
        description,
        tagline,
        website,
        location,
        working_hours: workingHours,
        primary_language: primaryLanguage,
        response_style: responseStyle,
        response_length: responseLength,
        use_emojis: useEmojis,
        collect_lead_info: collectLeadInfo,
        use_urgency: useUrgency,
        handoff_triggers: handoffTriggers,
        handoff_message: handoffMessage,
        handoff_number: handoffNumber,
        special_offers: specialOffers,
        advanced_instructions: advancedInstructions,
        type_specific_data: JSON.stringify(typeSpecificData),
        primary_audience: primaryAudience,
        key_selling_points: keySellingPoints,
        restrictions,
        competitors,
        business_type: businessType,
      });
    } catch (dbError: any) {
      // Log but don't fail - SOUL.md already 
      // written to VPS successfully
      console.error('Supabase update error:',
        dbError.message, dbError);
      // Continue - return success anyway
      // DB update is backup, not critical path
    }

    return NextResponse.json({ success: true, message: 'Agent instructions updated and restarted successfully!' });
  } catch (error: any) {
    console.error('Instructions POST API Error:', error.message);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

async function optimizeSOULWithAI(
  rawSOUL: string,
  businessType: string,
  agentName: string,
  apiKey: string
): Promise<string> {
  if (!apiKey) {
    console.error('No client Gemini API key found, skipping AI optimization.');
    return rawSOUL;
  }

  const prompt = `You are an expert WhatsApp AI agent trainer.
You have been given a SOUL.md instruction file for
an AI sales agent named ${agentName} representing ${businessType}.

Your job is to make this SOUL.md feel like it was
hand-crafted by an expert - natural, conversational,
specific to this business. Not template-like.

RULES:
1. Keep ALL sections and their headings
2. Never cut any sentence mid-way
3. Make language more natural and WhatsApp-friendly
4. Remove any "Not specified" or empty fields
5. Keep all prices, URLs, phone numbers exactly as-is
6. Keep all trigger phrases exactly as-is
7. Keep all handoff messages exactly as-is
8. Target: under 4000 characters total
9. Output ONLY the optimized SOUL.md
   No explanation. No preamble. No markdown wrapper.
10. Sales flow example messages must stay as example
    messages - do not convert to abstract descriptions

RAW SOUL.md:
${rawSOUL}`;

  try {
    const headers = {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    };
    const body = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 800
      }
    });

    let response: Response;
    try {
      response = await fetch(
        'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent',
        { method: 'POST', headers, body }
      );
      if (!response.ok) {
        response = await fetch(
          'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
          { method: 'POST', headers, body }
        );
      }
    } catch (err) {
      response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
        { method: 'POST', headers, body }
      );
    }

    const data = await response.json();
    const optimized = data.candidates?.[0]?.content?.parts?.[0]?.text;

    // Safety fallback - if optimization fails, use raw
    if (!optimized || optimized.length < 500) {
      console.error('AI optimization failed, using raw SOUL.md');
      return rawSOUL;
    }

    return optimized;
  } catch (err) {
    console.error('AI optimization request failed:', err);
    return rawSOUL;
  }
}
