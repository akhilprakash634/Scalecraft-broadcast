'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { compileSoulMarkdown } from '@/lib/soulCompiler';
import Button from '@/components/ui/Button';
import {
  FileText,
  Save,
  Eye,
  RefreshCcw,
  CheckCircle,
  AlertTriangle,
  Info,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Settings,
  HelpCircle,
  X,
  Sparkles,
  Briefcase,
  ShieldAlert,
  UserCheck,
  PhoneCall,
  Lock,
  Package,
} from 'lucide-react';

interface PromptConfig {
  agentName: string;
  businessName: string;
  whatsappBotNumber: string;
  description: string;
  website: string;
  handoffNumber: string;
  tone: string;
  language: string;
  maxSentences: number;
  primaryAudience: string;
  keySellingPoints: string;
  handoffTriggers: string;
  restrictions: string;
  competitors: string;
  rawSoul?: string;

  // New fields
  businessType: string;
  tagline: string;
  location: string;
  workingHours: string;
  primaryLanguage: string;
  responseStyle: string;
  responseLength: string;
  useEmojis: boolean;
  collectLeadInfo: boolean;
  useUrgency: boolean;
  handoffMessage: string;
  specialOffers: string;
  advancedInstructions: string;
  typeSpecificData: Record<string, any>;
}

const BUSINESS_TYPES = [
  { value: 'product_seller', label: '🛍️ Product Seller' },
  { value: 'restaurant_food', label: '🍽️ Restaurant & Food' },
  { value: 'service_business', label: '💇 Service Business' },
  { value: 'real_estate', label: '🏠 Real Estate' },
  { value: 'education_coaching', label: '🎓 Education & Coaching' },
  { value: 'digital_saas', label: '💻 Digital & SaaS' }
];

