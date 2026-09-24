'use client';

import { Search, Filter, Layers, Send, CheckCircle, RefreshCw } from 'lucide-react';
import { LOCAL_PRODUCTS } from '@/lib/content';

interface HowYouGoLeadsToClientsProps {
  liveProducts?: any[];
}

export default function HowYouGoLeadsToClients({ liveProducts }: HowYouGoLeadsToClientsProps) {
  const getProductName = (slug: string, fallback: string) => {
    const dbP = liveProducts?.find((p) => p.slug === slug || p.slug?.current === slug);
    if (dbP?.name) {
      return typeof dbP.name === 'string' ? dbP.name : dbP.name.en || fallback;
    }
    const localP = LOCAL_PRODUCTS[slug];
    if (localP?.name) {
      return typeof localP.name === 'string' ? localP.name : localP.name.en || fallback;
    }
    return fallback;
  };

  const lfName = getProductName('ai-lead-finder-system', 'AI Lead Finder');
  const bpName = getProductName('freelance-client-pipeline-blueprint', 'Client Blueprint');
  const comboName = getProductName('ai-systems-combo', 'Systems Combo');

  const steps = [
    {
      icon: Search,
      title: '1. Find Leads',
      desc: 'Scan directories to receive verified company lists so you always have fresh leads to pitch.'
    },
    {
      icon: Filter,
      title: '2. Qualify',
      desc: 'Filter leads by revenue and find the decision-maker\'s contact details to avoid wasting time.'
    },
    {
      icon: Layers,
      title: '3. Save Contacts',
      desc: 'Import contacts into your CRM dashboard to track every conversation without losing deals.'
    },
    {
      icon: Send,
      title: '4. Send Messages',
      desc: 'Send pre-written outreach templates to start conversations with prospects who want your help.'
    },
    {
      icon: CheckCircle,
      title: '5. Send Proposals',
      desc: 'Deliver professional proposal agreements that outline scope and get signed quickly.'
    },
    {
      icon: RefreshCw,
      title: '6. Repeat',
      desc: 'Follow the checklist daily to keep new client opportunities flowing into your business.'
    }
  ];

  return (
    <section className="px-6 md:px-10 py-12 md:py-16 max-w-[1100px] mx-auto border-t border-border-primary" id="workflow">
      <div className="max-w-[620px] mb-12">
        <span className="text-[11px] font-bold text-accent tracking-[0.15em] uppercase mb-2.5 block">
          THE WORKFLOW
        </span>
        <h2 className="font-heading text-clamp-h2 font-black leading-tight text-text-primary mb-4">
          How our systems automate your pipeline.
        </h2>
        <p className="text-[15px] text-text-muted leading-relaxed">
          We don't sell courses. We give you a step-by-step process to find, pitch, and organize your clients without the headache.
        </p>
      </div>

      {/* Horizontal workflow on large viewports, vertical on mobile */}
      <div className="relative border-l-2 md:border-l-0 md:border-t-2 border-border-primary/80 ml-4 md:ml-0 pl-6 md:pl-0 pt-0 md:pt-8 grid grid-cols-1 md:grid-cols-6 gap-6 md:gap-4">
        
        {/* Workflow cards */}
        {steps.map((step, idx) => (
          <div key={idx} className="relative space-y-3">
            {/* Circle node indicator */}
            <div className="absolute -left-[35px] md:-left-1.5 -top-1 md:-top-[43px] w-5 h-5 rounded-full bg-white border-2 border-accent flex items-center justify-center z-10">
              <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
            </div>
            
            {/* Step Icon */}
            <div className="w-8 h-8 bg-bg-secondary border border-border-primary rounded-lg flex items-center justify-center text-text-muted">
              <step.icon className="w-4 h-4" />
            </div>
            
            {/* Title & Desc */}
            <div className="space-y-1">
              <h4 className="font-heading text-[13.5px] font-extrabold text-text-primary leading-tight">
                {step.title}
              </h4>
              <p className="text-[11.5px] text-text-muted leading-relaxed">
                {step.desc}
              </p>
            </div>
          </div>
        ))}

      </div>

      {/* Product Coverage Explanation */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="bg-bg-secondary border border-border-primary rounded-xl p-5">
          <div className="text-accent font-black uppercase tracking-wider mb-2">Stage 1-2: Lead Sourcing Systems</div>
          <p className="text-text-muted leading-relaxed">
            Find qualified business leads in your target market and get direct contact details.
          </p>
        </div>
        <div className="bg-bg-secondary border border-border-primary rounded-xl p-5">
          <div className="text-accent font-black uppercase tracking-wider mb-2">Stage 3-5: Customer Management Systems</div>
          <p className="text-text-muted leading-relaxed">
            Track conversations, follow up automatically, and send professional proposals to close deals.
          </p>
        </div>
        <div className="bg-bg-secondary border border-border-primary rounded-xl p-5">
          <div className="text-green font-black uppercase tracking-wider mb-2">Full Loop: Complete Business System</div>
          <p className="text-text-muted leading-relaxed">
            Connect sourcing and tracking in one visual dashboard to run your sales workflow.
          </p>
        </div>
      </div>
    </section>
  );
}
