'use client';

import { ShoppingBag, FilePlus, Copy, Search, Send, KanbanSquare, CheckCircle } from 'lucide-react';

export default function CustomerJourney() {
  const steps = [
    {
      icon: ShoppingBag,
      title: '1. Instant Access',
      desc: 'Purchase the system. Receive your checkout confirmation and access links via email in under 2 minutes.'
    },
    {
      icon: FilePlus,
      title: '2. Duplicate Notion',
      desc: 'Click the duplicate link to save the ScaleCraft client CRM workspace into your free Notion account.'
    },
    {
      icon: Copy,
      title: '3. Customize Assets',
      desc: 'Fill in your service details inside the outreach templates and generate custom client openers.'
    },
    {
      icon: Search,
      title: '4. Source Leads',
      desc: 'Follow the platforms guide to identify 50+ qualified prospects each week without paying for expensive database leads.'
    },
    {
      icon: Send,
      title: '5. Launch Outreach',
      desc: 'Send personalized pitches and follow up on days 3, 7, and 14 using the structured breakup flows.'
    },
    {
      icon: KanbanSquare,
      title: '6. Track Conversations',
      desc: 'Log replies in the Notion board to prevent leads from slipping through the cracks.'
    },
    {
      icon: CheckCircle,
      title: '7. Close Deals',
      desc: 'Send the signed proposal templates and secure monthly retainers.'
    }
  ];

  return (
    <section className="px-6 md:px-10 py-16 md:py-24 max-w-[1100px] mx-auto border-t border-border-primary" id="journey">
      <div className="max-w-[620px] mb-14">
        <span className="text-[11px] font-bold text-accent tracking-[0.15em] uppercase mb-2.5 block">
          THE ONBOARDING TIMELINE
        </span>
        <h2 className="font-heading text-clamp-h2 font-black leading-tight text-text-primary mb-4">
          Visualize your path to <em className="italic-accent">paying clients.</em>
        </h2>
        <p className="text-[15px] text-text-muted leading-relaxed">
          Here is exactly what happens when you purchase ScaleCraft. We don&apos;t just sell a download; we guide you step-by-step from zero setup to active, closed client retainers.
        </p>
      </div>

      {/* Horizontal timeline on large viewports, vertical on mobile */}
      <div className="relative border-l-2 md:border-l-0 md:border-t-2 border-border-primary/80 ml-4 md:ml-0 pl-6 md:pl-0 pt-0 md:pt-8 grid grid-cols-1 md:grid-cols-7 gap-8">
        
        {/* Journey cards */}
        {steps.map((step, idx) => (
          <div key={idx} className="relative space-y-3">
            {/* Bullet node indicator */}
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

      <div className="mt-14 bg-bg-secondary border border-border-primary rounded-[20px] p-6 text-center text-xs text-text-muted">
        💡 <strong>Timeline average:</strong> The entire setup from duplicate to initial outreach messages sent takes most users under 45 minutes.
      </div>
    </section>
  );
}
