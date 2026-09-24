'use client';

import Link from 'next/link';
import { normalizeProduct } from '@/lib/content';
import { getDynamicCTA } from '@/lib/validateProduct';

export default function CompactProductCard({ 
  product, geoPayment
}: { 
  product: any; 
  geoPayment: { isIndia: boolean; currency: string; symbol: string; loading: boolean };
}) {
  const normProduct = normalizeProduct(product);
  const slug = typeof product.slug === 'object' ? product.slug?.current : product.slug;

  const isCombo = product.isCombo === true || slug === 'ai-systems-combo';
  const isBestSeller = slug === 'ai-systems-combo';

  const basePrice = product.offerPrice ?? product.price ?? 0;
  const baseOriginalPrice = isCombo ? 1498 : (product.actualPrice ?? product.originalPrice ?? 0);
  
  const displayPrice = geoPayment.isIndia
    ? basePrice
    : (product.internationalPrice ?? Math.round(basePrice / 83));
  
  const displayOriginalPrice = geoPayment.isIndia
    ? baseOriginalPrice
    : (product.internationalActualPrice ?? Math.round(baseOriginalPrice / 83));

  const thumbnailUrl = product.thumbnail_url || product.thumbnailUrl || product.banner_url || product.bannerUrl || product.mainImage || '';

  const bestForText = normProduct.bestForText || 'Freelancers & business builders';
  const crossSellText = normProduct.crossSellText || 'AI Systems Combo';

  const ctaText = getDynamicCTA(product, 'card');

  return (
    <Link
      href={`/products/${slug}`}
      className={`relative bg-white border rounded-2xl p-5 transition-all hover:border-accent/40 hover:shadow-premium flex flex-col justify-between group ${
        isCombo ? 'border-accent shadow-[0_8px_30px_rgba(0,85,255,0.04)] ring-2 ring-accent/10' : 'border-border-primary'
      } cursor-pointer`}
    >
      <div>
        {/* Product Photo Thumbnail */}
        {thumbnailUrl ? (
          <div className="rounded-xl overflow-hidden aspect-[16/9] bg-[#0a0a0a] border border-border-primary mb-4">
            <img
              src={thumbnailUrl}
              alt={normProduct.name?.en || product.name}
              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          </div>
        ) : null}

        {/* Labels & Badge */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {isBestSeller && (
            <span className="text-[9px] font-black bg-accent text-white px-2 py-0.5 rounded border border-accent">
              ⭐ BEST SELLER
            </span>
          )}
          {isCombo && (
            <span className="text-[9px] font-black bg-green/10 text-green px-2 py-0.5 rounded border border-green/20">
              💰 BEST VALUE
            </span>
          )}
          {slug === 'ai-lead-finder-system' && (
            <span className="text-[9px] font-black bg-[#10B981]/10 text-[#10B981] px-2 py-0.5 rounded border border-[#10B981]/20">
              ⚡ BEGINNER FRIENDLY
            </span>
          )}
          {slug === 'scalecraft-agent-saas' && (
            <>
              <span className="text-[9px] font-black bg-[#8B5CF6]/10 text-[#8B5CF6] px-2 py-0.5 rounded border border-[#8B5CF6]/20">
                🔥 POPULAR
              </span>
              <span className="text-[9px] font-black bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded border border-blue-500/20">
                🆕 NEW
              </span>
            </>
          )}
          {slug === 'freelance-client-pipeline-blueprint' && (
            <span className="text-[9px] font-black bg-accent/10 text-accent px-2 py-0.5 rounded border border-accent/20">
              🎯 RECOMMENDED
            </span>
          )}
        </div>

        {/* Rating */}
        <div className="flex items-center gap-1 text-[11px] font-bold text-amber-500 mb-2">
          <span>★ ★ ★ ★ ★</span>
          <span className="text-text-muted ml-0.5">4.9/5 rating</span>
        </div>

        {/* Name */}
        <h3 className="font-heading text-[15px] font-bold mb-1.5 text-foreground leading-snug group-hover:text-accent transition-colors">
          {normProduct.name?.en || product.name}
        </h3>

        {/* Description (Problem -> Solution -> Outcome) */}
        <p className="text-[12.5px] text-text-muted leading-relaxed mb-4">
          {normProduct.description?.en || product.description}
        </p>

        {/* Best For */}
        <div className="text-[11.5px] text-text-muted leading-relaxed mb-4 bg-bg-secondary p-2.5 rounded-lg border border-border-primary/50">
          <strong className="text-foreground">Best for:</strong> {bestForText}
        </div>
      </div>

      <div className="space-y-4 mt-auto">
        {/* Cross Selling */}
        <div className="text-[10px] text-text-light font-mono border-t border-border-primary/50 pt-3">
          <span>Works great with:</span> <strong className="text-accent font-bold">{crossSellText}</strong>
        </div>

        {/* Price & CTA Block */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-baseline gap-1.5">
            {geoPayment.loading ? (
              <div className="h-5 w-16 bg-foreground/5 animate-pulse rounded" />
            ) : basePrice === 0 ? (
              <span className="text-green font-bold text-[16px]">Free</span>
            ) : (
              <>
                <span className="text-[17px] font-black text-foreground">
                  {geoPayment.symbol}{displayPrice.toLocaleString(
                    geoPayment.currency === 'INR' ? 'en-IN' : 'en-US'
                  )}
                </span>
                {displayOriginalPrice > displayPrice && (
                  <span className="text-[11px] text-text-light line-through">
                    {geoPayment.symbol}{displayOriginalPrice.toLocaleString(
                      geoPayment.currency === 'INR' ? 'en-IN' : 'en-US'
                    )}
                  </span>
                )}
              </>
            )}
          </div>

          <div
            className="px-4 py-2 bg-foreground group-hover:bg-neutral-900 text-white text-[12.5px] font-bold rounded-lg transition-colors flex items-center gap-1"
          >
            <span>{ctaText}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
