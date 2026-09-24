'use client';

import { useState } from 'react';
import { 
  Layout, 
  KanbanSquare, 
  Send, 
  Bot, 
  Copy, 
  Check,
  FolderOpen,
  Mail,
  FileText,
  Database,
  Sparkles,
  Calendar,
  BarChart3,
  Wrench,
  Zap
} from 'lucide-react';

export default function SeeBeforeYouBuy() {
  const [activeTab, setActiveTab] = useState<'notion' | 'crm' | 'outreach' | 'prompt'>('notion');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Outreach widget states
  const [niche, setNiche] = useState('SaaS / Tech startup');
  const [clientName, setClientName] = useState('Rahul');
  const [service, setService] = useState('UI/UX redesign');

  // CRM widget states
  const [leadStage, setLeadStage] = useState<number>(2); // 0: Lead, 1: Contacted, 2: Replied, 3: Signed

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 1500);
  };

  // Outreach custom template generator (Low Friction Opener from Notion template)
  const generatedScript = `Hey ${clientName || 'there'} 👋

Came across your page and genuinely love the aesthetic of your business.

I help ${niche || 'brands'} get more clients and bookings using ${service || 'AI content systems'} — quick question, are you currently doing anything with social media or has it been a bit quiet lately?

No hard pitch, just curious 🙂`;

  const prompts = [
    {
      id: 'personalize',
      name: 'Personalize My Outreach (Real Prompt)',
      prompt: `Act as an expert business development coach. I will provide you with a prospect's LinkedIn post or recent news about their company.\n\nYour task is to:\n1. Identify the pain point or achievement.\n2. Draft a 2-sentence personalized opener that feels human.\n3. Transition smoothly into my offer: [Insert Your Offer Here].`
    },
    {
      id: 'objection',
      name: 'Objection Handler (Real Prompt)',
      prompt: `The prospect just replied with: "[Insert Objection]"\n\nGenerate 3 different responses:\n- One that is empathetic and soft.\n- One that is data-driven and results-focused.\n- One that is a "breakup" style message to see if they are still interested.\n\nMy service: [Insert Service]`
    }
  ];

  return (
    <section className="px-6 md:px-10 py-12 md:py-16 max-w-[1100px] mx-auto border-t border-border-primary scroll-mt-20" id="sandbox">
      <div className="max-w-[720px] mb-12">
        <span className="text-[11px] font-bold text-accent tracking-[0.15em] uppercase mb-2.5 block">
          INTERACTIVE CENTERPIECE
        </span>
        <h2 className="font-heading text-clamp-h2 font-black leading-tight text-text-primary mb-4">
          Inside the system. <em className="italic-accent">Explore the workspace.</em>
        </h2>
        <p className="text-[15.5px] text-text-muted leading-relaxed">
          We don&apos;t hide our workspaces behind abstract graphics. Click through the tabs below to preview the exact Notion databases, pipeline trackers, and templates you will receive after checkout.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8 items-start">
        
        {/* Sidebar Selector */}
        <div className="flex lg:flex-col gap-2 overflow-x-auto pb-3 lg:pb-0 scrollbar-none shrink-0 w-full">
          {[
            { id: 'notion', label: 'Notion Dashboard', icon: Layout },
            { id: 'crm', label: 'Lead CRM Board', icon: KanbanSquare },
            { id: 'outreach', label: 'Outreach Customizer', icon: Send },
            { id: 'prompt', label: 'AI Prompt Library', icon: Bot },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-[13px] font-bold text-left transition-all shrink-0 cursor-pointer w-full justify-start ${
                  isActive
                    ? 'bg-foreground text-white shadow-md'
                    : 'bg-bg-secondary text-text-muted hover:text-foreground border border-border-primary/80'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Sandbox Board Container - Enlarged Centerpiece */}
        <div className="bg-bg-secondary border border-border-primary rounded-[24px] p-6 md:p-8 min-h-[460px] flex flex-col justify-between shadow-premium relative">
          
          {/* Label indicating authenticity */}
          <div className="absolute top-4 right-6 text-[10px] font-extrabold text-accent flex items-center gap-1.5 uppercase tracking-wider bg-accent/5 px-2.5 py-1 rounded-full select-none border border-accent/10">
            <Zap className="w-3 h-3 fill-current" />
            <span>This is exactly what you&apos;ll receive</span>
          </div>

          {/* TAB 1: NOTION WORKSPACE */}
          {activeTab === 'notion' && (
            <div className="space-y-6 animate-in fade-in duration-200 w-full pt-4">
              <div className="border border-border-dark rounded-xl bg-white overflow-hidden shadow-sm">
                {/* Browser Top Bar */}
                <div className="bg-bg-secondary border-b border-border-primary px-4 py-2.5 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 bg-red-400 rounded-full"></span>
                    <span className="w-2.5 h-2.5 bg-yellow-400 rounded-full"></span>
                    <span className="w-2.5 h-2.5 bg-green rounded-full"></span>
                  </div>
                  <div className="bg-white border border-border-primary rounded-md px-4 py-0.5 text-[10px] text-text-light text-center w-full max-w-[340px] mx-auto truncate font-mono">
                    Notion / ScaleCraft Freelancer Blueprint
                  </div>
                </div>
                {/* Notion Layout Grid */}
                <div className="grid grid-cols-[160px_1fr] md:grid-cols-[200px_1fr] h-[320px] text-left text-xs font-sans text-text-primary">
                  {/* Sidebar */}
                  <div className="bg-[#FAF9F6] border-r border-border-primary p-3.5 space-y-4 select-none hidden sm:block">
                    <div className="font-extrabold text-[10px] text-text-light uppercase tracking-wider">Workspace Pages</div>
                    <nav className="space-y-1.5 select-none text-[11px] font-bold text-text-muted">
                      <div className="bg-accent/5 text-accent font-black px-2 py-2 rounded-lg cursor-pointer flex items-center gap-2">
                        <FolderOpen className="w-4 h-4 text-accent shrink-0" />
                        <span>Start Here &amp; Guide</span>
                      </div>
                      <div className="px-2 py-2 rounded-lg hover:bg-border-primary/60 cursor-pointer flex items-center gap-2">
                        <Mail className="w-4 h-4 shrink-0" />
                        <span>Outreach Vault</span>
                      </div>
                      <div className="px-2 py-2 rounded-lg hover:bg-border-primary/60 cursor-pointer flex items-center gap-2">
                        <FileText className="w-4 h-4 shrink-0" />
                        <span>Proposal Builder</span>
                      </div>
                      <div className="px-2 py-2 rounded-lg hover:bg-border-primary/60 cursor-pointer flex items-center gap-2">
                        <Bot className="w-4 h-4 shrink-0" />
                        <span>AI Prompts Hub</span>
                      </div>
                      <div className="px-2 py-2 rounded-lg hover:bg-border-primary/60 cursor-pointer flex items-center gap-2">
                        <Database className="w-4 h-4 shrink-0" />
                        <span>Lead Pipeline Tracker</span>
                      </div>
                    </nav>
                  </div>
                  {/* Main Notion Screen */}
                  <div className="p-6 overflow-y-auto space-y-5 select-none bg-[#FCFCFB]">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-accent/5 flex items-center justify-center text-accent shrink-0">
                        <Sparkles className="w-6 h-6 fill-current text-accent" />
                      </div>
                      <div>
                        <h4 className="font-heading text-lg font-black text-text-primary leading-tight">ScaleCraft Client System</h4>
                        <p className="text-[11px] text-text-muted leading-tight">Duplicate this template directly to duplicate your CRM &amp; vault</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="border border-border-primary rounded-xl p-4 bg-white hover:border-accent hover:shadow-xs transition-all cursor-pointer flex items-start gap-3">
                        <Calendar className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                        <div>
                          <div className="font-bold text-[12px] text-text-primary mb-1">7-Day Challenge</div>
                          <div className="text-[10px] text-text-muted leading-normal">Outbound campaign schedule to trigger rapid replies.</div>
                        </div>
                      </div>
                      <div className="border border-border-primary rounded-xl p-4 bg-white hover:border-accent hover:shadow-xs transition-all cursor-pointer flex items-start gap-3">
                        <KanbanSquare className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                        <div>
                          <div className="font-bold text-[12px] text-text-primary mb-1">Pipeline Board</div>
                          <div className="text-[10px] text-text-muted leading-normal">Interactive deal tracker with custom CRM parameters.</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-[13px] text-text-muted leading-relaxed flex items-center gap-2">
                <Sparkles className="w-4.5 h-4.5 text-green shrink-0" />
                <span>Runs entirely on the free tier of Notion. Zero configuration required. Ready to duplicate.</span>
              </p>
            </div>
          )}

          {/* TAB 2: CRM TRACKER BOARD */}
          {activeTab === 'crm' && (
            <div className="space-y-6 animate-in fade-in duration-200 w-full pt-4">
              <div className="border border-border-dark rounded-xl bg-white overflow-hidden shadow-sm">
                {/* CRM Headers */}
                <div className="bg-[#FAF9F6] border-b border-border-primary px-4 py-3 flex items-center justify-between">
                  <span className="font-heading text-xs font-black text-text-primary flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-accent" />
                    <span>Master Deal Tracking Database</span>
                  </span>
                  <span className="text-[10px] text-text-muted font-bold bg-white px-3 py-1 rounded-full border border-border-primary uppercase tracking-wider">
                    Kanban View
                  </span>
                </div>
                {/* Kanban stages */}
                <div className="p-4 grid grid-cols-4 gap-3 text-left font-sans text-xs">
                  {[
                    { label: 'Leads Sourced', color: 'bg-text-light' },
                    { label: 'Outreach Sent', color: 'bg-accent' },
                    { label: 'Replied (Hot)', color: 'bg-yellow-400' },
                    { label: 'Retainer Signed', color: 'bg-green' }
                  ].map((stage, idx) => (
                    <div key={idx} className="bg-bg-secondary rounded-xl p-3 min-h-[160px] space-y-2.5 relative border border-border-primary">
                      <div className="flex items-center justify-between pb-1.5 border-b border-border-primary/50">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className={`w-2 h-2 rounded-full ${stage.color} shrink-0`}></span>
                          <span className="font-bold text-[10.5px] truncate">{stage.label}</span>
                        </div>
                      </div>
                      
                      {leadStage === idx && (
                        <div className="bg-white border border-border-dark rounded-lg p-3 shadow-xs space-y-2 cursor-pointer animate-fade-in hover:border-accent">
                          <div className="font-bold text-[11px] text-text-primary leading-tight">Aarav (AgriTech Store)</div>
                          <div className="flex items-center justify-between mt-1.5">
                            <span className="text-[9.5px] bg-green-bg text-green px-1.5 py-0.5 rounded font-bold">₹15,000 / mo</span>
                            <span className="text-[9px] text-text-light font-mono">Outreach #1</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Progress controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-text-muted font-bold uppercase tracking-wider">Advance Stage:</span>
                  <div className="flex gap-1.5">
                    {[0, 1, 2, 3].map((val) => (
                      <button
                        key={val}
                        onClick={() => setLeadStage(val)}
                        className={`w-8 h-8 rounded-lg text-xs font-black flex items-center justify-center border cursor-pointer transition-all ${
                          leadStage === val
                            ? 'bg-accent text-white border-accent shadow-xs'
                            : 'bg-white text-text-muted hover:text-text-primary hover:border-border-dark'
                        }`}
                      >
                        {val + 1}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-[12px] text-text-light italic">
                  Drag, drop, update client values, and log outreach touchpoints.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: OUTREACH GENERATOR */}
          {activeTab === 'outreach' && (
            <div className="space-y-6 animate-in fade-in duration-200 w-full pt-4">
              <div className="grid grid-cols-1 md:grid-cols-[1fr_1.3fr] gap-6 text-left">
                {/* Controls */}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-text-muted uppercase tracking-wider">Client First Name</label>
                    <input 
                      type="text" 
                      value={clientName} 
                      onChange={(e) => setClientName(e.target.value)} 
                      placeholder="e.g. Rahul"
                      className="w-full bg-white border border-border-primary rounded-xl px-3.5 py-2.5 text-xs text-text-primary focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-text-muted uppercase tracking-wider">Client Niche</label>
                    <select
                      value={niche}
                      onChange={(e) => setNiche(e.target.value)}
                      className="w-full bg-white border border-border-primary rounded-xl px-3.5 py-2.5 text-xs text-text-primary focus:outline-none focus:border-accent font-sans"
                    >
                      <option>SaaS / Tech startup</option>
                      <option>D2C Shopify Brand</option>
                      <option>Real Estate Agency</option>
                      <option>Local Dental Clinic</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-text-muted uppercase tracking-wider">Your Main Service Offer</label>
                    <input 
                      type="text" 
                      value={service} 
                      onChange={(e) => setService(e.target.value)} 
                      placeholder="e.g. landing page redesign"
                      className="w-full bg-white border border-border-primary rounded-xl px-3.5 py-2.5 text-xs text-text-primary focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>

                {/* Display Output */}
                <div className="relative">
                  <div className="bg-[#FAF9F6] border border-border-primary rounded-xl p-4 font-mono text-[11px] leading-relaxed text-text-primary h-[220px] overflow-y-auto whitespace-pre-wrap select-text border-t-4 border-t-accent">
                    {generatedScript}
                  </div>
                  <button
                    onClick={() => handleCopy(generatedScript, 'outreach_copy')}
                    className="absolute bottom-3 right-3 bg-white hover:bg-bg-secondary border border-border-dark rounded-lg p-2 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer text-text-primary"
                  >
                    {copiedText === 'outreach_copy' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-green" />
                        <span className="text-green text-[10px]">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span className="text-[10px]">Copy Script</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
              <p className="text-[13px] text-text-muted leading-relaxed flex items-center gap-2">
                <Wrench className="w-4.5 h-4.5 text-accent shrink-0" />
                <span>Custom outreach templates generator based on the word-for-word scripts inside the blueprint.</span>
              </p>
            </div>
          )}

          {/* TAB 4: AI PROMPTS */}
          {activeTab === 'prompt' && (
            <div className="space-y-6 animate-in fade-in duration-200 w-full pt-4">
              <div className="space-y-4">
                {prompts.map((p) => (
                  <div key={p.id} className="bg-white border border-border-primary rounded-xl p-4 text-left relative space-y-2 hover:border-accent transition-colors">
                    <div className="font-heading text-xs font-black text-text-primary">{p.name}</div>
                    <p className="text-[11px] font-mono leading-relaxed text-text-muted select-text pr-20 whitespace-pre-wrap">{p.prompt}</p>
                    <button
                      onClick={() => handleCopy(p.prompt, p.id)}
                      className="absolute top-4 right-4 bg-bg-secondary hover:bg-border-primary/40 rounded-lg p-1.5 text-text-muted hover:text-text-primary transition-all cursor-pointer"
                      aria-label="Copy prompt"
                    >
                      {copiedText === p.id ? (
                        <Check className="w-3.5 h-3.5 text-green" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-[13px] text-text-muted leading-relaxed flex items-center gap-2">
                <Bot className="w-4.5 h-4.5 text-accent shrink-0" />
                <span>Copy-paste prompts optimized for Claude &amp; ChatGPT to research leads and frame personalized value equations.</span>
              </p>
            </div>
          )}

        </div>

      </div>
    </section>
  );
}
