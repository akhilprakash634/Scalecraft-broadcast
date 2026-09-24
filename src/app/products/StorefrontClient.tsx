/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  ArrowRight, Target, Bot, Workflow, Rocket, Star, Check, 
  ChevronDown, ChevronUp, ShieldCheck, Search, X, Sparkles
} from 'lucide-react';
import BuyButton from '@/components/ui/BuyButton';
import { normalizeProduct } from '@/lib/content';

interface StorefrontClientProps {
  products: any[];
  testimonials: any[];
}

export default function StorefrontClient({ products, testimonials }: StorefrontClientProps) {
  // Geo Payment State
  const [geoPayment, setGeoPayment] = useState({
    isIndia: true,
    currency: 'INR',
    symbol: '₹',
    loading: true,
  });

  const [activeCategory, setActiveCategory] = useState<'all' | 'client-acquisition' | 'business' | 'automation' | 'templates'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileStickyVisible, setMobileStickyVisible] = useState(false);
  const [dismissSticky, setDismissSticky] = useState(false);
  const [openFaqs, setOpenFaqs] = useState<Record<number, boolean>>({});

  // Refs for smooth scrolling
  const goalSelectorRef = useRef<HTMLDivElement>(null);
  const recommendedSectionRef = useRef<HTMLDivElement>(null);
  const clientPipelineRef = useRef<HTMLDivElement>(null);
  const leadFinderRef = useRef<HTMLDivElement>(null);
  const proposalRef = useRef<HTMLDivElement>(null);
  const bundleSectionRef = useRef<HTMLDivElement>(null);
  const exploreSectionRef = useRef<HTMLDivElement>(null);
  const agentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const detectGeo = async () => {
      try {
        const urlGeo = new URLSearchParams(window.location.search).get('geo');
        const countryCode =
          urlGeo?.toUpperCase() ||
          (await fetch('/api/geo', { signal: AbortSignal.timeout(4000) })
            .then((r) => r.json())
            .then((d) => d.country_code));

        const isIndia = countryCode === 'IN';
        setGeoPayment({
          isIndia,
          currency: isIndia ? 'INR' : 'USD',
          symbol: isIndia ? '₹' : '$',
          loading: false,
        });
      } catch {
        setGeoPayment({ isIndia: true, currency: 'INR', symbol: '₹', loading: false });
      }
    };
    detectGeo();
  }, []);

  // Monitor scroll for mobile sticky CTA
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setMobileStickyVisible(true);
      } else {
        setMobileStickyVisible(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Find dynamic products
  const rawClientPipeline = products.find((p) => p.slug === 'freelance-client-pipeline-blueprint');
  const rawLeadFinder = products.find((p) => p.slug === 'ai-lead-finder-system');
  const rawProposal = products.find((p) => p.slug === 'proposal-system');
  const rawCombo = products.find((p) => p.slug === 'ai-systems-combo');

  const clientPipeline = rawClientPipeline ? normalizeProduct(rawClientPipeline) : null;
  const leadFinder = rawLeadFinder ? normalizeProduct(rawLeadFinder) : null;
  const proposal = rawProposal ? normalizeProduct(rawProposal) : null;
  const combo = rawCombo ? normalizeProduct(rawCombo) : null;

  // Calculate pricing dynamically
  const pipelinePrice = clientPipeline ? (geoPayment.isIndia ? clientPipeline.priceINR : clientPipeline.priceUSD) : 1499;
  const leadFinderPrice = leadFinder ? (geoPayment.isIndia ? leadFinder.priceINR : leadFinder.priceUSD) : 699;
  const proposalPrice = proposal ? (geoPayment.isIndia ? proposal.priceINR : proposal.priceUSD) : 749;
  const comboPrice = combo ? (geoPayment.isIndia ? combo.priceINR : combo.priceUSD) : 1299;

  const totalIndividualValue = pipelinePrice + leadFinderPrice;
  const comboSavings = totalIndividualValue - comboPrice;

  // Formatting helper
  const formatPrice = (val: number) => {
    return `${geoPayment.symbol}${val.toLocaleString(geoPayment.isIndia ? 'en-IN' : 'en-US')}`;
  };

  // Filter products for category browsing
  const filteredProducts = products.filter((p) => {
    const norm = normalizeProduct(p);
    const nameStr = (norm.name?.en || '').toLowerCase();
    const descStr = (norm.description?.en || '').toLowerCase();
    const query = searchQuery.toLowerCase().trim();

    // Skip hidden products
    if (p.status === 'hidden' || p.status === 'draft') return false;

    // Search check
    const matchesSearch = !query || nameStr.includes(query) || descStr.includes(query) || norm.slug.includes(query);
    if (!matchesSearch) return false;

    // Category filter check
    if (activeCategory === 'all') return true;
    if (activeCategory === 'client-acquisition') {
      return norm.category === 'blueprints' || norm.tags?.includes('leads') || norm.slug.includes('pipeline') || norm.slug.includes('proposal');
    }
    if (activeCategory === 'business') {
      return norm.category === 'templates' && !norm.tags?.includes('leads') && !norm.slug.includes('pipeline') && !norm.slug.includes('lead-finder');
    }
    if (activeCategory === 'automation') {
      return norm.category === 'saas' || norm.slug.includes('agent');
    }
    if (activeCategory === 'templates') {
      return norm.category === 'templates' || p.product_subtype === 'ebook' || p.product_subtype === 'Notion Template';
    }
    return true;
  });

  const faqs = [
    {
      q: "How do I receive my product?",
      a: "Directly after completing checkout, you will receive an automated email confirmation with instant access links. For Notion templates, you can duplicate them to your workspace in 1-click. For SaaS systems, onboarding credentials will be sent to your registered address."
    },
    {
      q: "Are these digital products?",
      a: "Yes. Most of our systems are digital templates, Notion workspaces, and AI prompts designed for instant duplication and use. The ScaleCraft Agent is a fully managed cloud SaaS software setup."
    },
    {
      q: "Do I need technical skills?",
      a: "Absolutely not. Our templates are built on Notion, which requires zero coding skills. Our AI Client Acquisition outreach templates are paste-and-use. For the WhatsApp SaaS agent, our engineering team manages the entire server configuration for you."
    },
    {
      q: "Do I need paid AI tools?",
      a: "No. All prompt packages and systems work with free AI interfaces (like ChatGPT free tier, Claude, or Gemini). You do not need a paid subscription to achieve high outreach results."
    },
    {
      q: "Is there a monthly subscription?",
      a: "All digital templates, Notion systems, and combo bundles are one-time purchase products with lifetime access. The only subscription model is the ScaleCraft Managed Agent SaaS which has monthly hosting and maintenance."
    },
    {
      q: "Do products include future updates?",
      a: "Yes! Every purchase grants you lifetime free updates. When we refine our outreach scripts or update our templates, you will receive a notification to duplicate the latest version at zero cost."
    },
    {
      q: "Which product should I start with?",
      a: "If your goal is to find and convert clients immediately, start with the AI Client Acquisition System or get the Complete Bundle (Combo) for the absolute best value. If you need 24/7 lead support, explore the WhatsApp Agent."
    },
    {
      q: "Can I use these systems for my agency/business?",
      a: "Yes, all templates are fully customizable. You can adapt the brand kit, proposal templates, workflows, and outreach messages to suit your specific service, niche, or company size."
    }
  ];

  const toggleFaq = (idx: number) => {
    setOpenFaqs((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <div className="relative min-h-screen bg-background text-text-primary selection:bg-accent/10 selection:text-accent font-sans">
      
      {/* ────────────────────────────────────────────────────────
          SECTION 1 — MOBILE-FIRST HERO
          ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-12 pb-16 md:pt-20 md:pb-24 px-6 border-b border-border-primary bg-gradient-to-b from-accent/[0.02] to-transparent">
        {/* Subtle mesh background element */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-64 bg-accent/[0.03] rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-[1100px] mx-auto text-center relative z-10 select-none">
          <span className="inline-flex items-center gap-2 bg-accent/5 border border-accent/15 text-accent text-[11px] font-extrabold px-4 py-1.5 rounded-full mb-6 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            High-Conversion Storefront
          </span>
          
          <h1 className="font-heading text-[32px] sm:text-[44px] md:text-[64px] font-black tracking-[-1.5px] leading-[1.1] mb-6 text-foreground max-w-4xl mx-auto">
            Get More Clients.<br className="sm:hidden" /> Save Time.<br /> Build Smarter.
          </h1>
          
          <p className="text-[16px] md:text-[19px] text-text-secondary leading-[1.6] mb-4 max-w-2xl mx-auto font-medium">
            Practical AI-powered systems and ready-to-use tools for freelancers, creators, agencies and small businesses.
          </p>

          <p className="text-[13px] md:text-[14px] text-text-muted mb-8 max-w-xl mx-auto">
            Skip the complicated setup. Choose a system, get instant access, and start using it today.
          </p>

          {/* Hero CTAs */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-3.5 max-w-md mx-auto">
            <button
              onClick={() => scrollTo(exploreSectionRef)}
              className="w-full sm:w-auto px-7 py-3.5 bg-[#0055ff] hover:bg-blue-600 text-white text-[14px] font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              Explore Systems
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => scrollTo(goalSelectorRef)}
              className="w-full sm:w-auto px-7 py-3.5 bg-white border border-border-strong hover:bg-bg-secondary text-text-primary text-[14px] font-bold rounded-xl shadow-sm transition-all cursor-pointer"
            >
              Find My System
            </button>
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────
          SECTION 2 — WHAT DO YOU WANT TO ACHIEVE?
          ──────────────────────────────────────────────────────── */}
      <section ref={goalSelectorRef} className="py-16 px-6 border-b border-border-primary bg-bg-secondary/30">
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center mb-12 select-none">
            <h2 className="font-heading text-clamp-h2 font-black tracking-tight text-foreground mb-3">
              What Are You Trying to Achieve?
            </h2>
            <p className="text-[14px] md:text-[16px] text-text-muted max-w-xl mx-auto font-medium">
              Choose your goal and we&apos;ll show you where to start.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Card 1: Clients */}
            <div 
              onClick={() => scrollTo(recommendedSectionRef)}
              className="group bg-white border border-border-primary rounded-2xl p-6 flex flex-col justify-between hover:border-accent/40 hover:shadow-premium transition-all cursor-pointer select-none relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-accent/[0.02] rounded-full blur-xl group-hover:bg-accent/[0.05] transition-all" />
              <div>
                <div className="w-11 h-11 rounded-xl bg-accent/5 border border-accent/10 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <Target className="w-5 h-5 text-accent" />
                </div>
                <h3 className="text-sm font-black uppercase tracking-wider text-text-primary mb-2">Get More Clients</h3>
                <p className="text-[13px] text-text-muted leading-relaxed mb-6">
                  Find leads, reach prospects and improve your client acquisition.
                </p>
              </div>
              <button className="text-[12px] font-bold text-accent group-hover:translate-x-1 transition-transform flex items-center gap-1.5 self-start pointer-events-none">
                Find Client Tools
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Card 2: Automation */}
            <div 
              onClick={() => {
                setActiveCategory('automation');
                scrollTo(exploreSectionRef);
              }}
              className="group bg-white border border-border-primary rounded-2xl p-6 flex flex-col justify-between hover:border-accent/40 hover:shadow-premium transition-all cursor-pointer select-none relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/[0.02] rounded-full blur-xl group-hover:bg-purple-500/[0.05] transition-all" />
              <div>
                <div className="w-11 h-11 rounded-xl bg-purple-500/5 border border-purple-500/10 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <Bot className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="text-sm font-black uppercase tracking-wider text-text-primary mb-2">Automate My Business</h3>
                <p className="text-[13px] text-text-muted leading-relaxed mb-6">
                  Use AI and automation to reduce repetitive work.
                </p>
              </div>
              <button className="text-[12px] font-bold text-purple-600 group-hover:translate-x-1 transition-transform flex items-center gap-1.5 self-start pointer-events-none">
                Explore Automation
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Card 3: Organize */}
            <div 
              onClick={() => {
                setActiveCategory('business');
                scrollTo(exploreSectionRef);
              }}
              className="group bg-white border border-border-primary rounded-2xl p-6 flex flex-col justify-between hover:border-accent/40 hover:shadow-premium transition-all cursor-pointer select-none relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/[0.02] rounded-full blur-xl group-hover:bg-blue-500/[0.05] transition-all" />
              <div>
                <div className="w-11 h-11 rounded-xl bg-blue-500/5 border border-blue-500/10 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <Workflow className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-sm font-black uppercase tracking-wider text-text-primary mb-2">Organize My Business</h3>
                <p className="text-[13px] text-text-muted leading-relaxed mb-6">
                  Manage leads, clients, workflows and business operations.
                </p>
              </div>
              <button className="text-[12px] font-bold text-blue-600 group-hover:translate-x-1 transition-transform flex items-center gap-1.5 self-start pointer-events-none">
                Explore Business Systems
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Card 4: Everything */}
            <div 
              onClick={() => scrollTo(bundleSectionRef)}
              className="group bg-white border border-border-primary rounded-2xl p-6 flex flex-col justify-between hover:border-accent/40 hover:shadow-premium transition-all cursor-pointer select-none relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/[0.02] rounded-full blur-xl group-hover:bg-emerald-500/[0.05] transition-all" />
              <div>
                <div className="w-11 h-11 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <Rocket className="w-5 h-5 text-emerald-600" />
                </div>
                <h3 className="text-sm font-black uppercase tracking-wider text-text-primary mb-2">I Want Everything</h3>
                <p className="text-[13px] text-text-muted leading-relaxed mb-6">
                  Get the complete toolkit for building a smarter client acquisition system.
                </p>
              </div>
              <button className="text-[12px] font-bold text-emerald-600 group-hover:translate-x-1 transition-transform flex items-center gap-1.5 self-start pointer-events-none">
                See Best Value
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────
          SECTION 3 — START HERE / RECOMMENDED PRODUCTS
          ──────────────────────────────────────────────────────── */}
      <section ref={recommendedSectionRef} className="py-16 px-6 border-b border-border-primary">
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center mb-12 select-none">
            <h2 className="font-heading text-clamp-h2 font-black tracking-tight text-foreground mb-3">
              Start Here
            </h2>
            <p className="text-[14px] md:text-[16px] text-text-muted max-w-xl mx-auto font-medium">
              Not sure where to begin? These are the best starting points.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Product 1: AI Client Acquisition System */}
            {clientPipeline && (
              <div ref={clientPipelineRef} className="bg-white border-2 border-accent rounded-3xl overflow-hidden shadow-premium hover:shadow-2xl transition-all flex flex-col justify-between relative scale-[1.01]">
                <div className="absolute top-0 right-0 bg-accent text-white text-[9px] font-black tracking-wider uppercase px-4 py-1.5 rounded-bl-2xl select-none z-10">
                  ⭐️ Primary Meta Ads Offer
                </div>
                
                <div className="p-6 sm:p-8 flex-grow">
                  {clientPipeline.thumbnail && (
                    <div className="rounded-2xl overflow-hidden aspect-[16/10] bg-[#0a0a0a] border border-border-primary mb-5 select-none">
                      <img 
                        src={clientPipeline.thumbnail} 
                        alt="AI Client Acquisition System" 
                        className="w-full h-full object-contain" 
                      />
                    </div>
                  )}
                  
                  <div className="flex items-center gap-1.5 text-xs text-text-muted font-bold mb-3 select-none">
                    <span className="px-2 py-0.5 bg-accent/5 border border-accent/10 rounded text-accent font-extrabold uppercase text-[10px]">
                      Recommended
                    </span>
                    <span>&middot;</span>
                    <span>Outreach & CRM</span>
                  </div>

                  <h3 className="text-xl font-black text-foreground mb-2 leading-tight">
                    AI Client Acquisition System
                  </h3>
                  <span className="text-[11.5px] font-bold text-text-muted block mb-3 font-mono">
                    Formerly: Freelance Client Pipeline Blueprint
                  </span>

                  <p className="text-[13px] text-text-secondary leading-relaxed mb-6 font-medium">
                    Get more clients using AI-powered outreach, content, proposals and business workflows.
                  </p>

                  <div className="text-[12.5px] text-text-secondary leading-relaxed mb-6 bg-bg-secondary p-3.5 rounded-xl border border-border-primary/50 select-none">
                    <strong className="text-foreground text-xs block mb-1">Best for:</strong> 
                    Freelancers, Agencies, Creators, and consultants wanting organized outreach and CRM tracking.
                  </div>

                  <div className="space-y-2.5">
                    <p className="text-[11px] text-text-muted font-black tracking-wider uppercase select-none">Deliverables Included:</p>
                    <div className="flex items-start gap-2.5 text-[13px] font-semibold text-text-primary">
                      <span className="text-accent shrink-0 mt-0.5">✓</span>
                      <span>50+ Outreach scripts (DM, Email, LinkedIn)</span>
                    </div>
                    <div className="flex items-start gap-2.5 text-[13px] font-semibold text-text-primary">
                      <span className="text-accent shrink-0 mt-0.5">✓</span>
                      <span>AI prompt library (50+ prompts)</span>
                    </div>
                    <div className="flex items-start gap-2.5 text-[13px] font-semibold text-text-primary">
                      <span className="text-accent shrink-0 mt-0.5">✓</span>
                      <span>Word-for-word Proposal templates</span>
                    </div>
                    <div className="flex items-start gap-2.5 text-[13px] font-semibold text-text-primary">
                      <span className="text-accent shrink-0 mt-0.5">✓</span>
                      <span>Follow-up sequences & outreach challenge</span>
                    </div>
                    <div className="flex items-start gap-2.5 text-[13px] font-semibold text-text-primary">
                      <span className="text-accent shrink-0 mt-0.5">✓</span>
                      <span>Notion CRM & Master Lead Tracker</span>
                    </div>
                  </div>
                </div>

                <div className="p-6 sm:p-8 pt-0 border-t border-border-primary bg-bg-secondary/40">
                  <div className="flex items-baseline justify-between mb-4 mt-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-foreground">
                        {formatPrice(pipelinePrice)}
                      </span>
                      {clientPipeline.originalPriceINR > pipelinePrice && (
                        <span className="text-sm text-text-light line-through font-medium">
                          {formatPrice(geoPayment.isIndia ? clientPipeline.originalPriceINR : clientPipeline.originalPriceUSD)}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-extrabold text-accent bg-accent/5 border border-accent/15 px-2 py-0.5 rounded-full select-none uppercase tracking-wider">
                      Lifetime Access
                    </span>
                  </div>

                  <BuyButton 
                    productId={clientPipeline.id}
                    price={pipelinePrice}
                    currency={geoPayment.currency}
                    symbol={geoPayment.symbol}
                    name="AI Client Acquisition System (Client Pipeline Blueprint)"
                    product={rawClientPipeline}
                    text="Get Instant Access →"
                  />
                  
                  <Link 
                    href={`/products/${clientPipeline.slug}`}
                    className="block text-center text-xs font-bold text-text-muted hover:text-accent transition-colors mt-3"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            )}

            {/* Product 2: AI Lead Finder System */}
            {leadFinder && (
              <div ref={leadFinderRef} className="bg-white border border-border-primary rounded-3xl overflow-hidden shadow-sm hover:border-accent/40 hover:shadow-premium transition-all flex flex-col justify-between">
                <div className="p-6 sm:p-8 flex-grow">
                  {leadFinder.thumbnail && (
                    <div className="rounded-2xl overflow-hidden aspect-[16/10] bg-[#0a0a0a] border border-border-primary mb-5 select-none">
                      <img 
                        src={leadFinder.thumbnail} 
                        alt="AI Lead Finder System" 
                        className="w-full h-full object-contain" 
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 text-xs text-text-muted font-bold mb-3 select-none">
                    <span className="px-2 py-0.5 bg-green-500/5 border border-green-500/10 rounded text-green-600 font-extrabold uppercase text-[10px]">
                      Beginner Friendly
                    </span>
                    <span>&middot;</span>
                    <span>Lead Sourcing</span>
                  </div>

                  <h3 className="text-xl font-black text-foreground mb-2 leading-tight">
                    AI Lead Finder System
                  </h3>
                  <span className="text-[11.5px] font-bold text-text-muted block mb-3 font-mono">
                    Direct Sourcing Guides
                  </span>

                  <p className="text-[13px] text-text-secondary leading-relaxed mb-6 font-medium">
                    Stop guessing where your next client will come from. Find 50+ qualified leads every week.
                  </p>

                  <div className="text-[12.5px] text-text-secondary leading-relaxed mb-6 bg-bg-secondary p-3.5 rounded-xl border border-border-primary/50 select-none">
                    <strong className="text-foreground text-xs block mb-1">Best for:</strong> 
                    Freelancers & agencies needing list building and cold outreach prospects.
                  </div>

                  <div className="space-y-2.5">
                    <p className="text-[11px] text-text-muted font-black tracking-wider uppercase select-none">Deliverables Included:</p>
                    <div className="flex items-start gap-2.5 text-[13px] font-semibold text-text-primary">
                      <span className="text-green-600 shrink-0 mt-0.5">✓</span>
                      <span>Find 50+ leads every week across 4 platforms</span>
                    </div>
                    <div className="flex items-start gap-2.5 text-[13px] font-semibold text-text-primary">
                      <span className="text-green-600 shrink-0 mt-0.5">✓</span>
                      <span>LinkedIn B2B sourcing setups</span>
                    </div>
                    <div className="flex items-start gap-2.5 text-[13px] font-semibold text-text-primary">
                      <span className="text-green-600 shrink-0 mt-0.5">✓</span>
                      <span>Instagram & Google Maps automation</span>
                    </div>
                    <div className="flex items-start gap-2.5 text-[13px] font-semibold text-text-primary">
                      <span className="text-green-600 shrink-0 mt-0.5">✓</span>
                      <span>Master Sourcing Prompt Library</span>
                    </div>
                    <div className="flex items-start gap-2.5 text-[13px] font-semibold text-text-primary">
                      <span className="text-green-600 shrink-0 mt-0.5">✓</span>
                      <span>Master Lead Tracker Database template</span>
                    </div>
                  </div>
                </div>

                <div className="p-6 sm:p-8 pt-0 border-t border-border-primary bg-bg-secondary/40">
                  <div className="flex items-baseline justify-between mb-4 mt-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-foreground">
                        {formatPrice(leadFinderPrice)}
                      </span>
                      {leadFinder.originalPriceINR > leadFinderPrice && (
                        <span className="text-sm text-text-light line-through font-medium">
                          {formatPrice(geoPayment.isIndia ? leadFinder.originalPriceINR : leadFinder.originalPriceUSD)}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-extrabold text-[#00A884] bg-[#00A884]/5 border border-[#00A884]/15 px-2 py-0.5 rounded-full select-none uppercase tracking-wider">
                      One-time Buy
                    </span>
                  </div>

                  <BuyButton 
                    productId={leadFinder.id}
                    price={leadFinderPrice}
                    currency={geoPayment.currency}
                    symbol={geoPayment.symbol}
                    name="AI Lead Finder System"
                    product={rawLeadFinder}
                    text="Get Instant Access →"
                  />

                  <Link 
                    href={`/products/${leadFinder.slug}`}
                    className="block text-center text-xs font-bold text-text-muted hover:text-accent transition-colors mt-3"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            )}

            {/* Product 3: Proposal System */}
            {proposal && (
              <div ref={proposalRef} className="bg-white border border-border-primary rounded-3xl overflow-hidden shadow-sm hover:border-accent/40 hover:shadow-premium transition-all flex flex-col justify-between">
                <div className="p-6 sm:p-8 flex-grow">
                  {proposal.thumbnail && (
                    <div className="rounded-2xl overflow-hidden aspect-[16/10] bg-[#0a0a0a] border border-border-primary mb-5 select-none">
                      <img 
                        src={proposal.thumbnail} 
                        alt="Get Paid, Not Ghosted — The Proposal System" 
                        className="w-full h-full object-contain" 
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 text-xs text-text-muted font-bold mb-3 select-none">
                    <span className="px-2 py-0.5 bg-blue-500/5 border border-blue-500/10 rounded text-blue-600 font-extrabold uppercase text-[10px]">
                      Airtight System
                    </span>
                    <span>&middot;</span>
                    <span>Proposals & Terms</span>
                  </div>

                  <h3 className="text-xl font-black text-foreground mb-2 leading-tight">
                    Get Paid, Not Ghosted
                  </h3>
                  <span className="text-[11.5px] font-bold text-text-muted block mb-3 font-mono">
                    The Proposal Operating System
                  </span>

                  <p className="text-[13px] text-text-secondary leading-relaxed mb-6 font-medium">
                    Turn messy client chats into proposals that lock scope, set payment terms, and prevent ghosting.
                  </p>

                  <div className="text-[12.5px] text-text-secondary leading-relaxed mb-6 bg-bg-secondary p-3.5 rounded-xl border border-border-primary/50 select-none">
                    <strong className="text-foreground text-xs block mb-1">Best for:</strong> 
                    Freelancers & agency owners tired of scope creep and unpaid invoices.
                  </div>

                  <div className="space-y-2.5">
                    <p className="text-[11px] text-text-muted font-black tracking-wider uppercase select-none">Deliverables Included:</p>
                    <div className="flex items-start gap-2.5 text-[13px] font-semibold text-text-primary">
                      <span className="text-blue-600 shrink-0 mt-0.5">✓</span>
                      <span>Business Intake Template (set once, reuse forever)</span>
                    </div>
                    <div className="flex items-start gap-2.5 text-[13px] font-semibold text-text-primary">
                      <span className="text-blue-600 shrink-0 mt-0.5">✓</span>
                      <span>4 AI proposal writing prompts ready to use</span>
                    </div>
                    <div className="flex items-start gap-2.5 text-[13px] font-semibold text-text-primary">
                      <span className="text-blue-600 shrink-0 mt-0.5">✓</span>
                      <span>5 Protective scope-lock & payment clauses</span>
                    </div>
                    <div className="flex items-start gap-2.5 text-[13px] font-semibold text-text-primary">
                      <span className="text-blue-600 shrink-0 mt-0.5">✓</span>
                      <span>Built-in Proposal Tracker Notion database</span>
                    </div>
                    <div className="flex items-start gap-2.5 text-[13px] font-semibold text-text-primary">
                      <span className="text-blue-600 shrink-0 mt-0.5">✓</span>
                      <span>Full proposal building case-study walkthrough</span>
                    </div>
                  </div>
                </div>

                <div className="p-6 sm:p-8 pt-0 border-t border-border-primary bg-bg-secondary/40">
                  <div className="flex items-baseline justify-between mb-4 mt-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-foreground">
                        {formatPrice(proposalPrice)}
                      </span>
                      {proposal.originalPriceINR > proposalPrice && (
                        <span className="text-sm text-text-light line-through font-medium">
                          {formatPrice(geoPayment.isIndia ? proposal.originalPriceINR : proposal.originalPriceUSD)}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-extrabold text-blue-600 bg-blue-500/5 border border-blue-500/15 px-2 py-0.5 rounded-full select-none uppercase tracking-wider">
                      Notion Template
                    </span>
                  </div>

                  <BuyButton 
                    productId={proposal.id}
                    price={proposalPrice}
                    currency={geoPayment.currency}
                    symbol={geoPayment.symbol}
                    name="Get Paid, Not Ghosted — The Proposal System"
                    product={rawProposal}
                    text="Get Instant Access →"
                  />

                  <Link 
                    href={`/products/${proposal.slug}`}
                    className="block text-center text-xs font-bold text-text-muted hover:text-accent transition-colors mt-3"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            )}

          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────
          SECTION 4 — BEST VALUE / COMPLETE SYSTEM
          ──────────────────────────────────────────────────────── */}
      {combo && (
        <section ref={bundleSectionRef} className="py-16 px-6 border-b border-border-primary bg-accent/[0.01]">
          <div className="max-w-[1100px] mx-auto">
            <div className="text-center mb-12 select-none">
              <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 text-[10px] font-black px-3.5 py-1 rounded-full mb-3 uppercase tracking-widest">
                🔥 Best Value Combo
              </span>
              <h2 className="font-heading text-clamp-h2 font-black tracking-tight text-foreground mb-3">
                Want the Complete System?
              </h2>
              <p className="text-[14px] md:text-[16px] text-text-muted max-w-xl mx-auto font-medium">
                Everything you need to find, manage and convert clients in one workflow.
              </p>
            </div>

            <div className="bg-white border-2 border-emerald-500/30 rounded-3xl overflow-hidden shadow-premium p-6 md:p-10 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-black text-foreground mb-3">
                    AI Systems Combo (Client Pipeline + Lead Finder)
                  </h3>
                  <p className="text-[14px] text-text-secondary leading-relaxed font-medium">
                    Build a predictable client acquisition loop from scratch. Find qualified prospects, contact them with high-converting scripts, track deal status, compile proposals, and close retainer clients without friction.
                  </p>
                </div>

                {/* Pipeline Flow Visualization */}
                <div className="border border-border-primary bg-bg-secondary/40 rounded-2xl p-5 select-none">
                  <p className="text-[10px] text-text-light font-extrabold uppercase tracking-widest mb-3 text-center sm:text-left">
                    Your Complete Acquisition Workflow
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 font-mono text-[11px] font-black text-text-secondary">
                    <div className="px-3 py-2 bg-white border border-border-primary rounded-lg text-center w-full">FIND LEADS</div>
                    <ArrowRight className="w-4 h-4 text-accent rotate-90 sm:rotate-0" />
                    <div className="px-3 py-2 bg-white border border-border-primary rounded-lg text-center w-full">CONTACT</div>
                    <ArrowRight className="w-4 h-4 text-accent rotate-90 sm:rotate-0" />
                    <div className="px-3 py-2 bg-white border border-border-primary rounded-lg text-center w-full">TRACK</div>
                    <ArrowRight className="w-4 h-4 text-accent rotate-90 sm:rotate-0" />
                    <div className="px-3 py-2 bg-white border border-border-primary rounded-lg text-center w-full">PROPOSE</div>
                    <ArrowRight className="w-4 h-4 text-accent rotate-90 sm:rotate-0" />
                    <div className="px-3 py-2 bg-emerald-50 text-emerald-700 border border-emerald-500/20 rounded-lg text-center w-full">CLOSE</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-start gap-2.5">
                    <Check className="w-4.5 h-4.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="text-[13px] text-text-secondary leading-relaxed font-semibold">
                      Includes complete <strong>Freelancer Client Blueprint</strong>
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Check className="w-4.5 h-4.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="text-[13px] text-text-secondary leading-relaxed font-semibold">
                      Includes complete <strong>AI Lead Finder System</strong>
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Check className="w-4.5 h-4.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="text-[13px] text-text-secondary leading-relaxed font-semibold">
                      Lifetime digital access with zero future subscriptions
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Check className="w-4.5 h-4.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="text-[13px] text-text-secondary leading-relaxed font-semibold">
                      Free updates & Direct Founder WhatsApp Support
                    </span>
                  </div>
                </div>
              </div>

              {/* Pricing Box */}
              <div className="border border-emerald-500/20 bg-emerald-500/[0.02] rounded-2xl p-6 flex flex-col justify-between border-t-4 border-t-emerald-500">
                <div className="space-y-4">
                  <div className="flex justify-between text-xs text-text-muted font-bold select-none">
                    <span>Individual Value:</span>
                    <span className="line-through">{formatPrice(totalIndividualValue)}</span>
                  </div>
                  
                  <div className="flex justify-between items-baseline select-none">
                    <span className="text-sm font-black text-text-primary uppercase tracking-wider">Bundle Price:</span>
                    <span className="text-3xl font-black text-emerald-600">
                      {formatPrice(comboPrice)}
                    </span>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-500/10 rounded-xl p-3 text-center text-xs font-black text-emerald-700 select-none">
                    🎉 You Save {formatPrice(comboSavings)} ({Math.round((comboSavings / totalIndividualValue) * 100)}% Off)
                  </div>
                </div>

                <div className="mt-8 space-y-3">
                  <BuyButton 
                    productId={combo.id}
                    price={comboPrice}
                    currency={geoPayment.currency}
                    symbol={geoPayment.symbol}
                    name="AI Systems Combo (Client Pipeline + Lead Finder)"
                    product={rawCombo}
                    text="Get the Complete System →"
                    className="w-full py-4 rounded-xl font-black bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                  />
                  <p className="text-center text-[10.5px] text-text-muted font-bold flex items-center justify-center gap-1.5 select-none">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Instant access link delivered immediately
                  </p>
                </div>
              </div>

            </div>
          </div>
        </section>
      )}

      {/* ────────────────────────────────────────────────────────
          SECTION 5 — EXPLORE BY NEED (SEARCH & CATEGORIES)
          ──────────────────────────────────────────────────────── */}
      <section ref={exploreSectionRef} className="py-16 px-6 border-b border-border-primary bg-bg-secondary/10">
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center mb-10 select-none">
            <h2 className="font-heading text-clamp-h2 font-black tracking-tight text-foreground mb-3">
              Find the Right System for Your Goal
            </h2>
            <p className="text-[14px] md:text-[16px] text-text-muted max-w-xl mx-auto font-medium">
              Browse our complete business catalog or filter by what you need.
            </p>
          </div>

          {/* Search & Categories Bar */}
          <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center mb-10 border-b border-border-primary/50 pb-6">
            <div className="relative flex-1 max-w-md">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-text-muted" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search systems, AI, CRM, templates..."
                className="w-full pl-10 pr-4 py-2.5 border border-border-strong rounded-xl text-[13.5px] bg-white focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/15 text-text-primary font-semibold"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-text-muted hover:text-foreground cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Category Pills (horizontal scroll on mobile) */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none select-none">
              {[
                { id: 'all', name: 'All Systems' },
                { id: 'client-acquisition', name: 'Client Acquisition' },
                { id: 'business', name: 'Business Operating' },
                { id: 'automation', name: 'AI Automation' },
                { id: 'templates', name: 'Templates & Ebooks' }
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCategory(cat.id as any);
                  }}
                  className={`px-4 py-2 rounded-full text-xs font-bold border transition-colors whitespace-nowrap cursor-pointer ${
                    activeCategory === cat.id
                      ? 'bg-foreground text-background border-foreground'
                      : 'border-border-strong text-text-muted hover:border-foreground bg-white hover:text-foreground'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* ────────────────────────────────────────────────────────
              SECTION 6 — PRODUCT CARD DESIGN / GRID
              ──────────────────────────────────────────────────────── */}
          {filteredProducts.length === 0 ? (
            <div className="text-center py-16 bg-white border border-border-primary rounded-2xl p-6 select-none">
              <p className="font-bold text-text-primary mb-2">No products found matching your search.</p>
              <p className="text-xs text-text-muted">Try clearing filters or search query to browse all products.</p>
              <button 
                onClick={() => { setActiveCategory('all'); setSearchQuery(''); }}
                className="mt-4 px-4 py-2 bg-bg-secondary border border-border-strong hover:bg-border-primary text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((p: any) => {
                const norm = normalizeProduct(p);
                const isComboItem = norm.slug === 'ai-systems-combo';
                const isSaaSItem = norm.category === 'saas' || norm.slug === 'scalecraft-agent-saas';
                
                const originalPrice = geoPayment.isIndia ? norm.originalPriceINR : norm.originalPriceUSD;
                const price = geoPayment.isIndia ? norm.priceINR : norm.priceUSD;

                // Max 3 bullet deliverables
                const shortFeatures = norm.features.slice(0, 3);

                const thumbnailUrl = p.thumbnail_url || p.banner_url || norm.thumbnail || p.thumbnail || '';
                const productName = norm.name?.en || p.name || '';

                return (
                  <div
                    key={p.id || p._id}
                    ref={norm.slug === 'scalecraft-agent-saas' ? agentRef : null}
                    className={`relative bg-white border rounded-2.5xl p-5 hover:shadow-premium hover:border-accent/40 transition-all flex flex-col justify-between group ${
                      isComboItem ? 'border-emerald-500/40 ring-1 ring-emerald-500/10' : 'border-border-primary'
                    }`}
                  >
                    <div>
                      {/* Badge labels */}
                      <div className="flex flex-wrap gap-1 mb-3.5 select-none">
                        {isComboItem && (
                          <span className="text-[9px] font-black bg-emerald-500/10 text-emerald-700 px-2 py-0.5 rounded border border-emerald-500/20">
                            💰 BEST VALUE COMBO
                          </span>
                        )}
                        {isSaaSItem && (
                          <span className="text-[9px] font-black bg-purple-500/10 text-purple-700 px-2 py-0.5 rounded border border-purple-500/20">
                            🤖 AI SaaS
                          </span>
                        )}
                        {norm.slug === 'freelance-client-pipeline-blueprint' && (
                          <span className="text-[9px] font-black bg-accent/10 text-accent px-2 py-0.5 rounded border border-accent/20">
                            🔥 BEST SELLER
                          </span>
                        )}
                        {norm.slug === 'proposal-system' && (
                          <span className="text-[9px] font-black bg-blue-500/10 text-blue-700 px-2 py-0.5 rounded border border-blue-500/20">
                            🎯 RECOMMENDED
                          </span>
                        )}
                        {p.product_subtype === 'ebook' && (
                          <span className="text-[9px] font-black bg-indigo-500/10 text-indigo-700 px-2 py-0.5 rounded border border-indigo-500/20">
                            📖 BEGINNER GUIDE
                          </span>
                        )}
                      </div>

                      {/* Product Banner Image */}
                      {thumbnailUrl && (
                        <div className="rounded-2xl overflow-hidden aspect-[16/10] bg-bg-secondary border border-border-primary mb-4 select-none">
                          <img 
                            src={thumbnailUrl} 
                            alt={productName} 
                            className="w-full h-full object-contain group-hover:scale-[1.02] transition-transform duration-300" 
                          />
                        </div>
                      )}

                      {/* Title */}
                      <h3 className="font-heading text-[16px] sm:text-[18px] font-black text-foreground mb-1.5 leading-snug group-hover:text-accent transition-colors">
                        {norm.slug === 'freelance-client-pipeline-blueprint' ? 'AI Client Acquisition System' : norm.name.en}
                      </h3>
                      {norm.slug === 'freelance-client-pipeline-blueprint' && (
                        <p className="text-[9.5px] font-bold text-text-light font-mono mb-2 uppercase select-none">
                          Freelance Client Pipeline Blueprint
                        </p>
                      )}

                      <p className="text-[12.5px] text-text-muted leading-relaxed mb-4">
                        {norm.slug === 'freelance-client-pipeline-blueprint' 
                          ? 'Get more clients using AI-powered outreach, content, proposals and business workflows.'
                          : norm.description.en}
                      </p>

                      {/* Best for info label */}
                      <div className="text-[11.5px] text-text-secondary leading-relaxed mb-4 bg-bg-secondary p-2.5 rounded-lg border border-border-primary/50 select-none">
                        <strong className="text-foreground text-[10.5px]">Best for:</strong> {norm.bestForText || 'Freelancers & agency owners'}
                      </div>

                      {/* Key features bullets (Max 3) */}
                      {shortFeatures.length > 0 && (
                        <div className="space-y-1.5 mb-5 select-none">
                          {shortFeatures.map((feat: string, i: number) => (
                            <div key={i} className="flex items-start gap-2 text-[12px] font-semibold text-text-secondary">
                              <span className="text-emerald-600 text-[10px] shrink-0 mt-0.5">✓</span>
                              <span className="truncate">{feat}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-3.5 mt-auto pt-4 border-t border-border-primary/50">
                      {/* Price / Buy Button */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-[18px] font-black text-foreground">
                            {formatPrice(price)}
                          </span>
                          {originalPrice > price && (
                            <span className="text-[11px] text-text-light line-through font-medium">
                              {formatPrice(originalPrice)}
                            </span>
                          )}
                        </div>

                        <div className="max-w-[140px] flex-grow">
                          <BuyButton 
                            productId={norm.id}
                            price={price}
                            currency={geoPayment.currency}
                            symbol={geoPayment.symbol}
                            name={norm.name.en}
                            product={p}
                            text="Buy Now →"
                            className="w-full py-2.5 text-xs font-bold rounded-xl cursor-pointer"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-semibold text-text-muted select-none">
                        <span>Lifetime Updates</span>
                        <Link 
                          href={`/products/${norm.slug}`}
                          className="text-accent hover:underline flex items-center gap-0.5"
                        >
                          View Details
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────
          SECTION 7 — WHICH PRODUCT IS RIGHT FOR ME?
          ──────────────────────────────────────────────────────── */}
      <section className="py-16 px-6 border-b border-border-primary bg-bg-secondary/20">
        <div className="max-w-[800px] mx-auto select-none">
          <div className="text-center mb-10">
            <h2 className="font-heading text-clamp-h2 font-black tracking-tight text-foreground mb-3">
              Not Sure Which One to Choose?
            </h2>
            <p className="text-[14px] text-text-muted font-medium">
              Choose the roadmap that matches your current goal.
            </p>
          </div>

          <div className="bg-white border border-border-primary rounded-3xl overflow-hidden shadow-sm">
            <div className="divide-y divide-border-primary">
              <div 
                onClick={() => scrollTo(leadFinderRef)}
                className="p-5 flex items-center justify-between hover:bg-bg-secondary/40 transition-colors cursor-pointer group"
              >
                <div className="pr-4">
                  <p className="text-xs font-black text-text-light uppercase tracking-wider mb-0.5">If you want more leads:</p>
                  <p className="text-[14.5px] font-black text-text-primary group-hover:text-accent transition-colors">Find 50+ prospects weekly with the AI Lead Finder System</p>
                </div>
                <ArrowRight className="w-5 h-5 text-text-light group-hover:text-accent group-hover:translate-x-1 transition-all shrink-0" />
              </div>

              <div 
                onClick={() => scrollTo(clientPipelineRef)}
                className="p-5 flex items-center justify-between hover:bg-bg-secondary/40 transition-colors cursor-pointer group"
              >
                <div className="pr-4">
                  <p className="text-xs font-black text-text-light uppercase tracking-wider mb-0.5">If you want better client outreach:</p>
                  <p className="text-[14.5px] font-black text-text-primary group-hover:text-accent transition-colors">Access 50+ scripts and AI Client Acquisition tools</p>
                </div>
                <ArrowRight className="w-5 h-5 text-text-light group-hover:text-accent group-hover:translate-x-1 transition-all shrink-0" />
              </div>

              <div 
                onClick={() => scrollTo(proposalRef)}
                className="p-5 flex items-center justify-between hover:bg-bg-secondary/40 transition-colors cursor-pointer group"
              >
                <div className="pr-4">
                  <p className="text-xs font-black text-text-light uppercase tracking-wider mb-0.5">If you want better proposals:</p>
                  <p className="text-[14.5px] font-black text-text-primary group-hover:text-accent transition-colors">Lock scope creep using Get Paid, Not Ghosted</p>
                </div>
                <ArrowRight className="w-5 h-5 text-text-light group-hover:text-accent group-hover:translate-x-1 transition-all shrink-0" />
              </div>

              <div 
                onClick={() => {
                  setActiveCategory('automation');
                  scrollTo(exploreSectionRef);
                }}
                className="p-5 flex items-center justify-between hover:bg-bg-secondary/40 transition-colors cursor-pointer group"
              >
                <div className="pr-4">
                  <p className="text-xs font-black text-text-light uppercase tracking-wider mb-0.5">If you want WhatsApp automation:</p>
                  <p className="text-[14.5px] font-black text-text-primary group-hover:text-accent transition-colors">Deploy 24/7 client conversational systems using ScaleCraft Agent</p>
                </div>
                <ArrowRight className="w-5 h-5 text-text-light group-hover:text-accent group-hover:translate-x-1 transition-all shrink-0" />
              </div>

              <div 
                onClick={() => scrollTo(bundleSectionRef)}
                className="p-5 flex items-center justify-between bg-accent/[0.01] hover:bg-accent/[0.03] transition-colors cursor-pointer group"
              >
                <div className="pr-4">
                  <p className="text-xs font-black text-accent uppercase tracking-wider mb-0.5">If you want everything:</p>
                  <p className="text-[14.5px] font-black text-text-primary group-hover:text-accent transition-colors">Get the AI Systems Combo bundle and save {formatPrice(comboSavings)}</p>
                </div>
                <ArrowRight className="w-5 h-5 text-text-light group-hover:text-accent group-hover:translate-x-1 transition-all shrink-0" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────
          SECTION 8 — WHY SCALECRAFT?
          ──────────────────────────────────────────────────────── */}
      <section className="py-16 px-6 border-b border-border-primary">
        <div className="max-w-[1100px] mx-auto select-none">
          <div className="text-center mb-12">
            <h2 className="font-heading text-clamp-h2 font-black tracking-tight text-foreground mb-3">
              Why ScaleCraft?
            </h2>
            <p className="text-[14px] text-text-muted max-w-xl mx-auto font-medium">
              We build ready-to-use business systems that cut down launch time and cost.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-bg-secondary/40 border border-border-primary rounded-2xl p-5 flex items-start gap-3">
              <Check className="w-5 h-5 text-accent shrink-0 mt-0.5" />
              <div>
                <h4 className="text-[14.5px] font-black text-foreground mb-1">Practical, ready-to-use systems</h4>
                <p className="text-xs text-text-muted leading-relaxed">Duplicate and start working instantly. No hours of video courses to sit through.</p>
              </div>
            </div>

            <div className="bg-bg-secondary/40 border border-border-primary rounded-2xl p-5 flex items-start gap-3">
              <Check className="w-5 h-5 text-accent shrink-0 mt-0.5" />
              <div>
                <h4 className="text-[14.5px] font-black text-foreground mb-1">Beginner-friendly</h4>
                <p className="text-xs text-text-muted leading-relaxed">No coding, database, or advanced technical setups needed. Designed for simplicity.</p>
              </div>
            </div>

            <div className="bg-bg-secondary/40 border border-border-primary rounded-2xl p-5 flex items-start gap-3">
              <Check className="w-5 h-5 text-accent shrink-0 mt-0.5" />
              <div>
                <h4 className="text-[14.5px] font-black text-foreground mb-1">Instant digital access</h4>
                <p className="text-xs text-text-muted leading-relaxed">Your duplicate links are delivered to your inbox immediately after Razorpay checkouts.</p>
              </div>
            </div>

            <div className="bg-bg-secondary/40 border border-border-primary rounded-2xl p-5 flex items-start gap-3">
              <Check className="w-5 h-5 text-accent shrink-0 mt-0.5" />
              <div>
                <h4 className="text-[14.5px] font-black text-foreground mb-1">Lifetime access</h4>
                <p className="text-xs text-text-muted leading-relaxed">One-time payments only. You own the templates forever with no subscription fees.</p>
              </div>
            </div>

            <div className="bg-bg-secondary/40 border border-border-primary rounded-2xl p-5 flex items-start gap-3">
              <Check className="w-5 h-5 text-accent shrink-0 mt-0.5" />
              <div>
                <h4 className="text-[14.5px] font-black text-foreground mb-1">Future updates included</h4>
                <p className="text-xs text-text-muted leading-relaxed">Get all future releases and refinements to the templates at zero additional cost.</p>
              </div>
            </div>

            <div className="bg-bg-secondary/40 border border-border-primary rounded-2xl p-5 flex items-start gap-3">
              <Check className="w-5 h-5 text-accent shrink-0 mt-0.5" />
              <div>
                <h4 className="text-[14.5px] font-black text-foreground mb-1">Built for real business workflows</h4>
                <p className="text-xs text-text-muted leading-relaxed">Tested and refined in real freelancing agencies to ensure it actually solves daily operations.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────
          SECTION 9 — SOCIAL PROOF
          ──────────────────────────────────────────────────────── */}
      {testimonials.length > 0 && (
        <section className="py-16 px-6 border-b border-border-primary bg-bg-secondary/10">
          <div className="max-w-[1100px] mx-auto select-none">
            <div className="text-center mb-12">
              <h2 className="font-heading text-clamp-h2 font-black tracking-tight text-foreground mb-3">
                Early ScaleCraft Customers
              </h2>
              <p className="text-[14px] text-text-muted max-w-xl mx-auto font-medium">
                Hear from freelancers, agency owners, and creators using ScaleCraft.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {testimonials.map((t, idx) => (
                <div key={t._id || idx} className="bg-white border border-border-primary rounded-2.5xl p-6 shadow-sm flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex gap-0.5 text-amber-400">
                      {[...Array(t.rating || 5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-current" />
                      ))}
                    </div>
                    <p className="text-[13px] text-text-secondary leading-relaxed italic font-medium">
                      &ldquo;{t.comment}&rdquo;
                    </p>
                  </div>
                  <div className="border-t border-border-primary/50 pt-4 mt-5 flex items-center justify-between">
                    <div>
                      <p className="text-[13px] font-black text-text-primary">{t.name}</p>
                      <p className="text-[10px] text-text-muted font-semibold mt-0.5">{t.profession}</p>
                    </div>
                    {t.productName && (
                      <span className="text-[9px] font-extrabold uppercase bg-accent/5 text-accent px-2 py-0.5 rounded border border-accent/10">
                        {t.productName.replace("ScaleCraft ", "")}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ────────────────────────────────────────────────────────
          SECTION 10 — FAQ
          ──────────────────────────────────────────────────────── */}
      <section className="py-16 px-6 border-b border-border-primary">
        <div className="max-w-[800px] mx-auto select-none">
          <div className="text-center mb-12">
            <h2 className="font-heading text-clamp-h2 font-black tracking-tight text-foreground mb-3">
              Frequently Asked Questions
            </h2>
            <p className="text-[14px] text-text-muted font-medium">
              Quick answers to help you choose the right system.
            </p>
          </div>

          <div className="space-y-3.5">
            {faqs.map((faq, idx) => {
              const isOpen = !!openFaqs[idx];
              return (
                <div 
                  key={idx} 
                  className="border border-border-primary rounded-2xl overflow-hidden bg-white hover:border-border-strong transition-all shadow-xs"
                >
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="w-full flex items-center justify-between px-6 py-4.5 text-left text-[14px] font-bold text-text-primary hover:bg-bg-secondary transition-colors cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-text-muted shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-text-muted shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-5 text-[13px] text-text-secondary leading-relaxed border-t border-border-primary pt-3.5 bg-bg-secondary/30 animate-in fade-in duration-200">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────
          SECTION 11 — FINAL CTA
          ──────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-gradient-to-b from-transparent to-accent/[0.02]">
        <div className="max-w-[700px] mx-auto text-center select-none">
          <h2 className="font-heading text-[32px] sm:text-[40px] font-black tracking-tight text-foreground mb-4">
            Ready to Build a Smarter Business?
          </h2>
          <p className="text-[14px] md:text-[16px] text-text-secondary leading-relaxed mb-8 max-w-lg mx-auto font-medium">
            Choose the system that matches your goal and start using it today.
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-3.5 max-w-sm mx-auto">
            <button
              onClick={() => scrollTo(exploreSectionRef)}
              className="w-full px-6 py-3.5 bg-[#0055ff] hover:bg-blue-600 text-white text-[13px] font-bold rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              Explore ScaleCraft Systems →
            </button>
            <button
              onClick={() => scrollTo(goalSelectorRef)}
              className="w-full px-6 py-3.5 bg-white border border-border-strong hover:bg-bg-secondary text-text-primary text-[13px] font-bold rounded-xl shadow-sm transition-all cursor-pointer"
            >
              Find My System
            </button>
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────
          MOBILE STICKY CTA
          ──────────────────────────────────────────────────────── */}
      {mobileStickyVisible && !dismissSticky && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border-primary px-5 py-4 pb-safe sticky-cta-shadow flex items-center justify-between gap-4 animate-in slide-in-from-bottom duration-300">
          <div className="flex flex-col min-w-0 select-none">
            <span className="text-[10px] font-black uppercase tracking-wider text-accent truncate">
              ScaleCraft Storefront
            </span>
            <span className="text-[13px] font-black text-text-primary mt-0.5 truncate">
              Find your AI workflow
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => scrollTo(goalSelectorRef)}
              className="px-4 py-2.5 bg-[#0055ff] hover:bg-blue-600 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
            >
              Find My System →
            </button>
            
            <button 
              onClick={() => setDismissSticky(true)}
              className="p-2 text-text-light hover:text-foreground cursor-pointer rounded-lg hover:bg-bg-secondary"
              aria-label="Dismiss sticky CTA"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
