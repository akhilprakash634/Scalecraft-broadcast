'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { initiateCheckout } from '@/utils/razorpay';
import { ShieldCheck, ArrowRight, Mail, User, Loader2, CheckCircle2, Tag } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

function ScaleCraftAgentCheckoutContent() {
  const searchParams = useSearchParams();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [productName, setProductName] = useState('ScaleCraft Agent');
  const [features, setFeatures] = useState<string[]>([]);
  const [productDesc, setProductDesc] = useState('');
  const [price, setPrice] = useState<number>(2999);
  const [monthlyPrice, setMonthlyPrice] = useState<number>(749);
  const [loadingPrice, setLoadingPrice] = useState<boolean>(true);

  // SaaS specific states
  const [businessName, setBusinessName] = useState('');
  const [botPhone, setBotPhone] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [connectionType, setConnectionType] = useState<'baileys' | 'cloud_api'>('baileys');
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Coupon code states
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount: number;
    discountedPrice: number;
    originalPrice: number;
    type: string;
    value: number;
  } | null>(null);
  const [couponMessage, setCouponMessage] = useState('');
  const [couponError, setCouponError] = useState(false);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  const isTrial = searchParams?.get('plan') === 'saas' && searchParams?.get('trial') === 'true';

  useEffect(() => {
    const fetchProductPrice = async () => {
      try {
        const isSaaS = searchParams?.get('plan') === 'saas';
        const isInstallation = searchParams?.get('installation') === 'true';
        const targetId = isSaaS ? 'scalecraft-agent-saas' : (isInstallation ? '7ca5a08c-6f75-4be5-aa86-d41c2f2d669c' : 'mOBd3I07NrgTLn79T01oEq');
        
        const { data: product } = await supabase
          .from('saas_products')
          .select('id, name, description, price, test_mode, setup_price, monthly_price, features')
          .eq('id', targetId)
          .maybeSingle();

        if (product) {
          setProductName(product.name || 'ScaleCraft Agent');
          setProductDesc(product.description || '');
          setFeatures(product.features || []);
          
          const rawSetup = product.setup_price || product.price;
          const cleanSetup = product.test_mode ? 5 : rawSetup;
          if (isTrial) {
            setPrice(2);
            setMonthlyPrice(product.monthly_price || 1299);
          } else {
            setPrice(Number(cleanSetup) || (isSaaS ? 6499 : (isInstallation ? 4999 : 2999)));
            if (product.monthly_price) {
              setMonthlyPrice(Number(product.monthly_price));
            } else if (isSaaS) {
              setMonthlyPrice(1299);
            }
          }
        } else {
          if (isTrial) {
            setPrice(2);
            setMonthlyPrice(1299);
          } else {
            setPrice(isSaaS ? 6499 : (isInstallation ? 4999 : 2999));
            if (isSaaS) setMonthlyPrice(1299);
          }
        }
      } catch (err) {
        console.error('Error fetching product price from Supabase:', err);
        const isSaaS = searchParams?.get('plan') === 'saas';
        const isInstallation = searchParams?.get('installation') === 'true';
        if (isTrial) {
          setPrice(2);
          setMonthlyPrice(1299);
        } else {
          setPrice(isSaaS ? 6499 : (isInstallation ? 4999 : 2999));
          if (isSaaS) setMonthlyPrice(1299);
        }
      } finally {
        setLoadingPrice(false);
      }
    };
    fetchProductPrice();
  }, [searchParams, isTrial]);

  useEffect(() => {
    if (searchParams?.get('trial_used') === 'true') {
      setError('You have already used your 5-day trial. We have automatically switched you to the standard plan.');
    }
  }, [searchParams]);

  useEffect(() => {
    // Pre-fill email/name/SaaS fields if present in query parameters or localStorage
    const savedEmail = searchParams?.get('email') || localStorage.getItem('buyer_email') || '';
    const savedName = searchParams?.get('name') || localStorage.getItem('buyer_name') || '';
    const savedBizName = localStorage.getItem('buyer_business_name') || '';
    const savedBotPhone = localStorage.getItem('buyer_bot_phone') || '';
    const savedOwnerPhone = localStorage.getItem('buyer_owner_phone') || '';
    const savedGeminiKey = localStorage.getItem('buyer_gemini_key') || '';

    setTimeout(() => {
      if (savedEmail) setEmail(savedEmail);
      if (savedName) setName(savedName);
      if (savedBizName) setBusinessName(savedBizName);
      if (savedBotPhone) setBotPhone(savedBotPhone);
      if (savedOwnerPhone) setOwnerPhone(savedOwnerPhone);
      if (savedGeminiKey) setGeminiApiKey(savedGeminiKey);
    }, 0);
  }, [searchParams]);

  const handleApplyCoupon = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    setCouponMessage('');
    setCouponError(false);
    setIsValidatingCoupon(true);

    try {
      const isSaaS = searchParams?.get('plan') === 'saas';
      const isInstallation = searchParams?.get('installation') === 'true';
      const targetId = isSaaS ? 'scalecraft-agent-saas' : (isInstallation ? '7ca5a08c-6f75-4be5-aa86-d41c2f2d669c' : 'mOBd3I07NrgTLn79T01oEq');

      const res = await fetch(`/api/coupons/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: couponInput.trim(),
          productId: targetId,
          price: price
        })
      });

      const data = await res.json();
      if (res.ok && data.valid) {
        setAppliedCoupon(data);
        setCouponMessage(`Coupon "${data.code}" applied! Saved ₹${data.discount.toLocaleString('en-IN')}.`);
        setCouponError(false);
      } else {
        setAppliedCoupon(null);
        setCouponMessage(data.error || 'Invalid coupon code');
        setCouponError(true);
      }
    } catch (err) {
      console.error('Coupon validation error:', err);
      setAppliedCoupon(null);
      setCouponMessage('Error validating coupon. Please try again.');
      setCouponError(true);
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = (e: React.MouseEvent) => {
    e.preventDefault();
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponMessage('');
    setCouponError(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    const isSaaS = searchParams?.get('plan') === 'saas';
    if (isSaaS) {
      if (!businessName.trim() || !botPhone.trim() || !ownerPhone.trim() || !geminiApiKey.trim()) {
        setError('Please fill in all setup configuration details for Managed SaaS');
        return;
      }
    }



    if (!termsAccepted) {
      setError('Please read and accept the Terms of Service and Privacy Policy to continue.');
      return;
    }

    setIsSubmitting(true);

    try {
      localStorage.setItem('buyer_email', email.trim());
      localStorage.setItem('buyer_name', name.trim());

      let registeredClientId = undefined;
      if (isSaaS) {
        // First record legal agreement and IP address on the backend
        const saveTermsRes = await fetch('/api/saas/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            businessName: businessName.trim(),
            botPhone: botPhone.trim(),
            ownerPhone: ownerPhone.trim(),
            geminiApiKey: geminiApiKey.trim(),
            plan: 'saas',
            plan_type: isTrial ? 'trial' : 'standard',
            connectionType: connectionType,
          }),
        });

        const resData = await saveTermsRes.json();

        if (!saveTermsRes.ok) {
          if (resData.error === 'already_had_trial') {
            setError(resData.message);
            setIsSubmitting(false);
            setTimeout(() => {
              window.location.href = `/checkout/scalecraft-agent?plan=saas&trial_used=true`;
            }, 3000);
            return;
          }
          throw new Error(resData.error || 'Failed to register terms acceptance. Please try again.');
        }

        registeredClientId = resData.clientId;
        localStorage.setItem('buyer_business_name', businessName.trim());
        localStorage.setItem('buyer_bot_phone', botPhone.trim());
        localStorage.setItem('buyer_owner_phone', ownerPhone.trim());
        localStorage.setItem('buyer_gemini_key', geminiApiKey.trim());
        localStorage.setItem('buyer_plan', 'saas');
      }

      const isInstallation = searchParams?.get('installation') === 'true';
      const productId = isSaaS ? 'scalecraft-agent-saas' : (isInstallation ? '7ca5a08c-6f75-4be5-aa86-d41c2f2d669c' : 'mOBd3I07NrgTLn79T01oEq');
      const finalPrice = appliedCoupon ? appliedCoupon.discountedPrice : price;

      await initiateCheckout({
        amount: finalPrice, // Dynamic price from Sanity (discounted if coupon applied)
        currency: 'INR',
        name: 'ScaleCraft',
        description: isTrial
          ? `${productName} - 5-Day Trial Activation`
          : (isSaaS ? `${productName} - Managed SaaS` : (isInstallation ? `${productName} Complete Setup (Done-For-You)` : `${productDesc || 'WhatsApp AI Sales Agent - setup in under 2 hours'}`)),
        productId: productId, // Dynamic product ID in Sanity
        buyerName: name.trim(),
        buyerEmail: email.trim().toLowerCase(),
        couponCode: appliedCoupon ? appliedCoupon.code : undefined,
        businessName: isSaaS ? businessName.trim() : undefined,
        botPhone: isSaaS ? botPhone.trim() : undefined,
        ownerPhone: isSaaS ? ownerPhone.trim() : undefined,
        geminiApiKey: isSaaS ? geminiApiKey.trim() : undefined,
        clientId: registeredClientId,
        plan_type: isTrial ? 'trial' : 'standard',
        onSuccess: (response) => {
          let redirectUrl = `/thank-you/scalecraft-agent?payment_id=${response.razorpay_payment_id}&email=${encodeURIComponent(email.trim().toLowerCase())}&name=${encodeURIComponent(name.trim())}&product_id=${productId}`;
          if (appliedCoupon) {
            redirectUrl += `&coupon=${encodeURIComponent(appliedCoupon.code)}`;
          }
          window.location.href = redirectUrl;
        },
        onCancel: () => {
          setIsSubmitting(false);
        }
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment initiation failed. Please try again.';
      setError(errorMessage);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#111110] font-body flex items-center justify-center p-4 sm:p-8">
      <div className="max-w-4xl w-full bg-white border border-[#EBEBEB] rounded-[2.5rem] shadow-[0_24px_60px_rgba(0,0,0,0.03)] overflow-hidden grid grid-cols-1 md:grid-cols-12 gap-0 relative">
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#0055ff]/5 rounded-full blur-[60px] -z-0"></div>

        {/* Product Details Sidebar */}
        <div className="md:col-span-5 bg-[#F7F7F5] border-r border-[#EBEBEB] p-8 sm:p-10 flex flex-col justify-between relative">
          <div className="space-y-6">
            <Link href="/" className="flex items-center">
              <img
                src="/scalecraft-logo-light.svg"
                alt="ScaleCraft"
                style={{ height: '30px', width: 'auto' }}
              />
            </Link>

            <div className="space-y-2">
              <span className="inline-block bg-[#ecfdf5] border border-[#a7f3d0] text-[#047857] text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full">
                {isTrial ? '5-Day Free Trial' : (searchParams?.get('plan') === 'saas' ? 'Fully Managed (SaaS)' : 'One-Time Payment')}
              </span>
              <h3 className="font-heading text-xl font-extrabold tracking-tight text-[#111110]">
                {isTrial
                  ? `${productName} - 5-Day Trial`
                  : (searchParams?.get('plan') === 'saas'
                    ? `${productName} - Managed SaaS`
                    : (searchParams?.get('installation') === 'true' ? `${productName} Complete Setup` : productName))}
              </h3>
              <p className="text-xs text-[#6f6e69] leading-relaxed">
                {isTrial
                  ? `Activate your 5-day ${productName} trial. Includes full VPS server setup, same as paid.`
                  : (searchParams?.get('plan') === 'saas'
                    ? `Fully managed ${productName}. We host, install, and manage everything.`
                    : (searchParams?.get('installation') === 'true'
                      ? `${productName} including full installation and server setup by our team.`
                      : productDesc || `${productName} that replies 24/7, handles objections, and closes sales.`))}
              </p>
            </div>

            <ul className="space-y-3 pt-4 border-t border-[#EBEBEB]">
              {((features && features.length > 0) ? features : (isTrial ? [
                'Dedicated VPS server Mumbai',
                '5 Days complete trial period',
                'No restrictions - full features',
                'Upgrade anytime from dashboard',
                'First 5 days for just ₹2',
                'Priority setup support'
              ] : (searchParams?.get('plan') === 'saas' ? [
                'Dedicated VPS server Mumbai',
                'We install everything',
                'Dashboard to manage products and leads',
                'Lead CRM synced to Google Sheets',
                'Chat memory system',
                'Usage and billing dashboard',
                'Priority support'
              ] : (searchParams?.get('installation') === 'true' ? [
                'Done-for-you server installation',
                'Full VPS setup & configuration',
                'Gemini API key & WhatsApp pairing',
                'SOUL.md business prompt fine-tuning',
                '1-on-1 walkthrough & training session',
                'Priority WhatsApp founder support'
              ] : [
                'One-command installer script',
                'SOUL.md business generator',
                'Voice message transcription',
                'WhatsApp chat support for setup',
                'Free lifetime updates'
              ])))).map((f, i) => (
                <li key={i} className="flex items-center gap-2.5 text-xs text-[#111110]">
                  <CheckCircle2 size={14} className="text-[#059669] shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-8 border-t border-[#EBEBEB] mt-8 space-y-3">
            {appliedCoupon && (
              <>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#6f6e69]">Original Price</span>
                  <span className="font-semibold line-through text-[#aeaca5]">
                    ₹{price.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs text-[#047857] font-semibold">
                  <span className="flex items-center gap-1"><Tag size={12} /> Discount ({appliedCoupon.code})</span>
                  <span>-₹{appliedCoupon.discount.toLocaleString('en-IN')}</span>
                </div>
              </>
            )}
            <div className="flex justify-between items-baseline pt-2 border-t border-[#EBEBEB]/50">
              <span className="text-xs font-bold uppercase tracking-wider text-[#6f6e69]">Total Due</span>
              <span className="font-heading text-3xl font-black tracking-tight text-[#0055ff]">
                {loadingPrice ? '...' : `₹${(appliedCoupon ? appliedCoupon.discountedPrice : price).toLocaleString('en-IN')}`}
              </span>
            </div>
            <p className="text-[10px] text-[#aeaca5] mt-1">
              {isTrial
                ? `After 5 days: ₹6,999 setup + ₹${monthlyPrice.toLocaleString('en-IN')}/month`
                : (searchParams?.get('plan') === 'saas'
                  ? `Includes VPS server setup + ₹${monthlyPrice.toLocaleString('en-IN')}/month`
                  : (searchParams?.get('installation') === 'true'
                    ? 'Includes full server setup + founder walkthrough'
                    : 'Includes setup installer guide + support'))}
            </p>
          </div>
        </div>

        {/* Checkout Form */}
        <div className="md:col-span-7 p-8 sm:p-10 flex flex-col justify-center relative z-10">
          <div className="space-y-2 mb-8">
            <h2 className="text-2xl font-black text-[#111110] tracking-tight">Checkout</h2>
            <p className="text-sm text-[#6f6e69] leading-relaxed">
              Enter your details below. We will send your setup guide and install keys to this email address.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="checkout-name" className="text-xs font-bold uppercase tracking-wider text-[#6f6e69] ml-1">Full Name</label>
                <div className="relative">
                  <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6f6e69]" />
                  <input
                    id="checkout-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full bg-[#F7F7F5] border border-[#EBEBEB] rounded-xl pl-12 pr-4 py-4 text-[#111110] placeholder-[#aeaca5] focus:outline-none focus:bg-white focus:border-[#0055ff]/50 focus:ring-1 focus:ring-[#0055ff]/50 transition-all text-sm"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="checkout-email" className="text-xs font-bold uppercase tracking-wider text-[#6f6e69] ml-1">Email Address</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6f6e69]" />
                  <input
                    id="checkout-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="w-full bg-[#F7F7F5] border border-[#EBEBEB] rounded-xl pl-12 pr-4 py-4 text-[#111110] placeholder-[#aeaca5] focus:outline-none focus:bg-white focus:border-[#0055ff]/50 focus:ring-1 focus:ring-[#0055ff]/50 transition-all text-sm"
                    required
                  />
                </div>
              </div>

              {searchParams?.get('plan') === 'saas' && (
                <>
                  <div className="space-y-2">
                    <label htmlFor="checkout-biz-name" className="text-xs font-bold uppercase tracking-wider text-[#6f6e69] ml-1">Business Name</label>
                    <input
                      id="checkout-biz-name"
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. Craft Street"
                      className="w-full bg-[#F7F7F5] border border-[#EBEBEB] rounded-xl px-4 py-4 text-[#111110] placeholder-[#aeaca5] focus:outline-none focus:bg-white focus:border-[#0055ff]/50 focus:ring-1 focus:ring-[#0055ff]/50 transition-all text-sm"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="checkout-bot-phone" className="text-xs font-bold uppercase tracking-wider text-[#6f6e69] ml-1">Bot WhatsApp Number</label>
                    <input
                      id="checkout-bot-phone"
                      type="tel"
                      value={botPhone}
                      onChange={(e) => setBotPhone(e.target.value)}
                      placeholder="e.g. +91 98765 43210"
                      className="w-full bg-[#F7F7F5] border border-[#EBEBEB] rounded-xl px-4 py-4 text-[#111110] placeholder-[#aeaca5] focus:outline-none focus:bg-white focus:border-[#0055ff]/50 focus:ring-1 focus:ring-[#0055ff]/50 transition-all text-sm"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="checkout-owner-phone" className="text-xs font-bold uppercase tracking-wider text-[#6f6e69] ml-1">Owner Personal Number</label>
                    <input
                      id="checkout-owner-phone"
                      type="tel"
                      value={ownerPhone}
                      onChange={(e) => setOwnerPhone(e.target.value)}
                      placeholder="e.g. +91 98765 43210"
                      className="w-full bg-[#F7F7F5] border border-[#EBEBEB] rounded-xl px-4 py-4 text-[#111110] placeholder-[#aeaca5] focus:outline-none focus:bg-white focus:border-[#0055ff]/50 focus:ring-1 focus:ring-[#0055ff]/50 transition-all text-sm"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="checkout-gemini-key" className="text-xs font-bold uppercase tracking-wider text-[#6f6e69] ml-1">Gemini API Key</label>
                    <input
                      id="checkout-gemini-key"
                      type="text"
                      value={geminiApiKey}
                      onChange={(e) => setGeminiApiKey(e.target.value)}
                      placeholder="e.g. AIzaSy... or AQ.Ab..."
                      className="w-full bg-[#F7F7F5] border border-[#EBEBEB] rounded-xl px-4 py-4 text-[#111110] placeholder-[#aeaca5] focus:outline-none focus:bg-white focus:border-[#0055ff]/50 focus:ring-1 focus:ring-[#0055ff]/50 transition-all text-sm"
                      required
                    />
                  </div>

                  {/* WhatsApp Connection Method Selector */}
                  <div className="space-y-2 border-t border-[#EBEBEB] pt-4">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#6f6e69] ml-1">
                      WhatsApp Connection Method
                    </label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => setConnectionType('baileys')}
                        className={`p-3.5 rounded-xl border text-left transition-all ${
                          connectionType === 'baileys'
                            ? 'border-[#0055ff] bg-[#0055ff]/5 text-[#0055ff]'
                            : 'border-[#EBEBEB] bg-[#F7F7F5] text-[#111110]'
                        }`}
                      >
                        <p className="text-xs font-black">⚡ Quick Connect</p>
                        <p className="text-[10px] text-[#6f6e69] mt-0.5">Scan QR — ready in 2 min</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setConnectionType('cloud_api')}
                        className={`p-3.5 rounded-xl border text-left transition-all ${
                          connectionType === 'cloud_api'
                            ? 'border-[#0055ff] bg-[#0055ff]/5 text-[#0055ff]'
                            : 'border-[#EBEBEB] bg-[#F7F7F5] text-[#111110]'
                        }`}
                      >
                        <p className="text-xs font-black">🔒 Official API</p>
                        <p className="text-[10px] text-[#6f6e69] mt-0.5">Meta Cloud — more stable</p>
                      </button>
                    </div>
                  </div>

                  {connectionType === 'cloud_api' && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                      <p className="text-[12px] font-medium text-blue-700 mb-1">
                        🔒 Official API selected
                      </p>
                      <p className="text-[12px] text-blue-600 leading-relaxed">
                        After purchase, you'll connect your Meta Cloud API credentials from your dashboard. We'll guide you step by step.
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Coupon Field */}
              <div className="space-y-2 border-t border-[#EBEBEB] pt-4 mt-2">
                <label htmlFor="checkout-coupon" className="text-xs font-bold uppercase tracking-wider text-[#6f6e69] ml-1 flex items-center gap-1.5">
                  <Tag size={12} className="text-[#0055ff]" /> Have a coupon code?
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      id="checkout-coupon"
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      placeholder="e.g. WELCOME10"
                      disabled={!!appliedCoupon || isValidatingCoupon}
                      className="w-full bg-[#F7F7F5] border border-[#EBEBEB] rounded-xl px-4 py-3.5 text-[#111110] placeholder-[#aeaca5] focus:outline-none focus:bg-white focus:border-[#0055ff]/50 focus:ring-1 focus:ring-[#0055ff]/50 transition-all text-sm uppercase font-semibold tracking-wider"
                    />
                  </div>
                  {appliedCoupon ? (
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="px-5 py-3.5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-xs font-bold hover:bg-red-100 transition-all uppercase tracking-wider shrink-0"
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={!couponInput.trim() || isValidatingCoupon}
                      className="px-5 py-3.5 bg-[#111110] text-white rounded-xl text-xs font-bold hover:bg-[#0055ff] transition-all uppercase tracking-wider disabled:opacity-50 shrink-0 flex items-center justify-center min-w-[80px]"
                    >
                      {isValidatingCoupon ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Apply'
                      )}
                    </button>
                  )}
                </div>
                {couponMessage && (
                  <p className={`text-xs ml-1 transition-all ${couponError ? 'text-red-500' : 'text-[#047857] font-semibold'}`}>
                    {couponMessage}
                  </p>
                )}
              </div>
            </div>

            {/* Legal Terms Acceptance Checkbox */}
            <div className="flex items-start gap-3 mt-4 mb-2 p-3 bg-[#F8FBF8] border border-[#EBEBEB] rounded-xl">
              <input
                id="terms-checkbox"
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-[#0055ff] focus:ring-[#0055ff] cursor-pointer"
                required
              />
              <label htmlFor="terms-checkbox" className="text-xs text-[#6f6e69] leading-relaxed cursor-pointer select-none">
                I agree to the{' '}
                <a
                  href="/legal/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#0055ff] hover:underline font-bold"
                >
                  Terms of Service
                </a>{' '}
                and{' '}
                <a
                  href="/legal/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#0055ff] hover:underline font-bold"
                >
                  Privacy Policy
                </a>{' '}
                and confirm I am authorized to use this WhatsApp number for business purposes.
              </label>
            </div>

            {error && <p className="text-red-500 text-sm ml-1" role="alert">⚠️ {error}</p>}

            <div className="space-y-4 pt-2">
              <button
                type="submit"
                disabled={isSubmitting || !termsAccepted}
                className="w-full bg-[#111110] text-white py-4 sm:py-5 rounded-2xl font-black text-lg hover:bg-[#0055ff] hover:scale-[1.01] transition-all flex items-center justify-center gap-3 shadow-[0_12px_24px_rgba(0,0,0,0.05)] disabled:opacity-50 disabled:pointer-events-none group cursor-pointer"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Pay Securely with Razorpay
                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 text-[10px] text-[#6f6e69] uppercase font-bold tracking-widest">
                <ShieldCheck size={14} className="text-[#0055ff]" />
                Secure 256-bit SSL encrypted checkout
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ScaleCraftAgentCheckout() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F7F7F5] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-[#0055ff] animate-spin" />
        <p className="text-[#6f6e69] text-sm font-semibold tracking-wide uppercase">Securing checkout gateway...</p>
      </div>
    }>
      <ScaleCraftAgentCheckoutContent />
    </Suspense>
  );
}
