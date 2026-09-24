'use client';

import { Search, Filter, Send, Clock, Layers } from 'lucide-react';

export default function WhyScaleCraft() {
  const problems = [
    {
      icon: Search,
      title: '1. Find Customers',
      desc: 'Get lists of qualified businesses in your industry. Find potential customers without spending hours searching manually.'
    },
    {
      icon: Layers,
      title: '2. Organize Work',
      desc: 'Keep all your client contacts and active deals in one organized database.'
    },
    {
      icon: Clock,
      title: '3. Automate Tasks',
      desc: 'Deploy AI assistants to handle support and sales questions around the clock.'
    },
    {
      icon: Filter,
      title: '4. Manage Leads',
      desc: 'Track deals from the first hello to the signed contract in a visual pipeline.'
    },
    {
      icon: Send,
      title: '5. Close More Deals',
      desc: 'Use pre-written proposal templates and scripts that turn conversations into paid clients.'
    }
  ];

  return (
    <section className="px-6 md:px-10 py-12 md:py-16 max-w-[1100px] mx-auto border-t border-border-primary" id="why-scalecraft">
      <div className="max-w-[720px] mb-12">
        <span className="text-[11px] font-bold text-accent tracking-[0.15em] uppercase mb-2.5 block">
          WHAT IS SCALECRAFT
        </span>
        <h2 className="font-heading text-clamp-h2 font-black leading-tight text-text-primary mb-5">
          AI tools and business systems built to help you scale.
        </h2>
        <p className="text-[15px] text-text-muted leading-relaxed">
          ScaleCraft helps your business grow by automating daily tasks. We build practical AI tools to handle your repetitive work. Focus on scaling your operations while our systems organize your sales.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {problems.map((prob, i) => (
          <div 
            key={i} 
            className="bg-bg-secondary border border-border-primary hover:border-border-dark rounded-card p-5 flex flex-col justify-between transition-all"
          >
            <div>
              <div className="w-9 h-9 bg-accent/5 border border-accent/10 rounded-xl flex items-center justify-center text-accent mb-4 shrink-0">
                <prob.icon className="w-4.5 h-4.5" />
              </div>
              <h3 className="font-heading text-[14.5px] font-extrabold text-text-primary mb-1.5 leading-tight">
                {prob.title}
              </h3>
              <p className="text-[12px] text-text-muted leading-relaxed">
                {prob.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 bg-[#181815] text-[#FAF9F6] border border-white/5 rounded-card p-6 md:p-8 text-center max-w-[850px] mx-auto">
        <p className="text-[14px] font-semibold leading-relaxed text-[#FAF9F6]">
          Start with the product you need today. Add more tools as your business grows.
        </p>
      </div>
    </section>
  );
}
