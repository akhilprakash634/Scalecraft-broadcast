'use client';

import { Search, Mail, Layers, Cpu, ArrowRight } from 'lucide-react';

export default function ProductEcosystem() {
  const steps = [
    {
      icon: Search,
      title: '1. AI Lead Finder',
      desc: 'Find 50+ qualified businesses hiding in your niche every single week.',
      tag: 'Source Leads'
    },
    {
      icon: Mail,
      title: '2. Outreach Vault',
      desc: 'Engage prospects using 50+ personalized DM, email, and cold templates.',
      tag: 'Engage Leads'
    },
    {
      icon: Layers,
      title: '3. Notion Pipeline CRM',
      desc: 'Track and qualify leads from initial contact to contract sign-off.',
      tag: 'Manage Deal Flow'
    },
    {
      icon: Cpu,
      title: '4. AI Prompt Assistants',
      desc: 'Feed prompt libraries to Claude or ChatGPT to frame custom proposals.',
      tag: 'Close Deals'
    }
  ];

  return (
    <section className="px-6 md:px-10 py-16 md:py-24 max-w-[1100px] mx-auto border-t border-border-primary" id="ecosystem">
      <div className="max-w-[620px] mb-12">
        <span className="text-[11px] font-bold text-accent tracking-[0.15em] uppercase mb-2.5 block">
          THE DURABLE SYSTEM
        </span>
        <h2 className="font-heading text-clamp-h2 font-black leading-tight text-text-primary mb-4">
          The ScaleCraft <em className="italic-accent">flywheel.</em>
        </h2>
        <p className="text-[15px] text-text-muted leading-relaxed">
          ScaleCraft is not a collection of isolated spreadsheets. It is a connected ecosystem built to handle every stage of client acquisition. Sourcing fuels outreach, outreach drives deal flow, and deal flow closes retainers.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
        {steps.map((step, idx) => (
          <div key={idx} className="relative flex flex-col items-center md:items-start text-center md:text-left bg-bg-secondary border border-border-primary p-6 rounded-card space-y-4">
            {/* Step Badge */}
            <div className="text-[9px] font-extrabold uppercase tracking-wider bg-accent/10 text-accent px-2 py-0.5 rounded-full">
              {step.tag}
            </div>

            {/* Icon */}
            <div className="w-10 h-10 bg-background border border-border-primary rounded-xl flex items-center justify-center text-text-muted">
              <step.icon className="w-5 h-5" />
            </div>

            {/* Content */}
            <div className="space-y-1.5">
              <h4 className="font-heading text-[14.5px] font-bold text-text-primary">
                {step.title}
              </h4>
              <p className="text-[12.5px] text-text-muted leading-relaxed">
                {step.desc}
              </p>
            </div>

            {/* Arrow connecting on desktop */}
            {idx < 3 && (
              <div className="hidden lg:block absolute -right-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 bg-white border border-border-primary rounded-full flex items-center justify-center text-text-muted shadow-xs">
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Stack summary */}
      <div className="mt-12 border border-border-primary rounded-[20px] p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 bg-[#181815] text-[#F1EFE8]">
        <div>
          <div className="text-[10px] font-bold text-white/40 tracking-[0.1em] uppercase mb-1">COMPATIBILITY</div>
          <h4 className="font-heading text-lg font-black text-[#F1EFE8] leading-tight">
            How does the system run?
          </h4>
          <p className="text-xs text-white/50 mt-1 max-w-sm">
            ScaleCraft is powered by Notion, AI models (ChatGPT/Claude), Google Sheets, and standard WhatsApp or email messaging pipelines.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 justify-center">
          {['Notion', 'ChatGPT', 'Claude', 'WhatsApp', 'Google Sheets', 'Gmail'].map((stack) => (
            <span key={stack} className="text-xs bg-[#2C2C2A] text-[#9FE1CB] px-3.5 py-1.5 rounded-xl border border-white/5 font-bold">
              {stack}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
