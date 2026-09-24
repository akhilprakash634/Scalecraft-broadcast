'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  KanbanSquare,
  TableProperties,
  Search,
  SlidersHorizontal,
  Ban,
  Tag,
  CheckCircle,
  Sparkles,
  ChevronDown,
  ExternalLink,
  Save,
  MessageSquare,
  RefreshCw,
  Flame,
  CircleDollarSign,
  Clock,
  Laptop,
  Snowflake,
  Loader2,
  X
} from 'lucide-react';

interface Lead {
  phone: string;
  name: string | null;
  intent: string | null;
  is_converted: boolean;
  is_dnd: boolean;
  category: string | null;
  intent_score: number | null;
  follow_up_score: number | null;
  notes: string | null;
  manual_status: string | null;
  last_message_at: string | null;
  is_price_sensitive?: boolean;
}

const CRM_STAGES = [
  { id: 'New', label: 'New Lead', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'Interested', label: 'Interested', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { id: 'Follow-up Needed', label: 'Follow-up Due', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'Converted', label: 'Converted', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
];

export default function CRMPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // View switch: 'kanban' | 'table'
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');

  // Filters & Search
  const [search, setSearch] = useState('');
  const [activeChip, setActiveChip] = useState<'all' | 'hot' | 'price' | 'followup' | 'digital' | 'cold'>('all');

  // Optimistic UI / In-flight Status Trackers
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, boolean>>({});

  // Table selections
  const [selectedPhones, setSelectedPhones] = useState<Set<string>>(new Set());

  // Configuration settings for template triggers
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [stageTemplates, setStageTemplates] = useState<Record<string, string>>({
    'New': '',
    'Interested': '',
    'Follow-up Needed': '',
    'Converted': ''
  });
  const [savingConfig, setSavingConfig] = useState(false);

  // Bulk actions
  const [isBulkTagOpen, setIsBulkTagOpen] = useState(false);
  const [bulkTagInput, setBulkTagInput] = useState('');

  // Google Sheets Sync State
  const [clientProfile, setClientProfile] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);
  const [sheetInput, setSheetInput] = useState('');
  const [sheetsStateError, setSheetsStateError] = useState('');
  const [isSheetsPanelOpen, setIsSheetsPanelOpen] = useState(false);

  const fetchClientProfile = async () => {
    try {
      const res = await fetch('/api/dashboard/client');
      if (res.ok) {
        const data = await res.json();
        setClientProfile(data);
        if (data.googleSheetId) {
          setSheetInput(data.googleSheetId);
        }
      }
    } catch {}
  };

  const handleConnectGoogle = () => {
    window.location.href = '/api/dashboard/integrations/google-sheets/connect';
  };

  const handleCreateSheet = async () => {
    setSyncing(true);
    setSheetsStateError('');
    try {
      const res = await fetch('/api/dashboard/integrations/google-sheets/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create' })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert('Created and linked new Google Sheet successfully! It is automatically shared with your Google account.');
        fetchClientProfile();
        fetchLeads();
      } else {
        throw new Error(data.error || 'Failed to create sheet');
      }
    } catch (err: any) {
      setSheetsStateError(err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleLinkSheet = async () => {
    if (!sheetInput.trim()) {
      setSheetsStateError('Please enter a Google Sheet ID or URL');
      return;
    }
    let cleanId = sheetInput.trim();
    if (cleanId.includes('docs.google.com/spreadsheets')) {
      const match = cleanId.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match) cleanId = match[1];
    }

    setSyncing(true);
    setSheetsStateError('');
    try {
      const res = await fetch('/api/dashboard/integrations/google-sheets/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'link', spreadsheetId: cleanId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert('Google Sheet linked successfully!');
        fetchClientProfile();
        fetchLeads();
      } else {
        throw new Error(data.error || 'Failed to link sheet');
      }
    } catch (err: any) {
      setSheetsStateError(err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnectSheets = async () => {
    if (!confirm('Are you sure you want to disconnect Google Sheets sync? This will stop all synchronization.')) {
      return;
    }
    setSyncing(true);
    setSheetsStateError('');
    try {
      const res = await fetch('/api/dashboard/integrations/google-sheets/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disconnect' })
      });
      if (res.ok) {
        alert('Google Sheets disconnected.');
        setSheetInput('');
        fetchClientProfile();
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to disconnect');
      }
    } catch (err: any) {
      setSheetsStateError(err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    setSheetsStateError('');
    try {
      const res = await fetch('/api/dashboard/integrations/google-sheets/sync', {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(`Sync complete! Synced ${data.syncedCount || 0} rows.`);
        fetchClientProfile();
        fetchLeads();
      } else {
        throw new Error(data.error || 'Sync failed');
      }
    } catch (err: any) {
      setSheetsStateError(err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleAppsScript = async (checked: boolean) => {
    setSyncing(true);
    setSheetsStateError('');
    try {
      const res = await fetch('/api/dashboard/integrations/google-sheets/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_apps_script', appsScriptEnabled: checked })
      });
      if (res.ok) {
        fetchClientProfile();
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to toggle trigger settings');
      }
    } catch (err: any) {
      setSheetsStateError(err.message);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    // Load view preference from localStorage
    const saved = localStorage.getItem('scalecraft_crm_view');
    if (saved === 'kanban' || saved === 'table') {
      setViewMode(saved);
    }
    fetchLeads();
    fetchCRMSettings();
    fetchClientProfile();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('sync_setup') === 'success') {
      window.history.replaceState({}, document.title, window.location.pathname);
      alert('Successfully connected Google account! Now you can link or create a Google Sheet.');
      fetchClientProfile();
    } else if (params.get('sync_setup') === 'error') {
      const reason = params.get('reason') || 'Unknown error';
      window.history.replaceState({}, document.title, window.location.pathname);
      alert(`Google connection failed: ${reason}`);
    }
  }, []);

  const handleSetViewMode = (mode: 'kanban' | 'table') => {
    setViewMode(mode);
    localStorage.setItem('scalecraft_crm_view', mode);
  };

  const fetchLeads = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/dashboard/leads?limit=250');
      if (!res.ok) throw new Error('Failed to load leads cache');
      const data = await res.json();
      setLeads(data.leads || []);
    } catch (err: any) {
      setError(err.message || 'Error loading CRM data');
    } finally {
      setLoading(false);
    }
  };

  const fetchCRMSettings = async () => {
    try {
      const res = await fetch('/api/dashboard/crm/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.templates) {
          setStageTemplates(prev => ({ ...prev, ...data.templates }));
        }
      }
    } catch {}
  };

  const handleSaveCRMSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const res = await fetch('/api/dashboard/crm/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templates: stageTemplates })
      });
      if (res.ok) {
        setIsConfigOpen(false);
      } else {
        throw new Error('Failed to save CRM transition settings');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingConfig(false);
    }
  };

  // Stage changes with Optimistic UI updates and Rollback
  const handleUpdateLeadStage = async (phone: string, newStage: string) => {
    const lead = leads.find(l => l.phone === phone);
    const originalStage = lead ? lead.manual_status : 'New';

    // 1. Instantly update UI locally
    setLeads(prev => prev.map(l => l.phone === phone ? { ...l, manual_status: newStage } : l));
    setPendingUpdates(prev => ({ ...prev, [phone]: true }));

    // 2. Fire request in the background
    try {
      const res = await fetch(`/api/dashboard/leads/${phone}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manual_status: newStage })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to update stage');
      }
    } catch (err: any) {
      // 3. Rollback on failure
      setLeads(prev => prev.map(l => l.phone === phone ? { ...l, manual_status: originalStage } : l));
      setError(`Failed to move lead to "${newStage}": ` + err.message);
      setTimeout(() => setError(''), 5000);
    } finally {
      // 4. Remove pending animation
      setPendingUpdates(prev => {
        const next = { ...prev };
        delete next[phone];
        return next;
      });
    }
  };

  // Bulk actions handlers
  const handleSelectAll = () => {
    const visible = getFilteredLeads();
    if (selectedPhones.size === visible.length) {
      setSelectedPhones(new Set());
    } else {
      setSelectedPhones(new Set(visible.map(l => l.phone)));
    }
  };

  const handleSelectRow = (phone: string) => {
    const next = new Set(selectedPhones);
    if (next.has(phone)) {
      next.delete(phone);
    } else {
      next.add(phone);
    }
    setSelectedPhones(next);
  };

  const handleBulkStageChange = async (newStage: string) => {
    if (selectedPhones.size === 0) return;
    const targetPhones = Array.from(selectedPhones);
    setSelectedPhones(new Set());

    // Update stages sequentially
    for (const phone of targetPhones) {
      await handleUpdateLeadStage(phone, newStage);
    }
  };

  const handleBulkDndChange = async (isDnd: boolean) => {
    if (selectedPhones.size === 0) return;
    const targetPhones = Array.from(selectedPhones);
    setSelectedPhones(new Set());

    try {
      for (const phone of targetPhones) {
        setPendingUpdates(prev => ({ ...prev, [phone]: true }));
        await fetch(`/api/dashboard/leads/${phone}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_dnd: isDnd })
        });
      }
      setLeads(prev => prev.map(l => targetPhones.includes(l.phone) ? { ...l, is_dnd: isDnd } : l));
    } catch (err: any) {
      setError('DND batch update error: ' + err.message);
      setTimeout(() => setError(''), 5000);
    } finally {
      setPendingUpdates(prev => {
        const next = { ...prev };
        targetPhones.forEach(p => delete next[p]);
        return next;
      });
    }
  };

  const handleBulkAddToContacts = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPhones.size === 0 || !bulkTagInput.trim()) return;
    try {
      const tag = bulkTagInput.trim().toLowerCase();
      for (const phone of Array.from(selectedPhones)) {
        const lead = leads.find(l => l.phone === phone);
        if (!lead) continue;
        await fetch('/api/dashboard/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: lead.name,
            phone: lead.phone,
            group_tags: [tag],
            source: 'synced_from_leads',
            is_dnd: lead.is_dnd
          })
        });
      }
      setIsBulkTagOpen(false);
      setBulkTagInput('');
      setSelectedPhones(new Set());
      alert(`Successfully promoted selected leads into address book under group: ${tag}`);
    } catch (err: any) {
      alert('Error promoting leads to contacts: ' + err.message);
    }
  };

  // Filter application helper
  const getFilteredLeads = () => {
    return leads.filter(lead => {
      // 1. Search filter
      const term = search.trim().toLowerCase();
      const matchesSearch = term 
        ? (lead.name?.toLowerCase().includes(term) || lead.phone.includes(term))
        : true;
      if (!matchesSearch) return false;

      // 2. Segment chips filter
      if (activeChip === 'hot') {
        return (lead.intent_score || 0) >= 7;
      }
      if (activeChip === 'price') {
        return !!lead.is_price_sensitive;
      }
      if (activeChip === 'followup') {
        return lead.manual_status === 'Follow-up Needed' || lead.intent === 'follow_up';
      }
      if (activeChip === 'digital') {
        const cat = String(lead.category || '').toLowerCase();
        return ['scalecraft', 'saas', 'digital_products', 'digital_saas'].includes(cat);
      }
      if (activeChip === 'cold') {
        return lead.intent === 'cold' || (lead.intent_score || 0) < 3;
      }

      return true;
    });
  };

  const filtered = getFilteredLeads();

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#212121] tracking-tight font-heading flex items-center gap-2">
            <Sparkles className="text-gray-500" /> Conversation CRM Pipeline
          </h1>
          <p className="text-xs text-[#757575] mt-1">
            Track lead status, prioritize hot opportunities, and automate template transitions on stage changes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Settings button */}
          <button
            onClick={() => setIsConfigOpen(true)}
            className="border border-[#E0E0E0] hover:bg-[#F8FBF8] bg-white text-gray-700 text-xs font-bold px-3 py-2.5 rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
          >
            <SlidersHorizontal size={14} /> Automation Settings
          </button>

          {/* View Toggle */}
          <div className="border border-[#E0E0E0] rounded-xl p-0.5 bg-white flex items-center shadow-sm">
            <button
              onClick={() => handleSetViewMode('kanban')}
              className={`p-2 rounded-lg transition-all cursor-pointer ${
                viewMode === 'kanban' ? 'bg-[#1B5E20] text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <KanbanSquare size={16} />
            </button>
            <button
              onClick={() => handleSetViewMode('table')}
              className={`p-2 rounded-lg transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-[#1B5E20] text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <TableProperties size={16} />
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-[#FFEBEE] border border-red-200 text-[#C62828] text-xs font-semibold p-4 rounded-xl flex items-center space-x-2 animate-in slide-in-from-top-1 duration-200">
          <Ban size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Google Sheets Sync Integration Card */}
      <div className="bg-white border border-[#E0E0E0] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
        <button
          onClick={() => setIsSheetsPanelOpen(!isSheetsPanelOpen)}
          className="w-full flex items-center justify-between p-4 bg-gray-50/50 hover:bg-gray-50/80 transition-colors border-b border-gray-100 cursor-pointer"
        >
          <div className="flex items-center space-x-3">
            <div className="bg-[#E8F5E9] p-2 rounded-xl text-emerald-700">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2m-7 14H7v-2h5v2zm5-4H7v-2h10v2zm0-4H7V7h10v2z"/>
              </svg>
            </div>
            <div className="text-left">
              <h3 className="text-xs font-bold text-gray-900">Google Sheets Two-Way Sync</h3>
              <p className="text-[10px] text-gray-500 mt-0.5">
                {clientProfile?.googleSheetId 
                  ? 'Active two-way synchronization enabled' 
                  : 'Connect your pipeline leads to a Google Sheet'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {clientProfile?.googleOauth ? (
              clientProfile.googleSheetId ? (
                <span className="text-[9px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full">
                  Sync Active
                </span>
              ) : (
                <span className="text-[9px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded-full">
                  Pending Sheet
                </span>
              )
            ) : (
              <span className="text-[9px] font-black uppercase bg-gray-100 text-gray-500 border border-gray-200 px-2 py-0.5 rounded-full">
                Not Connected
              </span>
            )}
            <ChevronDown 
              size={16} 
              className={`text-gray-400 transition-transform duration-200 ${isSheetsPanelOpen ? 'rotate-180' : ''}`}
            />
          </div>
        </button>

        {isSheetsPanelOpen && (
          <div className="p-5 space-y-6 animate-in slide-in-from-top-1 duration-200 border-t border-gray-100">
            {sheetsStateError && (
              <div className="bg-[#FFEBEE] border border-red-200 text-[#C62828] text-[11px] font-semibold p-3.5 rounded-xl flex items-center space-x-2">
                <Ban size={14} />
                <span>{sheetsStateError}</span>
              </div>
            )}

            {!clientProfile?.googleOauth ? (
              <div className="flex flex-col items-center justify-center py-6 text-center space-y-4 max-w-md mx-auto">
                <div className="bg-gray-100 p-4 rounded-full text-gray-400">
                  <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <line x1="3" y1="9" x2="21" y2="9" />
                    <line x1="9" y1="21" x2="9" y2="9" />
                  </svg>
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-gray-900">Step 1: Connect your Google Account</h4>
                  <p className="text-[11px] text-gray-500 max-w-sm">
                    Authenticate with Google to grant ScaleCraft permission to read and write your spreadsheets.
                  </p>
                </div>
                <button
                  onClick={handleConnectGoogle}
                  className="bg-white hover:bg-gray-50 text-gray-700 font-bold border border-gray-300 rounded-xl px-5 py-2.5 text-xs shadow-sm transition-all inline-flex items-center gap-2 cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.66-2.6-2.6-4.53-5.84-4.53z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Connect Google Sheets
                </button>
              </div>
            ) : !clientProfile.googleSheetId ? (
              <div className="space-y-6 max-w-lg mx-auto py-2">
                <div className="bg-[#E8F5E9] p-4 rounded-xl flex items-center space-x-3">
                  <div className="bg-[#1B5E20] text-white p-1.5 rounded-lg">
                    <CheckCircle size={16} />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-gray-900">Account Connected Successfully</p>
                    <p className="text-[10px] text-gray-600">Signed in as: <span className="font-mono">{clientProfile.googleOauth.email}</span></p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-dashed border-gray-300 hover:border-emerald-600 rounded-xl p-5 flex flex-col justify-between items-center text-center space-y-4 bg-gray-50/30">
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-bold text-gray-955">Option A: Auto-Create Sheet</h4>
                      <p className="text-[10px] text-gray-500 leading-relaxed">
                        ScaleCraft will create a fully formatted leads sheet in your Google Drive and share edit access back to your account.
                      </p>
                    </div>
                    <button
                      onClick={handleCreateSheet}
                      disabled={syncing}
                      className="bg-[#1B5E20] hover:bg-[#144317] text-white font-bold px-4 py-2.5 rounded-xl text-[10px] shadow-sm transition-all cursor-pointer w-full flex items-center justify-center gap-1"
                    >
                      {syncing ? <Loader2 size={12} className="animate-spin" /> : null}
                      Create Sheet Template
                    </button>
                  </div>

                  <div className="border border-dashed border-gray-300 hover:border-emerald-600 rounded-xl p-5 flex flex-col justify-between items-center text-center space-y-4 bg-gray-50/30">
                    <div className="space-y-1.5 w-full">
                      <h4 className="text-xs font-bold text-gray-955">Option B: Link Existing Sheet</h4>
                      <p className="text-[10px] text-gray-500 leading-relaxed">
                        Link an existing spreadsheet from your Google Drive by copying and pasting its ID or full URL below.
                      </p>
                    </div>
                    <div className="w-full space-y-2">
                      <input
                        type="text"
                        value={sheetInput}
                        onChange={(e) => setSheetInput(e.target.value)}
                        placeholder="Spreadsheet ID or URL..."
                        className="w-full text-[10px] font-mono border border-gray-300 rounded-lg px-2.5 py-2 outline-none focus:border-[#1B5E20] bg-white text-center"
                      />
                      <button
                        onClick={handleLinkSheet}
                        disabled={syncing}
                        className="bg-white hover:bg-gray-50 text-gray-800 font-bold border border-gray-300 px-4 py-2.5 rounded-xl text-[10px] shadow-sm transition-all cursor-pointer w-full flex items-center justify-center gap-1"
                      >
                        {syncing ? <Loader2 size={12} className="animate-spin" /> : null}
                        Link Spreadsheet
                      </button>
                    </div>
                  </div>
                </div>

                <div className="text-center pt-2">
                  <button
                    onClick={handleDisconnectSheets}
                    className="text-[10px] text-red-600 hover:underline font-bold cursor-pointer"
                  >
                    Disconnect Google Account
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col justify-between">
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Connected Account</span>
                    <span className="text-xs font-bold text-gray-900 truncate mt-1">{clientProfile.googleOauth.email}</span>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col justify-between">
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Spreadsheet Link</span>
                    <a
                      href={`https://docs.google.com/spreadsheets/d/${clientProfile.googleSheetId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-bold text-brand hover:underline inline-flex items-center gap-1 truncate mt-1"
                    >
                      Open Google Sheet <ExternalLink size={12} />
                    </a>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col justify-between">
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Last Synced</span>
                    <span className="text-xs font-mono font-bold text-gray-900 mt-1">
                      {clientProfile.googleOauth.last_sync_time 
                        ? new Date(clientProfile.googleOauth.last_sync_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                        : 'Never'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between border-t border-gray-100 pt-4 gap-4">
                  <div className="flex items-center space-x-2 text-xs font-bold text-gray-700">
                    <span>Sync Direction:</span>
                    <span className="bg-emerald-50 text-emerald-800 border border-emerald-100 px-2 py-0.5 rounded text-[10px]">
                      CRM &rarr; Sheet (Real-Time)
                    </span>
                    <span className="bg-sky-50 text-sky-800 border border-sky-100 px-2 py-0.5 rounded text-[10px]">
                      Sheet &rarr; CRM (1-2 Min Poll)
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleSyncNow}
                      disabled={syncing}
                      className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-800 text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
                    >
                      <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
                      Sync Now
                    </button>
                    <button
                      onClick={handleDisconnectSheets}
                      className="bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm"
                    >
                      Disconnect Sync
                    </button>
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-gray-900">Enable Instant Webhook Sync (Apps Script Upgrade)</h4>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        Trigger updates in ScaleCraft instantly whenever you make changes in the Google Sheet, bypassing the polling lag.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={!!clientProfile.googleOauth.apps_script_enabled}
                        onChange={(e) => handleToggleAppsScript(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-focus:ring-0 dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>

                  {clientProfile.googleOauth.apps_script_enabled && (
                    <div className="space-y-3 pt-2 border-t border-gray-200 animate-in fade-in duration-200">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-gray-800">Instructions:</span>
                        <ol className="list-decimal list-inside text-[10px] text-gray-600 space-y-1 ml-1 leading-relaxed">
                          <li>Open your linked Google Sheet, click <b>Extensions</b> in the top menu, then select <b>Apps Script</b>.</li>
                          <li>Delete any existing code in the editor, and copy-paste the snippet below.</li>
                          <li>Click the <b>Save</b> icon (floppy disk). Then click the <b>Triggers</b> icon (clock icon on left sidebar).</li>
                          <li>Click <b>+ Add Trigger</b>. Select <code>onEditTrigger</code> for the function, <code>From spreadsheet</code> for source, and <code>On edit</code> for event type. Click Save.</li>
                        </ol>
                      </div>

                      <div className="relative bg-gray-900 text-gray-100 rounded-xl p-3.5 font-mono text-[9px] leading-relaxed overflow-x-auto">
                        <button
                          onClick={() => {
                            const origin = window.location.origin;
                            const secret = clientProfile.googleOauth.webhook_secret;
                            const code = `function onEditTrigger(e) {
  var sheet = e.source.getActiveSheet();
  if (sheet.getName() !== "Leads") return;
  var range = e.range;
  var row = range.getRow();
  if (row === 1) return;
  var rowValues = sheet.getRange(row, 1, 1, 7).getValues()[0];
  var payload = {
    phone: String(rowValues[0]),
    name: String(rowValues[1]),
    status: String(rowValues[2]),
    category: String(rowValues[3]),
    lastMessage: String(rowValues[4]),
    notes: String(rowValues[5]),
    lastUpdated: String(rowValues[6])
  };
  var url = "${origin}/api/webhooks/sheets-sync";
  var options = {
    method: "post",
    contentType: "application/json",
    headers: {
      "x-scalecraft-token": "${secret}"
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  try { UrlFetchApp.fetch(url, options); } catch(err) { Logger.log(err); }
}`;
                            navigator.clipboard.writeText(code);
                            alert('Apps Script code copied to clipboard!');
                          }}
                          className="absolute right-2 top-2 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 rounded-lg p-1.5 transition-colors cursor-pointer text-[8px] uppercase tracking-wider font-bold"
                          title="Copy Code"
                        >
                          Copy Code
                        </button>
                        <pre>{`function onEditTrigger(e) {
  var sheet = e.source.getActiveSheet();
  if (sheet.getName() !== "Leads") return;

  var range = e.range;
  var row = range.getRow();
  if (row === 1) return; // skip headers

  var rowValues = sheet.getRange(row, 1, 1, 7).getValues()[0];
  var payload = {
    phone: String(rowValues[0]),
    name: String(rowValues[1]),
    status: String(rowValues[2]),
    category: String(rowValues[3]),
    lastMessage: String(rowValues[4]),
    notes: String(rowValues[5]),
    lastUpdated: String(rowValues[6])
  };

  var url = "${window.location.origin}/api/webhooks/sheets-sync";
  var options = {
    method: "post",
    contentType: "application/json",
    headers: {
      "x-scalecraft-token": "${clientProfile.googleOauth.webhook_secret}"
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    UrlFetchApp.fetch(url, options);
  } catch (err) {
    Logger.log("Error syncing row: " + err);
  }
}`}</pre>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Search and Segment Chips bar */}
      <div className="bg-white border border-[#E0E0E0] rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)] space-y-4">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads by name or phone number..."
            className="w-full text-xs border border-[#E0E0E0] rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-[#1B5E20] bg-gray-50/50 font-semibold"
          />
        </div>

        {/* Chips */}
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'all', label: 'All Leads', icon: null },
            { id: 'hot', label: 'Hot Leads (Score >= 70)', icon: Flame },
            { id: 'price', label: 'Price Sensitive', icon: CircleDollarSign },
            { id: 'followup', label: 'Follow-up Due', icon: Clock },
            { id: 'digital', label: 'Digital / SaaS', icon: Laptop },
            { id: 'cold', label: 'Re-engage Cold', icon: Snowflake }
          ].map(chip => {
            const IconComponent = chip.icon;
            const isSelected = activeChip === chip.id;
            return (
              <button
                key={chip.id}
                onClick={() => setActiveChip(chip.id as any)}
                className={`text-[10px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-full transition-all cursor-pointer border flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#1B5E20] text-white border-[#1B5E20] shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
              >
                {IconComponent && (
                  <IconComponent 
                    size={12} 
                    className={isSelected ? 'text-white' : 'text-gray-500'} 
                  />
                )}
                <span>{chip.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bulk actions panel (Visible in Table view mode if selection size > 0) */}
      {viewMode === 'table' && selectedPhones.size > 0 && (
        <div className="bg-[#E8F5E9] border border-[#C8E6C9] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
          <span className="text-xs font-bold text-[#1B5E20]">
            Selected {selectedPhones.size} lead(s)
          </span>
          <div className="flex flex-wrap gap-2">
            <div className="relative group">
              <button className="bg-white text-gray-700 hover:bg-[#F8FBF8] border border-[#E0E0E0] text-[10px] font-bold px-3 py-2 rounded-xl transition-all inline-flex items-center gap-1 cursor-pointer">
                Change Stage <ChevronDown size={12} />
              </button>
              <div className="absolute left-0 mt-1 hidden group-hover:block bg-white border border-[#E0E0E0] rounded-xl shadow-lg py-1 z-30 min-w-[120px]">
                {CRM_STAGES.map(stg => (
                  <button
                    key={stg.id}
                    onClick={() => handleBulkStageChange(stg.id)}
                    className="w-full text-left text-[10px] px-3 py-2 hover:bg-gray-50 font-bold text-gray-700"
                  >
                    {stg.label}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => setIsBulkTagOpen(true)}
              className="bg-white text-gray-700 hover:bg-[#F8FBF8] border border-[#E0E0E0] text-[10px] font-bold px-3 py-2 rounded-xl transition-all inline-flex items-center gap-1 cursor-pointer"
            >
              <Tag size={12} /> Promoted Group
            </button>
            <button
              onClick={() => handleBulkDndChange(true)}
              className="bg-white text-gray-700 hover:bg-[#F8FBF8] border border-[#E0E0E0] text-[10px] font-bold px-3 py-2 rounded-xl transition-all inline-flex items-center gap-1 cursor-pointer"
            >
              <Ban size={12} className="text-amber-600" /> Mark DND
            </button>
            <button
              onClick={() => handleBulkDndChange(false)}
              className="bg-white text-gray-700 hover:bg-[#F8FBF8] border border-[#E0E0E0] text-[10px] font-bold px-3 py-2 rounded-xl transition-all inline-flex items-center gap-1 cursor-pointer"
            >
              <CheckCircle size={12} className="text-emerald-600" /> Opt-in
            </button>
          </div>
        </div>
      )}

      {/* Main CRM Views */}
      {loading ? (
        <div className="text-center py-20 text-gray-500 italic">
          Loading pipeline intelligence data...
        </div>
      ) : viewMode === 'kanban' ? (
        /* KANBAN BOARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
          {CRM_STAGES.map(stage => {
            const stageLeads = filtered.filter(l => {
              const status = l.manual_status || 'New';
              return status === stage.id;
            });

            return (
              <div key={stage.id} className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-4 flex flex-col min-h-[500px]">
                <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                  <span className="font-bold text-gray-800 text-[11px] uppercase tracking-wide">
                    {stage.label}
                  </span>
                  <span className="bg-gray-200 text-gray-700 font-black text-[9px] px-2 py-0.5 rounded-full">
                    {stageLeads.length}
                  </span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px] pr-1">
                  {stageLeads.map(lead => {
                    const isPending = !!pendingUpdates[lead.phone];
                    return (
                      <div
                        key={lead.phone}
                        className={`bg-white border border-[#E0E0E0] hover:border-gray-400 rounded-xl p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all space-y-3 relative group ${
                          isPending ? 'opacity-60 pointer-events-none' : ''
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-gray-900 text-xs truncate max-w-[120px]">
                              {lead.name || lead.phone}
                            </h4>
                            <span className="text-[9px] font-mono text-gray-500">+{lead.phone}</span>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            {isPending ? (
                              <Loader2 size={12} className="animate-spin text-gray-400" />
                            ) : (
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded uppercase bg-emerald-50 text-emerald-800 border border-emerald-100">
                                {lead.category || 'local_services'}
                              </span>
                            )}
                          </div>
                        </div>

                        {lead.notes && (
                          <p className="text-[10px] text-gray-600 line-clamp-2 bg-gray-50 rounded-lg p-2 leading-relaxed">
                            {lead.notes}
                          </p>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-[9px]">
                          <span className="font-black text-gray-500 uppercase">Intent score</span>
                          <span className={`font-mono font-black ${
                            (lead.intent_score || 0) >= 7 ? 'text-red-600' : 'text-gray-700'
                          }`}>
                            {(lead.intent_score || 0) * 10}%
                          </span>
                        </div>

                        {/* Dropdown switch on card */}
                        <div className="flex gap-2 pt-2 justify-end">
                          <select
                            value={lead.manual_status || 'New'}
                            disabled={isPending}
                            onChange={(e) => handleUpdateLeadStage(lead.phone, e.target.value)}
                            className="text-[9px] border border-gray-200 rounded px-1.5 py-1 bg-white cursor-pointer font-bold focus:outline-none"
                          >
                            {CRM_STAGES.map(s => (
                              <option key={s.id} value={s.id}>{s.label}</option>
                            ))}
                          </select>

                          <Link
                            href={`/dashboard/leads?id=${lead.phone}`}
                            className="bg-gray-100 hover:bg-gray-200 p-1.5 rounded-lg text-gray-700 cursor-pointer inline-flex items-center justify-center"
                          >
                            <ExternalLink size={10} />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                  {stageLeads.length === 0 && (
                    <div className="text-center py-12 text-gray-400 italic text-[10px]">
                      No leads in stage
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white border border-[#E0E0E0] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F8FBF8] border-b border-[#E0E0E0] text-[10px] font-black text-[#757575] uppercase tracking-wider">
                  <th className="px-6 py-4 w-10">
                    <button onClick={handleSelectAll} className="text-[#757575] hover:text-[#212121]">
                      {selectedPhones.size === filtered.length && filtered.length > 0 ? (
                        <CheckCircle size={16} className="text-[#1B5E20]" />
                      ) : (
                        <div className="h-4 w-4 border border-[#E0E0E0] rounded" />
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Phone Number</th>
                  <th className="px-6 py-4">Pipeline Stage</th>
                  <th className="px-6 py-4 text-center">Intent Score</th>
                  <th className="px-6 py-4 text-center">Follow-up Score</th>
                  <th className="px-6 py-4">Last Active</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E0E0E0]">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-gray-500 italic">
                      No leads matching criteria.
                    </td>
                  </tr>
                ) : (
                  filtered.map(l => {
                    const isPending = !!pendingUpdates[l.phone];
                    return (
                      <tr key={l.phone} className={`hover:bg-[#F8FBF8]/40 transition-colors ${isPending ? 'opacity-65' : ''}`}>
                        <td className="px-6 py-4">
                          <button onClick={() => handleSelectRow(l.phone)} disabled={isPending} className="text-[#757575] hover:text-[#212121] disabled:opacity-50">
                            {selectedPhones.has(l.phone) ? (
                              <CheckCircle size={16} className="text-[#1B5E20]" />
                            ) : (
                              <div className="h-4 w-4 border border-[#E0E0E0] rounded" />
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-900 flex items-center gap-1.5">
                          {isPending && <Loader2 size={12} className="animate-spin text-[#1B5E20]" />}
                          <span>{l.name || '—'}</span>
                        </td>
                        <td className="px-6 py-4 font-mono text-gray-500">+{l.phone}</td>
                        <td className="px-6 py-4">
                          <select
                            value={l.manual_status || 'New'}
                            disabled={isPending}
                            onChange={(e) => handleUpdateLeadStage(l.phone, e.target.value)}
                            className="text-[9px] border border-gray-200 rounded px-2 py-1 bg-white cursor-pointer font-bold focus:outline-none"
                          >
                            {CRM_STAGES.map(s => (
                              <option key={s.id} value={s.id}>{s.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-6 py-4 text-center font-bold font-mono">
                          {(l.intent_score || 0) * 10}%
                        </td>
                        <td className="px-6 py-4 text-center font-bold font-mono text-amber-700">
                          {l.follow_up_score || 0}
                        </td>
                        <td className="px-6 py-4 text-gray-500">
                          {l.last_message_at ? new Date(l.last_message_at).toLocaleDateString('en-IN') : '—'}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">
                            {l.category || 'local_services'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            href={`/dashboard/leads?id=${l.phone}`}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-2 rounded-xl inline-flex items-center justify-center"
                          >
                            <MessageSquare size={12} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Promoted Group Tag Modal */}
      {isBulkTagOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white border border-[#E0E0E0] rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E0E0E0] pb-3">
              <h3 className="text-sm font-bold text-[#212121] font-heading">Promote Leads to Contacts</h3>
              <button onClick={() => setIsBulkTagOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleBulkAddToContacts} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider">Group Tag Name</label>
                <input
                  type="text"
                  required
                  value={bulkTagInput}
                  onChange={(e) => setBulkTagInput(e.target.value)}
                  placeholder="e.g. promoted_leads"
                  className="w-full text-xs border border-[#E0E0E0] rounded-lg px-3 py-2 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-[#1B5E20] hover:bg-[#144317] text-white text-xs font-bold py-2.5 rounded-lg transition-colors cursor-pointer"
              >
                Promote {selectedPhones.size} Leads
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Automation Transition Settings Modal */}
      {isConfigOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white border border-[#E0E0E0] rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E0E0E0] pb-3">
              <h3 className="text-sm font-bold text-[#212121] font-heading flex items-center gap-1">
                <Sparkles size={16} className="text-gray-500" /> Stage Auto-Transitions
              </h3>
              <button onClick={() => setIsConfigOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveCRMSettings} className="space-y-4">
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Configure a WhatsApp message template name to trigger automatically whenever a lead is moved to the corresponding pipeline stage. Leave fields blank to disable.
              </p>

              {CRM_STAGES.map(stg => (
                <div key={stg.id} className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wide">
                    {stg.label} Template Trigger
                  </label>
                  <input
                    type="text"
                    value={stageTemplates[stg.id] || ''}
                    onChange={(e) => setStageTemplates({ ...stageTemplates, [stg.id]: e.target.value })}
                    placeholder="e.g. interested_followup"
                    className="w-full text-xs border border-[#E0E0E0] rounded-lg px-3 py-2 focus:outline-none"
                  />
                </div>
              ))}

              <button
                type="submit"
                disabled={savingConfig}
                className="w-full bg-[#1B5E20] hover:bg-[#144317] text-white text-xs font-bold py-2.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                {savingConfig ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save Trigger Configurations
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
