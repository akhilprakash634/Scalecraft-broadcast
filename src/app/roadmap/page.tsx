'use client';

import Link from 'next/link';
import { Calendar, Hammer, Milestone, CheckCircle2, Clock } from 'lucide-react';

export default function RoadmapPage() {
  const sections = [
    {
      title: 'In Progress (Q3 2026)',
      status: 'progress',
      icon: Clock,
      items: [
        { name: 'ScaleCraft Pro AI CRM Integration', desc: 'Fully managed CRM syncing client conversations directly to local sheets.' },
        { name: 'Browser Outreach Helper Extension', desc: 'Lightweight browser extension to personalize templates directly on LinkedIn or Instagram profiles.' },
        { name: 'AI Sourcing database expansion', desc: 'Sourcing checklists for specific technical domains (React, DevOps, SEO audits).' }
      ]
    },
    {
      title: 'Coming Soon (Q4 2026)',
      status: 'future',
      icon: Hammer,
      items: [
        { name: 'Founding Customer Community Hub', desc: 'Private circle/group to share successful client pitches and outreach stats.' },
        { name: 'Automation Workflows package', desc: 'Active Make.com/Zapier blueprints to trigger follow-up alerts based on lead responses.' }
      ]
    },
    {
      title: 'Completed (Q2 2026)',
      status: 'completed',
      icon: CheckCircle2,
      items: [
        { name: 'Outreach Vault (50+ Scripts)', desc: 'Released templates for cold emails, DMs, and WhatsApp sequences.' },
        { name: 'Master Notion CRM Board', desc: 'Released visual deal pipelines with calculated conversion triggers.' },
        { name: '7-Day Client Challenge Workflow', desc: 'Step-by-step onboarding sequences to land client conversations.' }
      ]
    }
  ];

  return (
    <div className="min-h-screen py-20 px-6 md:px-10 max-w-[800px] mx-auto space-y-12">
      <div className="text-center space-y-4">
        <span className="text-[11px] font-bold text-accent tracking-[0.15em] uppercase block">
          GROWTH TIMELINE
        </span>
        <h1 className="font-heading text-clamp-h2 font-black leading-tight text-text-primary">
          Ecosystem Roadmap
        </h1>
        <p className="text-[14.5px] text-text-muted max-w-md mx-auto leading-relaxed">
          See what we are actively building. Early customers of ScaleCraft get founding member access to all upcoming products and database extensions.
        </p>
      </div>

      <div className="space-y-8">
        {sections.map((sec, idx) => {
          const Icon = sec.icon;
          return (
            <div 
              key={idx} 
              className={`border rounded-card p-6 md:p-8 space-y-4 bg-white ${
                sec.status === 'progress' 
                  ? 'border-accent shadow-premium' 
                  : 'border-border-primary'
              }`}
            >
              <div className="flex items-center gap-2 pb-3 border-b border-border-primary">
                <Icon className={`w-5 h-5 ${sec.status === 'progress' ? 'text-accent' : sec.status === 'completed' ? 'text-green' : 'text-text-muted'}`} />
                <h3 className="font-heading text-[15px] font-black text-text-primary">
                  {sec.title}
                </h3>
              </div>

              <div className="space-y-4">
                {sec.items.map((item, itemIdx) => (
                  <div key={itemIdx} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-text-light rounded-full shrink-0" />
                      <span className="text-[13.5px] font-bold text-text-primary">{item.name}</span>
                    </div>
                    <p className="text-xs text-text-muted leading-relaxed pl-3.5">
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="border border-border-primary rounded-[20px] p-6 md:p-8 bg-bg-secondary text-center space-y-4">
        <h3 className="font-heading text-base font-black text-text-primary">Shape the future of ScaleCraft</h3>
        <p className="text-[13px] text-text-muted leading-relaxed max-w-sm mx-auto">
          Early buyers receive direct support access on WhatsApp to suggest CRM columns, features, or custom scripts they need.
        </p>
        <Link 
          href="/products/ai-systems-combo"
          className="inline-flex items-center justify-center bg-accent text-white px-5 py-3 rounded-xl text-xs font-bold hover:bg-blue-700 transition-all cursor-pointer"
        >
          Secure Your Founding Discount &rarr;
        </Link>
      </div>
    </div>
  );
}
