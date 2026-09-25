'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { OverviewSkeleton } from '@/components/ui/Skeleton';
import Card from '@/components/ui/Card';
import Stat from '@/components/ui/Stat';
import Badge from '@/components/ui/Badge';
import {
  Users,
  Megaphone,
  Send,
  CheckCircle,
  Eye,
  AlertTriangle,
  MessageSquare,
  ArrowRight,
  TrendingUp,
  MessageCircle,
  Clock,
  Wifi,
  WifiOff
} from 'lucide-react';

interface OverviewStats {
  totalContacts: number;
  totalBroadcasts: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  replies: number;
}

interface OverviewData {
  stats: OverviewStats;
  whatsappStatus: string;
  recentConversations: any[];
}

export default function DashboardOverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [recentBroadcasts, setRecentBroadcasts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        // Fetch KPI stats & conversations
        const statsRes = await fetch('/api/dashboard/overview');
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setData(statsData);
        }

        // Fetch recent broadcasts using existing history API
        const historyRes = await fetch('/api/dashboard/broadcast/history');
        if (historyRes.ok) {
          const historyData = await historyRes.json();
          setRecentBroadcasts((historyData.history || []).slice(0, 5));
        }

      } catch (err) {
        console.error('Failed to load overview data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const formatDate = (dateStr: string) => {
    if (!dateStr || dateStr === 'N/A') return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
      });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'completed') return <Badge variant="success" size="sm">Completed</Badge>;
    if (s === 'running' || s === 'sending') return <Badge variant="warning" size="sm" className="animate-pulse">Sending</Badge>;
    if (s === 'stopped' || s === 'failed') return <Badge variant="danger" size="sm">Failed</Badge>;
    if (s === 'queued') return <Badge variant="default" size="sm">Queued</Badge>;
    return <Badge variant="default" size="sm">{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="p-6">
        <OverviewSkeleton />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="p-6 space-y-6 w-full max-w-none"
    >
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 select-none">
        <div>
          <h1 className="text-xl font-black text-text-primary tracking-tight font-sans">
            Dashboard Overview
          </h1>
          <p className="text-xs font-semibold text-text-muted mt-1">
            Real-time statistics for your WhatsApp Business operations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/broadcast"
            className="bg-brand hover:bg-brand-dark text-white font-extrabold text-[11px] px-4 py-2.5 rounded-lg shadow-sm transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Megaphone size={14} />
            New Broadcast
          </Link>
        </div>
      </div>

      {/* WhatsApp Status Banner */}
      <Card padding="none" className="overflow-hidden border border-border">
        <div className="px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${data?.whatsappStatus === 'Connected' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {data?.whatsappStatus === 'Connected' ? <Wifi size={18} /> : <WifiOff size={18} />}
            </div>
            <div>
              <h3 className="text-sm font-black text-text-primary tracking-wide">
                WhatsApp Status
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`h-2 w-2 rounded-full ${data?.whatsappStatus === 'Connected' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                <span className="text-xs font-semibold text-text-muted">{data?.whatsappStatus || 'Loading...'}</span>
              </div>
            </div>
          </div>
          <Link href="/dashboard/settings" className="text-xs font-bold text-brand hover:underline">
            Manage Settings
          </Link>
        </div>
      </Card>

      {/* Row 1: KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        <Stat
          label="Total Contacts"
          value={data?.stats?.totalContacts?.toLocaleString() || '0'}
          icon={<Users size={18} />}
          description="Total synced contacts"
        />
        <Stat
          label="Total Broadcasts"
          value={data?.stats?.totalBroadcasts?.toLocaleString() || '0'}
          icon={<Megaphone size={18} />}
          description="Campaigns created"
        />
        <Stat
          label="Messages Sent"
          value={data?.stats?.sent?.toLocaleString() || '0'}
          icon={<Send size={18} />}
          description="Total dispatched"
        />
        <Stat
          label="Delivered"
          value={data?.stats?.delivered?.toLocaleString() || '0'}
          icon={<CheckCircle size={18} />}
          description="Successfully reached"
        />
        <Stat
          label="Read"
          value={data?.stats?.read?.toLocaleString() || '0'}
          icon={<Eye size={18} />}
          description="Opened by recipients"
        />
        <Stat
          label="Replies"
          value={data?.stats?.replies?.toLocaleString() || '0'}
          icon={<MessageSquare size={18} />}
          description="Inbound messages"
        />
        <Stat
          label="Failed"
          value={data?.stats?.failed?.toLocaleString() || '0'}
          icon={<AlertTriangle size={18} />}
          description="Delivery errors"
        />
      </div>

      {/* Row 2: Recent Broadcasts */}
      <Card padding="none" className="overflow-hidden">
        <div className="px-5 py-4 border-b border-border dark:border-border flex items-center justify-between">
          <h3 className="text-[13px] font-black text-text-primary dark:text-foreground uppercase tracking-wider font-sans">
            Recent Broadcasts
          </h3>
          <Link
            href="/dashboard/broadcast"
            className="text-xs font-bold text-brand hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>View All Campaigns</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {recentBroadcasts.length === 0 ? (
          <div className="p-12 text-center text-xs text-text-subtle italic">
            No broadcasts created yet. Start a new campaign to see stats here!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-0 dark:bg-surface-2 border-b border-border dark:border-border text-[10px] font-black text-text-muted uppercase tracking-wider">
                  <th className="p-4 font-black">Campaign</th>
                  <th className="p-4 font-black">Recipients</th>
                  <th className="p-4 font-black">Sent</th>
                  <th className="p-4 font-black">Delivered</th>
                  <th className="p-4 font-black">Read</th>
                  <th className="p-4 font-black">Failed</th>
                  <th className="p-4 font-black">Status</th>
                  <th className="p-4 font-black">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border dark:divide-border text-xs font-semibold">
                {recentBroadcasts.map((camp) => (
                  <tr key={camp.id} className="hover:bg-surface-0/50 dark:hover:bg-surface-2/50 transition-colors">
                    <td className="p-4 font-bold text-text-primary">
                      {camp.campaign_type || 'Custom Broadcast'}
                    </td>
                    <td className="p-4 text-text-secondary">{camp.total_leads?.toLocaleString() || '0'}</td>
                    <td className="p-4 text-text-secondary">{camp.sent?.toLocaleString() || '0'}</td>
                    <td className="p-4 text-text-secondary">{camp.statusCounts?.delivered?.toLocaleString() || '0'}</td>
                    <td className="p-4 text-text-secondary">{camp.statusCounts?.read?.toLocaleString() || '0'}</td>
                    <td className="p-4 text-danger">{camp.failed?.toLocaleString() || '0'}</td>
                    <td className="p-4">{getStatusBadge(camp.status)}</td>
                    <td className="p-4 text-text-muted">{formatDate(camp.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Row 3: Recent Conversations */}
      <Card padding="none" className="overflow-hidden">
        <div className="px-5 py-4 border-b border-border dark:border-border flex items-center justify-between">
          <h3 className="text-[13px] font-black text-text-primary dark:text-foreground uppercase tracking-wider font-sans">
            Recent Conversations
          </h3>
          <Link
            href="/dashboard/leads"
            className="text-xs font-bold text-brand hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>View Inbox</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {!data?.recentConversations || data.recentConversations.length === 0 ? (
          <div className="p-12 text-center text-xs text-text-subtle italic">
            No recent conversations found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-0 dark:bg-surface-2 border-b border-border dark:border-border text-[10px] font-black text-text-muted uppercase tracking-wider">
                  <th className="p-4 font-black">Customer</th>
                  <th className="p-4 font-black">Last Message</th>
                  <th className="p-4 font-black">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border dark:divide-border text-xs font-semibold">
                {data.recentConversations.map((conv, i) => (
                  <tr key={i} className="hover:bg-surface-0/50 dark:hover:bg-surface-2/50 transition-colors">
                    <td className="p-4 font-bold text-text-primary flex items-center gap-2">
                      <div className="bg-brand/10 text-brand p-1.5 rounded-full">
                        <MessageCircle size={14} />
                      </div>
                      {conv.customer}
                    </td>
                    <td className="p-4 text-text-secondary max-w-[300px] truncate">{conv.lastMessage}</td>
                    <td className="p-4 text-text-muted flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(conv.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </motion.div>
  );
}
