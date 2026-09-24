'use client';

import React, { useState, useEffect } from 'react';
import { initiateCheckout } from '@/utils/razorpay';
import { ShieldCheck, ArrowRight, Loader2, CheckCircle2, Sparkles } from 'lucide-react';
import LinkNext from 'next/link';
import { supabase } from '@/lib/supabase';

export default function UpgradePage() {
  const [clientData, setClientData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [setupPrice, setSetupPrice] = useState<number>(6999);
  const [loadingPrice, setLoadingPrice] = useState<boolean>(true);

  useEffect(() => {
    async function loadUpgradeData() {
      try {
        const res = await fetch('/api/dashboard/client');
        if (res.status === 401) {
          window.location.href = '/dashboard/login?redirect=/upgrade';
          return;
        }
        if (!res.ok) {
          throw new Error('Failed to fetch client details');
        }
        const data = await res.json();
        setClientData(data);

        if (data.setupAmount && Number(data.setupAmount) > 0) {
          setSetupPrice(Number(data.setupAmount));
        } else {
          const { data: product } = await supabase
            .from('saas_products')
            .select('price, setup_price')
            .or('id.eq.scalecraft-agent-saas,slug.eq.scalecraft-agent-saas')
            .maybeSingle();

          if (product) {
            const rawSetup = product.setup_price || product.price;
            if (rawSetup) setSetupPrice(Number(rawSetup));
          }
        }
      } catch (err) {
        console.error('Error loading upgrade details:', err);
        setError('Failed to load your client profile. Please try logging in again.');
      } finally {
        setLoading(false);
        setLoadingPrice(false);
      }
    }

    loadUpgradeData();
  }, []);

  const handleUpgrade = async () => {
    if (!clientData) return;
    setError('');
    setIsSubmitting(true);

    try {
      await initiateCheckout({
        amount: setupPrice,
        currency: 'INR',
        name: 'ScaleCraft Upgrade',
        description: 'ScaleCraft Agent - Upgrade to Premium Managed Plan',
        productId: 'scalecraft-agent-saas',
        buyerName: clientData.ownerName,
        buyerEmail: clientData.email,
        clientId: clientData.clientId,
        plan_type: 'standard',
        onSuccess: (response) => {
          window.location.href = `/thank-you/scalecraft-agent?payment_id=${response.razorpay_payment_id}&email=${encodeURIComponent(clientData.email)}&name=${encodeURIComponent(clientData.ownerName)}&product_id=scalecraft-agent-saas`;
        },
        onCancel: () => {
          setIsSubmitting(false);
        }
      });
    } catch (err: any) {
      setError(err.message || 'Upgrade payment failed to initiate.');
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FBF8] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-[#1B5E20] animate-spin" />
        <p className="text-[#757575] text-sm font-semibold tracking-wide uppercase">Verifying account credentials...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FBF8] text-[#212121] font-body flex items-center justify-center p-4 sm:p-8">
      <div className="max-w-xl w-full bg-white border border-[#E0E0E0] rounded-[2.5rem] shadow-[0_24px_60px_rgba(0,0,0,0.03)] overflow-hidden p-8 sm:p-10 relative">
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#1B5E20]/5 rounded-full blur-[60px] -z-0"></div>

        <div className="flex flex-col items-center text-center space-y-4 mb-8">
          <div className="bg-[#E8F5E9] text-[#2E7D32] p-3 rounded-full flex items-center justify-center">
            <Sparkles className="w-8 h-8" />
          </div>
          <div>
            <span className="bg-[#E8F5E9] text-[#2E7D32] text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
              Upgrade Account
            </span>
            <h2 className="font-heading text-2xl font-extrabold text-[#212121] tracking-tight mt-2">
              Upgrade to Premium Plan
            </h2>
            <p className="text-xs text-[#757575] leading-relaxed mt-1">
              You are upgrading the WhatsApp AI Agent for <span className="font-bold text-[#212121]">{clientData?.businessName || 'your business'}</span>.
            </p>
          </div>
        </div>

        <div className="bg-[#F8FBF8] border border-[#E0E0E0] rounded-2xl p-6 mb-6 space-y-4">
          <div className="flex justify-between items-center text-xs pb-3 border-b border-[#E0E0E0]">
            <span className="text-[#757575] font-semibold">Account Owner</span>
            <span className="font-bold text-[#212121]">{clientData?.ownerName}</span>
          </div>
          <div className="flex justify-between items-center text-xs pb-3 border-b border-[#E0E0E0]">
            <span className="text-[#757575] font-semibold">WhatsApp Number</span>
            <span className="font-bold text-[#212121]">{clientData?.whatsappBotNumber}</span>
          </div>
          <div className="flex justify-between items-baseline pt-1">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#757575] block">Setup Payment</span>
              <span className="text-[10px] text-[#9E9E9E] font-medium">+ monthly running subscription starting next month</span>
            </div>
            <span className="font-heading text-3xl font-black tracking-tight text-[#1B5E20]">
              ₹{loadingPrice ? '...' : setupPrice.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        <ul className="space-y-3 mb-8">
          <li className="flex items-center gap-2.5 text-xs text-[#212121]">
            <CheckCircle2 size={16} className="text-[#2E7D32] shrink-0" />
            Restart paused agent immediately (if paused)
          </li>
          <li className="flex items-center gap-2.5 text-xs text-[#212121]">
            <CheckCircle2 size={16} className="text-[#2E7D32] shrink-0" />
            Keep your settings, bot instructions, and history
          </li>
          <li className="flex items-center gap-2.5 text-xs text-[#212121]">
            <CheckCircle2 size={16} className="text-[#2E7D32] shrink-0" />
            Dedicated high-performance VPS hosting (Mumbai)
          </li>
          <li className="flex items-center gap-2.5 text-xs text-[#212121]">
            <CheckCircle2 size={16} className="text-[#2E7D32] shrink-0" />
            24/7 automated sales and support capability
          </li>
        </ul>

        {error && <p className="text-red-600 text-sm text-center mb-6" role="alert">⚠️ {error}</p>}

        <div className="space-y-4">
          <button
            onClick={handleUpgrade}
            disabled={isSubmitting || loadingPrice}
            className="w-full bg-[#212121] hover:bg-[#1B5E20] text-white py-4 rounded-2xl font-black text-base hover:scale-[1.01] transition-all flex items-center justify-center gap-3 shadow-md disabled:opacity-50 group cursor-pointer"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Confirm and Pay ₹{setupPrice.toLocaleString('en-IN')} Setup
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>

          <div className="flex items-center justify-center gap-2 text-[10px] text-[#757575] uppercase font-bold tracking-widest">
            <ShieldCheck size={14} className="text-[#2E7D32]" />
            Secure payment powered by Razorpay
          </div>
          
          <div className="text-center pt-2">
            <LinkNext href="/dashboard" className="text-xs font-bold text-[#757575] hover:text-[#212121] transition-colors">
              &larr; Back to Dashboard
            </LinkNext>
          </div>
        </div>
      </div>
    </div>
  );
}
