'use client';

import { Star, ShieldCheck, Mail, Zap, RefreshCw } from 'lucide-react';

export default function TrustBar() {
  const highlights = [
    { icon: ShieldCheck, text: 'Secure Checkout', sub: 'Safe checkout via Razorpay & PayPal' },
    { icon: RefreshCw, text: 'Lifetime Updates', sub: 'Pay once, get future versions for free' },
    { icon: Mail, text: 'Fast Support', sub: 'Direct line via WhatsApp' },
    { icon: Zap, text: 'Continuous Updates', sub: 'Regular tool & prompt improvements' }
  ];

  return (
    <section className="bg-bg-secondary border-y border-border-primary/70 py-10 px-6 md:px-10">
      <div className="max-w-[1100px] mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
        
        {/* Social Proof Stats */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left shrink-0">
          <div className="flex items-center gap-1 text-[#EF9F27] mb-1.5">
            <Star className="w-4 h-4 fill-[#EF9F27]" />
            <Star className="w-4 h-4 fill-[#EF9F27]" />
            <Star className="w-4 h-4 fill-[#EF9F27]" />
            <Star className="w-4 h-4 fill-[#EF9F27]" />
            <Star className="w-4 h-4 fill-[#EF9F27]" />
            <span className="text-text-primary text-[13.5px] font-black ml-1">4.9/5</span>
          </div>
          <p className="text-[13px] text-text-muted leading-tight font-bold">
            Trusted by freelancers, agencies, and businesses
          </p>
          <p className="text-[11px] text-text-light font-medium mt-1">
            Built through real development and business experience
          </p>
        </div>

        {/* Vertical divider on desktop */}
        <div className="hidden md:block w-px h-12 bg-border-primary" />

        {/* Trust Badges Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 w-full md:w-auto">
          {highlights.map((item, i) => (
            <div key={i} className="flex flex-col items-center md:items-start text-center md:text-left gap-1">
              <div className="w-7 h-7 bg-background border border-border-primary rounded-lg flex items-center justify-center text-accent mb-1 shrink-0">
                <item.icon className="w-3.5 h-3.5" />
              </div>
              <div className="text-[12.5px] font-bold text-text-primary leading-tight">{item.text}</div>
              <div className="text-[11px] text-text-muted leading-tight">{item.sub}</div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
