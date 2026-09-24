/**
 * Search Intent & Weighting Configuration
 * Maps natural language queries to relevant system tags
 */

export interface SearchTarget {
  title: string;
  category: 'product' | 'article' | 'tool' | 'faq';
  url: string;
  description: string;
  intents: string[];
}

export const SEARCH_WEIGHTS = {
  product: 100,
  faq: 70,
  article: 60,
  tool: 50,
};

export const INTENT_MAP: Record<string, string[]> = {
  "clients": ["blueprint", "outreach", "proposals", "closing", "whatsapp", "leads"],
  "i need clients": ["blueprint", "outreach", "proposals", "closing", "whatsapp", "leads"],
  "find clients": ["blueprint", "outreach", "proposals", "closing", "whatsapp", "leads"],
  "how to get clients": ["blueprint", "outreach", "proposals", "closing", "whatsapp", "leads"],
  
  "leads": ["finder", "sourcing", "scraping", "instagram", "linkedin", "maps"],
  "find leads": ["finder", "sourcing", "scraping", "instagram", "linkedin", "maps"],
  "lead generation": ["finder", "sourcing", "scraping", "instagram", "linkedin", "maps"],
  "scrape": ["finder", "sourcing", "scraping", "instagram", "linkedin", "maps"],
  
  "pricing": ["calculator", "earnings", "retainer", "cost", "subscription"],
  "price": ["calculator", "earnings", "retainer", "cost", "subscription"],
  "cost": ["calculator", "earnings", "retainer", "cost", "subscription"],
  "calculator": ["calculator", "earnings", "retainer", "cost", "subscription"],
  
  "proposal": ["agreement", "proposal", "onboarding", "contract"],
  "contract": ["agreement", "proposal", "onboarding", "contract"],
  "onboarding": ["agreement", "proposal", "onboarding", "contract"],
  
  "crm": ["tracker", "pipeline", "kanban", "dealflow"],
  "pipeline": ["tracker", "pipeline", "kanban", "dealflow"],
  "tracker": ["tracker", "pipeline", "kanban", "dealflow"],
  
  "automation": ["agent", "saas", "prompts", "ai tools"],
  "ai prompts": ["agent", "saas", "prompts", "ai tools"],
  "prompts": ["agent", "saas", "prompts", "ai tools"],
  "chatgpt": ["agent", "saas", "prompts", "ai tools"],
  "claude": ["agent", "saas", "prompts", "ai tools"],
  
  "whatsapp": ["outreach", "whatsapp", "mining"],
  "cold outreach": ["outreach", "vault", "email", "dm", "connection"],
  "cold email": ["outreach", "vault", "email", "dm", "connection"],
};

