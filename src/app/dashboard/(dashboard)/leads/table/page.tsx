'use client';

import React, { useEffect, useState, Suspense, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ListPageSkeleton } from '@/components/ui/PageLoader';
import {
  Users,
  Search,
  Download,
  RefreshCw,
  Eye,
  MessageSquare,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  UserPlus,
  BookOpen,
  Phone,
  ShieldAlert,
  Sparkles,
  FileSpreadsheet,
  X,
  Calendar,
  Send,
  User,
  Info,
  Loader2,
  Edit3,
  Trash2,
  CreditCard,
  Clock,
  ArrowLeft,
  Menu
} from 'lucide-react';
import { parseMessageContent } from '@/lib/mediaMessage';

const CATEGORY_LABELS: Record<string, { label: string; style: string }> = {
  local_services: { label: 'Local Services', style: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
  ecommerce: { label: 'Ecommerce & Retail', style: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  real_estate: { label: 'Real Estate', style: 'bg-sky-50 text-sky-700 border-sky-100' },
  professional: { label: 'Professional Services', style: 'bg-amber-50 text-amber-700 border-amber-100' },
  scalecraft: { label: 'Digital/SaaS', style: 'bg-[#E8F5E9] text-[#1B5E20] border-green-100' },
};

interface Lead {
  phone: string;
  client_id: string;
  category?: string;
  name: string;
  intent: 'hot' | 'warm' | 'follow_up' | 'cold' | 'not_interested' | 'spam' | 'converted';
  summary: string;
  session_file: string;
  total_messages: number;
  user_messages: number;
  agent_messages: number;
  first_message_at: string;
  last_message_at: string;
  days_since_last: number;
  language: string;
  intent_score: number;
  buying_signals: string[];
  negative_signals: string[];
  follow_up_signals: string[];
  products_mentioned: string[];
  shared_phone: string | null;
  shared_name: string | null;
  shared_location: string | null;
  is_converted: boolean;
  order_product: string | null;
  order_amount: number | null;
  order_date: string | null;
  order_id: string | null;
  is_dnd: boolean;
  follow_up_date: string | null;
  follow_up_sent: boolean;
  notes: string | null;
  manual_status: string | null;
  last_analyzed_at: string;
  updated_at: string;
  conversation_duration_mins?: number;
  follow_up_score?: number;
  follow_up_reason?: string;
  is_price_sensitive?: boolean;
  price_signals_found?: string[];
  customer_questions?: number;
  last_message_from?: string;
  follow_up_locked_at?: string | null;
  follow_up_sent_at?: string | null;
  follow_up_message?: string | null;
  follow_up_count?: number;
  fullConversation?: any[];
}

const APPS_SCRIPT_CODE = `function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var leads = payload.leads;
    if (!leads || !Array.isArray(leads)) {
      return ContentService.createTextOutput(JSON.stringify({success: false, error: 'No leads data found'}))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    var sh = SpreadsheetApp.getActiveSpreadsheet();
    var tabsNeeded = ['All Leads', 'Follow-up Needed', 'Converted', 'Analytics'];
    
    // Create worksheets if they don't exist
    tabsNeeded.forEach(function(title) {
      if (!sh.getSheetByName(title)) {
        sh.insertSheet(title);
      }
    });
    
    var headers = ['Phone', 'Name', 'Intent', 'Language', 'Messages', 'Last Contact', 'Summary', 'Notes', 'Converted'];
    
    // 1. Update All Leads
    var sheetAll = sh.getSheetByName('All Leads');
    sheetAll.clear();
    var allRows = [headers];
    leads.forEach(function(l) {
      allRows.push([
        l.phone || '', l.name || '', l.intent || '', l.language || 'english',
        l.total_messages || 0, l.last_message_at || '', l.summary || '', l.notes || '', l.is_converted ? 'Yes' : 'No'
      ]);
    });
    sheetAll.getRange(1, 1, allRows.length, headers.length).setValues(allRows);
    
    return ContentService.createTextOutput(JSON.stringify({success: true}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({success: false, error: err.message}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

function formatPhoneNumber(phone: string): string {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return `+91 ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`;
  }
  if (cleaned.startsWith('971') && cleaned.length === 12) {
    return `+971 ${cleaned.slice(3, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`;
  }
  return `+${cleaned}`;
}

function getFollowUpDueText(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const diffMs = Date.now() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) {
    return 'today';
  }
  if (diffDays === 1) {
    return 'yesterday';
  }
  return `${diffDays} days ago`;
}

function getAvatarColor(seed: string) {
  const colors = [
    'bg-blue-100 text-blue-600',
    'bg-purple-100 text-purple-600',
    'bg-green-100 text-green-600',
    'bg-amber-100 text-amber-600',
    'bg-pink-100 text-pink-600',
    'bg-teal-100 text-teal-600',
    'bg-red-100 text-red-600',
    'bg-indigo-100 text-indigo-600',
  ];
  const hash = (seed || '').split('').reduce(
    (acc, char) => acc + char.charCodeAt(0), 0
  );
  return colors[hash % colors.length];
}

function getInitials(name: string, phone: string) {
  if (name && name !== '~') {
    return name.split(' ')
      .map(w => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  return (phone || '').slice(-2);
}

function LeadsTablePageInner() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [sentConfirmations, setSentConfirmations] = useState<Record<string, string>>({});
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [isEditingFollowup, setIsEditingFollowup] = useState<Record<string, boolean>>({});
  const [triggeringFollowup, setTriggeringFollowup] = useState(false);

  const [syncing, setSyncing] = useState(false);
  const [syncResults, setSyncResults] = useState<any | null>(null);
  const [needsAnalysis, setNeedsAnalysis] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Loading states for actions
  const [updatingConverted, setUpdatingConverted] = useState<Record<string, boolean>>({});
  const [updatingDnd, setUpdatingDnd] = useState<Record<string, boolean>>({});

  // Custom Alert / Confirm states
  const [alertData, setAlertData] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [confirmData, setConfirmData] = useState<{ message: string; resolve: (val: boolean) => void } | null>(null);

  const myAlert = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setAlertData({ message: msg, type });
  };

  const myConfirm = (msg: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmData({ message: msg, resolve });
    });
  };

  // Expandable Chat Log Cache
  const [conversations, setConversations] = useState<Record<string, any[]>>({});
  const [loadingConv, setLoadingConv] = useState<Record<string, boolean>>({});

  // Navigation / Filter States
  const [activeTabs, setActiveTabs] = useState<Record<string, 'conversation' | 'followup_history' | 'actions'>>({});
  const [analyzingLead, setAnalyzingLead] = useState<Record<string, boolean>>({});
  const [followUpDate, setFollowUpDate] = useState<Record<string, string>>({});
  const [savingFollowUp, setSavingFollowUp] = useState<Record<string, boolean>>({});
  const [businessType, setBusinessType] = useState('product');
  const [businessName, setBusinessName] = useState('');

  // Search, Filters & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<'30days' | 'all'>('30days');
  const [sortField, setSortField] = useState<string>('active'); // active | messages | score
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Expanding row state
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Quick Action states
  const [quickMsgText, setQuickMsgText] = useState<Record<string, string>>({});
  const [sendingMsg, setSendingMsg] = useState<Record<string, boolean>>({});
  const [savingNote, setSavingNote] = useState<Record<string, boolean>>({});
  const [quickNotesText, setQuickNotesText] = useState<Record<string, string>>({});

  // Selection states
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);

  // Sheet config state
  const [sheetId, setSheetId] = useState('');
  const [savingSheet, setSavingSheet] = useState(false);
  const [showSheetInstructions, setShowSheetInstructions] = useState(false);

  // smart campaign modal
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [campaignStep, setCampaignStep] = useState(1);
  const [campaignAudience, setCampaignAudience] = useState('hot');
  const [campaignProgress, setCampaignProgress] = useState(false);
  const [generatedMessages, setGeneratedMessages] = useState<Record<string, string>>({});
  const [editingMessages, setEditingMessages] = useState<Record<string, string>>({});
  const [delaySeconds, setDelaySeconds] = useState(120);
  const [timeWindowOnly, setTimeWindowOnly] = useState(true);
  const [maxBatchSize, setMaxBatchSize] = useState(50);
  const [broadcastLaunching, setBroadcastLaunching] = useState(false);

  // Coupon Campaign states
  const [showCouponCampaignModal, setShowCouponCampaignModal] = useState(false);
  const [couponStep, setCouponStep] = useState(1);
  const [includeFollowup, setIncludeFollowup] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(15);
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [activeCoupons, setActiveCoupons] = useState<any[]>([]);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponGenerating, setCouponGenerating] = useState(false);
  const [couponMessages, setCouponMessages] = useState<Record<string, string>>({});
  const [couponEditingMessages, setCouponEditingMessages] = useState<Record<string, string>>({});
  const [couponDelaySeconds, setCouponDelaySeconds] = useState(150);
  const [couponTimeWindowOnly, setCouponTimeWindowOnly] = useState(true);
  const [couponLaunching, setCouponLaunching] = useState(false);

  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [editingPreviews, setEditingPreviews] = useState<Record<string, string>>({});
  const [loadingPreview, setLoadingPreview] = useState<Record<string, boolean>>({});
  const [processingAction, setProcessingAction] = useState<Record<string, boolean>>({});

  const handleGeneratePreview = async (phone: string) => {
    setLoadingPreview(prev => ({ ...prev, [phone]: true }));
    try {
      const res = await fetch('/api/dashboard/leads/followup/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'preview', phone })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate preview');
      setPreviews(prev => ({ ...prev, [phone]: data.message }));
      setEditingPreviews(prev => ({ ...prev, [phone]: data.message }));
    } catch (err: any) {
      myAlert(err.message, 'error');
    } finally {
      setLoadingPreview(prev => ({ ...prev, [phone]: false }));
    }
  };

  const handleSendFollowUp = async (phone: string) => {
    setProcessingAction(prev => ({ ...prev, [phone]: true }));
    try {
      const customMsg = editingPreviews[phone];
      const res = await fetch('/api/dashboard/leads/followup/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', phone, customMessage: customMsg })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send follow-up');

      const nowStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      setSentConfirmations(prev => ({ ...prev, [phone]: `Sent at ${nowStr.toLowerCase()}` }));

      myAlert('Follow-up message sent successfully!', 'success');
      await fetchLeadsData(false);
    } catch (err: any) {
      myAlert(err.message, 'error');
    } finally {
      setProcessingAction(prev => ({ ...prev, [phone]: false }));
    }
  };

  const handleSkipFollowUp = async (phone: string) => {
    const confirmed = await myConfirm('Are you sure you want to skip this follow-up? It will not be sent automatically.');
    if (!confirmed) return;

    setProcessingAction(prev => ({ ...prev, [phone]: true }));
    try {
      const res = await fetch('/api/dashboard/leads/followup/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'skip', phone })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to skip');

      setSentConfirmations(prev => ({ ...prev, [phone]: 'Skipped follow-up' }));
      myAlert('Follow-up marked as skipped.', 'success');
      await fetchLeadsData(false);
    } catch (err: any) {
      myAlert(err.message, 'error');
    } finally {
      setProcessingAction(prev => ({ ...prev, [phone]: false }));
    }
  };

  const fetchLeadsData = async (showSkeleton = true, triggerSync = false) => {
    if (showSkeleton) setLoading(true);
    setError('');
    try {
      const url = triggerSync ? '/api/dashboard/leads?sync=true' : '/api/dashboard/leads';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to retrieve CRM leads data.');
      const data = await res.json();
      if (data && Array.isArray(data.leads)) {
        setLeads(data.leads);
        setNeedsAnalysis(!!data.needs_analysis);
      } else if (Array.isArray(data)) {
        setLeads(data);
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with database.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSheetConfig = async () => {
    try {
      const res = await fetch('/api/dashboard/client');
      if (res.ok) {
        const data = await res.json();
        if (data.googleSheetId) setSheetId(data.googleSheetId);
        if (data.businessType) setBusinessType(data.businessType);
        if (data.businessName) setBusinessName(data.businessName);
      }
    } catch { }
  };

  const fetchConversation = async (phone: string) => {
    setLoadingConv((prev) => ({ ...prev, [phone]: true }));
    try {
      const res = await fetch(`/api/dashboard/leads/${phone}`);
      if (!res.ok) throw new Error('Failed to load chat history.');
      const data = await res.json();
      if (data && Array.isArray(data.messages)) {
        setConversations((prev) => ({ ...prev, [phone]: data.messages }));
      }
    } catch (err: any) {
      console.error('Fetch conversation error:', err.message);
    } finally {
      setLoadingConv((prev) => ({ ...prev, [phone]: false }));
    }
  };

  const setLeadTab = (phone: string, tab: 'conversation' | 'followup_history' | 'actions') => {
    setActiveTabs((prev) => ({ ...prev, [phone]: tab }));
  };

  const handleAnalyzeWithAI = async (phone: string) => {
    setAnalyzingLead((prev) => ({ ...prev, [phone]: true }));
    try {
      const res = await fetch('/api/dashboard/leads/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gemini AI analysis failed.');

      fetchLeadsData(false);
      myAlert('AI Analysis completed successfully!', 'success');
    } catch (err: any) {
      myAlert(err.message || 'Error running AI analysis.', 'error');
    } finally {
      setAnalyzingLead((prev) => ({ ...prev, [phone]: false }));
    }
  };

  const handleScheduleFollowUp = async (phone: string) => {
    const timeStr = followUpDate[phone];
    if (!timeStr) return;
    setSavingFollowUp((prev) => ({ ...prev, [phone]: true }));
    try {
      const res = await fetch(`/api/dashboard/leads/${phone}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ follow_up_date: timeStr, status: 'Follow-up Needed' }),
      });
      if (!res.ok) throw new Error('Failed to set follow-up');

      setLeads((prev) =>
        prev.map((l) =>
          l.phone === phone ? { ...l, follow_up_date: timeStr, manual_status: 'Follow-up Needed' } : l
        )
      );
      myAlert(`Follow-up scheduled successfully for ${new Date(timeStr).toLocaleString('en-IN')}! 📅`, 'success');
    } catch (err: any) {
      myAlert(err.message, 'error');
    } finally {
      setSavingFollowUp((prev) => ({ ...prev, [phone]: false }));
    }
  };

  const handleCancelFollowUp = async (phone: string) => {
    if (!confirm('Are you sure you want to cancel the scheduled auto-followup for this lead?')) return;
    setSavingFollowUp((prev) => ({ ...prev, [phone]: true }));
    try {
      const res = await fetch(`/api/dashboard/leads/${phone}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ follow_up_date: null, follow_up_sent: true }),
      });
      if (!res.ok) throw new Error('Failed to cancel follow-up');

      setLeads((prev) =>
        prev.map((l) =>
          l.phone === phone ? { ...l, follow_up_date: null, follow_up_sent: true } : l
        )
      );
      myAlert('Scheduled follow-up cancelled successfully! 🚫', 'success');
    } catch (err: any) {
      myAlert(err.message, 'error');
    } finally {
      setSavingFollowUp((prev) => ({ ...prev, [phone]: false }));
    }
  };

  const handleSaveNotesOnBlur = async (phone: string, notesText: string) => {
    setSavingNote((prev) => ({ ...prev, [phone]: true }));
    try {
      const res = await fetch(`/api/dashboard/leads/${phone}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: notesText }),
      });
      if (!res.ok) throw new Error('Failed to save notes');
      setLeads((prev) =>
        prev.map((l) =>
          l.phone === phone ? { ...l, notes: notesText } : l
        )
      );
    } catch (err: any) {
      console.error('Blur note save failed:', err.message);
    } finally {
      setSavingNote((prev) => ({ ...prev, [phone]: false }));
    }
  };

  const handleSaveSheetConfig = async () => {
    setSavingSheet(true);
    try {
      const res = await fetch('/api/dashboard/client', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ googleSheetId: sheetId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save Google Sheet configuration.');
      }
      myAlert('Google Sheet configuration saved successfully! 🎉', 'success');
    } catch (err: any) {
      myAlert(err.message || 'Error saving settings.', 'error');
    } finally {
      setSavingSheet(false);
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/dashboard/leads', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to trigger sync script.');

      setMessage('Leads database synchronized and pushed to Google Sheets successfully!');
      setTimeout(() => setMessage(''), 5000);
      fetchLeadsData(false);
    } catch (err: any) {
      setError(err.message || 'Sync operation failed.');
    } finally {
      setSyncing(false);
    }
  };

  const handleAnalyzeAllLeads = async () => {
    setSyncing(true);
    setSyncResults(null);
    try {
      const res = await fetch('/api/dashboard/leads/analyze-all', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analyzing all leads failed.');

      setSyncResults(data);
      setNeedsAnalysis(false);
      fetchLeadsData(false);
    } catch (err: any) {
      setError(err.message || 'Analysis operation failed.');
    } finally {
      setSyncing(false);
    }
  };

  const handleRefreshLeads = async () => {
    const confirmed = await myConfirm('This will clear your leads cache and rebuild everything fresh from current conversation logs. Continue?');
    if (!confirmed) return;
    setSyncing(true);
    setSyncResults(null);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/dashboard/leads/analyze-all?clear=true', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Refreshing leads failed.');

      setSyncResults(data);
      setNeedsAnalysis(false);
      fetchLeadsData(false);
      setMessage('Leads cache cleared and rebuilt successfully!');
      setTimeout(() => setMessage(''), 5000);
    } catch (err: any) {
      myAlert(err.message || 'Refresh operation failed.', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleQuickSend = async (phone: string) => {
    const text = quickMsgText[phone];
    if (!text || !text.trim()) return;

    setSendingMsg((prev) => ({ ...prev, [phone]: true }));
    try {
      const res = await fetch(`/api/dashboard/leads/${phone}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_message', text }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send WhatsApp message.');
      }

      setQuickMsgText((prev) => ({ ...prev, [phone]: '' }));
      myAlert('Message sent successfully!', 'success');
      fetchConversation(phone);
    } catch (err: any) {
      myAlert(err.message || 'Error delivering chat message.', 'error');
    } finally {
      setSendingMsg((prev) => ({ ...prev, [phone]: false }));
    }
  };

  const handleMarkConverted = async (phone: string, isConverted: boolean) => {
    setUpdatingConverted((prev) => ({ ...prev, [phone]: true }));
    try {
      const res = await fetch(`/api/dashboard/leads/${phone}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_converted: isConverted, intent: isConverted ? 'converted' : 'warm' }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update lead status.');
      }

      setLeads((prev) =>
        prev.map((l) =>
          l.phone === phone ? { ...l, is_converted: isConverted, intent: isConverted ? 'converted' : 'warm' } : l
        )
      );
      myAlert(isConverted ? 'Lead marked as Converted!' : 'Lead reverted.', 'success');
    } catch (err: any) {
      myAlert(err.message || 'Error updating status.', 'error');
    } finally {
      setUpdatingConverted((prev) => ({ ...prev, [phone]: false }));
    }
  };

  const handleMarkDnd = async (phone: string, isDnd: boolean) => {
    if (isDnd) {
      const confirmed = await myConfirm('Are you sure you want to add this contact to Do-Not-Disturb (DND)? They will be excluded from all campaigns.');
      if (!confirmed) return;
    }
    setUpdatingDnd((prev) => ({ ...prev, [phone]: true }));
    try {
      const res = await fetch(`/api/dashboard/leads/${phone}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_dnd: isDnd }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update DND status.');
      }

      setLeads((prev) =>
        prev.map((l) =>
          l.phone === phone ? { ...l, is_dnd: isDnd } : l
        )
      );
      myAlert(isDnd ? 'Contact added to DND list 🚫' : 'DND status removed.', 'success');
    } catch (err: any) {
      myAlert(err.message || 'Error updating status.', 'error');
    } finally {
      setUpdatingDnd((prev) => ({ ...prev, [phone]: false }));
    }
  };

  const handleBulkDnd = async () => {
    if (selectedLeads.length === 0) return;
    const confirmed = await myConfirm(`Mark ${selectedLeads.length} leads as DND?`);
    if (!confirmed) return;
    try {
      for (const phone of selectedLeads) {
        await fetch(`/api/dashboard/leads/${phone}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_dnd: true }),
        });
      }
      setLeads((prev) =>
        prev.map((l) =>
          selectedLeads.includes(l.phone) ? { ...l, is_dnd: true } : l
        )
      );
      setSelectedLeads([]);
      myAlert('Selected leads marked as DND.', 'success');
    } catch (err: any) {
      myAlert('Error occurred during bulk DND.', 'error');
    }
  };

  const handleExportCSV = () => {
    const listToExport = selectedLeads.length > 0
      ? leads.filter(l => selectedLeads.includes(l.phone))
      : leads;

    if (listToExport.length === 0) return;
    const headers = [
      'Name',
      'Phone',
      'Intent',
      'Language',
      'Last Active',
      'Total Messages',
      'Summary',
      'Converted',
      'DND',
      'Notes'
    ];

    const rows = listToExport.map((l) => [
      `"${(l.name || l.phone).replace(/"/g, '""')}"`,
      l.phone,
      l.intent,
      l.language,
      l.last_message_at || '',
      l.total_messages,
      `"${(l.summary || '').replace(/"/g, '""')}"`,
      l.is_converted ? 'Yes' : 'No',
      l.is_dnd ? 'Yes' : 'No',
      `"${(l.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `scalecraft_crm_leads_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleStatCardClick = (filter: string) => {
    if (statusFilter === filter) {
      setStatusFilter('all');
    } else {
      setStatusFilter(filter);
    }
    setCurrentPage(1);
  };

  const parseDateToTimestamp = (dateVal: any): number => {
    if (!dateVal) return 0;
    if (typeof dateVal === 'number') {
      return dateVal < 10000000000 ? dateVal * 1000 : dateVal;
    }
    const str = String(dateVal).trim();
    if (!str) return 0;
    if (/^\d+(\.\d+)?$/.test(str)) {
      const num = parseFloat(str);
      return num < 10000000000 ? num * 1000 : num;
    }
    const parsed = new Date(str).getTime();
    return isNaN(parsed) ? 0 : parsed;
  };

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      (lead.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.phone.includes(searchQuery) ||
      (lead.summary || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'hot' && lead.intent === 'hot' && !lead.is_converted && !lead.is_dnd) ||
      (statusFilter === 'warm' && lead.intent === 'warm' && !lead.is_converted && !lead.is_dnd) ||
      (statusFilter === 'price_sensitive' && lead.is_price_sensitive && !lead.is_converted && !lead.is_dnd) ||
      (statusFilter === 'followup' && (lead.intent === 'follow_up' || lead.manual_status === 'Follow-up Needed') && !lead.is_converted && !lead.is_dnd) ||
      (statusFilter === 'converted' && lead.is_converted) ||
      (statusFilter === 'dnd' && lead.is_dnd) ||
      (statusFilter === 'spam' && lead.intent === 'spam');

    const matchesCategory =
      categoryFilter === 'all' || lead.category === categoryFilter;

    let matchesTime = true;
    if (timeFilter === '30days') {
      if (lead.last_message_at) {
        const lastMessageDate = parseDateToTimestamp(lead.last_message_at);
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        matchesTime = lastMessageDate >= thirtyDaysAgo;
      } else {
        matchesTime = false;
      }
    }

    return matchesSearch && matchesStatus && matchesCategory && matchesTime;
  });

  const sortedLeads = [...filteredLeads].sort((a, b) => {
    if (sortField === 'active') {
      const dateA = parseDateToTimestamp(a.last_message_at);
      const dateB = parseDateToTimestamp(b.last_message_at);
      return dateB - dateA;
    }
    if (sortField === 'messages') {
      return (b.total_messages || 0) - (a.total_messages || 0);
    }
    if (sortField === 'score') {
      return (b.intent_score || 0) - (a.intent_score || 0);
    }
    return 0;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedLeads.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedLeads.length / itemsPerPage);

  const toggleExpandRow = (phone: string, lead: Lead) => {
    if (expandedRow === phone) {
      setExpandedRow(null);
    } else {
      setExpandedRow(phone);
      setQuickNotesText((prev) => ({ ...prev, [phone]: lead.notes || '' }));
      setFollowUpDate((prev) => ({
        ...prev,
        [phone]: lead.follow_up_date ? new Date(lead.follow_up_date).toISOString().slice(0, 16) : ''
      }));
      if (!conversations[phone]) {
        fetchConversation(phone);
      }
    }
  };

  const toggleSelectLead = (phone: string) => {
    setSelectedLeads(prev =>
      prev.includes(phone) ? prev.filter(p => p !== phone) : [...prev, phone]
    );
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLeads(currentItems.map(item => item.phone));
    } else {
      setSelectedLeads([]);
    }
  };

  const getCampaignRecipients = () => {
    let baseList: Lead[] = [];
    if (campaignAudience === 'custom') {
      baseList = leads.filter(l => selectedLeads.includes(l.phone));
    } else if (campaignAudience === 'hot') {
      baseList = leads.filter(l => l.intent === 'hot');
    } else if (campaignAudience === 'warm') {
      baseList = leads.filter(l => l.intent === 'warm');
    } else if (campaignAudience === 'followup') {
      baseList = leads.filter(l => l.intent === 'follow_up' || l.manual_status === 'Follow-up Needed');
    } else if (campaignAudience === 'cold') {
      baseList = leads.filter(l => l.days_since_last >= 30 && l.days_since_last <= 90);
    }
    const recipients = baseList.filter(l => !l.is_converted && !l.is_dnd);
    const excluded = baseList.length - recipients.length;
    return { recipients, excluded };
  };

  const handleGenerateCampaignMessages = async () => {
    const { recipients } = getCampaignRecipients();
    if (recipients.length === 0) return;
    const targetBatch = recipients.slice(0, maxBatchSize);
    setCampaignProgress(true);
    try {
      const res = await fetch('/api/dashboard/leads/generate-followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads: targetBatch })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate personalized messages.');

      const msgsMap: Record<string, string> = {};
      const editMap: Record<string, string> = {};
      data.results.forEach((item: any) => {
        msgsMap[item.phone] = item.message;
        editMap[item.phone] = item.message;
      });
      setGeneratedMessages(msgsMap);
      setEditingMessages(editMap);
      setCampaignStep(2);
    } catch (err: any) {
      myAlert(err.message, 'error');
    } finally {
      setCampaignProgress(false);
    }
  };

  const handleLaunchCampaign = async () => {
    const { recipients } = getCampaignRecipients();
    const targetBatch = recipients.slice(0, maxBatchSize);
    const phoneList = targetBatch.map(r => r.phone);
    if (phoneList.length === 0) return;

    setBroadcastLaunching(true);
    try {
      const res = await fetch('/api/dashboard/broadcast/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetAudience: 'custom',
          customPhones: phoneList,
          delaySeconds: delaySeconds,
          personalizedMessages: editingMessages,
          useAi: false,
          message: 'Personalized follow-up campaign.'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to trigger campaign broadcast.');

      myAlert(`Campaign broadcast successfully launched for ${phoneList.length} leads!`, 'success');
      setShowCampaignModal(false);
      setSelectedLeads([]);
    } catch (err: any) {
      myAlert(err.message, 'error');
    } finally {
      setBroadcastLaunching(false);
    }
  };

  const getStatsCounts = () => {
    const stats = { hot: 0, warm: 0, followup: 0, converted: 0, dnd: 0, priceSensitive: 0 };
    leads.forEach(l => {
      if (l.is_dnd) stats.dnd++;
      else if (l.is_converted) stats.converted++;
      else {
        if (l.is_price_sensitive) stats.priceSensitive++;
        if (l.intent === 'hot') stats.hot++;
        if (l.intent === 'warm') stats.warm++;
        if (l.intent === 'follow_up' || l.manual_status === 'Follow-up Needed') stats.followup++;
      }
    });
    return stats;
  };

  const fetchActiveCoupons = async () => {
    setCouponLoading(true);
    try {
      const res = await fetch('/api/dashboard/leads/coupons');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.coupons)) {
          setActiveCoupons(data.coupons);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleCopyCoupon = (coupon: any) => {
    setCouponCode(coupon.code);
    setDiscountType(coupon.type === 'percentage' ? 'percentage' : 'fixed');
    setDiscountValue(coupon.value);
  };

  const getCouponRecipients = () => {
    let baseList = leads.filter(l => l.is_price_sensitive);
    if (includeFollowup) {
      const fupList = leads.filter(l => (l.intent === 'follow_up' || l.manual_status === 'Follow-up Needed') && !l.is_price_sensitive);
      baseList = [...baseList, ...fupList];
    }
    return baseList.filter(l => !l.is_converted && !l.is_dnd);
  };

  const handleGenerateCouponCampaignMessages = async () => {
    const recipients = getCouponRecipients();
    if (recipients.length === 0) return;

    setCouponGenerating(true);
    try {
      const payloadLeads = await Promise.all(
        recipients.slice(0, 50).map(async (l) => {
          let chatLogs = conversations[l.phone];
          if (!chatLogs) {
            try {
              const res = await fetch(`/api/dashboard/leads/${l.phone}`);
              if (res.ok) {
                const data = await res.json();
                chatLogs = data.messages || [];
              }
            } catch { }
          }
          const last5 = (chatLogs || l.fullConversation || [])
            .filter((m: any) => m.role !== 'system')
            .slice(-5)
            .map((m: any) => ({
              sender: m.role === 'assistant' ? 'agent' : 'customer',
              text: m.content || m.text || ''
            }));

          return {
            phone: l.phone,
            last_5_messages: last5,
            price_signals: l.price_signals_found || []
          };
        })
      );

      const res = await fetch('/api/dashboard/leads/generate-coupon-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leads: payloadLeads,
          couponCode,
          discountType,
          discountValue,
          expiryDate,
          businessName
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate campaign messages.');

      if (data.success && Array.isArray(data.messages)) {
        const newMsgs: Record<string, string> = {};
        data.messages.forEach((m: any) => {
          newMsgs[m.phone] = m.message;
        });
        setCouponMessages(newMsgs);
        setCouponEditingMessages({ ...newMsgs });
        setCouponStep(3);
      }
    } catch (err: any) {
      myAlert(err.message, 'error');
    } finally {
      setCouponGenerating(false);
    }
  };

  const handleLaunchCouponCampaign = async () => {
    const recipients = getCouponRecipients();
    const targetBatch = recipients.slice(0, 50);
    const phoneList = targetBatch.map(r => r.phone);
    if (phoneList.length === 0) return;

    setCouponLaunching(true);
    try {
      const res = await fetch('/api/dashboard/broadcast/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetAudience: 'custom',
          customPhones: phoneList,
          delaySeconds: couponDelaySeconds,
          personalizedMessages: couponEditingMessages,
          useAi: false,
          message: `Personalized coupon campaign (${couponCode}).`
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to launch coupon campaign.');

      myAlert(`Coupon campaign successfully launched for ${phoneList.length} leads!`, 'success');
      setShowCouponCampaignModal(false);
    } catch (err: any) {
      myAlert(err.message, 'error');
    } finally {
      setCouponLaunching(false);
    }
  };

  const formatRelativeTime = (dateStr: any) => {
    if (!dateStr) return 'Never';
    try {
      const ts = parseDateToTimestamp(dateStr);
      if (ts === 0) return 'Never';
      const diffMs = Date.now() - ts;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays <= 0) {
        const diffHours = Math.floor(diffMs / (1000 * 60 * 65));
        if (diffHours <= 0) {
          const diffMins = Math.floor(diffMs / (1000 * 60));
          return diffMins <= 1 ? 'Just now' : `${diffMins}m ago`;
        }
        return `${diffHours}h ago`;
      }
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      const d = new Date(ts);
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    } catch {
      return String(dateStr);
    }
  };

  const handleTriggerAutoFollowup = async () => {
    setTriggeringFollowup(true);
    try {
      const res = await fetch('/api/dashboard/trigger-followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error('Failed to trigger follow-ups');
      const data = await res.json();
      if (data.processed > 0) {
        myAlert(`Successfully sent ${data.processed} pending follow-ups!`, 'success');
        fetchLeadsData();
      } else {
        myAlert(data.message || 'No pending follow-ups found.', 'info');
      }
    } catch (err: any) {
      myAlert(err.message, 'error');
    } finally {
      setTriggeringFollowup(false);
    }
  };

  useEffect(() => {
    fetchLeadsData(true, true);
    fetchSheetConfig();
  }, []);

  const statsBreakdown = getStatsCounts();

  return (
    <div className="space-y-6 font-sans pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 pb-2 border-b border-gray-100">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="text-green-700" />
            <span>Leads Table CRM</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Spreadsheet-based CRM view of leads database and follow-up activities.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard/leads"
            className="flex items-center gap-1.5 px-3.5 py-2 border border-gray-200 text-xs font-bold rounded-lg bg-white hover:bg-gray-50 text-gray-700 cursor-pointer shadow-3xs"
          >
            <MessageSquare size={13} />
            <span>Chat Workspace View</span>
          </Link>
          <button
            type="button"
            onClick={handleSyncNow}
            disabled={syncing}
            className="flex items-center space-x-1.5 bg-[#1B5E20] hover:bg-[#144317] disabled:bg-gray-300 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
            <span>{syncing ? 'Syncing...' : 'Sync Sheet'}</span>
          </button>
          <button
            type="button"
            onClick={handleTriggerAutoFollowup}
            disabled={syncing || triggeringFollowup}
            className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            {triggeringFollowup ? <Loader2 size={12} className="animate-spin" /> : <Clock size={12} />}
            <span>Run Follow-up</span>
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={leads.length === 0}
            className="flex items-center space-x-1.5 bg-white border border-[#E0E0E0] hover:bg-[#F8FBF8] text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Download size={12} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-[#FFEBEE] border border-red-100 text-[#C62828] text-xs font-semibold p-4 rounded-xl flex items-center space-x-2">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {message && (
        <div className="bg-[#E8F5E9] border border-green-100 text-[#2E7D32] text-xs font-semibold p-4 rounded-xl flex items-center space-x-2">
          <CheckCircle size={16} />
          <span>{message}</span>
        </div>
      )}

      {/* Filters Table */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col md:flex-row items-center gap-3.5 shadow-3xs">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by phone, name, or keywords in summary..."
            className="w-full text-xs border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 bg-gray-50/50 focus:outline-none focus:border-blue-600 focus:bg-white text-gray-900"
          />
        </div>

        <div className="w-full md:w-48">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:border-blue-600 font-semibold cursor-pointer text-gray-900"
          >
            <option value="all">All Intent Statuses</option>
            <option value="hot">HOT</option>
            <option value="warm">WARM</option>
            <option value="price_sensitive">Price Sensitive</option>
            <option value="followup">Follow-up Needed</option>
            <option value="converted">Converted</option>
            <option value="spam">Spam / Dead</option>
            <option value="dnd">DND List</option>
          </select>
        </div>

        <div className="w-full md:w-48">
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:border-blue-600 font-semibold cursor-pointer text-gray-900"
          >
            <option value="all">All Categories</option>
            <option value="local_services">Local Services</option>
            <option value="ecommerce">Ecommerce & Retail</option>
            <option value="real_estate">Real Estate</option>
            <option value="professional">Professional Services</option>
            <option value="scalecraft">Digital/SaaS</option>
          </select>
        </div>

        <div className="w-full md:w-40">
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value)}
            className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:border-blue-600 font-semibold cursor-pointer text-gray-900"
          >
            <option value="active">Sort: Last Active</option>
            <option value="messages">Sort: Messages</option>
            <option value="score">Sort: Intent Score</option>
          </select>
        </div>
      </div>

      {loading ? (
        <ListPageSkeleton rows={8} />
      ) : sortedLeads.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-3xs">
          <Users className="mx-auto text-gray-300 mb-3" size={40} />
          <h3 className="text-sm font-bold text-gray-900">No Leads Found</h3>
          <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">Try adjusting your filters or search keywords.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-3xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-150 text-[11px] font-semibold text-gray-500 uppercase tracking-wider h-11 bg-gray-50/50">
                  <th className="px-4 py-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedLeads.length === currentItems.length && currentItems.length > 0}
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                      className="cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-4 py-3 w-[200px]">Lead Name / Phone</th>
                  <th className="px-4 py-3 w-[120px]">Intent Status</th>
                  <th className="px-4 py-3 w-[120px]">Category</th>
                  <th className="px-4 py-3 w-[90px]">Last Active</th>
                  <th className="px-4 py-3 w-[50px] text-center">Msgs</th>
                  <th className="px-4 py-3">Summary</th>
                  <th className="px-4 py-3 text-right w-[80px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                {currentItems.map((lead) => {
                  const isExpanded = expandedRow === lead.phone;
                  const activeTab = activeTabs[lead.phone] || 'conversation';

                  return (
                    <React.Fragment key={lead.phone}>
                      <tr className={`hover:bg-gray-50/50 transition-colors h-[54px] ${isExpanded ? 'bg-gray-50/20' : ''}`}>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={selectedLeads.includes(lead.phone)}
                            onChange={() => toggleSelectLead(lead.phone)}
                            className="cursor-pointer rounded border-gray-300 text-blue-600"
                          />
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-900">
                          <div>{lead.name || lead.shared_name || 'No Name'}</div>
                          <div className="text-[10px] text-gray-400 font-mono mt-0.5">{formatPhoneNumber(lead.phone)}</div>
                        </td>
                        <td className="px-4 py-3 font-medium">
                          <span className={`capitalize ${
                            lead.is_dnd ? 'text-red-400' :
                            lead.is_converted ? 'text-green-500 font-bold' :
                            lead.intent === 'hot' ? 'text-red-500 font-bold' :
                            lead.intent === 'warm' ? 'text-amber-500 font-bold' : 'text-gray-500'
                          }`}>
                            {lead.is_dnd ? 'DND' : lead.is_converted ? 'Converted' : lead.intent}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {lead.category ? (
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${CATEGORY_LABELS[lead.category]?.style || 'bg-gray-50 border-gray-100'}`}>
                              {CATEGORY_LABELS[lead.category]?.label || lead.category}
                            </span>
                          ) : (
                            <span className="text-gray-300 italic">None</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-400 font-medium">
                          {formatRelativeTime(lead.last_message_at)}
                        </td>
                        <td className="px-4 py-3 text-center font-bold">
                          {lead.total_messages}
                        </td>
                        <td className="px-4 py-3 text-gray-500 truncate max-w-xs">
                          {lead.summary || 'General Enquiry'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => toggleExpandRow(lead.phone, lead)}
                            className="p-1 hover:bg-gray-100 text-gray-500 hover:text-blue-600 rounded-lg cursor-pointer transition-colors w-8 h-8 flex items-center justify-center inline-flex"
                          >
                            <Edit3 size={15} />
                          </button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr>
                          <td colSpan={8} className="px-6 py-4 bg-gray-50/50 border-y border-gray-150">
                            <div className="text-xs space-y-4">
                              <div className="flex border-b border-gray-200 mb-4 space-x-6 text-[10px] font-bold uppercase tracking-wider">
                                <button
                                  type="button"
                                  onClick={() => setLeadTab(lead.phone, 'conversation')}
                                  className={`pb-2 border-b-2 transition-all cursor-pointer ${activeTab === 'conversation' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400'}`}
                                >
                                  Chat logs
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setLeadTab(lead.phone, 'actions')}
                                  className={`pb-2 border-b-2 transition-all cursor-pointer ${activeTab === 'actions' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400'}`}
                                >
                                  Notes & Actions
                                </button>
                              </div>

                              {activeTab === 'conversation' && (
                                <div className="bg-white border border-gray-200 rounded-xl p-3.5 max-h-64 overflow-y-auto space-y-3 font-sans shadow-3xs">
                                  {loadingConv[lead.phone] ? (
                                    <p className="text-xs text-gray-400 italic text-center py-4">Loading conversations...</p>
                                  ) : !conversations[lead.phone] || conversations[lead.phone].length === 0 ? (
                                    <p className="text-xs text-gray-400 italic text-center py-4">No chat history records.</p>
                                  ) : (
                                    conversations[lead.phone].map((msg: any, idx: number) => {
                                      const isAgent = msg.sender === 'agent';
                                      const parsed = parseMessageContent(msg.text || '');
                                      return (
                                        <div key={idx} className={`flex ${isAgent ? 'justify-end' : 'justify-start'}`}>
                                          <div className={`max-w-[70%] rounded-xl px-3 py-2 text-xs leading-relaxed ${isAgent ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-gray-100 text-gray-900 rounded-tl-none'}`}>
                                            {parsed.isMedia && parsed.mediaType === 'audio' ? (
                                              <div className="py-0.5">
                                                <audio
                                                  src={parsed.mediaUrl}
                                                  controls
                                                  className="w-full max-w-[220px] h-8 rounded"
                                                />
                                              </div>
                                            ) : parsed.isMedia && parsed.mediaType === 'image' ? (
                                              <img src={parsed.mediaUrl} alt="media" className="rounded-lg max-w-[160px] h-auto" />
                                            ) : (
                                              <div>{parsed.caption || msg.text || <span className="opacity-40 italic">Voice message</span>}</div>
                                            )}
                                            <span className="block text-[8px] opacity-60 text-right mt-1">{formatRelativeTime(msg.timestamp)}</span>
                                          </div>
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              )}

                              {activeTab === 'actions' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <label className="block text-[10px] font-black uppercase text-gray-400">Manual Quick Message</label>
                                    <div className="flex gap-2">
                                      <input
                                        type="text"
                                        value={quickMsgText[lead.phone] || ''}
                                        onChange={(e) => setQuickMsgText({ ...quickMsgText, [lead.phone]: e.target.value })}
                                        placeholder="Type manual WhatsApp reply..."
                                        className="flex-1 text-xs border border-gray-250 rounded-lg px-3 py-2 bg-white"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleQuickSend(lead.phone)}
                                        disabled={sendingMsg[lead.phone] || !quickMsgText[lead.phone]?.trim()}
                                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-250 text-white text-xs font-bold px-4 py-2 rounded-lg"
                                      >
                                        Send
                                      </button>
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <label className="block text-[10px] font-black uppercase text-gray-400">Status Update</label>
                                    <div className="flex flex-wrap gap-2">
                                      <button
                                        type="button"
                                        onClick={() => handleMarkConverted(lead.phone, !lead.is_converted)}
                                        className={`px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer ${lead.is_converted ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                                      >
                                        {lead.is_converted ? 'Revert Converted' : 'Mark Converted'}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleMarkDnd(lead.phone, !lead.is_dnd)}
                                        className={`px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer ${lead.is_dnd ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                                      >
                                        {lead.is_dnd ? 'Remove DND' : 'Add DND'}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LeadsTablePage() {
  return (
    <Suspense fallback={<ListPageSkeleton rows={8} />}>
      <LeadsTablePageInner />
    </Suspense>
  );
}
