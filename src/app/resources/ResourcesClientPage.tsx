'use client';

import Link from 'next/link';
import { FileText, Bot, ArrowRight, Calculator, Sparkles } from 'lucide-react';
import { RESOURCE_CATEGORIES } from '@/lib/content';

const iconMap: Record<string, any> = {
  Calculator: Calculator,
  FileText: FileText,
  Bot: Bot,
  Sparkles: Sparkles,
};

export default function ResourcesClientPage() {
  return (
    <div className="min-h-screen py-20 px-6 md:px-10 max-w-[1100px] mx-auto space-y-16">
      
      {/* Title */}
      <div className="text-center space-y-4 max-w-xl mx-auto">
        <span className="text-[11px] font-bold text-accent tracking-[0.15em] uppercase block">
          VALUE CENTER
        </span>
        <h1 className="font-heading text-clamp-h2 font-black leading-tight text-text-primary">
          ScaleCraft Free Resources Hub
        </h1>
        <p className="text-[14.5px] text-text-muted leading-relaxed">
          Access free client acquisition calculators, copy-paste prompts, operating checklists, and release timelines to grow your freelance business.
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {RESOURCE_CATEGORIES.map((cat, idx) => {
          const IconComponent = iconMap[cat.iconName] || FileText;
          return (
            <div key={idx} className="bg-bg-secondary border border-border-primary rounded-card p-6 md:p-8 space-y-5">
              <div className="flex items-center gap-3 pb-3 border-b border-border-primary/60">
                <div className="w-9 h-9 bg-accent/5 rounded-xl flex items-center justify-center text-accent">
                  <IconComponent className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="font-heading text-[15.5px] font-black text-text-primary">
                    {cat.title}
                  </h3>
                  <p className="text-[11px] text-text-light">{cat.description}</p>
                </div>
              </div>

              <div className="space-y-3.5">
                {cat.items.map((item, itemIdx) => (
                  <Link 
                    key={itemIdx} 
                    href={item.url} 
                    className="block p-3 bg-white border border-border-primary hover:border-border-dark rounded-xl transition-all group text-left"
                  >
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-[13px] font-bold text-text-primary group-hover:text-accent transition-colors truncate">
                        {item.name}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-text-light group-hover:text-accent group-hover:translate-x-0.5 transition-all shrink-0" />
                    </div>
                    <p className="text-[11.5px] text-text-muted mt-1 leading-normal">
                      {item.desc}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Premium bundle callout */}
      <div className="border border-border-primary rounded-[24px] p-8 bg-[#09090B] text-[#FFFFFF] flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-accent/15 rounded-full blur-[80px] -z-0" />
        
        <div className="space-y-2 z-10 text-left">
          <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#9FE1CB] bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
            CONSOLIDATED CLIENT SYSTEMS
          </span>
          <h3 className="font-heading text-lg font-black text-white leading-tight mt-2">
            Ready to integrate the complete workspace?
          </h3>
          <p className="text-xs text-white/50 max-w-sm leading-relaxed">
            Get the full combo bundle containing the Notion pipeline CRM databases, 50+ outreach templates, and all upcoming tools.
          </p>
        </div>

        <div className="shrink-0 z-10">
          <Link 
            href="/products/ai-systems-combo"
            className="inline-flex items-center justify-center bg-white text-[#09090B] hover:bg-accent hover:text-white px-5 py-3.5 rounded-xl text-xs font-bold transition-all"
          >
            Get Combo Access &rarr;
          </Link>
        </div>
      </div>

    </div>
  );
}
