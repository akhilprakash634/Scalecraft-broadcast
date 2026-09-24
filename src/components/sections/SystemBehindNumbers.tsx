'use client';

import Link from 'next/link';

export default function SystemBehindNumbers() {
  const stats = [
    {
      value: "50+",
      label: "Outreach scripts included"
    },
    {
      value: "7 days",
      label: "Challenge duration"
    },
    {
      value: "12+",
      label: "Replies per 20 DMs sent"
    }
  ];

  return (
    <section className="bg-[#181815] text-[#F1EFE8] py-[40px] px-[16px] md:py-[60px] md:px-[24px] text-center" id="behind-the-numbers">
      <div className="max-w-[1100px] mx-auto flex flex-col items-center">
        {/* Section Title / Eyebrow */}
        <div className="text-[11px] font-bold text-white/40 tracking-[0.1em] uppercase mb-4">
          The system that runs behind the numbers.
        </div>

        {/* Headline */}
        <h2 className="font-heading text-[28px] md:text-[36px] font-black tracking-[-1.5px] leading-tight mb-8 text-[#F1EFE8]">
          Built from real results.<br />Not <em className="italic-accent">theory.</em>
        </h2>

        {/* 3 Stat Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-[16px] w-full max-w-[900px]">
          {stats.map((stat, i) => (
            <div key={i} className="bg-[#2C2C2A] rounded-[12px] p-[24px] flex flex-col items-center justify-center text-center">
              <div className="font-heading text-[28px] font-bold text-[#9FE1CB] mb-2 leading-none">
                {stat.value}
              </div>
              <div className="text-[13px] text-[#888780] leading-relaxed max-w-[200px]">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Quote Block */}
        <div className="max-w-[560px] w-full border-l-[3px] border-[#9FE1CB] pl-[16px] text-left mt-[32px] mx-auto">
          <p className="text-[15px] text-[#D3D1C7] italic leading-[1.7]">
            &ldquo;I built this while working a full-time job. Every script in this workspace is something I tested myself on real clients across India, UAE, and international markets.&rdquo;
          </p>
          <p className="text-[12px] text-[#888780] mt-2 font-medium">
            - Akhil Prakash, Founder &middot; ScaleCraft
          </p>
        </div>

        {/* CTA Button */}
        <div className="mt-[32px]">
          <Link
            href="/products"
            className="inline-flex items-center justify-center bg-white text-[#181815] px-5 py-2.5 rounded-[7px] text-[13px] font-semibold hover:bg-accent hover:text-white transition-colors"
          >
            Get the system &rarr;
          </Link>
        </div>
      </div>
    </section>
  );
}
