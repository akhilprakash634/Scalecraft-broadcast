'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  Megaphone,
  Send,
  HelpCircle,
  Eye,
  AlertTriangle,
  Play,
  Pause,
  StopCircle,
  CheckCircle2,
  RefreshCw,
  MessageSquare,
  X,
  Loader2,
  Upload,
  FileSpreadsheet,
  Check,
  ChevronDown,
  ChevronUp,
  Filter,
  Sliders,
  Settings,
  Sparkles,
  Download,
  FolderOpen,
  Trash2,
  Clock,
  CreditCard,
  Package,
  Plus,
} from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

interface BroadcastProgress {
  sent: number;
  failed: number;
  total: number;
  running: boolean;
  paused?: boolean;
}

interface ColdOutreachJob {
  id: string;
  client_id: string;
  job_type: string;
  total_leads: number;
  sent: number;
  failed: number;
  status: string;
  created_at: string;
  completed_at: string | null;
}

export default function BroadcastPage() {
  const [activeMainTab, setActiveMainTab] = useState<'regular' | 'cold'>('regular');

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    try {
      const parts = timeStr.trim().split(/\s+/);
      const t = parts[parts.length - 1];
      const timeParts = t.split(':');
      if (timeParts.length >= 2) {
        const hour = parseInt(timeParts[0], 10);
        const min = timeParts[1];
        const ampm = hour >= 12 ? 'pm' : 'am';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${min}${ampm}`;
      }
      return timeStr;
    } catch {
      return timeStr;
    }
  };

  const formatStartedTime = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      return timeStr.toLowerCase().replace(/\s+/g, '');
    } catch {
      return '';
    }
  };

  const formatHistoryDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const day = d.getDate();
      const month = d.toLocaleString('en-US', { month: 'short' });
      const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      return `${day} ${month}, ${timeStr.toLowerCase()}`;
    } catch {
      return dateStr;
    }
  };

  const getCampaignStatusInfo = (prog: BroadcastProgress) => {
    if (prog.running) {
      return { color: 'bg-amber-500', text: 'Campaign running', isRunning: true, isPaused: false };
    }
    if (prog.paused) {
      return { color: 'bg-gray-400', text: 'Campaign paused', isRunning: false, isPaused: true };
    }
    const isFinished = (prog.sent + prog.failed >= prog.total) && prog.total > 0;
    if (isFinished) {
      return { color: 'bg-green-500', text: 'Campaign completed', isRunning: false, isPaused: false };
    }
    return { color: 'bg-red-500', text: 'Campaign stopped', isRunning: false, isPaused: false };
  };

  // ==========================================
  // REGULAR BROADCAST STATE & FUNCTIONS
  // ==========================================
  const [message, setMessage] = useState('');
  const [targetAudience, setTargetAudience] = useState<'all' | 'followup' | 'custom' | 'contact_group'>('all');
  const [batchSize, setBatchSize] = useState('1000');
  const [groupTag, setGroupTag] = useState('');
  const [contacts, setContacts] = useState<any[]>([]);
  const [contactsLoaded, setContactsLoaded] = useState(false);
  const [customNumbersText, setCustomNumbersText] = useState('');
  const [delaySeconds, setDelaySeconds] = useState(90);
  const [campaignImage, setCampaignImage] = useState('');
  const [uploadingCampaignImage, setUploadingCampaignImage] = useState(false);
  const [useAi, setUseAi] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [regularTimeWindow, setRegularTimeWindow] = useState(true);
  const [client, setClient] = useState<any>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateLanguage, setTemplateLanguage] = useState('en');
  const [metaTemplates, setMetaTemplates] = useState<any[]>([]);
  const [loadingMetaTemplates, setLoadingMetaTemplates] = useState(false);
  const [selectedMetaTemplate, setSelectedMetaTemplate] = useState<any>(null);
  const [metaTemplatesReason, setMetaTemplatesReason] = useState<string>('');
  const [metaTemplatesDebug, setMetaTemplatesDebug] = useState<string[]>([]);
  const [metaTemplatesInfo, setMetaTemplatesInfo] = useState<any>(null);
  // Maps variable keys to field sources. Body: "1", "2"; TEXT-header: "header_1", "header_2"
  // Values: "name" | "phone" | "custom:<text>"
  const [templateVarMapping, setTemplateVarMapping] = useState<Record<string, string>>({});

  // Status and polling
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [campaignProgress, setCampaignProgress] = useState<BroadcastProgress | null>(null);
  const [logHistory, setLogHistory] = useState<string[]>([]);
  const [downloadingLogs, setDownloadingLogs] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [error, setError] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [leads, setLeads] = useState<any[]>([]);
  const [leadsLoaded, setLeadsLoaded] = useState(false);
  const [showLeadSelector, setShowLeadSelector] = useState(false);
  const [selectedLeadPhones, setSelectedLeadPhones] = useState<string[]>([]);
  const [leadSearchQuery, setLeadSearchQuery] = useState('');

  const handleOpenLeadSelector = async () => {
    if (!leadsLoaded) {
      await fetchLeads();
      setLeadsLoaded(true);
    }
    setShowLeadSelector(true);
  };

  const [campaignHistory, setCampaignHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(true);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [rerunConfirmCamp, setRerunConfirmCamp] = useState<{ id: string; totalLeads: number; type: 'regular' | 'cold' } | null>(null);
  const [autoFollowUpEnabled, setAutoFollowUpEnabled] = useState(true);
  const [refreshingHistory, setRefreshingHistory] = useState(false);

  const fetchCampaignHistory = async () => {
    try {
      const res = await fetch('/api/dashboard/broadcast/history');
      if (res.ok) {
        const data = await res.json();
        setCampaignHistory(data.history || []);
      }
    } catch (err) {
      console.error('Error fetching campaign history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const templates = [
    {
      name: 'Welcome Offer 🎟️',
      text: 'Hey! Thanks for connecting with *ScaleCraft*. Here is a special 15% discount code just for you: *WELCOME15*. Duplicate our system templates today and start scaling! Reply to this message if you need help. 😊',
    },
    {
      name: 'Follow-up Objections 🏷️',
      text: 'Hi there! Just checking if you had any other questions about *ScaleCraft Agent*? We currently have a limited-time deal where we handle VPS setup and server operations for a flat one-time rate. Let me know if you would like to get started! 🚀',
    },
    {
      name: 'Digital Product Discount 🎁',
      text: 'Hey! 👋 Just wanted to reach out because you previously enquired about our digital products. We are running a special limited-time 20% discount offer! Use code *OFFER20* at checkout. Let me know if you would like to proceed! 🚀',
    },
  ];

  const fetchCampaignStatus = async () => {
    try {
      const res = await fetch('/api/dashboard/broadcast/status');
      if (!res.ok) throw new Error('Failed to fetch campaign status.');
      const data = await res.json();
      setCampaignProgress(data.progress);
      setLogHistory(data.logHistory || []);

      if (data.progress.running || data.progress.paused) {
        if (!pollIntervalRef.current) {
          pollIntervalRef.current = setInterval(fetchCampaignStatus, 5000);
        }
      } else {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      }
    } catch (err: any) {
      console.error('Error fetching broadcast status:', err);
    } finally {
      setLoadingStatus(false);
    }
  };

  const fetchLeads = async () => {
    try {
      const res = await fetch('/api/dashboard/leads?limit=200&fields=phone,name,intent');
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.leads)) {
          setLeads(data.leads);
          return data.leads;
        }
      }
    } catch { }
    return [];
  };

  const fetchClient = async () => {
    try {
      // Fetch client profile and Meta limits in parallel
      const [clientRes, metaRes] = await Promise.all([
        fetch('/api/dashboard/client'),
        fetch('/api/dashboard/broadcast/meta-status').catch(() => null),
      ]);

      if (clientRes.ok) {
        const data = await clientRes.json();

        // Merge Meta tier/quality data if the dedicated endpoint succeeded
        if (metaRes?.ok) {
          const metaData = await metaRes.json();
          data.metaLimitTier = metaData.metaLimitTier ?? data.metaLimitTier;
          data.metaQualityRating = metaData.metaQualityRating ?? data.metaQualityRating;
          data.metaLimitExpiresAt = metaData.metaLimitExpiresAt ?? data.metaLimitExpiresAt;
          data.metaThroughputLimit = metaData.metaThroughputLimit ?? data.metaThroughputLimit;
          data.dailyBroadcastLimit = metaData.dailyBroadcastLimit ?? data.dailyBroadcastLimit;
          data.totalSentToday = metaData.totalSentToday ?? 0;
          data.effectiveLimit = metaData.effectiveLimit ?? 0;
        }

        setClient(data);
        setAutoFollowUpEnabled(data.autoFollowUpEnabled !== false);
        if (data.connectionType === 'cloud_api') {
          setDelaySeconds(3);
          setColdDelaySeconds(3);
        }
      }
    } catch (err) {
      console.error('Failed to load client profile:', err);
    }
  };

  useEffect(() => {
    fetchCampaignStatus();
    fetchCampaignHistory();
    fetchClient();

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const fetchMetaTemplates = async (force = false) => {
    if (force) {
      sessionStorage.removeItem('meta_templates');
    }
    // Check cache first
    const cached = sessionStorage.getItem('meta_templates');
    if (cached && !force) {
      try {
        const parsed = JSON.parse(cached);
        // Use cache if less than 5 minutes old
        if (Date.now() - parsed.timestamp < 5 * 60 * 1000) {
          setMetaTemplates(parsed.templates || []);
          setMetaTemplatesReason(parsed.reason || 'success');
          setMetaTemplatesDebug(parsed.debug || []);
          setMetaTemplatesInfo(parsed.info || null);
          setLoadingMetaTemplates(false);
          return;
        }
      } catch {}
    }

    setLoadingMetaTemplates(true);
    setMetaTemplatesReason('');
    setMetaTemplatesDebug([]);
    try {
      const url = force ? '/api/dashboard/broadcast/templates?force=true' : '/api/dashboard/broadcast/templates';
      const res = await fetch(url);
      const data = await res.json();
      if (data.templates) {
        setMetaTemplates(data.templates);
        // Cache for 5 minutes
        sessionStorage.setItem('meta_templates', JSON.stringify({
          templates: data.templates,
          reason: data.reason || 'success',
          debug: data.debug || [],
          info: {
            connectionType: data.connectionType,
            wabaId: data.wabaId,
            phoneNumberId: data.phoneNumberId
          },
          timestamp: Date.now()
        }));
      }
      if (data.reason) {
        setMetaTemplatesReason(data.reason);
      }
      if (data.debug) {
        setMetaTemplatesDebug(data.debug);
      }
      setMetaTemplatesInfo({
        connectionType: data.connectionType,
        wabaId: data.wabaId,
        phoneNumberId: data.phoneNumberId
      });
    } catch (err: any) {
      console.error('Failed to fetch Meta templates:', err);
      setMetaTemplatesReason('api_failed');
      setMetaTemplatesDebug([err.message || 'Unknown network error']);
    } finally {
      setLoadingMetaTemplates(false);
    }
  };

  useEffect(() => {
    if (!client) return;
    const hasCredentials = client.whatsappAccessToken && (client.whatsappWabaId || client.whatsappPhoneNumberId);
    if (client.connectionType === 'cloud_api' || hasCredentials) {
      fetchMetaTemplates();
    }
  }, [client]);


  const handleApplyTemplate = (text: string) => {
    if (message && !confirm('Overwrite your current message with this template?')) return;
    setMessage(text);
  };

  // --- Template variable helpers ---

  /** Returns all variable slots for the selected Meta template in display order.
   *  Keys: "header_1", "header_2" for TEXT-header vars; "1", "2" for body vars. */
  const getTemplateVariables = (tmpl = selectedMetaTemplate): { key: string; label: string }[] => {
    const result: { key: string; label: string }[] = [];
    if (!tmpl?.components) return result;
    for (const comp of tmpl.components) {
      if (comp.type === 'HEADER' && comp.format === 'TEXT' && comp.text) {
        const matches = comp.text.match(/\{\{(\d+)\}\}/g) || [];
        matches.forEach((_: string, i: number) =>
          result.push({ key: `header_${i + 1}`, label: `Header Variable {{${i + 1}}}` })
        );
      }
      if (comp.type === 'BODY' && comp.text) {
        const rawMatches = comp.text.match(/\{\{(\d+)\}\}/g) || [];
        const indices = ([...new Set(rawMatches.map((m: string) => parseInt(m.replace(/\D/g, ''), 10)))] as number[])
          .sort((a, b) => a - b);
        indices.forEach((n: number) =>
          result.push({ key: String(n), label: `Body Variable {{${n}}}` })
        );
      }
    }
    return result;
  };

  /** Sanitise a client-typed custom value: trim, strip newlines, cap at 60 chars. */
  const sanitiseCustomVar = (raw: string): string =>
    raw.trim().replace(/[\r\n]+/g, ' ').slice(0, 60);

  /** Derive preview data from the selected Meta template + current mappings + campaignImage. */
  const getTemplatePreviewData = (
    tmpl = selectedMetaTemplate,
    mapping = templateVarMapping,
    img = campaignImage,
    msgFallback = message
  ) => {
    const empty = { headerImageUrl: null as string | null, headerText: null as string | null, previewBody: msgFallback, footerText: null as string | null };
    if (!tmpl?.components) return empty;

    const headerComp = tmpl.components.find((c: any) => c.type === 'HEADER');
    const bodyComp   = tmpl.components.find((c: any) => c.type === 'BODY');
    const footerComp = tmpl.components.find((c: any) => c.type === 'FOOTER');

    const resolvePreviewVar = (varIndex: number, scope: 'body' | 'header'): string => {
      const key = scope === 'header' ? `header_${varIndex}` : String(varIndex);
      const mVal = mapping[key];
      if (mVal === 'name')              return '[Recipient Name]';
      if (mVal === 'phone')             return '[+91XXXXX]';
      if (mVal?.startsWith('custom:'))  return mVal.slice(7) || `[Variable ${varIndex}]`;
      // Fall back to Meta's own example values
      if (scope === 'body') {
        const ex = bodyComp?.example?.body_text?.[0];
        if (ex?.[varIndex - 1]) return `[${ex[varIndex - 1]}]`;
      } else {
        const ex = headerComp?.example?.header_text;
        if (ex?.[varIndex - 1]) return `[${ex[varIndex - 1]}]`;
      }
      return `[Variable ${varIndex}]`;
    };

    const previewBody = (bodyComp?.text || msgFallback).replace(
      /\{\{(\d+)\}\}/g,
      (_: string, n: string) => resolvePreviewVar(parseInt(n, 10), 'body')
    );

    let headerImageUrl: string | null = null;
    let headerText: string | null = null;
    if (headerComp?.format === 'IMAGE') {
      headerImageUrl = img || headerComp?.example?.header_handle?.[0] || null;
    } else if (headerComp?.format === 'TEXT' && headerComp.text) {
      headerText = headerComp.text.replace(
        /\{\{(\d+)\}\}/g,
        (_: string, n: string) => resolvePreviewVar(parseInt(n, 10), 'header')
      );
    }

    return { headerImageUrl, headerText, previewBody, footerText: footerComp?.text || null };
  };

  const handleQuickCampaignClick = async (segment: string) => {
    let currentLeads = leads;
    if (!leadsLoaded) {
      currentLeads = await fetchLeads();
      setLeadsLoaded(true);
    }

    if (segment === 'follow_up') {
      setTargetAudience('followup');
      return;
    }

    let filtered: any[] = [];
    if (segment === 'hot') {
      filtered = currentLeads.filter(l => l.intent === 'hot' && !l.is_converted && !l.is_dnd);
    } else if (segment === 'price_sensitive') {
      filtered = currentLeads.filter(l => l.is_price_sensitive && !l.is_converted && !l.is_dnd);
    } else if (segment === 'digital_products') {
      filtered = currentLeads.filter(l => l.products_mentioned && l.products_mentioned.length > 0 && !l.is_converted && !l.is_dnd);
    } else if (segment === 'cold') {
      filtered = currentLeads.filter(l => l.intent === 'cold' && !l.is_converted && !l.is_dnd);
    }

    const phones = filtered.map(l => l.phone).join('\n');
    setTargetAudience('custom');
    setCustomNumbersText(phones);
  };

  const handleCampaignImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCampaignImage(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/dashboard/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload image.');
      }

      setCampaignImage(data.url);
    } catch (err: any) {
      setError(err.message || 'Error uploading image.');
    } finally {
      setUploadingCampaignImage(false);
    }
  };

  const handleColdCampaignImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setColdUploadingCampaignImage(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/dashboard/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload image.');
      }

      setColdCampaignImage(data.url);
    } catch (err: any) {
      setError(err.message || 'Error uploading image.');
    } finally {
      setColdUploadingCampaignImage(false);
    }
  };

  const cleanCustomNumbers = () => {
    return customNumbersText
      .split('\n')
      .map((n) => {
        let raw = n.trim().replace(/[\s\-\(\)\+]/g, '').replace(/\D/g, '');
        if (raw.length === 11 && raw.startsWith('0')) raw = raw.slice(1);
        if (raw.length === 10 && /^[6-9]/.test(raw)) raw = '91' + raw;
        return raw;
      })
      .filter((n) => n.length >= 10);
  };

  const getEstimatedDuration = (totalLeads: number) => {
    return Math.ceil((totalLeads * delaySeconds) / 60);
  };

  const fetchContacts = async () => {
    try {
      const res = await fetch('/api/dashboard/contacts');
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts || []);
      }
    } catch {}
  };

  const getTargetLeadsCount = () => {
    if (targetAudience === 'custom') {
      return cleanCustomNumbers().length;
    }
    if (targetAudience === 'contact_group') {
      return contacts.filter(
        (c) =>
          Array.isArray(c.group_tags) &&
          c.group_tags.map((t: string) => t.toLowerCase()).includes(groupTag.trim().toLowerCase()) &&
          !c.is_dnd
      ).length;
    }
    if (targetAudience === 'followup') {
      return leads.filter(
        (l) =>
          (l.intent === 'follow_up' || l.manual_status === 'Follow-up Needed') &&
          !l.is_converted &&
          !l.is_dnd
      ).length;
    }
    return leads.filter((l) => !l.is_converted && !l.is_dnd).length;
  };

  const handleLaunchCampaign = async () => {
    setSubmitting(true);
    setError('');
    setShowConfirmModal(false);

    const customPhones = targetAudience === 'custom' ? cleanCustomNumbers() : [];

    try {
      const res = await fetch('/api/dashboard/broadcast/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          targetAudience,
          customPhones,
          groupTag: targetAudience === 'contact_group' ? groupTag.trim() : undefined,
          delaySeconds,
          imageUrl: campaignImage,
          useAi,
          aiPrompt,
          timeWindow: regularTimeWindow,
          templateName: selectedMetaTemplate?.name || templateName || null,
          templateLanguage: selectedMetaTemplate?.language || templateLanguage || 'en',
          templateComponents: selectedMetaTemplate?.components || null,
          templateVarMapping,
          batchSize,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to trigger broadcast campaign.');
      }

      fetchCampaignStatus();
      fetchClient();
    } catch (err: any) {
      setError(err.message || 'Error launching broadcast.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStopCampaign = async (jobId?: string) => {
    if (!confirm('Are you sure you want to abort the active campaign? Messages already sent cannot be unsent.')) return;
    setStopping(true);
    setError('');

    try {
      const res = await fetch('/api/dashboard/broadcast/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop', jobId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to stop campaign.');
      }

      fetchCampaignStatus();
    } catch (err: any) {
      setError(err.message || 'Error aborting broadcast.');
    } finally {
      setStopping(false);
    }
  };

  const [pausing, setPausing] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [deletingCampaignId, setDeletingCampaignId] = useState<string | null>(null);

  const handlePauseCampaign = async (jobId?: string) => {
    setPausing(true);
    setError('');
    try {
      const res = await fetch('/api/dashboard/broadcast/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pause', jobId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to pause campaign.');
      }

      fetchCampaignStatus();
    } catch (err: any) {
      setError(err.message || 'Error pausing broadcast.');
    } finally {
      setPausing(false);
    }
  };

  const handleResumeCampaign = async (jobId?: string) => {
    setResuming(true);
    setError('');
    try {
      const res = await fetch('/api/dashboard/broadcast/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resume', jobId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to resume campaign.');
      }

      fetchCampaignStatus();
    } catch (err: any) {
      setError(err.message || 'Error resuming broadcast.');
    } finally {
      setResuming(false);
    }
  };

  const handleDeleteCampaign = async (id: string, type: 'regular' | 'cold') => {
    if (!confirm('Are you sure you want to delete this campaign record? This will permanently delete it from history.')) return;
    setDeletingCampaignId(id);
    try {
      const res = await fetch('/api/dashboard/broadcast/history', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, type }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete campaign.');
      }

      fetchCampaignHistory();
    } catch (err: any) {
      alert(err.message || 'Error deleting campaign.');
    } finally {
      setDeletingCampaignId(null);
    }
  };

  const [resumingCampaignId, setResumingCampaignId] = useState<string | null>(null);

  const handleDirectResumeCampaign = async (jobId: string, type: 'regular' | 'cold') => {
    if (type !== 'cold') return;
    setResumingCampaignId(jobId);
    setError('');
    try {
      const configRes = await fetch(`/api/dashboard/broadcast/cold-outreach-config?jobId=${jobId}`);
      if (!configRes.ok) throw new Error('Failed to fetch campaign configuration.');
      const configData = await configRes.json();
      const config = configData.campaignConfig;
      if (!config || !config.leads) throw new Error('No campaign configuration found.');

      const launchRes = await fetch('/api/dashboard/broadcast/send-cold-outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          leads: config.leads,
          templates: config.templates,
          singleTemplate: config.singleTemplate,
          isSingleTemplate: !!config.singleTemplate && !config.templates,
          delaySeconds: config.delay || 150,
          timeWindow: config.timeWindow !== false,
          dailyLimit: config.dailyLimit || 15,
          imageUrl: config.imageUrl || '',
        }),
      });

      if (!launchRes.ok) {
        const data = await launchRes.json();
        throw new Error(data.error || 'Failed to resume campaign.');
      }

      fetchColdOutreachStatus();
      fetchCampaignHistory();
    } catch (err: any) {
      alert(err.message || 'Error resuming campaign.');
    } finally {
      setResumingCampaignId(null);
    }
  };

  const handleDownloadFullLog = async (type: 'regular' | 'cold') => {
    setDownloadingLogs((prev) => ({ ...prev, [type]: true }));
    try {
      const res = await fetch(`/api/dashboard/broadcast/full-log?type=${type}`);
      if (!res.ok) throw new Error('Failed to fetch full logs');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_broadcast_full_log.txt`;
      document.body.appendChild(a);
      a.click();
      a.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Error downloading full log');
    } finally {
      setDownloadingLogs((prev) => ({ ...prev, [type]: false }));
    }
  };

  // ==========================================
  // COLD OUTREACH STATE & FUNCTIONS
  // ==========================================
  const [csvLeads, setCsvLeads] = useState<any[]>([]);
  const [parsedLeadsStats, setParsedLeadsStats] = useState({
    total: 0,
    hot: 0,
    warm: 0,
    invalid: 0,
  });
  const [categoryBreakdown, setCategoryBreakdown] = useState<Record<string, number>>({});
  const [detectedGroups, setDetectedGroups] = useState<string[]>([]);
  const [detectedCategories, setDetectedCategories] = useState<string[]>([]);
  const [csvFileName, setCsvFileName] = useState('');

  // CSV Mapping & Cold Outreach UI States
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [selectedPhoneColumn, setSelectedPhoneColumn] = useState('');
  const [selectedNameColumn, setSelectedNameColumn] = useState('');
  const [selectedIntentColumn, setSelectedIntentColumn] = useState('');
  const [selectedNotesColumn, setSelectedNotesColumn] = useState('');
  const [mappedLeadsPreview, setMappedLeadsPreview] = useState<any[]>([]);

  const [coldMessage, setColdMessage] = useState('');
  const [coldDelaySeconds, setColdDelaySeconds] = useState(150);
  const [coldCampaignImage, setColdCampaignImage] = useState('');
  const [coldUploadingCampaignImage, setColdUploadingCampaignImage] = useState(false);
  const [coldTimeWindow, setColdTimeWindow] = useState(true);
  const [coldDailyLimit, setColdDailyLimit] = useState(25);

  const [coldTemplateName, setColdTemplateName] = useState('');
  const [coldTemplateLanguage, setColdTemplateLanguage] = useState('en');
  const [coldSelectedMetaTemplate, setColdSelectedMetaTemplate] = useState<any>(null);
  const [coldTemplateVarMapping, setColdTemplateVarMapping] = useState<Record<string, string>>({});

  const [coldProgress, setColdProgress] = useState<BroadcastProgress | null>(null);
  const [coldLogHistory, setColdLogHistory] = useState<string[]>([]);
  const [submittingCold, setSubmittingCold] = useState(false);
  const [stoppingCold, setStoppingCold] = useState(false);
  const [coldError, setColdError] = useState('');
  const [showColdConfirmModal, setShowColdConfirmModal] = useState(false);
  const [coldOutreachJobs, setColdOutreachJobs] = useState<ColdOutreachJob[]>([]);
  const [loadingColdJobs, setLoadingColdJobs] = useState(true);

  // Split-templates options for Cold Campaign
  const [useMultipleTemplates, setUseMultipleTemplates] = useState(false);
  const [coldTemplates, setColdTemplates] = useState<string[]>([
    'Hi {business_name}, saw your profile online. Do you handle VPS operations in-house or outsource it?',
    'Hey {business_name}! Wanted to connect regarding your VPS setup. Let me know if you have 2 mins.',
    'Hey there! Love what you guys are doing at {business_name}. Saw you on Google Maps.'
  ]);

  const handleAddTemplateField = () => {
    setColdTemplates([...coldTemplates, '']);
  };

  const handleRemoveTemplateField = (idx: number) => {
    if (coldTemplates.length <= 1) return;
    setColdTemplates(coldTemplates.filter((_, i) => i !== idx));
  };

  const handleTemplateTextChange = (idx: number, text: string) => {
    const updated = [...coldTemplates];
    updated[idx] = text;
    setColdTemplates(updated);
  };

  const fetchColdOutreachStatus = async () => {
    try {
      const res = await fetch('/api/dashboard/broadcast/cold-outreach-status');
      if (res.ok) {
        const data = await res.json();
        setColdProgress(data.progress);
        setColdLogHistory(data.logHistory || []);
        if (data.jobs) {
          setColdOutreachJobs(data.jobs);
        }
      }
    } catch (err) {
      console.error('Error fetching cold outreach status:', err);
    } finally {
      setLoadingColdJobs(false);
      fetchCampaignHistory();
    }
  };

  useEffect(() => {
    fetchColdOutreachStatus();
    const interval = setInterval(fetchColdOutreachStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    setColdError('');

    const text = await file.text();
    const rows = text.split('\n').map((row) => {
      // Simple CSV parser supporting quotes
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < row.length; i++) {
        const char = row[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    });

    const headers = rows[0].map((h) => h.replace(/^"|"$/g, '').trim());
    setCsvHeaders(headers);

    // Auto-map standard fields
    const phoneCol = headers.find((h) =>
      ['phone', 'mobile', 'whatsapp', 'number', 'contact'].includes(h.toLowerCase())
    ) || '';
    const nameCol = headers.find((h) =>
      ['name', 'business_name', 'title', 'company', 'first_name'].includes(h.toLowerCase())
    ) || '';
    const intentCol = headers.find((h) =>
      ['intent', 'lead_quality', 'quality', 'type', 'status'].includes(h.toLowerCase())
    ) || '';
    const notesCol = headers.find((h) =>
      ['notes', 'summary', 'address', 'city', 'description'].includes(h.toLowerCase())
    ) || '';

    setSelectedPhoneColumn(phoneCol);
    setSelectedNameColumn(nameCol);
    setSelectedIntentColumn(intentCol);
    setSelectedNotesColumn(notesCol);

    // Parse all raw rows
    const rawLeads = rows.slice(1).filter((r) => r.length > 0 && r.some((c) => c !== ''));
    setCsvLeads(rawLeads);

    updateMappedPreview(rawLeads, headers, phoneCol, nameCol, intentCol, notesCol);
  };

  const updateMappedPreview = (
    rawLeadsList: any[],
    headersList: string[],
    phoneCol: string,
    nameCol: string,
    intentCol: string,
    notesCol: string
  ) => {
    if (!phoneCol) {
      setMappedLeadsPreview([]);
      return;
    }

    const phoneIdx = headersList.indexOf(phoneCol);
    const nameIdx = headersList.indexOf(nameCol);
    const intentIdx = headersList.indexOf(intentCol);
    const notesIdx = headersList.indexOf(notesCol);

    let total = 0;
    let hot = 0;
    let warm = 0;
    let invalid = 0;

    const breakdown: Record<string, number> = {};
    const groups: string[] = [];
    const categories: string[] = [];

    // Find indices for category details if present
    const categoryIdx = headersList.findIndex(h => h.toLowerCase() === 'category');
    const groupIdx = headersList.findIndex(h => h.toLowerCase() === 'category_group');

    const preview = rawLeadsList.map((row) => {
      const rawPhone = row[phoneIdx] || '';
      const cleanPhone = rawPhone.replace(/\D/g, '');
      const isValid = cleanPhone.length >= 10;

      const rawIntent = intentIdx !== -1 ? (row[intentIdx] || '').toLowerCase() : '';
      const isHot = rawIntent.includes('hot') || rawIntent.includes('high');
      const isWarm = rawIntent.includes('warm') || rawIntent.includes('medium');

      const catVal = categoryIdx !== -1 ? row[categoryIdx] || 'General' : 'General';
      const grpVal = groupIdx !== -1 ? row[groupIdx] || 'Others' : 'Others';

      if (isValid) {
        total++;
        if (isHot) hot++;
        else if (isWarm) warm++;

        breakdown[catVal] = (breakdown[catVal] || 0) + 1;
        if (grpVal && !groups.includes(grpVal)) groups.push(grpVal);
        if (catVal && !categories.includes(catVal)) categories.push(catVal);
      } else {
        invalid++;
      }

      return {
        phone: cleanPhone,
        name: nameIdx !== -1 ? row[nameIdx] || '' : '',
        intent: isHot ? 'HOT' : isWarm ? 'WARM' : 'COLD',
        notes: notesIdx !== -1 ? row[notesIdx] || '' : '',
        isValid,
        category: catVal,
        category_group: grpVal,
        city: headersList.includes('city') ? row[headersList.indexOf('city')] || '' : '',
        rating: headersList.includes('rating') ? row[headersList.indexOf('rating')] || '' : '',
        reviews_count: headersList.includes('reviews_count') ? row[headersList.indexOf('reviews_count')] || '' : '',
      };
    });

    setParsedLeadsStats({ total, hot, warm, invalid });
    setCategoryBreakdown(breakdown);
    setDetectedGroups(groups);
    setDetectedCategories(categories);
    setMappedLeadsPreview(preview);
  };

  useEffect(() => {
    if (csvLeads.length > 0 && csvHeaders.length > 0) {
      updateMappedPreview(
        csvLeads,
        csvHeaders,
        selectedPhoneColumn,
        selectedNameColumn,
        selectedIntentColumn,
        selectedNotesColumn
      );
    }
  }, [selectedPhoneColumn, selectedNameColumn, selectedIntentColumn, selectedNotesColumn]);

  const handleLaunchColdCampaign = async () => {
    setSubmittingCold(true);
    setColdError('');
    setShowColdConfirmModal(false);

    const validLeads = mappedLeadsPreview.filter((l) => l.isValid);
    const activeTemplates = useMultipleTemplates ? coldTemplates.filter(t => t.trim()) : [];

    // Pre-send validation for Cloud API
    if (client?.connectionType === 'cloud_api') {
      if (!coldSelectedMetaTemplate) {
        setColdError('Please select an approved Meta template before launching the campaign.');
        setSubmittingCold(false);
        return;
      }
      const templateVars = getTemplateVariables(coldSelectedMetaTemplate);
      const unmapped = templateVars.filter(v => !coldTemplateVarMapping[v.key]);
      if (unmapped.length > 0) {
        setColdError(`Please map all template variables before sending: ${unmapped.map(v => v.label).join(', ')}`);
        setSubmittingCold(false);
        return;
      }
      const hasHeaderImage = coldSelectedMetaTemplate?.components?.some(
        (c: any) => c.type === 'HEADER' && c.format === 'IMAGE'
      );
      if (hasHeaderImage && !coldCampaignImage) {
        setColdError('This template requires a header image — upload or input a media URL before sending.');
        setSubmittingCold(false);
        return;
      }
    }

    try {
      const res = await fetch('/api/dashboard/broadcast/send-cold-outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leads: validLeads,
          isSingleTemplate: !useMultipleTemplates,
          singleTemplate: coldMessage,
          templates: activeTemplates,
          delaySeconds: coldDelaySeconds,
          imageUrl: coldCampaignImage,
          timeWindow: coldTimeWindow,
          dailyLimit: coldDailyLimit,
          templateName: coldSelectedMetaTemplate?.name || coldTemplateName || null,
          templateLanguage: coldSelectedMetaTemplate?.language || coldTemplateLanguage || 'en',
          templateComponents: coldSelectedMetaTemplate?.components || null,
          templateVarMapping: coldTemplateVarMapping,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to launch cold outreach campaign.');
      }

      fetchColdOutreachStatus();
      fetchClient();
      setCsvLeads([]);
      setCsvFileName('');
      setColdMessage('');
    } catch (err: any) {
      setColdError(err.message || 'Error launching campaign.');
    } finally {
      setSubmittingCold(false);
    }
  };

  const handleStopColdCampaign = async (jobId?: string) => {
    if (!confirm('Are you sure you want to stop the active cold outreach?')) return;
    setStoppingCold(true);
    setColdError('');
    try {
      const res = await fetch('/api/dashboard/broadcast/send-cold-outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop', jobId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to stop campaign.');
      }
      fetchColdOutreachStatus();
    } catch (err: any) {
      setColdError(err.message || 'Error stopping campaign.');
    } finally {
      setStoppingCold(false);
    }
  };

  const handlePauseColdCampaign = async (jobId?: string) => {
    setColdError('');
    try {
      const res = await fetch('/api/dashboard/broadcast/send-cold-outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pause', jobId }),
      });
      if (!res.ok) throw new Error('Failed to pause');
      fetchColdOutreachStatus();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleResumeColdCampaign = async (jobId?: string) => {
    setColdError('');
    try {
      const res = await fetch('/api/dashboard/broadcast/send-cold-outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resume', jobId }),
      });
      if (!res.ok) throw new Error('Failed to resume');
      fetchColdOutreachStatus();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRerunCampaign = async () => {
    if (!rerunConfirmCamp) return;
    const { id, type } = rerunConfirmCamp;
    try {
      const res = await fetch('/api/dashboard/broadcast/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, type, action: 'rerun' }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to re-run campaign');
      }
      alert('Campaign re-run job scheduled successfully!');
      setRerunConfirmCamp(null);
      if (type === 'regular') fetchCampaignStatus();
      else fetchColdOutreachStatus();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const interpolatePreviewText = (template: string, lead: any) => {
    if (!template) return '';
    return template
      .replace('{business_name}', lead.business_name || 'there')
      .replace('{city}', lead.city || '')
      .replace('{rating}', lead.rating || '')
      .replace('{reviews_count}', lead.reviews_count || '')
      .replace('{category}', lead.category || '');
  };

  const downloadSampleCSV = () => {
    const headers = 'lead_quality,business_name,phone,street,city,state,rating,reviews_count,category,category_group,has_website,maps_url\n';
    const row1 = 'HOT,Farm Villa Resort,918078004732,Beach Road,Goa,GA,4.8,230,Resort,Agriculture & Farming,false,https://maps.google.com/...\n';
    const row2 = 'WARM,Taj Mahal Palace,919876543210,Apollo Bunder,Mumbai,MH,4.9,9820,Hotel,Restaurants,true,https://maps.google.com/...\n';

    const blob = new Blob([headers + row1 + row2], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'sample_scraped_leads.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 space-y-6 select-none max-w-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border dark:border-border pb-4">
        <div>
          <h1 className="text-xl font-black text-text-primary tracking-tight font-sans">
            Broadcast Campaigns
          </h1>
          <p className="text-xs font-semibold text-text-muted mt-1">
            Deliver bulk WhatsApp notifications to warm leads or setup cold scraper campaigns.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-danger-bg border border-red-200 text-danger text-xs font-semibold p-4 rounded-xl flex items-center gap-2">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {client?.connectionType === 'cloud_api' && (client?.metaLimitTier || client?.metaQualityRating) && (
        <div className="bg-brand-light/10 border border-brand/20 rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center text-brand font-black text-sm">
                ⚡
              </div>
              <div>
                <h3 className="text-xs font-black text-text-primary uppercase tracking-wider">Meta Cloud API Status</h3>
                <p className="text-[11px] text-text-muted font-semibold mt-0.5">
                  Messaging Tier: <span className="text-brand font-black">{client.metaLimitTier || 'TIER_250'}</span> (Limit: {
                    client.metaLimitTier === 'TIER_1K' ? '1,000' :
                    client.metaLimitTier === 'TIER_10K' ? '10,000' :
                    client.metaLimitTier === 'TIER_100K' ? '100,000' :
                    client.metaLimitTier === 'TIER_UNLIMITED' ? 'Unlimited' : '250'
                  } unique recipients/day)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase text-text-muted">Quality Rating:</span>
              <span className={`text-[10px] font-extrabold uppercase px-2 py-1 rounded-lg ${
                client.metaQualityRating?.toUpperCase() === 'GREEN' ? 'bg-success-bg text-success' :
                client.metaQualityRating?.toUpperCase() === 'YELLOW' ? 'bg-amber-100 text-amber-800' :
                'bg-danger-bg text-danger'
              }`}>
                {client.metaQualityRating || 'GREEN'}
              </span>
            </div>
          </div>

          {/* Usage and Headroom Progress Bar */}
          {client.effectiveLimit !== undefined && (
            <div className="border-t border-brand/10 pt-3.5 space-y-2">
              <div className="flex justify-between items-center text-[10px] uppercase font-black">
                <span className="text-text-muted">Today's Broadcast Usage</span>
                <span className="text-text-primary">
                  {client.totalSentToday ?? 0} / {client.effectiveLimit === 100000000 ? 'Unlimited' : `${client.effectiveLimit} sent`}
                </span>
              </div>
              <div className="w-full h-2 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden relative">
                <div
                  className="h-full bg-brand rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${Math.min(
                      100,
                      client.effectiveLimit === 100000000
                        ? 0
                        : ((client.totalSentToday ?? 0) / (client.effectiveLimit || 1)) * 100
                    )}%`,
                  }}
                />
              </div>
              {client.dailyBroadcastLimit != null && (
                <p className="text-[9px] text-text-muted italic">
                  * Custom limit cap of {client.dailyBroadcastLimit} applied by ScaleCraft administrator.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab Selector */}
      <div className="flex border-b border-border mb-6">
        <button
          type="button"
          onClick={() => {
            setActiveMainTab('regular');
            setError('');
          }}
          className={`pb-3 text-xs font-black border-b-2 transition-colors cursor-pointer text-center uppercase tracking-wider px-6 flex items-center gap-1.5 ${
            activeMainTab === 'regular'
              ? 'border-brand text-brand'
              : 'border-transparent text-text-muted hover:text-text-primary'
          }`}
        >
          <Megaphone size={14} />
          <span>Regular Broadcast</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveMainTab('cold');
            setError('');
          }}
          className={`pb-3 text-xs font-black border-b-2 transition-colors cursor-pointer text-center uppercase tracking-wider px-6 flex items-center gap-1.5 ${
            activeMainTab === 'cold'
              ? 'border-brand text-brand'
              : 'border-transparent text-text-muted hover:text-text-primary'
          }`}
        >
          <Send size={14} />
          <span>Cold Outreach</span>
        </button>
      </div>

      {loadingStatus && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-border p-6 h-48 dark:bg-surface-1" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-border p-6 h-[400px] dark:bg-surface-1" />
            <div className="bg-white rounded-xl border border-border p-6 h-[400px] dark:bg-surface-1" />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* REGULAR BROADCAST VIEW */}
      {/* ========================================================================= */}
      {!loadingStatus && activeMainTab === 'regular' && (
        <>
          {/* Quick Campaigns Segment Cards */}
          <div className="space-y-3 mb-6">
            <h3 className="text-[10px] font-black uppercase text-text-muted tracking-wider">
              Quick Segment Campaigns
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {[
                {
                  key: 'hot',
                  label: 'Hot Leads',
                  count: leads.filter(l => l.intent === 'hot' && !l.is_converted && !l.is_dnd).length,
                  color: 'text-danger bg-danger-bg border border-red-100 dark:border-red-950/20',
                  icon: AlertTriangle,
                },
                {
                  key: 'price_sensitive',
                  label: 'Price Sensitive',
                  count: leads.filter(l => l.is_price_sensitive && !l.is_converted && !l.is_dnd).length,
                  color: 'text-indigo-650 bg-indigo-50 border border-indigo-100 dark:border-indigo-950/20',
                  icon: CreditCard,
                },
                {
                  key: 'follow_up',
                  label: 'Follow-up Due',
                  count: leads.filter(l => (l.intent === 'follow_up' || l.manual_status === 'Follow-up Needed') && !l.is_converted && !l.is_dnd).length,
                  color: 'text-info bg-info-bg border border-blue-100 dark:border-blue-950/20',
                  icon: Clock,
                },
                {
                  key: 'digital_products',
                  label: 'Digital/SaaS',
                  count: leads.filter(l => l.products_mentioned && l.products_mentioned.length > 0 && !l.is_converted && !l.is_dnd).length,
                  color: 'text-success bg-success-bg border border-green-100 dark:border-green-950/20',
                  icon: Package,
                },
                {
                  key: 'cold',
                  label: 'Re-engage Cold',
                  count: leads.filter(l => l.intent === 'cold' && !l.is_converted && !l.is_dnd).length,
                  color: 'text-text-secondary bg-surface-2 border border-border dark:border-[#2A3942]',
                  icon: MessageSquare,
                }
              ].map((card) => {
                const Icon = card.icon;
                const isDisabled = leadsLoaded && card.count === 0;
                return (
                  <button
                    key={card.key}
                    disabled={isDisabled}
                    type="button"
                    onClick={() => handleQuickCampaignClick(card.key)}
                    className={`text-left p-4 rounded-xl border flex items-center gap-3.5 transition-all shadow-xs ${
                      isDisabled
                        ? 'opacity-40 cursor-not-allowed border-border bg-surface-0'
                        : 'cursor-pointer hover:border-brand/40 bg-white hover:shadow-md dark:bg-surface-1 border-border'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${card.color}`}>
                      <Icon size={16} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="block text-lg font-black text-text-primary leading-tight font-mono">
                        {leadsLoaded ? card.count : '...'}
                      </span>
                      <span className="block text-[10px] text-text-muted mt-0.5 font-bold uppercase tracking-wider truncate">{card.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Campaign Progress Monitor Banner */}
          {campaignProgress && (campaignProgress.running || campaignProgress.paused) && (
            <Card padding="md" className="border-brand/20 bg-brand-light/10 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-brand animate-pulse" />
                  <h4 className="text-xs font-black uppercase text-brand-dark tracking-wider">Active Broadcast Campaign</h4>
                </div>
                <div className="flex gap-2">
                  {campaignProgress.running ? (
                    <Button variant="outline" size="sm" onClick={() => handlePauseCampaign()} disabled={pausing}>
                      Pause
                    </Button>
                  ) : (
                    <Button variant="primary" size="sm" onClick={() => handleResumeCampaign()} disabled={resuming}>
                      Resume
                    </Button>
                  )}
                  <Button variant="danger" size="sm" onClick={() => handleStopCampaign()} disabled={stopping}>
                    Abort
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center font-mono font-bold text-xs">
                <div className="p-3 bg-white dark:bg-surface-2 rounded-lg border border-border">
                  <span className="text-[10px] text-text-muted font-sans font-black uppercase block">Sent</span>
                  <span className="text-base text-success mt-1 block">{campaignProgress.sent}</span>
                </div>
                <div className="p-3 bg-white dark:bg-surface-2 rounded-lg border border-border">
                  <span className="text-[10px] text-text-muted font-sans font-black uppercase block">Failed</span>
                  <span className="text-base text-danger mt-1 block">{campaignProgress.failed}</span>
                </div>
                <div className="p-3 bg-white dark:bg-surface-2 rounded-lg border border-border">
                  <span className="text-[10px] text-text-muted font-sans font-black uppercase block">Total Leads</span>
                  <span className="text-base text-text-primary mt-1 block">{campaignProgress.total}</span>
                </div>
              </div>
            </Card>
          )}

          {/* Section 2 - Two Columns layout */}
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            
            {/* LEFT COLUMN (55%) - Campaign Builder */}
            <div className="lg:w-[55%] w-full space-y-6">
              <Card padding="md" className="space-y-6">
                <h2 className="text-sm font-black text-text-primary border-b border-border pb-3 uppercase tracking-wider font-sans">
                  Campaign Builder
                </h2>

                {/* AI Toggle */}
                <div className="border border-brand/20 rounded-xl p-4 bg-brand-light/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="block text-xs font-black text-brand-dark flex items-center gap-1">
                        <Sparkles size={13} />
                        <span>AI Copywriter Personalisation</span>
                      </span>
                      <span className="block text-[10px] text-brand-dark/80 font-bold uppercase tracking-wider">
                        Tailor unique replies based on conversation logs
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUseAi(!useAi)}
                      className={`w-10 h-5.5 rounded-full p-0.5 transition-colors duration-250 cursor-pointer focus:outline-none flex items-center ${
                        useAi ? 'bg-brand justify-end' : 'bg-border justify-start'
                      }`}
                    >
                      <span className="w-4.5 h-4.5 rounded-full bg-white shadow-xs block" />
                    </button>
                  </div>

                  {useAi && (
                    <div className="space-y-1.5 pt-2 animate-fadeIn">
                      <label htmlFor="ai-instructions" className="block text-[9px] font-black text-brand-dark uppercase tracking-wider">
                        AI Copywriter Prompt / Context
                      </label>
                      <textarea
                        id="ai-instructions"
                        rows={3}
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        placeholder="Offer VPS trial setup, target their business goals..."
                        className="w-full text-xs border border-brand/20 bg-white rounded-lg p-2.5 outline-none font-semibold text-text-primary focus:border-brand"
                      />
                    </div>
                  )}
                </div>

                {/* Meta approved template select or textarea */}
                {useAi ? (
                  <div className="bg-brand-light/20 border border-brand/10 rounded-xl p-4 text-[11px] font-semibold text-brand-dark leading-relaxed">
                    AI Copywriter will inspect each client logs history and draft personalized WhatsApp follow-ups automatically.
                  </div>
                ) : (client?.connectionType === 'cloud_api' || (client?.whatsappAccessToken && (client?.whatsappWabaId || client?.whatsappPhoneNumberId))) ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-black text-text-primary uppercase tracking-wider">Approved WhatsApp Templates</h3>
                        <button
                          type="button"
                          onClick={() => fetchMetaTemplates(true)}
                          disabled={loadingMetaTemplates}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-surface-2 text-text-secondary rounded-lg transition-colors cursor-pointer flex items-center justify-center"
                          title="Refresh Templates"
                        >
                          <RefreshCw size={12} className={loadingMetaTemplates ? 'animate-spin' : ''} />
                        </button>
                      </div>
                      <a href="https://business.facebook.com/wa/manage/message-templates/" target="_blank" rel="noopener noreferrer" className="text-[10px] font-black text-brand uppercase tracking-wider hover:underline">
                        + New template
                      </a>
                    </div>
                    {loadingMetaTemplates ? (
                      <div className="text-xs text-text-subtle font-semibold italic">Fetching Meta approved templates...</div>
                    ) : metaTemplates.length === 0 ? (
                      <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl text-xs font-semibold text-amber-800 dark:text-amber-300 space-y-2">
                        {metaTemplatesReason === 'not_configured' ? (
                          <>
                            <p className="font-bold">⚠️ Cloud API Not Configured</p>
                            <p className="text-[11px] opacity-90">Please configure your credentials (Phone Number ID & Access Token) on the Status page to load approved templates.</p>
                          </>
                        ) : metaTemplatesReason === 'missing_waba_id' ? (
                          <>
                            <p className="font-bold">⚠️ Missing WABA ID</p>
                            <p className="text-[11px] opacity-90">Your WhatsApp Business Account ID (WABA ID) is not set. Go to the Status page and configure it to enable template sync.</p>
                          </>
                        ) : metaTemplatesReason === 'api_failed' ? (
                          <>
                            <p className="font-bold">❌ Meta API Connection Failed</p>
                            <p className="text-[11px] opacity-90">Meta Graph API returned an error. Click the refresh button above, or verify your access token is valid and has permissions.</p>
                          </>
                        ) : (
                          <>
                            <p className="font-bold">ℹ️ No Approved Templates Found</p>
                            <p className="text-[11px] opacity-90">No approved templates found for WABA ID: <span className="font-mono bg-white/60 dark:bg-black/30 px-1 rounded">{metaTemplatesInfo?.wabaId || 'Not set'}</span>. Ensure your templates are approved in Meta WhatsApp Manager under this account.</p>
                          </>
                        )}
                        
                        {metaTemplatesInfo?.connectionType === 'baileys' && (
                          <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                            🔄 Connection type mismatch (Baileys in DB, but has credentials). Automatic repair will run on a successful Meta API response.
                          </p>
                        )}

                        {metaTemplatesDebug && metaTemplatesDebug.length > 0 && (
                          <details className="mt-2 text-[10px] text-amber-900 dark:text-amber-400 cursor-pointer">
                            <summary className="font-bold hover:underline select-none">View technical diagnostic logs</summary>
                            <div className="mt-1 p-2 bg-black/5 dark:bg-black/40 rounded font-mono text-[9px] max-h-32 overflow-y-auto whitespace-pre-wrap leading-normal text-left">
                              {metaTemplatesDebug.map((log, idx) => (
                                <div key={idx} className="border-b border-black/5 dark:border-white/5 py-0.5 last:border-0">{log}</div>
                              ))}
                            </div>
                          </details>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="space-y-2 max-h-48 overflow-y-auto border border-border rounded-xl p-2 bg-surface-0">
                          {metaTemplates.map((template) => (
                            <div
                              key={template.name}
                              onClick={() => {
                                setSelectedMetaTemplate(template);
                                setTemplateVarMapping({}); // reset mappings when template changes
                                if (template.bodyText) setMessage(template.bodyText);
                              }}
                              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                selectedMetaTemplate?.name === template.name
                                  ? 'border-brand bg-brand-light/30'
                                  : 'border-border bg-white hover:border-brand/40'
                              }`}
                            >
                              <div className="flex justify-between items-center">
                                <span className="font-mono text-xs font-bold text-text-primary">{template.name}</span>
                                <span className="text-[9px] font-extrabold uppercase bg-success-bg text-success px-1.5 py-0.5 rounded">
                                  {template.status}
                                </span>
                              </div>
                              {template.bodyText && <p className="text-[11px] text-text-muted mt-1 truncate">{template.bodyText}</p>}
                            </div>
                          ))}
                        </div>
                        {/* Variable Mapping UI */}
                        {getTemplateVariables().length > 0 && (
                          <div className="border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 space-y-2.5">
                            <span className="block text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-wider">Variable Mapping</span>
                            {getTemplateVariables().map((v) => {
                              const current = templateVarMapping[v.key] || '';
                              const isCustom = current.startsWith('custom:');
                              return (
                                <div key={v.key} className="flex items-center gap-2 flex-wrap">
                                  <label className="text-[10px] font-bold text-text-muted w-40 shrink-0">{v.label}:</label>
                                  <select
                                    value={isCustom ? 'custom' : current}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (val === 'custom') {
                                        setTemplateVarMapping(prev => ({ ...prev, [v.key]: 'custom:' }));
                                      } else {
                                        setTemplateVarMapping(prev => ({ ...prev, [v.key]: val }));
                                      }
                                    }}
                                    className="text-[11px] border border-border rounded-lg px-2 py-1.5 bg-white dark:bg-surface-0 font-semibold text-text-primary flex-1 min-w-0"
                                  >
                                    <option value="">— Select field —</option>
                                    <option value="name">Lead / Contact Name</option>
                                    <option value="phone">Phone Number</option>
                                    <option value="custom">Custom Text…</option>
                                  </select>
                                  {isCustom && (
                                    <input
                                      type="text"
                                      maxLength={60}
                                      placeholder="Custom value (max 60 chars)"
                                      value={current.slice(7)}
                                      onChange={(e) => {
                                        const safe = sanitiseCustomVar(e.target.value);
                                        setTemplateVarMapping(prev => ({ ...prev, [v.key]: `custom:${safe}` }));
                                      }}
                                      className="text-[11px] border border-border rounded-lg px-2 py-1.5 bg-white dark:bg-surface-0 font-semibold text-text-primary flex-1 min-w-0"
                                    />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <p className="text-[10px] text-text-subtle font-black uppercase tracking-wider">
                          💡 Tip: If you don&apos;t see a new template, verify your WABA ID matches the one active in WhatsApp Manager.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <span className="block text-[10px] font-black text-text-muted uppercase tracking-wider">Templates</span>
                      <div className="flex flex-wrap gap-1.5">
                        {templates.map((tpl) => (
                          <button
                            key={tpl.name}
                            type="button"
                            onClick={() => handleApplyTemplate(tpl.text)}
                            className="bg-surface-2 hover:bg-border text-xs font-semibold px-3 py-1 rounded-full cursor-pointer text-text-secondary transition-colors"
                          >
                            {tpl.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="broadcast-msg" className="block text-[10px] font-black text-text-muted uppercase tracking-wider">
                        Broadcast Message Text
                      </label>
                      <textarea
                        id="broadcast-msg"
                        rows={5}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Write message text here..."
                        className="w-full text-xs border border-border bg-white dark:bg-surface-0 rounded-lg p-2.5 outline-none font-semibold text-text-primary focus:border-brand"
                      />
                    </div>
                  </div>
                )}

                {/* Target Audience */}
                <div className="space-y-2">
                  <span className="block text-[10px] font-black text-text-muted uppercase tracking-wider">Target Audience</span>
                  <div className="grid grid-cols-4 gap-2 text-[10px] font-bold uppercase tracking-wider text-center">
                    {[
                      { id: 'followup', label: 'Follow-ups' },
                      { id: 'all', label: 'All Active' },
                      { id: 'contact_group', label: 'Contact Group' },
                      { id: 'custom', label: 'Custom List' }
                    ].map((aud) => (
                      <button
                        key={aud.id}
                        type="button"
                        onClick={async () => {
                          setTargetAudience(aud.id as any);
                          if (aud.id === 'contact_group' && !contactsLoaded) {
                            await fetchContacts();
                            setContactsLoaded(true);
                          } else if (aud.id !== 'custom' && !leadsLoaded) {
                            await fetchLeads();
                            setLeadsLoaded(true);
                          }
                        }}
                        className={`py-2 rounded-lg border transition-all cursor-pointer ${
                          targetAudience === aud.id
                            ? 'border-brand bg-brand-light text-brand-dark dark:bg-brand/10'
                            : 'border-border bg-white hover:bg-surface-0 text-text-secondary'
                        }`}
                      >
                        {aud.label}
                      </button>
                    ))}
                  </div>

                  {targetAudience === 'contact_group' && (
                    <div className="pt-2 animate-fadeIn space-y-1.5">
                      <label htmlFor="group-tag-input" className="block text-[9px] font-black text-text-muted uppercase tracking-wider">
                        Enter Contact Group Tag Name
                      </label>
                      <input
                        id="group-tag-input"
                        type="text"
                        value={groupTag}
                        onChange={(e) => setGroupTag(e.target.value)}
                        placeholder="e.g. vip"
                        className="w-full text-xs border border-border bg-white dark:bg-surface-0 rounded-lg p-2.5 outline-none font-semibold text-text-primary focus:border-brand"
                      />
                    </div>
                  )}

                  {targetAudience === 'custom' && (
                    <div className="pt-2 animate-fadeIn space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label htmlFor="custom-phones" className="block text-[9px] font-black text-text-muted uppercase tracking-wider">
                          Enter Phone Numbers (one per line)
                        </label>
                        <button
                          type="button"
                          onClick={handleOpenLeadSelector}
                          className="text-[10px] font-black text-brand uppercase tracking-wider hover:underline cursor-pointer"
                        >
                          Select from leads
                        </button>
                      </div>
                      <textarea
                        id="custom-phones"
                        rows={3}
                        value={customNumbersText}
                        onChange={(e) => setCustomNumbersText(e.target.value)}
                        placeholder="919876543210&#10;918078004732"
                        className="w-full text-xs border border-border bg-white dark:bg-surface-0 rounded-lg p-2.5 outline-none font-mono font-semibold text-text-primary focus:border-brand"
                      />
                    </div>
                  )}

                  {(targetAudience === 'all' || targetAudience === 'contact_group') && (
                    <div className="pt-2 animate-fadeIn space-y-1.5">
                      <label htmlFor="batch-size" className="block text-[9px] font-black text-text-muted uppercase tracking-wider">
                        Recipients per broadcast (Batch Size)
                      </label>
                      <select
                        id="batch-size"
                        value={batchSize}
                        onChange={(e) => setBatchSize(e.target.value)}
                        className="w-full text-xs border border-border bg-white dark:bg-surface-0 rounded-lg p-2.5 outline-none font-semibold text-text-primary focus:border-brand"
                      >
                        <option value="100">100</option>
                        <option value="250">250</option>
                        <option value="500">500</option>
                        <option value="1000">1000</option>
                        <option value="2000">2000</option>
                      </select>
                      <p className="text-[10px] text-text-subtle font-medium">{batchSize} recipients will be selected</p>
                    </div>
                  )}
                </div>

                {/* Campaign Image */}
                <div className="space-y-1.5">
                  <span className="block text-[10px] font-black text-text-muted uppercase tracking-wider">Attach Campaign Media</span>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={campaignImage}
                      onChange={(e) => setCampaignImage(e.target.value)}
                      placeholder="Optional image url (png/jpg)"
                      className="flex-1 text-xs border border-border bg-white dark:bg-surface-0 rounded-lg p-2.5 outline-none font-semibold text-text-primary focus:border-brand"
                    />
                    <label className="bg-brand hover:bg-brand-dark text-white text-xs font-black px-4 py-3 rounded-lg shadow-sm cursor-pointer transition-all flex items-center gap-1.5 shrink-0 uppercase tracking-wide">
                      {uploadingCampaignImage ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                      <span>Upload</span>
                      <input type="file" accept="image/*" onChange={handleCampaignImageUpload} className="hidden" />
                    </label>
                  </div>
                  {campaignImage && (
                    <div className="relative w-20 h-20 border border-border rounded-lg overflow-hidden mt-2 bg-surface-0">
                      <img src={campaignImage} alt="Campaign Media Preview" className="w-full h-full object-cover" />
                      <button onClick={() => setCampaignImage('')} className="absolute top-1 right-1 bg-black/60 hover:bg-black text-white p-0.5 rounded-full cursor-pointer">
                        <X size={10} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Advanced send options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-border pt-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-wider block">
                      Message Delay interval
                    </label>
                    <div className="flex items-center gap-2 text-xs font-bold text-text-secondary">
                      <input
                        type="range"
                        min="2"
                        max="300"
                        value={delaySeconds}
                        onChange={(e) => setDelaySeconds(parseInt(e.target.value, 10))}
                        className="flex-grow accent-brand cursor-pointer"
                      />
                      <span className="font-mono w-14 text-right shrink-0">{delaySeconds}s</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-surface-0 dark:bg-surface-2 border border-border rounded-xl text-xs font-bold uppercase tracking-wider">
                    <span className="text-text-muted">Enforce Time window (9am-9pm)</span>
                    <button
                      type="button"
                      onClick={() => setRegularTimeWindow(!regularTimeWindow)}
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer flex items-center ${
                        regularTimeWindow ? 'bg-brand justify-end' : 'bg-border justify-start'
                      }`}
                    >
                      <span className="w-4 h-4 rounded-full bg-white block shadow-xs" />
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="border-t border-border pt-5 flex items-center justify-between">
                  <div className="text-xs text-text-muted font-bold font-mono">
                    Target: {getTargetLeadsCount()} leads (Est: {getEstimatedDuration(getTargetLeadsCount())} mins)
                  </div>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => {
                      // Validate all template variables are mapped before opening confirm modal
                      if (selectedMetaTemplate?.components) {
                        const vars = getTemplateVariables();
                        const unmapped = vars.filter(v => {
                          const m = templateVarMapping[v.key];
                          if (!m) return true;
                          if (m === 'custom:' || m === 'custom') return true; // empty custom
                          return false;
                        });
                        if (unmapped.length > 0) {
                          setError(`Map all template variables before sending: ${unmapped.map(v => v.label).join(', ')}`);
                          return;
                        }
                      }
                      setError('');
                      setShowConfirmModal(true);
                    }}
                    disabled={submitting || getTargetLeadsCount() === 0}
                  >
                    Launch Campaign &rarr;
                  </Button>
                </div>

              </Card>
            </div>

            {/* RIGHT COLUMN (45%) - Interactive Live WhatsApp Preview */}
            <div className="lg:w-[45%] w-full sticky top-16">
              <Card padding="none" className="overflow-hidden border border-border shadow-md">
                {/* Mock Phone Header */}
                <div className="bg-[#202C33] h-12 flex items-center px-4 justify-between select-none">
                  <div className="flex items-center gap-2">
                    <Avatar name={client?.businessName || 'Business'} size="sm" />
                    <div className="flex flex-col text-[#E9EDEF]">
                      <span className="text-xs font-semibold">{client?.businessName || 'Your Business'}</span>
                      <span className="text-[9px] text-[#8696A0] font-medium leading-none">Campaign Preview</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-[#AEBAC1] font-mono">9:41 AM</span>
                </div>

                {/* Mock Chat Body */}
                <div className="bg-[#EFEAE2] dark:bg-[#0B141A] min-h-[300px] p-4 flex flex-col justify-end">

                  {/* Outreach Mock Bubble */}
                  {(() => {
                    const { headerImageUrl, headerText, previewBody, footerText } = getTemplatePreviewData();
                    const hasImageHeader = selectedMetaTemplate?.components?.some(
                      (c: any) => c.type === 'HEADER' && c.format === 'IMAGE'
                    );
                    return (
                      <div className="flex justify-end mb-1">
                        <div className="relative bg-chat-outgoing text-text-primary max-w-[85%] rounded-[8px_0_8px_8px] shadow-xs text-xs font-sans overflow-hidden">
                          {/* Header image */}
                          {headerImageUrl ? (
                            <div className="mb-0 max-h-44 overflow-hidden">
                              <img src={headerImageUrl} alt="Template Header" className="w-full object-cover" />
                            </div>
                          ) : hasImageHeader ? (
                            <div className="flex items-center justify-center gap-2 bg-black/10 text-text-muted h-24 text-[10px] font-semibold">
                              <span>📷 Header image</span>
                            </div>
                          ) : null}
                          <div className="px-3.5 py-2.5">
                            {/* Header text */}
                            {headerText && (
                              <p className="font-bold text-xs mb-1 text-text-primary">{headerText}</p>
                            )}
                            {/* Body */}
                            <p className="whitespace-pre-wrap leading-relaxed">
                              {useAi
                                ? '✨ [AI Personalisation Active: unique message generated dynamically per recipient]'
                                : previewBody || 'Type message text or select template on the left to preview...'}
                            </p>
                            {/* Footer */}
                            {footerText && (
                              <p className="text-[10px] text-[#667781] mt-1.5">{footerText}</p>
                            )}
                            <div className="text-[9px] text-[#667781] text-right mt-1.5 flex items-center justify-end gap-1">
                              <span>9:41 am</span>
                              <span className="text-brand">✓✓</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                </div>
              </Card>
            </div>

          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* COLD OUTREACH VIEW */}
      {/* ========================================================================= */}
      {!loadingStatus && activeMainTab === 'cold' && (
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          
          {/* Left builder col (60%) */}
          <div className="lg:w-[60%] w-full space-y-6">
            
            {/* Progress Card if running */}
            {coldProgress && (coldProgress.running || coldProgress.paused || (coldProgress.sent + coldProgress.failed < coldProgress.total && coldProgress.total > 0)) && (
              <Card padding="md" className="border-brand/20 bg-brand-light/10 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-brand animate-pulse" />
                    <h4 className="text-xs font-black uppercase text-brand-dark tracking-wider">Active Cold Campaign</h4>
                  </div>
                  <div className="flex gap-2">
                    {coldProgress.running ? (
                      <Button variant="outline" size="sm" onClick={() => handlePauseColdCampaign()} disabled={pausing}>
                        Pause
                      </Button>
                    ) : (
                      <Button variant="primary" size="sm" onClick={() => handleResumeColdCampaign()} disabled={resuming}>
                        Resume
                      </Button>
                    )}
                    <Button variant="danger" size="sm" onClick={() => handleStopColdCampaign()} disabled={stoppingCold}>
                      Abort
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center font-mono font-bold text-xs">
                  <div className="p-3 bg-white dark:bg-surface-2 rounded-lg border border-border">
                    <span className="text-[10px] text-text-muted font-sans font-black uppercase block">Sent</span>
                    <span className="text-base text-success mt-1 block">{coldProgress.sent}</span>
                  </div>
                  <div className="p-3 bg-white dark:bg-surface-2 rounded-lg border border-border">
                    <span className="text-[10px] text-text-muted font-sans font-black uppercase block">Failed</span>
                    <span className="text-base text-danger mt-1 block">{coldProgress.failed}</span>
                  </div>
                  <div className="p-3 bg-white dark:bg-surface-2 rounded-lg border border-border">
                    <span className="text-[10px] text-text-muted font-sans font-black uppercase block">Total Leads</span>
                    <span className="text-base text-text-primary mt-1 block">{coldProgress.total}</span>
                  </div>
                </div>
              </Card>
            )}

            <Card padding="md" className="space-y-6">
              <div className="flex justify-between items-center border-b border-border pb-3">
                <h2 className="text-sm font-black text-text-primary uppercase tracking-wider font-sans">
                  CSV List Scraper Campaigns
                </h2>
                <Button variant="outline" size="sm" onClick={downloadSampleCSV} icon={<Download size={13} />}>
                  Sample CSV
                </Button>
              </div>

              {/* Upload Dropzone */}
              <div className="border-2 border-dashed border-border rounded-xl p-8 text-center bg-surface-0 hover:bg-surface-2 hover:border-brand/40 transition-colors cursor-pointer select-none relative">
                <input type="file" accept=".csv" onChange={handleCSVUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                <div className="flex flex-col items-center justify-center gap-3">
                  <div className="p-3 bg-brand-light text-brand rounded-full">
                    <FileSpreadsheet size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-text-primary">
                      {csvFileName ? `Selected: ${csvFileName}` : 'Drag & drop leads CSV file here or browse'}
                    </p>
                    <p className="text-[10px] text-text-subtle mt-1 uppercase font-semibold">
                      Supports raw scraped map files or lead grids (max 5MB)
                    </p>
                  </div>
                </div>
              </div>

              {csvLeads.length > 0 && (
                <div className="space-y-4 pt-2 border-t border-border animate-fadeIn">
                  <span className="block text-[10px] font-black text-text-muted uppercase tracking-wider">CSV Field Column Mapping</span>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-[9px] font-black text-text-muted uppercase block mb-1">Phone Column</label>
                      <select value={selectedPhoneColumn} onChange={e => setSelectedPhoneColumn(e.target.value)} className="w-full border border-border bg-white rounded-lg px-2.5 py-1.5 font-semibold text-text-primary">
                        {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-text-muted uppercase block mb-1">Business Name Column</label>
                      <select value={selectedNameColumn} onChange={e => setSelectedNameColumn(e.target.value)} className="w-full border border-border bg-white rounded-lg px-2.5 py-1.5 font-semibold text-text-primary">
                        {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="bg-brand-light/30 border border-brand/20 rounded-xl p-4 grid grid-cols-2 gap-4 text-xs font-bold text-brand-dark">
                    <div>Total Loaded Leads: <span className="font-mono text-sm font-black">{parsedLeadsStats.total}</span></div>
                    <div>Invalid Phones: <span className="font-mono text-sm font-black text-danger">{parsedLeadsStats.invalid}</span></div>
                  </div>
                </div>
              )}

              {/* Message setup */}
              <div className="space-y-4 pt-2 border-t border-border">
                {client?.connectionType === 'cloud_api' ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-black text-text-primary uppercase tracking-wider">Approved WhatsApp Templates</h3>
                        <button
                          type="button"
                          onClick={() => fetchMetaTemplates(true)}
                          disabled={loadingMetaTemplates}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-surface-2 text-text-secondary rounded-lg transition-colors cursor-pointer flex items-center justify-center"
                          title="Refresh Templates"
                        >
                          <RefreshCw size={12} className={loadingMetaTemplates ? 'animate-spin' : ''} />
                        </button>
                      </div>
                      <a href="https://business.facebook.com/wa/manage/message-templates/" target="_blank" rel="noopener noreferrer" className="text-[10px] font-black text-brand uppercase tracking-wider hover:underline">
                        + New template
                      </a>
                    </div>

                    {loadingMetaTemplates ? (
                      <div className="text-xs text-text-subtle font-semibold italic">Fetching Meta approved templates...</div>
                    ) : metaTemplates.length === 0 ? (
                      <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl text-xs font-semibold text-amber-800 dark:text-amber-300 space-y-2">
                        {metaTemplatesReason === 'not_configured' ? (
                          <>
                            <p className="font-bold">⚠️ Cloud API Not Configured</p>
                            <p className="text-[11px] opacity-90">Please configure your credentials (Phone Number ID & Access Token) on the Status page to load approved templates.</p>
                          </>
                        ) : metaTemplatesReason === 'missing_waba_id' ? (
                          <>
                            <p className="font-bold">⚠️ Missing WABA ID</p>
                            <p className="text-[11px] opacity-90">Your WhatsApp Business Account ID (WABA ID) is not set. Go to the Status page and configure it to enable template sync.</p>
                          </>
                        ) : metaTemplatesReason === 'api_failed' ? (
                          <>
                            <p className="font-bold">❌ Meta API Connection Failed</p>
                            <p className="text-[11px] opacity-90">Meta Graph API returned an error. Click the refresh button above, or verify your access token is valid and has permissions.</p>
                          </>
                        ) : (
                          <>
                            <p className="font-bold">ℹ️ No Approved Templates Found</p>
                            <p className="text-[11px] opacity-90">No approved templates found for WABA ID: <span className="font-mono bg-white/60 dark:bg-black/30 px-1 rounded">{metaTemplatesInfo?.wabaId || 'Not set'}</span>. Ensure your templates are approved in Meta WhatsApp Manager under this account.</p>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="space-y-2 max-h-48 overflow-y-auto border border-border rounded-xl p-2 bg-surface-0">
                          {metaTemplates.map((template) => (
                            <div
                              key={template.name}
                              onClick={() => {
                                setColdSelectedMetaTemplate(template);
                                setColdTemplateVarMapping({}); // reset mappings when template changes
                                if (template.bodyText) setColdMessage(template.bodyText);
                              }}
                              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                coldSelectedMetaTemplate?.name === template.name
                                  ? 'border-brand bg-brand-light/30'
                                  : 'border-border bg-white hover:border-brand/40'
                              }`}
                            >
                              <div className="flex justify-between items-center">
                                <span className="font-mono text-xs font-bold text-text-primary">{template.name}</span>
                                <div className="flex items-center gap-1.5">
                                  {template.category && (
                                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded tracking-wide ${
                                      template.category === 'MARKETING'
                                        ? 'bg-brand-light/40 text-brand-dark'
                                        : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                                    }`}>
                                      {template.category}
                                    </span>
                                  )}
                                  <span className="text-[9px] font-extrabold uppercase bg-success-bg text-success px-1.5 py-0.5 rounded">
                                    {template.status}
                                  </span>
                                </div>
                              </div>
                              {template.bodyText && <p className="text-[11px] text-text-muted mt-1 truncate">{template.bodyText}</p>}
                            </div>
                          ))}
                        </div>

                        {/* Category Warning Badge for non-Marketing templates */}
                        {coldSelectedMetaTemplate && coldSelectedMetaTemplate.category !== 'MARKETING' && (
                          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl text-[11px] font-semibold text-amber-800 dark:text-amber-300 leading-relaxed animate-fadeIn">
                            ⚠️ <strong>Warning:</strong> The selected template has category <strong>{coldSelectedMetaTemplate.category}</strong>. Using non-Marketing templates for unsolicited cold outreach may violate Meta policies and risk phone number restriction.
                          </div>
                        )}

                        {/* Variable Mapping UI */}
                        {getTemplateVariables(coldSelectedMetaTemplate).length > 0 && (
                          <div className="border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 space-y-2.5">
                            <span className="block text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-wider">Variable Mapping</span>
                            {getTemplateVariables(coldSelectedMetaTemplate).map((v) => {
                              const current = coldTemplateVarMapping[v.key] || '';
                              const isCustom = current.startsWith('custom:');
                              return (
                                <div key={v.key} className="flex items-center gap-2 flex-wrap">
                                  <label className="text-[10px] font-bold text-text-muted w-40 shrink-0">{v.label}:</label>
                                  <select
                                    value={isCustom ? 'custom' : current}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (val === 'custom') {
                                        setColdTemplateVarMapping(prev => ({ ...prev, [v.key]: 'custom:' }));
                                      } else {
                                        setColdTemplateVarMapping(prev => ({ ...prev, [v.key]: val }));
                                      }
                                    }}
                                    className="text-[11px] border border-border rounded-lg px-2 py-1.5 bg-white dark:bg-surface-0 font-semibold text-text-primary flex-1 min-w-0"
                                  >
                                    <option value="">— Select field —</option>
                                    <option value="name">Lead / Contact Name</option>
                                    <option value="phone">Phone Number</option>
                                    <option value="custom">Custom Text…</option>
                                  </select>
                                  {isCustom && (
                                    <input
                                      type="text"
                                      maxLength={60}
                                      placeholder="Custom value (max 60 chars)"
                                      value={current.slice(7)}
                                      onChange={(e) => {
                                        const safe = sanitiseCustomVar(e.target.value);
                                        setColdTemplateVarMapping(prev => ({ ...prev, [v.key]: `custom:${safe}` }));
                                      }}
                                      className="text-[11px] border border-border rounded-lg px-2 py-1.5 bg-white dark:bg-surface-0 font-semibold text-text-primary flex-1 min-w-0"
                                    />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Header Image Upload UI (if template uses header image) */}
                        {coldSelectedMetaTemplate?.components?.some((c: any) => c.type === 'HEADER' && c.format === 'IMAGE') && (
                          <div className="space-y-1.5 pt-1">
                            <label className="block text-[10px] font-black text-text-muted uppercase tracking-wider">
                              Campaign Header Image
                            </label>
                            <div className="flex gap-2 items-center">
                              <input
                                type="text"
                                placeholder="https://example.com/image.jpg"
                                value={coldCampaignImage}
                                onChange={(e) => setColdCampaignImage(e.target.value)}
                                className="flex-1 text-xs border border-border bg-white dark:bg-surface-0 rounded-lg p-2 outline-none font-semibold text-text-primary focus:border-brand"
                              />
                              <label className="bg-surface-2 hover:bg-border text-text-secondary hover:text-text-primary border border-border text-xs font-bold px-3 py-2 rounded-lg cursor-pointer transition-colors flex items-center justify-center gap-1.5">
                                {coldUploadingCampaignImage ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                                <span>Upload</span>
                                <input type="file" accept="image/*" onChange={handleColdCampaignImageUpload} className="hidden" />
                              </label>
                            </div>
                            {coldCampaignImage && (
                              <div className="relative w-32 h-20 rounded-lg overflow-hidden border border-border group mt-2">
                                <img src={coldCampaignImage} alt="Cold Campaign Media Preview" className="w-full h-full object-cover" />
                                <button onClick={() => setColdCampaignImage('')} className="absolute top-1 right-1 bg-black/60 hover:bg-black text-white p-0.5 rounded-full cursor-pointer">
                                  <X size={10} />
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        <p className="text-[10px] text-text-subtle font-black uppercase tracking-wider">
                          💡 Tip: If you don&apos;t see a new template, verify your WABA ID matches the one active in WhatsApp Manager.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="block text-[10px] font-black text-text-muted uppercase tracking-wider">Outreach Message Text</span>
                      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase text-text-secondary">
                        <span>Multiple templates (split-testing)</span>
                        <button
                          type="button"
                          onClick={() => setUseMultipleTemplates(!useMultipleTemplates)}
                          className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer flex items-center ${
                            useMultipleTemplates ? 'bg-brand justify-end' : 'bg-border justify-start'
                          }`}
                        >
                          <span className="w-4 h-4 rounded-full bg-white block shadow-xs" />
                        </button>
                      </div>
                    </div>

                    {useMultipleTemplates ? (
                      <div className="space-y-3 pt-1.5">
                        {coldTemplates.map((tplText, idx) => (
                          <div key={idx} className="flex gap-2 items-start animate-fadeIn">
                            <textarea
                              rows={2}
                              value={tplText}
                              onChange={(e) => handleTemplateTextChange(idx, e.target.value)}
                              placeholder={`Template #${idx + 1}...`}
                              className="flex-1 text-xs border border-border bg-white rounded-lg p-2 outline-none font-semibold text-text-primary"
                            />
                            <button type="button" onClick={() => handleRemoveTemplateField(idx)} className="p-2 hover:bg-danger-bg text-text-subtle hover:text-danger rounded-lg transition-colors cursor-pointer">
                              <Trash2 size={15} />
                            </button>
                          </div>
                        ))}
                        <Button variant="outline" size="sm" onClick={handleAddTemplateField} icon={<Plus size={13} />}>Add template variation</Button>
                      </div>
                    ) : (
                      <textarea
                        rows={4}
                        value={coldMessage}
                        onChange={(e) => setColdMessage(e.target.value)}
                        placeholder="Enter outreach template text here... Use {business_name} variable for personalization."
                        className="w-full text-xs border border-border bg-white dark:bg-surface-0 rounded-lg p-2.5 outline-none font-semibold text-text-primary focus:border-brand"
                      />
                    )}
                  </>
                )}
              </div>

              {/* Settings sliders */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-wider block">
                    Message Delay interval
                  </label>
                  <div className="flex items-center gap-2 text-xs font-bold text-text-secondary">
                    <input
                      type="range"
                      min="2"
                      max="400"
                      value={coldDelaySeconds}
                      onChange={(e) => setColdDelaySeconds(parseInt(e.target.value, 10))}
                      className="flex-grow accent-brand cursor-pointer"
                    />
                    <span className="font-mono w-14 text-right shrink-0">{coldDelaySeconds}s</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-wider block">
                    Daily Limit
                  </label>
                  <div className="flex items-center gap-2 text-xs font-bold text-text-secondary">
                    <input
                      type="range"
                      min="5"
                      max="1000"
                      value={coldDailyLimit}
                      onChange={(e) => setColdDailyLimit(parseInt(e.target.value, 10))}
                      className="flex-grow accent-brand cursor-pointer"
                    />
                    <span className="font-mono w-14 text-right shrink-0">{coldDailyLimit}/day</span>
                  </div>
                </div>
              </div>

              <div className="pt-5 border-t border-border flex items-center justify-between">
                <span className="text-[10px] text-text-subtle font-extrabold uppercase">CSV Leads: {mappedLeadsPreview.filter(l => l.isValid).length}</span>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setShowColdConfirmModal(true)}
                  disabled={submittingCold || mappedLeadsPreview.filter(l => l.isValid).length === 0}
                >
                  Launch outreach campaign &rarr;
                </Button>
              </div>

            </Card>

          </div>

          {/* Right Preview Column (40%) */}
          <div className="lg:w-[40%] w-full sticky top-16 space-y-6">
            <Card padding="none" className="overflow-hidden border border-border shadow-md">
              <div className="bg-[#202C33] h-12 flex items-center px-4 justify-between select-none text-[#E9EDEF]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center font-bold text-xs">C</div>
                  <span className="text-xs font-semibold">Cold Lead Preview</span>
                </div>
                <span className="text-[9px] text-[#8696A0] font-mono">Mock Preview</span>
              </div>
              <div className="bg-[#EFEAE2] dark:bg-[#0B141A] min-h-[220px] p-4 flex flex-col justify-end">
                
                {(() => {
                  if (client?.connectionType === 'cloud_api') {
                    const { headerImageUrl, headerText, previewBody, footerText } = getTemplatePreviewData(
                      coldSelectedMetaTemplate,
                      coldTemplateVarMapping,
                      coldCampaignImage,
                      coldMessage
                    );
                    const hasImageHeader = coldSelectedMetaTemplate?.components?.some(
                      (c: any) => c.type === 'HEADER' && c.format === 'IMAGE'
                    );
                    return (
                      <div className="flex justify-end mb-1 w-full">
                        <div className="relative bg-chat-outgoing text-text-primary max-w-[85%] rounded-[8px_0_8px_8px] shadow-xs text-xs font-sans overflow-hidden">
                          {/* Header image */}
                          {headerImageUrl ? (
                            <div className="mb-0 max-h-44 overflow-hidden">
                              <img src={headerImageUrl} alt="Template Header" className="w-full object-cover" />
                            </div>
                          ) : hasImageHeader ? (
                            <div className="flex items-center justify-center gap-2 bg-black/10 text-text-muted h-24 text-[10px] font-semibold">
                              <span>📷 Header image</span>
                            </div>
                          ) : null}
                          <div className="px-3.5 py-2.5">
                            {/* Header text */}
                            {headerText && (
                              <p className="font-bold text-xs mb-1 text-text-primary">{headerText}</p>
                            )}
                            {/* Body */}
                            <p className="whitespace-pre-wrap leading-relaxed">
                              {previewBody || 'Select template on the left to preview...'}
                            </p>
                            {/* Footer */}
                            {footerText && (
                              <p className="text-[10px] text-[#667781] mt-1.5">{footerText}</p>
                            )}
                            <div className="text-[9px] text-[#667781] text-right mt-1.5 flex items-center justify-end gap-1 font-mono">
                              <span>9:41 am</span>
                              <span className="text-brand">✓✓</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div className="flex justify-end mb-1">
                        <div className="relative bg-chat-outgoing text-text-primary max-w-[85%] rounded-[8px_0_8px_8px] px-3.5 py-2.5 shadow-xs text-xs font-sans">
                          <p className="whitespace-pre-wrap leading-relaxed">
                            {useMultipleTemplates
                              ? interpolatePreviewText(coldTemplates[0], { business_name: 'Example Business' })
                              : interpolatePreviewText(coldMessage, { business_name: 'Example Business' }) || 'Type outreach message text...'}
                          </p>
                          <div className="text-[9px] text-[#667781] text-right mt-1.5">
                            <span>9:41 am</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                })()}

              </div>
            </Card>

            <Card padding="md" className="space-y-3.5 bg-surface-0 border-border">
              <h4 className="text-[10px] font-black uppercase text-text-primary tracking-wider">CSV Structure Information</h4>
              <p className="text-xs text-text-muted font-semibold leading-relaxed">
                Ensure your Excel/CSV has columns named `phone` and `business_name` to map variables accurately. Invalid phone records will be skipped automatically during runtime.
              </p>
            </Card>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* CAMPAIGN HISTORY LIST */}
      {/* ========================================================================= */}
      <div className="pt-6 border-t border-border">
        <div className="flex justify-between items-center mb-4 select-none">
          <h3 className="text-xs font-black uppercase text-text-muted tracking-wider">Campaign History & Reports</h3>
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setRefreshingHistory(true);
                fetchCampaignHistory().finally(() => setRefreshingHistory(false));
              }}
              disabled={refreshingHistory}
              className="text-xs font-bold text-brand hover:underline cursor-pointer flex items-center gap-1 disabled:opacity-50"
            >
              <RefreshCw size={12} className={refreshingHistory ? 'animate-spin' : ''} />
              <span>Fetch Latest Data</span>
            </button>
            <button
              onClick={() => setIsHistoryCollapsed(!isHistoryCollapsed)}
              className="text-xs font-bold text-text-secondary hover:text-text-primary cursor-pointer flex items-center gap-1"
            >
              <span>{isHistoryCollapsed ? 'Show History' : 'Hide History'}</span>
              {isHistoryCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>
          </div>
        </div>

        {!isHistoryCollapsed && (
          <Card padding="none" className="overflow-hidden border border-border shadow-xs animate-fadeIn">
            {loadingHistory ? (
              <div className="p-8 text-center text-xs text-text-subtle font-semibold italic">Fetching historical reports...</div>
            ) : campaignHistory.length === 0 ? (
              <div className="p-8 text-center text-xs text-text-subtle italic">No past campaigns found in history logs.</div>
            ) : (
              <div className="divide-y divide-border">
                {campaignHistory.slice(0, showAllHistory ? undefined : 6).map((camp) => (
                  <div key={camp.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white hover:bg-surface-0 dark:bg-surface-1 dark:hover:bg-surface-2 transition-colors">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-text-primary">Campaign #{camp.id.slice(0, 6)}</span>
                        <Badge variant={camp.status === 'completed' ? 'success' : camp.status === 'running' ? 'warning' : 'default'} size="sm">
                          {camp.status}
                        </Badge>
                        <Badge variant="info" size="sm">
                          {camp.job_type === 'cold_outreach' ? 'Cold outreach' : 'Regular broadcast'}
                        </Badge>
                      </div>
                      <p className="text-xs text-text-muted font-semibold leading-relaxed truncate max-w-lg">
                        {camp.message || 'Custom split testing templates'}
                      </p>
                      <span className="block text-[10px] text-text-subtle">{formatHistoryDate(camp.created_at)}</span>
                      {camp.statusCounts && (
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] font-bold text-text-muted mt-1 select-none">
                          <span className="flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                            Sent: {camp.statusCounts.sent}
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            Delivered: {camp.statusCounts.delivered}
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Read: {camp.statusCounts.read}
                          </span>
                          {camp.statusCounts.failed > 0 && (
                            <span className="flex items-center gap-1 text-red-600 font-bold">
                              <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                              Failed: {camp.statusCounts.failed}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs font-bold shrink-0">
                      <div className="text-right font-mono">
                        <span className="text-success">{camp.statusCounts?.sent ?? camp.sent} ✓</span>
                        <span className="text-text-muted mx-1">/</span>
                        <span className="text-text-primary">{camp.total_leads}</span>
                      </div>

                      {camp.status !== 'completed' && camp.job_type === 'cold_outreach' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleDirectResumeCampaign(camp.id, camp.job_type as any)}
                          disabled={resumingCampaignId === camp.id}
                        >
                          {resumingCampaignId === camp.id ? 'Resuming...' : 'Resume Campaign'}
                        </Button>
                      )}

                      <button
                        onClick={() => handleDeleteCampaign(camp.id, camp.job_type as any)}
                        disabled={deletingCampaignId === camp.id}
                        className="p-2 hover:bg-danger-bg text-text-subtle hover:text-danger rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {campaignHistory.length > 6 && (
              <div className="p-3 border-t border-border bg-surface-0 text-center select-none">
                <button
                  onClick={() => setShowAllHistory(!showAllHistory)}
                  className="text-xs font-bold text-text-secondary hover:text-text-primary hover:underline cursor-pointer"
                >
                  {showAllHistory ? 'Show Less' : 'Show All Campaign Logs'}
                </button>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* ========================================== */}
      {/* CONFIRMATION MODALS                        */}
      {/* ========================================== */}

      {/* Regular Confirm Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-border p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="text-sm font-black text-text-primary uppercase tracking-wider font-sans border-b border-border pb-2">Confirm Launch</h3>
            <p className="text-xs text-text-secondary leading-relaxed font-semibold">
              This will launch the broadcast campaign to <strong>{getTargetLeadsCount()} leads</strong>. Messages will be sent with a delay of {delaySeconds}s. Continue?
            </p>
            <div className="flex justify-end gap-2 text-xs font-black uppercase">
              <Button variant="outline" size="sm" onClick={() => setShowConfirmModal(false)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleLaunchCampaign} disabled={submitting}>
                {submitting ? 'Launching...' : 'Confirm & Launch'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cold Confirm Modal */}
      {showColdConfirmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-border p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="text-sm font-black text-text-primary uppercase tracking-wider font-sans border-b border-border pb-2">Confirm Launch</h3>
            <p className="text-xs text-text-secondary leading-relaxed font-semibold">
              This will initiate cold outreach to <strong>{mappedLeadsPreview.filter(l => l.isValid).length} mapped leads</strong>. Daily limit of {coldDailyLimit} messages will apply. Continue?
            </p>
            <div className="flex justify-end gap-2 text-xs font-black uppercase">
              <Button variant="outline" size="sm" onClick={() => setShowColdConfirmModal(false)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleLaunchColdCampaign} disabled={submittingCold}>
                {submittingCold ? 'Launching...' : 'Confirm & Launch'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Lead Selector Modal */}
      {showLeadSelector && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-border p-6 max-w-lg w-full flex flex-col max-h-[80vh] shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="text-sm font-black text-text-primary uppercase tracking-wider font-sans">Select Recipients from Leads</h3>
              <button
                type="button"
                onClick={() => {
                  setShowLeadSelector(false);
                  setSelectedLeadPhones([]);
                  setLeadSearchQuery('');
                }}
                className="p-1 hover:bg-gray-100 text-gray-500 rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Search Input */}
            <input
              type="text"
              value={leadSearchQuery}
              onChange={(e) => setLeadSearchQuery(e.target.value)}
              placeholder="Search leads by name or phone..."
              className="w-full text-xs border border-border bg-white rounded-lg p-2.5 outline-none font-semibold text-text-primary focus:border-brand"
            />

            {/* Leads List */}
            <div className="flex-1 overflow-y-auto min-h-[200px] border border-border rounded-xl divide-y divide-border">
              {leads.filter(l => 
                (l.name && l.name.toLowerCase().includes(leadSearchQuery.toLowerCase())) ||
                (l.phone && l.phone.includes(leadSearchQuery))
              ).length === 0 ? (
                <div className="p-8 text-center text-xs text-text-muted font-semibold">No matching leads found.</div>
              ) : (
                leads.filter(l => 
                  (l.name && l.name.toLowerCase().includes(leadSearchQuery.toLowerCase())) ||
                  (l.phone && l.phone.includes(leadSearchQuery))
                ).map((lead) => {
                  const isChecked = selectedLeadPhones.includes(lead.phone);
                  return (
                    <label
                      key={lead.phone}
                      className="flex items-center gap-3 p-3 hover:bg-surface-0 cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setSelectedLeadPhones(prev => prev.filter(p => p !== lead.phone));
                          } else {
                            setSelectedLeadPhones(prev => [...prev, lead.phone]);
                          }
                        }}
                        className="rounded border-border text-brand focus:ring-brand h-4 w-4"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="block text-xs font-bold text-text-primary truncate">{lead.name || lead.phone}</span>
                        <span className="block text-[10px] text-text-muted font-mono">+{lead.phone}</span>
                      </div>
                      {lead.intent && (
                        <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                          lead.intent === 'hot' ? 'bg-danger-bg text-danger' :
                          lead.intent === 'warm' ? 'bg-[#EEF2F6] text-[#3B82F6]' :
                          'bg-success-bg text-success'
                        }`}>
                          {lead.intent}
                        </span>
                      )}
                    </label>
                  );
                })
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex justify-between items-center pt-3 border-t border-border text-xs font-black uppercase">
              <button
                type="button"
                onClick={() => {
                  const allPhones = leads.map(l => l.phone);
                  if (selectedLeadPhones.length === allPhones.length) {
                    setSelectedLeadPhones([]);
                  } else {
                    setSelectedLeadPhones(allPhones);
                  }
                }}
                className="text-text-secondary hover:text-text-primary cursor-pointer hover:underline"
              >
                {selectedLeadPhones.length === leads.length ? 'Deselect All' : 'Select All'}
              </button>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowLeadSelector(false);
                    setSelectedLeadPhones([]);
                    setLeadSearchQuery('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={selectedLeadPhones.length === 0}
                  onClick={() => {
                    const existing = customNumbersText.trim();
                    const next = selectedLeadPhones.join('\n');
                    setCustomNumbersText(existing ? `${existing}\n${next}` : next);
                    setShowLeadSelector(false);
                    setSelectedLeadPhones([]);
                    setLeadSearchQuery('');
                  }}
                >
                  Add leads
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
