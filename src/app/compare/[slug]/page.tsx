import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Check, X, ArrowRight, ShieldCheck, Zap, Server, RefreshCw } from 'lucide-react';
import { generateBreadcrumbSchema, generateFAQSchema } from '@/lib/schemaGenerator';
import { getProductBySlug } from '@/lib/content';

interface ComparisonData {
  slug: string;
  title: string;
  subtitle: string;
  targetProductSlug: string;
  targetProductName: string;
  competitorName: string;
  verdict: string;
  features: Array<{ name: string; scalecraft: string | boolean; competitor: string | boolean }>;
  advantages: string[];
  faqs: Array<{ question: string; answer: string }>;
}

const COMPARISONS: Record<string, ComparisonData> = {
  'scalecraft-agent-vs-manychat': {
    slug: 'scalecraft-agent-vs-manychat',
    title: 'ScaleCraft Agent vs ManyChat: Full Comparison (2026)',
    subtitle: 'Why B2B Agencies & Consultants are switching from rigid decision-tree bots to dedicated 24/7 Gemini AI Agents.',
    targetProductSlug: 'scalecraft-agent-saas',
    targetProductName: 'ScaleCraft Agent — Managed SaaS',
    competitorName: 'ManyChat',
    verdict: 'ManyChat is built for simple e-commerce & Instagram keyword triggers. ScaleCraft Agent is built for high-ticket B2B lead qualification, objection handling, and dedicated VPS WhatsApp automation.',
    features: [
      { name: 'AI Model Intelligence', scalecraft: 'Gemini 1.5 Pro / GPT-4o Trained Prompts', competitor: 'Basic Rule Trees / Keyword Toggles' },
      { name: 'Server Infrastructure', scalecraft: 'Dedicated VPS (100% Isolated)', competitor: 'Shared Multi-tenant Cloud' },
      { name: 'WhatsApp Phone Pairing', scalecraft: 'Included with Setup Engineering', competitor: 'Complex WhatsApp Business API Approval' },
      { name: 'Objection Handling', scalecraft: 'Real-time Contextual AI Replies', competitor: 'Pre-written Button Choices Only' },
      { name: 'Lead CRM Sync', scalecraft: 'Automatic Notion & Webhook Sync', competitor: 'Requires Paid Zapier Addons' },
      { name: 'Monthly Contact Limits', scalecraft: 'Unlimited Contacts (Flat Fee)', competitor: 'Tiered Pricing (Escalates per subscriber)' },
    ],
    advantages: [
      "No per-subscriber price penalties as your contact list grows.",
      "Handles nuanced client objections without breaking into a generic 'agent support' fallback loop.",
      "Dedicated VPS deployment ensures maximum privacy and 99.9% uptime for your business WhatsApp."
    ],
    faqs: [
      { question: 'Why switch from ManyChat to ScaleCraft Agent?', answer: 'ManyChat relies on static keyword buttons. ScaleCraft Agent acts as a live, trained sales representative that answers complex lead questions and books calls.' },
      { question: 'Do I need technical skills to deploy ScaleCraft Agent?', answer: 'No. Our team configures your dedicated VPS server and pairs your WhatsApp number for you.' }
    ]
  },
  'scalecraft-agent-vs-intercom': {
    slug: 'scalecraft-agent-vs-intercom',
    title: 'ScaleCraft Agent vs Intercom Fin: Enterprise AI Comparison',
    subtitle: 'Compare total cost of ownership, deployment speed, and WhatsApp lead recovery.',
    targetProductSlug: 'scalecraft-agent-saas',
    targetProductName: 'ScaleCraft Agent — Managed SaaS',
    competitorName: 'Intercom Fin AI',
    verdict: 'Intercom charges $0.99 per AI resolution ($1,000s/mo for active lead volume). ScaleCraft Agent gives you unlimited AI conversations on a flat managed fee.',
    features: [
      { name: 'Pricing Model', scalecraft: 'Flat Managed Fee (No Per-Resolution Fee)', competitor: '$0.99 Per Resolution + Base Fee' },
      { name: 'WhatsApp Native Support', scalecraft: 'Native QR Pair & 24/7 Autopilot', competitor: 'Website Widget First' },
      { name: 'Dedicated VPS Deployment', scalecraft: true, competitor: false },
      { name: 'Prompt & CRM Customization', scalecraft: true, competitor: 'Limited KB Scraping' },
    ],
    advantages: [
      "Zero per-resolution surprise bills at the end of the month.",
      "Direct 1:1 onboarding support from our engineering team.",
      "Full ownership of lead data and Notion CRM integration."
    ],
    faqs: [
      { question: 'Is ScaleCraft Agent suitable for B2B agencies?', answer: 'Yes! It is engineered specifically for agencies, consultants, and SaaS founders.' }
    ]
  },
  'lead-finder-vs-apollo': {
    slug: 'lead-finder-vs-apollo',
    title: 'AI Lead Finder vs Apollo.io: B2B Prospecting Comparison',
    subtitle: 'Why pay monthly per-credit subscriptions when you can own lifetime lead sourcing systems?',
    targetProductSlug: 'ai-lead-finder-system',
    targetProductName: 'AI Lead Finder System',
    competitorName: 'Apollo.io',
    verdict: 'Apollo locks your data behind monthly credit limits. ScaleCraft AI Lead Finder delivers lifetime search prompts and Notion database templates for a single one-time payment.',
    features: [
      { name: 'Payment Terms', scalecraft: 'One-Time Lifetime Access', competitor: 'Monthly Credit Subscription ($49-$149/mo)' },
      { name: 'Lead Storage & Ownership', scalecraft: '100% Owned in Your Notion CRM', competitor: 'Stored in Apollo Platform' },
      { name: 'Cold DM & Email Prompts', scalecraft: '50+ High-Converting Prompts Included', competitor: 'Generic Email Templates' },
      { name: 'Daily Prospect Limits', scalecraft: 'Unlimited Leads Sourced Daily', competitor: 'Restricted by Export Credits' },
    ],
    advantages: [
      "One-time purchase — no recurring monthly credit renewals.",
      "Integrates directly with Notion for seamless pipeline tracking.",
      "Includes copy-paste cold outreach scripts for Instagram, LinkedIn, and Email."
    ],
    faqs: [
      { question: 'Can I use AI Lead Finder with free scraping tools?', answer: 'Yes! The playbook guides you through free & low-cost lead mining techniques.' }
    ]
  },
  'lead-finder-vs-clay': {
    slug: 'lead-finder-vs-clay',
    title: 'AI Lead Finder vs Clay.com: Prospecting System Comparison',
    subtitle: 'Simplified, high-conversion lead generation for solopreneurs and small agency teams.',
    targetProductSlug: 'ai-lead-finder-system',
    targetProductName: 'AI Lead Finder System',
    competitorName: 'Clay.com',
    verdict: 'Clay is powerful but has a steep learning curve and expensive credit pricing. AI Lead Finder gives you ready-to-use Notion lead sheets and outreach templates in under 10 minutes.',
    features: [
      { name: 'Setup & Learning Curve', scalecraft: '10 Minutes (Plug & Play Notion)', competitor: 'Weeks of Complex Table & API Wiring' },
      { name: 'Pricing', scalecraft: 'One-Time Fee', competitor: '$149 - $800+/month' },
      { name: 'Outreach Scripts Included', scalecraft: true, competitor: false },
    ],
    advantages: [
      "Get started immediately without spending hours configuring HTTP enrichment APIs.",
      "Pre-formatted Notion tables with lead scoring criteria.",
      "Includes high-ticket DM scripts that get 40%+ reply rates."
    ],
    faqs: [
      { question: 'Which system is better for freelancers?', answer: 'AI Lead Finder is ideal for freelancers who want results quickly without high software overhead.' }
    ]
  }
};

