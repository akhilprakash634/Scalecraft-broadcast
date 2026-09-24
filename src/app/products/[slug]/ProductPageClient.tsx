'use client';

import { useState, useEffect } from 'react';
import {
  Star, ShieldCheck, RefreshCw, Check, ChevronDown, ChevronUp, ArrowRight,
  ExternalLink, BookOpen, Code2, Play, FileText, Download, Layers
} from 'lucide-react';
import Link from 'next/link';
import StickyMobileCard from '@/components/ui/StickyMobileCard';
import PurchaseCard from '@/components/product/PurchaseCard';
import ProductAiSearchBlock from '@/components/product/ProductAiSearchBlock';
import InsideThisProduct, { ExplorerSection } from '@/components/product/InsideThisProduct';
import ProductTestimonials from '@/components/product/ProductTestimonials';
import { normalizeProduct, trackEvent } from '@/lib/content';
import { getProductExperienceConfig } from '@/lib/productExperience';

/* ─── URL Helper: Converts watch URLs into iframe embed URLs ─── */
function formatEmbedUrl(url: string): string {
  if (!url) return '';
  if (url.includes('youtube.com/watch')) {
    const match = url.match(/[?&]v=([^&]+)/);
    if (match && match[1]) return `https://www.youtube.com/embed/${match[1]}`;
  }
  if (url.includes('youtu.be/')) {
    const id = url.split('youtu.be/')[1]?.split('?')[0];
    if (id) return `https://www.youtube.com/embed/${id}`;
  }
  if (url.includes('loom.com/share/')) {
    const id = url.split('share/')[1]?.split('?')[0];
    if (id) return `https://www.loom.com/embed/${id}`;
  }
  return url;
}

/* ─── Default Blueprint Interactive Preview Fallback ─────────── */
const DEFAULT_BLUEPRINT_PREVIEW: ExplorerSection[] = [
  {
    title: 'Notion Workspace',
    icon: 'dashboard',
    items: [
      {
        title: 'Master Notion CRM Pipeline',
        description: 'Interactive CRM board with Lead Status, Deal Value, Contact Info, and Follow-up Reminders.',
        type: 'text'
      },
      {
        title: '7-Day Client Challenge Routine',
        description: 'Step-by-step daily checklist to source, pitch, and sign your first retainer client.',
        type: 'checklist',
        items: [
          'Day 1: Setup Profile & Target ICP',
          'Day 2: Mine 50 Leads using Apollo & Maps',
          'Day 3: Send Personalized Cold DMs & Emails',
          'Day 4: Follow-up & Book Discovery Calls',
          'Day 5: Send Custom Retainer Proposals'
        ]
      }
    ]
  },
  {
    title: 'Outreach Vault (50+ Scripts)',
    icon: 'sparkles',
    items: [
      {
        title: 'High-Ticket Cold DM Script',
        type: 'prompt',
        description: 'Direct message template with 40%+ response rate for agency owners & founders.',
        preview: 'Hey [First Name], noticed your recent campaign on [Platform]. Love the approach! Quick question - are you currently taking on new clients for [Service] this month?'
      },
      {
        title: 'Day 7 Soft Breakup Nudge',
        type: 'prompt',
        description: 'Non-pushy follow-up template that revives cold conversations.',
        preview: 'Hey [First Name], assuming you are super busy right now. Should I close your file for now, or would you still like me to send over the case study?'
      }
    ]
  },
  {
    title: 'Proposal & Onboarding',
    icon: 'file',
    items: [
      {
        title: 'Word-for-Word Retainer Proposal Agreement',
        type: 'text',
        description: 'Fill-in-the-blank scope of work agreement used to close $2,000+/mo retainers.'
      },
      {
        title: 'Client Onboarding Intake Questionnaire',
        type: 'text',
        description: 'Automated Notion questionnaire for new clients before kickoff calls.'
      }
    ]
  }
];

/* ─── Types ─────────────────────────────────────────────────── */
type SectionKey =
  | 'hero' | 'quick_facts' | 'action_links' | 'problem' | 'inside'
  | 'features' | 'video' | 'gallery' | 'how_it_works'
  | 'downloads' | 'testimonials' | 'faq' | 'related';

const DEFAULT_SECTIONS: SectionKey[] = [
  'hero', 'quick_facts', 'action_links', 'problem', 'inside',
  'how_it_works', 'features', 'testimonials', 'video', 'gallery', 'downloads', 'faq', 'related',
];

/* ─── Sub-components ─────────────────────────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-bold text-accent tracking-[0.15em] uppercase block mb-2">
      {children}
    </span>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border-primary rounded-xl overflow-hidden bg-white hover:border-border-dark transition-all shadow-xs">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left text-[14px] font-bold text-text-primary hover:bg-bg-secondary transition-colors cursor-pointer"
      >
        <span>{question}</span>
        {open
          ? <ChevronUp className="w-4 h-4 text-text-muted shrink-0" />
          : <ChevronDown className="w-4 h-4 text-text-muted shrink-0" />
        }
      </button>
      {open && (
        <div className="px-5 pb-4 text-[13.5px] text-text-muted leading-relaxed border-t border-border-primary pt-3 animate-in fade-in duration-150 bg-bg-secondary/40">
          {answer}
        </div>
      )}
    </div>
  );
}

/* ─── Quick Facts ───────────────────────────────────────────── */
const QUICK_FACT_ICONS: Record<string, string> = {
  setup_time: '⏱', best_for: '👤', skill_level: '🎯',
  delivery: '📦', updates: '🔄', support: '💬',
  format: '📋', platform: '🖥', language: '🌐',
};

