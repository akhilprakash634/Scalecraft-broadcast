'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Search,
  Plus,
  RefreshCw,
  Mail,
  CheckCircle,
  AlertTriangle,
  Receipt,
  Sparkles,
  Server,
  Key,
  X,
  CreditCard,
  User,
  ShoppingBag,
  DollarSign,
  Download
} from 'lucide-react';

interface OrderRecord {
  _id: string;
  customerName: string;
  customerEmail: string;
  productId: string;
  amount: number;
  paymentId: string;
  orderId: string;
  status: string;
  createdAt: string;
  licenseKey?: string;
  couponCode?: string;
}

interface ProductRecord {
  _id: string;
  name: string;
  price: number;
  status: string;
}

export default function AdminOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Manual Register Modal
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    productId: '',
    amount: '',
    couponCode: '',
    paymentId: '',
    businessName: '',
    botPhone: '',
    ownerPhone: '',
    geminiApiKey: ''
  });

  // Action loading states map
  const [emailLoadingMap, setEmailLoadingMap] = useState<Record<string, boolean>>({});

  const handleExportCSV = () => {
    if (filteredOrders.length === 0) return;

    const headers = [
      'Customer Name',
      'Customer Email',
      'Product ID',
      'Product Name',
      'Amount',
      'License Key',
      'Payment ID',
      'Order ID',
      'Coupon Code',
      'Date'
    ];

    const rows = filteredOrders.map(o => [
      o.customerName || '',
      o.customerEmail || '',
      o.productId || '',
      getProductTitle(o.productId) || '',
      o.amount || 0,
      o.licenseKey || '',
      o.paymentId || '',
      o.orderId || '',
      o.couponCode || '',
      o.createdAt ? new Date(o.createdAt).toISOString() : ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => 
        row.map(val => {
          const str = String(val).replace(/"/g, '""');
          return `"${str}"`;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `scalecraft_orders_export_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/orders');
      if (!res.ok) throw new Error('Failed to retrieve order records.');
      const data = await res.json();
      if (data.orders) setOrders(data.orders);
      if (data.products) setProducts(data.products);
    } catch (err: any) {
      setError(err.message || 'Error loading dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleResendEmail = async (order: OrderRecord) => {
    setSuccess('');
    setError('');
    setEmailLoadingMap(prev => ({ ...prev, [order._id]: true }));
    try {
      const res = await fetch('/api/admin/orders/resend-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: order.customerEmail,
          name: order.customerName,
          productId: order.productId,
          licenseKey: order.licenseKey
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to resend confirmation email');

      setSuccess(`Confirmation email successfully resent to ${order.customerEmail}`);
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      setError(err.message || 'Error resending email.');
    } finally {
      setEmailLoadingMap(prev => ({ ...prev, [order._id]: false }));
    }
  };

  // Auto-populate price when product changes
  const handleProductChange = (productId: string) => {
    const selectedProd = products.find(p => p._id === productId);
    setFormData(prev => ({
      ...prev,
      productId,
      amount: selectedProd ? String(selectedProd.price) : ''
    }));
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/admin/orders/manual-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          name: formData.name,
          productId: formData.productId,
          amount: formData.amount ? Number(formData.amount) : undefined,
          couponCode: formData.couponCode || undefined,
          paymentId: formData.paymentId || undefined,
          businessName: formData.businessName || undefined,
          botPhone: formData.botPhone || undefined,
          ownerPhone: formData.ownerPhone || undefined,
          geminiApiKey: formData.geminiApiKey || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Manual registration failed');

      setSuccess(`Order registered successfully! License: ${data.licenseKey || 'N/A'}`);
      setShowRegisterModal(false);
      setFormData({
        email: '',
        name: '',
        productId: '',
        amount: '',
        couponCode: '',
        paymentId: '',
        businessName: '',
        botPhone: '',
        ownerPhone: '',
        geminiApiKey: ''
      });
      fetchData();
      setTimeout(() => setSuccess(''), 6000);
    } catch (err: any) {
      setError(err.message || 'Could not register manual purchase.');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper to map product title
  const getProductTitle = (prodId: string) => {
    const prod = products.find(p => p._id === prodId);
    return prod ? prod.name : prodId;
  };

  // Filtered orders
  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return orders;
    const q = searchQuery.toLowerCase().trim();
    return orders.filter(o => 
      o.customerName?.toLowerCase().includes(q) ||
      o.customerEmail?.toLowerCase().includes(q) ||
      o.paymentId?.toLowerCase().includes(q) ||
      o.licenseKey?.toLowerCase().includes(q) ||
      getProductTitle(o.productId).toLowerCase().includes(q)
    );
  }, [orders, searchQuery, products]);

  // Aggregate metrics
  const metrics = useMemo(() => {
    const totalVolume = orders.reduce((sum, o) => sum + (o.amount || 0), 0);
    const totalCount = orders.length;
    const aov = totalCount > 0 ? Math.round(totalVolume / totalCount) : 0;
    const saasCount = orders.filter(o => o.productId === 'scalecraft-agent-saas').length;

    return { totalVolume, totalCount, aov, saasCount };
  }, [orders]);

  const isSaaSSelected = formData.productId === 'scalecraft-agent-saas';

  return (
    <div className="min-h-screen bg-[#FDFDFD] p-6 md:p-12 space-y-8 text-xs font-semibold text-gray-800">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#F0EFEB] pb-6 gap-4">
        <div className="flex items-center space-x-4">
          <Link
            href="/admin"
            className="p-2 bg-white border border-[#EBEBEB] hover:bg-[#F7F7F5] rounded-xl text-[#6F6E69] transition-all cursor-pointer shadow-xs"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black text-[#111110] tracking-tight uppercase font-heading">
                Sales Registry
              </h1>
              <span className="bg-amber-50 text-amber-700 text-[9px] font-black px-2 py-0.5 rounded uppercase border border-amber-100">
                Ledger
              </span>
            </div>
            <p className="text-sm text-[#6F6E69] mt-1 font-medium">
              View customer transactions, manually register purchases, and resend welcome kits.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 bg-white border border-[#EBEBEB] hover:bg-[#F7F7F5] text-[#6F6E69] text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-xs"
            title="Export to CSV"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setShowRegisterModal(true)}
            className="flex items-center space-x-1.5 bg-[#111110] hover:bg-[#1C1C1A] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-md"
          >
            <Plus size={14} />
            <span>Register Order</span>
          </button>
          <button
            onClick={fetchData}
            className="p-2.5 bg-white border border-[#EBEBEB] hover:bg-[#F7F7F5] rounded-xl text-[#6F6E69] cursor-pointer shadow-xs transition-colors"
            title="Refresh Ledger"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-800 text-xs font-semibold p-4 rounded-xl flex items-center space-x-2 animate-fadeIn">
          <AlertTriangle size={16} className="text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-150 text-green-800 text-xs font-semibold p-4 rounded-xl flex items-center space-x-2 animate-fadeIn">
          <CheckCircle size={16} className="text-green-600 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl border border-[#EBEBEB] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-2">
          <div className="flex items-center justify-between text-[#6F6E69]">
            <span className="text-[10px] uppercase tracking-wider font-bold">Total Sales Volume</span>
            <DollarSign size={16} />
          </div>
          <h3 className="text-2xl font-black text-[#111110] font-heading">
            ₹{metrics.totalVolume.toLocaleString('en-IN')}
          </h3>
          <p className="text-[10px] text-[#AEACA5] font-medium">All-time gross sales</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#EBEBEB] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-2">
          <div className="flex items-center justify-between text-[#6F6E69]">
            <span className="text-[10px] uppercase tracking-wider font-bold">Orders Volume</span>
            <Receipt size={16} />
          </div>
          <h3 className="text-2xl font-black text-[#111110] font-heading">
            {metrics.totalCount}
          </h3>
          <p className="text-[10px] text-[#AEACA5] font-medium">Transactions processed</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#EBEBEB] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-2">
          <div className="flex items-center justify-between text-[#6F6E69]">
            <span className="text-[10px] uppercase tracking-wider font-bold">Average Ticket</span>
            <Sparkles size={16} className="text-amber-500" />
          </div>
          <h3 className="text-2xl font-black text-[#111110] font-heading">
            ₹{metrics.aov.toLocaleString('en-IN')}
          </h3>
          <p className="text-[10px] text-[#AEACA5] font-medium">Average order value</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#EBEBEB] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-2">
          <div className="flex items-center justify-between text-[#6F6E69]">
            <span className="text-[10px] uppercase tracking-wider font-bold">SaaS Deployments</span>
            <Server size={16} className="text-blue-500" />
          </div>
          <h3 className="text-2xl font-black text-[#111110] font-heading">
            {metrics.saasCount}
          </h3>
          <p className="text-[10px] text-[#AEACA5] font-medium">Managed instances active</p>
        </div>
      </div>

      {/* Main Table Section */}
      <div className="bg-white rounded-2xl border border-[#EBEBEB] shadow-[0_2px_8px_rgba(0,0,0,0.01)] overflow-hidden">
        {/* Search Filter Header */}
        <div className="p-5 border-b border-[#F0EFEB] flex items-center bg-[#F7F7F5]/30">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#AEACA5]" size={14} />
            <input
              type="text"
              placeholder="Search by customer name, email, payment ID, license, or product title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-[#EBEBEB] focus:border-[#111110] focus:ring-1 focus:ring-[#111110] rounded-xl pl-9 pr-4 py-2 text-xs font-semibold placeholder-[#AEACA5] transition-all outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-12 space-y-4">
            <div className="h-8 bg-gray-100 rounded-lg animate-pulse w-full" />
            <div className="h-24 bg-gray-50 rounded-lg animate-pulse w-full" />
            <div className="h-24 bg-gray-50 rounded-lg animate-pulse w-full" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-[#AEACA5] space-y-3">
            <Receipt className="mx-auto" size={32} />
            <p className="font-bold text-gray-500">No transactions match search queries</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F7F7F5]/50 border-b border-[#EBEBEB] text-[10px] font-black text-[#6F6E69] uppercase tracking-wider">
                  <th className="px-6 py-4">Customer Details</th>
                  <th className="px-6 py-4">Product Purchased</th>
                  <th className="px-6 py-4">Gross Amt</th>
                  <th className="px-6 py-4">License Key</th>
                  <th className="px-6 py-4">Reference Codes</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EFEB] text-xs">
                {filteredOrders.map((o) => (
                  <tr key={o._id} className="hover:bg-[#F7F7F5]/20 transition-colors">
                    {/* Customer Info */}
                    <td className="px-6 py-4">
                      <div className="font-bold text-[#111110] flex items-center gap-1.5 font-heading">
                        <User size={12} className="text-[#6F6E69]" />
                        {o.customerName}
                      </div>
                      <div className="text-[10px] text-[#6F6E69] font-medium mt-0.5">{o.customerEmail}</div>
                    </td>

                    {/* Product */}
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900 flex items-center gap-1.5">
                        <ShoppingBag size={12} className="text-amber-600 flex-shrink-0" />
                        {getProductTitle(o.productId)}
                      </div>
                      {o.productId === 'scalecraft-agent-saas' && (
                        <span className="text-[8px] bg-blue-50 text-blue-700 font-bold px-1.5 py-0.5 rounded border border-blue-100 uppercase tracking-wider mt-1 inline-block">
                          VPS SaaS
                        </span>
                      )}
                    </td>

                    {/* Amount */}
                    <td className="px-6 py-4 font-bold text-[#111110]">
                      ₹{(o.amount || 0).toLocaleString('en-IN')}
                    </td>

                    {/* License */}
                    <td className="px-6 py-4 font-mono text-[11px]">
                      {o.licenseKey ? (
                        <div className="flex items-center gap-1 bg-gray-50 border border-gray-150 px-2 py-0.5 rounded font-black text-[#111110]">
                          <Key size={10} className="text-[#6F6E69]" />
                          <span>{o.licenseKey}</span>
                        </div>
                      ) : (
                        <span className="text-[#AEACA5]">N/A</span>
                      )}
                    </td>

                    {/* Reference Codes */}
                    <td className="px-6 py-4">
                      <div className="font-mono text-[10px] text-[#6F6E69]">
                        <span className="font-bold text-gray-400">PAY:</span> {o.paymentId || 'N/A'}
                      </div>
                      {o.couponCode && (
                        <div className="text-[9px] bg-emerald-50 text-emerald-800 font-bold px-1.5 py-0.5 rounded border border-emerald-100 uppercase mt-1 inline-block">
                          🎫 {o.couponCode}
                        </div>
                      )}
                    </td>

                    {/* Date */}
                    <td className="px-6 py-4 text-[#6F6E69] font-medium">
                      {new Date(o.createdAt).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>

                    {/* Resend Actions */}
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleResendEmail(o)}
                        disabled={emailLoadingMap[o._id]}
                        className="bg-white border border-[#EBEBEB] hover:bg-[#F7F7F5] disabled:bg-[#F7F7F5] disabled:text-[#AEACA5] text-[#111110] px-3 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all inline-flex items-center gap-1 shadow-xs"
                      >
                        {emailLoadingMap[o._id] ? (
                          <RefreshCw size={11} className="animate-spin" />
                        ) : (
                          <Mail size={11} />
                        )}
                        <span>Resend Email</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Register Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-xl border border-[#EBEBEB] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-[#F0EFEB] flex items-center justify-between bg-[#F7F7F5]/50">
              <div className="flex items-center space-x-2 text-[#111110]">
                <Plus size={18} />
                <h3 className="font-black font-heading text-sm uppercase tracking-tight">Manual Purchase Registration</h3>
              </div>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="p-1.5 hover:bg-[#F7F7F5] text-[#6F6E69] rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleRegisterSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Customer Email */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-[#6F6E69] font-bold">Customer Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="e.g. buyer@example.com"
                    className="w-full bg-white border border-[#EBEBEB] focus:border-[#111110] rounded-xl px-3 py-2 text-xs font-semibold outline-none"
                  />
                </div>

                {/* Customer Name */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-[#6F6E69] font-bold">Customer Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. John Doe"
                    className="w-full bg-white border border-[#EBEBEB] focus:border-[#111110] rounded-xl px-3 py-2 text-xs font-semibold outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Product Select */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-[#6F6E69] font-bold">Product *</label>
                  <select
                    required
                    value={formData.productId}
                    onChange={(e) => handleProductChange(e.target.value)}
                    className="w-full bg-white border border-[#EBEBEB] focus:border-[#111110] rounded-xl px-3 py-2 text-xs font-semibold outline-none"
                  >
                    <option value="">Select a Product</option>
                    {products.map(p => (
                      <option key={p._id} value={p._id}>
                        {p.name} (₹{p.price})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Price Custom */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-[#6F6E69] font-bold">Gross Amount (INR) *</label>
                  <input
                    type="number"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="2999"
                    className="w-full bg-white border border-[#EBEBEB] focus:border-[#111110] rounded-xl px-3 py-2 text-xs font-semibold outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Coupon Code */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-[#6F6E69] font-bold">Applied Coupon Code</label>
                  <input
                    type="text"
                    value={formData.couponCode}
                    onChange={(e) => setFormData(prev => ({ ...prev, couponCode: e.target.value.toUpperCase() }))}
                    placeholder="e.g. FOUNDER500"
                    className="w-full bg-white border border-[#EBEBEB] focus:border-[#111110] rounded-xl px-3 py-2 text-xs font-semibold outline-none"
                  />
                </div>

                {/* Payment ID Custom */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-[#6F6E69] font-bold">Custom Payment ID (Optional)</label>
                  <input
                    type="text"
                    value={formData.paymentId}
                    onChange={(e) => setFormData(prev => ({ ...prev, paymentId: e.target.value }))}
                    placeholder="Auto-generated if blank"
                    className="w-full bg-white border border-[#EBEBEB] focus:border-[#111110] rounded-xl px-3 py-2 text-xs font-semibold outline-none"
                  />
                </div>
              </div>

              {/* SaaS Specific Block */}
              {isSaaSSelected && (
                <div className="border border-blue-100 bg-blue-50/40 rounded-2xl p-4 space-y-4 animate-slideDown">
                  <h4 className="text-[11px] font-black text-blue-800 uppercase tracking-wide flex items-center gap-1.5">
                    <Server size={14} />
                    SaaS Provisioning Parameters
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] uppercase tracking-wider text-blue-800 font-bold">Business Name *</label>
                      <input
                        type="text"
                        required={isSaaSSelected}
                        value={formData.businessName}
                        onChange={(e) => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
                        placeholder="Client Company Name"
                        className="w-full bg-white border border-blue-200 focus:border-blue-500 rounded-xl px-3 py-1.5 text-xs font-semibold outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] uppercase tracking-wider text-blue-800 font-bold">Gemini API Key</label>
                      <input
                        type="text"
                        value={formData.geminiApiKey}
                        onChange={(e) => setFormData(prev => ({ ...prev, geminiApiKey: e.target.value }))}
                        placeholder="AI Prompt API Key"
                        className="w-full bg-white border border-blue-200 focus:border-blue-500 rounded-xl px-3 py-1.5 text-xs font-semibold outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] uppercase tracking-wider text-blue-800 font-bold">Bot Phone Number *</label>
                      <input
                        type="tel"
                        required={isSaaSSelected}
                        value={formData.botPhone}
                        onChange={(e) => setFormData(prev => ({ ...prev, botPhone: e.target.value }))}
                        placeholder="WhatsApp Bot (with country code)"
                        className="w-full bg-white border border-blue-200 focus:border-blue-500 rounded-xl px-3 py-1.5 text-xs font-semibold outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] uppercase tracking-wider text-blue-800 font-bold">Owner Phone Number *</label>
                      <input
                        type="tel"
                        required={isSaaSSelected}
                        value={formData.ownerPhone}
                        onChange={(e) => setFormData(prev => ({ ...prev, ownerPhone: e.target.value }))}
                        placeholder="Owner Phone (for notifications)"
                        className="w-full bg-white border border-blue-200 focus:border-blue-500 rounded-xl px-3 py-1.5 text-xs font-semibold outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Submit button footer */}
              <div className="pt-4 border-t border-[#F0EFEB] flex items-center justify-end space-x-3 bg-white">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="bg-white border border-[#EBEBEB] hover:bg-[#F7F7F5] text-[#6F6E69] text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-[#111110] hover:bg-[#1C1C1A] text-white text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer disabled:bg-gray-400 flex items-center gap-1"
                >
                  {submitting && <RefreshCw size={12} className="animate-spin" />}
                  <span>Register & Send Email</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
