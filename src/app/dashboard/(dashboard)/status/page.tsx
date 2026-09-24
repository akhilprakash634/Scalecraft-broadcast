'use client';

import React, { useEffect, useState, useRef } from 'react';
import { FormPageSkeleton } from '@/components/ui/PageLoader';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import {
  Activity,
  RefreshCw,
  Play,
  StopCircle,
  Terminal,
  QrCode,
  CheckCircle,
  AlertTriangle,
  Info,
  Clock,
  X,
  Key,
  ShieldAlert,
  ImageIcon,
  Copy,
  ExternalLink,
} from 'lucide-react';

interface AgentStatusData {
  running: boolean;
  uptime: string;
  lastMessage: string;
  messageCount: number;
  paired: boolean;
  sessionConfigUpdateRequired?: boolean;
  cachedStatus?: string;
  statusCheckedAt?: string;
}

export default function AgentStatusPage() {
  const [status, setStatus] = useState<AgentStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');
  const [hermesProfile, setHermesProfile] = useState<string | null>(null);
  
  // Restart actions
  const [restarting, setRestarting] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Image patch repair
  const [repairingImage, setRepairingImage] = useState(false);
  const [imageRepairMsg, setImageRepairMsg] = useState('');

  // Session configuration fix state
  const [fixingSessionConfig, setFixingSessionConfig] = useState(false);

  const handleFixSessionConfig = async () => {
    if (fixingSessionConfig) return;
    setFixingSessionConfig(true);
    setError('');
    try {
      const res = await fetch('/api/dashboard/fix-session-config', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update memory configuration.');
      }
      alert('Memory configuration updated and agent gateway restarted successfully!');
      fetchStatus(true);
    } catch (err: any) {
      setError(err.message || 'Error updating memory configuration.');
    } finally {
      setFixingSessionConfig(false);
    }
  };
  
  // Logs action
  const [logs, setLogs] = useState('');
  const [logsLoading, setLogsLoading] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);

  // Force reload actions
  const [forceReloading, setForceReloading] = useState(false);
  const [reloadConfirmSnippet, setReloadConfirmSnippet] = useState('');
  const [showReloadConfirm, setShowReloadConfirm] = useState(false);
  const [soulFileConfigured, setSoulFileConfigured] = useState<boolean>(true);
  const [fixingSoulPath, setFixingSoulPath] = useState(false);
  const [connectionType, setConnectionType] = useState<'baileys' | 'cloud_api'>('baileys');

  // Cloud API actions
  const [showCloudModal, setShowCloudModal] = useState(false);
  const [cloudPhoneId, setCloudPhoneId] = useState('');
  const [cloudAccessToken, setCloudAccessToken] = useState('');
  const [cloudWabaId, setCloudWabaId] = useState('');
  const [cloudAppSecret, setCloudAppSecret] = useState('');
  const [submittingCloud, setSubmittingCloud] = useState(false);
  const [cloudError, setCloudError] = useState('');
  const [cloudSuccess, setCloudSuccess] = useState('');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [client, setClient] = useState<any>(null);
  const [showWebhookDetails, setShowWebhookDetails] = useState(false);
  const [copiedUrlStatus, setCopiedUrlStatus] = useState(false);
  const [copiedTokenStatus, setCopiedTokenStatus] = useState(false);
 
  const webhookUrl = 'https://thescalecraft.in/api/webhooks/whatsapp-cloud';
  const verifyToken = client?.whatsappVerifyToken || (client?.hermesProfile ? `${client.hermesProfile}-webhook-token` : '');
  const fullVerifyToken = client?.hermesProfile ? `${client.hermesProfile}-webhook-token` : '';
 
  // Use a 5-minute staleness window to match the server-side route,
  // giving the heartbeat cron (runs every 1-2 min) enough headroom.
  const isGatewayOnline = !!(
    status &&
    (status.statusCheckedAt
      ? status.cachedStatus === 'online' && Math.floor((Date.now() - new Date(status.statusCheckedAt).getTime()) / 60000) < 5
      : status.running)
  );
  const isConnected = !!(status?.paired || isGatewayOnline);

  const isNewClient = !isGatewayOnline && !status?.paired;
  const isCloudApiPending =
    client?.intendedConnectionType === 'cloud_api' ||
    client?.connectionType === 'cloud_api' ||
    !!client?.whatsappPhoneNumberId ||
    !!client?.whatsappAccessToken;

  const profileDisplay = client?.businessName 
    ? `Profile: ${client.businessName}`
    : hermesProfile 
      ? `Profile: ${hermesProfile.slice(0, 8)}...`
      : 'Dedicated VPS';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };
  
  // QR/Pairing action
  const [pairingQr, setPairingQr] = useState('');
  const [pairingLoading, setPairingLoading] = useState(false);
  const [showPairingModal, setShowPairingModal] = useState(false);
  const [startingGateway, setStartingGateway] = useState(false);
  const [scanCountdown, setScanCountdown] = useState(0);
  const [pairingSuccess, setPairingSuccess] = useState(false);

  // Gemini API Key actions
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [maskedApiKey, setMaskedApiKey] = useState('');
  const [updatingKey, setUpdatingKey] = useState(false);
  const [keySuccess, setKeySuccess] = useState('');
  const [keyError, setKeyError] = useState('');

  // Timezone actions
  const [timezone, setTimezone] = useState('UTC');
  const [updatingTimezone, setUpdatingTimezone] = useState(false);
  const [timezoneSuccess, setTimezoneSuccess] = useState('');
  const [timezoneError, setTimezoneError] = useState('');

  // Auto Follow-up actions
  const [autoFollowUpEnabled, setAutoFollowUpEnabled] = useState(true);
  const [togglingFollowUp, setTogglingFollowUp] = useState(false);

  const handleToggleFollowUp = async () => {
    setTogglingFollowUp(true);
    try {
      const res = await fetch('/api/dashboard/client', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoFollowUpEnabled: !autoFollowUpEnabled }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to toggle auto follow-up');
      setAutoFollowUpEnabled(!autoFollowUpEnabled);
    } catch (err: any) {
      alert(err.message || 'Error toggling auto follow-up.');
    } finally {
      setTogglingFollowUp(false);
    }
  };

  const fetchClientProfile = async () => {
    try {
      const res = await fetch('/api/dashboard/client');
      if (res.ok) {
        const data = await res.json();
        setClient(data);
        setMaskedApiKey(data.geminiApiKey || '');
        setTimezone(data.timezone || 'UTC');
        setAntiBotActive(data.antiBotActive !== false);
        setAutoFollowUpEnabled(data.autoFollowUpEnabled !== false);
        setHermesProfile(data.hermesProfile || null);
        setConnectionType(data.connectionType || 'baileys');
      }
    } catch (err) {
      console.error('Failed to load client profile:', err);
    }
  };

  const handleUpdateTimezone = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingTimezone(true);
    setTimezoneSuccess('');
    setTimezoneError('');
    try {
      const res = await fetch('/api/dashboard/client', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timezone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update Timezone');
      setTimezoneSuccess('Server timezone updated and service restarted successfully!');
    } catch (err: any) {
      setTimezoneError(err.message || 'Error updating timezone.');
    } finally {
      setUpdatingTimezone(false);
    }
  };

  const handleUpdateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!geminiApiKey.trim()) return;
    setUpdatingKey(true);
    setKeySuccess('');
    setKeyError('');
    try {
      const res = await fetch('/api/dashboard/client', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ geminiApiKey: geminiApiKey.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update API Key');
      setKeySuccess('Gemini API Key updated and service restarted successfully!');
      setMaskedApiKey(`${geminiApiKey.trim().slice(0, 7)}...${geminiApiKey.trim().slice(-4)}`);
      setGeminiApiKey('');
    } catch (err: any) {
      setKeyError(err.message || 'Error updating API Key.');
    } finally {
      setUpdatingKey(false);
    }
  };
  
  // Anti-Bot Protection states
  const [antiBotActive, setAntiBotActive] = useState(true);
  const [todayUsage, setTodayUsage] = useState(0);
  const [estimatedDailyCost, setEstimatedDailyCost] = useState(0);
  const [dailyLimit, setDailyLimit] = useState(100);
  const [togglingProtection, setTogglingProtection] = useState(false);
  const [emergencyPausing, setEmergencyPausing] = useState(false);
  const [emergencyMsg, setEmergencyMsg] = useState('');

  // Blocklist states
  const [blockedNumbers, setBlockedNumbers] = useState<string[]>([]);
  const [newBlockNumber, setNewBlockNumber] = useState('');
  const [blockingNumber, setBlockingNumber] = useState(false);
  const [showBlocklist, setShowBlocklist] = useState(false);

  const fetchBlocklist = async () => {
    try {
      const res = await fetch('/api/dashboard/agent/blocklist');
      if (res.ok) {
        const data = await res.json();
        setBlockedNumbers(data.blockedNumbers || []);
      }
    } catch (err) {
      console.error('Failed to fetch blocklist:', err);
    }
  };

  const handleAddBlockNumber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlockNumber.trim()) return;
    setBlockingNumber(true);
    try {
      const res = await fetch('/api/dashboard/agent/blocklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', phone: newBlockNumber.trim() })
      });
      if (res.ok) {
        const data = await res.json();
        setBlockedNumbers(data.blockedNumbers || []);
        setNewBlockNumber('');
      }
    } catch (err) {
      console.error('Failed to add blocked number:', err);
    } finally {
      setBlockingNumber(false);
    }
  };

  const handleRemoveBlockNumber = async (phone: string) => {
    try {
      const res = await fetch('/api/dashboard/agent/blocklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove', phone })
      });
      if (res.ok) {
        const data = await res.json();
        setBlockedNumbers(data.blockedNumbers || []);
      }
    } catch (err) {
      console.error('Failed to remove blocked number:', err);
    }
  };

  const handleToggleProtection = async () => {
    setTogglingProtection(true);
    try {
      const res = await fetch('/api/dashboard/agent/toggle-protection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !antiBotActive })
      });
      if (res.ok) {
        const data = await res.json();
        setAntiBotActive(data.antiBotActive);
      }
    } catch (err) {
      console.error('Failed to toggle protection:', err);
    } finally {
      setTogglingProtection(false);
    }
  };

  const handleEmergencyPause = async () => {
    if (!confirm('Are you sure you want to trigger EMERGENCY PAUSE? This will instantly stop the agent execution gateway.')) return;
    setEmergencyPausing(true);
    setEmergencyMsg('');
    try {
      const res = await fetch('/api/dashboard/agent/pause', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setEmergencyMsg('Agent successfully paused.');
        fetchStatus(true); // reload status
      } else {
        throw new Error(data.error || 'Failed to pause');
      }
    } catch (err: any) {
      setEmergencyMsg(`Error pausing: ${err.message}`);
    } finally {
      setEmergencyPausing(false);
    }
  };

  const fetchUsageDetails = async () => {
    try {
      const res = await fetch('/api/dashboard/usage');
      if (res.ok) {
        const data = await res.json();
        setTodayUsage(data.todayUsage || 0);
        setEstimatedDailyCost(data.estimatedDailyCost || 0);
        setDailyLimit(data.dailyLimit || 100);
      }
    } catch (err) {
      console.error('Failed to fetch usage details:', err);
    }
  };

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Counts 15 s ticks; every 4th tick (~60 s) we call force=true so status_checked_at
  // stays fresh without running an SSH check on every single poll.
  const pollCountRef = useRef(0);

  const fetchStatus = async (showSkeleton = false, forceRefresh = false) => {
    if (showSkeleton) setLoading(true);
    setError('');
    try {
      const url = forceRefresh ? '/api/dashboard/agent/status?force=true' : '/api/dashboard/agent/status';
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error('Failed to retrieve agent status from server.');
      }
      const data = await res.json();
      setStatus(data);
      if (data && typeof data.antiBotActive === 'boolean') {
        setAntiBotActive(data.antiBotActive);
      }
      if (data && typeof data.soul_file_configured === 'boolean') {
        setSoulFileConfigured(data.soul_file_configured);
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with VPS server.');
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  // Poll status every 15 s; every 4th tick (~60 s) run a force SSH check so
  // status_checked_at is kept fresh and the staleness gate doesn't trip.
  useEffect(() => {
    fetchStatus(true);
    fetchClientProfile();
    fetchBlocklist();
    fetchUsageDetails();

    timerRef.current = setInterval(() => {
      pollCountRef.current += 1;
      const doForce = pollCountRef.current % 4 === 0; // SSH once per ~60 s
      fetchStatus(false, doForce);
      fetchUsageDetails();
    }, 15000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const handleRestart = async () => {
    if (restarting) return;
    setRestarting(true);
    setError('');
    
    try {
      const res = await fetch('/api/dashboard/agent/restart', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to restart agent.');
      }
      
      // Start 10-second countdown
      setCountdown(10);
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
            setRestarting(false);
            fetchStatus(true); // reload status
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Error restarting gateway.');
      setRestarting(false);
    }
  };

  const handleRepairImagePatch = async () => {
    if (repairingImage) return;
    setRepairingImage(true);
    setImageRepairMsg('');
    setError('');
    try {
      const res = await fetch('/api/dashboard/agent/repair-image-patch', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to apply image patch.');
      setImageRepairMsg('Image rendering patched and agent restarted!');
      setTimeout(() => setImageRepairMsg(''), 7000);
    } catch (err: any) {
      setError(err.message || 'Error applying image patch.');
    } finally {
      setRepairingImage(false);
    }
  };

  const handleForceReload = async () => {
    if (forceReloading) return;
    setForceReloading(true);
    setReloadConfirmSnippet('');
    setShowReloadConfirm(false);
    setError('');
    
    try {
      const res = await fetch('/api/dashboard/agent/force-reload', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to force reload agent.');
      }
      
      // Grab first 3 lines of soulSnippet for display
      const lines = (data.soulSnippet || '').split('\n').slice(0, 3).join('\n');
      setReloadConfirmSnippet(lines || 'Empty SOUL.md loaded');
      setShowReloadConfirm(true);
      fetchStatus(true);
    } catch (err: any) {
      setError(err.message || 'Error force reloading gateway.');
    } finally {
      setForceReloading(false);
    }
  };

  const handleFixSoulPath = async () => {
    if (fixingSoulPath) return;
    setFixingSoulPath(true);
    setError('');
    try {
      const res = await fetch('/api/dashboard/agent/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'fix_soul_path' })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fix SOUL.md configuration path.');
      }
      await fetchStatus(false);
    } catch (err: any) {
      setError(err.message || 'Error configuring SOUL.md path.');
    } finally {
      setFixingSoulPath(false);
    }
  };

  const handleViewLogs = async () => {
    setShowLogsModal(true);
    setLogsLoading(true);
    setLogs('');
    try {
      const res = await fetch('/api/dashboard/agent/logs');
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load logs.');
      }
      setLogs(data.logs);
    } catch (err: any) {
      setLogs(`Error: ${err.message}`);
    } finally {
      setLogsLoading(false);
    }
  };

  const stopPollingPairing = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  // Called when pairing succeeds automatically
  const handleStartGateway = async () => {
    setStartingGateway(true);
    stopPollingPairing();
    try {
      await fetch('/api/dashboard/agent/restart', { method: 'POST' });
    } catch (err) {
      console.error('Error starting gateway:', err);
    }
    setShowPairingModal(false);
    setStartingGateway(false);
    // Refresh status after 5s for the gateway to come up
    setTimeout(() => fetchStatus(true), 5000);
  };

  const startPollingPairing = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch('/api/dashboard/agent/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'poll' }),
        });
        if (res.ok) {
          const data = await res.json();
          const qrText = data.qrCodeOutput || '';
          if (qrText && qrText !== 'Initializing pairing process...') {
            setPairingQr(qrText);

            // Check if connection succeeded
            const lowerQr = qrText.toLowerCase();
            if (
              lowerQr.includes('connected!') ||
              lowerQr.includes('whatsapp connected') ||
              lowerQr.includes('bridge ready') ||
              lowerQr.includes('session active')
            ) {
              setPairingSuccess(true);
              stopPollingPairing();
              // Trigger the gateway startup automatically!
              await handleStartGateway();
            }
          }
        }
      } catch (err) {
        console.error('Error polling pairing status:', err);
      }
    }, 3000);
  };

  const handlePairWhatsApp = async () => {
    setShowPairingModal(true);
    setPairingLoading(true);
    setPairingQr('Initializing pairing session on VPS...');
    setPairingSuccess(false);

    startPollingPairing();
    
    try {
      const pairRes = await fetch('/api/dashboard/agent/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pair' }),
      });
      const data = await pairRes.json();
      if (!pairRes.ok) {
        throw new Error(data.error || 'Failed to fetch WhatsApp pairing codes.');
      }
      if (data.qrCodeOutput) {
        setPairingQr(data.qrCodeOutput);
      }
    } catch (err: any) {
      setPairingQr((prev) => {
        if (prev.includes('█') || prev.includes('connected')) return prev;
        return `Error: ${err.message}\nEnsure your hermes gateway is running before pairing.`;
      });
    } finally {
      setPairingLoading(false);
    }
  };

  const handleCloseCloudModal = () => {
    setShowCloudModal(false);
    setCloudSuccess('');
    setCloudPhoneId('');
    setCloudAccessToken('');
    setCloudWabaId('');
    setCloudAppSecret('');
  };

  const handleConfigureCloudApi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cloudPhoneId.trim() || !cloudAccessToken.trim() || !cloudWabaId.trim() || !cloudAppSecret.trim()) {
      setCloudError('All fields are required.');
      return;
    }
    setSubmittingCloud(true);
    setCloudError('');
    setCloudSuccess('');
    try {
      const res = await fetch('/api/dashboard/agent/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'configure_cloud_api',
          whatsappPhoneNumberId: cloudPhoneId.trim(),
          whatsappAccessToken: cloudAccessToken.trim(),
          whatsappWabaId: cloudWabaId.trim(),
          whatsappAppSecret: cloudAppSecret.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to configure WhatsApp Cloud API.');
      }
      await fetchClientProfile();
      await fetchStatus(true);
      setCloudSuccess('success');
    } catch (err: any) {
      setCloudError(err.message || 'An error occurred.');
    } finally {
      setSubmittingCloud(false);
    }
  };

  // Called when user clicks "Done Scanning" manually.
  const handleDoneScanning = async () => {
    setStartingGateway(true);
    stopPollingPairing();
    const waitSeconds = 20;
    setScanCountdown(waitSeconds);
    await new Promise<void>((resolve) => {
      let remaining = waitSeconds;
      const iv = setInterval(() => {
        remaining -= 1;
        setScanCountdown(remaining);
        if (remaining <= 0) {
          clearInterval(iv);
          resolve();
        }
      }, 1000);
    });
    try {
      await fetch('/api/dashboard/agent/restart', { method: 'POST' });
    } catch { }
    setShowPairingModal(false);
    setStartingGateway(false);
    setScanCountdown(0);
    setTimeout(() => fetchStatus(true), 10000);
  };

  const getGatewayStatusText = () => {
    if (!status) return 'Unknown';
    if (status.statusCheckedAt) {
      const checkedAt = new Date(status.statusCheckedAt).getTime();
      const diffMins = Math.floor((Date.now() - checkedAt) / 60000);
      if (status.cachedStatus === 'online' && diffMins < 2) {
        return 'Online';
      }
      return `Last seen ${diffMins}m ago`;
    }
    return status.running ? 'Online' : 'Offline';
  };

  const getGatewayDotColor = () => {
    if (!status) return 'bg-text-subtle';
    if (status.statusCheckedAt) {
      const checkedAt = new Date(status.statusCheckedAt).getTime();
      const diffMins = Math.floor((Date.now() - checkedAt) / 60000);
      if (status.cachedStatus === 'online' && diffMins < 2) {
        return 'bg-success';
      }
      return 'bg-warning';
    }
    return status.running ? 'bg-success' : 'bg-danger';
  };

  if (loading) {
    return (
      <div className="p-6">
        <FormPageSkeleton />
      </div>
    );
  }

  const isOnline = isGatewayOnline && status?.paired;

  return (
    <div className="p-6 space-y-6 select-none max-w-none">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border dark:border-border pb-4">
        <div>
          <h1 className="text-xl font-black text-text-primary tracking-tight font-sans">
            AI Agent Settings
          </h1>
          <p className="text-xs font-semibold text-text-muted mt-1">
            Monitor background microservices, pair devices, and view execution metrics.
          </p>
        </div>
        <button
          onClick={() => fetchStatus(true, true)}
          disabled={loading || restarting}
          className="flex items-center gap-1.5 bg-white hover:bg-surface-0 border border-border dark:bg-transparent dark:hover:bg-surface-2 text-text-secondary dark:text-text-primary text-xs font-bold px-4 py-2.5 rounded-lg shadow-xs cursor-pointer transition-colors"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Force Refresh</span>
        </button>
      </div>

      {error && (
        <div className="bg-danger-bg border border-red-200 text-danger text-xs font-semibold p-4 rounded-xl flex items-center gap-2">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {status?.sessionConfigUpdateRequired && (
        <div className="bg-warning-bg border border-amber-200 text-warning text-xs font-semibold p-4 rounded-xl flex items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-warning shrink-0" />
            <span>Memory configuration patch available. Fix session config to prevent cross-lead memory mixing.</span>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={handleFixSessionConfig}
            disabled={fixingSessionConfig}
          >
            {fixingSessionConfig ? 'Fixing...' : 'Apply Fix'}
          </Button>
        </div>
      )}

      {!soulFileConfigured && (
        <div className="bg-warning-bg border border-amber-200 text-warning text-xs font-semibold p-4 rounded-xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-warning shrink-0" />
            <span>SOUL configuration path missing. Link agent prompt to enable automated replies.</span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleFixSoulPath}
            disabled={fixingSoulPath}
          >
            {fixingSoulPath ? 'Linking...' : 'Link Prompt'}
          </Button>
        </div>
      )}

      {/* Grid Layout (2 cols left, 1 col right guide) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left main columns */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Operational Status */}
          <Card padding="md" className="space-y-6">
            <div className="flex justify-between items-center border-b border-border dark:border-border pb-3">
              <h3 className="text-sm font-black text-text-primary dark:text-foreground uppercase tracking-wider font-sans">
                Operational Health
              </h3>
              <Badge variant={initialLoading ? 'default' : (isOnline ? 'success' : 'danger')} size="md">
                {initialLoading ? (
                  <span className="text-[11px] animate-pulse">Checking...</span>
                ) : (
                  <>
                    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 inline-block ${isOnline ? 'bg-success animate-pulse' : 'bg-danger'}`} />
                    {isOnline ? 'Agent Running' : 'Agent Stopped'}
                  </>
                )}
              </Badge>
            </div>

            {/* Sub-indicator stats row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-3 bg-surface-0 border border-border dark:bg-surface-2 rounded-xl text-center">
                <span className="text-[10px] font-black text-text-muted uppercase tracking-wider">Gateway Service</span>
                <div className="flex items-center justify-center gap-1.5 mt-1">
                  <span className={`h-2 w-2 rounded-full ${getGatewayDotColor()}`} />
                  <span className="text-xs font-bold text-text-primary">{getGatewayStatusText()}</span>
                </div>
              </div>
              <div className="p-3 bg-surface-0 border border-border dark:bg-surface-2 rounded-xl text-center">
                <span className="text-[10px] font-black text-text-muted uppercase tracking-wider">WhatsApp Link</span>
                <div className="flex items-center justify-center gap-1.5 mt-1">
                  <span className={`h-2 w-2 rounded-full ${status?.paired ? 'bg-success' : 'bg-danger'}`} />
                  <span className="text-xs font-bold text-text-primary">{status?.paired ? 'Linked' : 'Disconnected'}</span>
                </div>
              </div>
              <div className="p-3 bg-surface-0 border border-border dark:bg-surface-2 rounded-xl text-center">
                <span className="text-[10px] font-black text-text-muted uppercase tracking-wider">Deployment Mode</span>
                <div className="flex items-center justify-center gap-1.5 mt-1.5">
                  <Badge variant={hermesProfile ? 'brand' : 'info'} size="sm">
                    {hermesProfile ? 'Multi-tenant' : 'Dedicated VPS'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Cloud API webhooks if using cloud API */}
            {client?.connectionType === 'cloud_api' && (
              <div className="border-t border-border dark:border-border pt-4">
                <button
                  onClick={() => setShowWebhookDetails(!showWebhookDetails)}
                  className="text-xs font-bold text-brand hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>{showWebhookDetails ? 'Hide' : 'Show'} webhook configurations</span>
                  <Copy size={12} />
                </button>
                
                {showWebhookDetails && (
                  <div className="mt-3 p-4 bg-surface-0 border border-border rounded-xl space-y-3 font-sans text-xs">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Callback URL</span>
                      <div className="flex items-center gap-2">
                        <code className="bg-white dark:bg-surface-2 p-1.5 rounded flex-1 truncate font-mono text-[10.5px]">
                          {webhookUrl}
                        </code>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            copyToClipboard(webhookUrl);
                            setCopiedUrlStatus(true);
                            setTimeout(() => setCopiedUrlStatus(false), 2000);
                          }}
                        >
                          {copiedUrlStatus ? 'Copied!' : 'Copy'}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Verify Token</span>
                      <div className="flex items-center gap-2">
                        <code className="bg-white dark:bg-surface-2 p-1.5 rounded flex-1 truncate font-mono text-[10.5px]">
                          {verifyToken}
                        </code>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            copyToClipboard(fullVerifyToken);
                            setCopiedTokenStatus(true);
                            setTimeout(() => setCopiedTokenStatus(false), 2000);
                          }}
                        >
                          {copiedTokenStatus ? 'Copied!' : 'Copy'}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action buttons list (Redesigned grid layout 2x3) */}
            <div className="pt-4 border-t border-border dark:border-border">
              <span className="block text-[10px] font-black text-text-muted uppercase tracking-wider mb-3">
                Gateway Process Controls
              </span>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleRestart}
                  disabled={restarting || forceReloading}
                  className="w-full"
                  icon={<RefreshCw size={14} className={restarting ? 'animate-spin' : ''} />}
                >
                  {restarting ? `Restarting (${countdown}s)` : 'Restart AI Gateway'}
                </Button>

                <Button
                  variant="secondary"
                  size="md"
                  onClick={handleForceReload}
                  disabled={forceReloading}
                  className="w-full bg-amber-500 hover:bg-amber-600 border-none text-white dark:bg-warning dark:hover:bg-amber-600"
                  icon={<RefreshCw size={14} className={forceReloading ? 'animate-spin' : ''} />}
                >
                  {forceReloading ? 'Reloading...' : 'Force Reload Agent'}
                </Button>

                <Button
                  variant="outline"
                  size="md"
                  onClick={handleViewLogs}
                  className="w-full"
                  icon={<Terminal size={14} />}
                >
                  System Logs
                </Button>

                <Button
                  variant="outline"
                  size="md"
                  onClick={handlePairWhatsApp}
                  className="w-full"
                  icon={<QrCode size={14} />}
                >
                  Pair WhatsApp Link
                </Button>

                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setShowCloudModal(true)}
                  className="w-full"
                  icon={<Key size={14} />}
                >
                  Connect Cloud API
                </Button>

                <Button
                  variant="outline"
                  size="md"
                  onClick={handleRepairImagePatch}
                  disabled={repairingImage || restarting}
                  className="w-full"
                  icon={<ImageIcon size={14} className={repairingImage ? 'animate-pulse' : ''} />}
                >
                  {repairingImage ? 'Repairing...' : 'Repair Image Display'}
                </Button>
              </div>
              {imageRepairMsg && (
                <p className="text-xs font-bold text-success mt-3 flex items-center gap-1">
                  <CheckCircle size={13} /> {imageRepairMsg}
                </p>
              )}
            </div>

          </Card>

          {/* Protection Status */}
          <Card padding="md" className="space-y-6">
            <div className="flex justify-between items-center border-b border-border dark:border-border pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="text-danger" size={18} />
                <h3 className="text-sm font-black text-text-primary dark:text-foreground uppercase tracking-wider font-sans">
                  Protection Controls
                </h3>
              </div>
              <button
                type="button"
                onClick={handleToggleProtection}
                disabled={togglingProtection}
                className={`text-[10px] font-black uppercase tracking-wide px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${
                  antiBotActive
                    ? 'bg-success-bg text-success border border-green-200'
                    : 'bg-surface-2 text-text-secondary border border-border'
                }`}
              >
                {togglingProtection ? 'Applying...' : antiBotActive ? 'Anti-Bot Active' : 'Anti-Bot Disabled'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-semibold">
              <div className="p-3 bg-surface-0 border border-border dark:bg-surface-2 rounded-xl text-center">
                <span className="text-[10px] font-black text-text-muted uppercase tracking-wider block">Today's Messages</span>
                <span className="text-sm font-mono font-black text-text-primary mt-1 block">
                  {todayUsage} / {dailyLimit}
                </span>
              </div>
              <div className="p-3 bg-surface-0 border border-border dark:bg-surface-2 rounded-xl text-center">
                <span className="text-[10px] font-black text-text-muted uppercase tracking-wider block">Cost Estimation</span>
                <span className="text-sm font-mono font-black text-success mt-1 block">
                  ₹{estimatedDailyCost.toFixed(2)} INR
                </span>
              </div>
              <div className="p-3 bg-surface-0 border border-border dark:bg-surface-2 rounded-xl text-center">
                <span className="text-[10px] font-black text-text-muted uppercase tracking-wider block">Spam Warnings</span>
                <span className="text-sm font-bold text-text-primary mt-1 block">
                  {todayUsage > dailyLimit * 0.8 ? 'Approaching threshold' : '0 issues'}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-border dark:border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="text-xs text-text-muted">
                {emergencyMsg && <span className="font-bold text-success">{emergencyMsg}</span>}
              </div>
              <Button
                variant="danger"
                size="md"
                onClick={handleEmergencyPause}
                disabled={emergencyPausing}
                icon={<StopCircle size={14} />}
              >
                {emergencyPausing ? 'Pausing...' : 'Emergency Pause Agent'}
              </Button>
            </div>

          </Card>

          {/* Blocked Contact Numbers */}
          <Card padding="md" className="space-y-4">
            <button
              type="button"
              onClick={() => setShowBlocklist(!showBlocklist)}
              className="w-full flex items-center justify-between border-b border-border dark:border-border pb-3 text-text-primary text-left cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <ShieldAlert size={16} />
                <h3 className="text-sm font-black uppercase tracking-wider font-sans">Blocked Contact Numbers ({blockedNumbers.length})</h3>
              </div>
              <span className="text-xs font-bold text-brand hover:underline">
                {showBlocklist ? 'Hide blocklist' : 'View / Edit list'}
              </span>
            </button>

            {showBlocklist && (
              <div className="space-y-4 pt-1 animate-fadeIn">
                <form onSubmit={handleAddBlockNumber} className="flex gap-2">
                  <input
                    type="text"
                    value={newBlockNumber}
                    onChange={(e) => setNewBlockNumber(e.target.value)}
                    placeholder="Block phone (e.g. 919876543210)"
                    className="flex-1 border border-border dark:border-border bg-white dark:bg-surface-0 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-brand font-semibold text-text-primary placeholder-text-subtle"
                    required
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    type="submit"
                    disabled={blockingNumber || !newBlockNumber.trim()}
                  >
                    {blockingNumber ? 'Blocking...' : 'Block'}
                  </Button>
                </form>

                {blockedNumbers.length === 0 ? (
                  <p className="text-xs text-text-subtle italic">No blocked numbers configured.</p>
                ) : (
                  <div className="max-h-40 overflow-y-auto border border-border rounded-lg divide-y divide-border">
                    {blockedNumbers.map((num) => (
                      <div key={num} className="flex items-center justify-between p-2.5 text-xs">
                        <span className="font-mono text-text-primary font-semibold">{num}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveBlockNumber(num)}
                          className="text-danger hover:text-danger/80 font-black cursor-pointer uppercase text-[10px]"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Gemini API Key Configuration */}
          <Card padding="md" className="space-y-4">
            <div className="flex items-center gap-2 border-b border-border dark:border-border pb-3 text-text-primary">
              <Key size={16} />
              <h3 className="text-sm font-black uppercase tracking-wider font-sans">Gemini API Configuration</h3>
            </div>
            
            <form onSubmit={handleUpdateApiKey} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="gemini-key" className="text-[10px] font-black text-text-muted uppercase tracking-wider block">
                  Gemini API Key
                </label>
                {maskedApiKey && (
                  <div className="text-[10px] text-success bg-success-bg border border-green-200 px-2.5 py-1 rounded-md inline-block font-extrabold mb-1 uppercase">
                    Active key cached: {maskedApiKey}
                  </div>
                )}
                <input
                  id="gemini-key"
                  type="password"
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  placeholder="Enter new Gemini API key"
                  className="w-full border border-border dark:border-border bg-white dark:bg-surface-0 rounded-lg px-3 py-2.5 text-xs focus:outline-none focus:border-brand font-semibold text-text-primary placeholder-text-subtle"
                  required
                />
              </div>
              {keySuccess && <p className="text-xs text-success font-bold">✓ {keySuccess}</p>}
              {keyError && <p className="text-xs text-danger font-bold">⚠️ {keyError}</p>}
              
              <Button
                variant="primary"
                size="sm"
                type="submit"
                disabled={updatingKey || !geminiApiKey.trim()}
              >
                {updatingKey ? 'Updating Key...' : 'Update Gemini API Key'}
              </Button>
            </form>
          </Card>

          {/* Timezone Configuration */}
          <Card padding="md" className="space-y-4">
            <div className="flex items-center gap-2 border-b border-border dark:border-border pb-3 text-text-primary">
              <Clock size={16} />
              <h3 className="text-sm font-black uppercase tracking-wider font-sans">Server Timezone Configuration</h3>
            </div>
            
            <form onSubmit={handleUpdateTimezone} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="server-timezone" className="text-[10px] font-black text-text-muted uppercase tracking-wider block">
                  Select Server Timezone
                </label>
                <select
                  id="server-timezone"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full border border-border dark:border-border bg-white dark:bg-surface-0 rounded-lg px-3 py-2.5 text-xs focus:outline-none focus:border-brand font-semibold text-text-primary cursor-pointer"
                >
                  <option value="UTC">UTC (Coordinated Universal Time)</option>
                  <option value="Asia/Kolkata">Asia/Kolkata (IST - Indian Standard Time)</option>
                  <option value="America/New_York">America/New_York (EST/EDT)</option>
                  <option value="Europe/London">Europe/London (GMT/BST)</option>
                  <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                  <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                </select>
                <p className="text-[10px] text-text-subtle mt-1 font-semibold">
                  This timezone ensures marketing campaigns and follow-ups align with local active business hours (9 AM - 9 PM).
                </p>
              </div>
              {timezoneSuccess && <p className="text-xs text-success font-bold">✓ {timezoneSuccess}</p>}
              {timezoneError && <p className="text-xs text-danger font-bold">⚠️ {timezoneError}</p>}
              
              <Button
                variant="primary"
                size="sm"
                type="submit"
                disabled={updatingTimezone}
              >
                {updatingTimezone ? 'Saving...' : 'Save Timezone'}
              </Button>
            </form>
          </Card>

          {/* Auto Follow-up Toggle */}
          <Card padding="md" className="space-y-4">
            <div className="flex items-center justify-between border-b border-border dark:border-border pb-3 text-text-primary">
              <div className="flex items-center gap-2">
                <Clock size={16} />
                <h3 className="text-sm font-black uppercase tracking-wider font-sans">Follow-up Automation Settings</h3>
              </div>
              <button
                type="button"
                onClick={handleToggleFollowUp}
                disabled={togglingFollowUp}
                className={`text-[10px] font-black uppercase tracking-wide px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${
                  autoFollowUpEnabled
                    ? 'bg-success-bg text-success border border-green-200'
                    : 'bg-danger-bg text-danger border border-red-200'
                }`}
              >
                {togglingFollowUp ? 'Toggling...' : autoFollowUpEnabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>
            
            <div className="text-xs text-text-muted space-y-2 leading-relaxed">
              <p>
                When follow-ups are enabled, the AI bot automatically schedules secondary follow-up WhatsApp messages to warm and hot leads after 24 hours of inactivity.
              </p>
            </div>
          </Card>

        </div>

        {/* Right column: Guides */}
        <div className="space-y-6">
          
          {/* Onboarding Guide */}
          {isNewClient && (
            <Card padding="md" className="bg-brand-light/25 border-brand/20 space-y-4">
              <h3 className="text-sm font-black text-brand-dark flex items-center gap-2 uppercase tracking-wide font-sans">
                <span>👋 Welcome Guide</span>
              </h3>
              
              <div className="space-y-3.5 text-xs text-brand-dark/90 leading-relaxed font-semibold">
                <div className="flex items-start gap-2">
                  <span className="bg-brand text-white w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px]">1</span>
                  <p>Click <strong>Restart AI Gateway</strong> on the left to boot your VPS process container.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="bg-brand text-white w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px]">2</span>
                  <p>Click <strong>Pair WhatsApp Link</strong> to launch a terminals terminal and get your scanning QR code.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="bg-brand text-white w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px]">3</span>
                  <p>On your bot phone, open WhatsApp Settings &rarr; Linked Devices &rarr; Scan QR.</p>
                </div>
              </div>
            </Card>
          )}

          {/* Troubleshooting Guide */}
          <Card padding="md" className="space-y-4">
            <h3 className="text-[13px] font-black text-text-primary dark:text-foreground uppercase tracking-wider font-sans border-b border-border dark:border-border pb-2.5">
              Troubleshooting Guide
            </h3>
            
            <div className="space-y-4 text-xs leading-relaxed font-semibold text-text-secondary">
              <div className="space-y-1">
                <h4 className="text-text-primary font-bold">1. Agent not responding?</h4>
                <p className="text-text-muted">
                  Click the <strong>Restart AI Gateway</strong> button. This restarts the execution engine and solves 90% of connectivity hang-ups.
                </p>
              </div>
              <div className="space-y-1">
                <h4 className="text-text-primary font-bold">2. Phone got disconnected?</h4>
                <p className="text-text-muted">
                  Ensure the phone is active, connected to the internet, and has not logged out. Click <strong>Pair WhatsApp Link</strong> to scan a new connection code.
                </p>
              </div>
              <div className="space-y-1">
                <h4 className="text-text-primary font-bold">3. Uptime check reset?</h4>
                <p className="text-text-muted">
                  Uptime resets when settings are updated or when the agent restarts to reload new product details.
                </p>
              </div>
            </div>
          </Card>

        </div>

      </div>

      {/* ========================================== */}
      {/* MODALS AND POPUPS                          */}
      {/* ========================================== */}

      {/* System Logs Modal */}
      {showLogsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-surface-1 rounded-2xl w-full max-w-3xl border border-border shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2 text-text-primary dark:text-foreground">
                <Terminal size={18} />
                <h3 className="text-xs font-black uppercase tracking-wider font-sans">System Execution Logs (Last 50 Lines)</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowLogsModal(false)}
                className="p-1 hover:bg-surface-2 text-text-muted rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto bg-gray-950 text-emerald-450 font-mono text-[11px] flex-1 min-h-[300px]">
              {logsLoading ? (
                <div className="flex flex-col items-center justify-center h-full space-y-2">
                  <RefreshCw size={24} className="animate-spin text-brand" />
                  <span>Fetching journal files from VPS...</span>
                </div>
              ) : (
                <pre className="whitespace-pre-wrap leading-relaxed">{logs}</pre>
              )}
            </div>

            <div className="px-6 py-4 border-t border-border flex justify-end bg-surface-0 dark:bg-surface-1">
              <Button variant="outline" size="sm" onClick={() => setShowLogsModal(false)}>Close Logs</Button>
            </div>
          </div>
        </div>
      )}

      {/* Pairing Modal */}
      {showPairingModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-surface-1 rounded-2xl w-full max-w-4xl border border-border shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2 text-text-primary dark:text-foreground">
                <QrCode size={18} />
                <h3 className="text-xs font-black uppercase tracking-wider font-sans">WhatsApp Device Pairing</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  stopPollingPairing();
                  setShowPairingModal(false);
                }}
                className="p-1 hover:bg-surface-2 text-text-muted rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1 bg-surface-0 dark:bg-surface-0">
              {pairingSuccess ? (
                <div className="bg-success-bg border border-green-200 text-success p-4 rounded-xl text-xs flex items-center gap-3">
                  <CheckCircle className="text-success shrink-0" size={20} />
                  <div>
                    <p className="font-extrabold text-sm text-green-950">WhatsApp Connected Successfully! 🎉</p>
                    <p className="mt-0.5">Your phone device is linked. Launching the automation gateway...</p>
                  </div>
                </div>
              ) : (
                <div className="bg-brand-light/30 border border-brand/20 text-brand-dark p-4 rounded-xl text-xs space-y-1.5 leading-relaxed font-semibold">
                  <p className="font-black text-brand-dark">Pairing Instructions:</p>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Open WhatsApp on your bot phone number.</li>
                    <li>Go to Settings &rarr; Linked Devices &rarr; Link a Device.</li>
                    <li>Scan the terminal pairing code QR printed below.</li>
                    <li>Wait until the terminal saves credentials, then click <strong>Done Scanning - Start Gateway</strong>.</li>
                  </ol>
                </div>
              )}

              <div className="bg-gray-950 p-5 rounded-xl font-mono text-emerald-450 overflow-auto whitespace-pre flex-grow" style={{ fontSize: '11px', lineHeight: '1.25', minHeight: '380px' }}>
                {pairingQr ? (
                  <pre className="text-left w-full">{pairingQr}</pre>
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 space-y-2 text-gray-500">
                    <RefreshCw size={24} className="animate-spin text-brand" />
                    <span>Allocating pairing tunnel on VPS server...</span>
                    <span className="text-[10px] text-gray-600">This may take up to 20 seconds. Please keep this modal open.</span>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border flex justify-end space-x-3 bg-surface-1">
              <Button variant="outline" size="sm" onClick={handlePairWhatsApp} disabled={pairingLoading || startingGateway}>
                Regenerate QR
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  stopPollingPairing();
                  setShowPairingModal(false);
                }}
                disabled={startingGateway}
              >
                Close
              </Button>
              {pairingSuccess ? (
                <Button variant="primary" size="sm" onClick={handleStartGateway} disabled={startingGateway}>
                  Start Gateway Now
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleDoneScanning}
                  disabled={startingGateway || pairingLoading}
                >
                  {startingGateway ? `Saving... (${scanCountdown}s)` : 'Done Scanning - Start Gateway'}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Force Reload Confirm Dialog */}
      {showReloadConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-border p-6 max-w-lg w-full space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-success">
              <CheckCircle size={20} />
              <h3 className="text-xs font-black uppercase tracking-wider font-sans">Agent Reloaded Successfully</h3>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              The agent reloaded successfully. Verify the first 3 lines of your prompt schema below:
            </p>
            <div className="bg-surface-0 border border-border rounded-xl p-4 font-mono text-[10.5px] text-text-primary whitespace-pre-wrap break-all">
              {reloadConfirmSnippet}
            </div>
            <div className="flex justify-end">
              <Button variant="primary" size="sm" onClick={() => setShowReloadConfirm(false)}>
                Confirm & Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cloud API Modal */}
      {showCloudModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-surface-1 rounded-2xl w-full max-w-xl border border-border shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2 text-text-primary dark:text-foreground">
                <Key size={18} />
                <h3 className="text-xs font-black uppercase tracking-wider font-sans">Connect WhatsApp Cloud API</h3>
              </div>
              <button
                type="button"
                onClick={handleCloseCloudModal}
                className="p-1 hover:bg-surface-2 text-text-muted rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {cloudSuccess ? (
              <div className="p-6 space-y-4 overflow-y-auto bg-surface-0 dark:bg-surface-0 flex-1">
                <div className="space-y-4 text-xs font-semibold">
                  <div className="flex items-center gap-2 text-success">
                    <CheckCircle size={16} />
                    <span className="text-[13px] font-bold">Meta credentials stored successfully!</span>
                  </div>

                  <p className="text-text-muted">
                    Configure your webhook Callback URL and Verify Token in Meta Developer Console:
                  </p>

                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-text-muted uppercase tracking-wider block">Callback URL</span>
                    <div className="flex items-center gap-2 bg-white dark:bg-surface-2 border border-border rounded-lg px-3 py-2">
                      <code className="flex-1 text-[11px] text-text-primary truncate font-mono">
                        {webhookUrl}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          copyToClipboard(webhookUrl);
                          setCopiedUrl(true);
                          setTimeout(() => setCopiedUrl(false), 2000);
                        }}
                      >
                        {copiedUrl ? 'Copied!' : 'Copy'}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-text-muted uppercase tracking-wider block">Verify Token</span>
                    <div className="flex items-center gap-2 bg-white dark:bg-surface-2 border border-border rounded-lg px-3 py-2">
                      <code className="flex-1 text-[11px] text-text-primary truncate font-mono">
                        {client?.hermesProfile}-webhook-token
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          copyToClipboard(`${client?.hermesProfile}-webhook-token`);
                          setCopiedToken(true);
                          setTimeout(() => setCopiedToken(false), 2000);
                        }}
                      >
                        {copiedToken ? 'Copied!' : 'Copy'}
                      </Button>
                    </div>
                  </div>

                  <div className="text-brand-dark/95 space-y-1 bg-brand-light/35 border border-brand/20 rounded-xl p-3.5 leading-relaxed">
                    <p className="font-extrabold text-brand-dark mb-1">Final configuration in Meta Console:</p>
                    <p>1. Go to WhatsApp App Dashboard &rarr; Configuration &rarr; Edit webhook</p>
                    <p>2. Paste the Callback URL and Verify Token copied above</p>
                    <p>3. Verify and save, then select "Manage" and subscribe to "messages" events.</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-border flex justify-end">
                  <Button variant="primary" size="sm" onClick={handleCloseCloudModal}>
                    Complete setup
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleConfigureCloudApi}>
                <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh] bg-surface-0 dark:bg-surface-0">
                  <div className="bg-brand-light/20 border border-brand/10 text-brand-dark p-4 rounded-xl text-xs leading-relaxed font-semibold">
                    Configure your official Meta WhatsApp Business account setup for maximum API throughput.
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-text-muted uppercase tracking-wider block">
                        Phone Number ID
                      </label>
                      <input
                        type="text"
                        value={cloudPhoneId}
                        onChange={(e) => setCloudPhoneId(e.target.value)}
                        placeholder="e.g. 109876543210987"
                        className="w-full border border-border dark:border-border bg-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-brand font-semibold text-text-primary"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-text-muted uppercase tracking-wider block">
                        Permanent Access Token
                      </label>
                      <input
                        type="password"
                        value={cloudAccessToken}
                        onChange={(e) => setCloudAccessToken(e.target.value)}
                        placeholder="EAAGy..."
                        className="w-full border border-border dark:border-border bg-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-brand font-semibold text-text-primary"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-text-muted uppercase tracking-wider block">
                        App Secret
                      </label>
                      <input
                        type="password"
                        value={cloudAppSecret}
                        onChange={(e) => setCloudAppSecret(e.target.value)}
                        placeholder="Meta App Secret"
                        className="w-full border border-border dark:border-border bg-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-brand font-semibold text-text-primary"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-text-muted uppercase tracking-wider block">
                        WhatsApp Business Account ID (WABA ID)
                      </label>
                      <input
                        type="text"
                        value={cloudWabaId}
                        onChange={(e) => setCloudWabaId(e.target.value)}
                        placeholder="e.g. 209876543210987"
                        className="w-full border border-border dark:border-border bg-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-brand font-semibold text-text-primary"
                        required
                      />
                    </div>
                  </div>

                  {cloudError && <p className="text-xs text-danger font-bold">⚠️ {cloudError}</p>}
                </div>

                <div className="px-6 py-4 border-t border-border flex justify-end gap-2 bg-surface-1">
                  <Button variant="outline" size="sm" onClick={handleCloseCloudModal}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    type="submit"
                    disabled={submittingCloud}
                  >
                    {submittingCloud ? 'Connecting...' : 'Save credentials'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
