import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, ArrowRight, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';
import { generateBreadcrumbSchema, generateFAQSchema } from '@/lib/schemaGenerator';
import { getProductBySlug } from '@/lib/content';

interface GuideData {
  slug: string;
  title: string;
  subtitle: string;
  readTime: string;
  targetProductSlug: string;
  targetProductName: string;
  sections: Array<{ heading: string; body: string }>;
  takeaways: string[];
  faqs: Array<{ question: string; answer: string }>;
}

const GUIDES: Record<string, GuideData> = {
  'ai-client-acquisition': {
    slug: 'ai-client-acquisition',
    title: 'The 2026 AI Client Acquisition Guide for Agency Owners & Freelancers',
    subtitle: 'Step-by-step masterclass on deploying AI systems, automated lead scoring, and WhatsApp pairing to sign high-ticket retainer clients on autopilot.',
    readTime: '12 min',
    targetProductSlug: 'ai-systems-combo',
    targetProductName: 'AI Systems Combo (Client Pipeline + Lead Finder)',
    sections: [
      {
        heading: '1. The Death of Manual B2B Prospecting',
        body: 'Manual lead searching on LinkedIn and Instagram takes 15+ hours per week and results in burn out. AI-driven lead scoring identifies high-intent leads using automated filters.'
      },
      {
        heading: '2. Structuring Your Lead Pipeline in Notion',
        body: 'Centralizing your leads in an interactive Notion workspace ensures zero lost deals and automated follow-up reminders at Day 3, Day 7, and Day 14.'
      },
      {
        heading: '3. Deploying 24/7 AI WhatsApp Agents',
        body: 'Connecting Gemini AI models directly to your business WhatsApp allows your agent to qualify leads, handle price objections, and send calendar links around the clock.'
      }
    ],
    takeaways: [
      "Automate lead sourcing to save 15+ hours every week.",
      "Use structured Notion CRM databases to track every prospective lead.",
      "Deploy 24/7 AI WhatsApp agents to handle lead inquiries automatically."
    ],
    faqs: [
      { question: 'How quickly can I deploy this AI client acquisition workflow?', answer: 'With ScaleCraft pre-built Notion templates and managed SaaS setup, your system can be operational in under 24 hours.' }
    ]
  },
  'cold-outreach-playbook': {
    slug: 'cold-outreach-playbook',
    title: 'Cold Outreach Guide: 40%+ Response Rate Recovery Strategy',
    subtitle: 'Proven cold email, Instagram DM, and LinkedIn outreach playbooks used by top-performing agencies.',
    readTime: '10 min',
    targetProductSlug: 'freelance-client-pipeline-blueprint',
    targetProductName: 'Freelance Client Pipeline Blueprint',
    sections: [
      {
        heading: '1. The Soft Breakup Nudge',
        body: '90% of outreach deals are closed on the follow-up. Sending a polite, low-friction breakup email on Day 7 recovers up to 40% of un-replied DMs.'
      },
      {
        heading: '2. Personalization at Scale with AI Prompts',
        body: 'Use curated ChatGPT & Gemini prompts to personalize the first 2 lines of every cold message without spending hours writing manually.'
      }
    ],
    takeaways: [
      "Never pitch on message #1 — start conversations with low-friction questions.",
      "Always include soft breakup nudges on Day 7.",
      "Leverage Notion templates to track reply status."
    ],
    faqs: [
      { question: 'Does cold outreach still work in 2026?', answer: 'Yes! Personalized, high-value outreach outperforms generic spam when paired with AI prompt customization.' }
    ]
  },
  'agency-automation': {
    slug: 'agency-automation',
    title: 'Agency Automation Guide: Scaling Operations Without Hiring',
    subtitle: 'How to automate client onboarding, lead intake, CRM tracking, and SOP handovers using low-code AI workflows.',
    readTime: '15 min',
    targetProductSlug: 'scalecraft-agent-saas',
    targetProductName: 'ScaleCraft Agent — Managed SaaS',
    sections: [
      {
        heading: '1. Automated Client Onboarding Protocols',
        body: 'Eliminate manual onboarding emails by sending instant Notion workspace duplicates and automated setup checklists immediately after payment.'
      },
      {
        heading: '2. Dedicated VPS Server Infrastructure',
        body: 'Running your agency automation on dedicated VPS servers guarantees 99.9% uptime and protects client data confidentiality.'
      }
    ],
    takeaways: [
      "Automate onboarding checklists to deliver instant value.",
      "Centralize agency SOPs inside Notion.",
      "Use dedicated VPS instances for 99.9% uptime."
    ],
    faqs: [
      { question: 'Can agency automation work for solo freelancers?', answer: 'Absolutely! Solo freelancers benefit the most by reclaiming 20+ hours per week of manual admin tasks.' }
    ]
  }
};

