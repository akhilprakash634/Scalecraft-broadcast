import { Award, User, Infinity, Lightbulb } from 'lucide-react';

export default function PromiseGrid() {
  const promises = [
    { icon: Award, title: "Real experience, not theory", desc: "Every script is something Akhil uses himself to acquire clients worldwide." },
    { icon: User, title: "Direct founder support", desc: "Message us on WhatsApp and Akhil personally responds - not a support team." },
    { icon: Infinity, title: "Free lifetime updates", desc: "Buy once, get every future improvement free. No upgrade fees, ever." },
    { icon: Lightbulb, title: "You shape what we build", desc: "Early customers get a say in our next products. Your feedback becomes our roadmap." }
  ];

  return (
    <section className="px-6 md:px-10 pt-10 md:pt-12 pb-14 md:pb-[72px] max-w-[1100px] mx-auto">
      <div className="text-[11px] font-bold text-text-light tracking-[0.1em] uppercase mb-2.5">Our promise</div>
      <h2 className="font-heading text-clamp-h2 font-black tracking-[-1px] leading-[1.1] text-foreground mb-2.5">
        We earn your <em className="italic-accent">trust.</em>
      </h2>
      <p className="text-[15px] text-text-muted leading-[1.7] max-w-[440px] mb-10">
        We're new. So instead of fake proof, here's what we actually commit to.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {promises.map((promise, i) => (
          <div key={i} className="bg-bg-secondary border border-border-primary rounded-card p-[22px]">
            <div className="w-10 h-10 bg-[#EEF3FF] rounded-[10px] flex items-center justify-center mb-3.5">
              <promise.icon className="w-5 h-5 text-[#0055FF]" />
            </div>
            <div className="font-heading text-[14px] font-bold text-foreground mb-1.5">{promise.title}</div>
            <div className="text-[13px] text-text-muted leading-[1.6]">{promise.desc}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
