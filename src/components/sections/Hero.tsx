'use client';

import { Terminal, ArrowDown, Search, Filter, Send, Layers, CheckCircle, Zap } from 'lucide-react';

export default function Hero({ liveProducts }: { liveProducts?: any[] }) {
  const handleScrollTo = (id: string) => {
    const el = document.querySelector(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const badges = [
    { text: 'Built from real freelance workflows' },
    { text: 'No subscriptions' },
    { text: 'Instant access' },
    { text: 'Lifetime updates' }
  ];

  return (
    <section className="relative overflow-hidden pt-20 md:pt-28 pb-10 max-w-[1100px] mx-auto px-6 md:px-10 flex flex-col items-center">
      
      {/* ── Main Hero Row ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-12 items-center w-full min-h-[55vh] md:min-h-[65vh] mb-12">
        
        {/* Copy Block */}
        <div className="space-y-6 text-left max-w-[580px]">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/5 border border-accent/10">
            <span className="w-1.5 h-1.5 bg-accent rounded-full animate-blink" />
            <span className="text-[11px] font-bold text-accent uppercase tracking-wider">BUSINESS AUTOMATION</span>
          </div>

          <h1 className="font-heading text-clamp-h1 font-black leading-[1.06] tracking-[-1px] md:tracking-[-2px] text-foreground">
            Spend less time working. Spend more time growing your business.
          </h1>

          <p className="text-[15.5px] text-text-muted leading-[1.75] max-w-[490px] font-body">
            Spend less time on repetitive work. Focus on growing your business. Explore practical AI tools and ready-to-use systems to find customers, stay organized, and automate daily tasks.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
            <button
              onClick={() => handleScrollTo('#products')}
              className="bg-accent text-white px-6 py-3.5 rounded-xl text-[14px] font-bold hover:bg-blue-700 transition-all text-center cursor-pointer shadow-md"
            >
              Browse Products &rarr;
            </button>
            <button
              onClick={() => handleScrollTo('#sandbox')}
              className="bg-white hover:bg-bg-secondary border border-border-dark text-text-primary px-6 py-3.5 rounded-xl text-[14px] font-bold transition-all text-center cursor-pointer"
            >
              See How It Works
            </button>
          </div>

          <div className="flex items-center gap-3 pt-6 border-t border-border-primary">
            <div className="w-8 h-8 rounded-full bg-bg-secondary border border-border-dark flex items-center justify-center text-accent shrink-0">
              <Terminal className="w-4 h-4" />
            </div>
            <p className="text-[12.5px] text-text-muted leading-[1.5]">
              <strong className="text-foreground font-semibold">Built by Akhil</strong> • Building practical AI tools for businesses
            </p>
          </div>
        </div>

        {/* Workflow Visual Mockup - Platform Illustration */}
        <div className="w-full relative animate-in fade-in slide-in-from-bottom-4 duration-500 flex items-center justify-center py-6">
          {/* Decorative Glow */}
          <div className="absolute -inset-1 bg-gradient-to-r from-accent/10 to-green/5 rounded-[24px] blur-xl opacity-75 -z-10" />
          
          {/* Desktop/Tablet Layout (Absolute Positioning + Flow Lines) */}
          <div className="hidden sm:block w-full max-w-[480px] h-[310px] relative select-none">
            {/* SVG Connecting Flow Lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none fill-none stroke-accent/20" xmlns="http://www.w3.org/2000/svg">
              {/* Line 1: Sourcing (bottom) -> CRM (top) */}
              <path d="M 110 105 L 110 195" strokeWidth="2" strokeDasharray="4 4" className="stroke-accent/35" />
              {/* Line 2: Sourcing (right) -> Agent (left) */}
              <path d="M 220 52 L 260 52" strokeWidth="2" />
              {/* Line 3: Agent (bottom) -> CRM (top-right diagonal) */}
              <path d="M 370 105 C 370 150 220 150 220 195" strokeWidth="2" strokeDasharray="4 4" />
              {/* Line 4: CRM (right) -> Analytics (left) */}
              <path d="M 220 247 L 260 247" strokeWidth="2" className="stroke-[#10B981]/30" />
            </svg>

            {/* Module 1: AI Lead Finder (Top Left) */}
            <div className="absolute left-0 top-0 w-[220px] h-[105px] bg-white border border-border-primary rounded-xl p-3.5 shadow-card hover:border-accent/40 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Search className="w-3.5 h-3.5 text-[#10B981]" />
                  <span className="text-[9px] font-black text-text-primary uppercase tracking-wider">AI Lead Finder</span>
                </div>
                <h4 className="text-[12px] font-bold text-text-primary leading-tight">Company Discovery</h4>
              </div>
              <div className="flex items-center justify-between text-[8.5px] font-mono text-text-muted mt-2 border-t border-border-primary/50 pt-1">
                <span className="text-[#10B981] font-bold">54 Qualified Leads</span>
                <span>Active</span>
              </div>
            </div>

            {/* Module 2: AI Assistant (Top Right) */}
            <div className="absolute right-0 top-0 w-[220px] h-[105px] bg-white border border-border-primary rounded-xl p-3.5 shadow-card hover:border-accent/40 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Zap className="w-3.5 h-3.5 text-[#8B5CF6]" />
                  <span className="text-[9px] font-black text-text-primary uppercase tracking-wider">AI Assistant</span>
                </div>
                <h4 className="text-[12px] font-bold text-text-primary leading-tight">Support Automation</h4>
              </div>
              <div className="flex items-center justify-between text-[8.5px] font-mono text-text-muted mt-2 border-t border-border-primary/50 pt-1">
                <span className="text-[#8B5CF6] font-bold">Autopilot Live</span>
                <span>WhatsApp active</span>
              </div>
            </div>

            {/* Module 3: CRM (Bottom Left) */}
            <div className="absolute left-0 bottom-0 w-[220px] h-[105px] bg-white border border-border-primary rounded-xl p-3.5 shadow-card hover:border-accent/40 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Layers className="w-3.5 h-3.5 text-accent" />
                  <span className="text-[9px] font-black text-text-primary uppercase tracking-wider">Sales CRM</span>
                </div>
                <h4 className="text-[12px] font-bold text-text-primary leading-tight">Pipeline CRM</h4>
              </div>
              <div className="flex flex-col text-[8.5px] font-mono text-text-muted mt-1 border-t border-border-primary/50 pt-1">
                <div className="flex justify-between">
                  <span className="font-bold">Aura Agency</span>
                  <span className="text-green font-bold">Won</span>
                </div>
              </div>
            </div>

            {/* Module 4: Analytics (Bottom Right) */}
            <div className="absolute right-0 bottom-0 w-[220px] h-[105px] bg-white border border-border-primary rounded-xl p-3.5 shadow-card hover:border-accent/40 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Terminal className="w-3.5 h-3.5 text-accent" />
                  <span className="text-[9px] font-black text-text-primary uppercase tracking-wider">Analytics</span>
                </div>
                <h4 className="text-[12px] font-bold text-text-primary leading-tight">Revenue & Growth</h4>
              </div>
              <div className="flex items-center justify-between text-[8.5px] font-mono text-text-muted mt-2 border-t border-border-primary/50 pt-1">
                <span className="text-accent font-bold">₹45,000 /mo</span>
                <span className="text-green font-bold">↑ 18.4%</span>
              </div>
            </div>

          </div>

          {/* Mobile Layout (Stacked List for Readability) */}
          <div className="block sm:hidden w-full max-w-[280px] space-y-4 select-none">
            {/* Card 1 */}
            <div className="bg-white border border-border-primary rounded-xl p-4 shadow-card">
              <div className="flex items-center gap-1.5 mb-1">
                <Search className="w-3.5 h-3.5 text-[#10B981]" />
                <span className="text-[9px] font-black text-text-primary uppercase tracking-wider">AI Lead Finder</span>
              </div>
              <h4 className="text-[12px] font-bold text-text-primary leading-tight">Company Discovery</h4>
            </div>

            {/* Card 2 */}
            <div className="bg-white border border-border-primary rounded-xl p-4 shadow-card">
              <div className="flex items-center gap-1.5 mb-1">
                <Zap className="w-3.5 h-3.5 text-[#8B5CF6]" />
                <span className="text-[9px] font-black text-text-primary uppercase tracking-wider">AI Assistant</span>
              </div>
              <h4 className="text-[12px] font-bold text-text-primary leading-tight">Support Automation</h4>
            </div>

            {/* Card 3 */}
            <div className="bg-white border border-border-primary rounded-xl p-4 shadow-card">
              <div className="flex items-center gap-1.5 mb-1">
                <Layers className="w-3.5 h-3.5 text-accent" />
                <span className="text-[9px] font-black text-text-primary uppercase tracking-wider">Sales CRM</span>
              </div>
              <h4 className="text-[12px] font-bold text-text-primary leading-tight">Pipeline CRM</h4>
            </div>

            {/* Card 4 */}
            <div className="bg-white border border-border-primary rounded-xl p-4 shadow-card">
              <div className="flex items-center gap-1.5 mb-1">
                <Terminal className="w-3.5 h-3.5 text-accent" />
                <span className="text-[9px] font-black text-text-primary uppercase tracking-wider">Analytics</span>
              </div>
              <h4 className="text-[12px] font-bold text-text-primary leading-tight">Revenue & Growth</h4>
            </div>
          </div>

        </div>

      </div>

      {/* ── Badges Strip ──────────────────────────────────── */}
      <div className="w-full border-t border-b border-border-primary py-4 mt-4 select-none">
        <div className="flex flex-wrap items-center justify-between gap-4 md:gap-6">
          {badges.map((badge, idx) => (
            <div key={idx} className="flex items-center gap-2 mx-auto md:mx-0">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              <span className="text-[12px] font-bold text-text-primary tracking-wide">{badge.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Built For Section ─────────────────────────────── */}
      <div className="w-full mt-16 pt-12 border-t border-border-primary text-left">
        <p className="text-[13px] font-bold text-text-muted mb-8 leading-relaxed">
          Whether you're just starting out or already growing a business, ScaleCraft has tools designed for your workflow.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-accent uppercase tracking-wider block">Built For</span>
            <h3 className="font-heading text-[15px] font-black text-text-primary leading-tight">Freelancers</h3>
            <p className="text-xs text-text-muted leading-relaxed">Find more clients and stay organized.</p>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-accent uppercase tracking-wider block">Built For</span>
            <h3 className="font-heading text-[15px] font-black text-text-primary leading-tight">Agencies</h3>
            <p className="text-xs text-text-muted leading-relaxed">Manage leads and automate follow-ups.</p>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-accent uppercase tracking-wider block">Built For</span>
            <h3 className="font-heading text-[15px] font-black text-text-primary leading-tight">Small Businesses</h3>
            <p className="text-xs text-text-muted leading-relaxed">Save time with practical AI tools.</p>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-accent uppercase tracking-wider block">Built For</span>
            <h3 className="font-heading text-[15px] font-black text-text-primary leading-tight">Sales Teams</h3>
            <p className="text-xs text-text-muted leading-relaxed">Track opportunities and close more deals.</p>
          </div>
        </div>
      </div>

    </section>
  );
}
