'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Users,
  Eye,
  RefreshCw,
  Terminal,
  ShieldAlert,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Play,
  X,
  Settings,
} from 'lucide-react';

interface ClientRecord {
  _id: string;
  clientId: string;
  businessName: string;
  ownerName: string;
  whatsappBotNumber: string;
  ownerPhone: string;
  email: string;
  serverIP: string;
  plan: 'starter' | 'growth' | 'pro';
  status: 'active' | 'suspended' | 'pending';
  setupDate: string;
  monthlyUsage?: number;
  monthlyAmount?: number;
  billingStatus?: 'active' | 'overdue' | 'paused_unpaid';
  botProtectionEnabled?: boolean;
  botProtectionAppliedAt?: string;
  hermesProfile?: string | null;
  sharedServerIp?: string | null;
  dailyBroadcastLimit?: number | null;
  metaLimitTier?: string | null;
  totalSentToday?: number;
}

export default function AdminClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Logs modal
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [logs, setLogs] = useState('');
  const [logsLoading, setLogsLoading] = useState(false);
  const [logClientName, setLogClientName] = useState('');

  // Daily limit modal
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [selectedClientForLimit, setSelectedClientForLimit] = useState<ClientRecord | null>(null);
  const [limitInput, setLimitInput] = useState<string>('');
  const [savingLimit, setSavingLimit] = useState(false);

  const getMetaLimitDescription = (tier: string | null | undefined) => {
    const mapping: Record<string, number> = {
      TIER_250: 250,
      TIER_1K: 1000,
      TIER_10K: 10000,
      TIER_100K: 100000,
      TIER_UNLIMITED: 100000000
    };
    const t = tier || 'TIER_250';
    const limit = mapping[t] || 250;
    if (t === 'TIER_UNLIMITED') return 'Unlimited';
    return `${limit}/day`;
  };

  const handleOpenLimitModal = (client: ClientRecord) => {
    setSelectedClientForLimit(client);
    setLimitInput(client.dailyBroadcastLimit != null ? String(client.dailyBroadcastLimit) : '');
    setShowLimitModal(true);
  };

  const handleSaveLimit = async () => {
    if (!selectedClientForLimit) return;
    setSavingLimit(true);
    setError('');
    setSuccess('');
    try {
      const parsedVal = limitInput.trim() === '' ? null : parseInt(limitInput, 10);
      if (parsedVal !== null && (isNaN(parsedVal) || parsedVal < 0)) {
        throw new Error('Limit must be a non-negative integer or blank.');
      }

      const res = await fetch(`/api/admin/clients/${selectedClientForLimit._id}/broadcast-limit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dailyBroadcastLimit: parsedVal }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save limit.');

      // Update client record in state
      setClients(prev => prev.map(c => c._id === selectedClientForLimit._id ? { ...c, dailyBroadcastLimit: parsedVal } : c));
      setSuccess('Daily broadcast limit updated successfully.');
      setShowLimitModal(false);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.message || 'Error updating daily limit.');
    } finally {
      setSavingLimit(false);
    }
  };

  const fetchClients = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/clients');
      if (!res.ok) throw new Error('Failed to retrieve client records.');
      const data = await res.json();
      if (Array.isArray(data)) {
        setClients(data);
      }
    } catch (err: any) {
      setError(err.message || 'Error loading clients.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleImpersonate = async (documentId: string) => {
    setError('');
    try {
      const res = await fetch('/api/admin/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'impersonate', documentId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Impersonation failed');
      
      // Impersonation JWT set in cookies, redirect to dashboard
      router.push(data.redirect);
    } catch (err: any) {
      setError(err.message || 'Could not log in as client.');
    }
  };

  const handleRestartAgent = async (documentId: string) => {
    setSuccess('');
    setError('');
    try {
      const res = await fetch('/api/admin/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restart', documentId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to restart agent');

      setSuccess(data.message || 'Restart signal sent successfully.');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.message || 'Error restarting gateway.');
    }
  };

  const handleFetchLogs = async (documentId: string, businessName: string) => {
    setLogClientName(businessName);
    setShowLogsModal(true);
    setLogsLoading(true);
    setLogs('');
    try {
      const res = await fetch('/api/admin/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logs', documentId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch logs');

      setLogs(data.logs);
    } catch (err: any) {
      setError(err.message || 'Error fetching logs.');
    } finally {
      setLogsLoading(false);
    }
  };

  const handleToggleStatus = async (documentId: string, currentStatus: string) => {
    setError('');
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      const res = await fetch('/api/admin/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_status', documentId, status: newStatus }),
      });

      if (!res.ok) throw new Error('Failed to update status');

      setClients((prev) =>
        prev.map((c) => (c._id === documentId ? { ...c, status: newStatus } : c))
      );
      setSuccess(`Account status changed to ${newStatus} successfully.`);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.message || 'Error toggling account status.');
    }
  };

  const handleDeleteClient = async (documentId: string) => {
    if (!confirm('Are you absolutely sure you want to delete this client registry? Server infrastructure will remain active but account mapping is purged.')) return;
    setError('');
    try {
      const res = await fetch('/api/admin/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', documentId }),
      });

      if (!res.ok) throw new Error('Failed to delete registry');

      setClients((prev) => prev.filter((c) => c._id !== documentId));
      setSuccess('Client registry purged successfully.');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.message || 'Error purging registry.');
    }
  };

  // Sum monthly_amount across only truly active + billing-active clients for the MRR header card
  const activeMrr = clients
    .filter(c => c.status === 'active' && c.billingStatus !== 'paused_unpaid')
    .reduce((sum, c) => sum + (c.monthlyAmount ?? 1299), 0);

  return (
    <div className="min-h-screen bg-[#F8FBF8] p-6 md:p-12 space-y-8 text-xs font-semibold">
      {/* Header */}
      <div className="flex items-center space-x-4 border-b border-[#E0E0E0] pb-6">
        <Link
          href="/admin"
          className="p-2 bg-white border border-[#E0E0E0] hover:bg-[#F8FBF8] rounded-lg text-[#757575] transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black text-[#212121] tracking-tight uppercase font-heading">
              Client Directory
            </h1>
            <span className="bg-red-50 text-red-700 text-[9px] font-black px-2 py-0.5 rounded uppercase">
              Management
            </span>
          </div>
          <p className="text-sm text-[#757575] mt-1">
            Browse and manage all registered ScaleCraft SaaS agent customers.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-[#FFEBEE] border border-red-100 text-[#C62828] text-xs font-semibold p-4 rounded-xl flex items-center space-x-2">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-[#E8F5E9] border border-green-100 text-[#2E7D32] text-xs font-semibold p-4 rounded-xl flex items-center space-x-2">
          <CheckCircle size={16} />
          <span>{success}</span>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl border border-[#E0E0E0] h-96 animate-pulse animate-duration-500" />
      ) : clients.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E0E0E0] p-12 text-center shadow-xs">
          <Users className="mx-auto text-[#AEACA5] mb-4" size={48} />
          <h3 className="text-base font-bold text-[#212121] font-heading">No Clients Registered</h3>
          <p className="text-xs text-[#757575] mt-1 max-w-sm mx-auto">
            Go back to the overview panel and click Provision Client to configure your first SaaS server.
          </p>
        </div>
      ) : (
        <>
          {/* Active MRR summary card */}
          <div className="bg-white rounded-2xl border border-[#E0E0E0] shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-5 flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] font-black text-[#757575] uppercase tracking-widest">Active MRR</p>
              <p className="text-3xl font-black text-[#1B5E20] mt-1">₹{activeMrr.toLocaleString('en-IN')}<span className="text-sm font-bold text-[#757575]">/mo</span></p>
              <p className="text-[10px] text-[#757575] mt-0.5">
                {clients.filter(c => c.status === 'active' && c.billingStatus !== 'paused_unpaid').length} active client(s) — suspended clients excluded
              </p>
            </div>
            <div className="bg-[#E8F5E9] rounded-xl p-4">
              <Users size={28} className="text-[#1B5E20]" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E0E0E0] shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FBF8] border-b border-[#E0E0E0] text-[10px] font-black text-[#757575] uppercase tracking-wider">
                  <th className="px-6 py-4">Business Name</th>
                  <th className="px-6 py-4">Bot Phone</th>
                  <th className="px-6 py-4">Server IP</th>
                  <th className="px-6 py-4">Plan</th>
                  <th className="px-6 py-4 text-center">Usage</th>
                  <th className="px-6 py-4">MRR Contribution</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Bot Protection</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E0E0E0] text-xs">
                {clients.map((c) => (
                  <tr key={c._id} className="hover:bg-[#F8FBF8]/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-[#212121] font-heading">{c.businessName}</div>
                      <div className="text-[10px] text-[#757575] font-semibold mt-0.5">{c.ownerName} ({c.email})</div>
                    </td>
                    <td className="px-6 py-4 text-[#757575] font-mono">{c.whatsappBotNumber}</td>
                    <td className="px-6 py-4 text-[#757575] font-mono">
                      {c.hermesProfile && c.sharedServerIp
                        ? c.sharedServerIp
                        : c.serverIP || 'N/A'}
                      {c.hermesProfile && (
                        <span className="ml-1 text-[10px] text-blue-500">
                          ({c.hermesProfile})
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 capitalize text-[#212121]">{c.plan}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="font-bold text-[#212121]">{c.monthlyUsage || 0} msgs</div>
                      <div className="text-[10px] text-[#757575] font-semibold mt-1">
                        Daily: {c.totalSentToday ?? 0} / {c.dailyBroadcastLimit != null ? c.dailyBroadcastLimit : getMetaLimitDescription(c.metaLimitTier)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                        {c.status === 'active' && c.billingStatus !== 'paused_unpaid' ? (
                          <span className="font-bold text-[#1B5E20]">₹{(c.monthlyAmount ?? 1299).toLocaleString('en-IN')}/mo</span>
                        ) : (
                          <span className="text-[#AEACA5] line-through text-[10px] flex flex-col gap-0.5">
                            <span>₹{(c.monthlyAmount ?? 1299).toLocaleString('en-IN')}/mo</span>
                            <span className="no-underline text-[9px] font-black uppercase tracking-wider text-[#C62828]">suspended</span>
                          </span>
                        )}
                      </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          c.status === 'active'
                            ? 'bg-[#E8F5E9] text-[#2E7D32]'
                            : c.status === 'suspended'
                            ? 'bg-[#FFEBEE] text-[#C62828]'
                            : 'bg-[#FFF9C4] text-amber-800'
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {c.botProtectionEnabled ? (
                        <span className="text-green-700 font-bold flex items-center space-x-1">
                          <span>✅</span>
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="text-amber-600 font-bold flex items-center space-x-1">
                          <span>⚠️</span>
                          <span>Not Applied</span>
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
                      {/* Impersonate */}
                      <button
                        onClick={() => handleImpersonate(c._id)}
                        className="bg-white border border-[#E0E0E0] hover:bg-[#F8FBF8] text-[#212121] px-2.5 py-1.5 rounded text-[10px] font-bold cursor-pointer"
                        title="View Client Dashboard"
                      >
                        <Eye size={12} className="inline mr-1" />
                        <span>Impersonate</span>
                      </button>

                      {/* Limit */}
                      <button
                        onClick={() => handleOpenLimitModal(c)}
                        className="bg-white border border-[#E0E0E0] hover:bg-[#F8FBF8] text-[#212121] px-2.5 py-1.5 rounded text-[10px] font-bold cursor-pointer"
                        title="Configure Daily Broadcast Limit"
                      >
                        <Settings size={12} className="inline mr-1" />
                        <span>Set Limit</span>
                      </button>

                      {/* Restart */}
                      <button
                        onClick={() => handleRestartAgent(c._id)}
                        className="bg-white border border-[#E0E0E0] hover:bg-[#F8FBF8] text-[#212121] px-2.5 py-1.5 rounded text-[10px] font-bold cursor-pointer"
                        title="Restart remote gateway service"
                      >
                        <RefreshCw size={12} className="inline mr-1" />
                        <span>Restart</span>
                      </button>

                      {/* Logs */}
                      <button
                        onClick={() => handleFetchLogs(c._id, c.businessName)}
                        className="bg-white border border-[#E0E0E0] hover:bg-[#F8FBF8] text-[#212121] px-2.5 py-1.5 rounded text-[10px] font-bold cursor-pointer"
                        title="Tail server logs"
                      >
                        <Terminal size={12} className="inline mr-1" />
                        <span>Logs</span>
                      </button>

                      {/* Suspend */}
                      <button
                        onClick={() => handleToggleStatus(c._id, c.status)}
                        className={`px-2.5 py-1.5 rounded text-[10px] font-bold cursor-pointer border ${
                          c.status === 'active'
                            ? 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
                            : 'bg-green-50 border-green-200 text-green-800 hover:bg-green-100'
                        }`}
                      >
                        {c.status === 'active' ? 'Suspend' : 'Activate'}
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDeleteClient(c._id)}
                        className="bg-red-50 border border-red-150 text-red-700 px-2 py-1.5 rounded hover:bg-red-100 cursor-pointer"
                        title="Purge Client Mapping"
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
        </>
      )}

      {/* Logs Modal */}
      {showLogsModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl border border-[#E0E0E0] shadow-2xl flex flex-col max-h-[80vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#E0E0E0] flex items-center justify-between">
              <div className="flex items-center space-x-2 text-[#212121]">
                <Terminal size={18} />
                <h3 className="font-bold font-heading">System Logs: {logClientName}</h3>
              </div>
              <button
                onClick={() => setShowLogsModal(false)}
                className="p-1 hover:bg-[#F8FBF8] text-[#757575] rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto bg-gray-950 text-gray-300 font-mono text-xs flex-1 min-h-[300px]">
              {logsLoading ? (
                <div className="flex flex-col items-center justify-center h-full space-y-2">
                  <RefreshCw size={24} className="animate-spin text-[#1B5E20]" />
                  <span>Fetching journalctl logs...</span>
                </div>
              ) : (
                <pre className="whitespace-pre-wrap">{logs}</pre>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-[#E0E0E0] flex justify-end">
              <button
                onClick={() => setShowLogsModal(false)}
                className="bg-[#1B5E20] hover:bg-[#144317] text-white text-xs font-bold px-4 py-2.5 rounded-lg cursor-pointer"
              >
                Close Logs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Daily Broadcast Limit Modal */}
      {showLimitModal && selectedClientForLimit && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md border border-[#E0E0E0] shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#E0E0E0] flex items-center justify-between">
              <div className="flex items-center space-x-2 text-[#212121]">
                <Settings size={18} />
                <h3 className="font-bold font-heading text-sm">Configure Daily Broadcast Limit</h3>
              </div>
              <button
                onClick={() => setShowLimitModal(false)}
                className="p-1 hover:bg-[#F8FBF8] text-[#757575] rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              <div>
                <p className="text-[10px] font-black text-[#757575] uppercase tracking-widest">Client</p>
                <p className="text-sm font-bold text-[#212121] mt-1">{selectedClientForLimit.businessName}</p>
              </div>

              <div>
                <p className="text-[10px] font-black text-[#757575] uppercase tracking-widest">Meta Messaging Tier</p>
                <p className="text-xs text-[#757575] mt-1 font-sans">
                  Meta tier allows up to <span className="font-bold text-[#212121]">{getMetaLimitDescription(selectedClientForLimit.metaLimitTier)}</span> — set a lower ScaleCraft limit below if needed.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-wider block">
                  Daily Broadcast Limit
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="No limit cap (Meta-tier only)"
                  value={limitInput}
                  onChange={(e) => setLimitInput(e.target.value)}
                  className="w-full text-xs border border-border bg-white rounded-lg p-2.5 outline-none font-semibold text-text-primary focus:border-brand"
                />
                <span className="text-[10px] text-text-muted font-sans font-normal leading-normal">
                  Leave blank to disable the custom cap and rely only on Meta's daily tier limit.
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-[#E0E0E0] flex justify-end space-x-2">
              <button
                onClick={() => setShowLimitModal(false)}
                className="bg-white border border-border hover:bg-[#F8FBF8] text-[#212121] text-xs font-bold px-4 py-2.5 rounded-lg cursor-pointer transition-colors"
                disabled={savingLimit}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveLimit}
                className="bg-[#1B5E20] hover:bg-[#144317] text-white text-xs font-bold px-4 py-2.5 rounded-lg cursor-pointer transition-colors flex items-center gap-1.5"
                disabled={savingLimit}
              >
                {savingLimit && <RefreshCw size={12} className="animate-spin" />}
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
