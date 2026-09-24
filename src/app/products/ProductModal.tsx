'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { ShieldCheck, X } from 'lucide-react';
import Link from 'next/link';

const DynamicBuyButton = dynamic(
  () => import('@/components/ui/BuyButton'), 
  { ssr: false }
);

export default function ProductModal({ 
  product, geoPayment, allProducts, onClose 
}: { 
  product: any; 
  geoPayment: any; 
  allProducts: any[];
  onClose: () => void;
}) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { 
      if (e.key === 'Escape') onClose(); 
    };
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const isCombo = product.isCombo === true || 
    product.name?.toLowerCase().includes('combo');
  
  const basePrice = product.offerPrice ?? product.price ?? 0;
  const baseOriginalPrice = isCombo ? 1498 : 
    (product.actualPrice ?? product.originalPrice ?? 0);
  
  const displayPrice = geoPayment.isIndia
    ? basePrice
    : (product.internationalPrice ?? Math.round(basePrice / 83));
  
  const displayOriginalPrice = geoPayment.isIndia
    ? baseOriginalPrice
    : (product.internationalActualPrice ?? Math.round(baseOriginalPrice / 83));

  const saveAmount = displayOriginalPrice - displayPrice;

  return (
    <div 
      className="fixed inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-background rounded-2xl w-full max-w-[440px] max-h-[88vh] overflow-y-auto border border-border-primary shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-lg border border-border-primary bg-background flex items-center justify-center hover:bg-bg-secondary z-10"
        >
          <X size={16} />
        </button>

        <div className="p-6 pb-0">
          <span className="inline-flex items-center gap-1.5 bg-green-bg text-green text-[11px] font-bold px-2.75 py-1 rounded-full mb-4">
            <span className="w-1.25 h-1.25 bg-green rounded-full animate-blink"></span>
            {product.status === 'live' ? 'Live Now' : 'Coming Soon'}
          </span>
          <h2 className="font-heading text-[20px] font-extrabold tracking-[-0.4px] mb-2 text-foreground pr-8">
            {product.name}
          </h2>
          <p className="text-[13px] text-text-muted leading-[1.65] mb-5">
            {product.description}
          </p>

          <ul className="list-none border-t border-border-primary mb-2">
            {product.features.map((feature: string, i: number) => (
              <li key={i} className="flex items-center gap-2.5 py-2.25 border-b border-border-primary text-[13px] text-foreground last:border-b-0">
                <span className="text-green font-bold text-[11px] shrink-0">✓</span>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <div className="p-[18px_24px_22px] bg-bg-secondary border-t border-border-primary mt-4">
          {product.price === 0 || product.offerPrice === 0 ? (
            <>
              <div className="flex items-baseline gap-2.5 mb-3 min-h-[40px]">
                <span className="font-heading text-[30px] font-black tracking-[-1px] text-green">
                  Free
                </span>
              </div>

              <a 
                href={product.link || product.notionUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-[44px] flex items-center justify-center rounded-lg bg-green text-white font-semibold text-[14px] hover:opacity-95 transition-opacity"
              >
                Access Free →
              </a>
            </>
          ) : (
            <>
              <div className="flex items-baseline gap-2.5 mb-1.5 min-h-[40px]">
                {geoPayment.loading ? (
                  <div className="h-10 w-24 bg-foreground/5 animate-pulse rounded-lg" />
                ) : (
                  <>
                    <span className="font-heading text-[30px] font-black tracking-[-1px] text-foreground">
                      {geoPayment.symbol}{displayPrice.toLocaleString(
                        geoPayment.currency === 'INR' ? 'en-IN' : 'en-US'
                      )}
                    </span>
                    {displayOriginalPrice > displayPrice && (
                      <span className="text-[14px] text-text-light line-through">
                        {geoPayment.symbol}{displayOriginalPrice.toLocaleString(
                          geoPayment.currency === 'INR' ? 'en-IN' : 'en-US'
                        )}
                      </span>
                    )}
                    <span className="text-[11px] font-bold text-green bg-green-bg px-2 py-0.5 rounded-full">
                      Launch price
                    </span>
                  </>
                )}
              </div>

              <div className="bg-[#FEF3C7] text-[#92400E] text-[11px] font-semibold py-1.5 px-3 rounded-[6px] text-center mb-3">
                ⏳ Launch Price Active · Price increases after first 25 customers
              </div>

              <DynamicBuyButton
                productId={product._id}
                price={displayPrice}
                currency={geoPayment.currency}
                symbol={geoPayment.symbol}
                name={product.name}
                loading={geoPayment.loading}
              />

              <p className="text-center text-[11px] text-text-light mt-2.5">
                {!geoPayment.loading && !geoPayment.isIndia
                  ? "🔒 Charged in USD · Secure payment via PayPal · Instant delivery"
                  : "🔒 Secure automated checkout · Instant email delivery & setup link"}
              </p>
            </>
          )}

          {product.name?.toLowerCase().includes('blueprint') && (
            <div className="mt-3.5 w-full flex items-center gap-2 bg-[#ECFDF5] border border-[#A7F3D0] rounded-[8px] p-[10px_14px] text-[12px] text-[#065F46] leading-[1.4]">
              <ShieldCheck size={14} style={{ color: '#059669' }} className="shrink-0" />
              <span>
                7-Day Results Guarantee - Follow the challenge for 7 days. No results? Full refund - just show us your outreach attempts.{' '}
                <Link href="/refund-policy" className="underline font-semibold">
                  See full policy →
                </Link>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
