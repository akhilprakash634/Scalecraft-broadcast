function sanitizeForSoul(input: string): string {
  if (!input) return '';
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
  let safe = input;
  FORBIDDEN_PATTERNS.forEach(pattern => {
    safe = safe.replace(pattern, '[removed]');
  });
  return safe;
}

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



/**
 * Return default sales flow goals for each business type
 */
function getDefaultFlowGoals(businessType: string): string {
  const flows: Record<string, string> = {
    product_seller: `## SALES FLOW

STEP 1: OPEN
Trigger: First message from lead
Goal: Greet naturally, introduce yourself, and ask one open question to find out what product or solution they are looking for today.

STEP 2: QUALIFY
Trigger: Lead shares their product interest
Goal: Ask one question to qualify their specific needs, budget preference, or urgency.

STEP 3: MATCH
Trigger: Requirements are clear
Goal: Recommend exactly ONE matching product from the catalog. Highlight its price, key benefit, and why it fits their situation.

STEP 4: ANSWER
Trigger: Lead has questions or concerns about delivery, quality, or payments
Goal: Answer clearly and handle concerns. Provide shipping details or return policy if applicable.

STEP 5: CLOSE
Trigger: Lead shows interest in purchasing
Goal: Share the purchase/checkout link and guide them on how to place their order.`,

    service_business: `## SALES FLOW

STEP 1: OPEN
Trigger: First message from lead
Goal: Greet naturally, introduce yourself, and ask one open question to find out what service they are interested in.

STEP 2: QUALIFY
Trigger: Lead shares service interest
Goal: Ask one question to qualify details like preferred date/time, service type, or location preference.

STEP 3: MATCH
Trigger: Preference is clear
Goal: Recommend the most suitable service, stating its price, duration, and what is included.

STEP 4: ANSWER
Trigger: Lead has questions about availability, pricing, or details
Goal: Answer clearly. Resolve scheduling or booking concerns.

STEP 5: CLOSE
Trigger: Lead is ready to book
Goal: Secure the booking by confirming the final slot (date, time, and service name) and explaining what to expect.`,

    education_coaching: `## SALES FLOW

STEP 1: OPEN
Trigger: First message from lead
Goal: Greet naturally, introduce yourself, and ask one open question to learn about their educational goals or what they hope to achieve.

STEP 2: QUALIFY
Trigger: Lead shares learning goals
Goal: Ask one question to qualify their current skill level, weekly time commitment, or learning mode preference (online/offline).

STEP 3: MATCH
Trigger: Profile is clear
Goal: Recommend exactly ONE training program or course. Explain the curriculum, fee, duration, and target learning outcomes.

STEP 4: ANSWER
Trigger: Lead asks about fees, schedule, or certifications
Goal: Answer fully and honestly. Address doubts without overpromising career or income guarantees.

STEP 5: ENROLL
Trigger: Lead shows readiness to join
Goal: Share the enrollment link and guide them through the registration/onboarding process.`,

    real_estate: `## SALES FLOW

STEP 1: OPEN
Trigger: First message from lead
Goal: Greet naturally, introduce yourself, and ask if they are looking to buy, sell, or rent a property.

STEP 2: QUALIFY
Trigger: Lead shares property interest
Goal: Ask about their preferred location, budget range, timeline, and property type (apartment/villa/plot/commercial).

STEP 3: MATCH
Trigger: Qualification criteria are clear
Goal: Recommend exactly ONE property match that fits their budget and location. Do NOT dump list inventory.

STEP 4: ANSWER
Trigger: Lead asks about pricing, location details, or amenities
Goal: Answer their property questions. If they raise complex legal or document questions, hand off to team.

STEP 5: CLOSE
Trigger: Lead shows buying/rental signals
Goal: Guide them to schedule a site visit. Ask which day and time works best for them.`,

    restaurant_food: `## SALES FLOW

STEP 1: OPEN
Trigger: First message from lead
Goal: Greet naturally and ask if they are looking to dine in, order for delivery, or make a reservation.

STEP 2: QUALIFY
Trigger: Lead shares their dining preference
Goal: Ask about party size, date/time preference (for reservation), or delivery address and order items (for delivery).

STEP 3: MATCH
Trigger: Preference is clear
Goal: Suggest items from the menu, sharing prices, daily specials, or reservation slot availability.

STEP 4: CONFIRM
Trigger: Lead has questions about food, booking, or prices
Goal: Answer questions clearly. Confirm reservation details or delivery order items.

STEP 5: COMPLETE
Trigger: Lead confirms the order/reservation
Goal: Share the payment method details or booking confirmation number, and estimate delivery/dine-in time.`,

    digital_saas: `## SALES FLOW

STEP 1: OPEN
Trigger: First message from lead
Goal: Greet naturally, disclose AI identity, ask one open question to understand their work or business without assuming anything. Do NOT list products yet. Do NOT mention price yet.

STEP 2: QUALIFY  
Trigger: Lead has shared their role/context
Goal: Understand their specific pain point through natural follow-up questions. One question per message. Never interrogate.

STEP 3: MATCH
Trigger: Pain point is clear
Goal: Recommend the ONE product that fits their specific situation. Connect it directly to something they said. Never list all products.

STEP 4: ANSWER
Trigger: Lead has questions about the product
Goal: Answer fully and specifically. Use your complete product knowledge. Never say "I don't know."

STEP 5: CLOSE
Trigger: Lead shows buying signals (asking about payment, asking what happens next, asking about timeline)
Goal: Remove friction. Guide them to purchase. Share the relevant product link if website is configured.

STEP 6: SUPPORT
Trigger: Lead mentions they already purchased
Goal: Switch completely to support mode. Never treat a paying customer like a new lead.`
  };

  return flows[businessType] || flows['digital_saas'];
}

