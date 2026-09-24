'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Search,
  Check,
  Trash2,
  RefreshCw,
  Star,
  CheckCircle,
  AlertTriangle,
  Heart,
  User,
  ShoppingBag,
  ExternalLink,
  Lock,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface ReviewRecord {
  _id: string;
  name: string;
  rating: number;
  comment: string;
  profession: string;
  approved: boolean;
  createdAt: string;
  productName?: string;
  productId?: string;
}

interface ProductRecord {
  _id: string;
  name: string;
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  
  // Track which review is currently having its product edited
  const [editingProductFor, setEditingProductFor] = useState<string | null>(null);

  // Button loading states
  const [actionLoadingMap, setActionLoadingMap] = useState<Record<string, boolean>>({});

  const fetchReviews = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/reviews');
      if (!res.ok) throw new Error('Failed to retrieve testimonials.');
      const data = await res.json();
      if (data.reviews) {
        setReviews(data.reviews);
        setProducts(data.products || []);
      } else if (Array.isArray(data)) {
        setReviews(data);
      }
    } catch (err: any) {
      setError(err.message || 'Error loading testimonials.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleApprove = async (reviewId: string) => {
    setError('');
    setSuccess('');
    setActionLoadingMap(prev => ({ ...prev, [reviewId]: true }));
    try {
      const res = await fetch('/api/admin/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', reviewId })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to approve review');

      setSuccess('Testimonial approved successfully and is now live!');
      setReviews(prev => 
        prev.map(r => r._id === reviewId ? { ...r, approved: true } : r)
      );
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.message || 'Error approving testimonial.');
    } finally {
      setActionLoadingMap(prev => ({ ...prev, [reviewId]: false }));
    }
  };

  const handleDelete = async (reviewId: string) => {
    if (!confirm('Are you sure you want to delete this testimonial permanently? This action cannot be undone.')) return;
    setError('');
    setSuccess('');
    setActionLoadingMap(prev => ({ ...prev, [reviewId]: true }));
    try {
      const res = await fetch('/api/admin/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', reviewId })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete review');

      setSuccess('Testimonial deleted successfully.');
      setReviews(prev => prev.filter(r => r._id !== reviewId));
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.message || 'Error deleting testimonial.');
    } finally {
      setActionLoadingMap(prev => ({ ...prev, [reviewId]: false }));
    }
  };

  const handleAttachProduct = async (reviewId: string, productId: string) => {
    setError('');
    setSuccess('');
    setActionLoadingMap(prev => ({ ...prev, [reviewId]: true }));
    try {
      const res = await fetch('/api/admin/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'attach_product', reviewId, productId })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to attach product');

      const selectedProduct = products.find(p => p._id === productId);

      setSuccess('Product attached successfully.');
      setReviews(prev => 
        prev.map(r => r._id === reviewId ? { ...r, productId, productName: selectedProduct?.name } : r)
      );
      setEditingProductFor(null);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.message || 'Error attaching product.');
    } finally {
      setActionLoadingMap(prev => ({ ...prev, [reviewId]: false }));
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedComments(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Filtered reviews
  const filteredReviews = useMemo(() => {
    if (!searchQuery.trim()) return reviews;
    const q = searchQuery.toLowerCase().trim();
    return reviews.filter(r => 
      r.name?.toLowerCase().includes(q) ||
      r.profession?.toLowerCase().includes(q) ||
      r.comment?.toLowerCase().includes(q) ||
      r.productName?.toLowerCase().includes(q)
    );
  }, [reviews, searchQuery]);

  // Aggregate stats
  const stats = useMemo(() => {
    const total = reviews.length;
    const pending = reviews.filter(r => !r.approved).length;
    const approved = total - pending;
    return { total, pending, approved };
  }, [reviews]);

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
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black text-[#212121] tracking-tight uppercase font-heading">
                Testimonials
              </h1>
              <span className="bg-red-50 text-red-700 text-[9px] font-black px-2 py-0.5 rounded uppercase border border-red-100">
                Approvals
              </span>
            </div>
            <p className="text-sm text-[#757575] mt-1 font-medium">
              Review ecosystem client submissions, approve outstanding reviews, or delete entries.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            href="/testimonials"
            target="_blank"
            className="flex items-center space-x-1.5 bg-white border border-[#E0E0E0] hover:bg-[#F8FBF8] text-[#212121] text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer"
          >
            <span>View Public Page</span>
            <ExternalLink size={14} />
          </Link>
          <button
            onClick={fetchReviews}
            className="p-2.5 bg-white border border-[#E0E0E0] hover:bg-[#F8FBF8] rounded-xl text-[#757575] cursor-pointer shadow-xs transition-colors"
            title="Refresh List"
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

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-6 max-w-3xl">
        <div className="bg-white rounded-2xl border border-[#E0E0E0] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-2">
          <span className="text-[10px] text-[#757575] uppercase tracking-wider block font-bold">Total Reviews</span>
          <h3 className="text-2xl font-black text-[#212121] font-heading">{stats.total}</h3>
        </div>
        <div className="bg-white rounded-2xl border border-[#E0E0E0] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-2">
          <span className="text-[10px] text-amber-700 uppercase tracking-wider block font-bold">Pending Review</span>
          <h3 className="text-2xl font-black text-amber-700 font-heading">{stats.pending}</h3>
        </div>
        <div className="bg-white rounded-2xl border border-[#E0E0E0] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-2">
          <span className="text-[10px] text-[#1B5E20] uppercase tracking-wider block font-bold">Live Reviews</span>
          <h3 className="text-2xl font-black text-[#1B5E20] font-heading">{stats.approved}</h3>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-[#E0E0E0] shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
        {/* Search header */}
        <div className="p-5 border-b border-[#E0E0E0] bg-[#F8FBF8]/30">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#AEACA5]" size={14} />
            <input
              type="text"
              placeholder="Search by client name, profession, comment, or product..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] focus:ring-1 focus:ring-[#212121] rounded-xl pl-9 pr-4 py-2 text-xs font-semibold placeholder-[#AEACA5] outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-12 space-y-4">
            <div className="h-8 bg-gray-100 rounded-lg animate-pulse w-full" />
            <div className="h-24 bg-gray-50 rounded-lg animate-pulse w-full" />
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="p-12 text-center text-[#AEACA5] space-y-3">
            <Heart className="mx-auto" size={32} />
            <p className="font-bold text-gray-500">No testimonials matched queries</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FBF8] border-b border-[#E0E0E0] text-[10px] font-black text-[#757575] uppercase tracking-wider">
                  <th className="px-6 py-4">Client</th>
                  <th className="px-6 py-4">Rating</th>
                  <th className="px-6 py-4 w-[40%]">Testimonial Content</th>
                  <th className="px-6 py-4">Target Product</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E0E0E0] text-xs">
                {filteredReviews.map((r) => {
                  const isExpanded = !!expandedComments[r._id];
                  const commentDisplay = isExpanded ? r.comment : `${r.comment.slice(0, 100)}${r.comment.length > 100 ? '...' : ''}`;
                  
                  return (
                    <tr key={r._id} className="hover:bg-[#F8FBF8]/20 transition-colors">
                      {/* Client info */}
                      <td className="px-6 py-4">
                        <div className="font-bold text-[#212121] flex items-center gap-1.5 font-heading">
                          <User size={12} className="text-[#757575]" />
                          {r.name}
                        </div>
                        <div className="text-[10px] text-[#757575] font-semibold mt-0.5">{r.profession}</div>
                      </td>

                      {/* Rating stars */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-0.5 text-amber-500">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              size={12}
                              className={`${
                                i < r.rating ? 'fill-current' : 'text-gray-200'
                              }`}
                            />
                          ))}
                        </div>
                      </td>

                      {/* Comment text */}
                      <td className="px-6 py-4 text-[#212121] leading-relaxed">
                        <div>
                          <span>"{commentDisplay}"</span>
                          {r.comment.length > 100 && (
                            <button
                              onClick={() => toggleExpand(r._id)}
                              className="text-blue-600 hover:text-blue-800 ml-1.5 focus:outline-none cursor-pointer inline-flex items-center gap-0.5"
                            >
                              {isExpanded ? (
                                <>
                                  <span>Show less</span>
                                  <ChevronUp size={10} />
                                </>
                              ) : (
                                <>
                                  <span>Read more</span>
                                  <ChevronDown size={10} />
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Product reference */}
                      <td className="px-6 py-4">
                        {editingProductFor === r._id ? (
                          <div className="flex items-center gap-2">
                            <select
                              className="text-xs border border-gray-300 rounded px-2 py-1 bg-white outline-none focus:border-[#212121]"
                              value={r.productId || ''}
                              onChange={(e) => handleAttachProduct(r._id, e.target.value)}
                              disabled={actionLoadingMap[r._id]}
                            >
                              <option value="">Select a product...</option>
                              {products.map(p => (
                                <option key={p._id} value={p._id}>{p.name}</option>
                              ))}
                            </select>
                            <button 
                              onClick={() => setEditingProductFor(null)}
                              className="text-gray-400 hover:text-gray-600 cursor-pointer p-1"
                              disabled={actionLoadingMap[r._id]}
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div 
                            className="group flex items-center gap-1.5 cursor-pointer hover:bg-gray-50 p-1 -ml-1 rounded transition-colors"
                            onClick={() => setEditingProductFor(r._id)}
                            title="Click to edit attached product"
                          >
                            <ShoppingBag size={12} className="text-[#757575] flex-shrink-0" />
                            {r.productName ? (
                              <span className="font-bold text-gray-900">{r.productName}</span>
                            ) : (
                              <span className="text-gray-400 font-medium italic">General Brand</span>
                            )}
                            <span className="opacity-0 group-hover:opacity-100 text-[10px] text-blue-500 ml-1 font-semibold transition-opacity">
                              Edit
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Status badge */}
                      <td className="px-6 py-4">
                        <span
                          className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            r.approved
                              ? 'bg-[#E8F5E9] text-[#2E7D32]'
                              : 'bg-[#FFF9C4] text-amber-800'
                          }`}
                        >
                          {r.approved ? 'Live / Approved' : 'Pending Approval'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
                        {!r.approved && (
                          <button
                            onClick={() => handleApprove(r._id)}
                            disabled={actionLoadingMap[r._id]}
                            className="bg-[#1B5E20] hover:bg-[#144317] disabled:bg-gray-200 text-white px-2.5 py-1.5 rounded text-[10px] font-bold cursor-pointer transition-colors inline-flex items-center gap-1 shadow-xs"
                          >
                            {actionLoadingMap[r._id] ? (
                              <RefreshCw size={11} className="animate-spin" />
                            ) : (
                              <Check size={11} />
                            )}
                            <span>Approve</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleDelete(r._id)}
                          disabled={actionLoadingMap[r._id]}
                          className="bg-red-50 border border-red-150 hover:bg-red-100 disabled:bg-gray-100 text-red-700 px-2.5 py-1.5 rounded text-[10px] font-bold cursor-pointer transition-colors inline-flex items-center gap-1 shadow-xs"
                          title="Permanently Delete Review"
                        >
                          <Trash2 size={11} />
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
    </div>
  );
}
