'use client';

import { useState, useEffect } from 'react';
import { X, ChevronRight, Zap } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function FlashOfferPopup() {
  const [show, setShow] = useState(false);
  const [offer, setOffer] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const pathname = usePathname();

  useEffect(() => {
    const fetchOffer = async () => {
      try {
        const res = await fetch('/api/public/active-offer');
        const data = await res.json();
        if (data.offer) {
          setOffer(data.offer);
        }
      } catch (err) {}
    };
    fetchOffer();
  }, []);

  useEffect(() => {
    // Show after a small delay for better user experience
    const timer = setTimeout(() => {
      if (!sessionStorage.getItem('flash_offer_dismissed')) {
        setShow(true);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!offer?.show_countdown || !offer?.end_date) return;

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
  }, [offer]);

  const dismiss = () => {
    sessionStorage.setItem('flash_offer_dismissed', '1');
    setShow(false);
  };

  const isHiddenRoute = pathname?.startsWith('/admin') || pathname?.startsWith('/dashboard');

  if (!show || isHiddenRoute) return null;

  const hasCountdown = offer?.show_countdown && offer?.end_date;
  const isExpired = hasCountdown && timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0;

  if (hasCountdown && isExpired) return null; // Don't show if countdown has expired

  return (
    <div
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 z-[100] max-w-[320px]"
      style={{
        animation: 'slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards'
      }}
    >
      <div className="relative overflow-hidden bg-[#111110] border border-white/10 rounded-2xl shadow-2xl p-4 group">

        {/* Subtle background glow */}
        <div className="absolute -inset-2 bg-gradient-to-r from-blue-600/10 to-purple-600/10 blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-500" />

        <button
          onClick={dismiss}
          className="absolute right-2.5 top-2.5 text-white/40 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-full p-1 z-20"
          aria-label="Dismiss offer"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <div className="relative z-10 flex flex-col gap-2.5">
          <div className="flex items-center gap-1.5 text-[#EF9F27] font-bold text-xs uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>Limited Time Offer</span>
          </div>

          <h3 className="text-white font-bold text-[15px] leading-tight pr-4">
            {offer?.name || "Get up to 60% OFF across our digital product collection"}
          </h3>

          <p className="text-white/60 text-[13px] leading-snug line-clamp-2">
            {(offer?.description || "Explore practical AI tools and ready-to-use systems to grow your business.").replace('₹60', '60%')}
          </p>

          {hasCountdown && (
            <div className="flex gap-1.5 justify-between mt-0.5 mb-0.5">
              <div className="flex-1 bg-white/5 rounded-lg py-1.5 flex flex-col items-center justify-center border border-white/5">
                <div className="text-sm font-bold text-white leading-none">{timeLeft.days}</div>
                <div className="text-[8px] text-white/40 uppercase font-bold mt-1 tracking-wider">Days</div>
              </div>
              <div className="flex-1 bg-white/5 rounded-lg py-1.5 flex flex-col items-center justify-center border border-white/5">
                <div className="text-sm font-bold text-white leading-none">{timeLeft.hours}</div>
                <div className="text-[8px] text-white/40 uppercase font-bold mt-1 tracking-wider">Hours</div>
              </div>
              <div className="flex-1 bg-white/5 rounded-lg py-1.5 flex flex-col items-center justify-center border border-white/5">
                <div className="text-sm font-bold text-white leading-none">{timeLeft.minutes}</div>
                <div className="text-[8px] text-white/40 uppercase font-bold mt-1 tracking-wider">Mins</div>
              </div>
              <div className="flex-1 bg-white/5 rounded-lg py-1.5 flex flex-col items-center justify-center border border-white/5">
                <div className="text-sm font-bold text-white leading-none">{timeLeft.seconds}</div>
                <div className="text-[8px] text-white/40 uppercase font-bold mt-1 tracking-wider">Secs</div>
              </div>
            </div>
          )}

          <Link
            href="/offers"
            onClick={() => setShow(false)}
            className="mt-1 flex items-center justify-center gap-1.5 w-full bg-white text-black hover:bg-gray-100 py-2 rounded-xl text-[13px] font-bold transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] active:scale-[0.98]"
          >
            Claim Your Offer
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes slideUpFade {
          0% { opacity: 0; transform: translateY(20px) scale(0.95); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}} />
    </div>
  );
}
