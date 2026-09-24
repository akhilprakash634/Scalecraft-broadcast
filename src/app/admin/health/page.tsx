'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Activity,
  Package,
  FileQuestion,
  Image as ImageIcon,
  ExternalLink,
  Edit
} from 'lucide-react';

interface ProductHealthItem {
  id: string;
  name: string;
  slug: string;
  status_db: string;
  product_type: string;
  price: number;
  international_price: number;
  thumbnail_url: string | null;
  faq_count: number;
  media_count: number;
  download_count: number;
  healthStatus: 'healthy' | 'warning' | 'critical';
  errors: string[];
  warnings: string[];
}

interface HealthSummary {
  totalProducts: number;
  healthyCount: number;
  warningCount: number;
  criticalCount: number;
}

export default function AdminProductHealthPage() {
  const [summary, setSummary] = useState<HealthSummary | null>(null);
  const [audit, setAudit] = useState<ProductHealthItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchHealthAudit = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/health');
      if (!res.ok) throw new Error('Failed to run product health audit.');
      const data = await res.json();
      setSummary(data.summary);
      setAudit(data.audit || []);
    } catch (err: any) {
      setError(err.message || 'Error running audit');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthAudit();
  }, []);

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
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-700" />
              <h1 className="text-2xl font-black text-[#212121] tracking-tight uppercase font-heading">
                Product Health Diagnostic
              </h1>
            </div>
            <p className="text-sm text-[#757575] mt-1 font-medium">
              Real-time database integrity audit for missing images, pricing gaps, orphan FAQs, and schema anomalies.
            </p>
          </div>
        </div>

        <button
          onClick={fetchHealthAudit}
          className="flex items-center space-x-2 bg-white border border-[#E0E0E0] hover:bg-[#F8FBF8] px-4 py-2.5 rounded-xl text-[#212121] font-bold shadow-xs cursor-pointer transition-colors"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Run Diagnostic</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-150 text-red-800 p-4 rounded-xl flex items-center space-x-2">
          <XCircle size={16} className="text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white border border-[#E0E0E0] rounded-2xl p-5 shadow-2xs">
            <div className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider">Total Products</div>
            <div className="text-3xl font-black text-gray-900 mt-1 font-heading">{summary.totalProducts}</div>
          </div>
          <div className="bg-emerald-50/50 border border-emerald-200 rounded-2xl p-5 shadow-2xs">
            <div className="text-[10px] text-emerald-800 font-extrabold uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 size={12} />
              <span>Healthy</span>
            </div>
            <div className="text-3xl font-black text-emerald-900 mt-1 font-heading">{summary.healthyCount}</div>
          </div>
          <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-5 shadow-2xs">
            <div className="text-[10px] text-amber-800 font-extrabold uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle size={12} />
              <span>Warnings</span>
            </div>
            <div className="text-3xl font-black text-amber-900 mt-1 font-heading">{summary.warningCount}</div>
          </div>
          <div className="bg-red-50/50 border border-red-200 rounded-2xl p-5 shadow-2xs">
            <div className="text-[10px] text-red-800 font-extrabold uppercase tracking-wider flex items-center gap-1">
              <XCircle size={12} />
              <span>Critical Gaps</span>
            </div>
            <div className="text-3xl font-black text-red-900 mt-1 font-heading">{summary.criticalCount}</div>
          </div>
        </div>
      )}

      {/* Diagnostic Table */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-white border border-gray-200 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E0E0E0] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FBF8] border-b border-[#E0E0E0] text-[10px] font-black text-[#757575] uppercase tracking-wider">
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Product Name &amp; Slug</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Pricing</th>
                  <th className="px-6 py-4">Assets</th>
                  <th className="px-6 py-4">Health Diagnostic Details</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E0E0E0] text-xs">
                {audit.map((item) => (
                  <tr key={item.id} className="hover:bg-[#F8FBF8]/40 transition-colors">
                    <td className="px-6 py-4">
                      {item.healthStatus === 'healthy' ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                          <CheckCircle2 size={12} /> Healthy
                        </span>
                      ) : item.healthStatus === 'warning' ? (
                        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                          <AlertTriangle size={12} /> Needs Info
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                          <XCircle size={12} /> Critical
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-950 text-sm font-heading">{item.name}</div>
                      <div className="text-[10px] text-gray-400 font-mono mt-0.5">{item.slug}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[9px] font-black uppercase tracking-wider bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                        {item.product_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono font-extrabold text-gray-900">
                      ₹{item.price?.toLocaleString('en-IN') || 0}
                      <span className="text-[10px] text-gray-400 font-normal block">
                        ${item.international_price || 0} USD
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[11px] text-gray-600 space-y-1">
                      <div className="flex items-center gap-1">
                        <FileQuestion size={12} className="text-gray-400" />
                        <span>{item.faq_count} FAQs</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ImageIcon size={12} className="text-gray-400" />
                        <span>{item.media_count} Screenshots</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {item.errors.length > 0 && (
                        <div className="space-y-1 text-red-700 font-bold text-[11px]">
                          {item.errors.map((e, idx) => (
                            <div key={idx} className="flex items-center gap-1">
                              <span>• {e}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {item.warnings.length > 0 && (
                        <div className="space-y-1 text-amber-800 font-semibold text-[11px]">
                          {item.warnings.map((w, idx) => (
                            <div key={idx} className="flex items-center gap-1">
                              <span>• {w}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {item.errors.length === 0 && item.warnings.length === 0 && (
                        <span className="text-emerald-700 font-bold text-[11px]">All required fields &amp; relational assets present.</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap space-x-2">
                      <Link
                        href={`/products/${item.slug}`}
                        target="_blank"
                        className="p-1.5 bg-white border border-[#E0E0E0] hover:bg-[#F8FBF8] rounded-lg text-gray-700 inline-flex items-center justify-center cursor-pointer shadow-2xs"
                        title="View Live Page"
                      >
                        <ExternalLink size={12} />
                      </Link>
                      <Link
                        href={`/admin/products?edit=${item.id}`}
                        className="p-1.5 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-lg text-emerald-800 inline-flex items-center justify-center cursor-pointer shadow-2xs"
                        title="Edit Product"
                      >
                        <Edit size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
