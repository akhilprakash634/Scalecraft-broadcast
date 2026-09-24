import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Refund Policy | ScaleCraft',
  description: '7-day results guarantee on the Freelance Client Pipeline Blueprint. Full refund if you follow the system and get zero results.',
  alternates: {
    canonical: 'https://thescalecraft.in/refund-policy',
  },
  openGraph: {
    title: 'Refund Policy | ScaleCraft',
    description: '7-day results guarantee on the Freelance Client Pipeline Blueprint. Full refund if you follow the system and get zero results.',
    url: 'https://thescalecraft.in/refund-policy',
  },
};

export default function RefundPolicy() {
  return (
    <div className="min-h-screen py-20 px-6 max-w-[680px] mx-auto">
      <h1 className="font-heading text-clamp-h2 font-black tracking-[-1.5px] leading-tight mb-8">
        Refund Policy
      </h1>

      <div className="prose prose-zinc max-w-none text-text-muted leading-[1.8] space-y-8 font-body">
        <p className="text-[15px]">
          We stand behind the system. If it doesn't work for you, we make it right.
        </p>

        <hr className="border-border-primary" />

        <section>
          <h2 className="text-xl font-bold text-foreground mb-4 font-heading">The 7-Day Results Guarantee</h2>
          <p className="text-[15px] mb-4">
            Follow the 7-Day Challenge inside the Freelance Client Pipeline Blueprint. Send outreach every day for 7 days using the scripts provided. If you don't get a single interested reply from a real prospect - we'll refund you fully.
          </p>
          <p className="text-[15px] mb-6">
            No forms. No questions asked. Just message Akhil on WhatsApp with your outreach logs and we'll process the refund within 24 hours.
          </p>
          <a
            href="https://wa.me/918078004732?text=Hi%20Akhil%2C%20I%20completed%20the%207-day%20challenge%20and%20want%20to%20claim%20the%20refund%20guarantee"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-[14px] font-bold text-accent hover:underline"
          >
            Message us on WhatsApp →
          </a>
        </section>

        <hr className="border-border-primary" />

        <section>
          <h2 className="text-xl font-bold text-foreground mb-4 font-heading">What qualifies</h2>
          <ul className="space-y-2 text-[15px] text-text-muted">
            <li>→ You purchased the Freelance Client Pipeline Blueprint</li>
            <li>→ You completed all 7 days of the challenge</li>
            <li>→ You sent at least 5 outreach messages per day</li>
            <li>→ You followed the provided scripts (not your own)</li>
            <li>→ You request the refund within 14 days of purchase</li>
          </ul>
        </section>

        <hr className="border-border-primary" />

        <section>
          <h2 className="text-xl font-bold text-foreground mb-4 font-heading">What doesn't qualify</h2>
          <ul className="space-y-2 text-[15px] text-text-muted">
            <li>→ Refund requests without showing outreach logs</li>
            <li>→ Requests made after 14 days of purchase</li>
            <li>→ AI Lead Finder System purchases alone (it is a research tool - results depend on your niche and outreach effort)</li>
            <li>→ Combo bundle refunds are partial - Blueprint portion refunded only</li>
          </ul>
        </section>

        <hr className="border-border-primary" />

        <section>
          <h2 className="text-xl font-bold text-foreground mb-4 font-heading">How to claim</h2>
          <p className="text-[15px] mb-6">
            Message Akhil directly on WhatsApp and include your outreach screenshots:
          </p>
          <div className="mb-4">
            <a
              href="https://wa.me/918078004732?text=Hi%20Akhil%2C%20I%20completed%20the%207-day%20challenge%20and%20want%20to%20claim%20the%20refund%20guarantee.%20Here%20are%20my%20outreach%20logs"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-[14px] font-bold text-accent hover:underline"
            >
              Claim your refund →
            </a>
          </div>
          <p className="text-[15px]">
            Refund processed within 24 hours via the original payment method.
          </p>
        </section>

        <hr className="border-border-primary" />

        <section>
          <h2 className="text-xl font-bold text-foreground mb-4 font-heading">General returns</h2>
          <p className="text-[15px]">
            For any other issue - wrong product, technical problem, or access issue - message us on WhatsApp and we'll resolve it the same day.
          </p>
        </section>

        <hr className="border-border-primary" />

        <section className="pt-6 flex flex-col gap-6">
          <div className="text-[13px] text-text-light font-body">
            Last updated: June 2026
          </div>
          <div>
            <Link href="/" className="inline-flex items-center text-[14px] font-bold text-accent hover:underline font-body">
              ← Back to home
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
