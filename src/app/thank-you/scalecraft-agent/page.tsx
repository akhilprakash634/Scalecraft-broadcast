'use client';

import React, { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle2, Copy, Check, Terminal, ExternalLink, Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';


const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://paymentgateway.growyourbusiness.today';

function ScaleCraftAgentThankYouContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  // ref so the Sanity polling can be cancelled when the key is resolved by any path
  const licenseKeyResolvedRef = useRef(false);

  const paymentId = searchParams?.get('payment_id');
  const queryEmail = searchParams?.get('email');
  const queryName = searchParams?.get('name');
  const queryProductId = searchParams?.get('product_id') || 'mOBd3I07NrgTLn79T01oEq';
  const queryCoupon = searchParams?.get('coupon') || '';
  const isInstallation = queryProductId === '7ca5a08c-6f75-4be5-aa86-d41c2f2d669c';

  // SaaS provisioning states
  const isSaaS = queryProductId === 'scalecraft-agent-saas';
  const [provisioningStatus, setProvisioningStatus] = useState<'idle' | 'triggered' | 'active' | 'suspended' | 'error'>('idle');
  const [logs, setLogs] = useState<string[]>([]);
  const [clientId, setClientId] = useState('');
  const [docId, setDocId] = useState('');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [connectionType, setConnectionType] = useState<'baileys' | 'cloud_api'>('baileys');
  const [intendedConnectionType, setIntendedConnectionType] = useState<string | null>(null);
  const [hermesProfile, setHermesProfile] = useState<string | null>(null);
  const [whatsappVerifyToken, setWhatsappVerifyToken] = useState<string | null>(null);
  // Guard: browser should only trigger the install call ONCE per session
  const installTriggeredRef = useRef(false);

  const currentKey = licenseKey || 'YOUR_LICENSE_KEY';
  const installCommand = `curl -fsSL https://thescalecraft.in/agent/install.sh | bash -s -- \\
  --key ${currentKey} \\
  --gemini-key YOUR_GEMINI_KEY \\
  --agent-name "YourAgentName" \\
  --biz-name "YourBusinessName" \\
  --products "What you sell" \\
  --pricing "Price range" \\
  --website "https://yourwebsite.com" \\
  --team-num "+91 XXXXXXXXXX"`;

  const reloadCommand = `source ~/.bashrc`;
  const whatsappCommand = `echo "N" | hermes whatsapp`;
  const startCommand = `hermes gateway restart`;

  // Helper: persist and surface the license key from any source
  const resolveLicenseKey = (key: string) => {
    if (!key || licenseKeyResolvedRef.current) return;
    licenseKeyResolvedRef.current = true;
    setLicenseKey(key);
    localStorage.setItem('buyer_license_key', key);
    console.log('[License] Resolved:', key);
  };

  // --- Facebook Pixel tracking ---
  useEffect(() => {
    if (!paymentId) return;
    const tracked = JSON.parse(localStorage.getItem('tracked_fb_purchases') || '[]');
    if (!tracked.includes(paymentId)) {
      if (typeof window !== 'undefined') {
        const fb = (window as typeof window & { fbq?: (event: string, action: string, data: Record<string, unknown>) => void }).fbq;
        if (fb) {
          const pixelValue = isInstallation ? 4999 : 2999;
          fb('track', 'Purchase', { value: pixelValue, currency: 'INR' });
          console.log(`Pixel: Purchase fired (ScaleCraft Agent, value: ${pixelValue})`);
          tracked.push(paymentId);
          localStorage.setItem('tracked_fb_purchases', JSON.stringify(tracked));
        }
      }
    }
  }, [paymentId, isInstallation]);

  // --- Main license key acquisition ---
  useEffect(() => {
    if (!paymentId) return;

    const email = queryEmail || localStorage.getItem('buyer_email') || '';
    const name = queryName || localStorage.getItem('buyer_name') || 'Customer';

    if (email) {
      setBuyerEmail(email);
      setBuyerName(name);
      localStorage.setItem('buyer_email', email);
      localStorage.setItem('buyer_name', name);
    }

    // Step 1: Check localStorage cache first (instant)
    const cachedKey = localStorage.getItem('buyer_license_key');
    if (cachedKey) {
      console.log('[License] Found in localStorage cache:', cachedKey);
      resolveLicenseKey(cachedKey);
    }

    // Step 2: Call register-purchase API - it returns licenseKey directly
    const registerAndFetch = async () => {
      if (licenseKeyResolvedRef.current) return;
      try {
        console.log('[License] Calling register-purchase API for paymentId:', paymentId);
        const response = await fetch(`${API_URL}/api/register-purchase`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            payment_id: paymentId,
            email: email.toLowerCase().trim(),
            buyerName: name,
            productId: queryProductId,
            couponCode: queryCoupon || undefined,
            businessName: localStorage.getItem('buyer_business_name') || '',
            botPhone: localStorage.getItem('buyer_bot_phone') || '',
            ownerPhone: localStorage.getItem('buyer_owner_phone') || '',
            geminiApiKey: localStorage.getItem('buyer_gemini_key') || '',
          }),
        });
        if (response.ok) {
          const data = await response.json();
          console.log('[License] register-purchase response:', data);
          if (data.licenseKey) {
            resolveLicenseKey(data.licenseKey);
            // Mark payment as registered
            const reg = JSON.parse(localStorage.getItem('registered_payments') || '[]');
            if (!reg.includes(paymentId)) {
              reg.push(paymentId);
              localStorage.setItem('registered_payments', JSON.stringify(reg));
            }
          }
        } else {
          console.warn('[License] register-purchase returned non-OK status:', response.status);
        }
      } catch (err) {
        console.error('[License] register-purchase API error:', err);
      }
    };
    registerAndFetch();

    // Step 3: Supabase polling as fallback (runs in parallel, cancels when key is resolved)
    let active = true;
    let timerId: NodeJS.Timeout;
    let attempts = 0;

    const pollSupabase = async () => {
      if (!active || licenseKeyResolvedRef.current) return;
      console.log(`[License Fetch] Supabase attempt ${attempts + 1} for paymentId:`, paymentId);
      try {
        const { data: order } = await supabase
          .from('orders')
          .select('license_key')
          .eq('payment_id', paymentId)
          .maybeSingle();

        const result = order?.license_key || null;
        console.log('[License Fetch] Supabase result:', result);
        if (result && typeof result === 'string') {
          if (active) resolveLicenseKey(result);
        } else {
          attempts += 1;
          if (active) {
            setRetryCount(attempts);
            if (attempts < 10) {
              timerId = setTimeout(pollSupabase, 2000);
            }
          }
        }
      } catch (err) {
        console.error('[License Fetch] Supabase error:', err);
        attempts += 1;
        if (active) {
          setRetryCount(attempts);
          if (attempts < 10) {
            timerId = setTimeout(pollSupabase, 2000);
          }
        }
      }
    };

    // Start polling after a brief delay so the API call has a head start
    timerId = setTimeout(pollSupabase, 1500);

    return () => {
      active = false;
      clearTimeout(timerId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId]);

  // Poll Supabase for the client document to retrieve docId once created by checkout or webhook
  useEffect(() => {
    const targetEmail = queryEmail || (typeof window !== 'undefined' ? localStorage.getItem('buyer_email') : '') || '';
    if (isSaaS && provisioningStatus === 'idle' && (licenseKey || targetEmail)) {
      let active = true;
      let timeoutId: NodeJS.Timeout;

      const fetchClientDoc = async () => {
        if (!active) return;
        setProvisioningStatus('triggered');
        setLogs(['[System] Payment verified. Fetching setup session status...']);
        try {
          let query = supabase.from('agent_clients').select('*');
          if (licenseKey) {
            query = query.eq('license_key', licenseKey);
          } else if (targetEmail) {
            query = query.eq('email', targetEmail.toLowerCase().trim()).order('created_at', { ascending: false }).limit(1);
          }

          const { data } = await query;
          const doc = Array.isArray(data) ? data[0] : data;

          if (doc) {
            if (active) {
              if (doc.license_key) {
                resolveLicenseKey(doc.license_key);
              }
              setClientId(doc.client_id || doc.id);
              setDocId(doc.id);
              setConnectionType(doc.connection_type || 'baileys');
              setIntendedConnectionType(doc.intended_connection_type || null);
              setHermesProfile(doc.hermes_profile || null);
              setWhatsappVerifyToken(doc.whatsapp_verify_token || null);
              setLogs(prev => [...prev, `[System] Setup session identified. Client ID: ${doc.client_id || doc.id}`, '[System] Starting log stream...']);

              // FALLBACK: If status is 'pending' — trigger VPS provisioning now
              if (doc.status === 'pending' && !doc.server_ip) {
                console.log('[SaaS] Status is pending. Triggering provision from browser...');
                setLogs(prev => [...prev, '[System] Starting server provisioning & credential dispatch...']);
                try {
                  const provRes = await fetch('/api/admin/provision', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      businessName: doc.business_name,
                      ownerName: doc.owner_name,
                      botPhone: doc.whatsapp_bot_number,
                      ownerPhone: doc.owner_phone,
                      email: doc.email,
                      geminiApiKey: doc.gemini_api_key,
                      plan: doc.plan || 'saas',
                      sanityDocumentId: doc.id
                    }),
                  });
                  const provData = await provRes.json();
                  if (!provRes.ok) {
                    console.error('[SaaS] Provision trigger failed:', provData.error);
                    setLogs(prev => [...prev, `[Warning] Provision trigger: ${provData.error || 'retrying...'}`]);
                  } else {
                    console.log('[SaaS] Provision triggered successfully:', provData);
                  }
                } catch (provErr: any) {
                  console.error('[SaaS] Provision fetch error:', provErr.message);
                }
              }
            }
          } else {
            if (active) {
              timeoutId = setTimeout(fetchClientDoc, 3000);
            }
          }
        } catch (err: any) {
          console.error('Fetch client doc error:', err);
          if (active) {
            setLogs(prev => [...prev, `[Warning] Connecting to setup database: ${err.message || 'retrying...'}`]);
            timeoutId = setTimeout(fetchClientDoc, 4000);
          }
        }
      };

      fetchClientDoc();

      return () => {
        active = false;
        clearTimeout(timeoutId);
      };
    }
  }, [isSaaS, licenseKey, provisioningStatus, queryEmail]);

  // Poll status of the provisioning document in Sanity
  useEffect(() => {
    if (!docId) return;
    let active = true;
    let intervalId: NodeJS.Timeout;

    const triggerInstallFromBrowser = async (documentId: string) => {
      if (installTriggeredRef.current) {
        console.log('[Install] Already triggered, skipping duplicate call.');
        return;
      }
      installTriggeredRef.current = true;
      console.log('[Install] Browser triggering /api/admin/provision/install for doc:', documentId);
      setLogs(prev => [...prev, '[System] Browser connecting to installer (this may take 3-5 minutes)...']);
      try {
        const res = await fetch('/api/admin/provision/install', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ documentId }),
          // No signal timeout - let Vercel's 300s limit handle it
        });
        const data = await res.json();
        if (res.ok && data.success) {
          console.log('[Install] Completed successfully:', data.message);
          setLogs(prev => [...prev, '[System] Installation completed successfully! ✅']);
        } else {
          console.error('[Install] Failed:', data.error);
          setLogs(prev => [...prev, `[ERROR] Installer returned error: ${data.error || 'Unknown'}`]);
        }
      } catch (err: any) {
        console.error('[Install] Fetch error:', err.message);
        setLogs(prev => [...prev, `[ERROR] Install connection error: ${err.message}`]);
      }
    };

    const pollStatus = async () => {
      try {
        const res = await fetch(`/api/admin/provision/status?id=${docId}`);
        if (!res.ok) throw new Error('Failed to fetch status');
        const data = await res.json();
        if (active) {
          const finalLogs = data.logs || data.provisioningLogs;
          if (finalLogs && Array.isArray(finalLogs)) {
            setLogs(finalLogs);
          }

          // If the status route says we need to trigger install from browser, do it now
          if (data.needsInstallTrigger && data.documentId) {
            triggerInstallFromBrowser(data.documentId);
          }

          if (data.status === 'active' || data.status === 'complete') {
            setProvisioningStatus('active');
            clearInterval(intervalId);
          } else if (data.status === 'suspended' || data.status === 'failed') {
            setProvisioningStatus('suspended');
            clearInterval(intervalId);
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    };

    pollStatus();
    intervalId = setInterval(pollStatus, 5000);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [docId]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };


  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#111110] flex items-center justify-center p-6 font-body">
      <div className="max-w-xl w-full text-center space-y-8 animate-in fade-in zoom-in duration-700">
        <div className="relative">
          <div className="absolute inset-0 bg-[#0055ff] blur-3xl opacity-10 animate-pulse"></div>
          <CheckCircle2 className="w-20 h-20 text-[#0055ff] mx-auto relative" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-heading font-black tracking-tight leading-tight text-[#111110]">Payment Successful!</h1>
          <p className="text-[#6f6e69] text-[15px]">
            Thank you for purchasing <strong className="text-[#111110] font-extrabold">{isSaaS ? 'ScaleCraft Agent - Managed SaaS' : (isInstallation ? 'ScaleCraft Agent Complete Setup' : 'ScaleCraft Agent')}</strong>{buyerName ? `, ${buyerName.split(' ')[0]}` : ''}.
          </p>
        </div>

        <div className="bg-white border border-[#EBEBEB] rounded-[2.5rem] p-8 space-y-6 text-left relative overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.03)]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#0055ff]/5 rounded-full blur-[60px]"></div>

          <div className="space-y-1 relative z-10">
            <div className="inline-flex items-center gap-2 bg-[#0055ff]/10 text-[#0055ff] px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider mb-2">
              🤖 {isSaaS ? 'SaaS PROVISIONING ACTIVE' : (isInstallation ? 'DFY SETUP ACTIVE' : 'AGENT SETUP ACTIVE')}
            </div>
            <h3 className="text-xl font-bold text-[#111110]">Onboarding Instructions</h3>
            {buyerEmail && (
              <p className="text-xs text-[#6f6e69]">
                Confirmation details and credentials sent to: <strong className="text-[#111110]">{buyerEmail}</strong>
              </p>
            )}
          </div>

            {isSaaS ? (
              connectionType === 'cloud_api' ? (
                <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
                  <div>
                    <h3 className="text-[15px] font-semibold mb-1 text-black">
                      One last step — connect WhatsApp
                    </h3>
                    <p className="text-[13px] text-gray-500">
                      Register your webhook in Meta App Dashboard to start receiving messages.
                    </p>
                  </div>

                  {/* Step 1 — Callback URL */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold text-gray-700 uppercase tracking-wide">
                      Step 1 — Callback URL
                    </p>
                    <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                      <code className="flex-1 text-[11px] text-gray-800 truncate font-mono">
                        https://thescalecraft.in/api/webhooks/whatsapp-cloud
                      </code>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            'https://thescalecraft.in/api/webhooks/whatsapp-cloud'
                          );
                          setCopiedUrl(true);
                          setTimeout(() => setCopiedUrl(false), 2000);
                        }}
                        className="text-[11px] px-2 py-1 border border-gray-300 rounded text-gray-600 hover:bg-gray-100 whitespace-nowrap"
                      >
                        {copiedUrl ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  {/* Step 2 — Verify Token */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold text-gray-700 uppercase tracking-wide">
                      Step 2 — Verify Token
                    </p>
                    <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                      <code className="flex-1 text-[11px] text-gray-800 truncate font-mono">
                        {whatsappVerifyToken || `${hermesProfile}-webhook-token`}
                      </code>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            whatsappVerifyToken || `${hermesProfile}-webhook-token`
                          );
                          setCopiedToken(true);
                          setTimeout(() => setCopiedToken(false), 2000);
                        }}
                        className="text-[11px] px-2 py-1 border border-gray-300 rounded text-gray-600 hover:bg-gray-100 whitespace-nowrap"
                      >
                        {copiedToken ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  {/* Steps 3-4 */}
                  <div className="text-[12px] text-gray-600 space-y-1.5 bg-blue-50 border border-blue-100 rounded-lg p-3">
                    <p className="font-medium text-blue-700 mb-2">
                      In Meta App Dashboard:
                    </p>
                    <p>1. Go to WhatsApp → Configuration → Edit webhook</p>
                    <p>2. Paste the Callback URL and Verify Token above</p>
                    <p>3. Click Verify and save</p>
                    <p>4. Click Manage → enable messages field → Done</p>
                  </div>

                  <a
                    href="https://developers.facebook.com/apps"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-[12px] text-blue-600 underline"
                  >
                    Open Meta App Dashboard
                    <ExternalLink size={12} />
                  </a>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-[12px] text-green-700">
                    Once done, send a WhatsApp message to your bot number — your AI agent will reply automatically.
                  </div>
                </div>
              ) : (
                <div className="space-y-6 relative z-10">
                  <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-6 space-y-3.5 text-left border-l-4 border-l-emerald-500 shadow-sm">
                    <h4 className="font-extrabold text-emerald-800 flex items-center gap-2 text-sm uppercase tracking-wider font-heading">
                      <span>🤖</span> Provisioning Started!
                    </h4>
                    <p className="text-xs text-[#6F6E69] leading-relaxed">
                      We have initiated the configuration of your dedicated WhatsApp AI Agent instance (Mumbai Region). This setup takes about 10-15 minutes in the background.
                    </p>
                    <p className="text-xs text-[#6F6E69] leading-relaxed">
                      A welcome email containing your **temporary dashboard login credentials** has been sent to:
                      <br />
                      <strong className="text-[#111110] block mt-1 font-bold">{buyerEmail || 'your email address'}</strong>
                    </p>
                    <p className="text-xs text-[#6F6E69] leading-relaxed font-semibold">
                      You can log in to your ScaleCraft dashboard immediately to track the installation steps and view the live setup console logs.
                    </p>
                  </div>
 
                  {intendedConnectionType === 'cloud_api' && (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-xl text-left">
                      <p className="text-[13px] font-semibold text-blue-700 mb-2">
                        Next: Connect Official API
                      </p>
                      <p className="text-[12px] text-blue-600 leading-relaxed mb-3">
                        You selected Official API. After scanning the QR to go live, visit Agent Status in your dashboard to connect your Meta Cloud API credentials for extra stability.
                      </p>
                      <p className="text-[12px] text-blue-500 font-medium">
                        Dashboard → Agent Status → Connect WhatsApp Cloud API
                      </p>
                    </div>
                  )}

                  <div className="pt-4 border-t border-[#EBEBEB] space-y-3">
                    <a
                      href="/dashboard/login"
                      className="w-full bg-[#0055ff] hover:bg-[#0044cc] text-white py-4 rounded-xl font-bold text-sm block text-center transition-all shadow-[0_10px_20px_rgba(0,85,255,0.15)] uppercase tracking-wider font-heading"
                    >
                      Go to Dashboard Login →
                    </a>

                    {provisioningStatus === 'error' && (
                      <a
                        href={`https://wa.me/918078004732?text=Hi%20ScaleCraft%2C%20my%20SaaS%20provisioning%20failed%20for%20payment%20ID%20${paymentId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-red-50 text-red-700 hover:bg-red-100 py-3 rounded-xl font-bold text-xs block text-center transition-all border border-red-200"
                      >
                        Trigger error detected. Click to contact support on WhatsApp.
                      </a>
                    )}
                  </div>
                </div>
              )
            ) : (
              <div className="space-y-5 relative z-10">
                {isInstallation && (
                  <div className="bg-[#ecfdf5] border border-[#a7f3d0] rounded-2xl p-5 space-y-2 relative z-10" style={{ borderLeftWidth: '4px', borderLeftColor: '#059669' }}>
                    <h4 className="font-bold text-[#047857] flex items-center gap-2 text-xs uppercase tracking-wider">
                      <span>🛠️</span> Done-For-You Installation Included
                    </h4>
                    <p className="text-xs text-[#065f46] leading-relaxed font-medium">
                      You purchased the <strong>Complete Setup package</strong>. Our team will handle the server setup and installation for you.
                    </p>
                    <p className="text-xs text-[#065f46] leading-relaxed">
                      We will contact you on WhatsApp within 2-4 hours to begin the installation.
                    </p>
                  </div>
                )}

                <div className="space-y-5 relative z-10">
                  {isInstallation && (
                    <div className="text-xs text-[#6f6e69] leading-relaxed italic bg-[#F7F7F5] p-3.5 rounded-xl border border-[#EBEBEB]">
                      Note: You can safely ignore the server installation steps below as our team will set it up for you. We display these steps only for your reference.
                    </div>
                  )}
                  {/* License Key Box */}
                  <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-5 space-y-2.5">
                    <h4 className="font-bold text-[#0055ff] flex items-center gap-2 text-xs uppercase tracking-wider">
                      <span>🔑</span> YOUR LICENSE KEY
                    </h4>

                    {!licenseKey ? (
                      retryCount >= 10 ? (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 text-xs space-y-2">
                          <p className="font-bold flex items-center gap-1.5 text-red-800">
                            <AlertTriangle size={14} className="shrink-0" /> License Key Generation Delayed
                          </p>
                          <p>
                            We are having trouble retrieving your license key automatically. Please contact our support team on WhatsApp with your payment ID: <strong>{paymentId}</strong>.
                          </p>
                          <a
                            href={`https://wa.me/918078004732?text=Hi%20ScaleCraft%2C%20my%20license%20key%20is%20stuck%20loading%20for%20payment%20ID%20${paymentId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block bg-[#25D366] text-white px-3.5 py-1.5 rounded-lg font-bold hover:bg-[#20ba5a] transition-all"
                          >
                            Chat on WhatsApp
                          </a>
                        </div>
                      ) : (
                        <div className="relative flex items-center bg-[#111110] text-[#aeaca5] p-3.5 rounded-xl font-mono text-xs border border-[#2d2d2b] gap-3">
                          <Loader2 className="w-4.5 h-4.5 animate-spin text-[#0055ff] shrink-0" />
                          <span>Generating license key... please wait (Attempt {retryCount + 1}/10)</span>
                        </div>
                      )
                    ) : (
                      <div className="relative flex items-center bg-[#111110] text-[#ffffff] p-3.5 rounded-xl font-mono text-xs overflow-x-auto pr-12 group border border-[#2d2d2b]">
                        <code className="whitespace-nowrap select-all">{licenseKey}</code>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(licenseKey);
                            setCopiedKey(true);
                            setTimeout(() => setCopiedKey(false), 2000);
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-[#aeaca5] hover:text-white transition-colors"
                          title="Copy license key"
                          >
                          {copiedKey ? <Check size={16} className="text-[#34d399]" /> : <Copy size={16} />}
                        </button>
                      </div>
                    )}

                    <p className="text-xs text-[#6f6e69] leading-relaxed">
                      Keep this safe - the installer will activate the license automatically using the command below.
                    </p>
                  </div>

                  {/* STEP 1 - Open Setup Guide */}
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#6f6e69] flex items-center gap-1.5 font-heading">
                      <Terminal size={14} className="text-[#0055ff]" />
                      Step 1 - Open Setup Guide
                    </h4>
                    <p className="text-xs text-[#6f6e69] leading-relaxed">
                      Click below to open the interactive setup guide. Your license key will be pre-filled automatically:
                    </p>
                    <div className="pt-1">
                      <a
                        href={`/scalecraft-agent/guide?key=${licenseKey}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-[#25D366] hover:bg-[#20ba5a] text-white py-4 rounded-xl font-bold text-sm block text-center transition-all shadow-[0_10px_20px_rgba(37,211,102,0.15)] uppercase tracking-wider font-heading"
                      >
                        📖 Open Setup Guide
                      </a>
                    </div>
                  </div>

                  {/* STEP 2 - Fill details & copy command */}
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#6f6e69] flex items-center gap-1.5 font-heading">
                      <Terminal size={14} className="text-[#0055ff]" />
                      Step 2 - Fill details & copy command
                    </h4>
                    <p className="text-xs text-[#6f6e69] leading-relaxed">
                      In the setup guide, fill in your business details (Agent Name, Products, pricing) to automatically generate your customized installation command.
                    </p>
                  </div>

                  {/* STEP 3 - Run on server */}
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#6f6e69] flex items-center gap-1.5 font-heading">
                      <Terminal size={14} className="text-[#0055ff]" />
                      Step 3 - Run on server
                    </h4>
                    <p className="text-xs text-[#6f6e69] leading-relaxed">
                      Connect to your Linux server (VPS) or open Terminal on macOS and run the generated command.
                    </p>
                  </div>

                  {/* STEP 4 - Connect WhatsApp */}
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#6f6e69] flex items-center gap-1.5 font-heading">
                      <Terminal size={14} className="text-[#0055ff]" />
                      Step 4 - Connect WhatsApp
                    </h4>
                    <p className="text-xs text-[#6f6e69] leading-relaxed">
                      Once the installer has successfully completed, run the following commands to pair your WhatsApp:
                    </p>

                    <div className="relative flex items-start bg-[#111110] text-[#34d399] p-4 rounded-xl font-mono text-xs overflow-x-auto pr-12 group border border-[#2d2d2b]">
                      <code className="whitespace-pre text-left">{`source ~/.bashrc && echo "N" | hermes whatsapp`}</code>
                      <button
                        onClick={() => handleCopy(`source ~/.bashrc && echo "N" | hermes whatsapp`, 'wa_cmd')}
                        className="absolute right-3 top-4 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-[#aeaca5] hover:text-white transition-colors"
                        title="Copy command"
                      >
                        {copiedText === 'wa_cmd' ? <Check size={16} className="text-[#34d399]" /> : <Copy size={16} />}
                      </button>
                    </div>
                    <p className="text-xs text-[#6f6e69] leading-relaxed">
                      Then scan the QR with your bot phone:
                      <br />
                      <strong className="text-[#111110]">WhatsApp → Settings → Linked Devices → Link a Device → Scan QR</strong>
                    </p>
                  </div>

                  {/* STEP 5 - Restart */}
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#6f6e69] flex items-center gap-1.5 font-heading">
                      <Terminal size={14} className="text-[#0055ff]" />
                      Step 5 - Restart
                    </h4>
                    <p className="text-xs text-[#6f6e69] leading-relaxed">
                      After scanning the QR code, restart the gateway service to spin up your bot:
                    </p>

                    <div className="relative flex items-start bg-[#111110] text-[#34d399] p-4 rounded-xl font-mono text-xs overflow-x-auto pr-12 group border border-[#2d2d2b]">
                      <code className="whitespace-pre text-left">{`hermes gateway restart`}</code>
                      <button
                        onClick={() => handleCopy(`hermes gateway restart`, 'start_cmd')}
                        className="absolute right-3 top-4 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-[#aeaca5] hover:text-white transition-colors"
                        title="Copy command"
                      >
                        {copiedText === 'start_cmd' ? <Check size={16} className="text-[#34d399]" /> : <Copy size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* STEP 6 - Test */}
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#6f6e69] flex items-center gap-1.5 font-heading">
                      <Terminal size={14} className="text-[#0055ff]" />
                      Step 6 - Test
                    </h4>
                    <p className="text-xs text-[#6f6e69] leading-relaxed">
                      Send <strong className="text-[#111110]">"Hi"</strong> to your bot number from any phone to confirm it replies!
                    </p>
                  </div>

                  {/* Support button */}
                  <div className="pt-4 border-t border-[#EBEBEB]">
                    <a
                      href="https://wa.me/918078004732?text=Hi%20ScaleCraft%2C%20I%20just%20purchased%20ScaleCraft%20Agent%20and%20would%20like%20assistance%20onboarding."
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-[#25D366] hover:bg-[#20ba5a] text-white py-4 rounded-xl font-bold text-sm block text-center transition-all shadow-[0_10px_20px_rgba(37,211,102,0.15)]"
                    >
                      Chat on WhatsApp for Setup Support
                    </a>
                  </div>
                </div>
              </div>
            )}
        </div>

        <button
          onClick={() => router.push('/')}
          className="text-[#6f6e69] hover:text-[#111110] transition-colors font-medium text-sm inline-block"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}

export default function ScaleCraftAgentThankYou() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F7F7F5] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-[#0055ff] animate-spin" />
        <p className="text-[#6f6e69] text-sm font-semibold tracking-wide uppercase">Securing your setup dashboard...</p>
      </div>
    }>
      <ScaleCraftAgentThankYouContent />
    </Suspense>
  );
}
