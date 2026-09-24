'use client';

import { MessageSquare, ShieldCheck, RefreshCw, UserCheck, Globe } from 'lucide-react';
import { waLink } from '@/lib/config';
import { FOUNDER } from '@/lib/content';

const Linkedin = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const Github = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

export default function FounderSection() {
  const trustPoints = [
    { icon: UserCheck, text: 'Active DevOps Engineer', sub: 'Systems built by a programmer who scales operations daily.' },
    { icon: ShieldCheck, text: 'Practical, Not Theory', sub: 'Every script and sheet is used in real workflows to sign clients.' },
    { icon: RefreshCw, text: 'Active Maintenance', sub: 'Regular updates included. Public roadmap available.' }
  ];

  return (
    <section className="px-6 md:px-10 py-12 md:py-16 bg-bg-secondary border-y border-border-primary/60" id="founder">
      <div className="max-w-[1100px] mx-auto grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-16 items-center">
        
        {/* Biography Column */}
        <div className="space-y-6">
          <span className="text-[11px] font-bold text-accent tracking-[0.15em] uppercase block">
            MEET THE BUILDER
          </span>
          
          <h2 className="font-heading text-clamp-h2 font-black leading-tight text-text-primary">
            Hi, I&apos;m {FOUNDER.name}.
          </h2>

          <div className="space-y-4 text-[14.5px] text-text-muted leading-relaxed">
            <p>
              {FOUNDER.bio.long}
            </p>
            <p className="font-medium text-text-primary italic border-l-2 border-accent pl-4">
              &ldquo;{FOUNDER.bio.quote}&rdquo;
            </p>
          </div>

          <div className="flex flex-wrap gap-3 pt-4">
            <a 
              href={FOUNDER.links.portfolio} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center gap-2 bg-white hover:bg-bg-secondary border border-border-dark px-4 py-2 rounded-xl text-xs font-bold text-text-primary transition-all"
            >
              <Globe className="w-4 h-4 text-accent" />
              <span>Personal Portfolio</span>
            </a>
            <a 
              href={FOUNDER.links.linkedin} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center gap-2 bg-white hover:bg-bg-secondary border border-border-dark px-4 py-2 rounded-xl text-xs font-bold text-text-primary transition-all"
            >
              <Linkedin className="w-4 h-4 text-[#0A66C2]" />
              <span>LinkedIn Profile</span>
            </a>
            <a 
              href={FOUNDER.links.github} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center gap-2 bg-white hover:bg-bg-secondary border border-border-dark px-4 py-2 rounded-xl text-xs font-bold text-text-primary transition-all"
            >
              <Github className="w-4 h-4 text-text-primary" />
              <span>GitHub Projects</span>
            </a>
          </div>
        </div>

        {/* Trust Card Column */}
        <div className="bg-white border border-border-primary rounded-[24px] p-6 md:p-8 shadow-card space-y-6">
          <h3 className="font-heading text-lg font-black text-text-primary">Why trust ScaleCraft?</h3>
          
          <div className="space-y-5">
            {trustPoints.map((point, i) => {
              const Icon = point.icon;
              return (
                <div key={i} className="flex gap-4">
                  <div className="w-8 h-8 rounded-xl bg-accent/5 flex items-center justify-center text-accent shrink-0 mt-0.5">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-[13px] font-bold text-text-primary leading-none">{point.text}</h4>
                    <p className="text-[12px] text-text-muted mt-1 leading-relaxed">{point.sub}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-6 border-t border-border-primary/80 flex flex-col gap-3">
            <a
              href={waLink("Hi Akhil, I have a question about ScaleCraft before buying")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-accent text-white px-5 py-3 rounded-xl text-xs font-bold hover:bg-blue-700 transition-all text-center"
            >
              <MessageSquare className="w-4.5 h-4.5" />
              <span>Chat directly on WhatsApp</span>
            </a>
            <p className="text-[11px] text-text-light text-center">
              Direct line to founder &middot; No support ticket systems
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}
