'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  MoveUp,
  MoveDown,
  LayoutGrid,
  Link2,
  Save
} from 'lucide-react';

export default function AdminSettingsPage() {
  const [sections, setSections] = useState<string[]>([]);
  const [waLinkMsg, setWaLinkMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchSettings = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/settings');
      if (!res.ok) throw new Error('Failed to fetch settings.');
      const data = await res.json();
      setSections(data.home_sections_order || []);
      setWaLinkMsg(data.whatsapp_prefill_msg || 'Hi Akhil, I have a specific question about ScaleCraft before buying');
    } catch (err: any) {
      setError(err.message || 'Error loading settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newSections = [...sections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= sections.length) return;
    
    // Swap
    const temp = newSections[index];
    newSections[index] = newSections[targetIndex];
    newSections[targetIndex] = temp;
    
    setSections(newSections);
  };

  const handleSaveLayout = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      // 1. Save sections order
      const res1 = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', key: 'home_sections_order', value: sections })
      });
      if (!res1.ok) throw new Error('Failed to save layout sections order.');

      // 2. Save WhatsApp prefill message
      const res2 = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', key: 'whatsapp_prefill_msg', value: waLinkMsg })
      });
      if (!res2.ok) throw new Error('Failed to save WhatsApp message setting.');

      setSuccess('All settings updated successfully!');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.message || 'Error saving settings.');
    } finally {
      setSaving(false);
    }
  };

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
              Layout Settings
            </h1>
            <p className="text-sm text-[#757575] mt-1 font-medium">
              Control the rendering order of landing page sections and general dynamic parameters.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleSaveLayout}
            disabled={saving}
            className="flex items-center space-x-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-gray-300 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer"
          >
            <Save size={14} />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
          <button
            onClick={fetchSettings}
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

      {loading ? (
        <div className="space-y-4 max-w-lg">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-white border border-gray-150 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Section Ordering Panel */}
          <div className="bg-white rounded-2xl border border-[#E0E0E0] p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight flex items-center gap-1.5 border-b border-gray-100 pb-2">
              <LayoutGrid size={15} />
              <span>Landing Page Section Order</span>
            </h3>
            
            <p className="text-[11px] text-[#757575] font-medium leading-relaxed">
              Arrange the stack order of sections visible on the landing page. Use the up and down arrow controls to rearrange the components.
            </p>

            <div className="space-y-2 pt-2">
              {sections.map((sec, idx) => (
                <div key={sec} className="flex items-center justify-between bg-[#F8FBF8]/40 border border-gray-150 px-4 py-2.5 rounded-xl hover:border-gray-300 transition-colors">
                  <span className="font-bold text-[#212121]">{sec}</span>
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => moveSection(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1 bg-white border border-gray-150 hover:bg-gray-50 disabled:opacity-40 rounded text-gray-700 cursor-pointer shadow-2xs"
                      title="Move Up"
                    >
                      <MoveUp size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSection(idx, 'down')}
                      disabled={idx === sections.length - 1}
                      className="p-1 bg-white border border-gray-150 hover:bg-gray-50 disabled:opacity-40 rounded text-gray-700 cursor-pointer shadow-2xs"
                      title="Move Down"
                    >
                      <MoveDown size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* General parameters */}
          <div className="space-y-8">
            <div className="bg-white rounded-2xl border border-[#E0E0E0] p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight flex items-center gap-1.5 border-b border-gray-100 pb-2">
                <Link2 size={15} />
                <span>WhatsApp Prefecture Prefills</span>
              </h3>
              
              <div className="space-y-2 pt-2">
                <label className="text-[10px] text-gray-500 uppercase font-black">Prefill message for FAQ CTA</label>
                <textarea
                  value={waLinkMsg}
                  onChange={(e) => setWaLinkMsg(e.target.value)}
                  className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] focus:ring-1 focus:ring-[#212121] rounded-xl px-4 py-3 text-xs font-semibold placeholder-[#AEACA5] outline-none h-24"
                  placeholder="Type WhatsApp prefill query text..."
                />
                <p className="text-[10px] text-[#757575] font-medium leading-relaxed pt-1">
                  This text will automatically pre-populate in the WhatsApp chat when visitors click the "Chat on WhatsApp" button on the FAQ landing widget.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
