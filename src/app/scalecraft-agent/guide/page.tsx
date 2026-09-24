'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
  Terminal, Key, Smartphone, FileText, Settings, 
  ArrowLeft, CheckCircle2, AlertTriangle, ExternalLink, 
  HelpCircle, Copy, Check, Info, ShieldCheck
} from 'lucide-react';

export default function SetupGuidePage() {
  return (
    <Suspense fallback={
      <div style={{ background: '#0a0f0d', color: '#e8f5ee', minHeight: '100vh', padding: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#aeaca5', fontSize: '15px' }}>
          Loading Setup Guide...
        </div>
      </div>
    }>
      <SetupGuideContent />
    </Suspense>
  );
}

function SetupGuideContent() {
  const [copiedText, setCopiedText] = useState<string | null>(null);
  
  const searchParams = useSearchParams();
  const initialKey = searchParams?.get('key') || '';

  const [form, setForm] = useState({
    key: initialKey,
    geminiKey: '',
    agentName: '',
    bizName: '',
    products: '',
    pricing: '',
    website: '',
    teamNum: ''
  });

  useEffect(() => {
    if (initialKey) {
      setForm(prev => ({ ...prev, key: initialKey }));
    }
  }, [initialKey]);

  const handleInputChange = (field: string, value: string) => {
    setForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Interactive checklist state
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({
    reqs: false,
    step1: false,
    step2: false,
    step3: false,
    step4: false,
    step5: false,
  });

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const toggleStep = (stepId: string) => {
    setCompletedSteps(prev => ({
      ...prev,
      [stepId]: !prev[stepId]
    }));
  };

  return (
    <div style={{ background: '#0a0f0d', color: '#e8f5ee', minHeight: '100vh', paddingBottom: '80px' }} className="font-body">
      {/* Top Navbar */}
      <nav style={{ borderBottom: '1px solid rgba(232, 245, 238, 0.1)', padding: '20px 24px', position: 'sticky', top: 0, zIndex: 100, background: 'rgba(10, 15, 13, 0.9)', backdropFilter: 'blur(10px)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/scalecraft-agent" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#aeaca5', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }} className="hover:text-white transition-colors">
            <ArrowLeft size={16} />
            Back to Agent Page
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ background: 'rgba(0, 85, 255, 0.15)', color: '#0055ff', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', padding: '4px 12px', borderRadius: '999px', border: '1px solid rgba(0, 85, 255, 0.3)' }}>
              Setup Guide
            </span>
          </div>
        </div>
      </nav>

      {/* Hero Banner */}
      <div style={{ borderBottom: '1px solid rgba(232, 245, 238, 0.05)', padding: '60px 24px 40px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <h1 style={{ fontFamily: 'var(--font-heading), "Outfit", sans-serif', fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 900, letterSpacing: '-1.5px', color: '#ffffff', marginBottom: '16px' }}>
            ScaleCraft Agent Setup Guide
          </h1>
          <p style={{ color: '#aeaca5', fontSize: '16px', maxWidth: '600px', margin: '0 auto' }}>
            Follow this step-by-step walkthrough to deploy your WhatsApp AI Sales Agent in under 2 hours. No coding required.
          </p>
        </div>
      </div>

      {/* Main Layout Container */}
      <div style={{ maxWidth: '800px', margin: '40px auto 0', padding: '0 24px' }}>
        
        {/* Main Content Area */}
        <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
          
          {/* Quick Summary Card */}
          <div style={{ background: '#0d1512', border: '1px solid rgba(232, 245, 238, 0.08)', borderRadius: '24px', padding: '24px', marginBottom: '32px', display: 'flex', alignItems: 'start', gap: '16px' }}>
            <Info className="text-[#0055ff] shrink-0" size={24} style={{ marginTop: '2px' }} />
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff', marginBottom: '6px' }}>What You&apos;re Building</h3>
              <p style={{ fontSize: '14px', color: '#aeaca5', margin: 0, lineHeight: 1.6 }}>
                A WhatsApp AI agent that replies to leads 24/7 instantly, transcribes voice notes, handles sales objections naturally using Google Gemini, and transfers high-intent leads to your personal number.
              </p>
            </div>
          </div>

          {/* Checklist & Pre-requisites */}
          <section style={{ marginBottom: '48px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', borderBottom: '1px solid rgba(232, 245, 238, 0.1)', paddingBottom: '10px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldCheck className="text-[#059669]" /> Before You Begin
            </h2>
            
            <div style={{ display: 'grid', gap: '16px' }}>
              <div 
                onClick={() => toggleStep('reqs')}
                style={{ 
                  background: completedSteps.reqs ? 'rgba(5, 150, 105, 0.05)' : '#0d1512', 
                  border: completedSteps.reqs ? '1px solid rgba(5, 150, 105, 0.3)' : '1px solid rgba(232, 245, 238, 0.05)',
                  borderRadius: '16px', padding: '20px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'start', gap: '16px' 
                }}
              >
                <div style={{ width: '20px', height: '20px', border: '2px solid', borderColor: completedSteps.reqs ? '#059669' : '#aeaca5', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyItems: 'center', flexShrink: 0, marginTop: '2px' }}>
                  {completedSteps.reqs && <CheckCircle2 size={16} className="text-[#059669]" style={{ margin: 'auto' }} />}
                </div>
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: 700, color: completedSteps.reqs ? '#ffffff' : '#e8f5ee', marginBottom: '8px' }}>
                    Gather Checklist Requirements
                  </h4>
                  <ul style={{ fontSize: '13.5px', color: '#aeaca5', paddingLeft: '20px', margin: 0, display: 'grid', gap: '6px' }}>
                    <li>A VPS or server running <strong>Ubuntu 20+</strong> or <strong>macOS 12+</strong> (AWS Lightsail (Mumbai), or DigitalOcean work great).</li>
                    <li>A <strong>Google account</strong> to get a free Gemini API Key.</li>
                    <li>A <strong>dedicated WhatsApp number</strong> not active on WhatsApp elsewhere (spare SIM or spare number).</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Step 1 */}
          <section style={{ marginBottom: '48px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', borderBottom: '1px solid rgba(232, 245, 238, 0.1)', paddingBottom: '10px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ background: '#0055ff', color: 'white', borderRadius: '50%', width: '28px', height: '28px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 900 }}>1</span>
              Run the One-Command Installer
            </h2>
            <p style={{ color: '#aeaca5', fontSize: '14.5px', marginBottom: '16px' }}>
              Log into your Linux VPS or open the Terminal on your Mac and execute the main installation script:
            </p>

            {/* Interactive Questions Form */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px', background: '#0d1512', padding: '24px', borderRadius: '16px', border: '1px solid rgba(232, 245, 238, 0.05)' }}>
              <h3 style={{ gridColumn: '1 / -1', margin: '0 0 8px 0', fontSize: '15px', fontWeight: 800, color: '#ffffff', borderBottom: '1px solid rgba(232, 245, 238, 0.1)', paddingBottom: '8px' }}>
                🤖 Step 1a: Custom Command Generator
              </h3>
              
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#aeaca5', textTransform: 'uppercase', letterSpacing: '0.05em' }}>License Key</label>
                <input 
                  type="text" 
                  value={form.key} 
                  onChange={(e) => handleInputChange('key', e.target.value)} 
                  placeholder="SCA-XXXXX-XXXXX"
                  style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(232, 245, 238, 0.1)', borderRadius: '8px', padding: '10px 12px', color: '#e8f5ee', fontSize: '13.5px', width: '100%', outline: 'none', fontFamily: 'inherit', marginTop: '6px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#aeaca5', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gemini API Key</label>
                <input 
                  type="text" 
                  value={form.geminiKey} 
                  onChange={(e) => handleInputChange('geminiKey', e.target.value)} 
                  placeholder="AIzaSy... or AQ.Ab..."
                  style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(232, 245, 238, 0.1)', borderRadius: '8px', padding: '10px 12px', color: '#e8f5ee', fontSize: '13.5px', width: '100%', outline: 'none', fontFamily: 'inherit', marginTop: '6px' }}
                />
                <span style={{ fontSize: '11px', color: '#6f6e69', marginTop: '4px', display: 'block' }}>
                  Get a free key at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" style={{ color: '#0055ff', textDecoration: 'underline' }}>Google AI Studio</a>
                </span>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#aeaca5', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Agent Name</label>
                <input 
                  type="text" 
                  value={form.agentName} 
                  onChange={(e) => handleInputChange('agentName', e.target.value)} 
                  placeholder="e.g. Meera"
                  style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(232, 245, 238, 0.1)', borderRadius: '8px', padding: '10px 12px', color: '#e8f5ee', fontSize: '13.5px', width: '100%', outline: 'none', fontFamily: 'inherit', marginTop: '6px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#aeaca5', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Business Name</label>
                <input 
                  type="text" 
                  value={form.bizName} 
                  onChange={(e) => handleInputChange('bizName', e.target.value)} 
                  placeholder="e.g. ScaleCraft"
                  style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(232, 245, 238, 0.1)', borderRadius: '8px', padding: '10px 12px', color: '#e8f5ee', fontSize: '13.5px', width: '100%', outline: 'none', fontFamily: 'inherit', marginTop: '6px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#aeaca5', textTransform: 'uppercase', letterSpacing: '0.05em' }}>What do you sell?</label>
                <input 
                  type="text" 
                  value={form.products} 
                  onChange={(e) => handleInputChange('products', e.target.value)} 
                  placeholder="e.g. organic soaps, cleaning service"
                  style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(232, 245, 238, 0.1)', borderRadius: '8px', padding: '10px 12px', color: '#e8f5ee', fontSize: '13.5px', width: '100%', outline: 'none', fontFamily: 'inherit', marginTop: '6px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#aeaca5', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Price Range</label>
                <input 
                  type="text" 
                  value={form.pricing} 
                  onChange={(e) => handleInputChange('pricing', e.target.value)} 
                  placeholder="e.g. ₹299-₹2999"
                  style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(232, 245, 238, 0.1)', borderRadius: '8px', padding: '10px 12px', color: '#e8f5ee', fontSize: '13.5px', width: '100%', outline: 'none', fontFamily: 'inherit', marginTop: '6px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#aeaca5', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Website (Optional)</label>
                <input 
                  type="text" 
                  value={form.website} 
                  onChange={(e) => handleInputChange('website', e.target.value)} 
                  placeholder="e.g. https://mybusiness.com"
                  style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(232, 245, 238, 0.1)', borderRadius: '8px', padding: '10px 12px', color: '#e8f5ee', fontSize: '13.5px', width: '100%', outline: 'none', fontFamily: 'inherit', marginTop: '6px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#aeaca5', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Team WhatsApp (hot leads routing)</label>
                <input 
                  type="text" 
                  value={form.teamNum} 
                  onChange={(e) => handleInputChange('teamNum', e.target.value)} 
                  placeholder="e.g. +91 98765 43210"
                  style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(232, 245, 238, 0.1)', borderRadius: '8px', padding: '10px 12px', color: '#e8f5ee', fontSize: '13.5px', width: '100%', outline: 'none', fontFamily: 'inherit', marginTop: '6px' }}
                />
              </div>
            </div>

            {/* Generated Code block */}
            <h3 style={{ fontSize: '14.5px', fontWeight: 800, color: '#ffffff', marginBottom: '8px' }}>
              Step 1 - Run installer (automated)
            </h3>
            <p style={{ color: '#aeaca5', fontSize: '13.5px', marginBottom: '12px' }}>
              Run this pre-filled command in your terminal to set up the agent automatically with no interactive prompts:
            </p>

            <div style={{ background: '#111110', border: '1px solid rgba(232, 245, 238, 0.1)', borderRadius: '12px', padding: '16px', paddingRight: '90px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', fontFamily: 'monospace', fontSize: '13px', color: '#34d399', marginBottom: '24px', overflowX: 'auto', position: 'relative' }}>
              <code style={{ whiteSpace: 'pre', textAlign: 'left', display: 'block' }}>
                {`curl -fsSL https://thescalecraft.in/agent/install.sh | bash -s -- \\
  --key ${form.key || 'YOUR_LICENSE_KEY'} \\
  --gemini-key ${form.geminiKey || 'YOUR_GEMINI_KEY'} \\
  --agent-name "${form.agentName || 'Arjun'}" \\
  --biz-name "${form.bizName || 'My Business'}" \\
  --products "${form.products || 'our services'}" \\
  --pricing "${form.pricing || 'varies'}"${form.website ? ` \\\n  --website "${form.website}"` : ''} \\
  --team-num "${form.teamNum || '+91 80780 04732'}"`}
              </code>
              <button 
                onClick={() => handleCopy(`curl -fsSL https://thescalecraft.in/agent/install.sh | bash -s -- \\\n  --key ${form.key || 'YOUR_LICENSE_KEY'} \\\n  --gemini-key ${form.geminiKey || 'YOUR_GEMINI_KEY'} \\\n  --agent-name "${form.agentName || 'Arjun'}" \\\n  --biz-name "${form.bizName || 'My Business'}" \\\n  --products "${form.products || 'our services'}" \\\n  --pricing "${form.pricing || 'varies'}"${form.website ? ` \\\n  --website "${form.website}"` : ''} \\\n  --team-num "${form.teamNum || '+91 80780 04732'}"`, 'cmd')}
                style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#aeaca5', padding: '8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', position: 'absolute', right: '16px', top: '16px' }}
                className="hover:bg-white/10 hover:text-white"
              >
                {copiedText === 'cmd' ? <Check size={14} className="text-[#059669]" /> : <Copy size={14} />}
                {copiedText === 'cmd' ? 'Copied' : 'Copy'}
              </button>
            </div>

            <h3 style={{ fontSize: '14.5px', fontWeight: 800, color: '#ffffff', marginBottom: '8px' }}>
              Step 2 - Connect WhatsApp (run after installer completes)
            </h3>
            <p style={{ color: '#aeaca5', fontSize: '13.5px', marginBottom: '12px' }}>
              Once the automated installation completes, connect your WhatsApp number by running:
            </p>

            <div style={{ background: '#0d1512', borderRadius: '16px', padding: '20px', border: '1px solid rgba(232, 245, 238, 0.05)', marginBottom: '24px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>What the installer script does:</h4>
              <ol style={{ fontSize: '13.5px', color: '#aeaca5', paddingLeft: '20px', margin: 0, display: 'grid', gap: '6px' }}>
                <li>Installs necessary dependencies (Node.js, python3-venv, git, ffmpeg).</li>
                <li>Installs the Hermes AI bot runner engine.</li>
                <li>Pre-configures all configuration files non-interactively using your license and Gemini keys.</li>
                <li>Installs speech-to-text voice message transcription support.</li>
              </ol>
            </div>
          </section>

          {/* Step 2 */}
          <section style={{ marginBottom: '48px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', borderBottom: '1px solid rgba(232, 245, 238, 0.1)', paddingBottom: '10px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ background: '#0055ff', color: 'white', borderRadius: '50%', width: '28px', height: '28px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 900 }}>2</span>
              Reload your shell
            </h2>
            <p style={{ color: '#aeaca5', fontSize: '14.5px', marginBottom: '16px' }}>
              Apply the newly installed path configurations to your current shell session:
            </p>

            <div style={{ background: '#111110', border: '1px solid rgba(232, 245, 238, 0.1)', borderRadius: '12px', padding: '16px', paddingRight: '90px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', fontFamily: 'monospace', fontSize: '13px', color: '#34d399', marginBottom: '24px', overflowX: 'auto', position: 'relative' }}>
              <code style={{ whiteSpace: 'pre', textAlign: 'left', display: 'block' }}>
                {`source ~/.bashrc`}
              </code>
              <button 
                onClick={() => handleCopy(`source ~/.bashrc`, 'reload_shell')}
                style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#aeaca5', padding: '8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', position: 'absolute', right: '16px', top: '16px' }}
                className="hover:bg-white/10 hover:text-white"
              >
                {copiedText === 'reload_shell' ? <Check size={14} className="text-[#059669]" /> : <Copy size={14} />}
                {copiedText === 'reload_shell' ? 'Copied' : 'Copy'}
              </button>
            </div>
          </section>

          {/* Step 3 */}
          <section style={{ marginBottom: '48px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', borderBottom: '1px solid rgba(232, 245, 238, 0.1)', paddingBottom: '10px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ background: '#0055ff', color: 'white', borderRadius: '50%', width: '28px', height: '28px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 900 }}>3</span>
              Connect WhatsApp (shows QR code)
            </h2>
            <p style={{ color: '#aeaca5', fontSize: '14.5px', marginBottom: '16px' }}>
              Connect your WhatsApp number by running the command below. When the QR code appears, scan it with your bot phone:
            </p>

            <div style={{ background: '#111110', border: '1px solid rgba(232, 245, 238, 0.1)', borderRadius: '12px', padding: '16px', paddingRight: '90px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', fontFamily: 'monospace', fontSize: '13px', color: '#34d399', marginBottom: '24px', overflowX: 'auto', position: 'relative' }}>
              <code style={{ whiteSpace: 'pre', textAlign: 'left', display: 'block' }}>
                {`echo "N" | hermes whatsapp`}
              </code>
              <button 
                onClick={() => handleCopy(`echo "N" | hermes whatsapp`, 'connect_wa')}
                style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#aeaca5', padding: '8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', position: 'absolute', right: '16px', top: '16px' }}
                className="hover:bg-white/10 hover:text-white"
              >
                {copiedText === 'connect_wa' ? <Check size={14} className="text-[#059669]" /> : <Copy size={14} />}
                {copiedText === 'connect_wa' ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p style={{ color: '#aeaca5', fontSize: '14px', marginTop: '12px' }}>
              Scan QR code flow:
              <br />
              <strong style={{ color: '#ffffff' }}>WhatsApp → Settings → Linked Devices → Link a Device → Scan QR</strong>
            </p>
          </section>

          {/* Step 4 */}
          <section style={{ marginBottom: '48px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', borderBottom: '1px solid rgba(232, 245, 238, 0.1)', paddingBottom: '10px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ background: '#0055ff', color: 'white', borderRadius: '50%', width: '28px', height: '28px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 900 }}>4</span>
              Start your agent
            </h2>
            <p style={{ color: '#aeaca5', fontSize: '14.5px', marginBottom: '16px' }}>
              After scanning the QR code, restart the gateway service to spin up your bot in the background:
            </p>

            <div style={{ background: '#111110', border: '1px solid rgba(232, 245, 238, 0.1)', borderRadius: '12px', padding: '16px', paddingRight: '90px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', fontFamily: 'monospace', fontSize: '13px', color: '#34d399', marginBottom: '24px', overflowX: 'auto', position: 'relative' }}>
              <code style={{ whiteSpace: 'pre', textAlign: 'left', display: 'block' }}>
                {`hermes gateway restart`}
              </code>
              <button 
                onClick={() => handleCopy(`hermes gateway restart`, 'restart_gateway')}
                style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#aeaca5', padding: '8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', position: 'absolute', right: '16px', top: '16px' }}
                className="hover:bg-white/10 hover:text-white"
              >
                {copiedText === 'restart_gateway' ? <Check size={14} className="text-[#059669]" /> : <Copy size={14} />}
                {copiedText === 'restart_gateway' ? 'Copied' : 'Copy'}
              </button>
            </div>
          </section>

          {/* Step 5 */}
          <section style={{ marginBottom: '48px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', borderBottom: '1px solid rgba(232, 245, 238, 0.1)', paddingBottom: '10px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ background: '#0055ff', color: 'white', borderRadius: '50%', width: '28px', height: '28px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 900 }}>5</span>
              Test it
            </h2>
            <p style={{ color: '#aeaca5', fontSize: '14.5px', marginBottom: '16px' }}>
              Confirm your bot is active and listening:
            </p>
            <div style={{ background: '#0d1512', border: '1px solid rgba(232, 245, 238, 0.05)', borderRadius: '16px', padding: '24px' }}>
              <p style={{ margin: 0, fontSize: '14.5px', color: '#e8f5ee' }}>
                Send <strong style={{ color: '#34d399' }}>"Hi"</strong> from any other phone to your bot WhatsApp number. It should reply instantly!
              </p>
            </div>
          </section>

          {/* Configure Personality */}
          <section style={{ marginBottom: '48px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', borderBottom: '1px solid rgba(232, 245, 238, 0.1)', paddingBottom: '10px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Settings className="text-[#0055ff]" /> Configure Personality (`SOUL.md`)
            </h2>
            <p style={{ color: '#aeaca5', fontSize: '14.5px', marginBottom: '16px' }}>
              Your agent&apos;s rules, prices, tone of voice, and guidelines are defined in one markdown file.
            </p>

            <div style={{ background: '#0d1512', border: '1px solid rgba(232, 245, 238, 0.05)', borderRadius: '16px', padding: '24px', marginBottom: '16px' }}>
              <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#e8f5ee' }}>
                To customize your agent&apos;s replies and instructions, edit the personality file:
              </p>
              <div style={{ background: '#111110', border: '1px solid rgba(232, 245, 238, 0.1)', borderRadius: '8px', padding: '12px', fontFamily: 'monospace', fontSize: '13px', color: '#34d399', marginBottom: '16px' }}>
                nano ~/.hermes/SOUL.md
              </div>
              <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#e8f5ee' }}>
                After modifying `SOUL.md`, restart the gateway engine to apply changes:
              </p>
              <div style={{ background: '#111110', border: '1px solid rgba(232, 245, 238, 0.1)', borderRadius: '8px', padding: '12px', fontFamily: 'monospace', fontSize: '13px', color: '#34d399' }}>
                hermes gateway restart
              </div>
            </div>
          </section>

          {/* Gemini API Key Guide */}
          <section style={{ marginBottom: '48px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', borderBottom: '1px solid rgba(232, 245, 238, 0.1)', paddingBottom: '10px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Key className="text-[#0055ff]" /> Generate Google Gemini API Key
            </h2>
            <p style={{ color: '#aeaca5', fontSize: '14.5px', marginBottom: '16px' }}>
              Gemini 2.5 Flash is incredibly fast, cheap, and handles language naturally. Here is how to link it:
            </p>

            <div style={{ background: '#0d1512', border: '1px solid rgba(232, 245, 238, 0.05)', borderRadius: '16px', padding: '24px', display: 'grid', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'start' }}>
                <span style={{ color: '#0055ff', fontWeight: 800, fontSize: '14px' }}>01.</span>
                <p style={{ margin: 0, fontSize: '14px', color: '#e8f5ee' }}>
                  Open Google AI Studio at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" style={{ color: '#0055ff', textDecoration: 'underline' }}>aistudio.google.com/apikey <ExternalLink size={12} style={{ display: 'inline' }} /></a>.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'start' }}>
                <span style={{ color: '#0055ff', fontWeight: 800, fontSize: '14px' }}>02.</span>
                <p style={{ margin: 0, fontSize: '14px', color: '#e8f5ee' }}>
                  Click the **Create API Key** button.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'start' }}>
                <span style={{ color: '#0055ff', fontWeight: 800, fontSize: '14px' }}>03.</span>
                <p style={{ margin: 0, fontSize: '14px', color: '#e8f5ee' }}>
                  Copy the generated key and paste it when prompted in your server terminal.
                </p>
              </div>
            </div>
          </section>

          {/* Useful commands */}
          <section style={{ marginBottom: '48px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', borderBottom: '1px solid rgba(232, 245, 238, 0.1)', paddingBottom: '10px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Settings className="text-[#0055ff]" /> Handy Terminal Commands
            </h2>
            
            <div style={{ background: '#0d1512', border: '1px solid rgba(232, 245, 238, 0.05)', borderRadius: '16px', padding: '24px', display: 'grid', gap: '16px' }}>
              <div>
                <p style={{ margin: '0 0 6px 0', fontSize: '13.5px', fontWeight: 700, color: '#ffffff' }}>Check status:</p>
                <div style={{ background: '#111110', padding: '10px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '12.5px', color: '#34d399' }}>
                  hermes gateway status
                </div>
              </div>
              <div>
                <p style={{ margin: '0 0 6px 0', fontSize: '13.5px', fontWeight: 700, color: '#ffffff' }}>Restart service:</p>
                <div style={{ background: '#111110', padding: '10px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '12.5px', color: '#34d399' }}>
                  hermes gateway restart
                </div>
              </div>
              <div>
                <p style={{ margin: '0 0 6px 0', fontSize: '13.5px', fontWeight: 700, color: '#ffffff' }}>View live debug logs:</p>
                <div style={{ background: '#111110', padding: '10px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '12.5px', color: '#34d399' }}>
                  journalctl --user -u hermes-gateway -f
                </div>
              </div>
            </div>
          </section>

          {/* Troubleshooting */}
          <section style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', borderBottom: '1px solid rgba(232, 245, 238, 0.1)', paddingBottom: '10px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertTriangle className="text-[#eab308]" /> Troubleshooting
            </h2>

            <div style={{ display: 'grid', gap: '16px' }}>
              <div style={{ background: '#0d1512', border: '1px solid rgba(232, 245, 238, 0.05)', borderRadius: '16px', padding: '20px' }}>
                <h4 style={{ fontSize: '14.5px', fontWeight: 700, color: '#ffffff', marginBottom: '6px' }}>
                  Agent is not responding to chats
                </h4>
                <p style={{ fontSize: '13.5px', color: '#aeaca5', margin: 0 }}>
                  Verify that the gateway is running by executing `hermes gateway status`. If it isn&apos;t, trigger `hermes gateway restart`. If it still fails, scan the logs for API errors using the `journalctl` command above.
                </p>
              </div>
              
              <div style={{ background: '#0d1512', border: '1px solid rgba(232, 245, 238, 0.05)', borderRadius: '16px', padding: '20px' }}>
                <h4 style={{ fontSize: '14.5px', fontWeight: 700, color: '#ffffff', marginBottom: '6px' }}>
                  WhatsApp pairing disconnected
                </h4>
                <p style={{ fontSize: '13.5px', color: '#aeaca5', margin: 0 }}>
                  Run `hermes whatsapp` in your shell terminal. This will spawn a new QR code that you can scan from your bot phone to re-link.
                </p>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
