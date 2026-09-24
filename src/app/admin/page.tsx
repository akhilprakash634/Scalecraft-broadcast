'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  Users,
  CreditCard,
  MessageSquare,
  ArrowRight,
  TrendingUp,
  Cpu,
  UserPlus,
  LogOut,
  Coins,
  ShoppingBag,
  Heart,
  X,
  Percent,
  Bell,
} from 'lucide-react';

interface AdminStats {
  totalClients: number;
  activeClients: number;
  totalMrr: number;
  totalMessages: number;
  totalSalesCount: number;
  totalRevenue: number;
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  const [updatingBotProtection, setUpdatingBotProtection] = useState(false);
  const [updateBotResult, setUpdateBotResult] = useState('');

  const [alerts, setAlerts] = useState<any[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);

  async function fetchAlerts() {
    try {
      const res = await fetch('/api/admin/bot-alerts');
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
      }
    } catch (err) {
      console.error('Error fetching admin alerts:', err);
    } finally {
      setLoadingAlerts(false);
    }
  }

  const handleApplyAntiBot = async () => {
    if (updatingBotProtection) return;
    if (!confirm('Are you sure you want to deploy Anti-Bot Protection to all active clients? This will connect to all active VPS nodes via SSH.')) return;
    
    setUpdatingBotProtection(true);
    setUpdateBotResult('');
    try {
      const res = await fetch('/api/admin/apply-anti-bot', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update clients');
      setUpdateBotResult(data.message || 'Batch update completed successfully!');
      fetchAlerts();
    } catch (err: any) {
      setUpdateBotResult(`Error: ${err.message}`);
    } finally {
      setUpdatingBotProtection(false);
    }
  };

  useEffect(() => {
    async function fetchAdminStats() {
      try {
        // Fetch all client records and orders in parallel to compute aggregated stats
        const [clientsRes, ordersRes] = await Promise.all([
          fetch('/api/admin/clients'),
          fetch('/api/admin/orders')
        ]);
        
        const clients = await clientsRes.json();
        const ordersData = await ordersRes.json();
        const orders = ordersData.orders || [];
        
        if (Array.isArray(clients)) {
          const totalClients = clients.length;
          const activeClients = clients.filter((c) => c.status === 'active').length;
          
          // MRR: sum real monthly_amount per client; exclude suspended or billing-paused
          const totalMrr = clients
            .filter((c) => c.status === 'active' && c.billingStatus !== 'paused_unpaid')
            .reduce((acc: number, c: any) => acc + (c.monthlyAmount ?? 1299), 0);

          const totalMessages = clients.reduce((acc, c) => acc + (c.monthlyUsage || 0), 0);

          const totalSalesCount = orders.length;
          const totalRevenue = orders.reduce((sum: number, o: any) => sum + (o.amount || 0), 0);

          setStats({
            totalClients,
            activeClients,
            totalMrr,
            totalMessages,
            totalSalesCount,
            totalRevenue,
          });
        }
      } catch (err) {
        console.error('Error fetching admin statistics:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchAdminStats();
    fetchAlerts();
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FBF8] p-6 md:p-12 space-y-8 text-xs font-semibold">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 border-b border-[#E0E0E0] pb-6">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black text-[#212121] tracking-tight uppercase font-heading">
              ScaleCraft Admin<span className="text-red-700">.</span>
            </h1>
            <span className="bg-red-50 text-red-700 text-[9px] font-black px-2 py-0.5 rounded uppercase">
              Master Gatekeeper
            </span>
          </div>
          <p className="text-sm text-[#757575] mt-1">
            Configure client infrastructure servers, manage accounts, and view MRR records.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleApplyAntiBot}
            disabled={updatingBotProtection}
            className="flex items-center space-x-2 bg-red-700 hover:bg-red-800 disabled:bg-gray-400 text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <ShieldAlert size={14} />
            <span>{updatingBotProtection ? 'Deploying Protection...' : 'Apply Anti-Bot Protection'}</span>
          </button>

          <a
            href="/api/admin/auth/logout"
            className="flex items-center space-x-2 bg-white border border-[#E0E0E0] hover:bg-red-50 hover:text-red-700 text-xs font-bold px-4 py-2.5 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <LogOut size={14} />
            <span>Exit Admin</span>
          </a>
        </div>
      </div>

      {updateBotResult && (
        <div className={`p-4 rounded-xl border text-xs font-semibold flex items-center justify-between ${
          updateBotResult.startsWith('Error') 
            ? 'bg-[#FFEBEE] border-red-100 text-[#C62828]' 
            : 'bg-green-50 border-green-100 text-green-800'
        }`}>
          <span>{updateBotResult}</span>
          <button onClick={() => setUpdateBotResult('')} className="p-1 hover:opacity-75">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white border border-[#E0E0E0] rounded-2xl h-32" />
          ))}
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Total Clients */}
            <div className="bg-white rounded-2xl border border-[#E0E0E0] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex items-start justify-between">
              <div className="space-y-2">
                <span className="text-[10px] text-[#757575] uppercase tracking-wider block font-bold">Total Managed Clients</span>
                <h3 className="text-3xl font-black text-[#212121] font-heading">
                  {stats?.totalClients}
                </h3>
                <p className="text-[10px] text-[#757575]">{stats?.activeClients} accounts active</p>
              </div>
              <div className="p-2.5 bg-gray-50 text-[#212121] border border-[#E0E0E0] rounded-xl">
                <Users size={20} />
              </div>
            </div>

            {/* MRR */}
            <div className="bg-white rounded-2xl border border-[#E0E0E0] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex items-start justify-between">
              <div className="space-y-2">
                <span className="text-[10px] text-[#757575] uppercase tracking-wider block font-bold">Monthly Recurring Revenue</span>
                <h3 className="text-3xl font-black text-[#1B5E20] font-heading">
                  ₹{stats?.totalMrr.toLocaleString('en-IN')}
                </h3>
                <p className="text-[10px] text-[#757575]">From active subscriptions</p>
              </div>
              <div className="p-2.5 bg-green-50 text-[#1B5E20] rounded-xl">
                <TrendingUp size={20} />
              </div>
            </div>

            {/* Total Sales (Orders) */}
            <div className="bg-white rounded-2xl border border-[#E0E0E0] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex items-start justify-between">
              <div className="space-y-2">
                <span className="text-[10px] text-[#757575] uppercase tracking-wider block font-bold">Total Sales Count</span>
                <h3 className="text-3xl font-black text-[#212121] font-heading">
                  {stats?.totalSalesCount}
                </h3>
                <p className="text-[10px] text-[#757575]">Total paid orders processed</p>
              </div>
              <div className="p-2.5 bg-amber-50 text-amber-700 rounded-xl">
                <ShoppingBag size={20} />
              </div>
            </div>

            {/* Total Revenue (Cash) */}
            <div className="bg-white rounded-2xl border border-[#E0E0E0] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex items-start justify-between">
              <div className="space-y-2">
                <span className="text-[10px] text-[#757575] uppercase tracking-wider block font-bold">Total Cash Generated</span>
                <h3 className="text-3xl font-black text-[#111110] font-heading">
                  ₹{stats?.totalRevenue.toLocaleString('en-IN')}
                </h3>
                <p className="text-[10px] text-[#757575]">Lifetime product sales value</p>
              </div>
              <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-xl">
                <Coins size={20} />
              </div>
            </div>

            {/* Platform Messages */}
            <div className="bg-white rounded-2xl border border-[#E0E0E0] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex items-start justify-between">
              <div className="space-y-2">
                <span className="text-[10px] text-[#757575] uppercase tracking-wider block font-bold">Platform Messages / Mo</span>
                <h3 className="text-3xl font-black text-[#212121] font-heading">
                  {stats?.totalMessages}
                </h3>
                <p className="text-[10px] text-[#757575]">Aggregated usage logs</p>
              </div>
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <MessageSquare size={20} />
              </div>
            </div>

            {/* System Server Provisioned */}
            <Link href="/admin/servers" className="bg-white rounded-2xl border border-[#E0E0E0] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex items-start justify-between hover:border-[#1B5E20] transition-colors cursor-pointer">
              <div className="space-y-2">
                <span className="text-[10px] text-[#757575] uppercase tracking-wider block font-bold">Server Instances</span>
                <h3 className="text-3xl font-black text-[#212121] font-heading">
                  {stats?.activeClients}
                </h3>
                <p className="text-[10px] text-[#757575]">Managed AWS Lightsail (Mumbai) VPS nodes</p>
              </div>
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                <Cpu size={20} />
              </div>
            </Link>
          </div>

          {/* Bot Alert Monitor Section */}
          <div className="bg-white rounded-2xl border border-[#E0E0E0] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
            <div className="flex items-center justify-between border-b border-[#E0E0E0] pb-3 mb-4">
              <h2 className="text-base font-bold text-[#212121] font-heading flex items-center space-x-2">
                <ShieldAlert size={18} className="text-red-700 animate-pulse" />
                <span>Bot Alert Monitor</span>
              </h2>
              <button 
                onClick={fetchAlerts}
                className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer text-xs font-bold flex items-center space-x-1"
              >
                <TrendingUp size={12} className="rotate-90" />
                <span>Refresh Alerts</span>
              </button>
            </div>

            {loadingAlerts ? (
              <div className="text-center py-6 text-gray-500 font-semibold text-xs">
                Loading active bot alerts...
              </div>
            ) : alerts.length === 0 ? (
              <div className="text-center py-6 text-gray-500 font-semibold text-xs">
                No active bot loops or API alerts detected. System is running healthy!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E0E0E0] text-[10px] uppercase tracking-wider text-[#757575] font-bold bg-gray-50">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Client</th>
                      <th className="py-2.5 px-3">Owner Contact</th>
                      <th className="py-2.5 px-3">Alert Type</th>
                      <th className="py-2.5 px-3">Alert Message</th>
                      <th className="py-2.5 px-3 text-right">EOD Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E0E0E0] text-xs">
                    {alerts.slice(0, 5).map((alert) => (
                      <tr key={alert.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-3 text-gray-500 whitespace-nowrap">
                          {new Date(alert.created_at).toLocaleString()}
                        </td>
                        <td className="py-3 px-3 font-bold text-gray-900">
                          {alert.businessName}
                        </td>
                        <td className="py-3 px-3 text-gray-650 font-mono">
                          {alert.ownerPhone}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            alert.alert_type.includes('emergency') || alert.alert_type.includes('critical')
                              ? 'bg-red-50 text-red-700 border border-red-100'
                              : 'bg-amber-50 text-amber-700 border border-amber-100'
                          }`}>
                            {alert.alert_type}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-gray-600 font-semibold max-w-xs truncate" title={alert.message}>
                          {alert.message}
                        </td>
                        <td className="py-3 px-3 text-right font-black text-red-700 font-mono">
                          Rs.{alert.current_value || 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Quick Actions and Admin Modules */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white border border-[#E0E0E0] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)] space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <h2 className="text-base font-bold text-[#212121] font-heading">Master Client List</h2>
                <p className="text-xs text-[#757575] leading-relaxed">
                  Browse client business configurations, view their localized dashboard instances, check server status, or suspend accounts.
                </p>
              </div>
              <Link
                href="/admin/clients"
                className="inline-flex items-center space-x-1.5 bg-[#1B5E20] hover:bg-[#144317] text-white text-xs font-bold px-4 py-3 rounded-lg cursor-pointer w-full justify-center"
              >
                <span>Manage Clients</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            <div className="bg-white border border-[#E0E0E0] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)] space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <h2 className="text-base font-bold text-[#212121] font-heading">Provision New Server Agent</h2>
                <p className="text-xs text-[#757575] leading-relaxed">
                  Automate AWS Lightsail (Mumbai) VPS deployment, execute installer bash scripts, link Google Sheet log structures, and register new database nodes.
                </p>
              </div>
              <Link
                href="/admin/provision"
                className="inline-flex items-center space-x-1.5 bg-[#0055FF] hover:bg-blue-700 text-white text-xs font-bold px-4 py-3 rounded-lg cursor-pointer w-full justify-center"
              >
                <UserPlus size={14} />
                <span>Provision Client VPS</span>
              </Link>
            </div>

            <div className="bg-white border border-[#E0E0E0] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)] space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <h2 className="text-base font-bold text-[#212121] font-heading">Sales & Order Registry</h2>
                <p className="text-xs text-[#757575] leading-relaxed">
                  Browse payment transactions, manually register purchases for offline clients, or resend confirmation emails and product access links.
                </p>
              </div>
              <Link
                href="/admin/orders"
                className="inline-flex items-center space-x-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-3 rounded-lg cursor-pointer w-full justify-center"
              >
                <CreditCard size={14} />
                <span>Manage Orders</span>
              </Link>
            </div>

            <div className="bg-white border border-[#E0E0E0] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)] space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <h2 className="text-base font-bold text-[#212121] font-heading">Ecosystem Coupons</h2>
                <p className="text-xs text-[#757575] leading-relaxed">
                  Create promotional coupon codes, manage active campaigns, set usage limit rules, and restrict discounts to specific products.
                </p>
              </div>
              <Link
                href="/admin/coupons"
                className="inline-flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-3 rounded-lg cursor-pointer w-full justify-center"
              >
                <Coins size={14} />
                <span>Manage Coupons</span>
              </Link>
            </div>

            <div className="bg-white border border-[#E0E0E0] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)] space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <h2 className="text-base font-bold text-[#212121] font-heading">Digital Products</h2>
                <p className="text-xs text-[#757575] leading-relaxed">
                  Manage Notion templates, prompt packs, guides, bundles, and ebooks available in the digital catalog.
                </p>
              </div>
              <Link
                href="/admin/products/digital"
                className="inline-flex items-center space-x-1.5 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold px-4 py-3 rounded-lg cursor-pointer w-full justify-center"
              >
                <span>Manage Digital Products</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            <div className="bg-white border border-[#E0E0E0] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)] space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <h2 className="text-base font-bold text-[#212121] font-heading">SaaS Products</h2>
                <p className="text-xs text-[#757575] leading-relaxed">
                  Configure software subscriptions, WhatsApp Agent plans, setup services, and SaaS pricing structures.
                </p>
              </div>
              <Link
                href="/admin/products/saas"
                className="inline-flex items-center space-x-1.5 bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold px-4 py-3 rounded-lg cursor-pointer w-full justify-center"
              >
                <span>Manage SaaS Products</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            <div className="bg-white border border-[#E0E0E0] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)] space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <h2 className="text-base font-bold text-[#212121] font-heading">Blog Article Manager</h2>
                <p className="text-xs text-[#757575] leading-relaxed">
                  Write or update blog posts, assign categories and read time labels, and customize metadata and canonical URL settings.
                </p>
              </div>
              <Link
                href="/admin/blog"
                className="inline-flex items-center space-x-1.5 bg-violet-700 hover:bg-violet-850 text-white text-xs font-bold px-4 py-3 rounded-lg cursor-pointer w-full justify-center"
              >
                <span>Manage Blog</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            <div className="bg-white border border-[#E0E0E0] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)] space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <h2 className="text-base font-bold text-[#212121] font-heading">Ecosystem Reviews</h2>
                <p className="text-xs text-[#757575] leading-relaxed">
                  Moderate, approve, or delete user-submitted testimonials to feature them live on the public reviews wall.
                </p>
              </div>
              <Link
                href="/admin/reviews"
                className="inline-flex items-center space-x-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 py-3 rounded-lg cursor-pointer w-full justify-center"
              >
                <Heart size={14} />
                <span>Manage Reviews</span>
              </Link>
            </div>

            <div className="bg-white border border-[#E0E0E0] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)] space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <h2 className="text-base font-bold text-[#212121] font-heading">FAQ Objections</h2>
                <p className="text-xs text-[#757575] leading-relaxed">
                  Control active landing page objections answers, categories, and relative display sorting orders.
                </p>
              </div>
              <Link
                href="/admin/faqs"
                className="inline-flex items-center space-x-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold px-4 py-3 rounded-lg cursor-pointer w-full justify-center"
              >
                <span>Manage FAQs</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            <div className="bg-white border border-[#E0E0E0] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)] space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <h2 className="text-base font-bold text-[#212121] font-heading">Billing Reminders</h2>
                <p className="text-xs text-[#757575] leading-relaxed">
                  View overdue and upcoming renewals, send manual payment reminders from ScaleCraft&apos;s own WhatsApp number, and pause unpaid agents.
                </p>
              </div>
              <Link
                href="/admin/reminders"
                className="inline-flex items-center space-x-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-3 rounded-lg cursor-pointer w-full justify-center"
              >
                <Bell size={14} />
                <span>Manage Reminders</span>
              </Link>
            </div>

            <div className="bg-white border border-[#E0E0E0] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)] space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <h2 className="text-base font-bold text-[#212121] font-heading">Flash Sales &amp; Offers</h2>
                <p className="text-xs text-[#757575] leading-relaxed">
                  Manage active discount campaigns, promotional banners, start and end dates, priority rankings, and countdown timers.
                </p>
              </div>
              <Link
                href="/admin/offers"
                className="inline-flex items-center space-x-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold px-4 py-3 rounded-lg cursor-pointer w-full justify-center"
              >
                <Percent size={14} />
                <span>Manage Offers</span>
              </Link>
            </div>

            <div className="bg-white border border-[#E0E0E0] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)] space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <h2 className="text-base font-bold text-[#212121] font-heading">Layout & General Settings</h2>
                <p className="text-xs text-[#757575] leading-relaxed">
                  Arrange visual sections stack ordering on the home screen and configure WhatsApp chat query templates.
                </p>
              </div>
              <Link
                href="/admin/settings"
                className="inline-flex items-center space-x-1.5 bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold px-4 py-3 rounded-lg cursor-pointer w-full justify-center"
              >
                <span>Layout Settings</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
