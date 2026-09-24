'use client';

import { Star } from 'lucide-react';
import Link from 'next/link';

export default function FinalCTA({ liveProducts = [] }: { liveProducts?: any[] }) {
  // Filter products that have primary_cta defined
  const ctaProducts = liveProducts.filter(p => p.primaryCta || p.primary_cta || p.primaryCtaText);

  return (
    <section className="px-6 md:px-10 py-12 md:py-16 max-w-[1100px] mx-auto text-center" id="final-cta">
      <div className="bg-[#09090B] rounded-[24px] p-8 md:p-14 text-white space-y-8 relative overflow-hidden shadow-premium">
        
        {/* Decorative Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:24px_24px] -z-0" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-accent/10 rounded-full blur-[80px] -z-0" />

        <div className="space-y-4 max-w-xl mx-auto z-10 relative">
          <div className="flex items-center justify-center gap-1.5 text-[#EF9F27] text-xs">
            <Star className="w-3.5 h-3.5 fill-[#EF9F27]" />
            <Star className="w-3.5 h-3.5 fill-[#EF9F27]" />
            <Star className="w-3.5 h-3.5 fill-[#EF9F27]" />
            <Star className="w-3.5 h-3.5 fill-[#EF9F27]" />
            <Star className="w-3.5 h-3.5 fill-[#EF9F27]" />
            <span className="text-white font-bold ml-1">4.9/5 (120+ buyers)</span>
          </div>

          <h2 className="font-heading text-clamp-h2 font-black leading-tight text-white">
            Ready to run your business with less manual effort?
          </h2>
        </div>

        {/* Self-Identifying Action Buttons */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 w-full max-w-[900px] mx-auto z-10 relative pt-2">
          {ctaProducts.map((p) => {
            const label = p.primaryCta || p.primary_cta || p.primaryCtaText;
            const isLeadFinder = p.slug?.includes('lead-finder');
            const isBlueprint = p.slug?.includes('blueprint') || p.slug?.includes('pipeline');
            
            let colorClasses = "border-white/20 text-white hover:bg-white/5";
            if (isLeadFinder) {
              colorClasses = "border-[#10B981]/50 text-[#10B981] hover:bg-[#10B981]/5";
            } else if (isBlueprint) {
              colorClasses = "border-[#3B82F6]/50 text-[#3B82F6] hover:bg-[#3B82F6]/5";
            }

            return (
              <Link
                key={p.id || p._id || p.slug}
                href={`/products/${p.slug}`}
                className={`w-full md:w-auto px-6 py-4 rounded-xl border ${colorClasses} text-[14.5px] font-bold transition-all text-center`}
              >
                {label}
              </Link>
            );
          })}

          <Link
            href="/products"
            className="w-full md:w-auto px-6 py-4 rounded-xl bg-accent border border-accent hover:bg-blue-700 text-white text-[14.5px] font-bold transition-all text-center shadow-md"
          >
            Explore All Products
          </Link>
        </div>

      </div>
    </section>
  );
}
