'use client';

/**
 * Admin Billing & Trial Reminders Panel
 *
 * Shows all clients sorted by billing/trial urgency. Akhil can send a manual
 * WhatsApp reminder or pause a client's agent from this page.
 *
 * Security:
 *  - All data is fetched from /api/admin/reminders (server-authenticated).
 *  - No secrets are stored client-side; admin session cookie is HttpOnly.
 *  - All values rendered via React JSX (auto-escaped — no dangerouslySetInnerHTML).
 *  - ownerPhone is displayed as-is (it's an internal admin panel, not public).
 */

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Bell,
  AlertTriangle,
  Clock,
  CheckCircle,
  ArrowLeft,
  RefreshCw,
  Send,
  Pause,
  ChevronDown,
  X,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type BillingStatus = 'active' | 'overdue' | 'paused_unpaid';
type FilterTab = 'all' | 'overdue' | 'due_soon' | 'trial_ending' | 'active';

interface ReminderClient {
  id: string;
  businessName: string;
  ownerName: string;
  ownerPhone: string;
  planType: string;
  connectionType: string;
  status: string;
  billingStatus: BillingStatus;
  nextBillingDate: string | null;
  monthlyAmount: number;
  daysUntilDue: number | null;
  lastBillingReminderSentAt: string | null;
  billingReminderCount: number;
  trialEndsAt: string | null;
  gracePeriodEndsAt: string | null;
  trialReminderSent: boolean;
  daysUntilTrialEnd: number | null;
  daysUntilGraceEnd: number | null;
  agentPausedAt: string | null;
  isTrial: boolean;
}