export async function generateStaticParams() {
  return Object.keys(GUIDES).map(slug => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const guide = GUIDES[slug];
  if (!guide) return { title: 'Industry Guide | ScaleCraft' };

  return {
    title: `${guide.title} | ScaleCraft`,
    description: guide.subtitle,
    alternates: {
      canonical: `https://thescalecraft.in/guides/${slug}`,
    },
    openGraph: {
      title: guide.title,
      description: guide.subtitle,
      url: `https://thescalecraft.in/guides/${slug}`,
      images: ['/og-image.jpg'],
    },
  };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = GUIDES[slug];

  if (!guide) notFound();

  // Fetch live target product data from CMS
  const dbProd = await getProductBySlug(guide.targetProductSlug);
  const targetProductName: string = dbProd ? (typeof dbProd.name === 'string' ? dbProd.name : dbProd.name?.en || '') : guide.targetProductName;
  const targetProductSlug = dbProd ? dbProd.slug : guide.targetProductSlug;

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: 'https://thescalecraft.in' },
    { name: 'Guides', url: 'https://thescalecraft.in/guides' },
    { name: guide.title, url: `https://thescalecraft.in/guides/${slug}` },
  ]);

  const faqSchema = generateFAQSchema(guide.faqs);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      {faqSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />}

      <main className="min-h-screen pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-[860px] mx-auto font-body text-text-primary">
        
        {/* Header */}
        <div className="space-y-4 mb-10 text-center">
          <span className="text-[11px] font-bold text-accent tracking-[0.15em] uppercase bg-accent/10 px-3 py-1 rounded-full">
            INDUSTRY PILLAR GUIDE &middot; {guide.readTime} READ
          </span>
          <h1 className="font-heading text-clamp-h2 font-black tracking-[-1px] leading-[1.15] text-text-primary">
            {guide.title}
          </h1>
          <p className="text-[15px] text-text-muted leading-relaxed">
            {guide.subtitle}
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-10 border-b border-border-primary pb-12 mb-12">
          {guide.sections.map((sec, idx) => (
            <div key={idx} className="space-y-3">
              <h2 className="font-heading text-xl font-bold text-text-primary">
                {sec.heading}
              </h2>
              <p className="text-[15.5px] text-text-muted leading-relaxed">
                {sec.body}
              </p>
            </div>
          ))}
        </div>

        {/* Takeaways Box */}
        <div className="bg-bg-secondary border border-border-primary rounded-2xl p-6 mb-12 space-y-3">
          <h3 className="font-heading text-lg font-bold text-accent flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" /> Key Takeaways
          </h3>
          <ul className="space-y-2 text-[14px] text-text-muted">
            {guide.takeaways.map((tk, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-accent font-bold">✓</span>
                <span>{tk}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Linked Product Callout */}
        <div className="bg-gradient-to-r from-bg-secondary to-bg-tertiary border border-border-primary rounded-2xl p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-card">
          <div className="space-y-1 text-center sm:text-left">
            <span className="text-[10px] font-black uppercase text-accent tracking-wider bg-accent/10 px-2.5 py-0.5 rounded-full">
              RECOMMENDED SYSTEM
            </span>
            <h4 className="font-heading text-xl font-bold text-text-primary">
              {targetProductName}
            </h4>
            <p className="text-[12.5px] text-text-muted">
              Deploy this pre-built system to implement the guide strategies in under 10 minutes.
            </p>
          </div>
          <Link
            href={`/products/${targetProductSlug}`}
            className="inline-flex items-center gap-2 bg-accent text-white font-bold text-xs px-6 py-3.5 rounded-xl hover:bg-blue-600 shadow-md transition-all uppercase tracking-wider shrink-0"
          >
            <span>View System</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

      </main>
    </>
  );
}
