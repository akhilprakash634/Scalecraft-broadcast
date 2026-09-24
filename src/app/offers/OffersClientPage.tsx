'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getFormattedPrice, GeoPaymentState } from '@/lib/pricing';

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  thumbnail_url: string;
  price: number;
  originalPrice: number;
  original_price?: number;
  international_price?: number;
  international_actual_price?: number;
  features: string[];
  product_type: string;
}

interface Offer {
  id: string;
  name: string;
  banner_url: string;
  description: string;
  coupon_code: string;
  discount_value: number;
  end_date: string;
  show_countdown: boolean;
}

export default function OffersClientPage({ offer, products }: { offer: Offer; products: Product[] }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [copied, setCopied] = useState(false);
  const [geoPayment, setGeoPayment] = useState<GeoPaymentState>({
    isIndia: true,
    currency: 'INR',
    symbol: '₹',
    loading: true,
  });

  useEffect(() => {
    const detectGeo = async () => {
      try {
        const urlGeo = new URLSearchParams(window.location.search).get('geo');
        const countryCode =
          urlGeo?.toUpperCase() ||
          (await fetch('/api/geo', { signal: AbortSignal.timeout(4000) })
            .then((r) => r.json())
            .then((d) => d.country_code));
        const isIndia = countryCode === 'IN';
        setGeoPayment({ isIndia, currency: isIndia ? 'INR' : 'USD', symbol: isIndia ? '₹' : '$', loading: false });
      } catch {
        setGeoPayment({ isIndia: true, currency: 'INR', symbol: '₹', loading: false });
      }
    };
    detectGeo();
  }, []);

  useEffect(() => {
    if (!offer.show_countdown || !offer.end_date) return;

    const calculateTimeLeft = () => {
      const difference = +new Date(offer.end_date) - +new Date();
      let remaining = { days: 0, hours: 0, minutes: 0, seconds: 0 };

      if (difference > 0) {
        remaining = {
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        };
      }
      return remaining;
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [offer.end_date, offer.show_countdown]);

  const handleCopyCode = () => {
    if (!offer.coupon_code) return;
    navigator.clipboard.writeText(offer.coupon_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const discountFormatted = offer.discount_value < 0 
    ? `${Math.abs(offer.discount_value)}%` 
    : `${geoPayment.symbol}${offer.discount_value}`;

  return (
    <main className="min-h-screen bg-[#FDFEFC] py-20 px-6 max-w-[1100px] mx-auto text-xs font-semibold text-gray-800">
      
      {/* Banner / Hero Section */}
      <div className="relative rounded-3xl overflow-hidden border border-neutral-200 shadow-sm bg-neutral-900 text-white min-h-[340px] flex flex-col justify-center p-8 md:p-12 mb-12">
        {offer.banner_url && (
          <div className="absolute inset-0 z-0">
            <img
              src={offer.banner_url}
              alt={offer.name}
              className="w-full h-full object-cover opacity-30"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-900/80 to-transparent" />
          </div>
        )}

        <div className="relative z-10 space-y-4 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 bg-orange-650 text-white text-[10px] font-black uppercase px-3 py-1 rounded-full">
            Limited Time Campaign
          </span>
          <h1 className="font-heading text-3xl md:text-5xl font-black tracking-tight leading-tight uppercase">
            {offer.name}
          </h1>
          <p className="text-sm md:text-base text-neutral-300 leading-relaxed font-medium">
            {offer.description || 'Exclusive discounts on ScaleCraft software products, Notion operating workspace setups, and lead generation packages.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-8 items-start mb-16">
        {/* Coupon Card */}
        <div className="bg-white border border-neutral-200 rounded-3xl p-6 md:p-8 shadow-xs flex flex-col justify-between h-full space-y-6">
          <div className="space-y-2">
            <span className="text-[10px] text-neutral-400 font-black uppercase">Promotion Discount Code</span>
            <h2 className="text-xl font-black text-neutral-900 leading-tight">Apply coupon code during checkout to save instantly</h2>
          </div>

          {offer.coupon_code ? (
            <div className="flex flex-col sm:flex-row items-stretch gap-3">
              <div className="flex-1 bg-neutral-50 border border-dashed border-neutral-350 rounded-2xl px-5 py-4 flex items-center justify-between font-mono text-base font-extrabold text-neutral-900 tracking-wider">
                <span>{offer.coupon_code}</span>
                <span className="text-[10px] text-orange-600 bg-orange-50 font-sans px-2 py-0.5 rounded font-black">
                  {discountFormatted} OFF
                </span>
              </div>
              <button
                onClick={handleCopyCode}
                className="bg-black hover:bg-neutral-800 text-white font-bold text-xs px-6 py-4 rounded-2xl transition-colors cursor-pointer shrink-0"
              >
                {copied ? 'Copied!' : 'Copy Discount Code'}
              </button>
            </div>
          ) : (
            <div className="bg-orange-50 text-orange-850 p-4 rounded-xl border border-orange-100 text-xs">
              Discount automatically applied at checkout! No coupon code required.
            </div>
          )}
        </div>

        {/* Countdown Timer */}
        {offer.show_countdown && (
          <div className="bg-white border border-neutral-200 rounded-3xl p-6 md:p-8 shadow-xs flex flex-col justify-between h-full space-y-6 text-center">
            <span className="text-[10px] text-orange-650 font-black uppercase tracking-wider">Campaign Ending In</span>
            
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-neutral-50 rounded-2xl py-3 border border-neutral-100">
                <div className="text-2xl font-black text-neutral-900">{timeLeft.days}</div>
                <div className="text-[9px] text-neutral-400 font-bold uppercase mt-0.5">Days</div>
              </div>
              <div className="bg-neutral-50 rounded-2xl py-3 border border-neutral-100">
                <div className="text-2xl font-black text-neutral-900">{timeLeft.hours}</div>
                <div className="text-[9px] text-neutral-400 font-bold uppercase mt-0.5">Hours</div>
              </div>
              <div className="bg-neutral-50 rounded-2xl py-3 border border-neutral-100">
                <div className="text-2xl font-black text-neutral-900">{timeLeft.minutes}</div>
                <div className="text-[9px] text-neutral-400 font-bold uppercase mt-0.5">Mins</div>
              </div>
              <div className="bg-neutral-50 rounded-2xl py-3 border border-neutral-100">
                <div className="text-2xl font-black text-neutral-900">{timeLeft.seconds}</div>
                <div className="text-[9px] text-neutral-400 font-bold uppercase mt-0.5">Secs</div>
              </div>
            </div>
            
            <span className="text-[10px] text-neutral-400 font-bold">
              Offer expires on {new Date(offer.end_date).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>

      {/* Included Products Section */}
      <div className="space-y-6">
        <h2 className="text-lg font-black text-neutral-900 uppercase tracking-tight">Included Products</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map(p => {
            const formatted = getFormattedPrice(p, geoPayment);
            return (
              <Link
                key={p.id}
                href={`/products/${p.slug}`}
                className="bg-white border border-neutral-200 hover:border-neutral-400 rounded-2xl overflow-hidden shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
              >
                <div className="p-5 space-y-4">
                  {p.thumbnail_url && (
                    <div className="h-40 rounded-xl overflow-hidden border border-neutral-100 relative">
                      <img src={p.thumbnail_url} alt={p.name} className="w-full h-full object-cover" />
                    </div>
                  )}

                  <div className="space-y-1">
                    <span className="text-[8px] font-black uppercase text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                      {p.product_type}
                    </span>
                    <h3 className="text-[13px] font-black text-neutral-900 leading-snug">{p.name}</h3>
                  </div>

                  <p className="text-[11px] text-neutral-500 leading-relaxed font-medium line-clamp-3">
                    {p.description}
                  </p>
                </div>

                <div className="bg-neutral-50 px-5 py-3 border-t border-neutral-200 flex justify-between items-center">
                  <div className="flex items-center gap-1 font-black text-neutral-900">
                    <span>{formatted.formattedPrice}</span>
                    {formatted.hasDiscount && (
                      <span className="text-[10px] text-neutral-400 line-through font-normal ml-1">
                        {formatted.formattedOriginalPrice}
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded">
                    Offer Active
                  </span>
                </div>
              </Link>
            );
          })}
          
          {products.length === 0 && (
            <div className="col-span-3 text-center text-neutral-400 italic py-10 bg-white rounded-2xl border border-neutral-200">
              No products mapped to this offer campaign currently.
            </div>
          )}
        </div>
      </div>

    </main>
  );
}
