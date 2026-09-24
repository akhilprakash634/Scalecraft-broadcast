'use client';

import { usePathname } from 'next/navigation';
import { Sparkles } from 'lucide-react';

export default function HonestBanner() {
  const pathname = usePathname();

  // Hide the banner on the scalecraft-agent page, dashboard, and admin pages since they use custom themes
  if (
    pathname?.startsWith('/products/scalecraft-agent') ||
    pathname?.startsWith('/dashboard') ||
    pathname?.startsWith('/admin')
  ) {
    return null;
  }

  return (
    <div className="bg-[#111110] text-[rgba(255,255,255,0.7)] py-[11px] px-10 text-[13px] text-center flex items-center justify-center gap-2">
      <Sparkles size={14} className="text-amber-400 shrink-0 animate-pulse" />
      <span>
        We&apos;re new here. ScaleCraft is built on 5 years of real IT and business experience - no inflated numbers, no fake reviews. &middot; Be one of our first customers and get direct founder support.
      </span>
    </div>
  );
}