export const SMART_DEFAULTS: Record<string, any> = {
  product_seller: {
    maxSentences: 3,
    oneQuestionPerMessage: true,
    neverFollowUp: true,
    hideSystemErrors: true,
    ignoreProfileInfo: true,
    disclosureFirstMsg: true,
    confirmAIWhenAsked: true,

    silentTriggers: [
      "I'll think about it",
      "maybe later",
      "I'll check",
      "let me think",
      "not now",
      "will get back",
      "busy right now",
      "next month"
    ].join(", "),
    silentResponse: "Of course! 😊 Take your time. I'm here whenever you're ready.",

    currencyMode: "auto",
    currencyIndia: "₹",
    currencyInternational: "$",

    salesFlowSteps: [
      {
        name: "Opener",
        trigger: "First message from lead",
        action: "Greet warmly. Ask what product they are looking for or what problem they want to solve. Do not mention price yet."
      },
      {
        name: "Qualify",
        trigger: "After opener response",
        action: "Ask one question - budget range or whether they need it urgently or are browsing. Use their answer to choose the right product."
      },
      {
        name: "Recommend",
        trigger: "After qualification",
        action: "Suggest one or two specific products with price and one key benefit. Be specific to what they said they need."
      },
      {
        name: "Handle Objection",
        trigger: "Lead hesitates or asks about price or quality",
        action: "Address the concern directly. Mention return policy or guarantee if available. Never pressure."
      },
      {
        name: "Close",
        trigger: "Lead shows interest or asks how to buy",
        action: "Share the product purchase link. Confirm delivery details. Thank them warmly. Stay available for questions."
      }
    ],

    objections: [
      {
        trigger: "too expensive, costly, price is high, can't afford, too much",
        response: "Reframe around value and quality rather than just defending the price. Ask which specific product they're considering so you can find one that fits their budget."
      },
      {
        trigger: "quality doubt, is it original, is it good quality, reviews",
        response: "Reassure the customer by explaining that all products undergo strict quality checks before dispatch. Mention the return policy as a safety net if they aren't satisfied."
      },
      {
        trigger: "delivery time, how long, when will it arrive, fast delivery",
        response: "State that delivery is typically 3–5 working days. Ask for their location to check if express delivery or faster shipping options are available."
      },
      {
        trigger: "COD available, cash on delivery, pay on delivery",
        response: "Confirm that Cash on Delivery (COD) is supported for most locations. Instruct them to select the COD option during checkout."
      },
      {
        trigger: "return policy, can I return, exchange, refund",
        response: "Explain the hassle-free return policy window and offer to share the detailed return guidelines or link."
      },
      {
        trigger: "I'll think about it, maybe later, will decide, not sure yet",
        response: "[SILENT MODE]"
      },
      {
        trigger: "cheaper elsewhere, found it cheaper, other shop has lower price",
        response: "Acknowledge their concern. Emphasize product quality and delivery reliability. Offer to review if they find the identical item with the same quality guarantees."
      },
      {
        trigger: "bulk order, wholesale, large quantity, many pieces",
        response: "Explain that bulk/wholesale pricing is handled directly by the team. Offer to connect them to a representative for custom pricing."
      }
    ],

    handoffTriggers: [
      "bulk order", "wholesale", "large quantity",
      "custom product", "custom order",
      "complaint", "damaged", "wrong item",
      "refund", "money back", "not received",
      "negotiate", "best price", "discount",
      "partnership", "reseller", "distributor"
    ],
    handoffMessage: "Warm and reassuring. Tell them you're connecting them with the product team who will look into their request and get back to them shortly.",
    goSilentAfterHandoff: true,

    restrictions: [
      "Never promise delivery timelines you are not sure about",
      "Never offer discounts without team approval",
      "Never share supplier or cost price information",
      "Never make claims about competitor product quality",
      "Never process complaints - always hand off"
    ],

    buyingTriggers: [
      "ready to order", "how to buy", "add to cart",
      "where to purchase", "send link", "buy now",
      "place order", "how to order", "I want this"
    ]
  },

  restaurant_food: {
    maxSentences: 3,
    oneQuestionPerMessage: true,
    neverFollowUp: true,
    hideSystemErrors: true,
    ignoreProfileInfo: true,
    disclosureFirstMsg: true,
    confirmAIWhenAsked: true,

    silentTriggers: [
      "I'll think about it",
      "maybe later",
      "not now",
      "will decide",
      "let me check the menu"
    ].join(", "),
    silentResponse: "Of course! 😊 Take your time. I'm here whenever you're ready to order.",

    currencyMode: "auto",
    currencyIndia: "₹",
    currencyInternational: "$",

    salesFlowSteps: [
      {
        name: "Opener",
        trigger: "First message from lead",
        action: "Greet warmly. Ask if they want to place a delivery order, dine in, or book a table. One question only."
      },
      {
        name: "Qualify",
        trigger: "After opener",
        action: "For delivery - ask for their area and what they feel like eating. For dine-in - ask party size and preferred time."
      },
      {
        name: "Recommend",
        trigger: "After qualification",
        action: "Suggest today's special or most popular dish that matches their preference or occasion. Mention price."
      },
      {
        name: "Handle Concern",
        trigger: "Lead asks about wait time, price, or dietary options",
        action: "Give a specific honest answer - delivery time, price range, available dietary options. Never guess."
      },
      {
        name: "Confirm",
        trigger: "Lead is ready to order or book",
        action: "Confirm order or reservation details. Share payment link or booking confirmation. Thank them warmly."
      }
    ],

    objections: [
      {
        trigger: "too expensive, costly, price high, cheaper elsewhere",
        response: "Emphasize the use of fresh ingredients and consistent quality. Ask for their budget to recommend a suitable and delicious alternative."
      },
      {
        trigger: "how long delivery, wait time, taking too long",
        response: "State that delivery typically takes 30–45 minutes. Offer to confirm the exact delivery estimate for their specific area or address."
      },
      {
        trigger: "veg only, no meat, halal, jain, gluten free, vegan",
        response: "Confirm that the restaurant offers vegan, vegetarian, halal, jain, or gluten-free options. Ask for their specific dietary preferences to suggest suitable dishes."
      },
      {
        trigger: "hygiene, clean, food safety, quality concern",
        response: "Reassure the customer that food safety and hygiene are top priorities, with fresh preparation and hygienic packaging. Offer details if requested."
      },
      {
        trigger: "minimum order, delivery charge, free delivery",
        response: "Explain that minimum order and delivery charges depend on location. Ask for their area to provide the precise delivery terms."
      },
      {
        trigger: "table available, can I book, reservation",
        response: "Confirm that reservations are available. Ask for their preferred time, date, and party size to check availability."
      },
      {
        trigger: "I'll think about it, maybe later, will decide",
        response: "[SILENT MODE]"
      },
      {
        trigger: "catering, large order, event, party order, bulk",
        response: "Explain that catering and large event orders are managed directly by the team. Offer to connect them to coordinate custom arrangements."
      }
    ],

    handoffTriggers: [
      "catering", "large group", "event order",
      "party booking", "corporate order",
      "complaint", "wrong order", "food quality issue",
      "refund", "money back",
      "franchise", "partnership"
    ],
    handoffMessage: "Polite and helpful. Explain that their request is being routed to the restaurant manager/team, who will resolve it quickly.",
    goSilentAfterHandoff: true,

    restrictions: [
      "Never confirm availability of items you are not sure about",
      "Never promise delivery times beyond standard estimates",
      "Never handle complaints directly - always hand off",
      "Never share kitchen or supplier details",
      "Never offer discounts without team approval"
    ],

    buyingTriggers: [
      "ready to order", "place order", "I want to order",
      "confirm my order", "how to pay", "send payment link",
      "book the table", "confirm booking"
    ]
  },

  service_business: {
    maxSentences: 3,
    oneQuestionPerMessage: true,
    neverFollowUp: true,
    hideSystemErrors: true,
    ignoreProfileInfo: true,
    disclosureFirstMsg: true,
    confirmAIWhenAsked: true,

    silentTriggers: [
      "I'll think about it",
      "maybe later",
      "will check",
      "not sure yet",
      "let me decide",
      "will get back"
    ].join(", "),
    silentResponse: "Of course! 😊 Take your time. I'm here whenever you're ready to book.",

    currencyMode: "auto",
    currencyIndia: "₹",
    currencyInternational: "$",

    salesFlowSteps: [
      {
        name: "Opener",
        trigger: "First message from lead",
        action: "Greet warmly. Ask what service they need or what problem they want to resolve. Do not mention price yet."
      },
      {
        name: "Qualify",
        trigger: "After opener",
        action: "Ask preferred date and time. Ask if they need home service or will visit. Any specific requirements?"
      },
      {
        name: "Recommend",
        trigger: "After qualification",
        action: "Suggest the right service with price, duration, and what is included. Be specific to their situation."
      },
      {
        name: "Handle Concern",
        trigger: "Lead asks about price, availability, or credentials",
        action: "Address concern directly. Mention experience, certifications, or past customer results if available."
      },
      {
        name: "Book",
        trigger: "Lead agrees or asks how to proceed",
        action: "Confirm the appointment slot. Send address or arrival instructions. Thank them warmly."
      }
    ],

    objections: [
      {
        trigger: "too expensive, costly, price high, cheaper elsewhere",
        response: "Explain that pricing reflects the quality, tools, and expertise provided. Ask for their budget to see which service option fits best."
      },
      {
        trigger: "experience, how long, qualified, certified, trust",
        response: "Reassure them by mentioning our track record and satisfied client history. Ask what specific certifications or details they would like to know."
      },
      {
        trigger: "home service, come to my place, visit at home",
        response: "Confirm that home service visits are available. Ask for their location and preferred time to check slot availability."
      },
      {
        trigger: "appointment, when available, next slot, earliest",
        response: "Offer to look up the earliest open slots. Ask for their preferred days or times to narrow down the options."
      },
      {
        trigger: "how long does it take, duration, session time",
        response: "Explain that session duration varies by service (typically 30 mins to 2 hours). Ask which service they are considering to give an exact estimate."
      },
      {
        trigger: "I'll think about it, maybe later, will decide",
        response: "[SILENT MODE]"
      },
      {
        trigger: "corporate, company, office, multiple employees, team",
        response: "Explain that corporate and group bookings are handled directly by the team. Offer to connect them to arrange special packages."
      },
      {
        trigger: "guarantee, what if not satisfied, warranty",
        response: "State that customer satisfaction is the top priority and we will work to make it right if they aren't pleased. Offer to share service terms."
      }
    ],

    handoffTriggers: [
      "corporate booking", "office visit", "team service",
      "custom package", "special requirement",
      "complaint", "not satisfied", "poor service",
      "refund", "money back",
      "negotiate", "discount", "best price",
      "franchise", "partnership"
    ],
    handoffMessage: "Professional and reassuring. Inform them that their request is being forwarded to a booking agent or team representative to assist.",
    goSilentAfterHandoff: true,

    restrictions: [
      "Never confirm appointment slots without checking availability",
      "Never offer discounts without team approval",
      "Never handle complaints directly - always hand off",
      "Never make guarantees beyond standard service terms",
      "Never share staff personal contact details"
    ],

    buyingTriggers: [
      "book now", "confirm appointment", "I want to book",
      "how to pay", "send payment link", "reserve my slot",
      "schedule me", "fix the appointment"
    ]
  },

  real_estate: {
    maxSentences: 3,
    oneQuestionPerMessage: true,
    neverFollowUp: true,
    hideSystemErrors: true,
    ignoreProfileInfo: true,
    disclosureFirstMsg: true,
    confirmAIWhenAsked: true,

    silentTriggers: [
      "I'll think about it",
      "maybe later",
      "need more time",
      "will discuss with family",
      "let me think",
      "will get back"
    ].join(", "),
    silentResponse: "Of course! 😊 Take your time - this is a big decision. I'm here whenever you're ready.",

    currencyMode: "auto",
    currencyIndia: "₹",
    currencyInternational: "$",

    salesFlowSteps: [
      {
        name: "Opener",
        trigger: "First message from lead",
        action: "Greet warmly. Ask if they want to buy, sell, or rent a property. One question only."
      },
      {
        name: "Qualify",
        trigger: "After opener",
        action: "Ask preferred location, budget range, and property type - apartment, villa, plot, or commercial."
      },
      {
        name: "Recommend",
        trigger: "After qualification",
        action: "Describe one or two matching properties with key highlights - location, size, price, and one strong USP."
      },
      {
        name: "Handle Concern",
        trigger: "Lead raises concern about price, location, or size",
        action: "Acknowledge the concern. Suggest an alternative if available, or explain the value clearly. No pressure."
      },
      {
        name: "Site Visit",
        trigger: "Lead shows interest in a property",
        action: "Schedule a site visit or connect them to the agent directly. Confirm date, time, and location details."
      }
    ],

    objections: [
      {
        trigger: "too expensive, price high, over budget, can't afford",
        response: "Acknowledge the budget constraint. Ask for their specific price range so you can identify properties that fit their needs without compromise."
      },
      {
        trigger: "location not good, too far, prefer different area",
        response: "Acknowledge location preferences. Ask which areas or neighborhoods would work best for their daily commute or family lifestyle."
      },
      {
        trigger: "legal, documents, registration, ownership, clear title",
        response: "Assure them that all properties have clear titles and clean paperwork. Offer to connect them to our legal/document specialist for details."
      },
      {
        trigger: "construction quality, builder reputation, materials used",
        response: "Reassure them of construction standards and builder reputation. Offer to send builder credentials or documentation on past projects."
      },
      {
        trigger: "need more time, family decision, will discuss",
        response: "[SILENT MODE]"
      },
      {
        trigger: "loan, home loan, financing, EMI, bank",
        response: "Explain that we partner with major banks to assist with home loans and financing options. Offer to connect them with a loan advisor."
      },
      {
        trigger: "site visit, can I visit, see the property",
        response: "Confirm site visits can be easily arranged. Ask what day and time works best for them to tour the property."
      },
      {
        trigger: "negotiate, best price, lower rate, discount",
        response: "Explain that final price negotiations are handled directly by the sales team. Offer to connect them with a representative to discuss deals."
      }
    ],

    handoffTriggers: [
      "legal query", "documentation", "title verification",
      "loan assistance", "home loan", "EMI calculation",
      "negotiate price", "best rate", "discount",
      "complaint", "issue with property",
      "partnership", "joint venture", "investment deal",
      "sell my property", "list my property"
    ],
    handoffMessage: "Attentive and professional. Reassure them that a real estate specialist will contact them soon with the specific details they requested.",
    goSilentAfterHandoff: true,

    restrictions: [
      "Never confirm property availability without verification",
      "Never quote final prices - always say 'starting from'",
      "Never handle legal or documentation queries directly",
      "Never negotiate prices - always hand off",
      "Never make loan or EMI promises"
    ],

    buyingTriggers: [
      "I want this property", "book it", "how to proceed",
      "what's next", "I'm interested", "confirm the visit",
      "schedule site visit", "how to register"
    ]
  },

  education_coaching: {
    maxSentences: 3,
    oneQuestionPerMessage: true,
    neverFollowUp: true,
    hideSystemErrors: true,
    ignoreProfileInfo: true,
    disclosureFirstMsg: true,
    confirmAIWhenAsked: true,

    silentTriggers: [
      "I'll think about it",
      "maybe later",
      "will check",
      "let me decide",
      "need to discuss",
      "not sure yet"
    ].join(", "),
    silentResponse: "Of course! 😊 Take your time. I'm here whenever you're ready to enroll.",

    currencyMode: "auto",
    currencyIndia: "₹",
    currencyInternational: "$",

    salesFlowSteps: [
      {
        name: "Opener",
        trigger: "First message from lead",
        action: "Greet warmly. Ask what they want to learn or what goal they are trying to achieve. Do not pitch any course yet."
      },
      {
        name: "Qualify",
        trigger: "After opener",
        action: "Ask their current level, available time per week, and preferred format - online, offline, or self-paced."
      },
      {
        name: "Recommend",
        trigger: "After qualification",
        action: "Suggest the most suitable course or program with fee, duration, and the key outcome they will get."
      },
      {
        name: "Handle Concern",
        trigger: "Lead asks about fee, time, or whether it will work",
        action: "Address honestly. Share outcomes or results from past students if available. Never overpromise."
      },
      {
        name: "Enroll",
        trigger: "Lead is interested",
        action: "Share enrollment link or invite them for a free demo class. Keep the next step simple and clear."
      }
    ],

    objections: [
      {
        trigger: "too expensive, fee high, costly, can't afford",
        response: "Frame the fee as an investment in professional skills and future earning potential. Ask for their budget to explore payment options or programs."
      },
      {
        trigger: "no time, too busy, working full time, schedule conflict",
        response: "Highlight flexible learning schedules (weekends, evening classes). Ask what time of day or week works best for their current schedule."
      },
      {
        trigger: "will it actually work, results, guarantee, proof",
        response: "Acknowledge that outcomes depend on student effort, but emphasize our structured support. Offer to share relevant student success stories."
      },
      {
        trigger: "online vs offline, prefer classroom, want physical",
        response: "Compare the flexibility of online learning with the interactive focus of classroom learning. Ask which style aligns better with their goals."
      },
      {
        trigger: "why not YouTube, free content, already watching tutorials",
        response: "Explain the difference between passive video consumption and structured learning with guidance, reviews, feedback, and accountability."
      },
      {
        trigger: "certificate, recognized, valid certificate, placement",
        response: "Confirm the program provides an industry-recognized certificate and portfolio assistance. Offer to share the specific certification details."
      },
      {
        trigger: "I'll think about it, maybe later, will decide",
        response: "[SILENT MODE]"
      },
      {
        trigger: "corporate, company, office, multiple employees, team",
        response: "Explain that corporate and group packages are managed by the team. Offer to connect them to discuss tailored training options."
      }
    ],

    handoffTriggers: [
      "corporate training", "group enrollment", "company batch",
      "custom curriculum", "special program",
      "refund", "money back", "not satisfied",
      "complaint", "issue with course",
      "partnership", "affiliate", "reseller"
    ],
    handoffMessage: "Encouraging and helpful. Mention that an admissions coordinator or mentor will follow up directly to answer their questions.",
    goSilentAfterHandoff: true,

    restrictions: [
      "Never guarantee specific income or job outcomes",
      "Never offer discounts without team approval",
      "Never handle refund requests directly",
      "Never make placement promises without verification",
      "Never compare negatively with specific competitor courses"
    ],

    buyingTriggers: [
      "enroll me", "how to join", "I want to register",
      "send enrollment link", "how to pay",
      "confirm my seat", "book my spot",
      "I want to start", "sign me up"
    ]
  },

  digital_saas: {
    maxSentences: 3,
    oneQuestionPerMessage: true,
    neverFollowUp: true,
    hideSystemErrors: true,
    ignoreProfileInfo: true,
    disclosureFirstMsg: true,
    confirmAIWhenAsked: true,

    silentTriggers: [
      "I'll think about it",
      "maybe later",
      "I'll check",
      "let me think",
      "not now",
      "will get back",
      "busy right now",
      "next month"
    ].join(", "),
    silentResponse: "Of course! 😊 Take your time. I'm here whenever you're ready.",

    currencyMode: "auto",
    currencyIndia: "₹",
    currencyInternational: "$",

    salesFlowSteps: [
      {
        name: "Opener",
        trigger: "First message from lead",
        action: "Greet warmly. Ask ONE open question to understand what kind of work or business they're in - without assuming anything. Do not mention any product yet."
      },
      {
        name: "Qualify by Profile",
        trigger: "After they identify themselves",
        action: "Identify their specific business type or role, then ask a follow-up question to understand their biggest daily challenge or operational bottleneck."
      },
      {
        name: "Match Product to Pain",
        trigger: "After understanding profile and problem",
        action: "Map their pain points to a single relevant product from the catalog (e.g. lead finder, WhatsApp bot, SEO). Present ONLY that matching product with its main benefit."
      },
      {
        name: "Answer All Questions",
        trigger: "Lead asks anything about the matched product",
        action: "Answer fully and specifically. Know every detail - features, pricing, timeline, support. Never say I don't know. If genuinely unsure, offer to connect with the team."
      },
      {
        name: "Share Link",
        trigger: "Lead shows interest",
        action: "Share the product page link and prompt them to take a look, letting them know they can ask questions. Then wait for their response without following up."
      },
      {
        name: "Guide Purchase",
        trigger: "Lead is on the website and has questions",
        action: "Answer every question about the purchase process, payment, onboarding, and what happens after payment. Remove every friction point."
      },
      {
        name: "After Purchase Support",
        trigger: "Lead has already purchased or mentions they are a customer",
        action: "Switch to full support mode. Answer setup questions, how-to questions, and feature questions based on which product they bought and their specific business context. Never treat a paying customer like a new lead."
      }
    ],

    objections: [
      {
        trigger: "too expensive, costly, price high, can't afford, budget tight",
        response: "Reframe pricing around return on investment (ROI). Ask which specific tool or plan they're looking at so you can explain the exact value."
      },
      {
        trigger: "setup fee high, why setup fee, can I skip setup fee",
        response: "Explain that the setup fee covers manual onboarding, dedicated resource deployment, and optimization to ensure high conversion rates."
      },
      {
        trigger: "WhatsApp ban, safe, legal, Meta will block, risky",
        response: "Reassure them of safety standards, dedicated numbering, human-like response behavior, and compliance with Meta's official API policies."
      },
      {
        trigger: "WATI, AiSensy, Interakt, cheaper tool, other platform",
        response: "Highlight our flat-rate pricing (no per-message fees) and advanced conversational intelligence compared to basic, rigid menu trees."
      },
      {
        trigger: "just starting, new freelancer, early stage, maybe when I grow",
        response: "Explain that setting up early prevents losing leads when busy and ensures rapid responses that help win clients over slower competitors."
      },
      {
        trigger: "handle clients personally, AI feels wrong, clients want human",
        response: "Frame the agent as a filter that handles initial 24/7 outreach, leaving complex details and final steps to them, keeping them in control."
      },
      {
        trigger: "not enough leads, low volume, only few enquiries",
        response: "Acknowledge the current volume. Suggest using the tool to ensure zero lead leakage, or recommend prospecting features to grow their list."
      },
      {
        trigger: "AI can't handle, what if wrong answer, not reliable",
        response: "Point out that the agent is trained on specific business parameters (like this conversation) and transfers to a human cleanly for unknown queries."
      },
      {
        trigger: "I'll think about it, maybe later, will decide, not now",
        response: "[SILENT MODE]"
      }
    ],

    handoffTriggers: [
      "custom development", "custom build", "something specific",
      "special requirement", "integrate with my system",
      "can you build", "how much for custom",
      "negotiate", "can you reduce", "best price",
      "any offer", "discount", "cheaper",
      "refund", "money back", "not satisfied",
      "want to cancel", "didn't work",
      "partnership", "reseller", "agency deal",
      "white label", "collaborate", "work together"
    ],
    handoffMessage: "Supportive and friendly. Let them know you are pulling in a team member to assist with their technical or custom inquiry right away.",
    goSilentAfterHandoff: true,

    buyingTriggers: [
      "ready to start", "let's do it",
      "how do I pay", "I want to buy",
      "ready to pay", "send payment link",
      "how to get started", "enroll me",
      "sign me up", "where to purchase"
    ],

    restrictions: [
      "Never negotiate price or offer discounts",
      "Never promise specific ROI or guaranteed results",
      "Never quote custom development costs",
      "Never share team personal contact numbers",
      "Never mention competitor names unprompted"
    ]
  }
};

