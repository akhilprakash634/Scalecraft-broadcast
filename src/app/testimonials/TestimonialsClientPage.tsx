'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Star,
  Plus,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  MessageSquare,
  ShoppingBag,
  Heart,
  Quote,
  Loader2,
  X
} from 'lucide-react';

interface Review {
  _id: string;
  name: string;
  rating: number;
  comment: string;
  profession: string;
  createdAt: string;
  productName?: string;
}

interface Product {
  _id: string;
  name: string;
}

export default function TestimonialsClientPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Rating filter
  const [selectedRating, setSelectedRating] = useState<number | null>(null);

  // Form Modal State
  const [showModal, setShowModal] = useState(false);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    profession: '',
    rating: 5,
    comment: '',
    productId: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/testimonials');
      if (!res.ok) throw new Error('Failed to load testimonials');
      const data = await res.json();
      if (data.reviews) setReviews(data.reviews);
      if (data.products) setProducts(data.products);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/testimonials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit testimonial');

      setSuccess(data.message || 'Your review has been submitted for approval!');
      setFormData({
        name: '',
        profession: '',
        rating: 5,
        comment: '',
        productId: ''
      });
      setShowModal(false);
      setTimeout(() => setSuccess(''), 6000);
    } catch (err: any) {
      setError(err.message || 'Error submitting review.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredReviews = useMemo(() => {
    if (selectedRating === null) return reviews;
    return reviews.filter(r => r.rating === selectedRating);
  }, [reviews, selectedRating]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-gray-100 font-sans selection:bg-[#0055FF] selection:text-white pb-20">
      {/* Background Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-900/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-emerald-950/10 rounded-full blur-[150px] pointer-events-none" />

      {/* Header Navigation */}
      <header className="max-w-7xl mx-auto px-6 py-8 flex justify-between items-center relative z-10">
        <Link
          href="/"
          className="flex items-center space-x-2 text-sm font-bold text-gray-400 hover:text-white transition-colors group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span>Back to Home</span>
        </Link>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-950/30 cursor-pointer text-xs"
        >
          <Plus size={14} />
          <span>Write a Testimonial</span>
        </button>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-6 relative z-10 space-y-12 mt-6">
        {/* Title */}
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <span className="text-[10px] uppercase tracking-widest font-black text-blue-500 bg-blue-950/30 border border-blue-900/40 px-3 py-1 rounded-full">
            Ecosystem Love
          </span>
          <h1 className="text-4xl md:text-5xl font-black font-heading tracking-tight text-white leading-tight">
            Client Success & <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">Ecosystem Stories</span>
          </h1>
          <p className="text-sm text-gray-400 font-medium leading-relaxed">
            See how founders, builders, and marketers scale their sales and operations using ScaleCraft’s custom AI agent systems.
          </p>
        </div>

        {error && (
          <div className="bg-red-950/40 border border-red-900/50 text-red-300 text-xs font-semibold p-4 rounded-xl flex items-center space-x-2 max-w-xl mx-auto">
            <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-emerald-950/40 border border-emerald-900/50 text-emerald-300 text-xs font-semibold p-4 rounded-xl flex items-center space-x-2 max-w-xl mx-auto">
            <CheckCircle size={16} className="text-emerald-500 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Rating Filters */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={() => setSelectedRating(null)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
              selectedRating === null
                ? 'bg-white text-gray-950 border-white shadow-md'
                : 'bg-neutral-900 text-gray-400 border-neutral-800/80 hover:text-white hover:border-neutral-700'
            }`}
          >
            All Reviews ({reviews.length})
          </button>
          {[5, 4, 3].map(stars => {
            const count = reviews.filter(r => r.rating === stars).length;
            return (
              <button
                key={stars}
                onClick={() => setSelectedRating(stars)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer flex items-center gap-1.5 ${
                  selectedRating === stars
                    ? 'bg-white text-gray-950 border-white shadow-md'
                    : 'bg-neutral-900 text-gray-400 border-neutral-800/80 hover:text-white hover:border-neutral-700'
                }`}
              >
                <span>{stars} Stars</span>
                <div className="flex items-center">
                  <Star size={10} className="fill-current text-amber-500" />
                </div>
                <span className="text-[10px] text-gray-500">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 size={36} className="animate-spin text-blue-500" />
            <span className="text-xs text-gray-500 font-bold">Retrieving testimonies...</span>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="text-center py-20 bg-neutral-950/40 border border-neutral-900/60 rounded-3xl max-w-lg mx-auto p-8 space-y-3">
            <MessageSquare className="mx-auto text-gray-600" size={32} />
            <h3 className="font-bold text-gray-300">No Testimonials Yet</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              No approved reviews match this filter. Be the first to share your experience by clicking the button above!
            </p>
          </div>
        ) : (
          /* Masonry/Grid of Testimonials */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredReviews.map((r) => (
              <div
                key={r._id}
                className="bg-[#121212] border border-neutral-800/60 rounded-2xl p-6 shadow-xl flex flex-col justify-between hover:border-neutral-700 transition-all group relative hover:-translate-y-1"
              >
                {/* Decorative Quotes */}
                <Quote className="absolute right-6 top-6 text-neutral-800 group-hover:text-neutral-700/60 transition-colors pointer-events-none" size={40} />

                <div className="space-y-4 relative z-10">
                  {/* Rating Stars */}
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={14}
                        className={`${
                          i < r.rating ? 'fill-current text-amber-500' : 'text-neutral-700'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Comment */}
                  <p className="text-xs text-gray-300 leading-relaxed font-medium">
                    "{r.comment}"
                  </p>
                </div>

                <div className="mt-6 pt-5 border-t border-neutral-800/80 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {/* User Avatar Initial */}
                    <div className="w-9 h-9 bg-blue-950 border border-blue-900/60 text-blue-400 font-black rounded-full flex items-center justify-center text-xs">
                      {r.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-200 font-heading text-xs">{r.name}</h4>
                      <p className="text-[10px] text-gray-500 font-medium">{r.profession}</p>
                    </div>
                  </div>

                  {/* Product Tag */}
                  {r.productName && (
                    <span className="text-[9px] bg-neutral-900 border border-neutral-800 text-gray-400 px-2 py-1 rounded-lg font-bold flex items-center gap-1">
                      <ShoppingBag size={8} />
                      {r.productName.split(' ')[0]}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Review Write Form Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-[#121212] border border-neutral-800 rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-neutral-800/80 flex items-center justify-between bg-neutral-950/40">
              <div className="flex items-center space-x-2 text-white">
                <Heart size={16} className="text-red-500 fill-current" />
                <h3 className="font-black font-heading text-sm uppercase tracking-wider">Write a Testimonial</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 hover:bg-neutral-800 text-gray-400 hover:text-white rounded-lg cursor-pointer transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                {/* Name */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Your Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Akhil Prakash"
                    className="w-full bg-neutral-900 border border-neutral-800 focus:border-blue-500 rounded-xl px-3 py-2 text-xs font-semibold outline-none text-white placeholder-gray-600 transition-colors"
                  />
                </div>

                {/* Profession */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Profession / Designation *</label>
                  <input
                    type="text"
                    required
                    value={formData.profession}
                    onChange={(e) => setFormData(prev => ({ ...prev, profession: e.target.value }))}
                    placeholder="e.g. Founder at ScaleCraft"
                    className="w-full bg-neutral-900 border border-neutral-800 focus:border-blue-500 rounded-xl px-3 py-2 text-xs font-semibold outline-none text-white placeholder-gray-600 transition-colors"
                  />
                </div>
              </div>

              {/* Product select */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Product You Used</label>
                <select
                  value={formData.productId}
                  onChange={(e) => setFormData(prev => ({ ...prev, productId: e.target.value }))}
                  className="w-full bg-neutral-900 border border-neutral-800 focus:border-blue-500 rounded-xl px-3 py-2 text-xs font-semibold outline-none text-white transition-colors"
                >
                  <option value="">Select a Product (Optional)</option>
                  {products.map(p => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Interactive Stars Rating */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold block">Rating *</label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map(starValue => {
                    const isActive = hoverRating !== null ? starValue <= hoverRating : starValue <= formData.rating;
                    return (
                      <button
                        type="button"
                        key={starValue}
                        onClick={() => setFormData(prev => ({ ...prev, rating: starValue }))}
                        onMouseEnter={() => setHoverRating(starValue)}
                        onMouseLeave={() => setHoverRating(null)}
                        className="p-1 cursor-pointer transition-transform hover:scale-125 focus:outline-none"
                      >
                        <Star
                          size={24}
                          className={`transition-colors ${
                            isActive ? 'fill-current text-amber-500' : 'text-neutral-700'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Testimonial comments */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Your Review *</label>
                <textarea
                  required
                  rows={4}
                  value={formData.comment}
                  onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
                  placeholder="Share details of your experience with ScaleCraft, how it helped your operations, or what you liked most..."
                  className="w-full bg-neutral-900 border border-neutral-800 focus:border-blue-500 rounded-xl px-3 py-2 text-xs font-semibold outline-none text-white placeholder-gray-600 transition-colors resize-none"
                />
              </div>

              {/* Modal Submit Footer */}
              <div className="pt-4 border-t border-neutral-800/80 flex items-center justify-end space-x-3 bg-[#121212]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-gray-400 hover:text-white text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-white hover:bg-gray-100 text-gray-950 text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer disabled:bg-gray-700 flex items-center gap-1.5 transition-colors"
                >
                  {submitting && <Loader2 size={12} className="animate-spin text-gray-950" />}
                  <span>Submit Testimonial</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
