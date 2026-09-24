export default function ComingSoon() {
  const features = [
    "Auto-find leads from Instagram, LinkedIn & Google Maps",
    "AI-personalised outreach for every prospect",
    "Automatic follow-ups - Day 3, 7, and 14",
    "WhatsApp alert when a prospect replies"
  ];

  return (
    <section className="bg-[#111110] w-full text-white">
      <div className="max-w-[1100px] mx-auto px-5 py-10 md:px-10 md:py-16 text-left">
        <div className="text-[11px] text-[#0055FF] font-semibold tracking-[0.1em] uppercase mb-3">
          COMING NEXT
        </div>
        <h2 className="font-heading text-[36px] font-black text-white tracking-[-1px] mb-2.5 leading-tight">
          ScaleCraft Pro - The Automated Version
        </h2>
        <p className="text-[16px] text-white/55 leading-[1.7] max-w-[520px] mb-8 font-body">
          AI finds your leads. AI personalises your outreach. Sequences run on autopilot. You only talk to interested prospects.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 mb-8">
          {features.map((feature, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-[#0055FF] shrink-0" />
              <span className="text-[14px] text-white/70 font-body leading-relaxed">{feature}</span>
            </div>
          ))}
        </div>

        <div>
          <a
            href="https://wa.me/918078004732?text=Hi%20Akhil%2C%20I%20want%20early%20access%20to%20ScaleCraft%20Pro"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-[#0055FF] text-white px-6 py-3 rounded-[8px] text-[14px] font-semibold hover:bg-[#0044CC] transition-colors"
          >
            Join the Pro waitlist →
          </a>
          <p className="text-[12px] text-white/30 mt-2.5 font-body">
            Early customers of the current system get founding member pricing.
          </p>
        </div>
      </div>
    </section>
  );
}
