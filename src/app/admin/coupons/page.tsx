'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Tag,
  Percent,
  Plus,
  RefreshCw,
  Trash2,
  AlertTriangle,
  CheckCircle,
  X,
  Search,
  Sparkles,
  Calendar,
  Layers,
  Activity,
  ShoppingBag
} from 'lucide-react';

interface CouponRecord {
  id: string;
  code: string;
  type: string;
  value: number;
  allowed_product_ids?: string[];
  max_uses?: number;
  uses_count: number;
  expires_at?: string;
  is_active: boolean;
  created_at: string;
}

interface ProductRecord {
  _id: string;
  name: string;
  price: number;
  status: string;
}

export default function AdminCouponsPage() {
  const router = useRouter();
  const [coupons, setCoupons] = useState<CouponRecord[]>([]);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Create Coupon Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    type: 'percentage', // percentage or fixed
    value: '',
    maxUses: '',
    expiresAt: '',
    allowedProductIds: [] as string[]
  });

  // Action loading states
  const [actionLoadingMap, setActionLoadingMap] = useState<Record<string, boolean>>({});

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/coupons');
      if (!res.ok) throw new Error('Failed to retrieve coupon records.');
      const data = await res.json();
      if (data.coupons) setCoupons(data.coupons);
      if (data.products) setProducts(data.products);
    } catch (err: any) {
      setError(err.message || 'Error loading coupon dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    setError('');
    setSuccess('');
    setActionLoadingMap(prev => ({ ...prev, [id]: true }));
    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          is_active: !currentStatus
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update coupon status');

      setCoupons(prev => 
        prev.map(c => (c.id === id ? { ...c, is_active: !currentStatus } : c))
      );
      setSuccess(`Coupon status successfully updated.`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Error updating coupon status.');
    } finally {
      setActionLoadingMap(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleDeleteCoupon = async (id: string, code: string) => {
    if (!confirm(`Are you sure you want to delete coupon "${code}"?`)) return;

    setError('');
    setSuccess('');
    setActionLoadingMap(prev => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/admin/coupons?id=${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete coupon');
      }

      setCoupons(prev => prev.filter(c => c.id !== id));
      setSuccess(`Coupon "${code}" deleted successfully.`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Error deleting coupon.');
    } finally {
      setActionLoadingMap(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: formData.code.toUpperCase().trim(),
          type: formData.type,
          value: Number(formData.value),
          max_uses: formData.maxUses ? parseInt(formData.maxUses) : undefined,
          expires_at: formData.expiresAt || undefined,
          allowed_product_ids: formData.allowedProductIds.length > 0 ? formData.allowedProductIds : undefined
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Coupon creation failed');

      setSuccess(`Coupon "${formData.code.toUpperCase().trim()}" created successfully!`);
      setShowCreateModal(false);
      setFormData({
        code: '',
        type: 'percentage',
        value: '',
        maxUses: '',
        expiresAt: '',
        allowedProductIds: []
      });
      fetchData();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      setError(err.message || 'Could not create coupon.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleProductSelection = (productId: string) => {
    setFormData(prev => {
      const alreadySelected = prev.allowedProductIds.includes(productId);
      const updated = alreadySelected
        ? prev.allowedProductIds.filter(id => id !== productId)
        : [...prev.allowedProductIds, productId];
      return { ...prev, allowedProductIds: updated };
    });
  };

  // Helper to map product IDs to names
  const getProductNamesString = (allowedIds?: string[]) => {
    if (!allowedIds || allowedIds.length === 0) return 'All Products';
    return allowedIds
      .map(id => {
        const prod = products.find(p => p._id === id);
        return prod ? prod.name : id;
      })
      .join(', ');
  };

  // Filtered coupons
  const filteredCoupons = useMemo(() => {
    if (!searchQuery.trim()) return coupons;
    const q = searchQuery.toLowerCase().trim();
    return coupons.filter(c => 
      c.code.toLowerCase().includes(q) ||
      c.type.toLowerCase().includes(q)
    );
  }, [coupons, searchQuery]);

  // Aggregate metrics
  const metrics = useMemo(() => {
    const totalCount = coupons.length;
    const activeCount = coupons.filter(c => c.is_active).length;
    const totalUses = coupons.reduce((sum, c) => sum + (c.uses_count || 0), 0);

    return { totalCount, activeCount, totalUses };
  }, [coupons]);

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
                Coupon Manager
              </h1>
              <span className="bg-emerald-50 text-emerald-700 text-[9px] font-black px-2 py-0.5 rounded uppercase border border-emerald-100">
                Discounts
              </span>
            </div>
            <p className="text-sm text-[#6F6E69] mt-1 font-medium">
              Create and manage promotional discount codes for checkout.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-1.5 bg-[#111110] hover:bg-[#1C1C1A] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-md"
          >
            <Plus size={14} />
            <span>Create Coupon</span>
          </button>
          <button
            onClick={fetchData}
            className="p-2.5 bg-white border border-[#EBEBEB] hover:bg-[#F7F7F5] rounded-xl text-[#6F6E69] cursor-pointer shadow-xs transition-colors"
            title="Refresh Coupons"
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-[#EBEBEB] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-2">
          <div className="flex items-center justify-between text-[#6F6E69]">
            <span className="text-[10px] uppercase tracking-wider font-bold">Total Coupons</span>
            <Tag size={16} className="text-blue-500" />
          </div>
          <h3 className="text-2xl font-black text-[#111110] font-heading">
            {metrics.totalCount}
          </h3>
          <p className="text-[10px] text-[#AEACA5] font-medium">Promo codes defined</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#EBEBEB] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-2">
          <div className="flex items-center justify-between text-[#6F6E69]">
            <span className="text-[10px] uppercase tracking-wider font-bold">Active Promos</span>
            <Activity size={16} className="text-emerald-500" />
          </div>
          <h3 className="text-2xl font-black text-[#111110] font-heading">
            {metrics.activeCount}
          </h3>
          <p className="text-[10px] text-[#AEACA5] font-medium">Currently eligible at checkout</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#EBEBEB] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-2">
          <div className="flex items-center justify-between text-[#6F6E69]">
            <span className="text-[10px] uppercase tracking-wider font-bold">Total Redemptions</span>
            <Sparkles size={16} className="text-amber-500" />
          </div>
          <h3 className="text-2xl font-black text-[#111110] font-heading">
            {metrics.totalUses}
          </h3>
          <p className="text-[10px] text-[#AEACA5] font-medium">Total coupon code claims</p>
        </div>
      </div>

      {/* Main Table Section */}
      <div className="bg-white rounded-2xl border border-[#EBEBEB] shadow-[0_2px_8px_rgba(0,0,0,0.01)] overflow-hidden">
        {/* Search Header */}
        <div className="p-5 border-b border-[#F0EFEB] flex items-center bg-[#F7F7F5]/30">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#AEACA5]" size={14} />
            <input
              type="text"
              placeholder="Search coupons by code or type..."
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
        ) : filteredCoupons.length === 0 ? (
          <div className="p-12 text-center text-[#AEACA5] space-y-3">
            <Tag className="mx-auto" size={32} />
            <p className="font-bold text-gray-500">No coupons match search queries</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F7F7F5]/50 border-b border-[#EBEBEB] text-[10px] font-black text-[#6F6E69] uppercase tracking-wider">
                  <th className="px-6 py-4">Coupon Code</th>
                  <th className="px-6 py-4">Discount Type & Value</th>
                  <th className="px-6 py-4">Applicable Products</th>
                  <th className="px-6 py-4">Usage Stats</th>
                  <th className="px-6 py-4">Expiry Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EFEB] text-xs">
                {filteredCoupons.map((c) => {
                  const isExpired = c.expires_at ? new Date(c.expires_at) < new Date() : false;
                  const isLimitReached = c.max_uses ? c.uses_count >= c.max_uses : false;

                  return (
                    <tr key={c.id} className="hover:bg-[#F7F7F5]/20 transition-colors">
                      {/* Code */}
                      <td className="px-6 py-4 font-mono text-[13px] font-black text-gray-900">
                        <span className="bg-[#F3F4F6] border border-gray-250 px-2 py-0.5 rounded text-gray-800">
                          {c.code}
                        </span>
                      </td>

                      {/* Value & Type */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          {c.type === 'percentage' ? (
                            <>
                              <Percent size={13} className="text-blue-500" />
                              <span className="font-bold text-gray-900">{c.value}% Off</span>
                            </>
                          ) : (
                            <>
                              <span className="font-bold text-emerald-600">₹</span>
                              <span className="font-bold text-gray-900">₹{c.value} Off</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Applicable Products */}
                      <td className="px-6 py-4 max-w-xs font-medium text-gray-700">
                        <div className="flex items-center gap-1">
                          <ShoppingBag size={12} className="text-[#AEACA5] flex-shrink-0" />
                          <span className="truncate" title={getProductNamesString(c.allowed_product_ids)}>
                            {getProductNamesString(c.allowed_product_ids)}
                          </span>
                        </div>
                      </td>

                      {/* Usage */}
                      <td className="px-6 py-4">
                        <div className="font-mono text-[11px] text-gray-950 font-bold">
                          {c.uses_count} / {c.max_uses || '∞'}
                        </div>
                        {isLimitReached && (
                          <span className="text-[9px] text-red-600 font-bold uppercase tracking-wider block mt-0.5">
                            Fully Redeemed
                          </span>
                        )}
                      </td>

                      {/* Expiry */}
                      <td className="px-6 py-4">
                        {c.expires_at ? (
                          <div className="flex flex-col">
                            <span className={`font-mono text-[11px] ${isExpired ? 'text-red-600 font-bold' : 'text-gray-700'}`}>
                              {new Date(c.expires_at).toLocaleDateString('en-IN', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </span>
                            {isExpired && (
                              <span className="text-[9px] text-red-600 font-bold uppercase tracking-wider block mt-0.5">
                                Expired
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[#AEACA5]">Never Expires</span>
                        )}
                      </td>

                      {/* Active Toggle */}
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleActive(c.id, c.is_active)}
                          disabled={actionLoadingMap[c.id]}
                          className="focus:outline-none cursor-pointer transition-all disabled:opacity-50"
                        >
                          <span className={`px-2 py-1 rounded text-[10px] font-black uppercase border transition-colors ${
                            c.is_active
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : 'bg-gray-100 text-gray-500 border-gray-200'
                          }`}>
                            {c.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDeleteCoupon(c.id, c.code)}
                          disabled={actionLoadingMap[c.id]}
                          className="p-1.5 border border-[#EBEBEB] hover:bg-red-50 text-[#6F6E69] hover:text-red-600 rounded-lg cursor-pointer transition-all disabled:opacity-50"
                          title="Delete Coupon"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Coupon Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-xl border border-[#EBEBEB] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-[#F0EFEB] flex items-center justify-between bg-[#F7F7F5]/50">
              <div className="flex items-center space-x-2 text-[#111110]">
                <Plus size={18} />
                <h3 className="font-black font-heading text-sm uppercase tracking-tight">Create Promotional Coupon</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 hover:bg-[#F7F7F5] text-[#6F6E69] rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Coupon Code */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-[#6F6E69] font-bold">Coupon Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    placeholder="e.g. WELCOME20"
                    className="w-full bg-white border border-[#EBEBEB] focus:border-[#111110] rounded-xl px-3 py-2 text-xs font-semibold outline-none font-mono"
                  />
                </div>

                {/* Discount Type */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-[#6F6E69] font-bold">Discount Type *</label>
                  <select
                    required
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full bg-white border border-[#EBEBEB] focus:border-[#111110] rounded-xl px-3 py-2 text-xs font-semibold outline-none"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Discount Value */}
                <div className="space-y-1.5 sm:col-span-1">
                  <label className="text-[10px] uppercase tracking-wider text-[#6F6E69] font-bold">Discount Value *</label>
                  <input
                    type="number"
                    required
                    value={formData.value}
                    onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                    placeholder={formData.type === 'percentage' ? '20' : '500'}
                    className="w-full bg-white border border-[#EBEBEB] focus:border-[#111110] rounded-xl px-3 py-2 text-xs font-semibold outline-none"
                  />
                </div>

                {/* Max Uses */}
                <div className="space-y-1.5 sm:col-span-1">
                  <label className="text-[10px] uppercase tracking-wider text-[#6F6E69] font-bold">Max Uses Limit</label>
                  <input
                    type="number"
                    value={formData.maxUses}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxUses: e.target.value }))}
                    placeholder="e.g. 100 (blank for no limit)"
                    className="w-full bg-white border border-[#EBEBEB] focus:border-[#111110] rounded-xl px-3 py-2 text-xs font-semibold outline-none"
                  />
                </div>

                {/* Expiry Date */}
                <div className="space-y-1.5 sm:col-span-1">
                  <label className="text-[10px] uppercase tracking-wider text-[#6F6E69] font-bold">Expiration Date</label>
                  <input
                    type="datetime-local"
                    value={formData.expiresAt}
                    onChange={(e) => setFormData(prev => ({ ...prev, expiresAt: e.target.value }))}
                    className="w-full bg-white border border-[#EBEBEB] focus:border-[#111110] rounded-xl px-3 py-2 text-xs font-semibold outline-none"
                  />
                </div>
              </div>

              {/* Product Checkboxes Selector */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider text-[#6F6E69] font-bold block">
                  Applicable Products (Select none to apply globally)
                </label>
                <div className="border border-[#EBEBEB] rounded-2xl p-4 bg-[#F9F9F8] max-h-40 overflow-y-auto space-y-2.5">
                  {products.map(p => {
                    const isChecked = formData.allowedProductIds.includes(p._id);
                    return (
                      <div
                        key={p._id}
                        onClick={() => toggleProductSelection(p._id)}
                        className="flex items-center space-x-2.5 cursor-pointer select-none hover:bg-white p-1 rounded-lg transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // Handle on parent div click
                          className="rounded text-[#111110] focus:ring-[#111110] h-3.5 w-3.5 cursor-pointer border-[#EBEBEB]"
                        />
                        <span className="text-xs text-gray-800 font-semibold">{p.name} (₹{p.price})</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Submit Footer */}
              <div className="pt-4 border-t border-[#F0EFEB] flex items-center justify-end space-x-3 bg-white">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
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
                  <span>Create Coupon</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