function QuickFacts({ facts }: { facts: Record<string, string> | null | undefined }) {
  if (!facts || Object.keys(facts).length === 0) return null;

  const entries = Object.entries(facts);
  const labelize = (key: string) => key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
      {entries.map(([key, value]) => (
        <div
          key={key}
          className="bg-white border border-border-primary rounded-xl px-4 py-3.5 flex items-start gap-3 hover:border-border-dark transition-all shadow-xs"
        >
          <span className="text-[18px] shrink-0 leading-none mt-0.5">
            {QUICK_FACT_ICONS[key] || '•'}
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold text-text-light uppercase tracking-wider truncate">
              {labelize(key)}
            </p>
            <p className="text-[13.5px] font-bold text-text-primary leading-snug mt-0.5">{value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Hero Section ───────────────────────────────────────────── */
function HeroSection({ product, normProduct }: { product: any; normProduct: any }) {
  const hasPreview = !!product.preview_url;
  const hasDocs = !!product.documentation_url;
  const hasGithub = !!product.github_url;

  return (
    <section>
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/5 border border-accent/10 mb-5">
        <span className="w-1.5 h-1.5 bg-accent rounded-full animate-blink shrink-0" />
        <span className="text-[11px] font-bold text-accent uppercase tracking-wider">
          ScaleCraft Certified · {product.product_subtype || product.product_type || 'Digital Product'}
        </span>
      </div>

      <h1 className="font-heading text-clamp-h1 font-black leading-[1.06] text-foreground tracking-[-1px] mb-4">
        {normProduct.name.en}
      </h1>

      <p className="text-[16px] text-text-muted leading-[1.7] mb-6 max-w-2xl font-body">
        {normProduct.description.en}
      </p>

      {/* Social proof stars */}
      <div className="flex items-center gap-1.5 mb-6">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
        ))}
        <span className="text-[13.5px] font-bold text-text-primary ml-1">4.9/5</span>
        <span className="text-[12px] text-text-muted ml-1">&middot; Verified Purchases</span>
      </div>

      {/* Action CTA Buttons (if URLs exist) */}
      {(hasPreview || hasDocs || hasGithub) && (
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {hasPreview && (
            <a
              href={product.preview_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-accent text-white px-4 py-2.5 rounded-xl text-[13px] font-bold hover:bg-blue-700 transition-all shadow-sm"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Live Interactive Demo</span>
            </a>
          )}
          {hasDocs && (
            <a
              href={product.documentation_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white border border-border-dark text-text-primary px-4 py-2.5 rounded-xl text-[13px] font-bold hover:bg-bg-secondary transition-all shadow-xs"
            >
              <BookOpen className="w-4 h-4 text-accent" />
              <span>Documentation</span>
            </a>
          )}
          {hasGithub && (
            <a
              href={product.github_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white border border-border-dark text-text-primary px-4 py-2.5 rounded-xl text-[13px] font-bold hover:bg-bg-secondary transition-all shadow-xs"
            >
              <Code2 className="w-4 h-4 text-text-primary" />
              <span>GitHub Repository</span>
            </a>
          )}
        </div>
      )}

      {/* Trust metadata */}
      <div className="flex flex-wrap gap-5 text-[12.5px] text-text-muted font-bold border-t border-border-primary pt-5 mb-6">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-green" />
          7-Day Results Guarantee
        </span>
        <span className="flex items-center gap-1.5">
          <RefreshCw className="w-4 h-4 text-accent" />
          Updated {normProduct.lastUpdated || 'Recently'}
        </span>
        <span className="flex items-center gap-1.5">
          <Check className="w-4 h-4 text-green" />
          Instant Access after Checkout
        </span>
      </div>

      {/* Dynamic Banner URL */}
      {product.banner_url && (
        <div className="mt-2 rounded-card-lg overflow-hidden border border-border-primary shadow-card">
          <img
            src={product.banner_url}
            alt={normProduct.name.en}
            className="w-full object-cover max-h-96"
          />
        </div>
      )}
    </section>
  );
}

/* ─── Action Links Section ───────────────────────────────────── */
function ActionLinksSection({ product }: { product: any }) {
  const links = [
    product.preview_url && {
      title: 'Live Preview',
      desc: 'Test drive the live product environment.',
      url: product.preview_url,
      icon: ExternalLink,
      badge: 'Interactive'
    },
    product.documentation_url && {
      title: 'Documentation & Guides',
      desc: 'Setup instructions, API docs, and workflows.',
      url: product.documentation_url,
      icon: BookOpen,
      badge: 'Docs'
    },
    product.github_url && {
      title: 'GitHub Repository',
      desc: 'Source code and technical architecture.',
      url: product.github_url,
      icon: Code2,
      badge: 'Code'
    },
    product.notion_url && {
      title: 'Notion Master Workspace',
      desc: 'Direct Notion template duplicate link.',
      url: product.notion_url,
      icon: Layers,
      badge: 'Workspace'
    }
  ].filter(Boolean);

  if (links.length === 0) return null;

  return (
    <section>
      <SectionLabel>Live Resources & Links</SectionLabel>
      <h2 className="font-heading text-clamp-h2 font-black leading-tight text-text-primary mb-5">
        Explore before checkout
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {links.map((link: any, i: number) => {
          const Icon = link.icon;
          return (
            <a
              key={i}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start justify-between p-4 bg-white border border-border-primary rounded-xl hover:border-accent hover:shadow-card transition-all group shadow-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[13.5px] font-bold text-text-primary group-hover:text-accent transition-colors">
                    {link.title}
                  </span>
                  <span className="text-[9px] font-extrabold uppercase bg-accent/5 text-accent px-1.5 py-0.5 rounded border border-accent/10">
                    {link.badge}
                  </span>
                </div>
                <p className="text-[12px] text-text-muted">{link.desc}</p>
              </div>
              <Icon className="w-4 h-4 text-text-light group-hover:text-accent shrink-0 transition-colors mt-1" />
            </a>
          );
        })}
      </div>
    </section>
  );
}

/* ─── Problem Section ────────────────────────────────────────── */
function ProblemSection({ product }: { product: any }) {
  if (!product.long_description) return null;
  return (
    <section>
      <SectionLabel>The Problem It Solves</SectionLabel>
      <h2 className="font-heading text-clamp-h2 font-black leading-tight text-text-primary mb-4">
        Why this was built
      </h2>
      <div className="bg-bg-secondary border border-border-primary rounded-card-lg p-6 md:p-8 shadow-xs">
        <p className="text-[15.5px] text-text-muted leading-[1.75] whitespace-pre-line font-body">
          {product.long_description}
        </p>
      </div>
    </section>
  );
}

/* ─── Features Section ───────────────────────────────────────── */
function FeaturesSection({ features }: { features: string[] }) {
  if (!features.length) return null;
  return (
    <section id="included">
      <SectionLabel>Everything Included</SectionLabel>
      <h2 className="font-heading text-clamp-h2 font-black leading-tight text-text-primary mb-6">
        What&apos;s in the box
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {features.map((feat, i) => (
          <div key={i} className="flex items-start gap-3 bg-bg-secondary border border-border-primary rounded-xl px-4 py-3.5 hover:border-border-dark transition-all shadow-xs">
            <span className="text-green font-black text-[13px] shrink-0 mt-0.5">✓</span>
            <span className="text-[13.5px] text-text-primary leading-snug font-semibold">{feat}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── Video Section ──────────────────────────────────────────── */
function VideoSection({ product, normName }: { product: any; normName: string }) {
  const youtubeUrl = product.youtube_url;
  const loomUrl = product.loom_url;
  const demoUrl = product.demo_video_url;
  if (!youtubeUrl && !loomUrl && !demoUrl) return null;

  const embedUrl = formatEmbedUrl(youtubeUrl || loomUrl || '');

  return (
    <section>
      <SectionLabel>Video Walkthrough</SectionLabel>
      <h2 className="font-heading text-clamp-h2 font-black leading-tight text-text-primary mb-5">
        See it in action
      </h2>
      <div className="aspect-video rounded-card-lg overflow-hidden border border-border-dark shadow-premium bg-black">
        {embedUrl ? (
          <iframe
            src={embedUrl}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            title={`${normName} Walkthrough`}
          />
        ) : (
          <video src={demoUrl} controls className="w-full h-full object-cover" />
        )}
      </div>
    </section>
  );
}

/* ─── Media Showcase Gallery Section ─────────────────────────── */
function GallerySection({ media, normName }: { media: any[]; normName: string }) {
  if (!media || media.length === 0) return null;

  return (
    <section id="screenshots">
      <SectionLabel>Media Showcase</SectionLabel>
      <h2 className="font-heading text-clamp-h2 font-black leading-tight text-text-primary mb-5">
        Inside look &amp; previews
      </h2>
      <div className={`grid gap-4 ${media.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
        {media.map((m, i) => (
          <div key={i} className="rounded-xl overflow-hidden border border-border-primary bg-bg-secondary shadow-card flex flex-col">
            {m.type === 'video' ? (
              <div className="aspect-video bg-black">
                <iframe src={formatEmbedUrl(m.url)} className="w-full h-full border-0" allowFullScreen />
              </div>
            ) : m.type === 'pdf' ? (
              <a href={m.url} target="_blank" rel="noopener noreferrer" className="p-6 flex items-center gap-3 bg-white hover:bg-bg-secondary transition-colors">
                <FileText className="w-8 h-8 text-accent shrink-0" />
                <div>
                  <p className="text-[13px] font-bold text-text-primary">{m.title || 'PDF Preview'}</p>
                  <p className="text-[11px] text-text-muted">Click to view document ↗</p>
                </div>
              </a>
            ) : (
              <img
                src={m.url}
                alt={m.alt_text || m.title || `${normName} media ${i + 1}`}
                className="w-full object-cover hover:scale-[1.01] transition-transform duration-300"
                loading="lazy"
              />
            )}
            {m.title && (
              <div className="px-4 py-2 bg-white border-t border-border-primary text-[11px] font-bold text-text-muted">
                {m.title}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── How It Works Section ───────────────────────────────────── */
function HowItWorksSection({ product }: { product: any }) {
  const steps = Array.isArray(product?.how_it_works_steps) && product.how_it_works_steps.length > 0
    ? product.how_it_works_steps
    : Array.isArray(product?.how_it_works) && product.how_it_works.length > 0
    ? product.how_it_works
    : null;

  if (!steps || steps.length === 0) return null;

  return (
    <section>
      <SectionLabel>How It Works</SectionLabel>
      <h2 className="font-heading text-clamp-h2 font-black leading-tight text-text-primary mb-6">
        From checkout to results
      </h2>
      <div className="relative space-y-4">
        <div className="absolute left-5 top-8 bottom-8 w-px bg-border-dark hidden sm:block" />
        {steps.map((s: any, i: number) => (
          <div key={i} className="flex items-start gap-4 relative">
            <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-[13px] font-black text-accent shrink-0 z-10 bg-white">
              {s.number || i + 1}
            </div>
            <div className="flex-1 bg-white border border-border-primary rounded-xl p-4 shadow-xs">
              <p className="text-[14px] font-black text-text-primary mb-0.5">{s.title || s.name}</p>
              <p className="text-[12.5px] text-text-muted leading-relaxed">{s.desc || s.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── Downloads Section ──────────────────────────────────────── */
function DownloadsSection({ downloads }: { downloads: any[] }) {
  if (!downloads || !downloads.length) return null;
  return (
    <section>
      <SectionLabel>Included Resources</SectionLabel>
      <h2 className="font-heading text-clamp-h2 font-black leading-tight text-text-primary mb-5">
        Resources you&apos;ll receive
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {downloads.map((d, i) => (
          <div key={i} className="flex items-center gap-3.5 bg-white border border-border-primary rounded-xl px-4 py-3.5 shadow-xs">
            <div className="w-9 h-9 rounded-lg bg-accent/5 border border-accent/10 flex items-center justify-center shrink-0 text-[15px]">
              {d.type === 'pdf' ? '📄' : d.type === 'video' ? '🎥' : d.type === 'notion_template' ? '📝' : '📦'}
            </div>
            <div className="min-w-0">
              <p className="text-[13.5px] font-bold text-text-primary truncate">{d.title || 'Resource Asset'}</p>
              <p className="text-[10px] text-text-light font-bold uppercase tracking-wider">{(d.type || 'resource').replace(/_/g, ' ')}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── FAQ Section ────────────────────────────────────────────── */
function FaqSection({ faqs }: { faqs: any[] }) {
  if (!faqs || !faqs.length) return null;
  return (
    <section id="faq">
      <SectionLabel>Frequently Asked Questions</SectionLabel>
      <h2 className="font-heading text-clamp-h2 font-black leading-tight text-text-primary mb-6">
        Common questions answered
      </h2>
      <div className="space-y-2.5">
        {faqs.map((f, i) => (
          <FaqItem key={i} question={f.question} answer={f.answer} />
        ))}
      </div>
    </section>
  );
}

/* ─── Related Products Section ───────────────────────────────── */
function RelatedSection({ items }: { items: any[] }) {
  if (!items || !items.length) return null;
  return (
    <section>
      <SectionLabel>You Might Also Like</SectionLabel>
      <h2 className="font-heading text-clamp-h2 font-black leading-tight text-text-primary mb-5">
        Complete your toolkit
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {items.slice(0, 4).map((item, i) => {
          const itemSlug = item.slug;
          if (!itemSlug) return null;
          const nameObj = item.name;
          const titleStr = typeof nameObj === 'string'
            ? nameObj
            : (nameObj?.en || itemSlug.split('-').map((w: string) => w[0]?.toUpperCase() + w.slice(1)).join(' '));
          return (
            <Link
              key={i}
              href={`/products/${itemSlug}`}
              className="flex items-center justify-between gap-3 bg-white border border-border-primary rounded-xl p-4 hover:border-accent hover:shadow-card transition-all group shadow-xs"
            >
              <span className="text-[13.5px] font-bold text-text-primary group-hover:text-accent transition-colors truncate">
                {titleStr}
              </span>
              <ArrowRight className="w-4 h-4 text-text-light group-hover:text-accent shrink-0 transition-colors" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}

interface CoreProductItem {
  id: string;
  name: string;
  slug: string;
  price: number;
  international_price: number;
  description: string;
  features: string[];
  product_type: string;
  category: string;
}

function EverythingIncludedSection({
  items,
  isIndia,
  symbol
}: {
  items: CoreProductItem[];
  isIndia: boolean;
  symbol: string;
}) {
  const productMappings: Record<string, { stage: string; outcome: string; features: string[] }> = {
    'ai-lead-finder-system': {
      stage: 'FIND',
      outcome: 'Identify target prospects on autopilot.',
      features: ['Find 50+ local leads weekly', 'Auto-scrapes contact details', 'Interactive search filter']
    },
    'freelance-client-pipeline-blueprint': {
      stage: 'ORGANIZE',
      outcome: 'Sync prospects to a visual pipeline CRM.',
      features: ['Visual Kanban pipeline board', 'Lead status tracking', 'Deal value calculator']
    },
    'ai-client-acquisition-system': {
      stage: 'REACH + FOLLOW UP',
      outcome: 'Reach out and follow up automatically.',
      features: ['50+ cold outreach templates', 'Day 3 & Day 7 follow-up triggers', 'Automated messaging vault']
    },
    'proposal-system': {
      stage: 'PROPOSE + CLOSE',
      outcome: 'Write scopes and close retainer contracts.',
      features: ['Fill-in-the-blank agreements', 'Objection handling response scripts', 'Professional scope structures']
    },
    'client-onboarding-system': {
      stage: 'ONBOARD',
      outcome: 'Onboard clients with professional workspaces.',
      features: ['Client onboarding dashboard', 'Automated welcome checklist', 'Asset collection folders']
    },
    'sop-process-library': {
      stage: 'DELIVER',
      outcome: 'Manage deliverables and team handovers.',
      features: ['Pre-built operational SOPs', 'Repeatable workflow blueprints', 'Milestone approval formats']
    }
  };

  return (
    <section id="bundle-breakdown" className="space-y-6 scroll-mt-24">
      <div>
        <SectionLabel>EVERYTHING INCLUDED</SectionLabel>
        <h2 className="font-heading text-clamp-h2 font-black leading-tight text-foreground tracking-[-0.03em]">
          Inside the Master Client System Bundle
        </h2>
        <p className="text-[14px] text-text-muted mt-2 max-w-2xl leading-relaxed">
          Instead of buying tools separately, get all six client acquisition workspaces and templates fully integrated.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {items.map((item) => {
          const mapping = productMappings[item.slug] || {
            stage: 'SYSTEM',
            outcome: item.description,
            features: Array.isArray(item.features) ? item.features.slice(0, 3) : []
          };
          const price = isIndia ? item.price : item.international_price;
          return (
            <div key={item.id} className="bg-white border border-border-primary rounded-2xl p-5 hover:border-border-dark transition-all shadow-xs flex flex-col justify-between">
              <div className="space-y-3.5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-[9px] font-extrabold text-accent uppercase tracking-wider bg-accent/5 px-2.5 py-1 rounded border border-accent/15">
                      STAGE {mapping.stage}
                    </span>
                    <h3 className="font-heading text-sm font-black text-text-primary mt-2.5">
                      {item.name}
                    </h3>
                  </div>
                  <span className="text-sm font-black text-text-primary whitespace-nowrap">
                    {symbol}{price}
                  </span>
                </div>

                <p className="text-[12.5px] text-text-muted leading-relaxed font-body">
                  {mapping.outcome}
                </p>

                <ul className="space-y-2 pt-1.5">
                  {mapping.features.slice(0, 3).map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-[12px] text-text-primary leading-normal">
                      <span className="text-emerald-500 font-extrabold shrink-0 mt-0.5">✓</span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-4 mt-5 border-t border-border-primary flex items-center justify-between">
                <Link href={`/products/${item.slug}`} className="text-xs font-bold text-accent hover:underline flex items-center gap-1">
                  View Product <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function BundleWorkflowSection() {
  const steps = [
    { name: 'FIND', icon: '🔍', desc: 'Sourcing leads' },
    { name: 'ORGANIZE', icon: '📋', desc: 'Syncing pipeline' },
    { name: 'REACH', icon: '✉️', desc: 'Sending pitches' },
    { name: 'FOLLOW UP', icon: '🔄', desc: 'Outreach nudges' },
    { name: 'PROPOSE', icon: '📄', desc: 'Scoping offers' },
    { name: 'CLOSE', icon: '🤝', desc: 'Closing retainers' },
    { name: 'ONBOARD', icon: '👋', desc: 'Intake workflows' },
    { name: 'DELIVER', icon: '🚀', desc: 'SOP execution' },
  ];

  return (
    <section className="space-y-6">
      <div>
        <SectionLabel>WORKFLOW PIPELINE</SectionLabel>
        <h2 className="font-heading text-clamp-h2 font-black leading-tight text-foreground tracking-[-0.03em]">
          The Complete Business Workflow
        </h2>
        <p className="text-[14px] text-text-muted mt-2 max-w-2xl leading-relaxed">
          How the six core systems connect sequentially to run your acquisition operations.
        </p>
      </div>

      {/* Desktop Horizontal Workflow */}
      <div className="hidden lg:flex items-center justify-between gap-1 relative py-4">
        <div className="absolute top-[38px] left-[5%] right-[5%] h-0.5 bg-border-primary z-0" />
        {steps.map((step, idx) => (
          <div key={idx} className="flex-1 text-center space-y-2 relative z-10">
            <div className="w-12 h-12 rounded-full bg-white border-2 border-border-primary hover:border-accent flex items-center justify-center mx-auto shadow-xs transition-all select-none">
              <span className="text-lg">{step.icon}</span>
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] font-black text-text-primary uppercase tracking-wide">
                {step.name}
              </p>
              <p className="text-[9px] text-text-light leading-snug">
                {step.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Mobile Vertical Connected Timeline */}
      <div className="lg:hidden space-y-4 relative pl-8 py-2">
        <div className="absolute left-[20px] top-4 bottom-4 w-0.5 bg-border-primary" />
        {steps.map((step, idx) => (
          <div key={idx} className="flex items-start gap-4 relative">
            <div className="absolute left-[-28px] top-1.5 w-6 h-6 rounded-full bg-white border-2 border-border-primary flex items-center justify-center z-10 text-[10px] font-black select-none">
              {idx + 1}
            </div>
            <div className="min-w-0">
              <h4 className="font-heading text-xs font-black text-text-primary uppercase tracking-wider flex items-center gap-2">
                <span>{step.name}</span>
                <span className="text-[13px]">{step.icon}</span>
              </h4>
              <p className="text-[12px] text-text-muted leading-relaxed mt-0.5">
                {step.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function BonusesSection({
  dbBonus,
  isIndia,
  symbol
}: {
  dbBonus: any;
  isIndia: boolean;
  symbol: string;
}) {
  const bonusPrice = dbBonus ? (isIndia ? dbBonus.price : dbBonus.international_price) : 0;

  const bonuses = [
    {
      title: 'Bonus 1: First Freelance Client System',
      description: 'Daily challenge checklist and outreach frameworks designed to land your first client in 7 days.',
      valueText: 'FREE',
      badge: 'System Guide'
    },
    {
      title: 'Bonus 2: AI Income Blueprint',
      description: dbBonus?.description || 'Complete video guide and prompting roadmap to package and sell AI services to global clients.',
      valueText: bonusPrice > 0 ? `Value: ${symbol}${bonusPrice}` : 'FREE',
      badge: 'Training Course',
      slug: dbBonus?.slug
    },
    {
      title: 'Bonus 3: 100 AI Client Acquisition Prompts',
      description: 'Tested ChatGPT & Claude prompts to write high-converting pitches and handle client objections.',
      valueText: 'FREE',
      badge: 'Prompt Vault'
    }
  ];

  return (
    <section id="bonuses" className="bg-emerald-50/50 border border-emerald-500/10 rounded-2xl p-5 sm:p-6 space-y-5 scroll-mt-24">
      <div>
        <span className="text-[9px] font-extrabold text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded uppercase tracking-wider inline-block">
          LIMITED TIME OFFER
        </span>
        <h2 className="font-heading text-clamp-h2 font-black leading-tight text-foreground tracking-[-0.03em] mt-3">
          Get 3 Premium Bonuses For Free
        </h2>
        <p className="text-[13.5px] text-text-muted mt-1 leading-relaxed">
          Claim these complementary business accelerators added instantly to your dashboard at checkout.
        </p>
      </div>

      <div className="space-y-3">
        {bonuses.map((bonus, idx) => (
          <div key={idx} className="bg-white border border-border-primary rounded-xl p-4.5 shadow-2xs flex flex-col sm:flex-row justify-between gap-3.5 transition-all">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[8px] font-extrabold text-emerald-700 uppercase bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">
                  {bonus.badge}
                </span>
              </div>
              <h3 className="font-heading text-xs font-black text-text-primary pt-1">
                {bonus.title}
              </h3>
              <p className="text-[12px] text-text-muted leading-relaxed font-body">
                {bonus.description}
              </p>
            </div>
            <div className="flex items-center justify-between sm:justify-end sm:flex-col gap-2 shrink-0 sm:text-right border-t sm:border-t-0 border-border-primary pt-2.5 sm:pt-0">
              <span className="text-[11.5px] font-extrabold text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded uppercase tracking-wider">
                {bonus.valueText}
              </span>
              {bonus.slug && (
                <Link href={`/products/${bonus.slug}`} className="text-xs font-bold text-accent hover:underline flex items-center gap-1">
                  View Course <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function DynamicValueComparison({
  totalValue,
  comboPrice,
  savings,
  isIndia,
  symbol
}: {
  totalValue: number;
  comboPrice: number;
  savings: number;
  isIndia: boolean;
  symbol: string;
}) {
  return (
    <div className="bg-accent/5 border border-accent/20 rounded-2xl p-5 sm:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <span className="text-[9px] font-extrabold text-accent uppercase tracking-wider bg-accent/10 px-2.5 py-1 rounded">
            BUNDLE VALUE CALCULATOR
          </span>
          <h3 className="font-heading text-sm font-black text-text-primary mt-3">
            Dynamic Savings Summary
          </h3>
          <p className="text-[12.5px] text-text-muted mt-1 leading-relaxed">
            Dynamic sum based strictly on current standalone selling prices from your database.
          </p>
        </div>
        <div className="bg-accent text-white px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wide shrink-0 shadow-md">
          Save {Math.round((savings / totalValue) * 100)}% Today
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1.5">
        <div className="bg-white border border-border-primary rounded-xl p-4 text-center space-y-1 shadow-2xs">
          <p className="text-[9.5px] font-extrabold text-text-light uppercase tracking-wider">
            6 Core Systems Value
          </p>
          <p className="text-base font-bold text-text-primary line-through">
            {symbol}{totalValue.toLocaleString(isIndia ? 'en-IN' : 'en-US')}
          </p>
        </div>

        <div className="bg-white border border-accent/30 rounded-xl p-4 text-center space-y-1 shadow-2xs ring-1 ring-accent/10">
          <p className="text-[9.5px] font-extrabold text-accent uppercase tracking-wider">
            Master Combo Price
          </p>
          <p className="text-base font-black text-text-primary">
            {symbol}{comboPrice.toLocaleString(isIndia ? 'en-IN' : 'en-US')}
          </p>
        </div>

        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4 text-center space-y-1 shadow-2xs">
          <p className="text-[9.5px] font-extrabold text-emerald-600 uppercase tracking-wider">
            Total Money Saved
          </p>
          <p className="text-base font-black text-emerald-600">
            {symbol}{savings.toLocaleString(isIndia ? 'en-IN' : 'en-US')}
          </p>
        </div>
      </div>
    </div>
  );
}


/* ─── Main Component: Universal Section Renderer ──────────────── */
export default function ProductPageClient({
  product,
  activeOffer
}: {
  product: any;
  activeOffer?: any;
}) {
  const [geoPayment, setGeoPayment] = useState({
    isIndia: true, currency: 'INR', symbol: '₹', loading: true,
  });

  const normProduct = normalizeProduct(product);

  const isUnderOffer = activeOffer && activeOffer.products_included && activeOffer.products_included.includes(product._id);
  const prefilledCouponCode = isUnderOffer ? activeOffer.coupon_code : undefined;

  useEffect(() => {
    window.scrollTo(0, 0);
    const detectGeo = async () => {
      try {
        const urlGeo = new URLSearchParams(window.location.search).get('geo');
        const countryCode = urlGeo?.toUpperCase() ||
          await fetch('/api/geo', { signal: AbortSignal.timeout(4000) })
            .then(r => r.json()).then(d => d.country_code);
        const isIndia = countryCode === 'IN';
        setGeoPayment({ isIndia, currency: isIndia ? 'INR' : 'USD', symbol: isIndia ? '₹' : '$', loading: false });
      } catch {
        setGeoPayment({ isIndia: true, currency: 'INR', symbol: '₹', loading: false });
      }
    };
    detectGeo();
  }, []);

  useEffect(() => {
    if (!geoPayment.loading && normProduct.name.en) {
      const price = geoPayment.isIndia ? normProduct.priceINR : normProduct.priceUSD;
      trackEvent('product_viewed', { content_name: normProduct.name.en, value: price, currency: geoPayment.currency });
    }
  }, [geoPayment.loading]);

  const isMasterCombo = product.slug?.current === 'scalecraft-master-client-system' || product.slug === 'scalecraft-master-client-system' || product.id === 'scalecraft-master-client-system';

  // Calculate dynamic bundle value if this is the Master Client System combo
  let bundleStandaloneValueINR: number | undefined;
  let bundleStandaloneValueUSD: number | undefined;
  let bundleSavingsINR: number | undefined;
  let bundleSavingsUSD: number | undefined;

  let coreProducts: any[] = [];
  let dbBonusProduct: any = null;

  if (isMasterCombo) {
    const bundleItems = (product.relatedProducts || []).filter((p: any) => p.relationship_type === 'bundle');
    coreProducts = bundleItems;

    const bonusItems = (product.relatedProducts || []).filter((p: any) => p.relationship_type === 'bonus');
    dbBonusProduct = bonusItems.find((p: any) => p.slug === 'ai-income-blueprint');

    const calculatedCorePriceINR = coreProducts.reduce((sum: number, p: any) => sum + (Number(p.price) || 0), 0);
    const calculatedCorePriceUSD = coreProducts.reduce((sum: number, p: any) => sum + (Number(p.international_price) || 0), 0);

    bundleStandaloneValueINR = calculatedCorePriceINR;
    bundleStandaloneValueUSD = calculatedCorePriceUSD;

    bundleSavingsINR = calculatedCorePriceINR - 1499;
    bundleSavingsUSD = calculatedCorePriceUSD - 60;
  }

  // Data bindings from relational tables with legacy fallbacks
  const content = product.content || {};
  const media: any[] = (product.media_assets && product.media_assets.length > 0) ? product.media_assets : (product.media || []);
  const testimonials: any[] = (product.testimonials_list && product.testimonials_list.length > 0) ? product.testimonials_list : (product.testimonials || []);
  const relationships = product.relationships || [];
  
  const faqs: any[] = content.faq || product.faqs || [];
  const downloads: any[] = product.downloads || [];
  const features: string[] = content.benefits || product.features || [];
  
  // Interactive Product Explorer section resolution
  const previewSections = (content.page_sections?.find((s: any) => s.id === 'inside' || s.type === 'inside')?.data?.sections) ||
    product.preview_sections ||
    (product.slug?.current === 'freelance-client-pipeline-blueprint' || product.slug === 'freelance-client-pipeline-blueprint' || product.id === 'freelance-client-pipeline-blueprint'
      ? DEFAULT_BLUEPRINT_PREVIEW
      : null);

  const quickFacts = content.display_config?.quick_facts || product.quick_facts || null;
  const relatedIds: string[] = (relationships.length > 0)
    ? relationships.map((r: any) => r.related_product_id)
    : (product.related_product_ids || []);

  // Respect display_config layout toggles from database content
  const displayConfig = content.display_config || {};
  const secVis = {
    hero: displayConfig.hero !== false,
    preview: displayConfig.show_preview !== false && displayConfig.inside !== false,
    benefits: displayConfig.show_benefits !== false && displayConfig.features !== false,
    testimonials: displayConfig.show_testimonials !== false,
    faq: displayConfig.faq_enabled !== false,
    related: displayConfig.show_related !== false,
    ...product.section_visibility
  };

  // Section order — from DB (filtered to valid section keys) or fallback default
  const validDbSections = Array.isArray(product.page_sections)
    ? product.page_sections.filter((s: string) => DEFAULT_SECTIONS.includes(s as SectionKey))
    : [];

  let rawSections: SectionKey[] = (validDbSections.length > 0 && validDbSections.includes('hero'))
    ? (validDbSections as SectionKey[])
    : DEFAULT_SECTIONS;

  if (media.length > 0 && !rawSections.includes('gallery')) {
    const featIdx = rawSections.indexOf('features');
    if (featIdx !== -1) {
      rawSections = [...rawSections.slice(0, featIdx + 1), 'gallery', ...rawSections.slice(featIdx + 1)];
    } else {
      rawSections = [...rawSections, 'gallery'];
    }
  }

  // Strict dynamic availability map (renders ONLY if data exists AND section is not hidden by admin)
  const hasContent: Record<SectionKey, boolean> = {
    hero: secVis.hero !== false,
    quick_facts: !!(quickFacts && Object.keys(quickFacts).length > 0),
    action_links: !!(product.preview_url || product.documentation_url || product.github_url || product.notion_url),
    problem: !!product.long_description,
    inside: isMasterCombo ? true : (secVis.preview !== false && !!(previewSections && previewSections.length > 0)),
    features: isMasterCombo ? false : (secVis.benefits !== false && features.length > 0),
    video: !!(product.youtube_url || product.loom_url || product.demo_video_url),
    gallery: media.length > 0,
    how_it_works: true,
    downloads: downloads.length > 0,
    testimonials: secVis.testimonials !== false && testimonials.length > 0,
    faq: secVis.faq !== false && faqs.length > 0,
    related: secVis.related !== false && relatedIds.length > 0,
  };

  const activeSections = rawSections.filter(s => hasContent[s]);

  const renderSection = (key: SectionKey) => {
    switch (key) {
      case 'hero':
        return <HeroSection key="hero" product={product} normProduct={normProduct} />;
      case 'quick_facts':
        return <QuickFacts key="quick_facts" facts={quickFacts} />;
      case 'action_links':
        return <ActionLinksSection key="action_links" product={product} />;
      case 'problem':
        return <ProblemSection key="problem" product={product} />;
      case 'inside':
        if (isMasterCombo) {
          const currentTotalValue = geoPayment.isIndia ? (bundleStandaloneValueINR || 0) : (bundleStandaloneValueUSD || 0);
          const currentComboPrice = geoPayment.isIndia ? 1499 : 60;
          const currentSavings = currentTotalValue - currentComboPrice;
          return (
            <div key="inside" className="space-y-12 lg:space-y-16">
              <BundleWorkflowSection />
              <EverythingIncludedSection items={coreProducts} isIndia={geoPayment.isIndia} symbol={geoPayment.symbol} />
              <BonusesSection dbBonus={dbBonusProduct} isIndia={geoPayment.isIndia} symbol={geoPayment.symbol} />
              <DynamicValueComparison
                totalValue={currentTotalValue}
                comboPrice={currentComboPrice}
                savings={currentSavings}
                isIndia={geoPayment.isIndia}
                symbol={geoPayment.symbol}
              />
            </div>
          );
        }
        return <InsideThisProduct key="inside" sections={previewSections} />;
      case 'features':
        return <FeaturesSection key="features" features={features} />;
      case 'video':
        return <VideoSection key="video" product={product} normName={normProduct.name.en} />;
      case 'gallery':
        return <GallerySection key="gallery" media={media} normName={normProduct.name.en} />;
      case 'how_it_works':
        return <HowItWorksSection key="how_it_works" product={product} />;
      case 'downloads':
        return <DownloadsSection key="downloads" downloads={downloads} />;
      case 'testimonials':
        return <ProductTestimonials key="testimonials" reviews={testimonials} />;
      case 'faq':
        return <FaqSection key="faq" faqs={faqs} />;
      case 'related':
        const nonBundleRelated = (product.relatedProducts || []).filter(
          (p: any) => p.relationship_type !== 'bundle' && p.relationship_type !== 'bonus'
        );
        return <RelatedSection key="related" items={nonBundleRelated} />;
      default:
        return null;
    }
  };

  return (
    <main className="min-h-screen bg-background text-text-primary pt-24 pb-20 font-body">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Two-Column Layout */}
        <div className="flex flex-col lg:flex-row gap-10 lg:gap-12 items-start">
          
          {/* LEFT COLUMN: Universal Dynamic Section Engine */}
          <div className="flex-1 min-w-0 space-y-12 lg:space-y-16 w-full">
            {activeSections.map(key => renderSection(key))}
            <ProductAiSearchBlock product={product} />

            {/* Product to Blog Interlinking Section */}
            <section className="bg-bg-secondary border border-border-primary rounded-2xl p-6 sm:p-8 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-accent tracking-[0.15em] uppercase block">
                    TOPICAL GUIDES &amp; COMPARISONS
                  </span>
                  <h3 className="font-heading text-lg font-bold text-text-primary">
                    Learn how to scale with {normProduct.name.en}
                  </h3>
                </div>
                <Link href="/blog" className="text-xs font-bold text-accent hover:underline flex items-center gap-1">
                  View Blog <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[13px] pt-2">
                <Link href="/guides/ai-client-acquisition" className="p-3.5 bg-white border border-border-primary rounded-xl font-bold text-text-primary hover:text-accent transition-colors flex items-center justify-between">
                  <span>AI Client Acquisition Guide</span>
                  <ArrowRight className="w-3.5 h-3.5 text-accent" />
                </Link>
                <Link href="/guides/cold-outreach-playbook" className="p-3.5 bg-white border border-border-primary rounded-xl font-bold text-text-primary hover:text-accent transition-colors flex items-center justify-between">
                  <span>Cold Outreach 40%+ Response Guide</span>
                  <ArrowRight className="w-3.5 h-3.5 text-accent" />
                </Link>
                <Link href="/compare/scalecraft-agent-vs-manychat" className="p-3.5 bg-white border border-border-primary rounded-xl font-bold text-text-primary hover:text-accent transition-colors flex items-center justify-between">
                  <span>ScaleCraft Agent vs ManyChat</span>
                  <ArrowRight className="w-3.5 h-3.5 text-accent" />
                </Link>
                <Link href="/compare/lead-finder-vs-apollo" className="p-3.5 bg-white border border-border-primary rounded-xl font-bold text-text-primary hover:text-accent transition-colors flex items-center justify-between">
                  <span>AI Lead Finder vs Apollo.io</span>
                  <ArrowRight className="w-3.5 h-3.5 text-accent" />
                </Link>
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN: Sticky Conversion Purchase Card */}
          <div className="w-full lg:w-[380px] xl:w-[400px] shrink-0 sticky top-28 space-y-4">
            <PurchaseCard
              product={product}
              geoPayment={geoPayment}
              bundleStandaloneValueINR={isMasterCombo ? bundleStandaloneValueINR : undefined}
              bundleStandaloneValueUSD={isMasterCombo ? bundleStandaloneValueUSD : undefined}
              bundleSavingsINR={isMasterCombo ? bundleSavingsINR : undefined}
              bundleSavingsUSD={isMasterCombo ? bundleSavingsUSD : undefined}
              prefilledCouponCode={isUnderOffer ? activeOffer?.coupon_code : undefined}
              activeOffer={isUnderOffer ? activeOffer : undefined}
            />
          </div>
        </div>

      </div>

      {/* Mobile Sticky CTA Bar */}
      <StickyMobileCard 
        product={product} 
        geoPayment={geoPayment} 
        prefilledCouponCode={isUnderOffer ? activeOffer?.coupon_code : undefined}
      />
    </main>
  );
}
