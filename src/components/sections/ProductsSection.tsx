'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ProductCard from '@/components/ui/ProductCard';
import { ArrowRight } from 'lucide-react';

export default function ProductsSection({ liveProducts }: { liveProducts: any[] }) {
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

  useEffect(() => {
    const detectGeo = async () => {
      try {
        const urlGeo = new URLSearchParams(window.location.search).get('geo');
        const countryCode = urlGeo?.toUpperCase() || await fetch('/api/geo', {
          signal: AbortSignal.timeout(4000),
        }).then(r => r.json()).then(d => d.country_code);

        const isIndia = countryCode === 'IN';
        setGeoPayment({
          isIndia,
          currency: isIndia ? 'INR' : 'USD',
          symbol: isIndia ? '₹' : '$',
          loading: false,
        });
      } catch {
        setGeoPayment(prev => ({ ...prev, isIndia: true, loading: false }));
      }
    };
    detectGeo();
  }, []);

  // Filter & sort featured products (combos first, then by sort_order)
  const featuredProducts = (liveProducts || [])
    .filter(p => p.status === 'live' || p.status === 'published' || p.status === 'active')
    .sort((a, b) => {
      if (a.isCombo && !b.isCombo) return -1;
      if (!a.isCombo && b.isCombo) return 1;
      return (a.sort_order || 0) - (b.sort_order || 0);
    })
    .slice(0, 3);

  if (featuredProducts.length === 0) return null;

  return (
    <section className="max-w-[1100px] mx-auto px-6 md:px-10 py-12 md:py-16 scroll-mt-20" id="products">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 md:mb-12 gap-4">
        <div className="max-w-[720px]">
          <span className="text-[11px] font-bold text-accent tracking-[0.15em] uppercase mb-2 block">
            BUSINESS SYSTEMS
          </span>
          <h2 className="font-heading text-clamp-h2 font-black leading-tight text-text-primary">
            Choose the product that solves your next business challenge.
          </h2>
          <p className="text-[15.5px] text-text-muted mt-3 leading-relaxed">
            Whether you need an AI assistant, a CRM, lead generation tools, or ready-to-use systems, you'll find them here.
          </p>
        </div>
        <Link
          href="/products"
          className="inline-flex items-center gap-1.5 text-[13.5px] font-bold text-accent hover:text-blue-700 transition-colors shrink-0"
        >
          <span>Explore All Products</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

        {/* ── Product Discovery Guide ────────────────────────── */}
        <div className="mb-12 bg-bg-secondary border border-border-primary/80 rounded-[20px] p-6 md:p-8 select-none">
          <h3 className="font-heading text-[12px] font-extrabold text-text-primary mb-6 uppercase tracking-wider">
            What do you need today?
          </h3>
          {(() => {
            const findProduct = (criteria: (p: any) => boolean, fallbackSlug: string, fallbackName: string) => {
              const found = (liveProducts || []).find(criteria);
              if (found) return found;
              // Fallback lookup
              const fallbackFound = (liveProducts || []).find(p => p.slug === fallbackSlug);
              return fallbackFound || { slug: fallbackSlug, name: fallbackName, shortName: fallbackName };
            };

            const lfP = findProduct(p => p.slug?.includes('lead-finder') || p.tags?.includes('Leads') || p.category === 'leads', 'ai-lead-finder-system', 'AI Lead Finder');
            const bpP = findProduct(p => p.slug?.includes('pipeline') || p.slug?.includes('blueprint') || p.tags?.includes('CRM') || p.category === 'crm', 'freelance-client-pipeline-blueprint', 'Client Pipeline Blueprint');
            const agP = findProduct(p => p.slug?.includes('agent') || p.tags?.includes('WhatsApp') || p.category === 'saas', 'scalecraft-agent-saas', 'WhatsApp AI Agent');
            const coP = findProduct(p => p.product_type === 'bundle' || p.slug?.includes('combo'), 'ai-systems-combo', 'AI Systems Bundle');

            const getDisplayName = (p: any) => {
              if (p.shortName) return p.shortName;
              const n = p.name?.en || p.name || '';
              return n.replace("ScaleCraft ", "");
            };

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-0 lg:divide-x divide-border-primary/70">
                <div className="lg:pr-6 space-y-3 flex flex-col justify-between h-full">
                  <div>
                    <span className="text-[10px] font-extrabold text-[#10B981] bg-[#10B981]/5 px-2 py-0.5 rounded border border-[#10B981]/10 uppercase tracking-wider inline-block mb-2">
                      Leads
                    </span>
                    <p className="text-[13.5px] font-black text-text-primary leading-tight">I need more customers</p>
                  </div>
                  <Link
                    href={`/products/${lfP.slug}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:text-blue-700 transition-colors pt-2"
                  >
                    <span>{getDisplayName(lfP)}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="lg:px-6 pt-4 lg:pt-0 border-t lg:border-t-0 border-border-primary/60 space-y-3 flex flex-col justify-between h-full">
                  <div>
                    <span className="text-[10px] font-extrabold text-[#3B82F6] bg-[#3B82F6]/5 px-2 py-0.5 rounded border border-[#3B82F6]/10 uppercase tracking-wider inline-block mb-2">
                      Sales CRM
                    </span>
                    <p className="text-[13.5px] font-black text-text-primary leading-tight">I need to organize clients</p>
                  </div>
                  <Link
                    href={`/products/${bpP.slug}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:text-blue-700 transition-colors pt-2"
                  >
                    <span>{getDisplayName(bpP)}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="lg:px-6 pt-4 lg:pt-0 border-t lg:border-t-0 border-border-primary/60 space-y-3 flex flex-col justify-between h-full">
                  <div>
                    <span className="text-[10px] font-extrabold text-[#8B5CF6] bg-[#8B5CF6]/5 px-2 py-0.5 rounded border border-[#8B5CF6]/10 uppercase tracking-wider inline-block mb-2">
                      Automation
                    </span>
                    <p className="text-[13.5px] font-black text-text-primary leading-tight">I want WhatsApp automation</p>
                  </div>
                  <Link
                    href={`/products/${agP.slug}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:text-blue-700 transition-colors pt-2"
                  >
                    <span>{getDisplayName(agP)}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="lg:pl-6 pt-4 lg:pt-0 border-t lg:border-t-0 border-border-primary/60 space-y-3 flex flex-col justify-between h-full">
                  <div>
                    <span className="text-[10px] font-extrabold text-accent bg-accent/5 px-2 py-0.5 rounded border border-accent/10 uppercase tracking-wider inline-block mb-2">
                      All-In-One
                    </span>
                    <p className="text-[13.5px] font-black text-text-primary leading-tight">I want everything</p>
                  </div>
                  <Link
                    href={`/products/${coP.slug}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:text-blue-700 transition-colors pt-2"
                  >
                    <span>{getDisplayName(coP)}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })()}
        </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        {featuredProducts.map((product) => (
          <ProductCard key={product._id} product={product} geoPayment={geoPayment} />
        ))}
      </div>
    </section>
  );
}
