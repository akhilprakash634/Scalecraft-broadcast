'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import BuyButton from '@/components/ui/BuyButton';
import ProductTestimonials from '@/components/product/ProductTestimonials';
import { supabase } from '@/lib/supabase';

export default function ScaleCraftAgentClientPage() {
  const [geoPayment, setGeoPayment] = useState<{
    isIndia: boolean;
    currency: string;
    symbol: string;
    loading: boolean;
  }>({
    isIndia: true,
    currency: 'INR',
    symbol: '₹',
    loading: true,
  });
  const [standardPrice, setStandardPrice] = useState<{ inr: number; usd: number }>({ inr: 2999, usd: 36 });
  const [completePrice, setCompletePrice] = useState<{ inr: number; usd: number }>({ inr: 4999, usd: 40 });
  const [saasPrice, setSaasPrice] = useState<{ inr: number; usd: number }>({ inr: 6499, usd: 79 });
  const [saasMonthlyPrice, setSaasMonthlyPrice] = useState<{ inr: number; usd: number }>({ inr: 1299, usd: 15 });
  const [loadingPrice, setLoadingPrice] = useState<boolean>(true);

  useEffect(() => {
    const fetchProductPrices = async () => {
      try {
        const targetIds = [
          'mOBd3I07NrgTLn79T01oEq',
          '7ca5a08c-6f75-4be5-aa86-d41c2f2d669c',
          'scalecraft-agent-saas'
        ];
        
        const { data: products } = await supabase
          .from('saas_products')
          .select('id, slug, price, setup_price, monthly_price, test_mode, international_price')
          .or('slug.in.(scalecraft-agent,scalecraft-agent-bundle,scalecraft-agent-saas),id.in.(mOBd3I07NrgTLn79T01oEq,7ca5a08c-6f75-4be5-aa86-d41c2f2d669c,scalecraft-agent-saas)');

        if (products && Array.isArray(products)) {
          const standard = products.find(p => p.slug === 'scalecraft-agent' || p.id === 'mOBd3I07NrgTLn79T01oEq');
          const complete = products.find(p => p.slug === 'scalecraft-agent-bundle' || p.id === '7ca5a08c-6f75-4be5-aa86-d41c2f2d669c');
          const saas = products.find(p => p.slug === 'scalecraft-agent-saas' || p.id === 'scalecraft-agent-saas');

          if (standard) {
            setStandardPrice({
              inr: Number(standard.price) || 2999,
              usd: Number(standard.international_price) || 36
            });
          }
          if (complete) {
            setCompletePrice({
              inr: Number(complete.price) || 4999,
              usd: Number(complete.international_price) || 40
            });
          }
          if (saas) {
            const rawSetup = Number(saas.setup_price || saas.price || 6499);
            const rawMonthly = Number(saas.monthly_price || 1299);

            const setupInRupees = saas.test_mode ? 5 : rawSetup;
            const monthlyInRupees = rawMonthly;

            setSaasPrice({
              inr: setupInRupees,
              usd: saas.test_mode ? 1 : (Number(saas.international_price) || Math.round(setupInRupees / 83))
            });
            setSaasMonthlyPrice({
              inr: monthlyInRupees,
              usd: saas.test_mode ? 1 : Math.round(monthlyInRupees / 83)
            });
          }
        }
      } catch (err) {
        console.error('Error fetching product prices from Supabase:', err);
      } finally {
        setLoadingPrice(false);
      }
    };
    fetchProductPrices();
  }, []);

  useEffect(() => {
    const detectGeo = async () => {
      try {
        const urlGeo = new URLSearchParams(window.location.search).get('geo');
        const countryCode = urlGeo?.toUpperCase() || await fetch('/api/geo', {
          signal: AbortSignal.timeout(4000),
        }).then(r => r.json()).then(d => d.country_code);

        const isIndia = countryCode === 'IN';
        setGeoPayment({
          isIndia,
          currency: isIndia ? 'INR' : 'USD',
          symbol: isIndia ? '₹' : '$',
          loading: false,
        });
      } catch {
        setGeoPayment(prev => ({ ...prev, isIndia: true, loading: false }));
      }
    };
    detectGeo();
  }, []);

  return (
    <>
      <style>{`
        .sca-root { font-family: var(--font-body), 'Inter', sans-serif; background: #ffffff; color: #111110; line-height: 1.6; overflow-x: hidden; }
        .sca-hero { padding: 80px 24px 64px; text-align: center; max-width: 760px; margin: 0 auto; }
        .sca-badge { display: inline-flex; align-items: center; gap: 8px; background: #ecfdf5; border: 1px solid #a7f3d0; color: #047857; padding: 6px 16px; border-radius: 999px; font-size: 13px; font-weight: 600; margin-bottom: 28px; }
        .sca-badge-dot { animation: sca-pulse 2s infinite; margin-right: 2px; }
        @keyframes sca-pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.3 } }
        .sca-h1 { font-family: var(--font-heading), 'Outfit', sans-serif; font-size: clamp(32px, 6vw, 58px); font-weight: 900; line-height: 1.1; letter-spacing: -1.5px; color: #111110; margin-bottom: 20px; }
        .sca-h1 span { color: #0055ff; }
        .sca-sub { font-size: 18px; color: #6f6e69; max-width: 540px; margin: 0 auto 36px; line-height: 1.7; }
        .sca-cta-group { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
        .sca-btn-primary { background: #0055ff; color: #ffffff; padding: 16px 36px; border-radius: 10px; font-size: 16px; font-weight: 800; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; transition: transform 0.15s, opacity 0.15s; }
        .sca-btn-primary:hover { transform: translateY(-1px); opacity: 0.95; }
        .sca-btn-secondary { background: transparent; color: #111110; padding: 16px 28px; border-radius: 10px; font-size: 15px; font-weight: 600; text-decoration: none; border: 1px solid #ebebeb; transition: border-color 0.2s; }
        .sca-btn-secondary:hover { border-color: #0055ff; }
        .sca-note { margin-top: 16px; font-size: 13px; color: #6f6e69; }
        .sca-mockup { padding: 24px; max-width: 420px; margin: 48px auto 0; }
        .sca-phone { background: #ffffff; border: 1px solid #ebebeb; border-radius: 20px; overflow: hidden; box-shadow: 0 12px 40px rgba(0,0,0,0.06); }
        .sca-phone-header { background: #128c7e; padding: 14px 18px; display: flex; align-items: center; gap: 12px; }
        .sca-avatar { width: 38px; height: 38px; border-radius: 50%; background: #25d366; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 800; color: #ffffff; }
        .sca-phone-name { font-weight: 700; font-size: 15px; color: #ffffff; }
        .sca-phone-status { font-size: 12px; color: rgba(255,255,255,0.7); }
        .sca-dot { width: 8px; height: 8px; background: #4ade80; border-radius: 50%; display: inline-block; margin-right: 4px; }
        .sca-phone-body { padding: 16px; background: #efeae2; min-height: 300px; display: flex; flex-direction: column; gap: 10px; }
        .sca-msg { max-width: 78%; padding: 10px 14px; border-radius: 12px; font-size: 13.5px; line-height: 1.5; box-shadow: 0 1px 0.5px rgba(0,0,0,0.1); }
        .sca-msg-in { background: #ffffff; color: #111110; border-bottom-left-radius: 3px; align-self: flex-start; }
        .sca-msg-out { background: #d9fdd3; color: #111110; border-bottom-right-radius: 3px; align-self: flex-end; }
        .sca-msg-time { font-size: 10px; color: #667781; display: block; text-align: right; margin-top: 4px; }
        .sca-msg-label { font-size: 10px; font-weight: 700; color: #0b8066; margin-bottom: 3px; display: block; }
        .sca-section { padding: 80px 24px; }
        .sca-container { max-width: 1000px; margin: 0 auto; }
        .sca-label { font-size: 12px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #0055ff; margin-bottom: 14px; }
        .sca-h2 { font-family: var(--font-heading), 'Outfit', sans-serif; font-size: clamp(26px, 4vw, 40px); font-weight: 800; color: #111110; line-height: 1.2; letter-spacing: -0.5px; margin-bottom: 16px; }
        .sca-section-sub { font-size: 16px; color: #6f6e69; max-width: 540px; line-height: 1.7; }
        .sca-features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-top: 48px; }
        .sca-feature-card { background: #f7f7f5; border: 1px solid #ebebeb; border-radius: 14px; padding: 24px; transition: border-color 0.2s; }
        .sca-feature-card:hover { border-color: rgba(0,85,255,0.2); }
        .sca-feature-icon { width: 44px; height: 44px; background: rgba(0,85,255,0.1); color: #0055ff; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 22px; margin-bottom: 16px; }
        .sca-feature-title { font-size: 16px; font-weight: 700; color: #111110; margin-bottom: 8px; }
        .sca-feature-desc { font-size: 14px; color: #6f6e69; line-height: 1.65; }
        .sca-business-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 14px; margin-top: 40px; }
        .sca-business-card { background: #f7f7f5; border: 1px solid #ebebeb; border-radius: 12px; padding: 20px 16px; text-align: center; transition: border-color 0.2s, background 0.2s; }
        .sca-business-card:hover { border-color: rgba(0,85,255,0.2); background: #ffffff; }
        .sca-business-icon { font-size: 28px; margin-bottom: 10px; }
        .sca-business-name { font-size: 13px; font-weight: 600; color: #111110; }
        .sca-steps { margin-top: 48px; display: flex; flex-direction: column; gap: 0; }
        .sca-step { display: flex; gap: 24px; align-items: flex-start; padding: 28px 0; border-bottom: 1px solid #ebebeb; }
        .sca-step:last-child { border-bottom: none; }
        .sca-step-num { width: 44px; height: 44px; background: rgba(0,85,255,0.1); border: 1px solid rgba(0,85,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 800; color: #0055ff; flex-shrink: 0; }
        .sca-step-title { font-size: 17px; font-weight: 700; color: #111110; margin-bottom: 6px; }
        .sca-step-desc { font-size: 14px; color: #6f6e69; line-height: 1.65; }
        .sca-code { background: #f7f7f5; border: 1px solid #ebebeb; border-radius: 8px; padding: 12px 16px; font-family: monospace; font-size: 13px; color: #0055ff; margin-top: 10px; display: inline-block; word-break: break-all; }
        .sca-includes-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 40px; }
        .sca-include-item { display: flex; align-items: flex-start; gap: 12px; background: #f7f7f5; border: 1px solid #ebebeb; border-radius: 10px; padding: 16px; }
        .sca-include-check { width: 22px; height: 22px; background: #059669; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #ffffff; font-weight: 800; flex-shrink: 0; }
        .sca-include-text { font-size: 14px; color: #111110; line-height: 1.5; }
        .sca-include-text strong { color: #111110; display: block; margin-bottom: 2px; }
        .sca-pricing-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px; margin-top: 48px; max-width: 1100px; margin-left: auto; margin-right: auto; }
        .sca-pricing-card { background: #f7f7f5; border: 1px solid #ebebeb; border-radius: 20px; padding: 40px 30px; text-align: center; position: relative; color: #111110; transition: transform 0.2s, border-color 0.2s; display: flex; flex-direction: column; justify-content: space-between; }
        .sca-pricing-card.premium { background: #111110; border: 2px solid #0055ff; color: #ffffff; box-shadow: 0 12px 40px rgba(0,85,255,0.12); }
        .sca-pricing-card:hover { transform: translateY(-2px); }
        .sca-pricing-badge { position: absolute; top: -14px; left: 50%; transform: translateX(-50%); background: #0055ff; color: #ffffff; font-size: 12px; font-weight: 800; padding: 4px 18px; border-radius: 999px; white-space: nowrap; text-transform: uppercase; letter-spacing: 0.05em; }
        .sca-pricing-badge.standard { background: #aeaca5; }
        .sca-pricing-price { font-size: 44px; font-weight: 900; letter-spacing: -1.5px; line-height: 1; margin: 16px 0 4px; }
        .sca-pricing-price span { font-size: 18px; font-weight: 500; color: #6f6e69; }
        .sca-pricing-card.premium .sca-pricing-price { color: #ffffff; }
        .sca-pricing-card.premium .sca-pricing-price span { color: #aeaca5; }
        .sca-pricing-desc { font-size: 13.5px; color: #6f6e69; margin-bottom: 24px; min-height: 40px; }
        .sca-pricing-card.premium .sca-pricing-desc { color: #aeaca5; }
        .sca-pricing-features { list-style: none; text-align: left; margin-bottom: 32px; display: flex; flex-direction: column; gap: 12px; padding: 0; }
        .sca-pricing-features li { display: flex; align-items: flex-start; gap: 10px; font-size: 13.5px; line-height: 1.4; color: #111110; }
        .sca-pricing-card.premium .sca-pricing-features li { color: #ffffff; }
        .sca-pricing-features li::before { content: '✓'; width: 18px; height: 18px; background: rgba(5,150,105,0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #059669; font-weight: 800; flex-shrink: 0; margin-top: 1px; }
        .sca-pricing-card.premium .sca-pricing-features li::before { background: rgba(5,150,105,0.2); color: #34d399; }
        .sca-pricing-note { margin-top: 14px; font-size: 11px; color: #6f6e69; }
        .sca-pricing-card.premium .sca-pricing-note { color: #aeaca5; }
        .sca-faq-list { margin-top: 40px; display: flex; flex-direction: column; gap: 12px; max-width: 680px; margin-left: auto; margin-right: auto; }
        .sca-faq-item { background: #f7f7f5; border: 1px solid #ebebeb; border-radius: 12px; padding: 20px 24px; }
        .sca-faq-q { font-size: 15px; font-weight: 700; color: #111110; margin-bottom: 8px; }
        .sca-faq-a { font-size: 14px; color: #6f6e69; line-height: 1.65; }
        .sca-divider { height: 1px; background: #ebebeb; margin: 0; }
        @media(max-width: 600px) {
          .sca-hero { padding: 48px 20px 40px; }
          .sca-section { padding: 56px 20px; }
          .sca-pricing-card { padding: 28px 20px; }
          .sca-includes-grid { grid-template-columns: 1fr; }
          .sca-pricing-grid { grid-template-columns: 1fr; gap: 20px; }
        }
      `}</style>

      <div className="sca-root">

        {/* HERO */}
        <div className="sca-hero">
          <div className="sca-badge">
            <span className="sca-badge-dot">●</span> Live on WhatsApp 24/7
          </div>
          <h1 className="sca-h1">Your Business Deserves a<br /><span>Sales Agent That Never Sleeps</span></h1>
          <p className="sca-sub">Set up a WhatsApp AI agent for your small business in under 30 minutes. It replies to leads instantly, speaks their language, and routes hot customers to you.</p>
          <div className="sca-cta-group">
            <a href="#pricing" className="sca-btn-primary">
              Get ScaleCraft Agent - starting at {geoPayment.loading || loadingPrice ? '...' : `${geoPayment.symbol}${geoPayment.isIndia ? standardPrice.inr.toLocaleString('en-IN') : standardPrice.usd.toLocaleString('en-US')}`}
            </a>
            <a href="#how-it-works" className="sca-btn-secondary">See how it works</a>
          </div>
          <p className="sca-note">One-time payment • No subscription • Includes setup support</p>
        </div>

        {/* CHAT MOCKUP */}
        <div className="sca-mockup">
          <div className="sca-phone">
            <div className="sca-phone-header">
              <div className="sca-avatar">GS</div>
              <div>
                <div className="sca-phone-name">GadgetShop Kerala</div>
                <div className="sca-phone-status"><span className="sca-dot"></span>online</div>
              </div>
            </div>
            <div className="sca-phone-body">
              <div className="sca-msg sca-msg-in">Hi! I saw your ad for the dash cam<span className="sca-msg-time">10:23 pm</span></div>
              <div className="sca-msg sca-msg-out"><span className="sca-msg-label">AI Agent</span>Hey! I&apos;m Arjun, AI assistant for GadgetShop 👋 Which car do you have? I&apos;ll suggest the best dash cam 😊<span className="sca-msg-time">10:23 pm ✓✓</span></div>
              <div className="sca-msg sca-msg-in">Swift 2022, need front and rear<span className="sca-msg-time">10:24 pm</span></div>
              <div className="sca-msg sca-msg-out"><span className="sca-msg-label">AI Agent</span>Perfect! Our 4K Dual Cam at ₹2,499 is exactly for Swift - easy install, night vision, loop recording. Want to order? 🔥<span className="sca-msg-time">10:24 pm ✓✓</span></div>
              <div className="sca-msg sca-msg-in">COD available?<span className="sca-msg-time">10:25 pm</span></div>
              <div className="sca-msg sca-msg-out"><span className="sca-msg-label">AI Agent</span>Yes! COD available all over Kerala 😊 Here&apos;s the order link → shop.gadgetkerala.in<span className="sca-msg-time">10:25 pm ✓✓</span></div>
            </div>
          </div>
        </div>

        <div className="sca-divider" style={{ marginTop: '64px' }}></div>

        {/* FEATURES */}
        <section className="sca-section">
          <div className="sca-container">
            <div className="sca-label">What it does</div>
            <h2 className="sca-h2">Everything a sales person does.<br />At a fraction of the cost.</h2>
            <p className="sca-section-sub">Your agent works 24/7 - while you sleep, eat, and run your business.</p>
            <div className="sca-features-grid">
              {[
                { icon: '⚡', title: 'Instant replies - always', desc: 'No more missed leads. Every WhatsApp message gets a reply in seconds - midnight, Sunday, holiday. Your business never goes offline.' },
                { icon: '🌍', title: 'Speaks any language', desc: 'Auto-detects Malayalam, Hindi, Tamil, Arabic, English and more. Replies in whatever language the customer uses - naturally.' },
                { icon: '🎤', title: 'Understands voice messages', desc: 'Customers send voice notes? Your agent listens, transcribes, and replies intelligently - no message goes unanswered.' },
                { icon: '🧠', title: 'Knows your products', desc: 'Trained on your exact products, prices, and FAQs. Recommends the right item, answers accurately, never makes things up.' },
                { icon: '💬', title: 'Handles objections', desc: '"Too expensive", "I\'ll think about it", "Is this original?" - the agent handles common objections and keeps the conversation moving.' },
                { icon: '🔥', title: 'Routes hot leads to you', desc: 'When a customer is ready to buy or needs personal attention - the agent shares your number and hands off cleanly.' },
              ].map((f, i) => (
                <div key={i} className="sca-feature-card">
                  <div className="sca-feature-icon">{f.icon}</div>
                  <div className="sca-feature-title">{f.title}</div>
                  <div className="sca-feature-desc">{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="sca-divider"></div>

        {/* PERFECT FOR */}
        <section className="sca-section">
          <div className="sca-container">
            <div className="sca-label">Who it&apos;s for</div>
            <h2 className="sca-h2">Built for small businesses<br />that run on WhatsApp</h2>
            <p className="sca-section-sub">If your customers message you on WhatsApp - this is for you.</p>
            <div className="sca-business-grid">
              {[
                { icon: '🚗', name: 'Car Accessories' }, { icon: '🍽️', name: 'Restaurants' },
                { icon: '💇', name: 'Salons & Spas' }, { icon: '🏋️', name: 'Gyms & Fitness' },
                { icon: '🛍️', name: 'Online Stores' }, { icon: '🏠', name: 'Real Estate' },
                { icon: '📚', name: 'Coaching & Tuition' }, { icon: '👗', name: 'Fashion & Clothing' },
                { icon: '🔧', name: 'Repair Services' }, { icon: '🏥', name: 'Clinics & Wellness' },
                { icon: '🎂', name: 'Bakeries & Catering' }, { icon: '📱', name: 'Any Business' },
              ].map((b, i) => (
                <div key={i} className="sca-business-card">
                  <div className="sca-business-icon">{b.icon}</div>
                  <div className="sca-business-name">{b.name}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="sca-divider"></div>

        {/* HOW IT WORKS */}
        <section className="sca-section" id="how-it-works">
          <div className="sca-container">
            <div className="sca-label">Setup process</div>
            <h2 className="sca-h2">Live in under 30 minutes.<br />No coding needed.</h2>
            <p className="sca-section-sub">One command sets everything up. You just answer a few questions about your business.</p>
            <div className="sca-steps">
              {[
                { title: 'Get a dedicated WhatsApp number', desc: 'Any prepaid SIM (Airtel/Jio) not already on WhatsApp. Install WhatsApp on a second phone or dual SIM slot. Takes 10 minutes.' },
                { title: 'Get a free Gemini API key', desc: 'Sign in at aistudio.google.com with your Google account. Create a free API key. Costs ₹50–₹200/month based on usage.' },
                { title: 'Run one command on your server', desc: 'On any VPS (AWS Lightsail (Mumbai), DigitalOcean) or your Mac/Linux machine, run:', code: 'curl -fsSL https://thescalecraft.in/agent/install.sh | bash -s -- --key YOUR-LICENSE-KEY' },
                { title: 'Answer 7 questions about your business', desc: 'Business name, what you sell, price range, product link, team contact. Takes 5 minutes. Agent personality generated automatically.' },
                { title: 'Scan the QR code - you\'re live', desc: 'Scan with your bot phone. Agent starts running immediately. Send "Hi" from another phone to test. Works 24/7 from this moment.' },
              ].map((s, i) => (
                <div key={i} className="sca-step">
                  <div className="sca-step-num">{i + 1}</div>
                  <div>
                    <div className="sca-step-title">{s.title}</div>
                    <div className="sca-step-desc">{s.desc}</div>
                    {s.code && <div className="sca-code">{s.code}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="sca-divider"></div>

        {/* WHAT YOU GET */}
        <section className="sca-section">
          <div className="sca-container">
            <div className="sca-label">What&apos;s included</div>
            <h2 className="sca-h2">Everything you need.<br />Nothing you don&apos;t.</h2>
            <div className="sca-includes-grid">
              {[
                { title: 'One-command installer', desc: 'Sets up everything automatically - Hermes Agent, Gemini AI, WhatsApp bridge, voice support' },
                { title: 'SOUL.md generator', desc: 'Fill in your business details → get your agent\'s personality instantly' },
                { title: 'Voice message support', desc: 'Agent transcribes and replies to WhatsApp voice notes automatically' },
                { title: 'Multilingual support', desc: 'Auto-detects lead\'s language. Or set specific languages during setup.' },
                { title: 'Hot lead handoff', desc: 'When customer is ready to buy - agent shares your number and steps aside' },
                { title: '24/7 uptime', desc: 'Runs as background service - restarts automatically if server reboots' },
                { title: 'Complete setup guide', desc: 'Step-by-step docs for VPS, AWS Lightsail, and local machine setup' },
                { title: 'Chat support', desc: 'Stuck during setup? Message us on WhatsApp - we\'ll help you go live' },
              ].map((item, i) => (
                <div key={i} className="sca-include-item">
                  <div className="sca-include-check">✓</div>
                  <div className="sca-include-text"><strong>{item.title}</strong>{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="sca-divider"></div>

        {/* TESTIMONIALS */}
        <section className="sca-section bg-slate-50/50">
          <div className="sca-container">
            <ProductTestimonials
              title="Loved by business owners & agency founders"
              subtitle="See how businesses automations and AI sales agents drive immediate revenue & response rates."
            />
          </div>
        </section>

        <div className="sca-divider"></div>

        {/* PRICING */}
        <section className="sca-section" id="pricing">
          <div className="sca-container" style={{ textAlign: 'center' }}>
            <div className="sca-label">Pricing</div>
            <h2 className="sca-h2">One payment. Yours forever.</h2>
            <p className="sca-section-sub" style={{ margin: '0 auto' }}>No monthly subscription. No per-message fees. Pay once and your agent runs as long as you want.</p>

            <div className="sca-pricing-grid">
              {/* Standard Package */}
              <div className="sca-pricing-card">
                <div>
                  <div className="sca-pricing-badge standard">Self Setup</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, marginTop: '12px' }}>ScaleCraft Agent (Standard)</div>

                  <div className="sca-pricing-price">
                    {geoPayment.loading || loadingPrice ? (
                      <div style={{ height: '44px', width: '150px', background: 'rgba(0,0,0,0.05)', margin: '16px auto 4px', borderRadius: '8px' }} className="animate-pulse" />
                    ) : (
                      <>{geoPayment.symbol}{geoPayment.isIndia ? standardPrice.inr.toLocaleString('en-IN') : standardPrice.usd.toLocaleString('en-US')} <span>one-time</span></>
                    )}
                  </div>

                  <div className="sca-pricing-desc">Perfect if you are comfortable running a basic command on a server. Onboarding support included.</div>

                  <ul className="sca-pricing-features">
                    {[
                      'One-command installer script',
                      'SOUL.md business personality generator',
                      'Voice message transcription support',
                      'Auto multilingual chat capability',
                      'Hot lead handoff to your number',
                      'Runs on any Linux VPS or local machine',
                      'Complete step-by-step setup guide',
                      'WhatsApp chat support for setup',
                      'Free lifetime updates'
                    ].map((f, i) => <li key={i}>{f}</li>)}
                  </ul>
                </div>

                <div>
                  <Link
                    href={`/checkout/scalecraft-agent${geoPayment.isIndia ? '' : '?geo=US'}`}
                    style={{
                      display: 'block',
                      background: '#111110',
                      color: '#ffffff',
                      padding: '16px',
                      borderRadius: '10px',
                      fontSize: '15px',
                      fontWeight: 800,
                      textDecoration: 'none',
                      textAlign: 'center',
                      marginTop: '20px'
                    }}
                  >
                    Buy Standard Package
                  </Link>

                  <div className="sca-pricing-note">
                    {geoPayment.isIndia ? (
                      <>+ VPS cost (~₹400/month) + Gemini API (~₹100–200/month)<br />Total running cost: under ₹700/month</>
                    ) : (
                      <>+ VPS cost (~$5/month) + Gemini API (~$2–3/month)<br />Total running cost: under $8/month</>
                    )}
                  </div>
                </div>
              </div>

              {/* 7-Day Trial Package */}
              <div className="sca-pricing-card">
                <div>
                  <div className="sca-pricing-badge" style={{ background: '#f59e0b', color: '#ffffff' }}>7-Day Trial</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, marginTop: '12px' }}>ScaleCraft Agent (Trial)</div>

                  <div className="sca-pricing-price" style={{ fontSize: '32px', margin: '16px 0 4px', fontWeight: 900, letterSpacing: '-1.5px', lineHeight: 1 }}>
                    {geoPayment.loading || loadingPrice ? (
                      <div style={{ height: '44px', width: '150px', background: 'rgba(0,0,0,0.05)', margin: '16px auto 4px', borderRadius: '8px' }} className="animate-pulse" />
                    ) : (
                      <>₹2 <span>for 7 days</span></>
                    )}
                  </div>

                  <div className="sca-pricing-desc">Test our fully managed SaaS model. Full features, no restrictions. Cancel or upgrade anytime.</div>

                  <ul className="sca-pricing-features">
                    {[
                      'Dedicated VPS server (Mumbai)',
                      '7 days full trial period',
                      'We install and configure everything',
                      'No feature restrictions',
                      'Dashboard access to manage products & leads',
                      'WhatsApp setup support',
                      'First 7 days for just ₹2'
                    ].map((f, i) => <li key={i}>{f}</li>)}
                  </ul>
                </div>

                <div>
                  <Link
                    href={`/checkout/scalecraft-agent?plan=saas&trial=true${geoPayment.isIndia ? '' : '&geo=US'}`}
                    style={{
                      display: 'block',
                      background: '#f59e0b',
                      color: '#ffffff',
                      padding: '16px',
                      borderRadius: '10px',
                      fontSize: '15px',
                      fontWeight: 800,
                      textDecoration: 'none',
                      textAlign: 'center',
                      marginTop: '20px'
                    }}
                  >
                    Start 7-Day Trial
                  </Link>

                  <div className="sca-pricing-note">
                    {geoPayment.isIndia ? (
                      <>Automatic pause after trial + 3-day grace period unless upgraded.</>
                    ) : (
                      <>Trial runs in INR ₹2. Setup continues on VPS.</>
                    )}
                  </div>
                </div>
              </div>

              {/* Managed SaaS Package */}
              <div className="sca-pricing-card premium">
                <div>
                  <div className="sca-pricing-badge" style={{ background: '#10b981', color: '#ffffff' }}>Fully Managed</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, marginTop: '12px' }}>ScaleCraft Agent - Managed (SaaS)</div>

                  <div className="sca-pricing-price" style={{ fontSize: '32px', margin: '16px 0 4px', fontWeight: 900, letterSpacing: '-1.5px', lineHeight: 1 }}>
                    {geoPayment.loading || loadingPrice ? (
                      <div style={{ height: '44px', width: '200px', background: 'rgba(0,0,0,0.05)', margin: '16px auto 4px', borderRadius: '8px' }} className="animate-pulse" />
                    ) : geoPayment.isIndia ? (
                      <>₹{saasPrice.inr.toLocaleString('en-IN')} <span style={{ fontSize: '13px', fontWeight: 500, color: '#6f6e69', letterSpacing: 'normal' }}>setup</span> + ₹{saasMonthlyPrice.inr.toLocaleString('en-IN')}<span style={{ fontSize: '13px', fontWeight: 500, color: '#6f6e69', letterSpacing: 'normal' }}>/mo</span></>
                    ) : (
                      <>${saasPrice.usd.toLocaleString('en-US')} <span style={{ fontSize: '13px', fontWeight: 500, color: '#6f6e69', letterSpacing: 'normal' }}>setup</span> + ${saasMonthlyPrice.usd.toLocaleString('en-US')}<span style={{ fontSize: '13px', fontWeight: 500, color: '#6f6e69', letterSpacing: 'normal' }}>/mo</span></>
                    )}
                  </div>

                  <div className="sca-pricing-desc">We host everything. You just manage from dashboard.</div>

                  <ul className="sca-pricing-features">
                    {[
                      'Dedicated VPS server (Mumbai)',
                      'We install and configure everything',
                      'Dashboard to manage products, leads, broadcasts',
                      'Lead CRM synced to Google Sheets',
                      'Chat memory - agent never forgets leads',
                      'Usage & billing dashboard',
                      'Monthly billing based on usage',
                      'Priority support'
                    ].map((f, i) => <li key={i}>{f}</li>)}
                  </ul>
                </div>

                <div>
                  <Link
                    href={`/checkout/scalecraft-agent?plan=saas${geoPayment.isIndia ? '' : '&geo=US'}`}
                    style={{
                      display: 'block',
                      background: '#10b981',
                      color: '#ffffff',
                      padding: '16px',
                      borderRadius: '10px',
                      fontSize: '15px',
                      fontWeight: 800,
                      textDecoration: 'none',
                      textAlign: 'center',
                      marginTop: '20px'
                    }}
                  >
                    Get Started
                  </Link>

                  <div className="sca-pricing-note">
                    We host everything. Connects to our setup WhatsApp line.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="sca-divider"></div>

        {/* FAQ */}
        <section className="sca-section">
          <div className="sca-container">
            <div className="sca-label" style={{ textAlign: 'center' }}>FAQ</div>
            <h2 className="sca-h2" style={{ textAlign: 'center' }}>Common questions</h2>
            <div className="sca-faq-list">
              {[
                { q: 'Do I need coding knowledge?', a: 'No. You run one command, answer 7 questions about your business, and scan a QR code. That\'s it. No coding at all.' },
                { q: 'What\'s the total monthly cost to run this?', a: 'VPS: ~₹400/month (AWS Lightsail (Mumbai)). Gemini API: ₹50–₹200/month depending on message volume. Total: under ₹700/month.' },
                { q: 'Does it work with my existing WhatsApp number?', a: 'You need a dedicated number for the bot. Any prepaid SIM (Airtel/Jio) works. Your personal number is not affected.' },
                { q: 'What languages does it support?', a: 'Any language. It auto-detects what the customer writes and replies in the same language - Malayalam, Hindi, Tamil, Arabic, English, and more.' },
                { q: 'Can it handle voice messages?', a: 'Yes. The installer sets up faster-whisper locally - your agent transcribes voice notes and replies to them just like text messages.' },
                { q: 'What happens when a customer wants to buy?', a: 'The agent shares your team WhatsApp number and steps aside. You take over personally and close the deal.' },
                { q: 'Can I update the agent after setup?', a: 'Yes, anytime. Edit one file (SOUL.md), save it, restart the agent. Takes 2 minutes to update products, prices, or replies.' },
                { q: 'What if I get stuck during setup?', a: 'Message us on WhatsApp at +91 80780 04732. Setup support is included - we\'ll help you go live.' },
              ].map((f, i) => (
                <div key={i} className="sca-faq-item">
                  <div className="sca-faq-q">{f.q}</div>
                  <div className="sca-faq-a">{f.a}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="sca-divider"></div>

        {/* FINAL CTA */}
        <section className="sca-section" style={{ textAlign: 'center' }}>
          <div className="sca-container">
            <h2 className="sca-h2">Your business is open.<br /><span style={{ color: '#0055ff' }}>Your agent never closes.</span></h2>
            <p className="sca-section-sub" style={{ margin: '0 auto 36px' }}>Set up once. Runs forever. Every lead gets an instant reply in their language.</p>
            <a href="#pricing" className="sca-btn-primary" style={{ fontSize: '17px', padding: '18px 44px' }}>
              Get ScaleCraft Agent - starting at {geoPayment.loading || loadingPrice ? '...' : `${geoPayment.symbol}${geoPayment.isIndia ? standardPrice.inr.toLocaleString('en-IN') : standardPrice.usd.toLocaleString('en-US')}`}
            </a>
            <p style={{ marginTop: '14px', fontSize: '13px', color: '#6f6e69' }}>One-time payment • Setup support included • No subscription</p>
          </div>
        </section>


      </div>
    </>
  )
}
