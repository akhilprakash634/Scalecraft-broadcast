'use client';

import { useState, useEffect } from 'react';
import { Package, CreditCard, Zap, TrendingUp } from 'lucide-react';
import { getFormattedPrice, GeoPaymentState } from '@/lib/pricing';
import { LOCAL_PRODUCTS } from '@/lib/content';

interface HowItWorksProps {
  liveProducts?: any[];
  geoPayment?: GeoPaymentState;
}

export default function HowItWorks({ liveProducts, geoPayment: externalGeo }: HowItWorksProps) {
  const [geoPayment, setGeoPayment] = useState<GeoPaymentState>(
    externalGeo || {
      isIndia: true,
      currency: 'INR',
      symbol: '₹',
      loading: true,
    }
  );

  useEffect(() => {
    if (externalGeo) {
      setGeoPayment(externalGeo);
      return;
    }
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
  }, [externalGeo]);

  const fallbackMin = LOCAL_PRODUCTS['ai-lead-finder-system'] || Object.values(LOCAL_PRODUCTS)[0];
  const minProduct = liveProducts?.length
    ? [...liveProducts].sort((a, b) => Number(a.price || a.priceINR) - Number(b.price || b.priceINR))[0]
    : fallbackMin;
  const pFormatted = getFormattedPrice(minProduct, geoPayment);
  const startingPrice = geoPayment.loading
    ? '...'
    : pFormatted.formattedPrice;

  const paySecurelyDesc = geoPayment.isIndia
    ? 'One-time payment via UPI, card, or net banking through Razorpay. PayPal accepted for international buyers. 256-bit encrypted.'
    : 'One-time payment via PayPal or credit card. Secure, 256-bit encrypted checkout.';

  const steps = [
    {
      num: '01',
      icon: Package,
      title: 'Choose your system',
      desc: `Pick the product that fits your goals. Start with ${startingPrice} or go all-in with the combo.`,
    },
    {
      num: '02',
      icon: CreditCard,
      title: 'Pay securely',
      desc: paySecurelyDesc,
    },
    {
      num: '03',
      icon: Zap,
      title: 'Get instant access',
      desc: 'Notion workspace link delivered to your email within seconds of payment confirmation.',
    },
    {
      num: '04',
      icon: TrendingUp,
      title: 'Get clients',
      desc: 'Start the 7-day challenge. Use the scripts. Follow the daily routine. The system works.',
    },
  ];

  return (
    <section className="px-6 md:px-10 pt-14 md:pt-[72px] pb-10 md:pb-12 max-w-[1100px] mx-auto">
      <div className="text-[11px] font-bold text-text-light tracking-[0.1em] uppercase mb-2.5">How it works</div>
      <h2 className="font-heading text-clamp-h2 font-black tracking-[-1px] leading-[1.1] text-foreground mb-10">
        Simple by <em className="italic-accent">design.</em>
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 border border-border-primary rounded-card overflow-hidden">
        {steps.map((step, i) => (
          <div
            key={i}
            className="p-5 md:p-6 border-b border-r border-border-primary last:border-r-0 md:last:border-r-0 [&:nth-child(2)]:border-r-0 md:[&:nth-child(2)]:border-r [&:nth-child(3)]:border-b-0 md:[&:nth-child(3)]:border-b-0 [&:nth-child(4)]:border-b-0 [&:nth-child(4)]:border-r-0 md:border-b-0"
          >
            <div className="font-heading text-[12px] font-bold text-text-light mb-3">{step.num}</div>
            <div className="w-10 h-10 bg-[#EEF3FF] rounded-[10px] flex items-center justify-center mb-3.5">
              <step.icon className="w-6 h-6 text-[#0055FF]" />
            </div>
            <div className="font-heading text-[14px] font-bold text-foreground mb-1.5">{step.title}</div>
            <div className="text-[12px] text-text-muted leading-[1.6]">{step.desc}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
