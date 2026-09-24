'use client';

import { useState, useEffect } from 'react';
import { getFormattedPrice, GeoPaymentState } from '@/lib/pricing';
import { LOCAL_PRODUCTS } from '@/lib/content';

interface StatsRowProps {
  liveProducts?: any[];
  geoPayment?: GeoPaymentState;
}

export default function StatsRow({ liveProducts, geoPayment: externalGeo }: StatsRowProps) {
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

  const stats = [
    { n: '7 days', l: 'To first client result' },
    { n: '50+', l: 'Outreach scripts included' },
    { n: startingPrice, l: 'Starting price' },
    { n: 'Instant', l: 'Notion delivery' },
  ];

  return (
    <div className="border-y border-border-primary">
      <div className="grid grid-cols-2 md:grid-cols-4 max-w-[1100px] mx-auto px-6 md:px-0">
        {stats.map((stat, i) => (
          <div key={i} className="px-4 md:px-10 py-7 border-r border-border-primary last:border-r-0 odd:border-r md:odd:border-r">
            <div className="font-heading text-[22px] md:text-[28px] font-black tracking-[-0.8px] text-foreground">{stat.n}</div>
            <div className="text-[12px] text-text-muted mt-1">{stat.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