export async function generateStaticParams() {
  return Object.keys(COMPARISONS).map(slug => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = COMPARISONS[slug];
  if (!data) return { title: 'Comparison | ScaleCraft' };

  return {
    title: `${data.title} | ScaleCraft`,
    description: data.subtitle,
    alternates: {
      canonical: `https://thescalecraft.in/compare/${slug}`,
    },
    openGraph: {
      title: data.title,
      description: data.subtitle,
      url: `https://thescalecraft.in/compare/${slug}`,
      images: ['/og-image.jpg'],
    },
  };
}

export default async function ComparisonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = COMPARISONS[slug];

  if (!data) notFound();

  // Fetch live target product data from CMS
  const dbProd = await getProductBySlug(data.targetProductSlug);
  const targetProductName: string = dbProd ? (typeof dbProd.name === 'string' ? dbProd.name : dbProd.name?.en || '') : data.targetProductName;
  const targetProductSlug = dbProd ? dbProd.slug : data.targetProductSlug;

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: 'https://thescalecraft.in' },
    { name: 'Comparisons', url: 'https://thescalecraft.in/compare' },
    { name: data.title, url: `https://thescalecraft.in/compare/${slug}` },
  ]);

  const faqSchema = generateFAQSchema(data.faqs);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      {faqSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />}

      <main className="min-h-screen pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-[1100px] mx-auto font-body text-text-primary">
        
        {/* Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto mb-14">
          <span className="text-[11px] font-bold text-accent tracking-[0.15em] uppercase bg-accent/10 px-3 py-1 rounded-full">
            TOPICAL COMPARISON REPORT
          </span>
          <h1 className="font-heading text-clamp-h2 font-black tracking-[-1px] leading-[1.15] text-text-primary">
            {data.title}
          </h1>
          <p className="text-[15px] text-text-muted leading-relaxed">
            {data.subtitle}
          </p>
        </div>

        {/* Verdict Box */}
        <div className="bg-bg-secondary border border-border-primary rounded-2xl p-6 mb-12 shadow-card">
          <h3 className="font-heading text-lg font-bold text-accent mb-2 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" /> Executive Summary &amp; Verdict
          </h3>
          <p className="text-[14px] text-text-muted leading-relaxed">
            {data.verdict}
          </p>
        </div>

        {/* Side-by-Side Comparison Table */}
        <div className="border border-border-primary rounded-2xl overflow-hidden bg-white shadow-premium mb-14">
          <div className="px-6 py-4 bg-bg-secondary border-b border-border-primary grid grid-cols-3 font-heading text-xs font-black uppercase tracking-wider text-text-primary">
            <div>Feature / Specification</div>
            <div className="text-accent">{targetProductName}</div>
            <div className="text-text-muted">{data.competitorName}</div>
          </div>

          <div className="divide-y divide-border-primary text-[13px]">
            {data.features.map((f, i) => (
              <div key={i} className="px-6 py-4 grid grid-cols-3 items-center hover:bg-bg-secondary/50 transition-colors">
                <div className="font-bold text-text-primary">{f.name}</div>
                <div className="text-accent font-semibold flex items-center gap-1.5">
                  {typeof f.scalecraft === 'boolean' ? (
                    f.scalecraft ? <Check className="w-4 h-4 text-accent" /> : <X className="w-4 h-4 text-red-500" />
                  ) : (
                    <span>{f.scalecraft}</span>
                  )}
                </div>
                <div className="text-text-muted flex items-center gap-1.5">
                  {typeof f.competitor === 'boolean' ? (
                    f.competitor ? <Check className="w-4 h-4 text-accent" /> : <X className="w-4 h-4 text-red-500" />
                  ) : (
                    <span>{f.competitor}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Key Advantages */}
        <div className="space-y-4 mb-14">
          <h3 className="font-heading text-xl font-bold text-text-primary">
            Key Advantages of Choosing ScaleCraft
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {data.advantages.map((adv, idx) => (
              <div key={idx} className="bg-bg-secondary border border-border-primary p-5 rounded-xl space-y-2">
                <span className="w-6 h-6 rounded-full bg-accent/10 text-accent font-black text-xs flex items-center justify-center">
                  {idx + 1}
                </span>
                <p className="text-[13px] text-text-muted leading-relaxed font-body">
                  {adv}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Card */}
        <div className="bg-accent text-white rounded-2xl p-8 sm:p-10 text-center space-y-5 shadow-premium">
          <h3 className="font-heading text-2xl sm:text-3xl font-black">
            Ready to upgrade to {targetProductName}?
          </h3>
          <p className="text-sm opacity-90 max-w-xl mx-auto leading-relaxed">
            Get instant access or start managed setup with our 100% satisfaction guarantee.
          </p>
          <div>
            <Link
              href={`/products/${targetProductSlug}`}
              className="inline-flex items-center gap-2 bg-white text-accent font-black text-sm px-8 py-4 rounded-xl hover:bg-slate-100 transition-all uppercase tracking-wider shadow-lg"
            >
              <span>Explore {targetProductName}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

      </main>
    </>
  );
}
