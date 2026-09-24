interface CaseStudyCard {
  badge: string;
  title: string;
  meta: string;
}

export default function CaseStudies() {
  const cards: CaseStudyCard[] = [
    {
      badge: "Lead Finder",
      title: "We tried to find 5 real Indian D2C skincare leads. Here's exactly what worked - and what didn't.",
      meta: "8 min read · Real data",
    },
    {
      badge: "Client Pipeline",
      title: "From a stranger's Instagram profile to a sent proposal: the exact 4-stage flow",
      meta: "6 min read · Real process",
    }
  ];

  return (
    <section className="px-6 md:px-10 py-14 md:py-[72px] max-w-[1100px] mx-auto border-t border-border-primary" id="case-studies">
      <div className="text-[11px] font-bold text-text-light tracking-[0.1em] uppercase mb-2.5">
        PROCESS CASE STUDIES
      </div>
      <h2 className="font-heading text-clamp-h2 font-black tracking-[-1px] leading-[1.1] text-foreground">
        See the system in action.
      </h2>
      <p className="text-[14px] text-text-muted mt-2 leading-[1.7] max-w-[360px]">
        Real processes. Real results. No invented numbers.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
        {cards.map((card, i) => (
          <div
            key={i}
            className="bg-white border-[0.5px] border-[#EBEBEB] rounded-[14px] overflow-hidden transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              {/* Thumbnail Area */}
              <div className="bg-[#111110] h-[140px] flex items-center justify-center">
                <span className="bg-[#0055FF] text-white rounded-[4px] px-[10px] py-[4px] text-[11px] font-semibold tracking-wide uppercase">
                  {card.badge}
                </span>
              </div>

              {/* Card Body */}
              <div className="p-4">
                <h3 className="font-heading text-[15px] font-bold text-[#111110] leading-[1.4] mb-2">
                  {card.title}
                </h3>
                <div className="text-[12px] text-[#6F6E69] font-body">
                  {card.meta}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
