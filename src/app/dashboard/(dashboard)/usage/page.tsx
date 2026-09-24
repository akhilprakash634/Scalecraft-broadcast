'use client';

import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  CreditCard,
  TrendingUp,
  Server,
  Cpu,
  Receipt,
  AlertTriangle,
  ArrowUpRight,
  Info,
} from 'lucide-react';
import { initiateCheckout } from '@/utils/razorpay';
import { supabase } from '@/lib/supabase';

interface Invoice {
  id: string;
  month: string;
  messages: number;
  apiCost: number;
  serviceFee: number;
  metaCost: number;
  total: number;
  status: 'Paid' | 'Pending' | 'Overdue';
}

interface UsageData {
  plan: 'starter' | 'growth' | 'pro';
  limit: number;
  usageCount: number;
  geminiCost: number;
  serverCost: number;
  serviceFee: number;
  metaCost: number;
  totalCost: number;
  hasOwnKey: boolean;
  dailyUsage: { date: string; count: number }[];
  invoices: Invoice[];
  metaLimitTier?: string | null;
  metaQualityRating?: string | null;
  metaRemaining?: number | null;
}

export default function UsagePage() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [clientData, setClientData] = useState<any>(null);
  const [monthlyPrice, setMonthlyPrice] = useState<number>(1200);
  const [isPaying, setIsPaying] = useState<string | null>(null);

  const fetchUsageData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/dashboard/usage');
      if (!res.ok) throw new Error('Failed to load usage statistics from server.');
      const usageData = await res.json();
      setData(usageData);
    } catch (err: any) {
      setError(err.message || 'Error fetching billing statistics.');
    } finally {
      setLoading(false);
    }
  };

  const fetchClientAndPricing = async () => {
    try {
      const res = await fetch('/api/dashboard/client');
      if (res.ok) {
        const clientJson = await res.json();
        setClientData(clientJson);
      }
    } catch (err) {
      console.error('Error fetching client details:', err);
    }

    try {
      const { data: product } = await supabase
        .from('saas_products')
        .select('monthly_price')
        .eq('id', 'scalecraft-agent-saas')
        .maybeSingle();

      if (product && product.monthly_price) {
        setMonthlyPrice(product.monthly_price);
      }
    } catch (err) {
      console.error('Error fetching monthly price from Supabase:', err);
    }
  };

  useEffect(() => {
    fetchUsageData();
    fetchClientAndPricing();
  }, []);

  const handlePayInvoice = async (invoice: Invoice) => {
    if (!clientData) {
      alert('Client profile data not loaded yet. Please refresh the page and try again.');
      return;
    }
    setError('');
    setIsPaying(invoice.id);

    try {
      await initiateCheckout({
        amount: monthlyPrice,
        currency: 'INR',
        name: 'ScaleCraft Monthly Subscription',
        description: `ScaleCraft Agent - Subscription for ${invoice.month}`,
        productId: 'scalecraft-agent-saas',
        buyerName: clientData.ownerName,
        buyerEmail: clientData.email,
        clientId: clientData.clientId,
        plan_type: 'monthly',
        onSuccess: (response) => {
          alert(`Payment for ${invoice.month} invoice successful!`);
          setIsPaying(null);
          fetchUsageData();
        },
        onCancel: () => {
          setIsPaying(null);
        }
      });
    } catch (err: any) {
      alert(err.message || 'Payment initiation failed.');
      setIsPaying(null);
    }
  };

  const formatDateLabel = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    } catch {
      return dateStr;
    }
  };

  const getLimitPercentage = () => {
    if (!data) return 0;
    if (data.plan === 'pro') return 0;
    return Math.min(100, Math.round((data.usageCount / data.limit) * 100));
  };

  const getPlanName = (p: string) => {
    const names: Record<string, string> = {
      starter: 'Starter Plan (500 msgs)',
      growth: 'Growth Plan (2000 msgs)',
      pro: 'Pro Plan (Unlimited)',
    };
    return names[p] || 'Starter';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-[#212121] tracking-tight font-heading">
          Usage & Billing
        </h1>
        <p className="text-sm text-[#757575] mt-1">
          Monitor your message usage limits, projected server/API fees, and invoice history.
        </p>
      </div>

      {error && (
        <div className="bg-[#FFEBEE] border border-red-100 text-[#C62828] text-xs font-semibold p-4 rounded-xl flex items-center space-x-2">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-[#E0E0E0] h-32 animate-pulse" />
            ))}
          </div>
          <div className="bg-white rounded-xl border border-[#E0E0E0] h-80 animate-pulse" />
        </div>
      ) : (
        data && (
          <>
            {/* Plan and billing cycle cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* API Billing Mode Card */}
              <div className="bg-white rounded-2xl border border-[#E0E0E0] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)] space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#757575] uppercase tracking-wider">API Billing Mode</span>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                    data.hasOwnKey 
                      ? 'bg-[#E8F5E9] text-[#2E7D32]' 
                      : 'bg-blue-50 text-blue-700'
                  }`}>
                    {data.hasOwnKey ? 'Own Key' : 'System Key'}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#212121] font-heading">
                    {data.hasOwnKey ? 'Client Owned API Key' : 'ScaleCraft System Key'}
                  </h3>
                  <p className="text-[11px] text-[#757575] mt-1.5 leading-relaxed">
                    {data.hasOwnKey 
                      ? 'Gemini API charges are billed directly to your Google Cloud Console. ScaleCraft billing is ₹0.' 
                      : 'Using default system key. Gemini API usage is billed at ₹0.30 per 1000 messages processed.'}
                  </p>
                </div>
              </div>

              {/* Server Cost */}
              <div className="bg-white rounded-2xl border border-[#E0E0E0] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex items-start justify-between">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-[#757575] uppercase tracking-wider block">Managed Server Host</span>
                  <h3 className="text-2xl font-black text-[#212121] font-heading">₹{data.serverCost}</h3>
                  <p className="text-[10px] text-[#757575]">Flat monthly VPS server rent (AWS Lightsail Mumbai)</p>
                </div>
                <div className="p-2 bg-[#F8FBF8] border border-[#E0E0E0] text-[#1B5E20] rounded-lg">
                  <Server size={18} />
                </div>
              </div>

              {/* Service Fee */}
              <div className="bg-white rounded-2xl border border-[#E0E0E0] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex items-start justify-between">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-[#757575] uppercase tracking-wider block">ScaleCraft Service Fee</span>
                  <h3 className="text-2xl font-black text-[#212121] font-heading">₹{data.serviceFee}</h3>
                  <p className="text-[10px] text-[#757575]">Platform support & monitoring</p>
                </div>
                <div className="p-2 bg-[#F8FBF8] border border-[#E0E0E0] text-[#1B5E20] rounded-lg">
                  <Cpu size={18} />
                </div>
              </div>

              {/* Total Projected cost */}
              <div className="bg-white rounded-2xl border border-[#E0E0E0] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex items-start justify-between">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-[#757575] uppercase tracking-wider block">Total Projected Bill</span>
                  <h3 className="text-2xl font-black text-[#1B5E20] font-heading">₹{data.totalCost}</h3>
                  <p className="text-[10px] text-[#757575]">
                    {data.hasOwnKey 
                      ? `Own API Key (Meta cost ₹${data.metaCost || 0} included)` 
                      : `Gemini (₹${data.geminiCost}) + Meta (₹${data.metaCost || 0}) included`}
                  </p>
                </div>
                <div className="p-2 bg-[#E8F5E9] text-[#2E7D32] rounded-lg">
                  <Receipt size={18} />
                </div>
              </div>
            </div>

            {/* Meta Cloud API Quota Header Display */}
            {clientData?.connectionType === 'cloud_api' && (
              <div className="bg-gradient-to-r from-emerald-50 to-blue-50 border border-[#E0E0E0] rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-black uppercase tracking-wider text-gray-700">Meta Cloud API Gateway Quota</span>
                  </div>
                  <p className="text-[11px] text-[#757575] leading-relaxed">
                    Messaging Tier: <strong className="text-text-primary">{data.metaLimitTier || 'TIER_250'}</strong> ({data.metaLimitTier === 'TIER_250' ? '250' : data.metaLimitTier === 'TIER_1K' ? '1,000' : '10,000'} unique recipients per 24h). WABA Rating: <strong className={data.metaQualityRating === 'RED' ? 'text-red-600' : 'text-emerald-700'}>{data.metaQualityRating || 'GREEN'}</strong>.
                  </p>
                </div>
                <div className="bg-white/80 backdrop-blur-sm border border-emerald-100 rounded-xl px-4 py-2 text-right">
                  <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide">Daily Headroom Left</span>
                  <span className="block text-lg font-black text-emerald-800 font-mono mt-0.5">
                    {data.metaRemaining !== null ? `${data.metaRemaining} / 250` : '—'}
                  </span>
                </div>
              </div>
            )}

            {/* Daily volume bar chart */}
            <div className="bg-white rounded-2xl border border-[#E0E0E0] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)] space-y-4">
              <h3 className="text-sm font-bold text-[#212121] border-b border-[#E0E0E0] pb-2 font-heading">
                Daily Message Volumetric Logs (Last 30 Days)
              </h3>
              <div className="h-64 w-full text-xs font-semibold text-gray-500">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.dailyUsage}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E0E0E0" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDateLabel}
                      stroke="#757575"
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis stroke="#757575" tickLine={false} axisLine={false} />
                    <Tooltip
                      labelFormatter={(label) => `Date: ${new Date(label).toLocaleDateString('en-IN')}`}
                      formatter={(value) => [`${value} messages`, 'Volume']}
                      contentStyle={{ background: '#212121', color: '#fff', borderRadius: '8px', border: 'none' }}
                    />
                    <Bar dataKey="count" fill="#1B5E20" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Invoice list table */}
            <div className="bg-white rounded-2xl border border-[#E0E0E0] shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
              <div className="px-6 py-4 border-b border-[#E0E0E0]">
                <h3 className="text-sm font-bold text-[#212121] font-heading">Invoice History</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#F8FBF8] border-b border-[#E0E0E0] text-[10px] font-black text-[#757575] uppercase tracking-wider">
                      <th className="px-6 py-4">Invoice ID</th>
                      <th className="px-6 py-4">Billing Month</th>
                      <th className="px-6 py-4 text-center">Total Messages</th>
                      <th className="px-6 py-4 text-center">Gemini Cost</th>
                      <th className="px-6 py-4 text-center">Meta Cost</th>
                      <th className="px-6 py-4 text-center">Service Fee</th>
                      <th className="px-6 py-4">Total Amount</th>
                      <th className="px-6 py-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E0E0E0]">
                    {data.invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-[#F8FBF8]/40 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-[#212121]">{inv.id}</td>
                        <td className="px-6 py-4 font-bold text-[#212121] font-heading">{inv.month}</td>
                        <td className="px-6 py-4 text-center text-[#757575]">{inv.messages}</td>
                        <td className="px-6 py-4 text-center text-[#757575]">₹{inv.apiCost}</td>
                        <td className="px-6 py-4 text-center text-[#757575]">₹{inv.metaCost || 0}</td>
                        <td className="px-6 py-4 text-center text-[#757575]">₹{inv.serviceFee}</td>
                        <td className="px-6 py-4 font-bold text-[#1B5E20]">₹{inv.total}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <span
                              className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                inv.status === 'Paid'
                                  ? 'bg-[#E8F5E9] text-[#2E7D32]'
                                  : inv.status === 'Pending'
                                  ? 'bg-amber-50 text-amber-800'
                                  : 'bg-[#FFEBEE] text-[#C62828]'
                              }`}
                            >
                              {inv.status}
                            </span>
                            {inv.status !== 'Paid' && (
                              <button
                                onClick={() => handlePayInvoice(inv)}
                                disabled={isPaying !== null}
                                className="bg-[#1B5E20] hover:bg-[#2E7D32] text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all shadow-sm cursor-pointer disabled:opacity-50 inline-flex items-center justify-center min-w-[70px]"
                              >
                                {isPaying === inv.id ? 'Loading...' : 'Pay Now'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )
      )}
    </div>
  );
}
