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
  HelpCircle,
  ShieldQuestion,
  AlignLeft
} from 'lucide-react';

interface FAQ {
  id: string;
  objection: string;
  question: string;
  answer: string;
  category: string;
  sort_order: number;
}

export default function AdminFAQsPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFAQ, setEditingFAQ] = useState<Partial<FAQ> | null>(null);

  const fetchFAQs = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/faqs');
      if (!res.ok) throw new Error('Failed to fetch FAQ entries.');
      const data = await res.json();
      setFaqs(data || []);
    } catch (err: any) {
      setError(err.message || 'Error loading FAQs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFAQs();
  }, []);

  const handleEdit = (faq: FAQ) => {
    setEditingFAQ({ ...faq });
    setIsModalOpen(true);
  };

  const handleCreateNew = () => {
    setEditingFAQ({
      objection: 'General Objection',
      question: '',
      answer: '',
      category: 'General',
      sort_order: (faqs.length + 1)
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this FAQ entry?')) return;
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/admin/faqs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete FAQ entry.');
      
      setSuccess('FAQ entry deleted successfully!');
      setFaqs(prev => prev.filter(f => f.id !== id));
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.message || 'Error deleting FAQ entry.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFAQ) return;
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/admin/faqs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', faq: editingFAQ })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save FAQ.');

      setSuccess('FAQ entry saved successfully!');
      setIsModalOpen(false);
      setEditingFAQ(null);
      fetchFAQs();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.message || 'Error saving FAQ.');
    }
  };

  const filteredFAQs = faqs.filter(f => 
    f.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.objection.toLowerCase().includes(searchQuery.toLowerCase())
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
              FAQs Manager
            </h1>
            <p className="text-sm text-[#757575] mt-1 font-medium">
              Manage the landing page FAQ accordion by tailoring questions addressing user hesitations and objections.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleCreateNew}
            className="flex items-center space-x-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer"
          >
            <Plus size={14} />
            <span>Add FAQ</span>
          </button>
          <button
            onClick={fetchFAQs}
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
            placeholder="Search FAQs by objection, question, or answer text..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] focus:ring-1 focus:ring-[#212121] rounded-xl pl-9 pr-4 py-2 text-xs font-semibold placeholder-[#AEACA5] outline-none"
          />
        </div>
      </div>

      {/* FAQs List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-white border border-gray-150 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredFAQs.length === 0 ? (
        <div className="p-12 text-center text-[#AEACA5] bg-white rounded-2xl border border-[#E0E0E0]">
          <HelpCircle className="mx-auto" size={32} />
          <p className="font-bold text-gray-500 mt-2">No FAQ items defined.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E0E0E0] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FBF8] border-b border-[#E0E0E0] text-[10px] font-black text-[#757575] uppercase tracking-wider">
                  <th className="px-6 py-4">Objection Label</th>
                  <th className="px-6 py-4 w-[50%]">Question & Answer</th>
                  <th className="px-6 py-4">Sort Order</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E0E0E0] text-xs">
                {filteredFAQs.map(f => (
                  <tr key={f.id} className="hover:bg-[#F8FBF8]/20 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded">
                        {f.objection}
                      </span>
                      <div className="text-[10px] text-gray-400 font-semibold mt-1">Cat: {f.category}</div>
                    </td>
                    <td className="px-6 py-4 space-y-1.5 py-4.5">
                      <div className="font-bold text-gray-900 text-sm leading-snug flex items-center gap-1">
                        <ShieldQuestion size={13} className="text-gray-400 shrink-0" />
                        {f.question}
                      </div>
                      <p className="text-gray-500 leading-relaxed font-medium pl-4 border-l border-emerald-600/30">
                        {f.answer}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-gray-950 font-black">
                      {f.sort_order}
                    </td>
                    <td className="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => handleEdit(f)}
                        className="p-1.5 bg-white border border-[#E0E0E0] hover:bg-[#F8FBF8] rounded-lg text-gray-700 cursor-pointer shadow-2xs"
                        title="Edit FAQ"
                      >
                        <Edit size={12} />
                      </button>
                      <button
                        onClick={() => handleDelete(f.id)}
                        className="p-1.5 bg-red-50 border border-red-150 hover:bg-red-100 rounded-lg text-red-600 cursor-pointer shadow-2xs"
                        title="Delete FAQ"
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Editor Modal */}
      {isModalOpen && editingFAQ && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-[#E0E0E0] shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-150 flex justify-between items-center">
              <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight">
                {editingFAQ.id ? 'Edit FAQ Entry' : 'Create New FAQ'}
              </h2>
              <button
                onClick={() => { setIsModalOpen(false); setEditingFAQ(null); }}
                className="text-gray-400 hover:text-gray-600 text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 uppercase font-black">Objection Label</label>
                  <input
                    type="text"
                    value={editingFAQ.objection || ''}
                    onChange={(e) => setEditingFAQ({ ...editingFAQ, objection: e.target.value })}
                    placeholder="e.g. REFUND POLICIES"
                    className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-1.5 outline-none font-semibold text-xs text-gray-900"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 uppercase font-black">Category</label>
                  <input
                    type="text"
                    value={editingFAQ.category || ''}
                    onChange={(e) => setEditingFAQ({ ...editingFAQ, category: e.target.value })}
                    className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-1.5 outline-none font-semibold text-xs text-gray-900"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 uppercase font-black">Sort Order</label>
                  <input
                    type="number"
                    value={editingFAQ.sort_order ?? ''}
                    onChange={(e) => setEditingFAQ({ ...editingFAQ, sort_order: Number(e.target.value) })}
                    className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-1.5 outline-none font-semibold text-xs text-gray-900"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-gray-500 uppercase font-black">Question</label>
                <input
                  type="text"
                  value={editingFAQ.question || ''}
                  onChange={(e) => setEditingFAQ({ ...editingFAQ, question: e.target.value })}
                  className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-1.5 outline-none font-semibold text-xs text-gray-900"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-gray-500 uppercase font-black">Answer Text</label>
                <textarea
                  value={editingFAQ.answer || ''}
                  onChange={(e) => setEditingFAQ({ ...editingFAQ, answer: e.target.value })}
                  className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-1.5 outline-none font-semibold text-xs text-gray-900 h-32"
                  required
                />
              </div>

              {/* Form buttons */}
              <div className="border-t border-gray-150 pt-4 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); setEditingFAQ(null); }}
                  className="bg-white border border-[#E0E0E0] hover:bg-[#F8FBF8] text-gray-700 text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-2xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-5 py-2 rounded-xl transition-all shadow-2xs cursor-pointer"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
