'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { CheckCircle2, Unlock, Mail, Download, Loader2, ArrowRight, Headphones, ExternalLink, X, Server, MessageSquare } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://paymentgateway.growyourbusiness.today';

function ThankYouPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [inputEmail, setInputEmail] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [productData, setProductData] = useState<{
    name: string;
    downloadLink: string;
    price?: number;
    productType?: string;
    isCombo?: boolean;
    comboProducts?: Array<{ name: string; downloadLink: string }>;
  } | null>(null);

  const paymentId = searchParams?.get('payment_id');
  const productId = searchParams?.get('product_id');
  const queryEmail = searchParams?.get('email');
  const queryName = searchParams?.get('name');

  useEffect(() => {
    async function trackPurchase() {
      if (!paymentId) return;

      const tracked = JSON.parse(localStorage.getItem('tracked_fb_purchases') || '[]');
      if (tracked.includes(paymentId)) return;

      try {
        const urlGeo = new URLSearchParams(window.location.search).get('geo');
        let countryCode = urlGeo?.toUpperCase();
        
        if (!countryCode) {
          try {
            countryCode = await fetch('/api/geo', {
              signal: AbortSignal.timeout(4000),
            }).then(r => r.json()).then(d => d.country_code);
          } catch (e) {
            console.error('Geo fetch failed on thank you page:', e);
            countryCode = 'IN';
          }
        }

        const isIndia = countryCode === 'IN';
        
        if (typeof window !== 'undefined' && (window as any).fbq) {
          (window as any).fbq('track', 'Purchase', {
            value: isIndia ? 999 : 12.00,
            currency: isIndia ? 'INR' : 'USD'
          });
          console.log('Pixel: Purchase fired');
          
          tracked.push(paymentId);
          localStorage.setItem('tracked_fb_purchases', JSON.stringify(tracked));
        }
      } catch (err) {
        console.error('Error tracking purchase:', err);
      }
    }
    trackPurchase();
  }, [paymentId]);

  useEffect(() => {
    async function fetchProduct() {
      if (!productId) {
        setLoading(false);
        return;
      }
      try {
        const { data: dbProduct } = await supabase
          .from('saas_products')
          .select('id, name, section_visibility, price, is_combo, combo_product_ids, product_type')
          .or(`id.eq.${productId},slug.eq.${productId}`)
          .maybeSingle();

        if (dbProduct) {
          const secVis = dbProduct.section_visibility || {};
          let mainDownloadLink = '';
          const pType = dbProduct.product_type || 'digital';
          if (pType === 'digital' || pType === 'template') {
            mainDownloadLink = secVis.notion_url || secVis.url || '';
            if (!mainDownloadLink) {
              const { data: dlData } = await supabase
                .from('product_downloads')
                .select('url')
                .eq('product_id', dbProduct.id)
                .limit(1)
                .maybeSingle();
              if (dlData?.url) mainDownloadLink = dlData.url;
            }
          }

          let comboProducts: any[] = [];
          if (dbProduct.is_combo && dbProduct.combo_product_ids?.length > 0) {
            const { data: subProducts } = await supabase
              .from('saas_products')
              .select('id, name, section_visibility')
              .in('id', dbProduct.combo_product_ids);
            
            comboProducts = (subProducts || []).map(sp => {
              const spSecVis = sp.section_visibility || {};
              return {
                name: sp.name,
                downloadLink: spSecVis.notion_url || spSecVis.url || ''
              };
            });
          }

          setProductData({
            name: dbProduct.name,
            downloadLink: mainDownloadLink,
            price: Number(dbProduct.price),
            productType: dbProduct.product_type || 'digital',
            isCombo: dbProduct.is_combo,
            comboProducts: comboProducts
          });
        }
      } catch (err) {
        console.error('Error fetching product details:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
  }, [productId]);

  useEffect(() => {
    const email = queryEmail || localStorage.getItem('buyer_email');
    const name = queryName || localStorage.getItem('buyer_name') || '';
    const registeredPayments = JSON.parse(localStorage.getItem('registered_payments') || '[]');

    if (email && paymentId && !registeredPayments.includes(paymentId)) {
      setBuyerEmail(email);
      setBuyerName(name);
      localStorage.setItem('buyer_email', email);
      if (name) localStorage.setItem('buyer_name', name);
      handleAutoRegister(email, name, paymentId, productId || null);
    } else if (email) {
      setBuyerEmail(email);
      setBuyerName(name);
      setIsSuccess(true);
    } else {
      setLoading(false);
    }
  }, [paymentId, productId, queryEmail, queryName]);

  const handleAutoRegister = async (email: string, name: string, pId: string, prodId: string | null) => {
    setIsRegistering(true);
    try {
      let resolvedProductName = productData?.name || '';
      let resolvedNotionUrl = productData?.downloadLink || '';

      if ((!resolvedProductName || !resolvedNotionUrl) && prodId) {
        try {
          const { data: dbProd } = await supabase
            .from('saas_products')
            .select('id, name, section_visibility, product_type')
            .or(`id.eq.${prodId},slug.eq.${prodId}`)
            .maybeSingle();

          if (dbProd) {
            resolvedProductName = dbProd.name || '';
            const secVis = dbProd.section_visibility || {};
            const pType = dbProd.product_type || 'digital';
            if (pType === 'digital' || pType === 'template') {
              resolvedNotionUrl = secVis.notion_url || secVis.url || '';
              if (!resolvedNotionUrl) {
                const { data: dlData } = await supabase
                  .from('product_downloads')
                  .select('url')
                  .eq('product_id', dbProd.id)
                  .limit(1)
                  .maybeSingle();
                if (dlData?.url) resolvedNotionUrl = dlData.url;
              }
            }
          }
        } catch (dbErr) {
          console.error('Error fetching product for auto-registration:', dbErr);
        }
      }

      const response = await fetch(`${API_URL}/api/register-purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_id: pId,
          email: email.toLowerCase().trim(),
          buyerName: name,
          productId: prodId,
          productName: resolvedProductName || 'ScaleCraft Digital Product',
          notionUrl: resolvedNotionUrl,
          notion_url: resolvedNotionUrl,
          download_url: resolvedNotionUrl,
          downloadUrl: resolvedNotionUrl,
          url: resolvedNotionUrl,
          resource_url: resolvedNotionUrl,
          resourceUrl: resolvedNotionUrl
        }),
      });

      if (response.ok) {
        const registeredPayments = JSON.parse(localStorage.getItem('registered_payments') || '[]');
        if (!registeredPayments.includes(pId)) {
          registeredPayments.push(pId);
          localStorage.setItem('registered_payments', JSON.stringify(registeredPayments));
        }
        setIsSuccess(true);
      } else {
        const data = await response.json().catch(() => ({}));
        console.warn('Auto-registry response warning:', data.error);
      }
    } catch (err) {
      console.error('Auto-registration failed:', err);
    } finally {
      setIsRegistering(false);
      setLoading(false);
    }
  };

  const handleManualRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputEmail || !/\S+@\S+\.\S+/.test(inputEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!productId) {
      setError('Product information missing. Please check your URL or contact support.');
      return;
    }

    setIsRegistering(true);
    setError('');

    try {
      let resolvedProductName = productData?.name || '';
      let resolvedNotionUrl = productData?.downloadLink || '';

      if (!resolvedProductName || !resolvedNotionUrl) {
        try {
          const { data: dbProd } = await supabase
            .from('saas_products')
            .select('id, name, section_visibility, product_type')
            .or(`id.eq.${productId},slug.eq.${productId}`)
            .maybeSingle();

          if (dbProd) {
            resolvedProductName = dbProd.name || '';
            const secVis = dbProd.section_visibility || {};
            const pType = dbProd.product_type || 'digital';
            if (pType === 'digital' || pType === 'template') {
              resolvedNotionUrl = secVis.notion_url || secVis.url || '';
              if (!resolvedNotionUrl) {
                const { data: dlData } = await supabase
                  .from('product_downloads')
                  .select('url')
                  .eq('product_id', dbProd.id)
                  .limit(1)
                  .maybeSingle();
                if (dlData?.url) resolvedNotionUrl = dlData.url;
              }
            }
          }
        } catch (dbErr) {
          console.error('Error fetching product for manual registration:', dbErr);
        }
      }

      const response = await fetch(`${API_URL}/api/register-purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_id: paymentId || 'manual_entry',
          email: inputEmail.toLowerCase().trim(),
          buyerName: buyerName || 'Customer',
          productId: productId,
          productName: resolvedProductName || 'ScaleCraft Digital Product',
          notionUrl: resolvedNotionUrl,
          notion_url: resolvedNotionUrl,
          download_url: resolvedNotionUrl,
          downloadUrl: resolvedNotionUrl,
          url: resolvedNotionUrl,
          resource_url: resolvedNotionUrl,
          resourceUrl: resolvedNotionUrl
        }),
      });

      if (response.ok) {
        const registeredPayments = JSON.parse(localStorage.getItem('registered_payments') || '[]');
        if (paymentId && !registeredPayments.includes(paymentId)) {
          registeredPayments.push(paymentId);
          localStorage.setItem('registered_payments', JSON.stringify(registeredPayments));
        }

        localStorage.setItem('buyer_email', inputEmail.toLowerCase().trim());
        setBuyerEmail(inputEmail.toLowerCase().trim());
        setIsSuccess(true);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to register purchase. Please try again.');
      }
    } catch (err) {
      setError('Network connection error. Please try again.');
    } finally {
      setIsRegistering(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-accent animate-spin" />
        <p className="text-text-muted text-sm font-semibold tracking-wide uppercase">Securing your product dashboard...</p>
      </div>
    );
  }

  const isSaaS = productData?.productType === 'saas' || (productData?.name || '').toLowerCase().includes('agent');

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6 font-body">
      <div className="max-w-xl w-full text-center space-y-8 animate-in fade-in zoom-in duration-700">
        <div className="relative">
          <div className="absolute inset-0 bg-accent blur-3xl opacity-10 animate-pulse"></div>
          <CheckCircle2 className="w-20 h-20 text-accent mx-auto relative" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-heading font-black tracking-tight leading-tight text-foreground">Payment Successful!</h1>
          <p className="text-text-muted text-[15px]">
            Thank you for purchasing <strong className="text-foreground font-extrabold">{productData?.name || 'your product'}</strong>.
          </p>
        </div>

        {!isSuccess ? (
          <div className="bg-bg-secondary border border-border-primary rounded-[2.5rem] p-8 space-y-6 text-left relative overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.05)]">
            <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full blur-[40px]"></div>
            <div className="space-y-2 relative z-10">
              <h3 className="text-xl font-bold text-foreground">
                {isSaaS ? 'Begin Managed Onboarding' : 'Secure Your Access'}
              </h3>
              <p className="text-sm text-text-muted leading-relaxed">
                {isSaaS
                  ? 'Enter your email address below. Our team will contact you to configure your VPS server and agent.'
                  : "Enter your email address to link your transaction and receive your purchase details."}
              </p>
            </div>

            <form onSubmit={handleManualRegister} className="space-y-4 relative z-10">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-text-muted ml-1">Email Address</label>
                <input
                  type="email"
                  value={inputEmail}
                  onChange={(e) => setInputEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-background border border-border-primary rounded-xl px-4 py-4 text-foreground placeholder-text-light focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all text-[15px]"
                  autoFocus
                  required
                />
              </div>

              {error && <p className="text-red-500 text-sm ml-1" role="alert">{error}</p>}

              <button
                type="submit"
                disabled={isRegistering}
                className="w-full bg-accent text-white py-4 rounded-xl font-black text-lg hover:bg-blue-700 hover:scale-[1.01] transition-all flex items-center justify-center gap-2 shadow-[0_12px_24px_rgba(0,85,255,0.2)] disabled:opacity-70 cursor-pointer"
              >
                {isRegistering ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Registering...</>
                ) : (
                  <><Unlock className="w-5 h-5" /> {isSaaS ? 'START ONBOARDING' : 'UNLOCK MY ACCESS'}</>
                )}
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-bg-secondary border border-border-primary rounded-[2.5rem] p-8 space-y-8 relative overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.05)]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-[60px]"></div>
            
            <div className="space-y-2 text-center relative z-10">
              <div className="inline-flex items-center gap-2 bg-accent/10 text-accent px-3.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider mb-2">
                {isSaaS ? <Server className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                {isSaaS ? 'ONBOARDING INITIALIZED' : 'ACCESS UNLOCKED'}
              </div>
              <h3 className="text-2xl font-bold text-foreground">
                {isSaaS ? 'Your SaaS Agent Setup is Active' : 'Your Purchase Space is Ready'}
              </h3>
              <div className="flex items-center justify-center gap-2 text-accent text-sm font-semibold">
                <Mail className="w-4 h-4" /> {buyerEmail}
              </div>
              <p className="text-text-muted text-xs mt-1 leading-relaxed">
                We have also sent your confirmation receipt &amp; instructions to your email.
              </p>
            </div>

            <div className="space-y-5 relative z-10">
              {isSaaS ? (
                /* Managed SaaS Onboarding Card */
                <div className="bg-bg-tertiary/50 border border-border-primary rounded-2xl p-6 text-left space-y-4">
                  <h4 className="font-bold text-accent flex items-center gap-2 text-[15px]">
                    <Server className="w-4 h-4" /> Next Steps for Your Managed Server
                  </h4>
                  <div className="space-y-3.5 text-[13px] text-text-muted leading-relaxed">
                    <p className="flex gap-3">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center text-[10px] font-bold text-accent">1</span>
                      <span>Our engineering team is provisioning your dedicated VPS server and setting up instance credentials.</span>
                    </p>
                    <p className="flex gap-3">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center text-[10px] font-bold text-accent">2</span>
                      <span>We will contact you directly via WhatsApp / Email within 1-2 hours to pair your WhatsApp account and upload custom prompt instructions.</span>
                    </p>
                    <p className="flex gap-3">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center text-[10px] font-bold text-accent">3</span>
                      <span>You can access your client dashboard anytime at <Link href="/dashboard/login" className="text-accent font-bold hover:underline">/dashboard/login</Link></span>
                    </p>
                  </div>
                </div>
              ) : (
                /* Digital Product Template Card */
                <div className="bg-bg-tertiary/50 border border-border-primary rounded-2xl p-6 text-left space-y-4">
                  <h4 className="font-bold text-accent flex items-center gap-2 text-[15px]">
                    <Unlock className="w-4 h-4" /> Instructions &amp; Setup Guide
                  </h4>
                  <div className="space-y-3.5 text-[13px] text-text-muted leading-relaxed">
                    <p className="flex gap-3">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center text-[10px] font-bold text-accent">1</span>
                      <span>Click the access link below to open your resource or Notion workspace.</span>
                    </p>
                    <p className="flex gap-3">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center text-[10px] font-bold text-accent">2</span>
                      <span>If duplicating a Notion workspace, click <strong>"Duplicate"</strong> in the top-right corner of Notion to copy it into your workspace.</span>
                    </p>
                  </div>
                </div>
              )}

              {/* Product items display */}
              {productData?.isCombo && productData.comboProducts && productData.comboProducts.length > 0 ? (
                <div className="border border-border-primary rounded-[2rem] overflow-hidden bg-background shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                  <div className="px-6 py-4 bg-bg-secondary border-b border-border-primary flex items-center justify-between">
                    <span className="font-heading font-black text-xs uppercase tracking-wider text-text-muted">Included in your bundle</span>
                    <span className="text-[10px] font-black text-accent bg-accent/10 px-2.5 py-1 rounded-full uppercase tracking-wider">
                      {productData.comboProducts.length} Items
                    </span>
                  </div>
                  <div className="divide-y divide-border-primary">
                    {productData.comboProducts.map((subProd: any, idx: number) => (
                      <div key={idx} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-bg-secondary/40 transition-colors text-left">
                        <div className="space-y-1">
                          <h5 className="font-bold text-[15px] text-foreground leading-snug">{subProd.name}</h5>
                          <p className="text-[11px] text-text-muted">
                            {subProd.downloadLink?.includes('notion') ? 'Notion Workspace Template · Lifetime Access' : 'Digital Resource File'}
                          </p>
                        </div>
                        <a
                          href={subProd.downloadLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-2 bg-foreground text-white text-xs font-black px-5 py-3.5 rounded-xl hover:bg-accent transition-all uppercase tracking-wider shrink-0"
                        >
                          {subProd.downloadLink?.includes('notion') ? (
                            <>
                              Access Template
                              <ArrowRight className="w-3.5 h-3.5" />
                            </>
                          ) : (
                            <>
                              Download File
                              <Download className="w-3.5 h-3.5" />
                            </>
                          )}
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (productData?.downloadLink || productData?.name) ? (
                <div className="border border-border-primary rounded-[2rem] overflow-hidden bg-background shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                  <div className="px-6 py-4 bg-bg-secondary border-b border-border-primary flex items-center justify-between">
                    <span className="font-heading font-black text-xs uppercase tracking-wider text-text-muted">Your Purchased Item</span>
                    <span className="text-[10px] font-black text-accent bg-accent/10 px-2.5 py-1 rounded-full uppercase tracking-wider">
                      1 Item
                    </span>
                  </div>
                  <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
                    <div className="space-y-1">
                      <h5 className="font-bold text-[15px] text-foreground leading-snug">{productData.name || 'Digital Template Workspace'}</h5>
                      <p className="text-[11px] text-text-muted">
                        {productData.downloadLink?.includes('notion') ? 'Notion Workspace Template · Lifetime Access' : 'Digital Resource File'}
                      </p>
                    </div>
                    {productData.downloadLink ? (
                      <a
                        href={productData.downloadLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 bg-foreground text-white text-xs font-black px-5 py-3.5 rounded-xl hover:bg-accent transition-all uppercase tracking-wider shrink-0"
                      >
                        {productData.downloadLink.includes('notion') ? (
                          <>
                            Access Template
                            <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        ) : (
                          <>
                            Download File
                            <Download className="w-3.5 h-3.5" />
                          </>
                        )}
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsSupportModalOpen(true)}
                        className="inline-flex items-center justify-center gap-2 bg-accent text-white text-xs font-black px-5 py-3.5 rounded-xl hover:bg-blue-700 transition-all uppercase tracking-wider shrink-0 cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Get Instant Support
                      </button>
                    )}
                  </div>
                </div>
              ) : null}
              
              <div className="pt-4 border-t border-border-primary">
                <button
                  type="button"
                  onClick={() => setIsSupportModalOpen(true)}
                  className="w-full bg-bg-secondary text-text-primary py-4 rounded-xl font-bold text-sm hover:bg-bg-tertiary transition-all flex items-center justify-center gap-2 border border-border-primary cursor-pointer"
                >
                  <Headphones className="w-4 h-4" /> Need help? Get Instant Support
                </button>
              </div>
            </div>
          </div>
        )}

        <button 
          type="button"
          onClick={() => router.push('/')}
          className="text-text-muted hover:text-foreground transition-colors font-medium text-sm inline-block cursor-pointer"
        >
          Back to Home
        </button>
      </div>

      {/* Support details modal */}
      {isSupportModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsSupportModalOpen(false)}
          ></div>
          <div className="relative bg-background w-full max-w-sm rounded-[2rem] border border-border-primary p-8 shadow-[0_24px_60px_rgba(0,0,0,0.1)] animate-in fade-in zoom-in duration-300 space-y-6">
            <div className="flex justify-between items-start">
              <h3 className="text-xl font-black text-foreground">Instant 1:1 Support</h3>
              <button
                type="button"
                onClick={() => setIsSupportModalOpen(false)}
                className="p-1 hover:bg-bg-secondary rounded-full text-text-light hover:text-foreground transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            
            <p className="text-text-muted text-sm leading-relaxed">
              If you have any questions regarding your setup, onboarding, or custom requests, feel free to reach out directly.
            </p>

            <div className="space-y-3">
              <a
                href="https://wa.me/918078004732?text=Hi%20ScaleCraft%20Support%2C%20I%20just%20completed%20my%20purchase%20and%20would%20like%20assistance%20onboarding."
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-4 bg-[#25D366] hover:bg-[#20ba5a] text-white font-black text-center rounded-xl block transition-all shadow-[0_10px_20px_rgba(37,211,102,0.2)]"
              >
                Chat on WhatsApp
              </a>
              <a
                href="mailto:sales@growyourbusiness.today?subject=ScaleCraft%20Purchase%20Onboarding%20Help"
                className="w-full py-4 bg-bg-secondary hover:bg-bg-tertiary text-foreground font-bold text-center rounded-xl block transition-all border border-border-primary"
              >
                Email: sales@growyourbusiness.today
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ThankYouPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-accent animate-spin" />
        <p className="text-text-muted text-sm font-semibold tracking-wide uppercase">Securing your product dashboard...</p>
      </div>
    }>
      <ThankYouPageContent />
    </Suspense>
  );
}
