'use client';

import { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

export default function MobileUX() {
  const [showUX, setShowUX] = useState(false);

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

  useEffect(() => {
    const handleScroll = () => {
      setShowUX(window.scrollY > 600);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!showUX) return null;

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToProducts = () => {
    const el = document.getElementById('products');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const priceLabel = geoPayment.loading 
    ? "..." 
    : (geoPayment.isIndia ? "From ₹499" : "From $6");

  return (
    <>
      {/* Scroll to Top button */}
      <button
        onClick={scrollToTop}
        className="fixed bottom-[88px] md:bottom-8 right-5 w-10 h-10 bg-foreground text-white border border-white/10 rounded-full shadow-lg flex items-center justify-center hover:bg-accent transition-all z-50"
        aria-label="Scroll to top"
      >
        <ArrowUp className="w-4 h-4" />
      </button>

      {/* Sticky Bottom CTA - Mobile Only */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 flex items-center justify-between gap-3 px-5 py-3 bg-white/95 backdrop-blur-lg border-t border-border-primary z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
        style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}
      >
        <div className="flex flex-col">
          <span className="text-[15px] font-black text-foreground leading-tight">{priceLabel}</span>
          <span className="text-[11px] text-text-muted">One-time · Instant access</span>
        </div>
        <button
          onClick={scrollToProducts}
          className="bg-foreground text-white px-5 py-2.5 rounded-[9px] text-[14px] font-bold hover:bg-accent transition-colors active:scale-[0.97] shrink-0"
        >
          Get Started →
        </button>
      </div>
    </>
  );
}
