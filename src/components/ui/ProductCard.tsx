'use client';

import Link from 'next/link';
import BuyButton from './BuyButton';
import { ArrowRight } from 'lucide-react';
import { normalizeProduct, trackEvent } from '@/lib/content';
import { Product } from '@/types/product';
import { validateProduct, getDynamicCTA } from '@/lib/validateProduct';
import { getFormattedPrice, GeoPaymentState } from '@/lib/pricing';

interface ProductCardProps {
  product: Product | any;
  geoPayment?: GeoPaymentState;
  isProductPage?: boolean;
}

export default function ProductCard({
  product,
  geoPayment,
  isProductPage = false,
}: ProductCardProps) {
  // Validate data integrity in development
  validateProduct(product, 'ProductCard');

  if (!product) return null;

  const normProduct = normalizeProduct(product);
  const geo = geoPayment || { isIndia: true, currency: 'INR', symbol: '₹', loading: false };

  const pFormatted = getFormattedPrice(product, geo);

  const slug = normProduct.slug || product.slug;
  if (!slug) return null;

  const productName = normProduct.name?.en || product.name;
  if (!productName) return null;

  const productDesc = normProduct.description?.en || product.description;
  const thumbnailUrl = product.thumbnail_url || product.banner_url || product.mainImage || '';

  const isCombo = product.is_combo === true || product.isCombo === true || slug === 'ai-systems-combo';
  const isBestSeller = slug === 'ai-systems-combo';
  const badgeText = isBestSeller
    ? '⭐ RECOMMENDED BUNDLE'
    : isCombo
    ? 'FEATURED BUNDLE'
    : (product.product_subtype || product.product_type || 'SYSTEM').toUpperCase();

  const ctaText = getDynamicCTA(product, isProductPage ? 'landing' : 'card');

  return (
    <div className="flex flex-col h-full w-full">
      <div
        className={`bg-white border rounded-2xl p-5 md:p-6 flex flex-col justify-between h-full relative transition-all group ${
          isBestSeller
            ? 'border-accent/80 shadow-[0_12px_40px_rgba(0,85,255,0.12)] hover:border-accent ring-2 ring-accent/20'
            : isCombo
            ? 'border-accent/60 shadow-[0_12px_40px_rgba(0,85,255,0.08)] hover:border-accent'
            : 'border-border-primary shadow-card hover:shadow-premium hover:border-border-dark'
        }`}
      >
        {/* Top Info */}
        <div className="space-y-3 flex-1 flex flex-col">
          {/* Thumbnail Image */}
          {thumbnailUrl ? (
            <div className="rounded-xl overflow-hidden aspect-[16/9] bg-bg-secondary border border-border-primary mb-1">
              <img
                src={thumbnailUrl}
                alt={productName}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            </div>
          ) : null}

          {/* Subtype Badge */}
          <div className="flex items-center justify-between gap-2">
            <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-md border ${
              isBestSeller
                ? 'text-white bg-accent border-accent'
                : 'text-accent bg-accent/5 border-accent/10'
            }`}>
              {badgeText}
            </span>
          </div>

          {/* Product Name */}
          <h3 className="font-heading text-[18px] font-black tracking-tight text-text-primary leading-snug group-hover:text-accent transition-colors">
            {productName}
          </h3>

          {/* Short Description */}
          {productDesc && (
            <p className="text-[13px] text-text-muted leading-relaxed line-clamp-2 font-body">
              {productDesc}
            </p>
          )}

          {/* Pricing Block */}
          <div className="pt-3 border-t border-border-primary/60 flex items-baseline gap-2 mt-auto">
            {geo.loading ? (
              <div className="h-7 w-24 bg-bg-secondary animate-pulse rounded-lg" />
            ) : (
              <>
                <span className="font-heading text-2xl md:text-3xl font-black tracking-tight text-text-primary leading-none">
                  {pFormatted.formattedPrice}
                </span>
                {pFormatted.hasDiscount && (
                  <span className="text-[13px] text-text-light line-through font-medium leading-none">
                    {pFormatted.formattedOriginalPrice}
                  </span>
                )}
                {pFormatted.hasDiscount && (
                  <span className="text-[9px] font-extrabold text-accent bg-accent/5 px-2 py-0.5 rounded-full uppercase tracking-wider border border-accent/15 leading-none">
                    Save {pFormatted.discountPct}%
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Primary CTA Button */}
        <div className="pt-4 mt-auto">
          {isProductPage ? (
            <div onClick={() => trackEvent('checkout_initiated', { content_name: productName, value: pFormatted.price, currency: geo.currency })}>
              <BuyButton
                productId={product.id || product._id}
                price={pFormatted.price}
                currency={geo.currency}
                symbol={geo.symbol}
                name={productName}
                loading={geo.loading}
                text={ctaText}
                className="w-full py-3 text-[13.5px] rounded-xl font-bold bg-foreground text-white hover:bg-neutral-900"
              />
            </div>
          ) : (
            <Link
              href={`/products/${slug}`}
              onClick={() => trackEvent('product_viewed', { content_name: productName })}
              className="flex items-center justify-center gap-1.5 w-full py-3 bg-foreground text-white hover:bg-neutral-900 text-center rounded-xl text-[13.5px] font-bold transition-all shadow-xs"
            >
              <span>{ctaText}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
