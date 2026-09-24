import { Mail, RotateCcw, FileText, Calendar, Bot, BarChart3 } from 'lucide-react';

export default function InsideGrid() {
  const items = [
    { icon: Mail, title: "Outreach Vault", desc: "50+ scripts for Instagram DM, LinkedIn, and cold email. Personalise in 2 minutes and send." },
    { icon: RotateCcw, title: "Follow-Up System", desc: "Complete sequence - Day 3, Day 7, Day 14 - including the breakup message that gets the highest reply rate." },
    { icon: FileText, title: "Proposal Template", desc: "Fill-in-the-blanks proposal with ROI framing. The exact format used to close high-ticket clients." },
    { icon: Calendar, title: "7-Day Challenge", desc: "Day-by-day plan from zero to first client conversation. Specific tasks and targets for each day." },
    { icon: Bot, title: "AI Prompt Library", desc: "50+ prompts for outreach, content, proposals, and client work. Built for ChatGPT and Claude." },
    { icon: BarChart3, title: "Lead Tracker", desc: "Notion database to manage your full pipeline - from first outreach to closed deal." }
  ];

  return (
    <section className="px-6 md:px-10 py-14 md:py-[72px] max-w-[1100px] mx-auto" id="inside">
      <div className="text-[11px] font-bold text-text-light tracking-[0.1em] uppercase mb-2.5">What's inside</div>
      <h2 className="font-heading text-clamp-h2 font-black tracking-[-1px] leading-[1.1] text-foreground mb-2.5">
        Not a course.<br />A <em className="italic-accent">working system.</em>
      </h2>
      <p className="text-[15px] text-text-muted leading-[1.7] max-w-[440px]">
        No videos to watch, no homework. Scripts, templates, and a routine you can implement today.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-10">
        {items.map((item, i) => (
          <div key={i} className="bg-bg-secondary border border-border-primary rounded-card p-[22px] transition-all hover:bg-white hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:border-border-dark group">
            <div className="w-10 h-10 bg-[#EEF3FF] rounded-[10px] flex items-center justify-center mb-3.5">
              <item.icon className="w-5 h-5 text-[#0055FF]" />
            </div>
            <div className="font-heading text-[14px] font-bold tracking-[-0.2px] text-foreground mb-1.5">{item.title}</div>
            <div className="text-[13px] text-text-muted leading-[1.65]">{item.desc}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
