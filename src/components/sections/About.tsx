import { waLink, config } from '@/lib/config';

export default function About() {
  return (
    <section className="py-24 bg-bg-secondary border-y border-border-primary" id="about">
      <div className="max-w-[1100px] mx-auto px-6 md:px-10 grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-16 items-center">
        <div>
          <h2 className="font-heading text-clamp-h2 font-black tracking-[-1.5px] leading-tight mb-8">
            Built for freelancers,<br />by a <em className="italic-accent">freelancer.</em>
          </h2>

          <div className="space-y-6 text-[15px] text-text-muted leading-[1.75] max-w-[500px]">
            <p>
              ScaleCraft isn't just another digital product. It's the distillation of 5 years spent building systems and working with clients across India, UAE, and international markets.
            </p>
            <p>
              I've personally used every script, template, and prompt in this system to land clients. I built this because I saw too many talented freelancers worldwide struggling with "feast or famine" cycles simply because they didn't have a predictable system.
            </p>
            <p className="font-medium text-foreground italic">
              "My mission is to help you land high-paying clients without the anxiety of where the next check is coming from."
            </p>
          </div>

          <div className="mt-10 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-border-primary border border-border-dark flex items-center justify-center text-[20px]">👨‍💻</div>
            <div>
              <div className="font-bold text-foreground">Akhil Prakash</div>
              <div className="text-[12px] text-text-muted uppercase tracking-wider font-semibold">Founder, ScaleCraft &middot; 5 years IT &amp; business</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[24px] border border-border-primary shadow-sm">
          <h3 className="font-heading text-[20px] font-bold mb-6">Why trust ScaleCraft?</h3>
          <ul className="space-y-5">
            {[
              { t: "Real Experience", d: "5 years building systems and working with real clients." },
              { t: "Battle Tested", d: "Scripts proven in global markets." },
              { t: "Direct Support", d: "Direct founder access on WhatsApp." },
              { t: "No Fluff", d: "Zero theory. Only what actually works." }
            ].map((item, i) => (
              <li key={i} className="flex gap-4">
                <div className="mt-1 w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                  <svg className="w-3 h-3 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <div className="text-[14px] font-bold text-foreground">{item.t}</div>
                  <div className="text-[13px] text-text-muted">{item.d}</div>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-8 pt-8 border-t border-border-primary">
            <a
              href={waLink("Hi Akhil, I'd like to learn more about your experience.")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-[14px] font-bold text-accent hover:underline"
            >
              Ask me anything on WhatsApp →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
