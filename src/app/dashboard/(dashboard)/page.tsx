'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { OverviewSkeleton } from '@/components/ui/Skeleton';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Stat from '@/components/ui/Stat';
import {
  Activity,
  Users,
  Package,
  Megaphone,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Loader2,
  Server,
  Settings,
  QrCode,
  Check,
  Clock,
  MessageSquare,
  Zap,
} from 'lucide-react';

interface OverviewStats {
  running: boolean;
  uptime: string;
  lastMessage: string;
  messageCount: number;
  leadsCount: number;
  assistantMessageCount?: number;
}

interface ClientProfile {
  clientId: string;
  status: string;
  provisioningLogs: string[];
  serverIP: string;
  installedAt: string;
  ownerName: string;
  whatsappBotNumber: string;
  geminiApiKey?: string;
  hermesProfile?: string | null;
  sharedServerIp?: string | null;
  connectionType?: string;
  cachedStatus?: string;
  statusCheckedAt?: string;
}

export default function DashboardOverviewPage() {
  const [range, setRange] = useState<'today' | 'week' | 'month' | 'total'>('today');
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentLeads, setRecentLeads] = useState<any[]>([]);
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  // Usage alerts states
  const [activeAlert, setActiveAlert] = useState<any | null>(null);
  const [restartingAgent, setRestartingAgent] = useState(false);
  const [alertActionMsg, setAlertActionMsg] = useState('');

  const fetchUsageAlert = async (clientId: string) => {
    try {
      const { data, error } = await supabase
        .from('usage_alerts')
        .select('*')
        .eq('client_id', clientId)
        .eq('resolved', false)
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setActiveAlert(data);
      } else {
        setActiveAlert(null);
      }
    } catch (err) {
      console.error('Failed to load usage alerts:', err);
    }
  };

  const handleRestartAgent = async () => {
    setRestartingAgent(true);
    setAlertActionMsg('');
    try {
      const res = await fetch('/api/dashboard/agent/restart', { method: 'POST' });
      if (res.ok) {
        setAlertActionMsg('AI Agent restarted successfully.');
      } else {
        throw new Error('Failed to restart agent');
      }
    } catch (err: any) {
      setAlertActionMsg(`Error restarting: ${err.message}`);
    } finally {
      setRestartingAgent(false);
    }
  };

  const handleDismissAlert = async () => {
    if (!activeAlert) return;
    try {
      const res = await fetch('/api/dashboard/usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId: activeAlert.id })
      });
      if (res.ok) {
        setActiveAlert(null);
      }
    } catch (err) {
      console.error('Failed to dismiss alert:', err);
    }
  };

  const handleRetry = async () => {
    if (!clientProfile) return;
    setRetrying(true);
    setRetryError(null);
    try {
      const res = await fetch('/api/admin/provision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sanityDocumentId: clientProfile.clientId }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to restart provisioning');
      }
    } catch (err: any) {
      setRetryError(err.message || 'An error occurred while retrying installation.');
    } finally {
      setRetrying(false);
    }
  };

  // Fetch live agent status
  const fetchLiveAgentStatus = async (selectedRange: 'today' | 'week' | 'month' | 'total') => {
    try {
      const res = await fetch(`/api/dashboard/agent/status?range=${selectedRange}&overview=true`);
      if (!res.ok) throw new Error('Failed to fetch live agent status');
      const statusData = await res.json();

      setStats(prev => {
        if (!prev) return null;
        return {
          ...prev,
          running: statusData.running ?? false,
          uptime: statusData.uptime ?? 'N/A',
          lastMessage: statusData.lastMessage ?? 'N/A',
          messageCount: statusData.messageCount ?? 0,
          assistantMessageCount: statusData.assistantMessageCount ?? 0,
        };
      });
    } catch (err) {
      console.error('Failed to load background live agent status:', err);
      setStats(prev => {
        if (!prev) return null;
        return {
          ...prev,
          uptime: prev.uptime.includes('unknown') ? prev.uptime : 'Status check error',
          lastMessage: 'N/A',
        };
      });
    }
  };

  // Fetch leads and update stats
  const fetchDataForRange = async (selectedRange: 'today' | 'week' | 'month' | 'total', activeClient: any) => {
    try {
      const leadsRes = await fetch(`/api/dashboard/leads?range=${selectedRange}`);
      let initialLeads: any[] = [];
      if (leadsRes.ok) {
        const leadsData = await leadsRes.json();
        initialLeads = leadsData.leads || [];
        setRecentLeads(initialLeads.slice(0, 8));
      }

      const cachedRunning = activeClient.cachedStatus === 'online';
      const isStale = !activeClient.statusCheckedAt || 
        (Date.now() - new Date(activeClient.statusCheckedAt).getTime() > 120000);
        
      let lastSeenUptime = 'N/A';
      if (isStale) {
        const minutesAgo = activeClient.statusCheckedAt 
          ? Math.round((Date.now() - new Date(activeClient.statusCheckedAt).getTime()) / 60000)
          : null;
        lastSeenUptime = minutesAgo !== null 
          ? `Status unknown (last seen ${minutesAgo}m ago)` 
          : 'Status unknown';
      } else {
        lastSeenUptime = cachedRunning ? 'Running' : 'Offline';
      }

      setStats(prev => ({
        running: prev?.running ?? (cachedRunning && !isStale),
        uptime: prev?.uptime ?? lastSeenUptime,
        lastMessage: prev?.lastMessage ?? 'Loading...',
        messageCount: prev?.messageCount ?? 0,
        assistantMessageCount: prev?.assistantMessageCount ?? 0,
        leadsCount: initialLeads.length,
      }));

      if (activeClient.status === 'active') {
        await fetchLiveAgentStatus(selectedRange);
      }
    } catch (err) {
      console.error('Error fetching range data:', err);
    }
  };

  // 1. Initial client profile load and realtime setup
  useEffect(() => {
    let statusChannel: any = null;
    let logsChannel: any = null;

    async function loadInitialData() {
      try {
        const clientRes = await fetch('/api/dashboard/client');
        if (!clientRes.ok) throw new Error('Failed to fetch client profile');
        const clientData = await clientRes.json();
        setClientProfile(clientData);
        fetchUsageAlert(clientData.clientId);
        setLoading(false);
        initRealtime(clientData.clientId);
      } catch (err) {
        console.error('Error loading initial dashboard data:', err);
        setLoading(false);
      }
    }

    function initRealtime(clientId: string) {
      if (!clientId) return;

      statusChannel = supabase
        .channel(`status-check-${clientId}`)
        .on(
          'postgres_changes' as any,
          {
            event: 'UPDATE',
            table: 'installation_status',
            filter: `client_id=eq.${clientId}`,
          },
          (payload: any) => {
            const updated = payload.new as any;
            setClientProfile((prev) => {
              if (!prev) return null;
              const newStatus = updated.status || prev.status;
              return {
                ...prev,
                status: newStatus,
                serverIP: updated.server_ip || prev.serverIP,
                installedAt: updated.installed_at || prev.installedAt,
              };
            });
          }
        )
        .subscribe();

      logsChannel = supabase
        .channel(`logs-check-${clientId}`)
        .on(
          'postgres_changes' as any,
          {
            event: 'INSERT',
            table: 'installation_logs',
            filter: `client_id=eq.${clientId}`,
          },
          (payload: any) => {
            const newLog = payload.new as any;
            const formattedLog = `[${new Date(newLog.created_at).toISOString()}] ${newLog.log_message}`;
            setClientProfile((prev) => {
              if (!prev) return null;
              if (prev.provisioningLogs.includes(formattedLog)) return prev;
              return {
                ...prev,
                provisioningLogs: [...prev.provisioningLogs, formattedLog],
              };
            });
          }
        )
        .subscribe();
    }

    loadInitialData();

    return () => {
      if (statusChannel) supabase.removeChannel(statusChannel);
      if (logsChannel) supabase.removeChannel(logsChannel);
    };
  }, []);

  // 2. Fetch scoped leads and live status when range or profile changes
  useEffect(() => {
    if (clientProfile) {
      fetchDataForRange(range, clientProfile);
    }
  }, [range, clientProfile?.clientId]);

  // Poll status endpoint to trigger SSH installation if VPS ready while logged into dashboard
  useEffect(() => {
    if (!clientProfile || clientProfile.status === 'active') return;

    let isTriggering = false;

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/admin/provision/status?id=${clientProfile.clientId}`);
        if (!res.ok) return;
        const data = await res.json();

        // Update the client profile status and logs from the poll response
        setClientProfile((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            status: data.oldStatus || data.status || prev.status,
            serverIP: data.serverIP || prev.serverIP,
            provisioningLogs: data.logs || data.provisioningLogs || prev.provisioningLogs,
          };
        });

        if (data.needsInstallTrigger && data.documentId && !isTriggering) {
          isTriggering = true;
          console.log('[Dashboard] Auto-triggering SSH install...');
          try {
            await fetch('/api/admin/provision/install', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ documentId: data.documentId }),
            });
          } catch (err) {
            console.error('[Dashboard] Install trigger error:', err);
          } finally {
            isTriggering = false;
          }
        }
      } catch (err) {
        console.error('[Dashboard] Background status poll error:', err);
      }
    }, 8000);

    return () => clearInterval(pollInterval);
  }, [clientProfile?.clientId, clientProfile?.status]);

  const formatDate = (dateStr: string) => {
    if (!dateStr || dateStr === 'N/A') return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const getRelativeTime = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const today = new Date();
      if (d.toDateString() === today.toDateString()) {
        return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
      }
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    } catch {
      return '';
    }
  };

  // Check states for the step tracker
  const isServerCreated = !!clientProfile?.serverIP;
  const isInstalling = (clientProfile?.status === 'installing' || clientProfile?.status === 'installed' || clientProfile?.status === 'active') && !clientProfile?.hermesProfile;
  const isAgentInstalled = clientProfile?.status === 'installed' || clientProfile?.status === 'active' || !!clientProfile?.hermesProfile;
  const isLive = clientProfile?.status === 'active';

  // Extract last 3 log entries
  const lastLogs = clientProfile?.provisioningLogs?.slice(-3) || [];

  if (loading) {
    return (
      <div className="p-6">
        <OverviewSkeleton />
      </div>
    );
  }

  // RENDER SETUP PROGRESS VIEW IF NOT ACTIVE
  const isMultiTenantReady = !!clientProfile?.hermesProfile && clientProfile?.status === 'installing';
  if (clientProfile && clientProfile.status !== 'active' && !isMultiTenantReady) {
    const isFailed = clientProfile.status === 'suspended' || clientProfile.status === 'failed';
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="max-w-2xl mx-auto py-12 px-4"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-text-primary tracking-tight font-sans">
            Setting Up Your WhatsApp AI Agent
          </h1>
          <p className="text-xs font-semibold text-text-muted mt-2">
            Hi {clientProfile.ownerName || 'Grower'}, we are configuring your workspace. This setup takes about 10-15 minutes.
          </p>
        </div>

        {/* Error Alert / Retry banner */}
        {isFailed && (
          <div className="mb-6 bg-danger-bg border border-red-200 rounded-xl p-4 text-xs font-semibold text-danger space-y-3 animate-fadeIn">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-danger shrink-0 mt-0.5" size={18} />
              <div className="space-y-1">
                <h4 className="font-extrabold text-red-900">Installation Interrupted / Failed</h4>
                <p className="text-[11px] text-danger">
                  {retryError || 'The setup process was interrupted or timed out. Click below to retry the automated VPS allocation and agent installation.'}
                </p>
              </div>
            </div>
            <Button
              variant="danger"
              size="md"
              onClick={handleRetry}
              disabled={retrying}
              loading={retrying}
              className="w-full"
            >
              Retry Installation
            </Button>
          </div>
        )}

        {/* Status Card */}
        <Card padding="lg" className="space-y-8">
          {/* Steps */}
          <div className="space-y-6 relative before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-[2px] before:bg-border dark:before:bg-border">
            
            {/* Step 1: Payment Confirmed */}
            <div className="flex items-start gap-4 relative z-10">
              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-brand-light text-brand-dark border border-brand/20 shrink-0 shadow-xs">
                <Check size={18} />
              </div>
              <div className="space-y-1 mt-0.5">
                <h4 className="text-sm font-bold text-text-primary">Payment Confirmed</h4>
                <p className="text-xs text-text-muted">SaaS transaction captured and client account created successfully.</p>
              </div>
            </div>

            {/* Step 2: Server Created */}
            <div className="flex items-start gap-4 relative z-10">
              {isServerCreated ? (
                <div className="flex items-center justify-center w-9 h-9 rounded-full bg-brand-light text-brand-dark border border-brand/20 shrink-0 shadow-xs">
                  <Check size={18} />
                </div>
              ) : (
                <div className="flex items-center justify-center w-9 h-9 rounded-full bg-brand-light text-brand border border-brand/20 shrink-0 shadow-xs">
                  <Loader2 size={18} className="animate-spin" />
                </div>
              )}
              <div className="space-y-1 mt-0.5">
                {(() => {
                  const displayIP = clientProfile.hermesProfile && clientProfile.sharedServerIp
                    ? clientProfile.sharedServerIp
                    : clientProfile.serverIP;
                  return (
                    <>
                      <h4 className="text-sm font-bold text-text-primary flex flex-wrap items-center gap-2">
                        <span>Server Allocated {displayIP && `(IP: ${displayIP})`}</span>
                        {clientProfile.hermesProfile ? (
                          <Badge variant="info" size="sm">
                            Multi-tenant · Profile: {clientProfile.hermesProfile}
                          </Badge>
                        ) : (
                          <Badge variant="default" size="sm">
                            Dedicated VPS
                          </Badge>
                        )}
                      </h4>
                      <p className="text-xs text-text-muted">
                        {isServerCreated
                          ? (clientProfile.hermesProfile
                              ? `Shared multi-tenant server successfully allocated at ${displayIP}.`
                              : `Dedicated VPS server successfully allocated at ${displayIP}.`)
                          : 'Contacting AWS to allocate and boot a private VPS in ap-south-1 (Mumbai)...'}
                      </p>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Step 3: Agent Installing */}
            <div className="flex items-start gap-4 relative z-10">
              {isAgentInstalled ? (
                <div className="flex items-center justify-center w-9 h-9 rounded-full bg-brand-light text-brand-dark border border-brand/20 shrink-0 shadow-xs">
                  <Check size={18} />
                </div>
              ) : isInstalling ? (
                <div className="flex items-center justify-center w-9 h-9 rounded-full bg-brand-light text-brand border border-brand/20 shrink-0 shadow-xs">
                  <Loader2 size={18} className="animate-spin" />
                </div>
              ) : (
                <div className="flex items-center justify-center w-9 h-9 rounded-full bg-surface-0 text-text-subtle border border-border shrink-0 shadow-xs">
                  <Server size={18} />
                </div>
              )}
              <div className="space-y-1 mt-0.5">
                <h4 className="text-sm font-bold text-text-primary">Agent Installing</h4>
                <p className="text-xs text-text-muted">
                  {isAgentInstalled
                    ? 'AI agent core engine files installed successfully.'
                    : clientProfile.status === 'installing'
                    ? 'Installing core dependencies, agent services, and database schemas via secure SSH...'
                    : 'Waiting for server IP allocation before installing agent components.'}
                </p>
              </div>
            </div>

            {/* Step 4: WhatsApp Connection Ready */}
            <div className="flex items-start gap-4 relative z-10">
              {isLive ? (
                <div className="flex items-center justify-center w-9 h-9 rounded-full bg-brand-light text-brand-dark border border-brand/20 shrink-0 shadow-xs">
                  <Check size={18} />
                </div>
              ) : (
                <div className="flex items-center justify-center w-9 h-9 rounded-full bg-surface-0 text-text-subtle border border-border shrink-0 shadow-xs">
                  <QrCode size={18} />
                </div>
              )}
              <div className="space-y-1 mt-0.5">
                <h4 className="text-sm font-bold text-text-primary">WhatsApp Connection Ready</h4>
                <p className="text-xs text-text-muted">
                  {isLive
                    ? 'WhatsApp pairing bridge online. Ready for phone linkage.'
                    : 'Once installation finishes, you will be prompted to link your WhatsApp number.'}
                </p>
              </div>
            </div>

          </div>

          {/* Pairing Alert Prompt */}
          {clientProfile.status === 'installing' && (
            <div className="bg-brand-light/50 border border-brand/20 rounded-xl p-5 space-y-3 animate-fadeIn mt-6">
              <div className="flex items-start gap-3">
                <QrCode className="text-brand shrink-0 mt-0.5" size={20} />
                <div className="space-y-1">
                  <h4 className="font-extrabold text-brand-dark">Server is ready!</h4>
                  <p className="text-xs text-brand-dark/95">
                    Your agent profile has been created. Please link your WhatsApp phone to the agent to activate it.
                  </p>
                </div>
              </div>
              <Link
                href="/dashboard/status"
                className="w-full bg-brand hover:bg-brand-dark text-white font-extrabold text-xs py-2.5 px-4 rounded-lg shadow-sm transition-all duration-150 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Link WhatsApp via QR Code</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          )}

          {/* Logs Terminal */}
          <div className="bg-gray-950 text-emerald-450 font-mono text-[11px] rounded-xl p-5 border border-gray-900 shadow-inner space-y-2 mt-6">
            <div className="text-gray-450 border-b border-gray-900 pb-2 mb-2 flex justify-between items-center">
              <span>Live Setup Console Log</span>
              <span className="h-2 w-2 rounded-full bg-brand animate-pulse"></span>
            </div>
            {lastLogs.length === 0 ? (
              <p className="text-gray-650">System checking setup status...</p>
            ) : (
              lastLogs.map((log, index) => (
                <p key={index} className="truncate leading-relaxed">
                  {log}
                </p>
              ))
            )}
          </div>

        </Card>

        {/* Support Note */}
        <p className="text-center text-[10px] text-text-subtle mt-6 font-semibold">
          This dashboard page checks status and logs automatically. Please keep this page open.
        </p>
      </motion.div>
    );
  }

  // RENDER REGULAR ACTIVE DASHBOARD
  const isAgentOnline = stats?.running;
  const healthBadgeVariant = isAgentOnline ? 'success' : 'danger';
  const healthBadgeText = isAgentOnline ? 'Agent Live' : 'Agent Offline';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="p-6 space-y-6 w-full max-w-none"
    >
      {/* Red Usage Alert Banner */}
      {activeAlert && (
        <div className="bg-danger-bg border border-red-200 text-danger rounded-xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs">
          <div className="space-y-1">
            <h3 className="font-extrabold text-sm text-red-950 flex items-center gap-2">
              <AlertTriangle className="text-danger shrink-0" size={18} />
              Warning: High Usage / Bot Loop Detected!
            </h3>
            <p className="text-xs opacity-90">
              {activeAlert.message} Please check your agent status!
            </p>
            {alertActionMsg && (
              <p className="text-xs text-brand-dark font-extrabold mt-1">✓ {alertActionMsg}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              href="/dashboard/status"
              className="bg-white border border-border hover:bg-surface-0 text-text-secondary font-extrabold text-[11px] px-3.5 py-2 rounded-lg transition-colors cursor-pointer"
            >
              View Logs
            </Link>
            <Button
              variant="danger"
              size="sm"
              onClick={handleRestartAgent}
              disabled={restartingAgent}
            >
              {restartingAgent ? 'Restarting...' : 'Restart Agent'}
            </Button>
            <button
              onClick={handleDismissAlert}
              className="bg-white border border-border hover:bg-danger-bg hover:text-danger text-text-secondary font-extrabold text-[11px] px-3.5 py-2 rounded-lg transition-colors cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Dynamic Welcome Banner if just made Live and Agent is not connected */}
      {clientProfile?.status === 'active' && !stats?.running && (
        <div className="bg-brand-light/35 border border-brand/20 text-brand-dark rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
          <div className="space-y-1">
            <h3 className="font-extrabold text-sm text-brand-dark">
              🎉 Your agent is live!
            </h3>
            <p className="text-xs opacity-90">
              One last step - scan the QR code with your bot phone to connect WhatsApp.
            </p>
          </div>
          <Link
            href="/dashboard/status"
            className="bg-brand hover:bg-brand-dark text-white font-extrabold text-xs px-5 py-2.5 rounded-lg shadow-xs transition-colors duration-150 cursor-pointer text-center whitespace-nowrap shrink-0"
          >
            Connect WhatsApp →
          </Link>
        </div>
      )}

      {/* Row 1: Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 select-none">
        <div>
          <h1 className="text-xl font-black text-text-primary tracking-tight font-sans">
            Good morning, {clientProfile?.ownerName || 'Grower'} 👋
          </h1>
          <p className="text-xs font-semibold text-text-muted mt-1">
            {range === 'today' && "Here's what's happening today"}
            {range === 'week' && "Here's what's happening this week"}
            {range === 'month' && "Here's what's happening this month"}
            {range === 'total' && "Here's what's happening overall"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-surface-0 dark:bg-surface-2 p-1 rounded-xl border border-border/80 dark:border-border select-none shrink-0 shadow-2xs">
            {(['today', 'week', 'month', 'total'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 text-[10px] font-bold rounded-lg uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                  range === r
                    ? 'bg-brand text-white shadow-xs'
                    : 'text-text-secondary hover:text-text-primary dark:text-text-muted dark:hover:text-foreground'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <Link href="/dashboard/status" className="cursor-pointer">
            <Badge variant={healthBadgeVariant} size="md">
              <span className={`w-1.5 h-1.5 rounded-full mr-1.5 inline-block ${
                isAgentOnline ? 'bg-success animate-pulse' : 'bg-danger'
              }`} />
              {healthBadgeText}
            </Badge>
          </Link>
        </div>
      </div>

      {/* Row 2: Stat Cards Grid (4 stats) */}
      {(() => {
        const hasOwnKey = !!clientProfile?.geminiApiKey && clientProfile.geminiApiKey.trim().length > 0;
        const aiCost = hasOwnKey ? 0 : (stats?.assistantMessageCount ?? (stats?.messageCount ? stats.messageCount / 2 : 0)) * 0.012;
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Stat
              label="Total Leads"
              value={stats?.leadsCount || 0}
              icon={<Users size={20} />}
              description="Synchronized leads"
            />
            <Stat
              label={range === 'today' ? "Messages Today" : range === 'week' ? "Messages This Week" : range === 'month' ? "Messages This Month" : "Total Messages"}
              value={stats?.messageCount || 0}
              icon={<MessageSquare size={20} />}
              description="Inbound + Outbound interactions"
            />
            <Stat
              label="Active Conversations"
              value={recentLeads.filter(l => l.intent === 'hot' || l.intent === 'warm').length}
              icon={<Activity size={20} />}
              description="Hot/Warm leads active"
            />
            <Stat
              label={range === 'today' ? "AI Cost Today" : range === 'week' ? "AI Cost This Week" : range === 'month' ? "AI Cost This Month" : "Total AI Cost"}
              value={`₹${aiCost.toFixed(2)}`}
              icon={<Zap size={20} />}
              description={hasOwnKey ? "Own Gemini Key active" : "Estimated API operations fee"}
            />
          </div>
        );
      })()}

      {/* Row 3: Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (60%): Recent Conversations styled like chat logs */}
        <div className="lg:col-span-2 flex flex-col">
          <Card padding="none" className="flex-grow flex flex-col justify-between overflow-hidden">
            <div>
              <div className="px-5 py-4 border-b border-border dark:border-border flex items-center justify-between">
                <h3 className="text-[13px] font-black text-text-primary dark:text-foreground uppercase tracking-wider font-sans">
                  Recent Conversations
                </h3>
                <Link
                  href="/dashboard/leads"
                  className="text-xs font-bold text-brand hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>View CRM</span>
                  <ArrowRight size={14} />
                </Link>
              </div>

              {recentLeads.length === 0 ? (
                <div className="p-12 text-center text-xs text-text-subtle italic">
                  No active conversations detected yet. Sync your server leads in the CRM!
                </div>
              ) : (
                <div className="divide-y divide-border dark:divide-border">
                  {recentLeads.map((lead) => {
                    const leadName = lead.name && lead.name !== lead.phone ? lead.name : (lead.shared_name || lead.phone);
                    const dateText = getRelativeTime(lead.last_message_at);

                    return (
                      <Link
                        key={lead.phone}
                        href={`/dashboard/leads?id=${lead.phone}`}
                        className="p-4 flex items-center justify-between hover:bg-surface-0 dark:hover:bg-surface-2 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0 pr-4">
                          <Avatar name={lead.name} phone={lead.phone} intent={lead.intent} size="md" />
                          <div className="space-y-1 min-w-0">
                            <h4 className="text-sm font-bold text-text-primary dark:text-foreground truncate">
                              {leadName}
                            </h4>
                            <p className="text-xs text-text-muted dark:text-text-subtle truncate leading-relaxed">
                              {lead.summary || 'General sales enquiry'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3 shrink-0 select-none">
                          <span className="text-[11px] text-text-subtle">{dateText}</span>
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${
                              lead.intent === 'hot'
                                ? 'bg-danger-bg text-danger border-danger/20'
                                : lead.intent === 'warm'
                                ? 'bg-warning-bg text-warning border-warning/20'
                                : 'bg-success-bg text-success border-success/20'
                            }`}
                          >
                            {lead.intent}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
            {recentLeads.length > 0 && (
              <div className="p-4 border-t border-border dark:border-border text-center bg-surface-0 dark:bg-surface-1/40">
                <Link
                  href="/dashboard/leads"
                  className="text-xs font-bold text-text-secondary hover:text-text-primary hover:underline cursor-pointer"
                >
                  View all in Inbox &rarr;
                </Link>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column (40%): Agent Health & Quick Actions */}
        <div className="space-y-6 flex flex-col">
          {/* Agent Health */}
          <Card padding="md" className="space-y-4">
            <h3 className="text-[13px] font-black text-text-primary dark:text-foreground uppercase tracking-wider font-sans border-b border-border dark:border-border pb-2.5">
              Agent Health
            </h3>
            
            <div className="space-y-3.5 text-xs text-text-secondary dark:text-text-muted">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-text-muted">Status:</span>
                <span className="flex items-center gap-1.5 font-bold text-text-primary">
                  <span className={`w-2 h-2 rounded-full ${isAgentOnline ? 'bg-success animate-pulse' : 'bg-danger'}`} />
                  {isAgentOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-text-muted">Connection Type:</span>
                <Badge variant={clientProfile?.connectionType === 'cloud_api' ? 'info' : 'brand'} size="sm">
                  {clientProfile?.connectionType === 'cloud_api' ? 'Cloud API' : 'Quick Connect'}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-text-muted">Uptime Check:</span>
                <span className="font-bold text-text-primary">{stats?.uptime || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-text-muted">
                  {range === 'today' ? "Cost Today (Est):" : range === 'week' ? "Cost Week (Est):" : range === 'month' ? "Cost Month (Est):" : "Cost Total (Est):"}
                </span>
                <span className="font-mono font-extrabold text-success">
                  {(() => {
                    const hasOwnKey = !!clientProfile?.geminiApiKey && clientProfile.geminiApiKey.trim().length > 0;
                    const aiCost = hasOwnKey ? 0 : (stats?.assistantMessageCount ?? (stats?.messageCount ? stats.messageCount / 2 : 0)) * 0.012;
                    return `₹${aiCost.toFixed(2)}`;
                  })()}
                </span>
              </div>
            </div>
          </Card>

          {/* Quick Actions */}
          <Card padding="md" className="space-y-4">
            <h3 className="text-[13px] font-black text-text-primary dark:text-foreground uppercase tracking-wider font-sans border-b border-border dark:border-border pb-2.5">
              Quick Actions
            </h3>
            
            <div className="grid grid-cols-3 gap-3 pt-1 text-center font-sans font-bold text-[10px] uppercase tracking-wide">
              <Link
                href="/dashboard/broadcast"
                className="p-3 bg-surface-0 hover:bg-brand-light hover:text-brand dark:bg-surface-2 dark:hover:bg-brand/10 border border-border dark:border-border rounded-xl flex flex-col items-center justify-center gap-2 group cursor-pointer transition-all duration-150"
              >
                <Megaphone size={20} className="text-text-muted group-hover:text-brand transition-colors" />
                <span className="text-text-secondary group-hover:text-brand transition-colors">Broadcast</span>
              </Link>
              
              <Link
                href="/dashboard/status"
                className="p-3 bg-surface-0 hover:bg-brand-light hover:text-brand dark:bg-surface-2 dark:hover:bg-brand/10 border border-border dark:border-border rounded-xl flex flex-col items-center justify-center gap-2 group cursor-pointer transition-all duration-150"
              >
                <Activity size={20} className="text-text-muted group-hover:text-brand transition-colors" />
                <span className="text-text-secondary group-hover:text-brand transition-colors">AI Status</span>
              </Link>

              <Link
                href="/dashboard/instructions"
                className="p-3 bg-surface-0 hover:bg-brand-light hover:text-brand dark:bg-surface-2 dark:hover:bg-brand/10 border border-border dark:border-border rounded-xl flex flex-col items-center justify-center gap-2 group cursor-pointer transition-all duration-150"
              >
                <Settings className="text-text-muted group-hover:text-brand transition-colors" size={20} />
                <span className="text-text-secondary group-hover:text-brand transition-colors">Prompts</span>
              </Link>
            </div>
          </Card>
        </div>
      </div>

      {/* Row 4: Onboarding Stepper */}
      {clientProfile?.status !== 'active' && (
        <Card padding="md" className="space-y-4 select-none">
          <h3 className="text-xs font-black text-text-primary dark:text-foreground uppercase tracking-wider font-sans">
            Onboarding Progress
          </h3>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2 text-xs font-bold text-text-secondary">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-brand text-white flex items-center justify-center text-[10px]">1</span>
              <span>Payment Capture ✓</span>
            </div>
            <div className="h-[1px] w-8 bg-border hidden sm:block" />
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-brand text-white flex items-center justify-center text-[10px]">2</span>
              <span>VPS Deploy ✓</span>
            </div>
            <div className="h-[1px] w-8 bg-border hidden sm:block" />
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-brand-light text-brand flex items-center justify-center border border-brand/20 text-[10px] animate-pulse">3</span>
              <span>Pair WhatsApp</span>
            </div>
            <div className="h-[1px] w-8 bg-border hidden sm:block" />
            <div className="flex items-center gap-2 text-text-subtle">
              <span className="w-5 h-5 rounded-full bg-surface-0 text-text-subtle flex items-center justify-center border border-border text-[10px]">4</span>
              <span>Go Live</span>
            </div>
          </div>
        </Card>
      )}
    </motion.div>
  );
}