export const SEARCHABLE_ITEMS: SearchTarget[] = [
  // Products
  {
    title: 'AI Systems Combo (client pipeline + Lead Finder)',
    category: 'product',
    url: '/products/ai-systems-combo',
    description: 'The complete freelance pipeline system. Find leads with the Lead Finder and convert them with the Blueprint.',
    intents: ['clients', 'leads', 'retainer', 'combo', 'bundle', 'buy', 'notion']
  },
  {
    title: 'Freelance Client Pipeline Blueprint',
    category: 'product',
    url: '/products/freelance-client-pipeline-blueprint',
    description: 'Notion workspace with 50+ outreach scripts, proposal templates, and a 7-day client acquisition challenge.',
    intents: ['clients', 'outreach', 'scripts', 'proposal', 'challenge', 'notion', 'convert']
  },
  {
    title: 'AI Lead Finder System',
    category: 'product',
    url: '/products/ai-lead-finder-system',
    description: 'Find 50+ qualified client leads every week using free automated workflows and tracking databases.',
    intents: ['leads', 'finding', 'source', 'instagram', 'linkedin', 'maps', 'scraping']
  },
  
  // Free Tools & Resources
  {
    title: 'AI Outreach Message Generator',
    category: 'tool',
    url: '/#sandbox',
    description: 'Free interactive tool to generate custom outreach DMs based on your niche and client business name.',
    intents: ['free', 'generator', 'generator tool', 'outreach', 'script helper', 'copy']
  },
  {
    title: 'Hourly Rate & Pricing Calculator',
    category: 'tool',
    url: '/#sandbox',
    description: 'Visual calculator to determine your minimum hourly rate and project retainer pricing models.',
    intents: ['calculator', 'price', 'fee', 'hourly', 'rate', 'earnings', 'math']
  },
  {
    title: 'Notion Lead Tracker Database template',
    category: 'tool',
    url: '/#sandbox',
    description: 'Free read-only look at the pipeline tracker board used to move prospects from cold lead to closed client.',
    intents: ['tracker', 'crm', 'kanban', 'notion', 'pipeline', 'free crm']
  },
  
  // Blog / Resource Articles
  {
    title: 'How to Find High-Quality Leads',
    category: 'article',
    url: '/blog/how-to-land-your-first-high-ticket-client-in-2026-using-ai-and-personalization',
    description: 'Find and extract B2B prospects using automated workflow loops.',
    intents: ['clients', 'organic', 'marketing', 'leads', 'sourcing', 'ads']
  },
  {
    title: 'Cold Outreach That Gets Replies',
    category: 'article',
    url: '/blog/how-to-write-cold-dm-gets-replies',
    description: 'Battle-tested openers and breakdown message frameworks.',
    intents: ['cold', 'outreach', 'email', 'prompts', 'reply', 'whatsapp', 'linkedin']
  },
  {
    title: 'AI Prompts for Freelancers',
    category: 'article',
    url: '/blog/5-ai-tools-every-indian-freelancer-needs',
    description: 'Context-rich prompt templates for ChatGPT and Claude.',
    intents: ['prompts', 'ai', 'tools', 'chatgpt', 'claude', 'productivity', 'workspace']
  },
  
  // Objection-based FAQs
  {
    title: 'Is this system suitable for absolute beginners?',
    category: 'faq',
    url: '/#faq',
    description: 'Yes. The 7-day challenge was built specifically to help beginners get their first real client conversation.',
    intents: ['beginner', 'newbie', 'experience', 'no client', 'first client', 'easy']
  },
  {
    title: 'Can I use this outside of India?',
    category: 'faq',
    url: '/#faq',
    description: 'Yes. The client acquisition workflows, outreach scripts, and templates are designed for global markets (US, UK, UAE, etc.).',
    intents: ['india', 'global', 'uae', 'dubai', 'us', 'international', 'currency']
  },
  {
    title: 'Is there a monthly subscription or fee?',
    category: 'faq',
    url: '/#faq',
    description: 'No. Every product is a one-time purchase with lifetime access and free future updates included.',
    intents: ['price', 'subscription', 'monthly', 'recurring', 'pay', 'cost', 'fee']
  },
  {
    title: 'What if the system does not work for my niche?',
    category: 'faq',
    url: '/#faq',
    description: 'Our 7-Day Results Guarantee covers you: if you attempt outreach and do not get responses, we will troubleshoot or refund.',
    intents: ['refund', 'guarantee', 'money back', 'risk', 'fail', 'policy']
  }
];

/**
 * Weighted Search Algorithm
 * Ranks search results by matching intent mapping and category scoring weights
 */
export function queryWeightedSearch(rawQuery: string): SearchTarget[] {
  const searchTerm = rawQuery.toLowerCase().trim();
  if (!searchTerm) return [];

  // Get synonyms matching intent keys
  const intentKeys = Object.keys(INTENT_MAP).filter(key => key.includes(searchTerm) || searchTerm.includes(key));
  const synonyms = intentKeys.flatMap(key => INTENT_MAP[key]);

  const scoredItems = SEARCHABLE_ITEMS.map(item => {
    let score = 0;

    // Match criteria and compute weights
    const matchTitle = item.title.toLowerCase().includes(searchTerm);
    const matchDesc = item.description.toLowerCase().includes(searchTerm);
    const matchIntents = item.intents.some(intent => intent.toLowerCase().includes(searchTerm));
    const matchSynonyms = item.intents.some(intent => synonyms.includes(intent.toLowerCase()));

    if (matchTitle) score += 50;
    if (matchIntents) score += 40;
    if (matchSynonyms) score += 30;
    if (matchDesc) score += 10;

    // Apply categorical search rank multipliers
    if (score > 0) {
      score += SEARCH_WEIGHTS[item.category] || 0;
    }

    return { item, score };
  });

  return scoredItems
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(x => x.item);
}
