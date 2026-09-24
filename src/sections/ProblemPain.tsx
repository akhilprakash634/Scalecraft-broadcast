'use client';

import { Ban, MailX, Layers, Cpu } from 'lucide-react';

export default function ProblemPain() {
  const pains = [
    {
      icon: Ban,
      title: 'Still relying on word-of-mouth referrals?',
      desc: 'Waiting for clients to find you is not a growth strategy. When referrals dry up, you enter the stressful "feast or famine" cycle.'
    },
    {
      icon: MailX,
      title: 'Cold outreach getting completely ignored?',
      desc: 'Sending standard "hire me" templates in DMs and emails triggers instant deletes. Without personalization, you get marked as spam.'
    },
    {
      icon: Layers,
      title: 'Managing leads in scattered spreadsheets?',
      desc: 'Leads slip through the cracks when your follow-ups are disorganized. If follow-ups are not tracked, deals are lost.'
    },
    {
      icon: Cpu,
      title: 'Copy-pasting generic ChatGPT prompts?',
      desc: 'Generic AI outputs sound robotic. Custom, context-rich prompting is required to make outbound systems sound natural.'
    }
  ];

  return (
    <section className="px-6 md:px-10 py-16 md:py-24 max-w-[1100px] mx-auto border-t border-border-primary">
      <div className="max-w-[620px] mb-12">
        <span className="text-[11px] font-bold text-accent tracking-[0.15em] uppercase mb-2.5 block">
          THE STATUS QUO
        </span>
        <h2 className="font-heading text-clamp-h2 font-black leading-tight text-text-primary mb-4">
          Client acquisition doesn&apos;t have to feel like <em className="italic-accent">guesswork.</em>
        </h2>
        <p className="text-[15px] text-text-muted leading-relaxed">
          Most freelancers and agencies don&apos;t fail because they lack skills. They struggle because their client pipelines are manual, inconsistent, and unstructured.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pains.map((pain, i) => (
          <div 
            key={i} 
            className="bg-bg-secondary border border-border-primary hover:border-border-dark rounded-card p-6 md:p-8 flex items-start gap-4 transition-all"
          >
            <div className="w-10 h-10 bg-red-50 border border-red-100 rounded-xl flex items-center justify-center text-red-500 shrink-0">
              <pain.icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading text-[15.5px] font-extrabold text-text-primary mb-2 leading-tight">
                {pain.title}
              </h3>
              <p className="text-[13px] text-text-muted leading-relaxed">
                {pain.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 bg-accent/5 border border-accent/15 rounded-card p-6 md:p-8 text-center max-w-[800px] mx-auto">
        <p className="text-[14.5px] text-text-primary font-semibold leading-relaxed">
          ScaleCraft provides a predictable client acquisition toolkit. Less friction, less guesswork, and a structured system you can start running today.
        </p>
      </div>
    </section>
  );
}
