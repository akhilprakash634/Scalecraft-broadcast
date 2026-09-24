'use client';

import React from 'react';
import { Zap, RefreshCw, Lock, ShieldCheck, Star, Users, Server, Headphones } from 'lucide-react';
import BuyButton from '@/components/ui/BuyButton';
import { trackEvent, normalizeProduct } from '@/lib/content';
import { Product } from '@/types/product';
import { validateProduct } from '@/lib/validateProduct';
import { getFormattedPrice, GeoPaymentState } from '@/lib/pricing';
import { getProductExperienceConfig, TrustBadge } from '@/lib/productExperience';

interface PurchaseCardProps {
  product: Product | any;
  normProduct?: any;
  geoPayment: GeoPaymentState;
  bundleStandaloneValueINR?: number;
  bundleStandaloneValueUSD?: number;
  bundleSavingsINR?: number;
  bundleSavingsUSD?: number;
  prefilledCouponCode?: string;
  activeOffer?: any;
}

export default function PurchaseCard({
  product,
  normProduct,
  geoPayment,
  bundleStandaloneValueINR,
  bundleStandaloneValueUSD,
  bundleSavingsINR,
  bundleSavingsUSD,
  prefilledCouponCode,
  activeOffer
}: PurchaseCardProps) {
  // Validate data integrity in development
  validateProduct(product, 'PurchaseCard');

  if (!product) return null;

  const norm = normProduct || normalizeProduct(product);
  
  const isIndia = geoPayment.isIndia !== false;
  
  let pFormatted = getFormattedPrice(product, geoPayment);

  if (bundleStandaloneValueINR !== undefined && bundleStandaloneValueUSD !== undefined) {
    const overrideOriginalPrice = isIndia ? bundleStandaloneValueINR : bundleStandaloneValueUSD;
    const overrideSavings = isIndia ? (bundleSavingsINR || 0) : (bundleSavingsUSD || 0);
    const hasDiscount = overrideOriginalPrice > pFormatted.price;
    const discountPct = hasDiscount ? Math.round((overrideSavings / overrideOriginalPrice) * 100) : 0;
    
    pFormatted = {
      ...pFormatted,
      originalPrice: overrideOriginalPrice,
      savingsAmount: overrideSavings,
      hasDiscount,
      discountPct,
      formattedOriginalPrice: `${pFormatted.symbol}${isIndia ? overrideOriginalPrice.toLocaleString('en-IN') : overrideOriginalPrice.toLocaleString('en-US')}`,
      formattedSavings: `${pFormatted.symbol}${isIndia ? overrideSavings.toLocaleString('en-IN') : overrideSavings.toLocaleString('en-US')}`,
    };
  }

  const exp = getProductExperienceConfig(product);

  const productName = norm?.name?.en || norm?.name || product?.name;
  if (!productName) return null;

  const customerCount = product?.review_count || product?.purchases_count || null;

  const renderBadgeIcon = (iconName?: string) => {
    switch (iconName) {
      case 'server':
        return <Server className="w-3.5 h-3.5 text-accent" />;
      case 'headphones':
        return <Headphones className="w-3.5 h-3.5 text-accent" />;
      case 'refresh':
        return <RefreshCw className="w-3.5 h-3.5 text-accent" />;
      case 'lock':
        return <Lock className="w-3.5 h-3.5 text-accent" />;
      default:
        return <Zap className="w-3.5 h-3.5 text-accent fill-current" />;
    }
  };

  return (
    <div className="rounded-card-lg border border-border-dark bg-white overflow-hidden shadow-premium">

      {/* Social Proof Bar */}
      <div className="px-5 py-3 border-b border-border-primary bg-bg-secondary flex items-center justify-between gap-3 text-text-muted text-[11px] font-bold">
        <div className="flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          ))}
          <span className="text-[11.5px] font-black text-text-primary ml-1">4.9</span>
        </div>
        {customerCount ? (
          <div className="flex items-center gap-1.5 text-[10.5px] text-text-muted font-bold">
            <Users className="w-3.5 h-3.5 text-accent" />
            <span>{customerCount}+ buyers</span>
          </div>
        ) : null}
        <div className="flex items-center gap-1 text-[10.5px] text-accent font-bold">
          {renderBadgeIcon(exp.trustBadges[0]?.icon)}
          <span>{exp.socialProofBadge || exp.trustBadges[0]?.label}</span>
        </div>
      </div>

      {/* Price block */}
      <div className="px-6 pt-5 pb-4 border-b border-border-primary">
        <div className="text-[10px] font-extrabold text-text-light uppercase tracking-wider mb-1">
          {productName}
        </div>

        {geoPayment.loading ? (
          <div className="h-10 w-40 bg-bg-secondary rounded-lg animate-pulse mt-2" />
        ) : (
          <div className="flex items-baseline gap-2.5 mt-2 flex-wrap">
            <span className="font-heading text-4xl font-black text-text-primary leading-none tracking-tight">
              {pFormatted.formattedPrice}
            </span>
            {pFormatted.hasDiscount && (
              <>
                <span className="text-[17px] text-text-light line-through font-medium leading-none">
                  {pFormatted.formattedOriginalPrice}
                </span>
                <span className="text-[9.5px] font-extrabold text-accent bg-accent/5 border border-accent/15 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Save {pFormatted.discountPct}%
                </span>
              </>
            )}
          </div>
        )}
        
        {activeOffer && prefilledCouponCode && (
          <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-md">
            <Zap className="w-3.5 h-3.5 text-emerald-600 fill-current" />
            <span className="text-[11px] font-black text-emerald-700">
              Get extra {activeOffer.description?.includes('%') ? activeOffer.description.match(/(\d+)%/)?.[0] || '60%' : '60%'} OFF with code: {prefilledCouponCode}
            </span>
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="p-6 space-y-4">
        {bundleStandaloneValueINR !== undefined && (
          <div className="bg-bg-secondary border border-border-primary rounded-2xl p-4.5 space-y-3 select-none mb-2">
            <div className="space-y-1">
              <h4 className="text-[12.5px] font-black text-text-primary uppercase tracking-wide">
                Everything Included
              </h4>
              <p className="text-[10px] font-extrabold text-accent uppercase tracking-wider">
                6 Core Systems + 3 FREE Bonuses
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] font-bold text-text-muted">
              <div className="flex items-center gap-1.5">
                <span className="text-emerald-500 font-extrabold">✓</span>
                <span>Lead Gen</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-emerald-500 font-extrabold">✓</span>
                <span>Client Outreach</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-emerald-500 font-extrabold">✓</span>
                <span>CRM &amp; Pipeline</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-emerald-500 font-extrabold">✓</span>
                <span>Proposals &amp; Sales</span>
              </div>
              <div className="flex items-center gap-1.5 col-span-2">
                <span className="text-emerald-500 font-extrabold">✓</span>
                <span>Client Onboarding + SOPs</span>
              </div>
            </div>

            <div className="border-t border-border-primary pt-3 space-y-1 text-[11px] font-bold text-text-muted">
              <div className="flex justify-between">
                <span>Buy Separately:</span>
                <span className="line-through">{pFormatted.formattedOriginalPrice}</span>
              </div>
              <div className="flex justify-between text-text-primary font-extrabold">
                <span>Master System Price:</span>
                <span>{pFormatted.formattedPrice}</span>
              </div>
              <div className="flex justify-between text-emerald-600 font-extrabold">
                <span>You Save:</span>
                <span>{pFormatted.formattedSavings} ({pFormatted.discountPct}%)</span>
              </div>
            </div>
          </div>
        )}

        <div onClick={() => trackEvent('checkout_initiated', {
          content_name: productName, value: pFormatted.price, currency: geoPayment.currency
        })}>
          <BuyButton
            productId={product.id || product._id}
            price={pFormatted.price}
            currency={geoPayment.currency}
            symbol={geoPayment.symbol}
            name={productName}
            loading={geoPayment.loading}
            text={exp.ctaText}
            product={product}
            prefilledCouponCode={prefilledCouponCode}
            className="w-full py-3.5 text-[14px] rounded-xl font-black shadow-md cursor-pointer"
          />
        </div>

        {/* Dynamic Trust Row */}
        <div className="flex items-center justify-between text-[10.5px] font-bold text-text-muted pt-1">
          {exp.trustBadges.slice(0, 3).map((badge: TrustBadge, idx: number) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span className="text-border-dark">·</span>}
              <span className="flex items-center gap-1">
                {renderBadgeIcon(badge.icon)}
                {badge.label}
              </span>
            </React.Fragment>
          ))}
        </div>

        {/* Dynamic Guarantee Box */}
        <div className="flex items-start gap-2.5 bg-accent/5 border border-accent/15 rounded-xl p-3.5">
          <ShieldCheck className="w-4 h-4 text-accent shrink-0 mt-0.5" />
          <p className="text-[11.5px] text-text-muted leading-relaxed font-body">
            <span className="font-bold text-accent">{exp.guaranteeTitle}.</span>{' '}
            {exp.guaranteeDescription}
          </p>
        </div>

        {/* Dynamic Delivery Message */}
        <p className="text-center text-[11px] text-text-light font-medium">
          {exp.deliveryMessage}
        </p>
      </div>
    </div>
  );
}
