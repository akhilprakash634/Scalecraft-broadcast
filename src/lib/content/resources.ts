/**
 * Resources Center Configuration
 * Indexes calculators, blog files, and quick links
 */
export interface ResourceItem {
  name: string;
  url: string;
  desc: string;
}

export interface ResourceCategory {
  title: string;
  iconName: string;
  description: string;
  items: ResourceItem[];
}

export const RESOURCE_CATEGORIES: ResourceCategory[] = [
  {
    title: 'Free Tools & Generators',
    iconName: 'Calculator',
    description: 'Interactive utilities to calculate hourly rates, project proposals, and draft custom templates.',
    items: [
      { name: 'AI Outreach Script Customizer', url: '/#sandbox', desc: 'Select niche, offer, and name to generate custom pitches.' },
      { name: 'Notion Deal CRM Sandbox Board', url: '/#sandbox', desc: 'Interactive visual pipeline preview.' }
    ]
  },
  {
    title: 'Topical Learning Guides',
    iconName: 'FileText',
    description: 'Evergreen, detailed roadmaps covering outbound sales, CRM tracking, and portfolio setups.',
    items: [
      { name: 'How to Find High-Quality Leads', url: '/blog/how-to-land-your-first-high-ticket-client-in-2026-using-ai-and-personalization', desc: 'Find and extract B2B prospects using automated workflow loops.' },
      { name: 'Cold Outreach That Gets Replies', url: '/blog/how-to-write-cold-dm-gets-replies', desc: 'Battle-tested openers and breakdown message frameworks.' },
      { name: 'AI Prompts for Freelancers', url: '/blog/5-ai-tools-every-indian-freelancer-needs', desc: 'Context-rich prompt templates for ChatGPT and Claude.' }
    ]
  },
  {
    title: 'AI Prompt Libraries',
    iconName: 'Bot',
    description: 'Verifiable context prompts ready to copy and paste directly into Claude or ChatGPT.',
    items: [
      { name: 'ROI-Framing Proposal prompt', url: '/#sandbox', desc: 'Assist to pitch redesigns as investments.' },
      { name: 'Warm Outbound Opener prompts', url: '/#sandbox', desc: 'Open conversations with value assets.' }
    ]
  },
  {
    title: 'Ecosystem Logs & Roadmaps',
    iconName: 'Sparkles',
    description: 'Track ScaleCraft active releases and feature pipelines.',
    items: [
      { name: 'System Release Changelog', url: '/changelog', desc: 'See what was updated in July 2026.' },
      { name: 'ScaleCraft Product Roadmap', url: '/roadmap', desc: 'See what is coming in Q3 & Q4 2026.' }
    ]
  }
];
