'use client';

import { Check, X, ShieldAlert } from 'lucide-react';

export default function WhoItIsFor() {
  const perfectFor = [
    { title: 'Freelancers', desc: 'Looking to move away from relying on unstable platform algorithms.' },
    { title: 'Agency Owners', desc: 'Needing to feed sales teams with a consistent stream of discovery calls.' },
    { title: 'Developers & Designers', desc: 'Who want word-for-word scripts so they don&apos;t have to write sales copies.' },
    { title: 'Consultants & Coaches', desc: 'Aiming to secure steady monthly retainer clients.' },
    { title: 'Small Business Owners', desc: 'Running operations that rely on outbound customer acquisition.' }
  ];

  const notFor = [
    { title: 'Get-Rich-Quick Seekers', desc: 'This is a workflow system, not an overnight money generator.' },
    { title: 'Passive Income Buyers', desc: 'We do not sell theoretical automated pipelines that work without effort.' },
    { title: 'Outreach Objectors', desc: 'If you are unwilling to message qualified prospects, this won&apos;t help.' }
  ];

  return (
    <section className="px-6 md:px-10 py-16 md:py-24 max-w-[1100px] mx-auto border-t border-border-primary">
      <div className="text-center max-w-[580px] mx-auto mb-12">
        <span className="text-[11px] font-bold text-accent tracking-[0.15em] uppercase mb-2.5 block">
          QUALIFICATION
        </span>
        <h2 className="font-heading text-clamp-h2 font-black leading-tight text-text-primary mb-3">
          Is ScaleCraft right for you?
        </h2>
        <p className="text-[14px] text-text-muted leading-relaxed">
          We want to make sure you succeed. That means being completely honest about who this toolkit is built for—and who it is not for.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        
        {/* Perfect For */}
        <div className="bg-bg-secondary border border-border-primary rounded-card p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-border-primary">
            <div className="w-8 h-8 rounded-full bg-green-bg text-green flex items-center justify-center font-bold">
              ✓
            </div>
            <h3 className="font-heading text-lg font-black text-text-primary">Perfect for you if:</h3>
          </div>
          
          <ul className="space-y-4">
            {perfectFor.map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <Check className="w-4.5 h-4.5 text-green shrink-0 mt-0.5" />
                <div>
                  <span className="text-[13.5px] font-bold text-text-primary block">{item.title}</span>
                  <span className="text-[12.5px] text-text-muted leading-relaxed">{item.desc}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Not For */}
        <div className="bg-bg-secondary border border-border-primary rounded-card p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-border-primary">
            <div className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center font-bold">
              ✕
            </div>
            <h3 className="font-heading text-lg font-black text-text-primary">Not for you if:</h3>
          </div>

          <ul className="space-y-4">
            {notFor.map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <X className="w-4.5 h-4.5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[13.5px] font-bold text-text-primary block">{item.title}</span>
                  <span className="text-[12.5px] text-text-muted leading-relaxed">{item.desc}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>

      </div>

      <div className="mt-10 flex items-center gap-3 bg-amber-50/50 border border-amber-200/50 rounded-xl p-4 max-w-[800px] mx-auto text-[13px] text-amber-800">
        <ShieldAlert className="w-5 h-5 shrink-0 text-amber-600" />
        <p className="leading-relaxed">
          <strong>Transparency commitment:</strong> We do not use fake countdown timers or fabricated reviews. If you are ready to do outreach work, we stand behind our products with a concrete challenge guarantee.
        </p>
      </div>
    </section>
  );
}
