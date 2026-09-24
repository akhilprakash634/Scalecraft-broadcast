'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Server,
  Play,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Terminal,
  Tag,
  Loader2
} from 'lucide-react';

export default function AdminProvisionPage() {
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [botPhone, setBotPhone] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [email, setEmail] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [plan, setPlan] = useState('starter');

  // Connection Type
  const [connectionType, setConnectionType] = useState<'baileys' | 'cloud_api'>('baileys');
  const [whatsappPhoneNumberId, setWhatsappPhoneNumberId] = useState('');
  const [whatsappAccessToken, setWhatsappAccessToken] = useState('');
  const [whatsappAppSecret, setWhatsappAppSecret] = useState('');
  const [whatsappWabaId, setWhatsappWabaId] = useState('');

  // Plan Type & Pricing Overrides
  const [planType, setPlanType] = useState<'standard' | 'trial'>('standard');
  const [monthlyAmount, setMonthlyAmount] = useState('');
  const [setupAmount, setSetupAmount] = useState('');

  // Coupon Code Validation
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount: number;
    discountedPrice: number;
    originalPrice: number;
  } | null>(null);
  const [couponError, setCouponError] = useState('');
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successDocId, setSuccessDocId] = useState<string | null>(null);

  // Live progress logs
  const [logs, setLogs] = useState<string[]>([]);
  const [provisioningStatus, setProvisioningStatus] = useState<'pending' | 'active' | 'suspended' | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const installTriggeredRef = useRef(false);

  const basePrice = plan === 'starter' ? 749 : plan === 'growth' ? 1199 : 1999;
  const currentPrice = appliedCoupon ? appliedCoupon.discountedPrice : basePrice;

  const handleValidateCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponError('');
    setIsValidatingCoupon(true);
    try {
      const res = await fetch(`/api/coupons/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: couponCode.trim(),
          productId: 'scalecraft-agent-saas',
          price: basePrice
        })
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setAppliedCoupon(data);
      } else {
        setAppliedCoupon(null);
        setCouponError(data.error || 'Invalid coupon code');
      }
    } catch (err: any) {
      setAppliedCoupon(null);
      setCouponError('Error validating coupon');
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim() || !ownerName.trim() || !botPhone.trim() || !ownerPhone.trim() || !email.trim() || !geminiApiKey.trim()) {
      setError('Please fill in all required configuration fields');
      return;
    }

    if (connectionType === 'cloud_api') {
      if (!whatsappPhoneNumberId.trim() || !whatsappAccessToken.trim() || !whatsappAppSecret.trim()) {
        setError('WhatsApp Phone Number ID, Access Token, and App Secret are required for Cloud API');
        return;
      }
    }

    setLoading(true);
    setError('');
    setSuccessDocId(null);
    setLogs(['[SYSTEM] Initializing cloud provisioning sequence...']);

    try {
      const res = await fetch('/api/admin/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName,
          ownerName,
          botPhone,
          ownerPhone,
          email,
          geminiApiKey,
          plan,
          connectionType,
          whatsappPhoneNumberId: connectionType === 'cloud_api' ? whatsappPhoneNumberId.trim() : undefined,
          whatsappAccessToken: connectionType === 'cloud_api' ? whatsappAccessToken.trim() : undefined,
          whatsappAppSecret: connectionType === 'cloud_api' ? whatsappAppSecret.trim() : undefined,
          whatsappWabaId: connectionType === 'cloud_api' && whatsappWabaId.trim() ? whatsappWabaId.trim() : undefined,
          plan_type: planType,
          monthly_amount: monthlyAmount.trim() ? Number(monthlyAmount) : undefined,
          setup_amount: setupAmount.trim() ? Number(setupAmount) : undefined
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server error initiating provisioning');

      setSuccessDocId(data.documentId);
      setProvisioningStatus('pending');
      
      // Clear inputs
      setBusinessName('');
      setOwnerName('');
      setBotPhone('');
      setOwnerPhone('');
      setEmail('');
      setGeminiApiKey('');
      setWhatsappPhoneNumberId('');
      setWhatsappAccessToken('');
      setWhatsappAppSecret('');
      setWhatsappWabaId('');
      setMonthlyAmount('');
      setSetupAmount('');
      setCouponCode('');
      setAppliedCoupon(null);
    } catch (err: any) {
      setError(err.message || 'Connection failed.');
      setLoading(false);
    }
  };

  // Poll status when documentId is registered
  useEffect(() => {
    if (successDocId) {

      const triggerInstallFromBrowser = async (documentId: string) => {
        if (installTriggeredRef.current) return;
        installTriggeredRef.current = true;
        console.log('[Admin Install] Browser triggering install for doc:', documentId);
        setLogs(prev => [...prev, '[SYSTEM] Browser connecting to installer (3-5 min)...']);
        try {
          const res = await fetch('/api/admin/provision/install', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ documentId }),
          });
          const data = await res.json();
          if (res.ok && data.success) {
            setLogs(prev => [...prev, '[SYSTEM] Installation completed successfully! ✅']);
          } else {
            setLogs(prev => [...prev, `[ERROR] Installer: ${data.error || 'Unknown error'}`]);
          }
        } catch (err: any) {
          setLogs(prev => [...prev, `[ERROR] Install fetch error: ${err.message}`]);
        }
      };

      pollIntervalRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/admin/provision/status?id=${successDocId}`);
          if (res.ok) {
            const data = await res.json();
            setLogs(data.logs || data.provisioningLogs || []);
            setProvisioningStatus(data.status as any);

            // Browser triggers the installer when the status route flags it
            if (data.needsInstallTrigger && data.documentId) {
              triggerInstallFromBrowser(data.documentId);
            }

            if (data.status === 'complete' || data.status === 'active' || data.status === 'suspended' || data.status === 'failed') {
              if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
              }
              setLoading(false);
            }
          }
        } catch (err) {
          console.error('Error polling status logs:', err);
        }
      }, 4000);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [successDocId]);

  return (
    <div className="min-h-screen bg-[#F8FBF8] p-6 md:p-12 space-y-8 text-xs font-semibold">
      {/* Header */}
      <div className="flex items-center space-x-4 border-b border-[#E0E0E0] pb-6">
        <Link
          href="/admin"
          className="p-2 bg-white border border-[#E0E0E0] hover:bg-[#F8FBF8] rounded-lg text-[#757575] transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black text-[#212121] tracking-tight uppercase font-heading">
              VPS Agent Provisioning
            </h1>
            <span className="bg-blue-50 text-[#0055FF] text-[9px] font-black px-2 py-0.5 rounded uppercase">
              AWS Lightsail (Mumbai)
            </span>
          </div>
          <p className="text-sm text-[#757575] mt-1">
            Configure new SaaS client servers, trigger script installations, and setup Sheets logs syncs.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-[#FFEBEE] border border-red-100 text-[#C62828] text-xs font-semibold p-4 rounded-xl flex items-center space-x-2">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
        {/* Provision Form */}
        <div className="lg:col-span-2 bg-white border border-[#E0E0E0] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)] space-y-5">
          <h2 className="text-base font-bold text-[#212121] border-b border-[#E0E0E0] pb-3 font-heading">
            Client Server Configuration
          </h2>

          <form onSubmit={handleProvision} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="business-name-input" className="block text-[10px] font-bold text-[#757575] uppercase tracking-wider">
                  Business Name *
                </label>
                <input
                  id="business-name-input"
                  type="text"
                  required
                  disabled={loading}
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Acme Craft"
                  className="w-full text-xs border border-[#E0E0E0] rounded-lg px-4 py-2.5 focus:outline-none focus:border-[#1B5E20]"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="owner-name-input" className="block text-[10px] font-bold text-[#757575] uppercase tracking-wider">
                  Owner Full Name *
                </label>
                <input
                  id="owner-name-input"
                  type="text"
                  required
                  disabled={loading}
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full text-xs border border-[#E0E0E0] rounded-lg px-4 py-2.5 focus:outline-none focus:border-[#1B5E20]"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="bot-phone-input" className="block text-[10px] font-bold text-[#757575] uppercase tracking-wider">
                  WhatsApp Bot Phone *
                </label>
                <input
                  id="bot-phone-input"
                  type="text"
                  required
                  disabled={loading}
                  value={botPhone}
                  onChange={(e) => setBotPhone(e.target.value)}
                  placeholder="e.g. 918078004732"
                  className="w-full text-xs border border-[#E0E0E0] rounded-lg px-4 py-2.5 focus:outline-none focus:border-[#1B5E20]"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="owner-phone-input" className="block text-[10px] font-bold text-[#757575] uppercase tracking-wider">
                  Owner Personal Phone *
                </label>
                <input
                  id="owner-phone-input"
                  type="text"
                  required
                  disabled={loading}
                  value={ownerPhone}
                  onChange={(e) => setOwnerPhone(e.target.value)}
                  placeholder="e.g. 918078004732 (for OTP codes)"
                  className="w-full text-xs border border-[#E0E0E0] rounded-lg px-4 py-2.5 focus:outline-none focus:border-[#1B5E20]"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="client-email-input" className="block text-[10px] font-bold text-[#757575] uppercase tracking-wider">
                  Client Email *
                </label>
                <input
                  id="client-email-input"
                  type="email"
                  required
                  disabled={loading}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. owner@acme.com"
                  className="w-full text-xs border border-[#E0E0E0] rounded-lg px-4 py-2.5 focus:outline-none focus:border-[#1B5E20]"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="gemini-key-input" className="block text-[10px] font-bold text-[#757575] uppercase tracking-wider">
                  Gemini API Key *
                </label>
                <input
                  id="gemini-key-input"
                  type="password"
                  required
                  disabled={loading}
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  placeholder="AIStudio key (AI2za...)"
                  className="w-full text-xs border border-[#E0E0E0] rounded-lg px-4 py-2.5 focus:outline-none focus:border-[#1B5E20]"
                />
              </div>
            </div>

            {/* Connection Type Selector */}
            <div className="space-y-2 border-t border-[#E0E0E0] pt-4">
              <label className="block text-[10px] font-bold text-[#757575] uppercase tracking-wider">
                WhatsApp Connection Gateway *
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className={`flex items-center gap-2 p-3 border rounded-xl cursor-pointer transition-colors ${
                  connectionType === 'baileys' ? 'bg-[#F0F7F0] border-[#1B5E20]' : 'border-[#E0E0E0] hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name="connectionType"
                    checked={connectionType === 'baileys'}
                    onChange={() => setConnectionType('baileys')}
                    className="sr-only"
                  />
                  <div>
                    <span className="block font-bold">⚡ Baileys (Unofficial)</span>
                    <span className="block text-[10px] text-gray-500 font-normal">Connect via QR scan interface</span>
                  </div>
                </label>
                <label className={`flex items-center gap-2 p-3 border rounded-xl cursor-pointer transition-colors ${
                  connectionType === 'cloud_api' ? 'bg-[#F0F7F0] border-[#1B5E20]' : 'border-[#E0E0E0] hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name="connectionType"
                    checked={connectionType === 'cloud_api'}
                    onChange={() => setConnectionType('cloud_api')}
                    className="sr-only"
                  />
                  <div>
                    <span className="block font-bold">🔒 Cloud API (Official)</span>
                    <span className="block text-[10px] text-gray-500 font-normal">Connect via Meta Developers Console</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Cloud API Fields (Conditional) */}
            {connectionType === 'cloud_api' && (
              <div className="bg-gray-50 border border-[#E0E0E0] rounded-xl p-4 space-y-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <h4 className="sm:col-span-2 text-xs font-bold text-gray-700">Meta Cloud Credentials</h4>
                
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-[#757575] uppercase tracking-wider">
                    Phone Number ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={whatsappPhoneNumberId}
                    onChange={(e) => setWhatsappPhoneNumberId(e.target.value)}
                    placeholder="e.g. 10488219491..."
                    className="w-full text-xs border border-[#E0E0E0] rounded-lg px-4 py-2 bg-white focus:outline-none focus:border-[#1B5E20]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-[#757575] uppercase tracking-wider">
                    WABA ID (Business Account ID)
                  </label>
                  <input
                    type="text"
                    value={whatsappWabaId}
                    onChange={(e) => setWhatsappWabaId(e.target.value)}
                    placeholder="e.g. 109284192..."
                    className="w-full text-xs border border-[#E0E0E0] rounded-lg px-4 py-2 bg-white focus:outline-none focus:border-[#1B5E20]"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="block text-[10px] font-bold text-[#757575] uppercase tracking-wider">
                    Access Token *
                  </label>
                  <input
                    type="text"
                    required
                    value={whatsappAccessToken}
                    onChange={(e) => setWhatsappAccessToken(e.target.value)}
                    placeholder="EAAGy..."
                    className="w-full text-xs border border-[#E0E0E0] rounded-lg px-4 py-2 bg-white focus:outline-none focus:border-[#1B5E20]"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="block text-[10px] font-bold text-[#757575] uppercase tracking-wider">
                    App Secret *
                  </label>
                  <input
                    type="text"
                    required
                    value={whatsappAppSecret}
                    onChange={(e) => setWhatsappAppSecret(e.target.value)}
                    placeholder="Meta App Secret Key"
                    className="w-full text-xs border border-[#E0E0E0] rounded-lg px-4 py-2 bg-white focus:outline-none focus:border-[#1B5E20]"
                  />
                </div>
              </div>
            )}

            {/* Plan Type Selector */}
            <div className="space-y-2 border-t border-[#E0E0E0] pt-4">
              <label className="block text-[10px] font-bold text-[#757575] uppercase tracking-wider">
                Plan Type (Trial Onboarding) *
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className={`flex items-center gap-2 p-3 border rounded-xl cursor-pointer transition-colors ${
                  planType === 'standard' ? 'bg-[#F0F7F0] border-[#1B5E20]' : 'border-[#E0E0E0] hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name="planType"
                    checked={planType === 'standard'}
                    onChange={() => setPlanType('standard')}
                    className="sr-only"
                  />
                  <div>
                    <span className="block font-bold">Standard Paid</span>
                    <span className="block text-[10px] text-gray-500 font-normal">Active monthly recurring subscription</span>
                  </div>
                </label>
                <label className={`flex items-center gap-2 p-3 border rounded-xl cursor-pointer transition-colors ${
                  planType === 'trial' ? 'bg-[#F0F7F0] border-[#1B5E20]' : 'border-[#E0E0E0] hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name="planType"
                    checked={planType === 'trial'}
                    onChange={() => setPlanType('trial')}
                    className="sr-only"
                  />
                  <div>
                    <span className="block font-bold">5-Day Free Trial</span>
                    <span className="block text-[10px] text-gray-500 font-normal">Onboard for free (5 days duration)</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Custom pricing overrides */}
            <div className="bg-gray-50 border border-[#E0E0E0] rounded-xl p-4 space-y-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <h4 className="sm:col-span-2 text-xs font-bold text-gray-700">Billing Pricing Overrides (Optional)</h4>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-[#757575] uppercase tracking-wider">
                  One-time Setup Fee (INR)
                </label>
                <input
                  type="number"
                  value={setupAmount}
                  onChange={(e) => setSetupAmount(e.target.value)}
                  placeholder="e.g. 6999 (default)"
                  className="w-full text-xs border border-[#E0E0E0] rounded-lg px-4 py-2 bg-white focus:outline-none focus:border-[#1B5E20]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-[#757575] uppercase tracking-wider">
                  Monthly Rate (INR)
                </label>
                <input
                  type="number"
                  value={monthlyAmount}
                  onChange={(e) => setMonthlyAmount(e.target.value)}
                  placeholder="e.g. 1299 (default)"
                  className="w-full text-xs border border-[#E0E0E0] rounded-lg px-4 py-2 bg-white focus:outline-none focus:border-[#1B5E20]"
                />
              </div>
            </div>

            {/* Coupon Code section */}
            <div className="border-t border-[#E0E0E0] pt-4 space-y-2">
              <label className="block text-[10px] font-bold text-[#757575] uppercase tracking-wider">
                Promo Coupon Code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="e.g. SPECIAL10"
                  className="flex-1 text-xs border border-[#E0E0E0] rounded-lg px-4 py-2 focus:outline-none focus:border-[#1B5E20] uppercase"
                />
                <button
                  type="button"
                  onClick={handleValidateCoupon}
                  disabled={isValidatingCoupon || !couponCode.trim()}
                  className="bg-gray-900 text-white font-bold text-xs px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {isValidatingCoupon ? <Loader2 size={12} className="animate-spin" /> : <Tag size={12} />}
                  Validate
                </button>
              </div>
              {appliedCoupon && (
                <p className="text-xs text-emerald-700 font-semibold">
                  ✓ Coupon applied! Discounted Setup Price: ₹{appliedCoupon.discountedPrice.toLocaleString('en-IN')} (Saved ₹{appliedCoupon.discount.toLocaleString('en-IN')})
                </p>
              )}
              {couponError && (
                <p className="text-xs text-red-500 font-semibold">
                  ⚠️ {couponError}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="plan-select" className="block text-[10px] font-bold text-[#757575] uppercase tracking-wider">
                Subscription Plan Level *
              </label>
              <select
                id="plan-select"
                disabled={loading}
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                className="w-full text-xs border border-[#E0E0E0] rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:border-[#1B5E20] cursor-pointer font-bold"
              >
                <option value="starter">Starter Plan (₹749/mo - 500 msgs limit)</option>
                <option value="growth">Growth Plan (₹1,199/mo - 2000 msgs limit)</option>
                <option value="pro">Pro Plan (₹1,999/mo - Unlimited msgs)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1B5E20] hover:bg-[#144317] disabled:bg-[#AEACA5] text-white text-xs font-bold py-3.5 px-4 rounded-lg shadow-sm transition-colors cursor-pointer flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Provisioning Client VPS Instance...</span>
                </>
              ) : (
                <>
                  <Server size={14} />
                  <span>Provision Managed Agent</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Provision Progress Terminal */}
        <div className="bg-white border border-[#E0E0E0] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex flex-col justify-between">
          <div className="space-y-4 flex-1 flex flex-col">
            <h3 className="text-sm font-bold text-[#212121] border-b border-[#E0E0E0] pb-2 flex items-center space-x-1.5 font-heading">
              <Terminal size={16} className="text-[#1B5E20]" />
              <span>Provisioning Terminal</span>
            </h3>

            {/* Terminal log logs */}
            <div className="flex-1 bg-gray-950 p-4 rounded-xl font-mono text-[9px] text-green-400 overflow-y-auto min-h-[300px] max-h-[350px] space-y-1.5">
              {logs.length === 0 ? (
                <div className="text-gray-500 italic py-12 text-center">
                  Fill in configuration fields and submit to start provisioning logs stream.
                </div>
              ) : (
                logs.map((log, index) => <div key={index}>{log}</div>)
              )}
            </div>
          </div>

          {/* Status badge at bottom */}
          {provisioningStatus && (
            <div className="mt-4 pt-4 border-t border-[#E0E0E0] flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#757575] uppercase tracking-wider">Status:</span>
              <span
                className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                  provisioningStatus === 'active'
                    ? 'bg-[#E8F5E9] text-[#2E7D32]'
                    : provisioningStatus === 'suspended'
                    ? 'bg-[#FFEBEE] text-[#C62828]'
                    : 'bg-[#FFF9C4] text-amber-800'
                }`}
              >
                {provisioningStatus === 'active'
                  ? 'Completed Success'
                  : provisioningStatus === 'suspended'
                  ? 'Provisioning Failed'
                  : 'Installing Components...'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
