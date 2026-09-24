'use client';

import { useState } from 'react';
import { config, waLink } from '@/lib/config';

export default function Newsletter() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      if (res.ok) {
        setStatus('success');
        setEmail('');
      } else {
        setStatus('error');
      }
    } catch (err) {
      setStatus('error');
    }
  };

  return (
    <section className="px-6 md:px-10 pb-14 md:pb-[72px] max-w-[1100px] mx-auto" id="newsletter">
      <div className="bg-bg-secondary border border-border-primary rounded-card-lg p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-12">
        <div>
          <div className="text-[11px] font-bold text-text-light tracking-[0.1em] uppercase mb-2.5">Newsletter</div>
          <h2 className="font-heading text-[28px] font-black tracking-[-0.8px] text-foreground mb-2">
            The ScaleCraft <em className="italic-accent">Weekly.</em>
          </h2>
          <p className="text-[14px] text-text-muted leading-[1.7] max-w-[360px]">
            One actionable insight every Thursday - outreach tips, AI tools, pricing advice. Written by Akhil from real experience. Always free.
          </p>
        </div>
        
        <div className="flex flex-col gap-3 min-w-full md:min-w-[280px]">
          <form onSubmit={handleEmailSubmit} className="flex flex-col gap-2 w-full">
            <input 
              type="email" 
              placeholder="Your email address"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="px-3.5 py-2.75 rounded-button border border-border-dark bg-white text-[13px] font-body text-foreground outline-none focus:border-accent transition-colors placeholder:text-text-light"
            />
            <button 
              type="submit"
              disabled={status === 'loading'}
              className="py-2.75 bg-foreground text-white border-none rounded-button text-[13px] font-semibold cursor-pointer font-body hover:bg-accent transition-colors disabled:opacity-50"
            >
              {status === 'loading' ? 'Subscribing...' : 'Subscribe via email'}
            </button>
          </form>
          {status === 'success' && <p className="text-[11px] text-green text-center font-medium">Thanks for subscribing!</p>}
          {status === 'error' && <p className="text-[11px] text-red-500 text-center font-medium">Something went wrong.</p>}
          <p className="text-[11px] text-text-light text-center leading-normal">
            No spam. Unsubscribe anytime. Or{' '}
            <a 
              href={waLink(config.whatsapp.messages.newsletter)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline font-semibold"
            >
              subscribe on WhatsApp →
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