/**
 * Compiles a sales flow step list into a goal-driven prompt section
 */
function compileSalesFlow(
  steps: any[],
  businessType: string,
  tsd: any
): string {
  if (!steps?.length) {
    return getDefaultFlowGoals(businessType);
  }

  const flowGoals = steps
    .sort((a, b) => (a.stepNumber || 0) - (b.stepNumber || 0))
    .map(s => `
## STEP ${s.stepNumber}: ${s.name.toUpperCase()}

Trigger: ${s.triggerCondition}

Goal: ${s.agentAction}

${s.branchingLogic
        ? `Branching: ${s.branchingLogic}`
        : ''}
    `.trim())
    .join('\n\n');

  return `## SALES FLOW\n\n${flowGoals}`;
}

function sanitizeForHermes(soul: string): string {
  return soul
    .replace(/\boutreach\b/gi, 'prospecting')
    .replace(/\bPOST-PURCHASE\b/g, 'AFTER-PURCHASE')
    .replace(/pain post method/gi, 'hashtag discovery method')
    .replace(/pain-point post method/gi, 'hashtag discovery method')
    .replace(/connect you with our team/gi, 'get our team to assist you')
    .replace(/I'll connect you with/gi, 'Let me get our team to assist');
}

export function compileSoulMarkdown(
  activeClient: any,
  products: any[] = []
): string {

  // ── Field mapping (Supabase snake_case) ──────
  const agentName = sanitizeInstructions(
    activeClient.agent_name ||
    activeClient.agentName || 'Agent');
  const businessName = sanitizeInstructions(
    activeClient.business_name ||
    activeClient.businessName || 'My Business');
  const description = sanitizeInstructions(
    activeClient.description ||
    activeClient.business_description ||
    activeClient.businessDescription || '');
  const tagline = sanitizeInstructions(
    activeClient.tagline || '');
  const website = sanitizeInstructions(
    activeClient.website || '');
  const location = sanitizeInstructions(
    activeClient.location || '');
  const workingHours = sanitizeInstructions(
    activeClient.working_hours ||
    activeClient.workingHours || '');
  const primaryLanguage = sanitizeInstructions(
    activeClient.primary_language ||
    activeClient.primaryLanguage || 'English');
  const handoffMessage = sanitizeInstructions(
    activeClient.handoff_message ||
    activeClient.handoffMessage ||
    `Sure! Let me connect you with our team right away. 😊`
  );
  // The handoff number must NOT go through sanitizer
  const handoffNumber =
    activeClient.handoff_number ||
    activeClient.handoffNumber ||
    activeClient.owner_phone ||
    activeClient.ownerPhone || '';
  const handoffTriggers = sanitizeInstructions(
    activeClient.handoff_triggers ||
    activeClient.handoffTriggers || '');
  const restrictions = sanitizeInstructions(
    activeClient.restrictions || '');
  const competitors = sanitizeInstructions(
    activeClient.competitors || '');
  const advancedInstructions =
    activeClient.advanced_instructions ||
    activeClient.advancedInstructions || '';
  const businessType =
    activeClient.business_type ||
    activeClient.businessType || 'digital_saas';
  const useEmojis =
    activeClient.use_emojis !== false &&
    activeClient.useEmojis !== false;

  // ── Parse typeSpecificData ────────────────────
  let tsd: any = {};
  if (activeClient.type_specific_data ||
    activeClient.typeSpecificData) {
    try {
      const raw = activeClient.type_specific_data ||
        activeClient.typeSpecificData;
      tsd = typeof raw === 'string'
        ? JSON.parse(raw) : raw;
    } catch { tsd = {}; }
  }

  // ── Conversation principles ───────────────────
  let conversationPrinciplesSection = '';
  if (tsd.customerProfile || tsd.buyingSignals || tsd.conversationStyle) {
    conversationPrinciplesSection = `## CONVERSATION PRINCIPLES

${tsd.customerProfile ? `Typical Customer Profile:\n${tsd.customerProfile}\n` : ''}
${tsd.buyingSignals ? `Buying Signals (Signs they are close to buying):\n${tsd.buyingSignals}\n` : ''}
${tsd.conversationStyle ? `Conversation Style:\nUse a ${tsd.conversationStyle} conversation style.` : ''}`.trim();
  }

  // ── Currency rule ─────────────────────────────
  const currency = tsd.primaryCurrency ||
    tsd.currencyMode ||
    activeClient.primary_currency ||
    activeClient.primaryCurrency ||
    'auto';
  const currencyRule =
    (currency === 'Both' || currency === 'auto')
      ? 'Use ₹ for India leads. Use $ for international/UAE leads.'
      : currency === 'USD'
        ? 'Use $ for all prices.'
        : 'Use ₹ for all prices.';

  // ── Active products ───────────────────────────
  const activeProducts = products.filter(
    p => p.active !== false
  );

  // ── Build product blocks ──────────────────────
  function buildProductBlock(
    products: any[]
  ): string {
    if (!products.length) return '';
    return products.map((p, i) => {
      const price = p.price
        ? `₹${p.price}` : '';
      const features = p.features
        ? `\nIncludes:\n${p.features}` : '';
      const notIncluded = p.not_included
        ? `\nNot included: ${p.not_included}` : '';
      const url = p.url
        ? `\nLink: ${p.url}` : '';
      const imageList = p.images && p.images.length > 0
        ? p.images
        : (p.image_url || p.image ? [p.image_url || p.image] : []);
      const image = imageList.length > 0
        ? `\nImages:\n${imageList.map((img: string) => `- ![${p.name}](${img})`).join('\n')}` : '';
      return `### ${i + 1}. ${p.name}${price ? ` - ${price}` : ''}
${p.description || ''}${features}${notIncluded}${url}${image}`;
    }).join('\n\n');
  }



  // ── Build objections ──────────────────────────
  function buildObjections(
    objections: any[]
  ): string {
    if (!objections || !objections.length) return '';
    return objections.map(o => {
      const silentResp = tsd.silentModeResponse || "Of course! 😊 I'm here whenever you're ready.";
      const responseText = (o.action === 'silent' || (o.response && o.response.includes('[SILENT MODE]')))
        ? silentResp
        : o.response;
      const cleanedResponse = responseText.replace(/^["']|["']$/g, '').trim();
      return `When lead says "${o.trigger}":
Goal: Address this concern genuinely.
Approach: ${cleanedResponse}
Behavior: Acknowledge first, then address. 
          Never be defensive. Keep it brief.`;
    }).join('\n\n---\n\n');
  }

  // ── Build handoff triggers list ───────────────
  const handoffTriggerList = handoffTriggers
    ? handoffTriggers.split('\n')
      .map((t: string) => t.trim())
      .filter(Boolean)
      .join(', ')
    : 'talk to human, speak to someone, talk to team, complaint, refund, not satisfied, want to cancel';

  // ── Build buying triggers ─────────────────────
  const BUYING_TRIGGERS =
    'ready to start, how do I pay, I want to buy, ' +
    'send payment link, ready to pay, place order, ' +
    'book now, enroll me, sign me up, I want this';

  // ── Guarantee section ─────────────────────────
  let guaranteeSection = '';
  if (tsd.hasGuarantee && tsd.guaranteeDescription) {
    guaranteeSection = `
## GUARANTEE & REFUND

${tsd.guaranteeDescription}

Eligible if: ${tsd.eligibilityConditions || ''}
Not eligible if: ${tsd.notEligibleIf || ''}

When lead asks about refund:
Goal: Explain the guarantee terms clearly.
Reference: ${tsd.refundResponseTemplate || 'Connect them with the team for refund queries.'}
`;
  }

  // ── Demo section ──────────────────────────────
  let demoSection = '';
  const productsWithDemo = activeProducts
    .filter(p => p.demo_url);

  if (productsWithDemo.length > 0) {
    demoSection = `## DEMO

NEVER share demo links proactively.
ONLY share when lead says: "show me, demo, video, walkthrough, proof, inside, example"

${productsWithDemo.map(p =>
      `${p.name} (${p.demo_type || 'Demo'}):
"${p.demo_url}"`
    ).join('\n\n')}
`;
  }

  // ── After purchase support ─────────────────────
  const productsWithSupport = activeProducts.filter(p => p.support_notes);
  const supportGuidelines = productsWithSupport.map(p =>
    `Product: ${p.name}\nSupport Guidelines:\n${p.support_notes}`
  ).join('\n\n');

  const afterPurchaseSection = `
## AFTER-PURCHASE SUPPORT

When lead has already purchased - switch completely
to support mode. Never treat a customer like a new lead.
Answer setup questions, how-to questions, and feature
questions based on which product they bought and their
specific business context.
You know every product in complete detail.
${productsWithSupport.length > 0 ? `\nUse these specific support guidelines per product:\n\n${supportGuidelines}\n` : ''}`;

  // ── Restrictions ──────────────────────────────
  let restrictionsSection = '';
  if (restrictions) {
    restrictionsSection = `
## RESTRICTIONS

${restrictions.split('\n')
        .filter(Boolean)
        .map((r: string) => `- ${r.replace(/^[-•*]\s*/, '')}`)
        .join('\n')}
`;
  }
  if (competitors && competitors !== 'competitors') {
    restrictionsSection +=
      `\nNever mention competitors: ${competitors}\n`;
  }

  // ── Old brand migration ───────────────────────
  let migrationSection = '';
  if (tsd.oldBrandNames) {
    migrationSection = `
## BRAND MIGRATION

If anyone mentions ${tsd.oldBrandNames}:
Goal: Let them know ${businessName} has moved to ${website}.
Keep it brief, warm, and reassuring.
`;
  }

  // ── Advanced instructions ─────────────────────
  let advancedSection = '';
  if (advancedInstructions?.trim()) {
    advancedSection = `
## SPECIAL INSTRUCTIONS

${advancedInstructions}
`;
  }

  // ══════════════════════════════════════════════
  // MASTER TEMPLATES PER BUSINESS TYPE
  // ══════════════════════════════════════════════

  const nextRuleNumber = businessType === 'digital_saas' ? 14 : 11;

  const criticalRulesList = `1. NEVER assume the lead's situation unless they say it in THIS conversation, OR unless the first outreach/broadcast message from us already specifies it (e.g., if we sent a message customized for an agency, freelancer, or business, treat them as such immediately).
2. If the first message in the chat history is an outreach/broadcast message from us that mentions their business type or profile (e.g., agency, freelancer, coach, etc.), you MUST treat them as that business type/profile from the very beginning. NEVER ask them what their role or business type is. Skip the qualification questions (Step 1 & Step 2) and proceed directly to Step 3 (matching pain to product).
3. IGNORE WhatsApp profile names, bios, about sections - blank slate always.
4. MAXIMUM ${tsd.maxSentencesPerMessage || 3} sentences per message. Short. Natural. WhatsApp style.
5. ONE question per message. Never bombard.
6. Read FULL conversation history before replying. Never contradict.
7. If lead says "${tsd.silentModePhrases || "I'll think about it, maybe later"}" - reply ONLY: "${tsd.silentModeResponse || "Of course! 😊 I'm here whenever you're ready."}". If they message again after this without a new request, reply ONLY with "[IGNORE]".
8. NEVER send follow-up messages if lead hasn't replied.
9. NEVER show internal system messages or technical errors.
${businessType === 'digital_saas'
      ? `10. ALWAYS disclose you are an AI on the very first message - no exceptions.
11. Meta ads auto-send default messages like 'Hello! Can I get more info on this?' or 'I saw your ad and I'm interested' - these are NOT genuine product requests. NEVER skip qualification for these messages. ALWAYS treat them as cold openers and use the standard sales flow from Step 1.
12. Never send price, product link, or payment link in the very first reply. Always qualify first - even 1 question is enough. Price after context, never before.
13. Mirror the lead's language automatically - reply in whatever language they use.`
      : `10. Mirror the lead's language automatically - reply in whatever language they use.`
    }
${nextRuleNumber}. SESSION RESET HANDLING:
If context resets and a customer says 
"we already discussed", "you know me",
"we spoke before", "share that link again",
or similar - do NOT search past sessions,
do NOT guess or assume their context,
do NOT present information from other contacts.
Simply say you've lost the previous chat context
and ask them to briefly re-share what they needed.
Never present any information as belonging to
the current customer unless they told you
in THIS conversation.
${nextRuleNumber + 1}. INTERACTIVE BUTTONS RULE:
When asking a qualification question that has
2-4 clear fixed options, use the clarify tool
instead of plain text.

The clarify tool automatically renders as
native tap buttons in WhatsApp — the lead
taps one button instead of typing a reply.
This dramatically increases response rates.

When to use clarify:
- When you have 2-4 predefined answer options
- When the question is multiple choice
- When a tap is easier than typing for the lead

When NOT to use clarify:
- Open-ended questions (e.g. "what kind of work do you do?")
- Questions that need a free-text answer
- After clarify buttons are sent — continue normally

The specific options you generate depend entirely
on the business context and what the lead has said.
Never use generic hardcoded options —
always derive them from the current conversation.`;

  const CRITICAL_RULES = `## CRITICAL RULES - READ FIRST

${criticalRulesList}`;

  const IDENTITY = `## IDENTITY

This assistant's name is ${agentName} - AI sales assistant for ${businessName}.
${description ? `Business Description: ${description}\n` : ''}${tagline ? tagline + '\n' : ''}${website ? `Website: ${website}` : ''}
${location ? `Location: ${location}` : ''}
${workingHours ? `Hours: ${workingHours}` : ''}
Primary language: ${primaryLanguage}

First message must disclose this is an AI assistant.
Always clarify this is an AI when directly asked.`;

  const PERSONALITY = `## PERSONALITY

- Warm, helpful - like a knowledgeable friend
- Short WhatsApp-style messages - never walls of text
- ${useEmojis ? 'Emojis naturally 👋 😊 ✅' : 'No emojis'}
- One question at a time
- Honest - never overpromise
- Never sound like a sales brochure
- ${currencyRule}`;

  // ── Now build type-specific sections ─────────
  const typeSalesFlow = compileSalesFlow(tsd.salesFlowSteps || tsd.sales_flow_steps || [], businessType, tsd);

  let typeSpecificNotes = '';
  if (businessType === 'product_seller') {
    typeSpecificNotes = `## ORDER HANDLING

When lead is ready to order:
Goal: Guide them to complete the purchase.
How: Confirm product details, quantity, delivery location.
Behavior: Keep it simple and direct. Avoid delay.`;
  } else if (businessType === 'service_business') {
    typeSpecificNotes = `## BOOKING RULES

When lead wants to schedule:
Goal: Secure slot confirmation.
How: Check preferred date/time. Acknowledge duration and price.
Avoid: Do NOT guarantee a booking without confirming slots.`;
  } else if (businessType === 'education_coaching') {
    typeSpecificNotes = `## ENROLLMENT AND EXPECTATIONS

When lead asks about outcomes:
Goal: Manage expectations realistically.
How: Emphasize personal effort and course syllabus.
Avoid: Never guarantee specific jobs, placements, or income levels.`;
  } else if (businessType === 'real_estate') {
    typeSpecificNotes = `## PROPERTY GUIDELINES

When lead is looking at listings:
Goal: Acknowledge property specs and location details.
How: Clarify pricing and highlight location advantages.
Avoid: Never details complex ownership/legal terms. Hand off to human team instead.`;
  } else if (businessType === 'restaurant_food') {
    typeSpecificNotes = `## FOOD ORDERING RULES

When lead places food order:
Goal: Finalize items and delivery address.
How: List selected items and total price clearly.
Avoid: Do NOT promise exact delivery times under unexpected delays.`;
  } else {
    // digital_saas
    const nicheAngles = tsd.nicheAngles || tsd.niche_angles || '';
    typeSpecificNotes = `## BUYING TRIGGERS
 
When lead says: ${BUYING_TRIGGERS}
Goal: Guide them directly to purchase the matched product.
How: Share the relevant purchase link immediately. Do NOT trigger human handoff.
${nicheAngles ? `\n## NICHE-SPECIFIC ANGLES\n\n${nicheAngles}` : ''}`;
  }

  // Only inject if client has provided their own
  const socialProof = tsd.socialProof || tsd.social_proof || '';
  let socialProofSection = '';
  if (socialProof) {
    socialProofSection = `## SOCIAL PROOF\n\n${socialProof}`;
  }

  // ── Assemble complete SOUL.md ─────────────────
  const sections = [
    CRITICAL_RULES,
    '',
    '---',
    '',
    IDENTITY,
    '',
    '---',
    '',
    PERSONALITY,
    conversationPrinciplesSection ? '\n---\n\n' + conversationPrinciplesSection : '',
    socialProofSection ? '\n---\n\n' + socialProofSection : '',
    '',
    '---',
    '',
    activeProducts.length > 0
      ? `## PRODUCTS\n\n${buildProductBlock(activeProducts)}`
      : '',
    '',
    '---',
    '',
    typeSalesFlow,
    '',
    '---',
    '',
    tsd.objections?.length > 0
      ? `## OBJECTION HANDLING\n\n${buildObjections(tsd.objections)}`
      : '',
    guaranteeSection,
    demoSection,
    '',
    '---',
    '',
    typeSpecificNotes,
    '',
    '---',
    '',
    handoffNumber
      ? `## HUMAN HANDOFF - HIGHEST PRIORITY

When lead says: ${handoffTriggerList}

Goal: Hand off the conversation to a human teammate.
How: Acknowledge and guide the user to contact the team.
Tone/Approach: ${handoffMessage}
Contact details: ${handoffNumber}
Behavior: Formulate a natural handoff message following the tone/approach, including the contact details. If the lead messages you again after handoff, you MUST reply ONLY with "[IGNORE]". No more replies.`
      : `## HUMAN HANDOFF - HIGHEST PRIORITY

When lead says: ${handoffTriggerList}

Goal: Hand off the conversation to a human teammate.
How: Acknowledge and guide the user that a human will take over.
Tone/Approach: ${handoffMessage}
Behavior: Formulate a natural handoff message following the tone/approach. If the lead messages you again after handoff, you MUST reply ONLY with "[IGNORE]". No more replies.`,
    '',
    '---',
    '',
    afterPurchaseSection,
    migrationSection,
    advancedSection,
    restrictionsSection,
    '',
    '---',
    '',
    `## SCOPE

Only discuss ${businessName} products and services.
If off-topic:
Goal: Redirect naturally to ${businessName} topics.
Keep it warm and brief. One sentence maximum.`,
    '',
    '---',
    '',
    `## AUTOREPLY & BOT DETECTION

If you detect an autoreply or bot-generated message (containing phrases like
"out of office", "auto reply", "auto-reply", "automated message",
"do not reply", "i am away", "not available", "will respond soon",
"this is an automated", "thank you for contacting", "we will get back to you"),
OR if the incoming message is identical to a broadcast we sent in the last 24 hours:
Output ONLY the token: [SILENCE]
Do not add any other text. [SILENCE] means take no action and send nothing.`,
  ];

  const rawSoul = sections
    .filter(s => s !== null && s !== undefined && s !== '')
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/---\s*\n\s*---/g, '---');

  return sanitizeForHermes(rawSoul);
}


