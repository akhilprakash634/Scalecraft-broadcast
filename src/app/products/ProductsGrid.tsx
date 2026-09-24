'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import CompactProductCard from './CompactProductCard';
import { Search, ArrowRight, HelpCircle, Percent, Layers, Zap, Terminal } from 'lucide-react';

type CategoryOption = 'all' | 'automation' | 'sourcing' | 'crm' | 'templates';

export default function ProductsGrid({ liveProducts }: { liveProducts: any[] }) {
  const [geoPayment, setGeoPayment] = useState<{
    isIndia: boolean;
    currency: string;
    symbol: string;
    loading: boolean;
  }>({
    isIndia: true,
    currency: 'INR',
    symbol: '₹',
    loading: true,
  });

  const [activeCategory, setActiveCategory] = useState<CategoryOption>('all');
  const [searchQuery, setSearchQuery] = useState('');

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
        setGeoPayment((prev) => ({ ...prev, isIndia: true, loading: false }));
      }
    };
    detectGeo();
  }, []);

  if (!liveProducts || liveProducts.length === 0) {
    return (
      <p className="text-center text-[14px] text-text-muted py-20 bg-bg-secondary border border-border-primary rounded-2xl">
        No products available right now. Try another keyword or browse all categories.
      </p>
    );
  }

  const categories = [
    { id: 'all', name: 'All Products' },
    { id: 'automation', name: 'AI Automation' },
    { id: 'sourcing', name: 'Lead Sourcing' },
    { id: 'crm', name: 'CRMs & Pipelines' },
    { id: 'templates', name: 'Templates & Guides' },
  ] as const;

  // Search logic supporting problems, categories, and use cases
  const filteredBySearch = liveProducts.filter((p: any) => {
    const name = (p.name || '').toLowerCase();
    const desc = (p.description || '').toLowerCase();
    const slug = (p.slug?.current || p.slug || '').toLowerCase();
    const type = (p.product_type || '').toLowerCase();
    const searchLower = searchQuery.toLowerCase().trim();

    if (!searchLower) return true;

    // Direct problem & use case keywords mappings
    if (searchLower.includes('customer') || searchLower.includes('find') || searchLower.includes('lead') || searchLower.includes('source')) {
      if (slug.includes('lead-finder') || slug.includes('combo')) return true;
    }
    if (searchLower.includes('organize') || searchLower.includes('crm') || searchLower.includes('client') || searchLower.includes('track')) {
      if (slug.includes('pipeline') || slug.includes('blueprint') || slug.includes('combo')) return true;
    }
    if (searchLower.includes('whatsapp') || searchLower.includes('support') || searchLower.includes('reply') || searchLower.includes('agent')) {
      if (slug.includes('agent') || slug.includes('combo')) return true;
    }
    if (searchLower.includes('everything') || searchLower.includes('bundle') || searchLower.includes('all')) {
      if (slug.includes('combo')) return true;
    }

    return name.includes(searchLower) || desc.includes(searchLower) || type.includes(searchLower) || slug.includes(searchLower);
  });

  // Category filtering
  const categoryFiltered = filteredBySearch.filter((p: any) => {
    if (activeCategory === 'all') return true;
    const slug = (p.slug?.current || p.slug || '').toLowerCase();
    const prodCat = (p.category || '').toLowerCase();
    const prodTags = (p.tags || []).map((t: string) => t.toLowerCase());

    if (activeCategory === 'automation') {
      return prodCat === 'saas' || prodTags.includes('saas') || slug.includes('agent') || slug.includes('combo');
    }
    if (activeCategory === 'sourcing') {
      return prodCat === 'leads' || prodTags.includes('leads') || slug.includes('lead-finder') || slug.includes('combo');
    }
    if (activeCategory === 'crm') {
      return prodCat === 'crm' || prodTags.includes('crm') || slug.includes('pipeline') || slug.includes('blueprint') || slug.includes('combo');
    }
    if (activeCategory === 'templates') {
      return prodCat === 'templates' || prodTags.includes('templates') || (p.product_type !== 'saas' && !slug.includes('combo'));
    }
    return true;
  });


  // Dynamic product lookups from live CMS database
  const leadFinderProd = liveProducts.find(p => (p.slug?.current || p.slug) === 'ai-lead-finder-system');
  const blueprintProd = liveProducts.find(p => (p.slug?.current || p.slug) === 'freelance-client-pipeline-blueprint');
  const agentProd = liveProducts.find(p => (p.slug?.current || p.slug) === 'scalecraft-agent-saas');
  const comboProd = liveProducts.find(p => (p.slug?.current || p.slug) === 'ai-systems-combo');

  // Dynamic pricing calculations for bundle strategy
  const leadPrice = leadFinderProd ? Number(leadFinderProd.price ?? 499) : 499;
  const bluePrice = blueprintProd ? Number(blueprintProd.price ?? 999) : 999;
  const bundlePrice = comboProd ? Number(comboProd.price ?? 1299) : 1299;

  const displayLeadPrice = geoPayment.isIndia
    ? leadPrice
    : Number(leadFinderProd?.internationalPrice ?? Math.round(leadPrice / 83));
  
  const displayBlueprintPrice = geoPayment.isIndia
    ? bluePrice
    : Number(blueprintProd?.internationalPrice ?? Math.round(bluePrice / 83));
  
  const displayComboPrice = geoPayment.isIndia
    ? bundlePrice
    : Number(comboProd?.internationalPrice ?? Math.round(bundlePrice / 83));

  const totalSeparatePrice = displayLeadPrice + displayBlueprintPrice;
  const totalSavingsVal = Math.max(0, totalSeparatePrice - displayComboPrice);
  const savingsPercent = totalSeparatePrice > 0 ? Math.round((totalSavingsVal / totalSeparatePrice) * 100) : 13;

  return (
    <>
      {/* Search & Categories Header */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center mb-8 border-b border-border-primary/50 pb-6">
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-text-muted" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products, AI tools, CRM, automation..."
            className="w-full pl-9 pr-4 py-2 border border-border-primary rounded-xl text-sm bg-white focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/15 text-text-primary"
          />
        </div>
        {/* Category Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none select-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategory(cat.id);
                setSearchQuery(''); // clear search when switching categories
              }}
              className={`px-3.5 py-1.5 rounded-full text-[11.5px] font-bold border transition-colors whitespace-nowrap cursor-pointer ${
                activeCategory === cat.id
                  ? 'bg-foreground text-background border-foreground'
                  : 'border-border-primary text-text-muted hover:border-foreground bg-white'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* ── Help Me Choose Section (Recommender Cards) ────────────────── */}
      {activeCategory === 'all' && !searchQuery && (
        <div className="mb-12 select-none animate-in fade-in duration-300">
          <h3 className="font-heading text-[12px] font-extrabold text-text-primary mb-5 uppercase tracking-wider">
            Not sure where to start?
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Card 1: Sourcing */}
            {leadFinderProd && (
              <div className="bg-white border border-border-primary rounded-xl p-4 flex flex-col justify-between h-[120px] shadow-sm">
                <div>
                  <span className="text-[9px] font-black text-green bg-green/5 px-2 py-0.5 rounded border border-green/10 uppercase tracking-wider inline-block mb-1.5">
                    Leads
                  </span>
                  <p className="text-[12.5px] font-bold text-text-primary leading-tight">I need more customers</p>
                </div>
                <Link
                  href={`/products/${leadFinderProd.slug?.current || leadFinderProd.slug}`}
                  className="inline-flex items-center gap-1 text-[11.5px] font-bold text-accent hover:underline mt-2"
                >
                  <span>Recommended: {leadFinderProd.name}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}

            {/* Card 2: CRM */}
            {blueprintProd && (
              <div className="bg-white border border-border-primary rounded-xl p-4 flex flex-col justify-between h-[120px] shadow-sm">
                <div>
                  <span className="text-[9px] font-black text-blue-500 bg-blue-500/5 px-2 py-0.5 rounded border border-blue-500/10 uppercase tracking-wider inline-block mb-1.5">
                    Sales CRM
                  </span>
                  <p className="text-[12.5px] font-bold text-text-primary leading-tight">I need to organize my clients</p>
                </div>
                <Link
                  href={`/products/${blueprintProd.slug?.current || blueprintProd.slug}`}
                  className="inline-flex items-center gap-1 text-[11.5px] font-bold text-accent hover:underline mt-2"
                >
                  <span>Recommended: {blueprintProd.name}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}

            {/* Card 3: WhatsApp SaaS */}
            {agentProd && (
              <div className="bg-white border border-border-primary rounded-xl p-4 flex flex-col justify-between h-[120px] shadow-sm">
                <div>
                  <span className="text-[9px] font-black text-purple-500 bg-purple-500/5 px-2 py-0.5 rounded border border-purple-500/10 uppercase tracking-wider inline-block mb-1.5">
                    Automation
                  </span>
                  <p className="text-[12.5px] font-bold text-text-primary leading-tight">I want WhatsApp automation</p>
                </div>
                <Link
                  href={`/products/${agentProd.slug?.current || agentProd.slug}`}
                  className="inline-flex items-center gap-1 text-[11.5px] font-bold text-accent hover:underline mt-2"
                >
                  <span>Recommended: {agentProd.name}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}

            {/* Card 4: Combo Bundle */}
            {comboProd && (
              <div className="bg-white border border-border-primary rounded-xl p-4 flex flex-col justify-between h-[120px] shadow-sm">
                <div>
                  <span className="text-[9px] font-black text-accent bg-accent/5 px-2 py-0.5 rounded border border-accent/10 uppercase tracking-wider inline-block mb-1.5">
                    All-In-One
                  </span>
                  <p className="text-[12.5px] font-bold text-text-primary leading-tight">I want everything</p>
                </div>
                <Link
                  href={`/products/${comboProd.slug?.current || comboProd.slug}`}
                  className="inline-flex items-center gap-1 text-[11.5px] font-bold text-accent hover:underline mt-2"
                >
                  <span>Recommended: {comboProd.name}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ── Comparison & Bundle Strategy Section ────────────────── */}
      {activeCategory === 'all' && !searchQuery && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 mb-12">
          {/* Product Differences Comparison */}
          <div className="bg-bg-secondary border border-border-primary/80 rounded-2xl p-5 md:p-6">
            <h3 className="font-heading text-[12px] font-extrabold text-text-primary mb-4 uppercase tracking-wider flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-accent" />
              <span>What's the difference?</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs select-none">
              
              {leadFinderProd && (
                <div className="bg-white border border-border-primary rounded-xl p-4 space-y-1">
                  <h4 className="font-bold text-text-primary">{leadFinderProd.name}</h4>
                  <p className="text-text-muted leading-relaxed">{leadFinderProd.description}</p>
                </div>
              )}

              {blueprintProd && (
                <div className="bg-white border border-border-primary rounded-xl p-4 space-y-1">
                  <h4 className="font-bold text-text-primary">{blueprintProd.name}</h4>
                  <p className="text-text-muted leading-relaxed">{blueprintProd.description}</p>
                </div>
              )}

              {agentProd && (
                <div className="bg-white border border-border-primary rounded-xl p-4 space-y-1">
                  <h4 className="font-bold text-text-primary">{agentProd.name}</h4>
                  <p className="text-text-muted leading-relaxed">{agentProd.description}</p>
                </div>
              )}

              {comboProd && (
                <div className="bg-white border border-border-primary rounded-xl p-4 space-y-1">
                  <h4 className="font-bold text-text-primary">{comboProd.name}</h4>
                  <p className="text-text-muted leading-relaxed">{comboProd.description}</p>
                </div>
              )}

            </div>
          </div>

          {/* Bundle Strategy Savings Box */}
          <div className="bg-accent/5 border border-accent/25 rounded-2xl p-5 md:p-6 flex flex-col justify-between select-none">
            <div>
              <h3 className="font-heading text-[12px] font-extrabold text-accent mb-4 uppercase tracking-wider flex items-center gap-1.5">
                <Percent className="w-4 h-4 text-accent" />
                <span>Bundle & Save</span>
              </h3>
              <div className="space-y-3.5 text-xs text-text-muted">
                {leadFinderProd && (
                  <div className="flex justify-between">
                    <span>{leadFinderProd.name}</span>
                    <span>{geoPayment.symbol}{displayLeadPrice.toLocaleString()}</span>
                  </div>
                )}
                {blueprintProd && (
                  <div className="flex justify-between">
                    <span>{blueprintProd.name}</span>
                    <span>{geoPayment.symbol}{displayBlueprintPrice.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-border-primary/60 pt-2 font-mono">
                  <span>Buying separately:</span>
                  <span className="line-through">{geoPayment.symbol}{totalSeparatePrice.toLocaleString()}</span>
                </div>
                {comboProd && (
                  <div className="flex justify-between font-bold text-text-primary text-[12.5px]">
                    <span>{comboProd.name}:</span>
                    <span className="text-accent">{geoPayment.symbol}{displayComboPrice.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
            {totalSavingsVal > 0 && (
              <div className="bg-white border border-accent/20 rounded-xl p-2.5 text-center text-[11px] font-black text-accent mt-4">
                🎉 Total Savings: {geoPayment.symbol}{totalSavingsVal.toLocaleString()} ({savingsPercent}% Off)
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Products Display Grid / Empty State ────────────────── */}
      {categoryFiltered.length === 0 ? (
        <div className="text-center py-20 bg-bg-secondary border border-border-primary rounded-2xl p-6">
          <p className="font-bold text-text-primary mb-2">No products found.</p>
          <p className="text-xs text-text-muted">Try another keyword or browse all categories.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {categoryFiltered.map((product: any) => (
            <CompactProductCard
              key={product._id}
              product={product}
              geoPayment={geoPayment}
            />
          ))}
        </div>
      )}
    </>
  );
}