const DEFAULT_HANDOFF_TRIGGERS = [
  'Custom pricing request',
  'Complaint or issue',
  'Specific appointment booking',
  'Payment problem',
  'Complex technical question',
  'Emergency',
];

export default function InstructionsPage() {
  const [config, setConfig] = useState<PromptConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [productCount, setProductCount] = useState(0);
  const [productsList, setProductsList] = useState<any[]>([]);
  const [showDefaultsBanner, setShowDefaultsBanner] = useState(false);

  // Restart sequence states
  const [saving, setSaving] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // FAQ generation loading state
  const [generatingFaqs, setGeneratingFaqs] = useState(false);

  // Collapsible Advanced Section
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showAgentIntelligence, setShowAgentIntelligence] = useState(true);

  const isFieldEmpty = (val: any) => {
    if (val === undefined || val === null) return true;
    if (typeof val === 'string') return val.trim() === '';
    if (Array.isArray(val)) return val.length === 0;
    if (typeof val === 'object') return Object.keys(val).length === 0;
    return false;
  };

  const checkAllFieldsEmpty = (cfg: PromptConfig) => {
    const fieldsToCheck = [
      cfg.agentName,
      cfg.tagline,
      cfg.workingHours,
      cfg.primaryLanguage,
      cfg.responseStyle,
      cfg.responseLength,
      cfg.primaryAudience,
      cfg.keySellingPoints,
      cfg.specialOffers,
      cfg.handoffTriggers,
      cfg.handoffMessage,
      cfg.restrictions,
    ];
    return fieldsToCheck.every(isFieldEmpty);
  };

  const applyDefaults = (type: string, fillOnlyEmpty: boolean = false) => {
    if (!config) return;
    const def = SMART_DEFAULTS[type as keyof typeof SMART_DEFAULTS] || SMART_DEFAULTS.product_seller;

    const updatedConfig = {
      ...config,
      businessType: type
    };

    if (!fillOnlyEmpty || isFieldEmpty(config.agentName)) updatedConfig.agentName = 'Meera';
    if (!fillOnlyEmpty || isFieldEmpty(config.workingHours)) updatedConfig.workingHours = 'Mon-Sat 9AM-9PM';
    if (!fillOnlyEmpty || isFieldEmpty(config.location)) updatedConfig.location = '';

    const tsd = { ...(config.typeSpecificData || {}) };

    tsd.maxSentencesPerMessage = def.maxSentences;
    tsd.oneQuestionPerMessage = def.oneQuestionPerMessage;
    tsd.neverFollowUp = def.neverFollowUp;
    tsd.neverShowSystemErrors = def.hideSystemErrors;
    tsd.ignoreWhatsAppProfileInfo = def.ignoreProfileInfo;
    tsd.aiDisclosureRequired = def.disclosureFirstMsg;
    tsd.alwaysConfirmAiWhenAsked = def.confirmAIWhenAsked;
    tsd.goSilentAfterHandoff = def.goSilentAfterHandoff;
    tsd.buyingTriggers = def.buyingTriggers;
    tsd.primaryCurrency = 'INR';

    if (!fillOnlyEmpty || isFieldEmpty(tsd.silentModePhrases)) tsd.silentModePhrases = def.silentTriggers;
    if (!fillOnlyEmpty || isFieldEmpty(tsd.silentModeResponse)) tsd.silentModeResponse = def.silentResponse;
    if (!fillOnlyEmpty || isFieldEmpty(updatedConfig.handoffTriggers)) updatedConfig.handoffTriggers = def.handoffTriggers.join('\n');
    if (!fillOnlyEmpty || isFieldEmpty(updatedConfig.handoffMessage)) updatedConfig.handoffMessage = def.handoffMessage;
    if (!fillOnlyEmpty || isFieldEmpty(updatedConfig.restrictions)) updatedConfig.restrictions = def.restrictions.join('\n');

    tsd.salesFlowSteps = def.salesFlowSteps.map((step: any, idx: number) => ({
      stepNumber: idx + 1,
      name: step.name,
      triggerCondition: step.trigger,
      agentAction: step.action,
      branching: ''
    }));

    tsd.objections = def.objections.map((obj: any) => ({
      trigger: obj.trigger,
      response: obj.response,
      action: obj.response === '[SILENT MODE]' ? 'silent' : (obj.response.includes('connect you') ? 'handoff' : 'continue')
    }));

    updatedConfig.typeSpecificData = tsd;
    setConfig(updatedConfig);
    setShowDefaultsBanner(true);
  };

  const handleResetToDefaults = () => {
    if (!config) return;
    const typeLabel = BUSINESS_TYPES.find(bt => bt.value === config.businessType)?.label || config.businessType;
    if (confirm(`This will reset all fields to defaults for ${typeLabel}. Continue?`)) {
      applyDefaults(config.businessType, false);
    }
  };

  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const [generatingObjections, setGeneratingObjections] = useState(false);

  const handleAddStep = () => {
    if (!config) return;
    const steps = config.typeSpecificData?.salesFlowSteps || [];
    const nextNum = steps.length + 1;
    const newStep = { stepNumber: nextNum, name: `Step ${nextNum}`, triggerCondition: '', agentAction: '', branching: '' };
    handleTypeSpecificFieldChange('salesFlowSteps', [...steps, newStep]);
  };

  const handleRemoveStep = (index: number) => {
    if (!config) return;
    const steps = config.typeSpecificData?.salesFlowSteps || [];
    const updated = steps.filter((_: any, idx: number) => idx !== index).map((s: any, idx: number) => ({ ...s, stepNumber: idx + 1 }));
    handleTypeSpecificFieldChange('salesFlowSteps', updated);
  };

  const handleUpdateStep = (index: number, key: string, val: any) => {
    if (!config) return;
    const steps = [...(config.typeSpecificData?.salesFlowSteps || [])];
    steps[index] = { ...steps[index], [key]: val };
    handleTypeSpecificFieldChange('salesFlowSteps', steps);
  };

  const handleAddObjection = () => {
    if (!config) return;
    const obs = config.typeSpecificData?.objections || [];
    handleTypeSpecificFieldChange('objections', [...obs, { trigger: '', response: '', action: 'continue' }]);
  };

  const handleRemoveObjection = (index: number) => {
    if (!config) return;
    const obs = config.typeSpecificData?.objections || [];
    handleTypeSpecificFieldChange('objections', obs.filter((_: any, idx: number) => idx !== index));
  };

  const handleUpdateObjection = (index: number, key: string, val: any) => {
    if (!config) return;
    const obs = [...(config.typeSpecificData?.objections || [])];
    obs[index] = { ...obs[index], [key]: val };
    handleTypeSpecificFieldChange('objections', obs);
  };

  const handleAddDemo = () => {
    if (!config) return;
    const demos = config.typeSpecificData?.demoLinks || [];
    handleTypeSpecificFieldChange('demoLinks', [...demos, { productName: '', linkType: 'Video', url: '', whenToShare: '' }]);
  };

  const handleRemoveDemo = (index: number) => {
    if (!config) return;
    const demos = config.typeSpecificData?.demoLinks || [];
    handleTypeSpecificFieldChange('demoLinks', demos.filter((_: any, idx: number) => idx !== index));
  };

  const handleUpdateDemo = (index: number, key: string, val: any) => {
    if (!config) return;
    const demos = [...(config.typeSpecificData?.demoLinks || [])];
    demos[index] = { ...demos[index], [key]: val };
    handleTypeSpecificFieldChange('demoLinks', demos);
  };

  const handleGenerateObjections = async () => {
    if (!config) return;
    setGeneratingObjections(true);
    try {
      const servicesVal =
        config.typeSpecificData?.servicesOffered ||
        config.typeSpecificData?.specialization ||
        config.typeSpecificData?.coursesOffered ||
        config.description ||
        '';

      const res = await fetch('/api/dashboard/instructions/generate-objections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessType: config.businessType,
          businessName: config.businessName,
          location: config.location,
          services: servicesVal,
          primaryLanguage: config.primaryLanguage,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to generate objections');
      }

      const data = await res.json();
      if (Array.isArray(data.objections)) {
        const currentObjections = config.typeSpecificData?.objections || [];
        handleTypeSpecificFieldChange('objections', [...currentObjections, ...data.objections]);
        alert('✨ 5 AI Objections generated and added to the list!');
      }
    } catch (err: any) {
      alert(err.message || 'Error generating objections. Please check your Gemini API key configurations.');
    } finally {
      setGeneratingObjections(false);
    }
  };

  const fetchConfigData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/dashboard/instructions');
      if (!res.ok) throw new Error('Failed to retrieve agent configurations.');
      const data = await res.json();

      const coreFieldsEmpty = [
        data.agentName,
        data.workingHours,
      ].every(isFieldEmpty);

      if (coreFieldsEmpty) {
        const type = data.businessType || 'product_seller';
        const def = SMART_DEFAULTS[type as keyof typeof SMART_DEFAULTS] || SMART_DEFAULTS.product_seller;

        setConfig({
          ...data,
          agentName: 'Meera',
          workingHours: 'Mon-Sat 9AM-9PM',
          location: '',
          typeSpecificData: {
            ...(data.typeSpecificData || {}),
            maxSentencesPerMessage: def.maxSentences,
            oneQuestionPerMessage: def.oneQuestionPerMessage,
            silentModePhrases: def.silentTriggers,
            silentModeResponse: def.silentResponse,
            neverFollowUp: def.neverFollowUp,
            neverShowSystemErrors: def.hideSystemErrors,
            ignoreWhatsAppProfileInfo: def.ignoreProfileInfo,
            aiDisclosureRequired: def.disclosureFirstMsg,
            alwaysConfirmAiWhenAsked: def.confirmAIWhenAsked,
            goSilentAfterHandoff: def.goSilentAfterHandoff,
            buyingTriggers: def.buyingTriggers,
            primaryCurrency: 'INR',
            salesFlowSteps: def.salesFlowSteps.map((step: any, idx: number) => ({
              stepNumber: idx + 1,
              name: step.name,
              triggerCondition: step.trigger,
              agentAction: step.action,
              branching: ''
            })),
            objections: def.objections.map((obj: any) => ({
              trigger: obj.trigger,
              response: obj.response,
              action: obj.response === '[SILENT MODE]' ? 'silent' : (obj.response.includes('connect you') ? 'handoff' : 'continue')
            }))
          },
          handoffTriggers: def.handoffTriggers.join('\n'),
          handoffMessage: def.handoffMessage,
          restrictions: def.restrictions.join('\n')
        });
        setShowDefaultsBanner(true);
      } else {
        setConfig(data);
      }

      const prodRes = await fetch('/api/dashboard/products');
      const prodData = await prodRes.json();
      if (Array.isArray(prodData)) {
        setProductsList(prodData);
        const activeCount = prodData.filter((p: any) => p.active).length;
        setProductCount(activeCount);
      }
    } catch (err: any) {
      setError(err.message || 'Error loading prompt settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigData();
  }, []);

  const handleChangeField = (key: keyof PromptConfig, value: any) => {
    if (!config) return;
    setConfig({
      ...config,
      [key]: value,
    });
  };

  const handleTypeSpecificFieldChange = (key: string, value: any) => {
    if (!config) return;
    setConfig({
      ...config,
      typeSpecificData: {
        ...(config.typeSpecificData || {}),
        [key]: value,
      },
    });
  };

  const handleBusinessTypeChange = (type: string) => {
    if (!config) return;
    const allEmpty = checkAllFieldsEmpty(config);
    if (allEmpty) {
      applyDefaults(type, false);
    } else {
      if (confirm("Do you want to apply default templates? This will fill empty fields only.")) {
        applyDefaults(type, true);
      } else {
        const def = SMART_DEFAULTS[type as keyof typeof SMART_DEFAULTS] || SMART_DEFAULTS.product_seller;
        setConfig({
          ...config,
          businessType: type,
          typeSpecificData: {
            ...(config.typeSpecificData || {}),
            salesFlowSteps: def.salesFlowSteps.map((step: any, idx: number) => ({
              stepNumber: idx + 1,
              name: step.name,
              triggerCondition: step.trigger,
              agentAction: step.action,
              branching: ''
            })),
            objections: def.objections.map((obj: any) => ({
              trigger: obj.trigger,
              response: obj.response,
              action: obj.response === '[SILENT MODE]' ? 'silent' : (obj.response.includes('connect you') ? 'handoff' : 'continue')
            })),
            silentModePhrases: def.silentTriggers,
            silentModeResponse: def.silentResponse,
            handoffTriggers: def.handoffTriggers,
            buyingTriggers: def.buyingTriggers,
          },
        });
      }
    }
  };

  const handleGenerateFaqs = async () => {
    if (!config) return;
    setGeneratingFaqs(true);
    try {
      const servicesVal =
        config.typeSpecificData?.servicesOffered ||
        config.typeSpecificData?.specialization ||
        config.typeSpecificData?.coursesOffered ||
        config.description ||
        '';

      const res = await fetch('/api/dashboard/instructions/generate-faqs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessType: config.businessType,
          businessName: config.businessName,
          location: config.location,
          services: servicesVal,
          primaryLanguage: config.primaryLanguage,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to generate FAQs');
      }

      const data = await res.json();
      if (data.faqs) {
        const currentFaqs = config.keySellingPoints ? config.keySellingPoints + '\n\n' + data.faqs : data.faqs;
        handleChangeField('keySellingPoints', currentFaqs);
        alert('✨ AI FAQs generated and added to the text area!');
      }
    } catch (err: any) {
      alert(err.message || 'Error generating FAQs. Please check your Gemini API key configurations.');
    } finally {
      setGeneratingFaqs(false);
    }
  };

  const handleResetToDefault = () => {
    if (!confirm('Are you sure you want to reset all prompt fields to default values? Your custom entries will be lost.')) return;
    if (!config) return;

    const def = SMART_DEFAULTS.product_seller;
    setConfig({
      ...config,
      agentName: 'Meera',
      businessName: config.businessName,
      description: 'An intelligent WhatsApp sales agent helper.',
      website: 'https://thescalecraft.in',
      handoffNumber: config.handoffNumber,
      tone: 'Friendly',
      language: 'English',
      maxSentences: 3,
      primaryAudience: 'Potential buyers and leads',
      keySellingPoints: 'Instant support 24/7\nObjection handling',
      handoffTriggers: def.handoffTriggers.join('\n'),
      restrictions: def.restrictions.join('\n'),
      competitors: 'competitors',
      businessType: 'product_seller',
      tagline: '',
      location: '',
      workingHours: 'Mon-Sat 9AM-9PM',
      primaryLanguage: 'English',
      responseStyle: 'Friendly',
      responseLength: 'Medium',
      useEmojis: true,
      collectLeadInfo: true,
      useUrgency: true,
      handoffMessage: def.handoffMessage,
      specialOffers: '',
      advancedInstructions: '',
      typeSpecificData: {
        maxSentencesPerMessage: def.maxSentences,
        oneQuestionPerMessage: def.oneQuestionPerMessage,
        silentModePhrases: def.silentTriggers,
        silentModeResponse: def.silentResponse,
        neverFollowUp: def.neverFollowUp,
        neverShowSystemErrors: def.hideSystemErrors,
        ignoreWhatsAppProfileInfo: def.ignoreProfileInfo,
        aiDisclosureRequired: def.disclosureFirstMsg,
        alwaysConfirmAiWhenAsked: def.confirmAIWhenAsked,
        goSilentAfterHandoff: def.goSilentAfterHandoff,
        buyingTriggers: def.buyingTriggers,
        primaryCurrency: 'INR',
        salesFlowSteps: def.salesFlowSteps.map((step: any, idx: number) => ({
          stepNumber: idx + 1,
          name: step.name,
          triggerCondition: step.trigger,
          agentAction: step.action,
          branching: ''
        })),
        objections: def.objections.map((obj: any) => ({
          trigger: obj.trigger,
          response: obj.response,
          action: obj.response === '[SILENT MODE]' ? 'silent' : (obj.response.includes('connect you') ? 'handoff' : 'continue')
        }))
      },
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;

    setSaving(true);
    setError('');
    setSuccessMessage('⏳ Generating SOUL.md');

    const stepTimer1 = setTimeout(() => {
      setSuccessMessage('✅ Generating SOUL.md\n⏳ Writing to server...');
    }, 1500);

    try {
      const res = await fetch('/api/dashboard/instructions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      clearTimeout(stepTimer1);

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update agent instructions.');
      }

      setSuccessMessage('✅ Generating SOUL.md\n✅ Writing to server\n⏳ Restarting agent...');
      fetchConfigData();

      setCountdown(10);

      const getStatusMessage = (sec: number) => {
        if (sec > 7) return "✅ Generating SOUL.md\n✅ Writing to server\n⏳ Restarting agent... (Stopping gateway)";
        if (sec > 5) return "✅ Generating SOUL.md\n✅ Writing to server\n⏳ Restarting agent... (Clearing cache)";
        if (sec > 2) return "✅ Generating SOUL.md\n✅ Writing to server\n⏳ Restarting agent... (Starting gateway)";
        return "✅ Generating SOUL.md\n✅ Writing to server\n⏳ Restarting agent... (Verifying)";
      };

      setSuccessMessage(getStatusMessage(10));

      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setSaving(false);
            setSuccessMessage('✅ Agent updated successfully!');
            setTimeout(() => setSuccessMessage(''), 5000);
            return 0;
          }
          const nextSec = prev - 1;
          setSuccessMessage(getStatusMessage(nextSec));
          return nextSec;
        });
      }, 1000);
    } catch (err: any) {
      clearTimeout(stepTimer1);
      setError(err.message || 'Error updating instructions.');
      setSaving(false);
    }
  };

  const getCompiledSoul = () => {
    if (!config) return '';
    return compileSoulMarkdown(config, productsList);
  };

  const handlePreviewMarkdown = () => {
    setPreviewContent(getCompiledSoul());
    setShowPreviewModal(true);
  };

  if (loading || !config) {
    return <div className="bg-white rounded-xl border border-gray-200 h-96 animate-pulse" />;
  }

  const warnings: string[] = [];
  if (config) {
    if (!config.keySellingPoints?.trim()) {
      warnings.push("⚠️ Key Value Propositions / FAQ Details is empty - your agent won't know what makes your business special");
    }
    if (!config.description?.trim()) {
      warnings.push("⚠️ Agent Core Role is empty - your agent won't understand its role");
    }
    if (!config.primaryAudience?.trim()) {
      warnings.push("⚠️ Target Audience is empty - your agent won't know who they are selling to");
    }
  }

  return (
    <div className="p-6 space-y-6 select-none max-w-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border dark:border-border pb-4">
        <div>
          <h1 className="text-xl font-black text-text-primary tracking-tight font-sans flex items-center gap-2">
            <Briefcase className="text-brand" size={20} />
            <span>AI Agent Configuration</span>
          </h1>
          <p className="text-xs font-semibold text-text-muted mt-1">
            Customize agent behavior, core offers, tone, sales strategies, and handoff settings.
          </p>
        </div>

        <div className="flex items-center gap-2.5 text-xs font-black uppercase">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviewMarkdown}
            disabled={loading || saving}
            icon={<Eye size={14} />}
          >
            Preview SOUL.md
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleResetToDefault}
            disabled={loading || saving}
            className="text-danger border-danger/25 hover:bg-danger-bg"
            icon={<RefreshCcw size={14} />}
          >
            Reset Defaults
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-danger-bg border border-red-200 text-danger text-xs font-semibold p-4 rounded-xl flex items-center gap-2 animate-fadeIn">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="bg-success-bg border border-green-200 text-success text-xs font-semibold p-4 rounded-xl space-y-2 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-2 whitespace-pre-line leading-relaxed">
              <CheckCircle size={16} className="mt-0.5 text-success shrink-0" />
              <span>{successMessage}</span>
            </div>
            {countdown > 0 && (
              <span className="bg-success text-white px-2.5 py-1 rounded font-mono text-[10px] font-black uppercase">
                Restarting in {countdown}s
              </span>
            )}
          </div>
          {successMessage.includes('successfully') && (
            <div className="text-[10px] text-success/90 pl-6 leading-relaxed font-bold uppercase tracking-wide">
              Agent updated! Active conversations will utilize these settings immediately.
            </div>
          )}
        </div>
      )}

      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((w, idx) => (
            <div key={idx} className="bg-warning-bg border border-amber-250 text-warning text-xs font-semibold p-4 rounded-xl flex items-center gap-2 animate-fadeIn">
              <AlertTriangle size={16} className="shrink-0 text-warning" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {showDefaultsBanner && (
        <div className="bg-brand-light/35 border border-brand/20 rounded-xl p-4 flex items-start gap-3 text-xs text-brand-dark animate-fadeIn shadow-xs font-semibold leading-relaxed">
          <Sparkles size={16} className="text-brand shrink-0 mt-0.5" />
          <div className="flex-1">
            <p>✨ Smart defaults loaded based on your business type. Customize these templates below to fit your company!</p>
          </div>
          <button type="button" onClick={() => setShowDefaultsBanner(false)} className="text-brand hover:text-brand-dark font-black cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Safety guidelines banner */}
      <div className="bg-info-bg border border-blue-200 text-info text-xs font-semibold p-4 rounded-xl flex items-start gap-2.5">
        <Info size={16} className="shrink-0 mt-0.5 text-info" />
        <div>
          <p className="leading-relaxed">
            <strong>ScaleCraft Engine:</strong> Form inputs organize settings to compile a clean, guardrailed SOUL.md instruction file on your VPS database cache.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="h-96 bg-white border border-border rounded-xl animate-pulse dark:bg-surface-1 dark:border-border" />
      ) : (
        <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form Fields */}
          <div className="lg:col-span-2 space-y-6">

            {/* STEP 1: Business Type Selector at top */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-2xs space-y-4">
              <div className="border-b border-gray-100 pb-2 flex items-center space-x-2">
                <Sparkles size={16} className="text-blue-600" />
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                  1. Business Type
                </h3>
              </div>
              <div className="space-y-1">
                <label htmlFor="business-type-select" className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Select Sector / Business Category
                </label>
                <select
                  id="business-type-select"
                  value={config?.businessType}
                  onChange={(e) => handleBusinessTypeChange(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2.5 bg-white font-semibold focus:outline-none focus:border-blue-600 cursor-pointer text-gray-900"
                >
                  {BUSINESS_TYPES.map((bt) => (
                    <option key={bt.value} value={bt.value}>
                      {bt.label}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
                  Changing the business type updates relevant forms and templates.
                </p>
              </div>
            </div>

            {/* SECTION 2: Business Identity (all types) */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-2xs space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide border-b border-gray-100 pb-2">
                2. Business Identity
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor="agent-name" className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    Agent Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="agent-name"
                    type="text"
                    required
                    value={config?.agentName}
                    onChange={(e) => handleChangeField('agentName', e.target.value)}
                    placeholder="e.g. Meera"
                    className="w-full text-xs border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-600 text-gray-900 focus:bg-white bg-gray-50/50"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="business-name" className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    Business Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="business-name"
                    type="text"
                    required
                    value={config?.businessName}
                    onChange={(e) => handleChangeField('businessName', e.target.value)}
                    placeholder="e.g. Priyas Cafe"
                    className="w-full text-xs border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-600 text-gray-900 focus:bg-white bg-gray-50/50"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="tagline" className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Tagline / One-liner
                </label>
                <input
                  id="tagline"
                  type="text"
                  value={config?.tagline}
                  onChange={(e) => handleChangeField('tagline', e.target.value)}
                  placeholder="e.g. Quality products at your fingertips"
                  className="w-full text-xs border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-600 text-gray-900 focus:bg-white bg-gray-50/50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor="business-web" className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    Business Website
                  </label>
                  <input
                    id="business-web"
                    type="url"
                    value={config?.website}
                    onChange={(e) => handleChangeField('website', e.target.value)}
                    placeholder="https://myshop.com"
                    className="w-full text-xs border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-600 text-gray-900 focus:bg-white bg-gray-50/50"
                  />
                </div>

                <div className="space-y-1">
                  <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    WhatsApp Bot Number (Read-only)
                  </span>
                  <div className="w-full text-xs border border-gray-200 bg-gray-50 text-gray-500 rounded-lg px-4 py-2.5 font-mono select-all select-none">
                    {config?.whatsappBotNumber || 'No number connected'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor="location-area" className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    Business Location / Area <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="location-area"
                    type="text"
                    required
                    value={config?.location}
                    onChange={(e) => handleChangeField('location', e.target.value)}
                    placeholder="e.g. Kochi, Kerala or Dubai, UAE"
                    className="w-full text-xs border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-600 text-gray-900 focus:bg-white bg-gray-50/50"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="working-hours" className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    Working Hours <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="working-hours"
                    type="text"
                    required
                    value={config?.workingHours}
                    onChange={(e) => handleChangeField('workingHours', e.target.value)}
                    placeholder="e.g. Mon-Sat 9AM-9PM, Sunday closed"
                    className="w-full text-xs border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-600 text-gray-900 focus:bg-white bg-gray-50/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor="handoff-num" className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    Handoff WhatsApp Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="handoff-num"
                    type="text"
                    required
                    value={config?.handoffNumber}
                    onChange={(e) => handleChangeField('handoffNumber', e.target.value)}
                    placeholder="e.g. 918078004732"
                    className="w-full text-xs border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-600 text-gray-900 focus:bg-white bg-gray-50/50"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="primary-lang-select" className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    Primary Language <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="primary-lang-select"
                    value={config?.primaryLanguage}
                    onChange={(e) => handleChangeField('primaryLanguage', e.target.value)}
                    className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:border-blue-600 cursor-pointer text-gray-900 font-semibold"
                  >
                    <option value="English">English</option>
                    <option value="Malayalam">Malayalam</option>
                    <option value="Hindi">Hindi</option>
                    <option value="Tamil">Tamil</option>
                    <option value="Telugu">Telugu</option>
                    <option value="Arabic">Arabic</option>
                    <option value="Mixed">Mixed (English + Local)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="description" className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Business Description
                </label>
                <input
                  id="description"
                  type="text"
                  value={config?.description}
                  onChange={(e) => handleChangeField('description', e.target.value)}
                  placeholder="Briefly state what your company does"
                  className="w-full text-xs border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-600 text-gray-900 focus:bg-white bg-gray-50/50"
                />
              </div>
            </div>

            {/* Products auto-loaded banner */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-2xs flex items-center justify-between gap-4">
              <div className="flex items-start space-x-3">
                <span className="text-xl shrink-0">📦</span>
                <div>
                  <p className="text-[13px] font-semibold text-gray-900">Products auto-loaded from catalog</p>
                  <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                    Your {productCount} active product{productCount !== 1 ? 's are' : ' is'} automatically included in your agent&apos;s knowledge base.
                  </p>
                </div>
              </div>
              <Link
                href="/dashboard/products"
                className="shrink-0 text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center space-x-0.5 whitespace-nowrap"
              >
                <span>Edit Products</span>
                <ChevronRight size={14} />
              </Link>
            </div>

            {/* Advanced Settings Toggle */}
            <div className="flex items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-205 my-4 shadow-2xs">
              <div className="flex items-center space-x-2">
                <Settings size={18} className="text-gray-500" />
                <div>
                  <span className="text-xs font-semibold text-gray-800">Advanced Prompt Customization</span>
                  <p className="text-[9px] text-gray-500 font-medium mt-0.5">Configure conversation steps, objections, silent mode, and restrictions.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className={`text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer transition-colors border h-9 flex items-center justify-center ${showAdvanced
                    ? 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    : 'bg-blue-600 text-white border-transparent hover:bg-blue-700 shadow-2xs'
                  }`}
              >
                {showAdvanced ? 'Hide Advanced Settings' : 'Show Advanced Settings'}
              </button>
            </div>

            {showAdvanced && (
              <div className="space-y-6 animate-fadeIn">
                {/* SECTION 3: Sales Focus */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                      Sales Focus & Knowledge
                    </h3>

                    <button
                      type="button"
                      onClick={handleGenerateFaqs}
                      disabled={generatingFaqs}
                      className="flex items-center space-x-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 text-[10px] font-bold uppercase px-2.5 py-1.5 rounded-lg border border-blue-200 transition-colors cursor-pointer"
                    >
                      <Sparkles size={11} className={generatingFaqs ? 'animate-spin' : ''} />
                      <span>{generatingFaqs ? 'Generating...' : 'Generate FAQs with AI'}</span>
                    </button>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="audience-input" className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      Primary Target Audience
                    </label>
                    <textarea
                      id="audience-input"
                      rows={2}
                      value={config?.primaryAudience}
                      onChange={(e) => handleChangeField('primaryAudience', e.target.value)}
                      placeholder="Describe your ideal customer groups..."
                      className="w-full text-xs border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-600 text-gray-900 focus:bg-white bg-gray-50/50"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="value-proposition" className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      Main Value Proposition <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="value-proposition"
                      rows={2}
                      placeholder="What makes your business stand out?"
                      value={config?.keySellingPoints?.split('\n\n')[0] || ''}
                      onChange={(e) => {
                        const parts = config?.keySellingPoints?.split('\n\n') || [];
                        parts[0] = e.target.value;
                        handleChangeField('keySellingPoints', parts.join('\n\n'));
                      }}
                      className="w-full text-xs border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-600 text-gray-900 focus:bg-white bg-gray-50/50"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="selling-points" className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center justify-between">
                      <span>Common Customer Questions / FAQs</span>
                      <span className="text-[9px] text-gray-400 normal-case font-semibold">Q: ... A: ... format</span>
                    </label>
                    <textarea
                      id="selling-points"
                      rows={6}
                      value={config?.keySellingPoints?.split('\n\n').slice(1).join('\n\n') || ''}
                      onChange={(e) => {
                        const parts = config?.keySellingPoints?.split('\n\n') || [];
                        const valueProp = parts[0] || '';
                        handleChangeField('keySellingPoints', valueProp + '\n\n' + e.target.value);
                      }}
                      placeholder="Paste or write common Q&A lists here."
                      className="w-full text-xs font-mono border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-600 text-gray-900 focus:bg-white bg-gray-50/50 leading-relaxed"
                    />
                  </div>

                  <div className="space-y-1 border-t border-gray-100 pt-4">
                    <label htmlFor="special-offers" className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      Special Offers / Promotions
                    </label>
                    <textarea
                      id="special-offers"
                      rows={2}
                      value={config?.specialOffers}
                      onChange={(e) => handleChangeField('specialOffers', e.target.value)}
                      placeholder="e.g. First visit gets 10% off!"
                      className="w-full text-xs border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-600 text-gray-900 focus:bg-white bg-gray-50/50"
                    />
                  </div>
                </div>

                {/* Voice Settings */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-2xs space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide border-b border-gray-100 pb-2">
                    Voice Settings
                  </h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="block text-xs font-bold text-gray-900">Voice Replies</span>
                      <p className="text-[10px] text-gray-500 font-medium mt-0.5">Reply to incoming WhatsApp voice messages with a voice response.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleTypeSpecificFieldChange('voiceRepliesEnabled', !config.typeSpecificData?.voiceRepliesEnabled)}
                      className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${config.typeSpecificData?.voiceRepliesEnabled ? 'bg-blue-600' : 'bg-gray-300'}`}
                    >
                      <span className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${config.typeSpecificData?.voiceRepliesEnabled ? 'translate-x-6' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Currency & Pricing Rules */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-2xs space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide border-b border-gray-100 pb-2">
                    Currency & Pricing Rules
                  </h3>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      Primary Currency
                    </label>
                    <select
                      value={config.typeSpecificData?.primaryCurrency || 'INR'}
                      onChange={(e) => handleTypeSpecificFieldChange('primaryCurrency', e.target.value)}
                      className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2.5 bg-white font-semibold focus:outline-none focus:border-blue-600 cursor-pointer text-gray-900"
                    >
                      <option value="INR">₹ INR</option>
                      <option value="USD">$ USD</option>
                      <option value="AED">AED</option>
                      <option value="Both">Both (India → ₹, International/UAE → $)</option>
                    </select>
                    {config.typeSpecificData?.primaryCurrency === 'Both' && (
                      <p className="text-[10px] text-blue-600 font-semibold mt-1 leading-relaxed">
                        💡 Auto-detection active: The system will automatically serve INR (₹) to +91 country code leads, and USD ($) to all other prefix phone numbers.
                      </p>
                    )}
                  </div>
                </div>

                {/* Agent Intelligence */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-2xs space-y-4">
                  <button
                    type="button"
                    onClick={() => setShowAgentIntelligence(!showAgentIntelligence)}
                    className="w-full flex items-center justify-between border-b border-gray-100 pb-2 text-left cursor-pointer"
                  >
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                      Agent Intelligence (How Your Agent Thinks)
                    </h3>
                    {showAgentIntelligence ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
                  </button>

                  {showAgentIntelligence && (
                    <div className="space-y-4 animate-fadeIn">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                          Who are your typical customers?
                        </label>
                        <textarea
                          rows={3}
                          value={config.typeSpecificData?.customerProfile || ''}
                          onChange={(e) => handleTypeSpecificFieldChange('customerProfile', e.target.value)}
                          placeholder="Describe who buys from you, what they're struggling with, and what they already know. e.g. 'Freelancers in South India, good at their craft but inconsistent with finding clients. Usually tried Instagram DMs with no results.'"
                          className="w-full text-xs border border-gray-200 rounded-lg px-4 py-2 bg-white focus:outline-none focus:border-blue-600 text-gray-900 focus:bg-white bg-gray-50/50"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                          How do you know someone is close to buying?
                        </label>
                        <textarea
                          rows={3}
                          value={config.typeSpecificData?.buyingSignals || ''}
                          onChange={(e) => handleTypeSpecificFieldChange('buyingSignals', e.target.value)}
                          placeholder="e.g. 'They ask about payment methods, ask how fast they can start, or start asking what happens after purchase'"
                          className="w-full text-xs border border-gray-200 rounded-lg px-4 py-2 bg-white focus:outline-none focus:border-blue-600 text-gray-900 focus:bg-white bg-gray-50/50"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                          Conversation Style
                        </label>
                        <select
                          value={config.typeSpecificData?.conversationStyle || 'Consultative (ask, listen, recommend)'}
                          onChange={(e) => handleTypeSpecificFieldChange('conversationStyle', e.target.value)}
                          className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2.5 bg-white font-semibold focus:outline-none focus:border-blue-600 cursor-pointer text-gray-900"
                        >
                          <option value="Consultative (ask, listen, recommend)">Consultative (ask, listen, recommend)</option>
                          <option value="Direct (get to the point fast)">Direct (get to the point fast)</option>
                          <option value="Warm (friendly, relationship-first)">Warm (friendly, relationship-first)</option>
                          <option value="Professional (formal, precise)">Professional (formal, precise)</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Sales Flow Builder */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                      Sales Flow Builder
                    </h3>
                    <button
                      type="button"
                      onClick={handleAddStep}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg cursor-pointer h-7 flex items-center justify-center shadow-2xs"
                    >
                      + Add Step
                    </button>
                  </div>

                  <p className="text-[10px] text-gray-500 font-medium leading-relaxed bg-gray-50 border border-gray-100 rounded-lg p-3">
                    💡 These steps guide how your agent handles conversations. They are pre-filled based on your business type. Customize the messages to match your exact style!
                  </p>

                  <div className="space-y-4">
                    {(config.typeSpecificData?.salesFlowSteps || []).map((step: any, index: number) => (
                      <div key={index} className="border border-gray-200 rounded-xl p-4 bg-gray-55/40 space-y-3 relative">
                        <button
                          type="button"
                          onClick={() => handleRemoveStep(index)}
                          className="absolute top-3 right-3 text-red-500 hover:text-red-700 cursor-pointer"
                        >
                          <X size={16} />
                        </button>

                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <span className="block text-[9px] uppercase font-bold text-gray-400">Step Number</span>
                            <span className="text-xs font-bold text-gray-900">{step.stepNumber}</span>
                          </div>
                          <div className="col-span-2">
                            <label className="block text-[9px] uppercase font-bold text-gray-400">Step Name</label>
                            <input
                              type="text"
                              value={step.name}
                              onChange={(e) => handleUpdateStep(index, 'name', e.target.value)}
                              placeholder="e.g. Opener, Qualify"
                              className="w-full text-xs border border-gray-200 rounded bg-white px-2 py-1 focus:outline-none focus:border-blue-600 text-gray-900"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[9px] uppercase font-bold text-gray-400">Trigger Condition</label>
                          <textarea
                            rows={1}
                            value={step.triggerCondition}
                            onChange={(e) => handleUpdateStep(index, 'triggerCondition', e.target.value)}
                            placeholder="When to use this step (e.g. First message from lead)"
                            className="w-full text-xs border border-gray-200 rounded bg-white px-2 py-1 focus:outline-none focus:border-blue-600 text-gray-900"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[9px] uppercase font-bold text-gray-400">Goal for This Step</label>
                          <textarea
                            rows={2}
                            value={step.agentAction}
                            onChange={(e) => handleUpdateStep(index, 'agentAction', e.target.value)}
                            placeholder="What should the agent ACHIEVE in this step? (Not exact words - describe the objective. e.g. 'Understand their biggest challenge before recommending anything')"
                            className="w-full text-xs border border-gray-200 rounded bg-white px-2 py-1 focus:outline-none focus:border-blue-600 text-gray-900"
                          />
                          <p className="text-[10px] text-blue-600 font-semibold mt-1 leading-relaxed">
                            💡 Describe the GOAL, not the exact message. Your agent will naturally generate its own wording based on each conversation.
                          </p>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[9px] uppercase font-bold text-gray-400">Branching Logic (Optional)</label>
                          <input
                            type="text"
                            value={step.branching || ''}
                            onChange={(e) => handleUpdateStep(index, 'branching', e.target.value)}
                            placeholder="If lead says X -> go to Step Y"
                            className="w-full text-xs border border-gray-200 rounded bg-white px-2 py-1 focus:outline-none focus:border-blue-600 text-gray-900"
                          />
                        </div>
                      </div>
                    ))}
                    {(config.typeSpecificData?.salesFlowSteps || []).length === 0 && (
                      <p className="text-xs text-gray-500 italic text-center py-2">No custom flow steps added. Click Add Step to build.</p>
                    )}
                  </div>
                </div>

                {/* Objection Handling */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                      Objection Handling
                    </h3>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={handleGenerateObjections}
                        disabled={generatingObjections}
                        className="bg-blue-50 hover:bg-blue-105 text-blue-600 border border-blue-200 text-[10px] font-bold uppercase px-2.5 py-1.5 rounded-lg cursor-pointer h-7 flex items-center"
                      >
                        {generatingObjections ? 'Generating...' : 'Generate with AI'}
                      </button>
                      <button
                        type="button"
                        onClick={handleAddObjection}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg cursor-pointer h-7 flex items-center shadow-2xs"
                      >
                        + Add Objection
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {(config.typeSpecificData?.objections || []).map((obj: any, index: number) => (
                      <div key={index} className="border border-gray-200 rounded-xl p-4 bg-gray-55/40 space-y-3 relative">
                        <button
                          type="button"
                          onClick={() => handleRemoveObjection(index)}
                          className="absolute top-3 right-3 text-red-500 hover:text-red-700 cursor-pointer"
                        >
                          <X size={16} />
                        </button>

                        <div className="space-y-1">
                          <label className="block text-[9px] uppercase font-bold text-gray-400">What lead says (Objection)</label>
                          <input
                            type="text"
                            value={obj.trigger}
                            onChange={(e) => handleUpdateObjection(index, 'trigger', e.target.value)}
                            placeholder="e.g. Too expensive, I'll think about it"
                            className="w-full text-xs border border-gray-200 rounded bg-white px-2 py-1.5 focus:outline-none focus:border-blue-600 text-gray-900"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[9px] uppercase font-bold text-gray-400">Guidance for Addressing This</label>
                          <textarea
                            rows={2}
                            value={obj.response}
                            onChange={(e) => handleUpdateObjection(index, 'response', e.target.value)}
                            placeholder="What approach should the agent take? (e.g. 'Reframe as ROI - compare cost per day to value of one client')"
                            className="w-full text-xs border border-gray-200 rounded bg-white px-2 py-1.5 focus:outline-none focus:border-blue-600 text-gray-900"
                          />
                          <p className="text-[10px] text-blue-600 font-semibold mt-1 leading-relaxed">
                            💡 Give your agent the REASONING, not a script. It will phrase this naturally each time.
                          </p>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[9px] uppercase font-bold text-gray-400">Action After Response</label>
                          <select
                            value={obj.action || 'continue'}
                            onChange={(e) => handleUpdateObjection(index, 'action', e.target.value)}
                            className="w-full text-xs border border-gray-200 rounded bg-white px-2 py-1 focus:outline-none focus:border-blue-600 text-gray-900 font-semibold"
                          >
                            <option value="continue">Continue conversation</option>
                            <option value="silent">Go silent</option>
                            <option value="handoff">Human handoff</option>
                          </select>
                        </div>
                      </div>
                    ))}
                    {(config.typeSpecificData?.objections || []).length === 0 && (
                      <p className="text-xs text-gray-500 italic text-center py-2">No custom objection rules configured. Click Add or Generate with AI.</p>
                    )}
                  </div>
                </div>

                {/* Silent Mode Customization */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-2xs space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide border-b border-gray-100 pb-2 flex items-center space-x-2">
                    <Lock size={16} className="text-blue-600" />
                    <span>Silent Mode Customization</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                        Silent Mode Phrases (comma separated)
                      </label>
                      <textarea
                        rows={2}
                        value={config.typeSpecificData?.silentModePhrases || ''}
                        onChange={(e) => handleTypeSpecificFieldChange('silentModePhrases', e.target.value)}
                        placeholder="e.g. I'll think about it, maybe later"
                        className="w-full text-xs border border-gray-200 rounded-lg px-4 py-2 bg-white focus:outline-none focus:border-blue-600 text-gray-900 focus:bg-white bg-gray-50/50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                        Reply ONLY this when Silent Mode triggers
                      </label>
                      <textarea
                        rows={2}
                        value={config.typeSpecificData?.silentModeResponse || ''}
                        onChange={(e) => handleTypeSpecificFieldChange('silentModeResponse', e.target.value)}
                        placeholder="e.g. Of course! 😊 I'm here whenever you're ready."
                        className="w-full text-xs border border-gray-200 rounded-lg px-4 py-2 bg-white focus:outline-none focus:border-blue-600 text-gray-900 focus:bg-white bg-gray-50/50"
                      />
                    </div>
                  </div>
                </div>

                {/* Demo & Media Links */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                      Demo & Media Links
                    </h3>
                    <button
                      type="button"
                      onClick={handleAddDemo}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg cursor-pointer h-7 flex items-center justify-center shadow-2xs"
                    >
                      + Add Demo Link
                    </button>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      Share demo link ONLY when lead says:
                    </label>
                    <input
                      type="text"
                      value={config.typeSpecificData?.demoTriggerPhrases || ''}
                      onChange={(e) => handleTypeSpecificFieldChange('demoTriggerPhrases', e.target.value)}
                      placeholder="e.g. show me, demo, video, walkthrough, proof"
                      className="w-full text-xs border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-600 text-gray-900 focus:bg-white bg-gray-50/50"
                    />
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                    <span className="text-xs font-semibold text-gray-700">Never proactively share demo links?</span>
                    <button
                      type="button"
                      onClick={() => handleTypeSpecificFieldChange('neverProactivelyShare', !config.typeSpecificData?.neverProactivelyShare)}
                      className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${config.typeSpecificData?.neverProactivelyShare !== false ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                    >
                      <span className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${config.typeSpecificData?.neverProactivelyShare !== false ? 'translate-x-6' : ''}`} />
                    </button>
                  </div>

                  <div className="space-y-4 border-t border-gray-100 pt-4">
                    {(config.typeSpecificData?.demoLinks || []).map((demo: any, index: number) => (
                      <div key={index} className="border border-gray-200 rounded-xl p-4 bg-gray-55/40 space-y-3 relative">
                        <button
                          type="button"
                          onClick={() => handleRemoveDemo(index)}
                          className="absolute top-3 right-3 text-red-500 hover:text-red-700 cursor-pointer"
                        >
                          <X size={16} />
                        </button>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="block text-[9px] uppercase font-bold text-gray-400">Product Name</label>
                            <input
                              type="text"
                              value={demo.productName}
                              onChange={(e) => handleUpdateDemo(index, 'productName', e.target.value)}
                              placeholder="e.g. ScaleCraft Agent"
                              className="w-full text-xs border border-gray-200 rounded bg-white px-2 py-1 focus:outline-none focus:border-blue-600 text-gray-900"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="block text-[9px] uppercase font-bold text-gray-400">Link Type</label>
                            <select
                              value={demo.linkType}
                              onChange={(e) => handleUpdateDemo(index, 'linkType', e.target.value)}
                              className="w-full text-xs border border-gray-200 rounded bg-white px-2 py-1 focus:outline-none focus:border-blue-600 text-gray-900 font-semibold"
                            >
                              <option value="Video">Video</option>
                              <option value="Website">Website</option>
                              <option value="Brochure">Brochure</option>
                              <option value="Image">Image</option>
                            </select>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[9px] uppercase font-bold text-gray-400">URL</label>
                          <input
                            type="url"
                            value={demo.url}
                            onChange={(e) => handleUpdateDemo(index, 'url', e.target.value)}
                            placeholder="https://youtube.com/..."
                            className="w-full text-xs border border-gray-200 rounded bg-white px-2 py-1 focus:outline-none focus:border-blue-600 text-gray-900"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[9px] uppercase font-bold text-gray-400">When to share</label>
                          <textarea
                            rows={1}
                            value={demo.whenToShare}
                            onChange={(e) => handleUpdateDemo(index, 'whenToShare', e.target.value)}
                            placeholder="Only share when lead asks for demo/video/etc."
                            className="w-full text-xs border border-gray-200 rounded bg-white px-2 py-1 focus:outline-none focus:border-blue-600 text-gray-900"
                          />
                        </div>
                      </div>
                    ))}
                    {(config.typeSpecificData?.demoLinks || []).length === 0 && (
                      <p className="text-xs text-gray-500 italic text-center py-2">No custom demo links configured. Click Add Demo Link.</p>
                    )}
                  </div>
                </div>

                {/* Guarantee & Refund Policy */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                      Guarantee & Refund Policy
                    </h3>
                    <button
                      type="button"
                      onClick={() => handleTypeSpecificFieldChange('hasGuarantee', !config.typeSpecificData?.hasGuarantee)}
                      className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${config.typeSpecificData?.hasGuarantee ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                    >
                      <span className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${config.typeSpecificData?.hasGuarantee ? 'translate-x-6' : ''}`} />
                    </button>
                  </div>

                  {config.typeSpecificData?.hasGuarantee && (
                    <div className="space-y-4 animate-fadeIn">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                          Guarantee Description
                        </label>
                        <textarea
                          rows={2}
                          value={config.typeSpecificData?.guaranteeDescription || ''}
                          onChange={(e) => handleTypeSpecificFieldChange('guaranteeDescription', e.target.value)}
                          placeholder="e.g. Complete 7 days, zero clients = full refund"
                          className="w-full text-xs border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-600 text-gray-900 focus:bg-white bg-gray-50/50"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                            Eligibility Conditions
                          </label>
                          <textarea
                            rows={2}
                            value={config.typeSpecificData?.eligibilityConditions || ''}
                            onChange={(e) => handleTypeSpecificFieldChange('eligibilityConditions', e.target.value)}
                            placeholder="e.g. Must complete all 7 days, 10+ messages/day"
                            className="w-full text-xs border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-600 text-gray-900 focus:bg-white bg-gray-50/50"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                            Not eligible if
                          </label>
                          <textarea
                            rows={2}
                            value={config.typeSpecificData?.notEligibleIf || ''}
                            onChange={(e) => handleTypeSpecificFieldChange('notEligibleIf', e.target.value)}
                            placeholder="e.g. Incomplete challenge, under 30 messages"
                            className="w-full text-xs border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-600 text-gray-900 focus:bg-white bg-gray-50/50"
                          />
                        </div>
                      </div>

                      <div className="space-y-1 border-t border-gray-100 pt-3">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                          Refund Guidance
                        </label>
                        <textarea
                          rows={2}
                          value={config.typeSpecificData?.refundResponseTemplate || ''}
                          onChange={(e) => handleTypeSpecificFieldChange('refundResponseTemplate', e.target.value)}
                          placeholder="What should the agent explain or do? (e.g. 'Explain the 7-day guarantee terms, then offer to connect with the team for processing')"
                          className="w-full text-xs border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-600 text-gray-900 focus:bg-white bg-gray-50/50"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Human Handoff Setup Triggers */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-2xs space-y-4">
                  <div className="border-b border-gray-100 pb-2 flex items-center space-x-2">
                    <PhoneCall className="text-blue-600" size={16} />
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                      Human Handoff Trigger Words
                    </h3>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="handoff-triggers" className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      Handoff Trigger Phrases (one per line)
                    </label>
                    <textarea
                      id="handoff-triggers"
                      rows={4}
                      value={config?.handoffTriggers}
                      onChange={(e) => handleChangeField('handoffTriggers', e.target.value)}
                      placeholder="talk to team, speak to human"
                      className="w-full text-xs border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-600 text-gray-900 focus:bg-white bg-gray-50/50 leading-relaxed font-mono"
                    />
                  </div>

                  <div className="space-y-1 border-t border-gray-100 pt-4">
                    <label htmlFor="handoff-message" className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      Handoff Tone/Approach
                    </label>
                    <textarea
                      id="handoff-message"
                      rows={3}
                      value={config?.handoffMessage}
                      onChange={(e) => handleChangeField('handoffMessage', e.target.value)}
                      placeholder="e.g. 'Warm and reassuring - let them know a team member will help directly. Mention response is usually quick.'"
                      className="w-full text-xs border border-gray-250 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-600 text-gray-900 focus:bg-white bg-gray-50/50 leading-relaxed"
                    />
                    <p className="text-[10px] text-blue-600 font-semibold mt-1 leading-relaxed">
                      💡 This guides HOW your agent hands off - it will phrase the message naturally and include your contact number automatically.
                    </p>
                  </div>
                </div>

                {/* Agent Restrictions & Prohibitions */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-2xs space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide border-b border-gray-100 pb-2">
                    Agent Restrictions & Prohibitions
                  </h3>
                  <div className="space-y-1">
                    <label htmlFor="restrictions-input" className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      Restrictions (one per line)
                    </label>
                    <textarea
                      id="restrictions-input"
                      rows={4}
                      value={config?.restrictions}
                      onChange={(e) => handleChangeField('restrictions', e.target.value)}
                      placeholder="Never promise exact delivery dates."
                      className="w-full text-xs border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-600 text-gray-900 focus:bg-white bg-gray-50/50 leading-relaxed"
                    />
                  </div>
                </div>

                {/* Section 7: Advanced Instructions */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-2xs">
                  <div className="w-full p-6 flex items-center justify-between bg-gray-55/30 border-b border-gray-200">
                    <div className="flex items-center space-x-2">
                      <Lock size={16} className="text-gray-500" />
                      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                        Advanced System Override Instructions
                      </h3>
                      <span className="text-[9px] text-gray-500 font-bold px-2 py-0.5 bg-gray-200 rounded">
                        PRO
                      </span>
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    <div className="space-y-1">
                      <label htmlFor="custom-instructions" className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                        Custom System Instructions
                      </label>
                      <textarea
                        id="custom-instructions"
                        rows={4}
                        value={config?.advancedInstructions}
                        onChange={(e) => handleChangeField('advancedInstructions', e.target.value)}
                        placeholder="Add any raw rules or edge-case handling instructions directly into the SOUL prompt..."
                        className="w-full text-xs font-mono border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-600 text-gray-900 focus:bg-white bg-gray-50/50 leading-relaxed"
                      />
                    </div>

                    <div className="space-y-1 border-t border-gray-100 pt-4">
                      <label htmlFor="greeting-override" className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                        Override Greeting Message
                      </label>
                      <textarea
                        id="greeting-override"
                        rows={2}
                        value={config.typeSpecificData?.greetingOverride || ''}
                        onChange={(e) => handleTypeSpecificFieldChange('greetingOverride', e.target.value)}
                        placeholder="e.g. Hello! Welcome to Priyas Cafe. How can I help you book a table or order food? 🍕"
                        className="w-full text-xs border border-gray-250 rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-600 text-gray-900 focus:bg-white bg-gray-50/50 leading-relaxed"
                      />
                      <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
                        💡 Leave blank to let your agent generate natural openers each time (recommended). Fill this in ONLY if you need an exact fixed greeting.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Save trigger */}
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={handleResetToDefaults}
                className="flex-1 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 text-sm font-semibold py-3 px-4 rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center justify-center space-x-2 h-11"
              >
                <RefreshCcw size={16} />
                <span>Reset to Defaults</span>
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-2 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-350 text-white text-sm font-semibold py-3 px-4 rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center justify-center space-x-2 h-11"
              >
                <Save size={16} />
                <span>
                  {saving
                    ? (countdown > 0 ? `${successMessage} (${countdown}s)` : 'Saving & Deploying...')
                    : 'Save & Deploy to Agent'}
                </span>
              </button>
            </div>
          </div>

          {/* Right Column: Information panel */}
          <div className="space-y-6">

            {/* AI Optimization status */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-2xs flex items-center space-x-3">
              <CheckCircle size={18} className="text-green-600 shrink-0" />
              <p className="text-[13px] font-semibold text-gray-800 leading-snug">
                SOUL.md will be AI-optimized before deploying to your agent.
              </p>
            </div>

            {/* Products card */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-2xs space-y-4">
              <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center space-x-1.5">
                <Package size={12} className="text-blue-600" />
                <span>Connected Products</span>
              </h4>

              <div className="p-4 bg-gray-50/50 border border-gray-205 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xl font-semibold text-gray-900">{productCount}</span>
                  <span className="text-[10px] text-gray-500 block font-semibold mt-0.5">Active Products</span>
                </div>
                <Link
                  href="/dashboard/products"
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center space-x-0.5 cursor-pointer"
                >
                  <span>Edit Products</span>
                  <ChevronRight size={14} />
                </Link>
              </div>

              <p className="text-[11px] text-gray-500 leading-relaxed">
                Active products catalog items are automatically appended to your agent's knowledge base.
                They don't need to be manually typed into instructions.
              </p>
            </div>

            {/* Help Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-2xs space-y-3">
              <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wide flex items-center space-x-1.5">
                <HelpCircle size={14} className="text-blue-600" />
                <span>SOUL Writing Guide</span>
              </h4>
              <ul className="space-y-3 text-xs text-gray-550 list-disc pl-4 leading-relaxed">
                <li>
                  <strong>Third Person Structure:</strong> System automatically translates first-person words to neutral instructions to avoid AI guardrail triggers.
                </li>
                <li>
                  <strong>AI FAQ generation:</strong> Use the Sparkle button in Section 3 to let Gemini draft answers for common inquiries automatically.
                </li>
                <li>
                  <strong>Handoff:</strong> When triggers are matched, agent routes the chat cleanly to your team contact link.
                </li>
              </ul>
            </div>
          </div>
        </form>
      )}

      {/* Currently Deployed SOUL.md File Preview */}
      {!loading && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-2xs space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center space-x-2">
              <FileText className="text-blue-600" size={18} />
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                Currently Deployed SOUL.md File
              </h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-805 rounded uppercase">
              Active on VPS
            </span>
          </div>

          {config?.rawSoul ? (
            <div className="relative">
              <pre className="whitespace-pre-wrap font-mono text-[11px] text-gray-800 bg-gray-95/40 border border-gray-200 p-4 rounded-xl max-h-[500px] overflow-y-auto shadow-inner leading-relaxed select-all">
                {config.rawSoul}
              </pre>
            </div>
          ) : (
            <div className="p-8 text-center bg-gray-50 border border-gray-200 rounded-xl">
              <AlertTriangle size={24} className="text-amber-500 mx-auto mb-2" />
              <p className="text-xs font-semibold text-gray-500">
                No deployed SOUL.md file was found on the server. Write and save instructions above to create it.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-scale-in">
          <div className="bg-white rounded-xl w-full max-w-3xl border border-gray-200 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-gray-900">
                <FileText size={18} className="text-blue-600" />
                <h3 className="font-semibold">SOUL.md Prompt File Preview</h3>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="p-1 hover:bg-gray-100 text-gray-500 rounded-lg cursor-pointer animate-scale-in"
              >
                <X size={18} />
              </button>
            </div>

            {/* Markdown Display */}
            <div className="p-6 overflow-y-auto bg-gray-50 border-b border-gray-100 flex-1 text-xs">
              <div className="mb-4 bg-blue-50 border border-blue-100 rounded-lg p-3 text-[11px] text-blue-800 leading-relaxed font-semibold">
                📝 Note: Your Sales Flow and Objection sections are GOALS for your agent, not exact scripts. Your agent generates natural wording for each unique conversation based on these goals.
              </div>
              <pre className="whitespace-pre-wrap font-mono text-gray-800 bg-white border border-gray-200 p-4 rounded-xl shadow-2xs leading-relaxed select-all">
                {previewContent}
              </pre>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 flex justify-end bg-gray-50">
              <button
                onClick={() => setShowPreviewModal(false)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg cursor-pointer h-9 shadow-2xs"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
