'use client';

import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import BuyButton from './BuyButton';
import { normalizeProduct } from '@/lib/content';
import { getProductExperienceConfig } from '@/lib/productExperience';
import { Product } from '@/types/product';

interface StickyMobileCardProps {
  product: Product | any;
  geoPayment?: {
    isIndia: boolean;
    currency: string;
    symbol: string;
    loading: boolean;
  };
  prefilledCouponCode?: string;
}

export default function StickyMobileCard({ product, geoPayment, prefilledCouponCode }: StickyMobileCardProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 350) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!isVisible || !product) return null;

  const normProduct = normalizeProduct(product);
  const exp = getProductExperienceConfig(product);

  const geo = geoPayment || { isIndia: true, currency: 'INR', symbol: '₹', loading: false };
  const basePrice = geo.isIndia ? normProduct.priceINR : normProduct.priceUSD;
  const displayPrice = basePrice;
  const displaySymbol = geo.symbol;
  const productName = normProduct.name?.en || product.name || '';

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border-primary px-5 py-4 pb-safe sticky-cta-shadow flex items-center justify-between gap-4 animate-in slide-in-from-bottom duration-200">
      <div className="flex flex-col min-w-0">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-accent truncate max-w-[120px]">
          {productName}
        </span>
        <div className="flex items-baseline gap-1.5 mt-0.5">
          <span className="text-lg font-black text-text-primary">
            {geo.loading ? '...' : `${displaySymbol}${displayPrice}`}
          </span>
          <span className="text-[9.5px] text-text-light font-bold truncate max-w-[90px]">
            {exp.productType === 'saas' ? 'Managed Setup' : 'Lifetime Access'}
          </span>
        </div>
        <div className="flex items-center gap-0.5 text-[10px] text-[#EF9F27] mt-0.5">
          <Star className="w-2.5 h-2.5 fill-current" />
          <Star className="w-2.5 h-2.5 fill-current" />
          <Star className="w-2.5 h-2.5 fill-current" />
          <Star className="w-2.5 h-2.5 fill-current" />
          <Star className="w-2.5 h-2.5 fill-current" />
          <span className="text-text-muted ml-1 font-bold">4.9/5</span>
        </div>
      </div>

      <div className="flex-grow max-w-[190px]">
        <BuyButton
          productId={product.id || product._id}
          price={displayPrice}
          currency={geo.currency}
          symbol={geo.symbol}
          name={productName}
          loading={geo.loading}
          text={exp.ctaText}
          product={product}
          prefilledCouponCode={prefilledCouponCode}
          className="w-full text-center py-2.5 text-xs rounded-xl cursor-pointer"
        />
      </div>
    </div>
  );
}
