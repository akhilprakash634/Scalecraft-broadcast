'use client';

import React from 'react';
import { getFormattedPrice, GeoPaymentState, PricingData } from '@/lib/pricing';

interface ProductPriceProps {
  product: PricingData;
  geoPayment?: GeoPaymentState;
  showOriginal?: boolean;
  showBadge?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export default function ProductPrice({
  product,
  geoPayment = { isIndia: true, currency: 'INR', symbol: '₹' },
  showOriginal = true,
  showBadge = true,
  size = 'md',
  className = '',
}: ProductPriceProps) {
  const p = getFormattedPrice(product, geoPayment);

  const sizeClasses = {
    sm: { price: 'text-sm font-bold', original: 'text-xs', badge: 'text-[9px] px-1.5 py-0.5' },
    md: { price: 'text-lg font-black', original: 'text-xs', badge: 'text-[9.5px] px-2 py-0.5' },
    lg: { price: 'text-2xl font-black', original: 'text-sm', badge: 'text-[10px] px-2 py-0.5' },
    xl: { price: 'text-4xl font-black', original: 'text-base', badge: 'text-[10px] px-2 py-0.5' },
  };

  const currentSize = sizeClasses[size] || sizeClasses.md;

  return (
    <div className={`flex items-baseline gap-2 flex-wrap ${className}`}>
      <span className={`font-heading ${currentSize.price} text-text-primary leading-none tracking-tight`}>
        {p.formattedPrice}
      </span>

      {showOriginal && p.hasDiscount && (
        <span className={`text-text-light line-through font-medium leading-none ${currentSize.original}`}>
          {p.formattedOriginalPrice}
        </span>
      )}

      {showBadge && p.hasDiscount && (
        <span className={`font-extrabold text-accent bg-accent/5 border border-accent/15 rounded-full uppercase tracking-wider ${currentSize.badge}`}>
          Save {p.discountPct}%
        </span>
      )}
    </div>
  );
}
