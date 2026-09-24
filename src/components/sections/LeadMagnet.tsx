'use client';

import { useState } from 'react';
import { Mail, Gift, ArrowRight, Loader2 } from 'lucide-react';

export default function LeadMagnet() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('loading');

    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'lead_magnet_inline' }),
      });

      if (res.ok) {
        setStatus('success');
        setEmail('');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  return (
    <section className="px-6 md:px-10 py-12 md:py-16 max-w-[1100px] mx-auto" id="lead-magnet">
      <div className="bg-bg-secondary border border-border-primary rounded-[24px] p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
        
        {/* Decorative Blur */}
        <div className="absolute top-0 right-0 w-44 h-44 bg-accent/5 rounded-full blur-[50px] -z-0"></div>

        <div className="space-y-3 z-10 max-w-lg">
          <span className="inline-flex items-center gap-1.5 bg-accent/10 text-accent text-[10.5px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
            <Gift className="w-3.5 h-3.5" />
            <span>Free Resources</span>
          </span>
          <h2 className="font-heading text-[24px] md:text-[28px] font-black tracking-tight text-text-primary leading-tight">
            Get 20 AI Outreach Prompts <em className="italic-accent">for free.</em>
          </h2>
          <p className="text-[14px] text-text-muted leading-relaxed max-w-md">
            Cut down copy-pasting. Receive our curated package of warm openers, breakup scripts, and agency proposals in your inbox. Sourced directly from active campaign runs.
          </p>
        </div>

        <div className="w-full md:w-auto min-w-[280px] lg:min-w-[340px] z-10 space-y-3">
          {status === 'success' ? (
            <div className="bg-green-bg border border-green/20 rounded-xl p-5 text-center space-y-1">
              <p className="text-[14px] font-bold text-green">Sent successfully!</p>
              <p className="text-xs text-[#065F46]">We sent the prompt pack link to your email.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light w-4.5 h-4.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your primary email address"
                  className="w-full bg-white border border-border-primary rounded-xl pl-12 pr-4 py-3.5 text-xs text-text-primary focus:outline-none focus:border-accent"
                />
              </div>
              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full bg-foreground text-white py-3.5 rounded-xl font-bold text-xs hover:bg-accent transition-all flex items-center justify-center gap-2 disabled:opacity-50 group cursor-pointer"
              >
                {status === 'loading' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Send Me the Free Prompts
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </form>
          )}
          {status === 'error' && (
            <p className="text-xs text-red-500 text-center font-bold">Something went wrong. Please try again.</p>
          )}
          <p className="text-[10px] text-text-light text-center">
            Zero spam. Unsubscribe with 1-click anytime.
          </p>
        </div>

      </div>
    </section>
  );
}
