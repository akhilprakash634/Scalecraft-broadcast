'use client';

import { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';

const LAUNCH_CONFIG = {
  enabled: false,
  totalSpots: 100,
  launchDate: '2026-06-01',
  offerText: '50% launch pricing - first 100 customers only',
  ctaText: 'Claim your spot →',
  ctaLink: '/products',
};

export default function LaunchBanner() {
  const [claimed, setClaimed] = useState(67);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if dismissed this session
    if (sessionStorage.getItem('banner_dismissed')) {
      setDismissed(true);
      return;
    }
    
    // Fetch real count from API
    const fetchCount = async () => {
      try {
        const res = await fetch('/api/public/launch-count');
        const data = await res.json();
        if (typeof data.count === 'number') setClaimed(data.count);
      } catch {}
    };
    
    fetchCount();
    // Refresh every 60 seconds
    const interval = setInterval(fetchCount, 60000);
    return () => clearInterval(interval);
  }, []);

  const dismiss = () => {
    sessionStorage.setItem('banner_dismissed', '1');
    setDismissed(true);
  };

  if (!LAUNCH_CONFIG.enabled || dismissed) 
    return null;

  const remaining = Math.max(0, LAUNCH_CONFIG.totalSpots - claimed);
  const pct = Math.min(
    (claimed / LAUNCH_CONFIG.totalSpots) * 100, 100
  );

  return (
    <div className="bg-[#111110] text-white py-2.5 px-4 text-center relative z-50">
      <div className="max-w-[1100px] mx-auto flex items-center justify-center gap-4 flex-wrap">
        <span className="text-[13px] font-medium flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#EF9F27] shrink-0" />
          <span>{LAUNCH_CONFIG.offerText}</span>
        </span>
        <div className="flex items-center gap-2">
          <div className="w-32 h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[12px] text-white/70 whitespace-nowrap">
            {remaining} of {LAUNCH_CONFIG.totalSpots} remaining
          </span>
        </div>
        <a 
          href={LAUNCH_CONFIG.ctaLink}
          className="text-[12px] font-semibold text-green underline underline-offset-2 whitespace-nowrap"
        >
          {LAUNCH_CONFIG.ctaText}
        </a>
      </div>
      <button
        onClick={dismiss}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-lg leading-none cursor-pointer"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
