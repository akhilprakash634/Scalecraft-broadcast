'use client';

import { useState } from 'react';
import { ChevronDown, MessageSquare } from 'lucide-react';
import { config, waLink } from '@/lib/config';

interface FAQItem {
  q: string;
  a: string;
  objection: string;
}

const staticFaqs: FAQItem[] = [
  {
    objection: 'EXPERIENCE',
    q: 'Do I need technical skills or experience to use ScaleCraft?',
    a: 'No. Our systems are built for anyone to use. Templates duplicate to your account with a single click, and AI prompts are copy-paste ready. We include step-by-step guides for everything.'
  },
  {
    objection: 'BILLING',
    q: 'Are there recurring fees or subscriptions?',
    a: 'No. The templates, databases, and prompts are a one-time purchase. You pay once and own them forever. There are no hidden subscription costs.'
  },
  {
    objection: 'COLLABORATION',
    q: 'Can I share these tools with my team?',
    a: 'Yes. Notion workspaces are fully collaborative. You can invite your team members, assign tasks, and track leads in one shared dashboard.'
  },
  {
    objection: 'LOCATION',
    q: 'Do these systems work in international markets?',
    a: 'Yes. The message templates, directories, and sheets work globally. They are used by business owners worldwide to find and close clients.'
  },
  {
    objection: 'DELIVERY',
    q: 'How fast do I get access?',
    a: 'Most products are ready to use in just a few minutes. Every purchase includes simple setup instructions.'
  },
  {
    objection: 'REFUND',
    q: 'What is the refund policy?',
    a: 'We offer a 7-day results guarantee on our core Freelance Client Pipeline Blueprint. If you follow the daily checklist for 7 days but get zero replies, contact support for a full refund. Other templates are final sales.'
  }
];

export default function FAQ({ faqs, waPrefillMsg }: { faqs?: any[]; waPrefillMsg?: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const displayFaqs: FAQItem[] = faqs && faqs.length > 0
    ? faqs.map((f: any) => ({ objection: f.objection, q: f.question || f.q, a: f.answer || f.a }))
    : staticFaqs;

  const activeWaMsg = waPrefillMsg || "Hi Akhil, I have a specific question about ScaleCraft before buying";

  return (
    <section className="px-6 md:px-10 py-16 md:py-24 max-w-[1100px] mx-auto grid grid-cols-1 md:grid-cols-[1fr_1.5fr] gap-12" id="faq">
      
      {/* Sidebar Objection Box */}
      <div className="space-y-6">
        <div>
          <span className="text-[11px] font-bold text-accent tracking-[0.15em] uppercase mb-2.5 block">
            FAQ
          </span>
          <h2 className="font-heading text-clamp-h2 font-black leading-tight text-text-primary">
            Honest answers to your <em className="italic-accent">hesitations.</em>
          </h2>
          <p className="text-[14px] text-text-muted mt-3 leading-relaxed max-w-[280px]">
            Have a specific concern before getting access? Message Akhil directly on WhatsApp for a quick, no-spam response.
          </p>
        </div>

        <div className="pt-4">
          <a
            href={waLink(activeWaMsg)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-foreground hover:bg-accent text-white px-5 py-3 rounded-xl text-xs font-bold transition-all"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Chat on WhatsApp</span>
          </a>
        </div>
      </div>

      {/* FAQ Collapse Items */}
      <div className="divide-y divide-border-primary border-t border-border-primary">
        {displayFaqs.map((faq, i) => {
          const isOpen = openIndex === i;
          return (
            <div key={i} className="py-4.5 group">
              <button
                onClick={() => setOpenIndex(isOpen ? null : i)}
                className="w-full flex items-center justify-between gap-4 text-left cursor-pointer group-hover:text-accent transition-colors py-1 focus:outline-none"
              >
                <div className="space-y-1">
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-text-light bg-bg-secondary px-2 py-0.5 rounded">
                    {faq.objection}
                  </span>
                  <h3 className={`text-[14.5px] font-extrabold transition-colors ${isOpen ? 'text-accent' : 'text-text-primary'}`}>
                    {faq.q}
                  </h3>
                </div>
                <ChevronDown className={`w-4 h-4 text-text-light shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-accent' : ''}`} />
              </button>
              
              <div 
                className={`overflow-hidden transition-all duration-300 ${
                  isOpen ? 'max-h-[300px] mt-3 pb-2 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <p className="text-[13.5px] text-text-muted leading-relaxed select-text">
                  {faq.a}
                </p>
              </div>
            </div>
          );
        })}
      </div>

    </section>
  );
}
