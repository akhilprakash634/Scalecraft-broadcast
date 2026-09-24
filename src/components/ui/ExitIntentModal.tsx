'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Mail, Gift, ArrowRight, Loader2 } from 'lucide-react';

export default function ExitIntentModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 1. Check if dismissed or already converted
    const isDismissed = localStorage.getItem('scalecraft_exit_intent_closed') === 'true';
    if (isDismissed) return;

    // 2. Desktop Exit Intent (Mouseleave top of screen)
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY < 20) {
        setIsOpen(true);
        // Remove listener after first trigger
        document.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
    document.addEventListener('mouseleave', handleMouseLeave);

    // 3. Mobile Dwell/Scroll Exit Intent (representing 80-90% traffic)
    // Trigger on scroll past 65% or 45 seconds of continuous browsing
    let timeTrigger: NodeJS.Timeout;
    
    const triggerIntent = () => {
      setIsOpen(true);
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timeTrigger);
    };

    const handleScroll = () => {
      const scrollPos = window.scrollY + window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;
      if (docHeight > 0 && scrollPos / docHeight > 0.65) {
        triggerIntent();
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Set 45-second dwell trigger
    timeTrigger = setTimeout(() => {
      triggerIntent();
    }, 45000);

    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timeTrigger);
    };
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem('scalecraft_exit_intent_closed', 'true');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('loading');

    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'exit_intent' }),
      });

      if (res.ok) {
        setStatus('success');
        localStorage.setItem('scalecraft_exit_intent_closed', 'true');
        setTimeout(() => setIsOpen(false), 2000);
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-foreground/60 backdrop-blur-xs transition-all animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-title"
    >
      <div 
        ref={modalRef}
        className="relative bg-background w-full max-w-md rounded-card-lg border border-border-dark shadow-premium p-8 md:p-10 space-y-6 overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Top Gradient Glow */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-accent to-green" />

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 hover:bg-bg-secondary rounded-xl text-text-light hover:text-text-primary transition-all min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
          aria-label="Dismiss offer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-2 text-accent">
            <Gift className="w-6 h-6" />
          </div>
          
          <h3 id="exit-title" className="font-heading text-2xl font-black tracking-tight text-text-primary">
            Wait! Before you leave...
          </h3>
          
          <p className="text-[13.5px] text-text-muted leading-relaxed max-w-xs mx-auto">
            Get our <strong className="text-text-primary">20 AI Outreach Prompts & Templates</strong> for free. Sourced from real agency workflows.
          </p>
        </div>

        {status === 'success' ? (
          <div className="bg-green-bg border border-green/20 rounded-xl p-4 text-center space-y-1">
            <p className="text-[14px] font-bold text-green">Templates sent successfully!</p>
            <p className="text-xs text-[#065F46]">Check your inbox in under 2 minutes.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light w-4.5 h-4.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="w-full bg-bg-secondary border border-border-primary rounded-xl pl-12 pr-4 py-3.5 text-[13.5px] placeholder:text-text-light text-text-primary focus:outline-none focus:bg-background focus:border-accent/40 focus:ring-1 focus:ring-accent/40 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full bg-accent text-white py-3.5 rounded-xl font-bold text-[14px] hover:bg-blue-700 hover:scale-[1.01] transition-all flex items-center justify-center gap-2 disabled:opacity-50 group cursor-pointer"
            >
              {status === 'loading' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Get Free Access
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
            {status === 'error' && (
              <p className="text-xs text-red-500 text-center font-bold">Something went wrong. Please try again.</p>
            )}
            <p className="text-[10px] text-text-light text-center leading-normal">
              No spam. Unsubscribe with 1-click at any time.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
