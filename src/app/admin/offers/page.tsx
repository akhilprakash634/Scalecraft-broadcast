'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Search,
  Edit,
  Trash2,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Tag,
  Calendar,
  Image as ImageIcon,
  Clock,
  Copy
} from 'lucide-react';

interface Offer {
  id: string;
  name: string;
  banner_url: string;
  description: string;
  offer_type: string;
  discount_value: number;
  start_date: string;
  end_date: string;
  priority: number;
  active: boolean;
  show_countdown: boolean;
  coupon_code: string;
  products_included: string[];
}

interface Product {
  id: string;
  name: string;
}

export default function AdminOffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Upload state
  const [uploading, setUploading] = useState(false);

  // Form modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Partial<Offer> | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [offersRes, productsRes] = await Promise.all([
        fetch('/api/admin/offers'),
        fetch('/api/admin/products')
      ]);

      if (!offersRes.ok) throw new Error('Failed to fetch offers.');
      const offersData = await offersRes.json();
      setOffers(offersData.offers || []);

      if (productsRes.ok) {
        const prodData = await productsRes.json();
        setProducts(prodData.products || []);
      }
    } catch (err: any) {
      setError(err.message || 'Error loading dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEdit = (offer: Offer) => {
    setEditingOffer({ ...offer });
    setIsModalOpen(true);
  };

  const handleCreateNew = () => {
    setEditingOffer({
      name: '',
      banner_url: '',
      description: '',
      offer_type: 'flash_sale',
      discount_value: 0,
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0],
      priority: 0,
      active: true,
      show_countdown: false,
      coupon_code: '',
      products_included: []
    });
    setIsModalOpen(true);
  };

  const handleDuplicate = (offer: Offer) => {
    setEditingOffer({
      ...offer,
      id: undefined, // Duplicates will create a new entry
      name: `${offer.name} (Copy)`
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this offer?')) return;
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/admin/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete offer.');
      
      setSuccess('Offer campaign deleted successfully!');
      setOffers(prev => prev.filter(o => o.id !== id));
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.message || 'Error deleting offer.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOffer) return;
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/admin/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', offer: editingOffer })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save offer.');

      setSuccess('Offer details saved successfully!');
      setIsModalOpen(false);
      setEditingOffer(null);
      fetchData();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.message || 'Error saving offer.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      if (editingOffer) {
        setEditingOffer({
          ...editingOffer,
          banner_url: data.url
        });
      }
      setSuccess('Banner image uploaded successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Error uploading file.');
    } finally {
      setUploading(false);
    }
  };

  const toggleProductInclusion = (productId: string) => {
    if (!editingOffer) return;
    const current = editingOffer.products_included || [];
    let updated;
    if (current.includes(productId)) {
      updated = current.filter(id => id !== productId);
    } else {
      updated = [...current, productId];
    }
    setEditingOffer({
      ...editingOffer,
      products_included: updated
    });
  };

  const filteredOffers = offers.filter(o => 
    o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.coupon_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F8FBF8] p-6 md:p-12 space-y-8 text-xs font-semibold text-gray-800">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[#E0E0E0] pb-6 gap-4">
        <div className="flex items-center space-x-4">
          <Link
            href="/admin"
            className="p-2 bg-white border border-[#E0E0E0] hover:bg-[#F8FBF8] rounded-xl text-[#757575] transition-all cursor-pointer shadow-xs"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-[#212121] tracking-tight uppercase font-heading">
              Offer Campaigns
            </h1>
            <p className="text-sm text-[#757575] mt-1 font-medium">
              Manage promotional discount offers, weekend deals, flash sales, countdown widgets, and product mappings.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleCreateNew}
            className="flex items-center space-x-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer"
          >
            <Plus size={14} />
            <span>Create Offer</span>
          </button>
          <button
            onClick={fetchData}
            className="p-2.5 bg-white border border-[#E0E0E0] hover:bg-[#F8FBF8] rounded-xl text-[#757575] cursor-pointer shadow-xs transition-colors"
            title="Refresh List"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-800 text-xs font-semibold p-4 rounded-xl flex items-center space-x-2">
          <AlertTriangle size={16} className="text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-150 text-green-800 text-xs font-semibold p-4 rounded-xl flex items-center space-x-2">
          <CheckCircle size={16} className="text-green-600 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Search Header */}
      <div className="bg-white rounded-2xl border border-[#E0E0E0] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex items-center">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#AEACA5]" size={14} />
          <input
            type="text"
            placeholder="Search by offer name or coupon code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] focus:ring-1 focus:ring-[#212121] rounded-xl pl-9 pr-4 py-2 text-xs font-semibold placeholder-[#AEACA5] outline-none"
          />
        </div>
      </div>

      {/* Grid List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-48 bg-white border border-gray-150 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredOffers.length === 0 ? (
        <div className="p-12 text-center text-[#AEACA5] bg-white rounded-2xl border border-[#E0E0E0]">
          <Tag className="mx-auto" size={32} />
          <p className="font-bold text-gray-500 mt-2">No active offer campaigns found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredOffers.map(o => (
            <div key={o.id} className="bg-white rounded-2xl border border-[#E0E0E0] shadow-xs flex flex-col justify-between overflow-hidden">
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                      o.active ? 'bg-green-100 text-green-850' : 'bg-gray-150 text-gray-500'
                    }`}>
                      {o.active ? 'Active Offer' : 'Disabled'}
                    </span>
                    <h3 className="text-[14px] font-black text-gray-900 leading-snug">{o.name}</h3>
                    {o.coupon_code && (
                      <p className="text-[10px] text-orange-600 font-bold flex items-center gap-1">
                        <Tag size={10} />
                        <span>Coupon: {o.coupon_code}</span>
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-[16px] font-black text-[#1B5E20]">
                      {o.discount_value < 0 ? `${Math.abs(o.discount_value)}%` : `₹${o.discount_value}`} OFF
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-gray-500 leading-relaxed font-medium line-clamp-2">
                  {o.description || 'No description provided.'}
                </p>

                {o.banner_url && (
                  <div className="relative h-24 rounded-lg overflow-hidden border border-gray-100">
                    <img src={o.banner_url} alt={o.name} className="w-full h-full object-cover" />
                  </div>
                )}

                <div className="border-t border-gray-100 pt-3 flex flex-wrap gap-x-4 gap-y-2 text-[10px] text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={12} className="text-gray-400" />
                    <span>Starts: {new Date(o.start_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock size={12} className="text-gray-400" />
                    <span>Ends: {new Date(o.end_date).toLocaleDateString()}</span>
                  </div>
                  {o.show_countdown && (
                    <span className="text-[9px] font-black bg-red-50 text-red-700 px-2 py-0.5 rounded">
                      Countdown Enabled
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-[#FAF9F6] border-t border-[#E0E0E0] px-6 py-3.5 flex justify-between items-center">
                <span className="text-[10px] text-gray-500 font-bold">
                  Priority: {o.priority} &middot; Included: {o.products_included?.length || 0} Products
                </span>
                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => handleDuplicate(o)}
                    className="p-1.5 bg-white border border-[#E0E0E0] hover:bg-[#F8FBF8] rounded-lg text-gray-700 cursor-pointer shadow-2xs"
                    title="Duplicate Campaign"
                  >
                    <Copy size={12} />
                  </button>
                  <button
                    onClick={() => handleEdit(o)}
                    className="p-1.5 bg-white border border-[#E0E0E0] hover:bg-[#F8FBF8] rounded-lg text-gray-700 cursor-pointer shadow-2xs"
                    title="Edit Campaign"
                  >
                    <Edit size={12} />
                  </button>
                  <button
                    onClick={() => handleDelete(o.id)}
                    className="p-1.5 bg-red-50 border border-red-150 hover:bg-red-100 rounded-lg text-red-600 cursor-pointer shadow-2xs"
                    title="Delete Campaign"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor Modal */}
      {isModalOpen && editingOffer && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-[#E0E0E0] shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-150 flex justify-between items-center">
              <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight">
                {editingOffer.id ? 'Edit Offer Campaign' : 'Create New Offer'}
              </h2>
              <button
                onClick={() => { setIsModalOpen(false); setEditingOffer(null); }}
                className="text-gray-400 hover:text-gray-600 text-lg cursor-pointer font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 uppercase font-black">Offer Name</label>
                    <input
                      type="text"
                      value={editingOffer.name || ''}
                      onChange={(e) => setEditingOffer({ ...editingOffer, name: e.target.value })}
                      placeholder="e.g. 50% Early Bird Weekend Discount"
                      className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-1.5 outline-none font-semibold text-xs"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 uppercase font-black">Linked Coupon Code (Optional)</label>
                    <input
                      type="text"
                      value={editingOffer.coupon_code || ''}
                      onChange={(e) => setEditingOffer({ ...editingOffer, coupon_code: e.target.value.toUpperCase() })}
                      placeholder="e.g. WELCOME50"
                      className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-1.5 outline-none font-semibold text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 uppercase font-black">Discount Value</label>
                    <div className="flex bg-white border border-[#E0E0E0] focus-within:border-[#212121] rounded-lg overflow-hidden">
                      <select
                        value={(editingOffer.discount_value ?? 0) < 0 ? 'percent' : 'amount'}
                        onChange={(e) => {
                          const val = Math.abs(editingOffer.discount_value || 0);
                          setEditingOffer({ 
                            ...editingOffer, 
                            discount_value: e.target.value === 'percent' ? -val : val 
                          });
                        }}
                        className="bg-gray-50 border-r border-[#E0E0E0] px-2 text-xs font-bold text-gray-700 outline-none cursor-pointer"
                      >
                        <option value="amount">₹ (Amt)</option>
                        <option value="percent">% (Pct)</option>
                      </select>
                      <input
                        type="number"
                        value={Math.abs(editingOffer.discount_value ?? 0) || ''}
                        onChange={(e) => {
                          const val = Math.abs(Number(e.target.value));
                          const isPercent = (editingOffer.discount_value ?? 0) < 0;
                          setEditingOffer({ ...editingOffer, discount_value: isPercent ? -val : val });
                        }}
                        placeholder="e.g. 500"
                        className="w-full px-3 py-1.5 outline-none font-semibold text-xs"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 uppercase font-black">Campaign Priority</label>
                    <input
                      type="number"
                      value={editingOffer.priority ?? ''}
                      onChange={(e) => setEditingOffer({ ...editingOffer, priority: Number(e.target.value) })}
                      placeholder="0 = Normal"
                      className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-1.5 outline-none font-semibold text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 uppercase font-black">Offer Type</label>
                    <select
                      value={editingOffer.offer_type || 'flash_sale'}
                      onChange={(e) => setEditingOffer({ ...editingOffer, offer_type: e.target.value })}
                      className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-1.5 outline-none font-semibold text-xs"
                    >
                      <option value="flash_sale">Flash Sale</option>
                      <option value="weekend">Weekend Deal</option>
                      <option value="festival">Festival Campaign</option>
                      <option value="launch">Launch Offer</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 uppercase font-black">Start Date</label>
                    <input
                      type="date"
                      value={editingOffer.start_date ? editingOffer.start_date.split('T')[0] : ''}
                      onChange={(e) => setEditingOffer({ ...editingOffer, start_date: e.target.value })}
                      className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-1.5 outline-none font-semibold text-xs"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 uppercase font-black">End Date</label>
                    <input
                      type="date"
                      value={editingOffer.end_date ? editingOffer.end_date.split('T')[0] : ''}
                      onChange={(e) => setEditingOffer({ ...editingOffer, end_date: e.target.value })}
                      className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-1.5 outline-none font-semibold text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 uppercase font-black">Description</label>
                  <textarea
                    value={editingOffer.description || ''}
                    onChange={(e) => setEditingOffer({ ...editingOffer, description: e.target.value })}
                    placeholder="Short marketing message about the offer campaign..."
                    className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-1.5 outline-none font-semibold text-xs h-16 resize-none"
                  />
                </div>

                {/* Banner Upload */}
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 uppercase font-black block">Promo Banner Image</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={editingOffer.banner_url || ''}
                      onChange={(e) => setEditingOffer({ ...editingOffer, banner_url: e.target.value })}
                      placeholder="https://... or upload below"
                      className="flex-1 bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-1.5 outline-none font-semibold text-xs"
                    />
                    <div className="relative shrink-0">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        disabled={uploading}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <button
                        type="button"
                        className="flex items-center space-x-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3.5 py-1.5 rounded-lg border border-gray-300 font-bold"
                      >
                        <ImageIcon size={12} />
                        <span>{uploading ? 'Uploading...' : 'Upload'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-6 py-2 bg-gray-50 p-4 rounded-xl">
                  <label className="flex items-center gap-2 text-xs text-gray-900 font-bold select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingOffer.active ?? true}
                      onChange={(e) => setEditingOffer({ ...editingOffer, active: e.target.checked })}
                      className="rounded text-orange-600 focus:ring-orange-500"
                    />
                    <span>Is Active Offer Campaign?</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-gray-900 font-bold select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingOffer.show_countdown ?? false}
                      onChange={(e) => setEditingOffer({ ...editingOffer, show_countdown: e.target.checked })}
                      className="rounded text-orange-600 focus:ring-orange-500"
                    />
                    <span>Show Countdown Clock?</span>
                  </label>
                </div>

                {/* Target Products list checkboxes */}
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 uppercase font-black block border-b border-gray-100 pb-1">
                    Products Included in this Offer
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-36 overflow-y-auto p-2 border border-gray-100 rounded-lg">
                    {products.map(p => {
                      const isIncluded = (editingOffer.products_included || []).includes(p.id);
                      return (
                        <label key={p.id} className="flex items-center gap-2 text-xs text-gray-900 select-none cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isIncluded}
                            onChange={() => toggleProductInclusion(p.id)}
                            className="rounded text-orange-600 focus:ring-orange-500"
                          />
                          <span className="truncate">{p.name}</span>
                        </label>
                      );
                    })}
                    {products.length === 0 && (
                      <span className="text-gray-400 italic text-[11px]">No products available to assign.</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Form buttons */}
              <div className="border-t border-gray-150 pt-4 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); setEditingOffer(null); }}
                  className="bg-white border border-[#E0E0E0] hover:bg-[#F8FBF8] text-gray-700 text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-2xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold px-5 py-2 rounded-xl transition-all shadow-2xs cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