interface Toast {
  id: number;
  type: 'success' | 'error';
  message: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function relativeTime(iso: string | null): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

type BadgeVariant = 'red' | 'amber' | 'green' | 'gray';

function urgencyBadge(client: ReminderClient): { label: string; variant: BadgeVariant } {
  if (client.billingStatus === 'paused_unpaid') return { label: 'Paused Unpaid', variant: 'red' };
  if (client.billingStatus === 'overdue' || (client.daysUntilDue !== null && client.daysUntilDue < 0)) {
    const days = client.daysUntilDue !== null ? Math.abs(client.daysUntilDue) : '?';
    return { label: `Overdue ${days}d`, variant: 'red' };
  }
  if (client.daysUntilDue !== null && client.daysUntilDue <= 7) {
    return { label: `Due in ${client.daysUntilDue}d`, variant: 'amber' };
  }
  if (client.isTrial) {
    if (client.daysUntilTrialEnd !== null && client.daysUntilTrialEnd <= 0) {
      return { label: 'Trial Expired', variant: 'red' };
    }
    if (client.daysUntilTrialEnd !== null && client.daysUntilTrialEnd <= 7) {
      return { label: `Trial ${client.daysUntilTrialEnd}d left`, variant: 'amber' };
    }
    return { label: 'Trial Active', variant: 'green' };
  }
  return { label: 'Active', variant: 'green' };
}

const badgeClasses: Record<BadgeVariant, string> = {
  red: 'bg-red-50 text-red-700 border border-red-100',
  amber: 'bg-amber-50 text-amber-700 border border-amber-100',
  green: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
  gray: 'bg-gray-100 text-gray-500 border border-gray-200',
};

function matchesFilter(c: ReminderClient, tab: FilterTab): boolean {
  if (tab === 'all') return true;
  const badge = urgencyBadge(c);
  if (tab === 'overdue') return badge.variant === 'red';
  if (tab === 'due_soon') return badge.label.startsWith('Due in');
  if (tab === 'trial_ending') return c.isTrial && (badge.variant === 'amber' || badge.label === 'Trial Expired');
  if (tab === 'active') return badge.variant === 'green';
  return true;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminRemindersPage() {
  const [clients, setClients] = useState<ReminderClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [sending, setSending] = useState<Record<string, boolean>>({});
  const [pausing, setPausing] = useState<Record<string, boolean>>({});
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [previewModal, setPreviewModal] = useState<{ clientId: string; message: string } | null>(null);

  const addToast = useCallback((type: 'success' | 'error', message: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 6000);
  }, []);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/reminders');
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setClients(data.clients || []);
    } catch {
      addToast('error', 'Failed to load reminder data');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const sendReminder = async (clientId: string, type: 'billing' | 'trial') => {
    setSending(prev => ({ ...prev, [clientId]: true }));
    try {
      const res = await fetch('/api/admin/reminders/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Send failed');

      addToast('success', `✅ Reminder sent!`);
      setPreviewModal({ clientId, message: data.messagePreview });

      // Update the row locally without full reload
      const sentAt = data.sentAt;
      setClients(prev =>
        prev.map(c => c.id === clientId
          ? {
              ...c,
              lastBillingReminderSentAt: sentAt,
              billingReminderCount: c.billingReminderCount + 1,
              trialReminderSent: type === 'trial' ? true : c.trialReminderSent,
            }
          : c
        )
      );
    } catch (err: any) {
      addToast('error', `Send failed: ${err.message}`);
    } finally {
      setSending(prev => ({ ...prev, [clientId]: false }));
    }
  };

  const pauseAgent = async (clientId: string) => {
    if (!confirm('Pause this client\'s agent? Their WhatsApp AI will stop responding.')) return;
    setPausing(prev => ({ ...prev, [clientId]: true }));
    try {
      const res = await fetch('/api/admin/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_status', documentId: clientId, status: 'suspended' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Pause failed');

      // Also update billing_status to paused_unpaid
      await fetch('/api/admin/reminders/pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      }).catch(() => {}); // best-effort

      addToast('success', 'Agent paused successfully');
      setClients(prev =>
        prev.map(c => c.id === clientId
          ? { ...c, billingStatus: 'paused_unpaid', status: 'suspended' }
          : c
        )
      );
    } catch (err: any) {
      addToast('error', `Pause failed: ${err.message}`);
    } finally {
      setPausing(prev => ({ ...prev, [clientId]: false }));
    }
  };

  const filtered = clients.filter(c => matchesFilter(c, activeTab));

  // Summary counts
  const counts = {
    overdue: clients.filter(c => urgencyBadge(c).variant === 'red').length,
    due_soon: clients.filter(c => urgencyBadge(c).label.startsWith('Due in')).length,
    trial_ending: clients.filter(c => c.isTrial && urgencyBadge(c).variant === 'amber').length,
    active: clients.filter(c => urgencyBadge(c).variant === 'green').length,
  };

  const tabs: { key: FilterTab; label: string; count?: number }[] = [
    { key: 'all', label: 'All', count: clients.length },
    { key: 'overdue', label: 'Overdue', count: counts.overdue },
    { key: 'due_soon', label: 'Due Soon', count: counts.due_soon },
    { key: 'trial_ending', label: 'Trial Ending', count: counts.trial_ending },
    { key: 'active', label: 'Active', count: counts.active },
  ];

  return (
    <div className="min-h-screen bg-[#F8FBF8] text-[#212121] font-sans">
      {/* ── Toast stack ── */}
      <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold max-w-sm animate-in slide-in-from-right-4 ${
              t.type === 'success'
                ? 'bg-emerald-700 text-white'
                : 'bg-red-700 text-white'
            }`}
          >
            <span className="flex-1">{t.message}</span>
            <button onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))} className="opacity-75 hover:opacity-100">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* ── Message preview modal ── */}
      {previewModal && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-[#212121] uppercase tracking-wide">Message Sent</h2>
              <button onClick={() => setPreviewModal(null)} className="text-gray-400 hover:text-gray-700 cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <div className="bg-[#F8FBF8] border border-[#E0E0E0] rounded-xl p-4 text-sm font-mono text-gray-700 whitespace-pre-wrap leading-relaxed">
              {previewModal.message}
            </div>
            <button
              onClick={() => setPreviewModal(null)}
              className="w-full bg-[#1B5E20] hover:bg-[#144317] text-white text-xs font-bold py-2.5 rounded-lg transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E0E0E0] pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Link href="/admin" className="text-gray-400 hover:text-gray-700 transition-colors">
                <ArrowLeft size={18} />
              </Link>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-[#212121] uppercase tracking-tight">
                  Billing Reminders<span className="text-amber-600">.</span>
                </h1>
                <span className="bg-amber-50 text-amber-700 border border-amber-100 text-[9px] font-black px-2 py-0.5 rounded uppercase">
                  Admin Only
                </span>
              </div>
            </div>
            <p className="text-xs text-[#757575] ml-7">
              Sends from ScaleCraft&apos;s own WhatsApp number — not the client&apos;s agent.
            </p>
          </div>

          <button
            onClick={fetchClients}
            disabled={loading}
            className="flex items-center gap-2 bg-white border border-[#E0E0E0] hover:bg-gray-50 text-xs font-bold px-4 py-2.5 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>

        {/* ── Summary strip ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Overdue / Paused', count: counts.overdue, color: 'text-red-700', bg: 'bg-red-50 border-red-100', Icon: AlertTriangle },
            { label: 'Due Soon (≤7d)', count: counts.due_soon, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-100', Icon: Clock },
            { label: 'Trial Ending', count: counts.trial_ending, color: 'text-blue-700', bg: 'bg-blue-50 border-blue-100', Icon: Bell },
            { label: 'Active / Fine', count: counts.active, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100', Icon: CheckCircle },
          ].map(({ label, count, color, bg, Icon }) => (
            <div key={label} className={`rounded-xl border p-4 flex items-center gap-3 ${bg}`}>
              <Icon size={20} className={color} />
              <div>
                <div className={`text-2xl font-black ${color}`}>{loading ? '—' : count}</div>
                <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Filter tabs ── */}
        <div className="flex gap-1 bg-white border border-[#E0E0E0] rounded-xl p-1 w-fit">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === tab.key
                  ? 'bg-[#212121] text-white'
                  : 'text-[#757575] hover:text-[#212121] hover:bg-gray-50'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Table ── */}
        <div className="bg-white rounded-2xl border border-[#E0E0E0] shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <RefreshCw size={24} className="animate-spin text-gray-300 mx-auto mb-3" />
              <p className="text-xs text-gray-400 font-semibold">Loading clients...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle size={24} className="text-emerald-400 mx-auto mb-3" />
              <p className="text-xs text-gray-400 font-semibold">No clients match this filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E0E0E0] bg-gray-50 text-[10px] uppercase tracking-wider text-[#757575] font-black">
                    <th className="py-3 px-4">Business</th>
                    <th className="py-3 px-4">Owner Phone</th>
                    <th className="py-3 px-4">Plan</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4">Due / Ends</th>
                    <th className="py-3 px-4">Last Reminder</th>
                    <th className="py-3 px-4 text-center">Count</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F0F0]">
                  {filtered.map(client => {
                    const badge = urgencyBadge(client);
                    const isSending = !!sending[client.id];
                    const isPausing = !!pausing[client.id];
                    const isOverdue = badge.variant === 'red';
                    const reminderType = client.isTrial ? 'trial' : 'billing';
                    const dueDateDisplay = client.isTrial
                      ? formatDate(client.trialEndsAt)
                      : formatDate(client.nextBillingDate);

                    return (
                      <tr key={client.id} className={`transition-colors hover:bg-gray-50 ${isOverdue ? 'bg-red-50/30' : ''}`}>
                        {/* Business */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-xs text-[#212121]">{client.businessName}</div>
                          <div className="text-[10px] text-gray-400">{client.ownerName}</div>
                        </td>

                        {/* Phone */}
                        <td className="py-3 px-4 font-mono text-xs text-gray-600">
                          +{client.ownerPhone}
                        </td>

                        {/* Plan */}
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-gray-100 text-gray-500">
                            {client.isTrial ? 'Trial' : client.planType}
                          </span>
                        </td>

                        {/* Status badge */}
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${badgeClasses[badge.variant]}`}>
                            {badge.label}
                          </span>
                        </td>

                        {/* Amount */}
                        <td className="py-3 px-4 text-right font-black text-xs text-[#212121]">
                          {client.isTrial ? '—' : `₹${(client.monthlyAmount ?? 1299).toLocaleString('en-IN')}`}
                        </td>

                        {/* Due / Ends */}
                        <td className="py-3 px-4 text-xs text-gray-500">
                          {dueDateDisplay}
                        </td>

                        {/* Last reminder */}
                        <td className="py-3 px-4 text-xs text-gray-400">
                          {relativeTime(client.lastBillingReminderSentAt)}
                        </td>

                        {/* Count */}
                        <td className="py-3 px-4 text-center">
                          <span className="text-xs font-black text-gray-700">{client.billingReminderCount}</span>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              id={`send-reminder-${client.id}`}
                              onClick={() => sendReminder(client.id, reminderType)}
                              disabled={isSending}
                              className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-300 text-white text-[10px] font-black px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                            >
                              <Send size={11} />
                              <span>{isSending ? 'Sending…' : 'Send Reminder'}</span>
                            </button>

                            {!client.isTrial && isOverdue && client.billingStatus !== 'paused_unpaid' && (
                              <button
                                id={`pause-agent-${client.id}`}
                                onClick={() => pauseAgent(client.id)}
                                disabled={isPausing}
                                className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white text-[10px] font-black px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                              >
                                <Pause size={11} />
                                <span>{isPausing ? 'Pausing…' : 'Pause Agent'}</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-[10px] text-gray-400 text-center pb-4">
          Messages are sent from ScaleCraft&apos;s own WhatsApp Business number via Cloud API.
          Approved templates (billing_reminder, trial_reminder) are required for cold sends.
        </p>
      </div>
    </div>
  );
}
