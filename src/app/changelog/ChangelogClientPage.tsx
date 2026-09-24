'use client';

import Link from 'next/link';
import { GitCommit } from 'lucide-react';

export default function ChangelogClientPage() {
  const updates = [
    {
      date: 'July 2026',
      version: 'v2.4.0',
      title: 'Gemini AI Prompt Integrations & CRM Polish',
      changes: [
        'Added 24 custom Gemini API prompt templates optimized for deep competitor analysis.',
        'Refined Notion CRM board properties to calculate deal stage win probability percentages automatically.',
        'Added 12 cold outreach templates tailored for SaaS and tech startup founders.'
      ]
    },
    {
      date: 'June 2026',
      version: 'v2.3.0',
      title: 'eCommerce Sourcing & Proposal Updates',
      changes: [
        'Added visual step-by-step workflow tutorials for extracting leads from Google Maps without scraping software.',
        'Released high-ticket proposal template framing UI design packages as business investments.',
        'Included breakup follow-up email scripts showing a 42% response recovery rate.'
      ]
    },
    {
      date: 'May 2026',
      version: 'v2.0.0',
      title: 'Core Workspace Launch',
      changes: [
        'Released the core Freelance Client Pipeline Notion workspace.',
        'Integrated cold DM modules for Instagram, LinkedIn, and cold email.',
        'Launched the 7-day client acquisition challenge timeline.'
      ]
    }
  ];

  return (
    <div className="min-h-screen py-20 px-6 md:px-10 max-w-[800px] mx-auto space-y-12">
      <div className="text-center space-y-4">
        <span className="text-[11px] font-bold text-accent tracking-[0.15em] uppercase block">
          SYSTEM EVOLUTION
        </span>
        <h1 className="font-heading text-clamp-h2 font-black leading-tight text-text-primary">
          Changelog &amp; Release History
        </h1>
        <p className="text-[14.5px] text-text-muted max-w-md mx-auto leading-relaxed">
          See the active maintenance history of ScaleCraft. We update CRM properties, scripts, and prompts regularly to match changing market behaviors.
        </p>
      </div>

      <div className="border-l-2 border-border-primary/80 ml-4 pl-6 md:pl-8 space-y-10 relative">
        {updates.map((update, idx) => (
          <div key={idx} className="relative space-y-3">
            {/* Timeline node */}
            <div className="absolute -left-[35px] md:-left-[41px] top-1 w-5 h-5 rounded-full bg-white border-2 border-accent flex items-center justify-center">
              <GitCommit className="w-2.5 h-2.5 text-accent" />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-accent bg-accent/5 px-2 py-0.5 rounded-full">
                {update.version}
              </span>
              <span className="text-xs text-text-light font-bold">
                {update.date}
              </span>
            </div>

            <h3 className="font-heading text-base font-black text-text-primary">
              {update.title}
            </h3>

            <ul className="space-y-2">
              {update.changes.map((change, cIdx) => (
                <li key={cIdx} className="flex items-start gap-2.5 text-[13px] text-text-muted leading-relaxed">
                  <span className="text-green font-bold shrink-0 mt-0.5">✓</span>
                  <span>{change}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border border-border-primary rounded-[20px] p-6 md:p-8 bg-bg-secondary text-center space-y-4">
        <h3 className="font-heading text-base font-black text-text-primary">Buy once. Receive updates forever.</h3>
        <p className="text-[13px] text-text-muted leading-relaxed max-w-sm mx-auto">
          ScaleCraft templates do not charge subscription fees. Purchase today and you will receive every future version release directly in your inbox.
        </p>
        <Link 
          href="/products/ai-systems-combo"
          className="inline-flex items-center justify-center bg-accent text-white px-5 py-3 rounded-xl text-xs font-bold hover:bg-blue-700 transition-all cursor-pointer"
        >
          Get Lifetime Access &rarr;
        </Link>
      </div>
    </div>
  );
}
