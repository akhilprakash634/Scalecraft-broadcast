'use client';

import React, { useEffect, useState, Suspense, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ListPageSkeleton } from '@/components/ui/PageLoader';
import { motion, AnimatePresence } from 'framer-motion';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ChatBubble from '@/components/chat/ChatBubble';
import ChatHeader from '@/components/chat/ChatHeader';
import ComposeBar from '@/components/chat/ComposeBar';
import TypingIndicator from '@/components/chat/TypingIndicator';
import LeadListItem from '@/components/chat/LeadListItem';
import { LeadListSkeleton, ChatBubblesSkeleton } from '@/components/ui/Skeleton';
import {
  Users,
  Search,
  Download,
  RefreshCw,
  Eye,
  MessageSquare,
  CheckCircle,
  AlertTriangle,
  Phone,
  ShieldAlert,
  Sparkles,
  X,
  Calendar,
  Send,
  User,
  Info,
  Loader2,
  Trash2,
  Clock,
  Check,
  Plus,
  Sliders,
  TrendingUp,
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { formatMediaMessage, parseMessageContent } from '@/lib/mediaMessage';


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
  productsDiscussed?: string[];
  followUpHistory?: any[];
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
  last_customer_message_at?: string | null;
  last_read_at?: string | null;
  follow_up_locked_at?: string | null;
  follow_up_sent_at?: string | null;
  follow_up_message?: string | null;
  follow_up_count?: number;
  fullConversation?: any[];
}

function formatPhoneNumber(phone: string): string {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return `+91 ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`;
  }
  return `+${cleaned}`;
}

function isSameDay(d1Str: string, d2Str: string) {
  try {
    const d1 = new Date(d1Str);
    const d2 = new Date(d2Str);
    return d1.toDateString() === d2.toDateString();
  } catch {
    return false;
  }
}

function formatDateSeparator(dateStr: string) {
  try {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function cleanLeadName(name: string): string {
  if (!name) return 'Unknown';
  // Remove Hermes template syntax ~{...}~
  return name
    .replace(/~\{([^}]+)\}~/g, '$1')
    .replace(/^\{([^}]+)\}$/, '$1')
    .trim() || 'Unknown';
}

/**
 * Reconciles local optimistic/in-flight messages with the fetched backend conversation list.
 * - Matches local agent messages to fetched ones by content and timestamp proximity.
 * - Marks matched items to prevent double-matching on quick-sends.
 * - Preserves unmatched sending/failed/delivered messages until they sync or timeout.
 * - Transitions unmatched delivered messages to failed after 3 minutes.
 */
function mergeFetchedMessages(localMessages: any[] = [], fetchedMessages: any[] = []): any[] {
  const result = [...fetchedMessages];
  const usedFetchedKeys = new Set<string>();

  // Filter local messages that are optimistic sends by the agent
  const localAgentOptimistic = localMessages.filter(
    (lm) => lm.sender === 'agent' && (lm.status === 'sending' || lm.status === 'failed' || lm.status === 'delivered')
  );

  for (const lm of localAgentOptimistic) {
    let isMatched = false;

    // 1. Try matching against fetched messages
    for (const fm of fetchedMessages) {
      const fmKey = fm.id || `${fm.sender}_${fm.timestamp}_${fm.text}`;
      if (usedFetchedKeys.has(fmKey)) continue;
      if (fm.sender !== 'agent') continue;

      // Direct ID check if set
      if (fm.id && lm.id && fm.id === lm.id) {
        isMatched = true;
        usedFetchedKeys.add(fmKey);
        break;
      }

      // Proximity & Content match
      const textMatch = fm.text?.trim() === lm.text?.trim();
      const timeDiff = Math.abs(new Date(fm.timestamp || 0).getTime() - new Date(lm.timestamp || 0).getTime());
      const timeMatch = timeDiff < 120000; // 2 minutes window

      if (textMatch && timeMatch) {
        isMatched = true;
        usedFetchedKeys.add(fmKey);
        break;
      }
    }

    // 2. If unmatched, check if it has expired (over 3 minutes old)
    if (!isMatched) {
      const isExpired = Date.now() - new Date(lm.timestamp || 0).getTime() > 180000;
      if (isExpired && lm.status === 'sending') {
        // A message stuck in 'sending' state (e.g. hung request) is marked failed
        lm.status = 'failed';
      }
      result.push(lm);
    }
  }

  // Ensure overall array is sorted chronologically
  return result.sort((a, b) => new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime());
}

/**
 * Reconciles incoming list-refetch data with local lead updates.
 * Compares the last_message_at timestamp for each lead, ensuring we do not
 * overwrite a newer local message status/preview with stale poll snapshots.
 */
function mergeFetchedLeads(localLeads: Lead[], fetchedLeads: Lead[]): Lead[] {
  return fetchedLeads.map((fl) => {
    const localLead = localLeads.find((ll) => ll.phone === fl.phone);
    if (!localLead) return fl;

    const localTime = localLead.last_message_at ? new Date(localLead.last_message_at).getTime() : 0;
    const fetchedTime = fl.last_message_at ? new Date(fl.last_message_at).getTime() : 0;

    if (localTime > fetchedTime) {
      return {
        ...fl,
        last_message_at: localLead.last_message_at,
        summary: localLead.summary,
      };
    }
    return fl;
  });
}

function LeadsPageInner() {
  const searchParams = useSearchParams();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<any>(null);

  const updateLeadLastMessage = (phone: string, text: string, timestamp: string) => {
    let previewText = text;
    if (text.startsWith('[media:')) {
      const closeIndex = text.indexOf(']');
      if (closeIndex !== -1) {
        const mediaPart = text.slice(7, closeIndex);
        const firstColon = mediaPart.indexOf(':');
        const type = firstColon !== -1 ? mediaPart.slice(0, firstColon) : mediaPart;
        if (type === 'image') {
          previewText = '📷 Photo';
        } else if (type === 'audio') {
          previewText = '🎵 Voice note';
        } else if (type === 'document') {
          previewText = '📄 Document';
        } else if (type === 'video') {
          previewText = '🎥 Video';
        } else if (type === 'sticker') {
          previewText = '✨ Sticker';
        }
      }
    }

    setLeads((prevLeads) => {
      return prevLeads.map((lead) => {
        if (lead.phone === phone) {
          const currentTS = lead.last_message_at ? new Date(lead.last_message_at).getTime() : 0;
          const newTS = new Date(timestamp).getTime();
          if (newTS >= currentTS) {
            return {
              ...lead,
              last_message_at: timestamp,
              summary: previewText,
            };
          }
        }
        return lead;
      });
    });
  };

  // Sync state for Left Panel list
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced'>('idle');

  // Selected Lead state
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [triggeringFollowup, setTriggeringFollowup] = useState(false);
  const userInteracted = useRef(false);

  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');

  // Action loading states
  const [updatingConverted, setUpdatingConverted] = useState<Record<string, boolean>>({});
  const [updatingDnd, setUpdatingDnd] = useState<Record<string, boolean>>({});

  // Alert and confirms
  const [alertData, setAlertData] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [confirmData, setConfirmData] = useState<{ message: string; resolve: (val: boolean) => void } | null>(null);

  const [toast, setToast] = useState<{
    message: string; 
    type: 'success' | 'error'
  } | null>(null);

  const showToast = (
    message: string, 
    type: 'success' | 'error' = 'success'
  ) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  };

  const myAlert = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setAlertData({ message: msg, type });
  };

  const myConfirm = (msg: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmData({ message: msg, resolve });
    });
  };

  // Chat logs
  const [conversations, setConversations] = useState<Record<string, any[]>>({});
  const [loadingConv, setLoadingConv] = useState<Record<string, boolean>>({});
  const loadedConvs = useRef<Set<string>>(new Set());

  // Typing state
  const [isAgentTyping, setIsAgentTyping] = useState(false);

  // Auto-scroll anchor ref
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // View state inputs
  const [followUpDate, setFollowUpDate] = useState<Record<string, string>>({});
  const [savingFollowUp, setSavingFollowUp] = useState<Record<string, boolean>>({});
  const [analyzingLead, setAnalyzingLead] = useState<Record<string, boolean>>({});
  const [businessName, setBusinessName] = useState('');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'active' | 'messages'>('active');
  const [showLeadActions, setShowLeadActions] = useState(false);

  // Quick message input states
  const [composeTab, setComposeTab] = useState<'reply' | 'note' | 'followup'>('reply');
  const [quickMsgText, setQuickMsgText] = useState<Record<string, string>>({});
  const [sendingMsg, setSendingMsg] = useState<Record<string, boolean>>({});
  const [quickNotesText, setQuickNotesText] = useState<Record<string, string>>({});
  const [savingNote, setSavingNote] = useState<Record<string, boolean>>({});

  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [editingPreviews, setEditingPreviews] = useState<Record<string, string>>({});
  const [loadingPreview, setLoadingPreview] = useState<Record<string, boolean>>({});
  const [processingAction, setProcessingAction] = useState<Record<string, boolean>>({});
  const [sentConfirmations, setSentConfirmations] = useState<Record<string, string>>({});

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
    setSyncStatus('syncing');
    setError('');
    try {
      const url = triggerSync ? '/api/dashboard/leads?sync=true' : '/api/dashboard/leads';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to retrieve CRM leads data.');
      const data = await res.json();
      if (data && (Array.isArray(data.leads) || Array.isArray(data))) {
        const fetched = Array.isArray(data.leads) ? data.leads : data;
        setLeads((prev) => mergeFetchedLeads(prev, fetched));
      }
      setSyncStatus('synced');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (err: any) {
      setError(err.message || 'Error communicating with database.');
      setSyncStatus('idle');
    } finally {
      setLoading(false);
    }
  };

  const fetchClientDetails = async () => {
    try {
      const res = await fetch('/api/dashboard/client');
      if (res.ok) {
        const data = await res.json();
        setClient(data);
        if (data.businessName) setBusinessName(data.businessName);
      }
    } catch { }
  };

  const fetchConversation = async (phone: string, isSilent = false) => {
    const hasAlreadyLoaded = loadedConvs.current.has(phone);

    if (!isSilent && !hasAlreadyLoaded) {
      setLoadingConv((prev) => ({ ...prev, [phone]: true }));
    }

    try {
      const res = await fetch(`/api/dashboard/leads/${phone}`);
      if (!res.ok) throw new Error('Failed to load chat history.');
      const data = await res.json();
      if (data && Array.isArray(data.messages)) {
        const prevLength = conversations[phone]?.length || 0;
        setConversations((prev) => {
          const localList = prev[phone] || [];
          const merged = mergeFetchedMessages(localList, data.messages);
          return { ...prev, [phone]: merged };
        });

        // Sync lead list preview and recency immediately on fetch
        if (data.messages.length > 0) {
          const lastMsg = data.messages[data.messages.length - 1];
          updateLeadLastMessage(phone, lastMsg.text, lastMsg.timestamp);
        }
        
        if (data.messages.length > prevLength) {
          const lastMsg = data.messages[data.messages.length - 1];
          if (lastMsg.sender === 'agent') {
            setIsAgentTyping(false);
          }
        }

        if (!hasAlreadyLoaded) {
          loadedConvs.current.add(phone);
        }
      }
    } catch (err: any) {
      console.error('Fetch conversation error:', err.message);
    } finally {
      if (!isSilent) {
        setLoadingConv((prev) => ({ ...prev, [phone]: false }));
      }
    }
  };

  useEffect(() => {
    fetchLeadsData(true, true);
    fetchClientDetails();
  }, []);

  useEffect(() => {
    const idParam = searchParams.get('id');

    if (idParam) {
      if (leads.some((l) => l.phone === idParam)) {
        setSelectedLeadId(idParam);
        userInteracted.current = true;
      }
    } else {
      if (leads.length > 0 && !userInteracted.current) {
        const sorted = [...leads].sort((a, b) => {
          const dateA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
          const dateB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
          return dateB - dateA;
        });
        if (sorted.length > 0) {
          const defaultLeadId = sorted[0].phone;
          setSelectedLeadId(defaultLeadId);
          userInteracted.current = true;
          const url = new URL(window.location.href);
          url.searchParams.set('id', defaultLeadId);
          window.history.pushState(null, '', url.pathname + url.search);
        }
      }
    }
  }, [searchParams, leads]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchLeadsData(false, false);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedLeadId) return;
    const interval = setInterval(() => {
      fetchConversation(selectedLeadId, true);
    }, 10000);
    return () => clearInterval(interval);
  }, [selectedLeadId]);

  useEffect(() => {
    if (!selectedLeadId) return;

    setShowLeadActions(false);

    if (!conversations[selectedLeadId]) {
      fetchConversation(selectedLeadId);
    }

    const lead = leads.find(l => l.phone === selectedLeadId);
    if (lead) {
      if (quickNotesText[selectedLeadId] === undefined) {
        setQuickNotesText(prev => ({ ...prev, [selectedLeadId]: lead.notes || '' }));
      }
      if (!followUpDate[selectedLeadId]) {
        setFollowUpDate(prev => ({
          ...prev,
          [selectedLeadId]: lead.follow_up_date ? new Date(lead.follow_up_date).toISOString().slice(0, 16) : ''
        }));
      }

      const isFollowUpDue = lead.follow_up_date && new Date(lead.follow_up_date) < new Date() && !lead.follow_up_sent;
      if (isFollowUpDue && !previews[selectedLeadId] && !loadingPreview[selectedLeadId]) {
        handleGeneratePreview(selectedLeadId);
      }
    }
  }, [selectedLeadId, leads]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
    }
  }, [selectedLeadId]);

  useEffect(() => {
    if (!scrollContainerRef.current || !messagesEndRef.current) return;
    const container = scrollContainerRef.current;
    // If the user is within 200px of the bottom, auto-scroll to keep new messages in view
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 200;
    
    if (isNearBottom) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversations[selectedLeadId || ''], isAgentTyping]);

  const handleQuickSend = async () => {
    if (!selectedLeadId) return;
    const text = quickMsgText[selectedLeadId];
    if (!text || !text.trim()) return;

    const tempId = crypto.randomUUID();
    const optimisticMsg = {
      id: tempId,
      sender: 'agent' as const,
      text: text,
      timestamp: new Date().toISOString(),
      status: 'sending' as const,
    };

    // 1. Immediately append to state
    setConversations((prev) => {
      const existing = prev[selectedLeadId] || [];
      return { ...prev, [selectedLeadId]: [...existing, optimisticMsg] };
    });

    // Instantly update lead preview and sorting order in left panel list
    updateLeadLastMessage(selectedLeadId, text, optimisticMsg.timestamp);

    // 2. Immediately clear input field
    setQuickMsgText((prev) => ({ ...prev, [selectedLeadId]: '' }));

    // 3. Fire PATCH request in background
    fetch(`/api/dashboard/leads/${selectedLeadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'send_message', text }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to send');
        }
        // Update local state to delivered
        setConversations((prev) => {
          const list = prev[selectedLeadId] || [];
          return {
            ...prev,
            [selectedLeadId]: list.map((m) =>
              m.id === tempId ? { ...m, status: 'delivered' as const } : m
            ),
          };
        });
      })
      .catch((err) => {
        console.error('Delivering chat message failed:', err.message);
        // Update local state to failed
        setConversations((prev) => {
          const list = prev[selectedLeadId] || [];
          return {
            ...prev,
            [selectedLeadId]: list.map((m) =>
              m.id === tempId ? { ...m, status: 'failed' as const } : m
            ),
          };
        });
      });
  };

  const handleRetryMessage = async (tempId: string, text: string) => {
    if (!selectedLeadId) return;

    // Reset status to sending
    setConversations((prev) => {
      const list = prev[selectedLeadId] || [];
      return {
        ...prev,
        [selectedLeadId]: list.map((m) =>
          m.id === tempId ? { ...m, status: 'sending' as const } : m
        ),
      };
    });

    const parsed = parseMessageContent(text);
    const bodyPayload: any = { action: 'send_message' };
    
    if (parsed.isMedia && !parsed.mediaUrl?.startsWith('blob:')) {
      bodyPayload.mediaUrl = parsed.mediaUrl;
      bodyPayload.mediaType = parsed.mediaType;
      bodyPayload.filename = parsed.filename;
      if (parsed.caption) bodyPayload.text = parsed.caption;
    } else if (parsed.isMedia && parsed.mediaUrl?.startsWith('blob:')) {
      alert("Cannot retry this media upload. Please select the file again.");
      setConversations((prev) => ({
        ...prev,
        [selectedLeadId]: (prev[selectedLeadId] || []).map((m) =>
          m.id === tempId ? { ...m, status: 'failed' as const } : m
        )
      }));
      return;
    } else {
      bodyPayload.text = text;
    }

    // Try PATCH again
    fetch(`/api/dashboard/leads/${selectedLeadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyPayload),
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to send');
        }
        setConversations((prev) => {
          const list = prev[selectedLeadId] || [];
          return {
            ...prev,
            [selectedLeadId]: list.map((m) =>
              m.id === tempId ? { ...m, status: 'delivered' as const } : m
            ),
          };
        });
      })
      .catch((err) => {
        console.error('Retry failed:', err.message);
        setConversations((prev) => {
          const list = prev[selectedLeadId] || [];
          return {
            ...prev,
            [selectedLeadId]: list.map((m) =>
              m.id === tempId ? { ...m, status: 'failed' as const } : m
            ),
          };
        });
      });
  };

  const handleSendAttachment = async (file: File, type: 'image' | 'document' | 'video' | 'audio') => {
    if (!selectedLeadId) return;

    const tempId = crypto.randomUUID();
    const tempUrl = URL.createObjectURL(file);
    const serializedText = formatMediaMessage(type, tempUrl, file.name);

    const optimisticMsg = {
      id: tempId,
      sender: 'agent' as const,
      text: serializedText,
      timestamp: new Date().toISOString(),
      status: 'sending' as const,
    };

    // Immediately append
    setConversations((prev) => {
      const existing = prev[selectedLeadId] || [];
      return { ...prev, [selectedLeadId]: [...existing, optimisticMsg] };
    });

    // Instantly update lead preview and sorting order in left panel list
    updateLeadLastMessage(selectedLeadId, serializedText, optimisticMsg.timestamp);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // 1. Upload to storage
      const uploadRes = await fetch('/api/dashboard/upload?bucket=chat-attachments', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        const uploadErr = await uploadRes.json();
        throw new Error(uploadErr.error || 'Upload failed');
      }

      const uploadData = await uploadRes.json();
      const publicUrl = uploadData.url;

      // 2. Call PATCH route
      const patchRes = await fetch(`/api/dashboard/leads/${selectedLeadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_message',
          mediaUrl: publicUrl,
          mediaType: type,
          filename: file.name,
        }),
      });

      if (!patchRes.ok) {
        const patchErr = await patchRes.json();
        throw new Error(patchErr.error || 'PATCH failed');
      }

      // Success: Swap temp URL for permanent URL
      const finalSerialized = formatMediaMessage(type, publicUrl, file.name);
      setConversations((prev) => {
        const list = prev[selectedLeadId] || [];
        return {
          ...prev,
          [selectedLeadId]: list.map((m) =>
            m.id === tempId ? { ...m, text: finalSerialized, status: 'delivered' as const } : m
          ),
        };
      });
    } catch (err: any) {
      console.error('Send attachment error:', err.message);
      setConversations((prev) => {
        const list = prev[selectedLeadId] || [];
        return {
          ...prev,
          [selectedLeadId]: list.map((m) =>
            m.id === tempId ? { ...m, status: 'failed' as const } : m
          ),
        };
      });
    }
  };

  const handleSendVoiceNote = async (audioBlob: Blob) => {
    if (!selectedLeadId) return;

    const tempId = crypto.randomUUID();
    const tempUrl = URL.createObjectURL(audioBlob);
    const serializedText = formatMediaMessage('audio', tempUrl);

    const optimisticMsg = {
      id: tempId,
      sender: 'agent' as const,
      text: serializedText,
      timestamp: new Date().toISOString(),
      status: 'sending' as const,
    };

    // Immediately append
    setConversations((prev) => {
      const existing = prev[selectedLeadId] || [];
      return { ...prev, [selectedLeadId]: [...existing, optimisticMsg] };
    });

    // Instantly update lead preview and sorting order in left panel list
    updateLeadLastMessage(selectedLeadId, serializedText, optimisticMsg.timestamp);

    try {
      const voiceFile = new File([audioBlob], `voice_${Date.now()}.webm`, {
        type: 'audio/webm',
      });

      const formData = new FormData();
      formData.append('file', voiceFile);

      // 1. Upload to storage
      const uploadRes = await fetch('/api/dashboard/upload?bucket=chat-attachments', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        const uploadErr = await uploadRes.json();
        throw new Error(uploadErr.error || 'Voice note upload failed');
      }

      const uploadData = await uploadRes.json();
      const publicUrl = uploadData.url;

      // 2. Call PATCH route
      const patchRes = await fetch(`/api/dashboard/leads/${selectedLeadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_message',
          mediaUrl: publicUrl,
          mediaType: 'audio',
        }),
      });

      if (!patchRes.ok) {
        const patchErr = await patchRes.json();
        throw new Error(patchErr.error || 'PATCH failed');
      }

      // Success: Swap temp URL for permanent URL
      const finalSerialized = formatMediaMessage('audio', publicUrl);
      setConversations((prev) => {
        const list = prev[selectedLeadId] || [];
        return {
          ...prev,
          [selectedLeadId]: list.map((m) =>
            m.id === tempId ? { ...m, text: finalSerialized, status: 'delivered' as const } : m
          ),
        };
      });
    } catch (err: any) {
      console.error('Send voice note error:', err.message);
      setConversations((prev) => {
        const list = prev[selectedLeadId] || [];
        return {
          ...prev,
          [selectedLeadId]: list.map((m) =>
            m.id === tempId ? { ...m, status: 'failed' as const } : m
          ),
        };
      });
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
    const confirmed = await myConfirm('Are you sure you want to cancel the scheduled auto-followup for this lead?');
    if (!confirmed) return;
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

  const handleRefreshLeads = async () => {
    const confirmed = await myConfirm('This will clear your leads cache and rebuild everything fresh from current conversation logs. Continue?');
    if (!confirmed) return;
    setSyncing(true);
    try {
      const res = await fetch('/api/dashboard/leads/analyze-all?clear=true', { method: 'POST' });
      if (!res.ok) throw new Error('Refreshing leads failed.');
      fetchLeadsData(false);
      myAlert('Leads cache cleared and rebuilt successfully!', 'success');
    } catch (err: any) {
      myAlert(err.message || 'Refresh operation failed.', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleExportCSV = () => {
    if (leads.length === 0) return;
    const headers = ['Name', 'Phone', 'Intent', 'Language', 'Last Active', 'Total Messages', 'Summary', 'Converted', 'DND', 'Notes'];
    const rows = leads.map((l) => [
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

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `scalecraft_crm_leads_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAiDraftClick = async () => {
    if (!selectedLeadId) return;
    setLoadingPreview(prev => ({ ...prev, [selectedLeadId]: true }));
    try {
      const res = await fetch('/api/dashboard/leads/followup/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'preview', phone: selectedLeadId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate preview');
      setQuickMsgText(prev => ({ ...prev, [selectedLeadId]: data.message }));
      myAlert('AI Draft loaded into editor!', 'success');
    } catch (err: any) {
      myAlert(err.message, 'error');
    } finally {
      setLoadingPreview(prev => ({ ...prev, [selectedLeadId]: false }));
    }
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

  // Filter conditions
  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      (lead.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.phone.includes(searchQuery) ||
      (lead.summary || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'hot' && lead.intent === 'hot' && !lead.is_converted && !lead.is_dnd) ||
      (statusFilter === 'warm' && lead.intent === 'warm' && !lead.is_converted && !lead.is_dnd) ||
      (statusFilter === 'followup' && (lead.intent === 'follow_up' || lead.manual_status === 'Follow-up Needed') && !lead.is_converted && !lead.is_dnd) ||
      (statusFilter === 'converted' && lead.is_converted) ||
      (statusFilter === 'dnd' && lead.is_dnd);

    return matchesSearch && matchesStatus;
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
    return 0;
  });

  const selectedLead = leads.find(l => l.phone === selectedLeadId);

  // Generate dataset for chart (engagement stats / message distribution)
  const chartData = selectedLead
    ? [
        { name: 'User', count: selectedLead.user_messages || 0, fill: '#005C4B' },
        { name: 'Agent', count: selectedLead.agent_messages || 0, fill: '#00A884' },
      ]
    : [];

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full w-full min-h-0 bg-[#EFEAE2] dark:bg-[#0B141A]">
      
      {/* ========================================== */}
      {/* LEFT PANEL — WhatsApp Sidebar              */}
      {/* ========================================== */}
      <div className="w-full md:w-[340px] bg-white dark:bg-[#111B21] border-r border-[#E5E7EB] dark:border-[#2A3942] flex flex-col shrink-0 h-full">
        {/* Header */}
        <div className="h-[56px] bg-[#202C33] flex items-center justify-between px-4 select-none shrink-0">
          <Avatar name={businessName} phone={client?.whatsappBotNumber || ''} size="md" />
          <div className="flex items-center gap-4 text-[#AEBAC1]">
            <button
              onClick={handleRefreshLeads}
              disabled={syncing}
              title="Clear cache & sync VPS logs"
              className="p-1 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={17} className={syncing ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={handleExportCSV}
              title="Export leads to CSV"
              className="p-1 hover:text-white transition-colors cursor-pointer"
            >
              <Download size={17} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-2.5 bg-white dark:bg-[#111B21] border-b border-[#F0F0F0] dark:border-[#222D34] shrink-0">
          <div className="relative flex items-center bg-gray-100 dark:bg-[#202C33] rounded-lg px-3 py-1.5 focus-within:ring-1 focus-within:ring-brand">
            <Search size={15} className="text-text-subtle dark:text-[#8696A0] mr-2" />
            <input
              type="text"
              placeholder="Search or start new chat"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs outline-none text-text-primary dark:text-[#E9EDEF] placeholder-text-subtle dark:placeholder-[#8696A0]"
            />
          </div>
        </div>

        {/* Filter Pills Nav */}
        <div className="px-3 py-2 bg-white dark:bg-[#111B21] border-b border-[#F0F0F0] dark:border-[#222D34] flex gap-1.5 overflow-x-auto scrollbar-none shrink-0 select-none">
          {[
            { id: 'all', label: 'All' },
            { id: 'hot', label: 'Hot' },
            { id: 'warm', label: 'Warm' },
            { id: 'followup', label: 'Follow-up' },
            { id: 'converted', label: 'Converted' },
            { id: 'dnd', label: 'DND' },
          ].map((tab) => {
            const isTabActive = statusFilter === tab.id;
            
            let pillClass = '';
            if (isTabActive) {
              if (tab.id === 'hot') pillClass = 'bg-red-600 text-white border-red-600';
              else if (tab.id === 'warm') pillClass = 'bg-amber-600 text-white border-amber-600';
              else if (tab.id === 'followup') pillClass = 'bg-blue-600 text-white border-blue-600';
              else if (tab.id === 'converted') pillClass = 'bg-green-600 text-white border-green-600';
              else pillClass = 'bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900';
            } else {
              if (tab.id === 'hot') pillClass = 'text-red-600 border border-red-200 bg-white hover:bg-red-50/50';
              else if (tab.id === 'warm') pillClass = 'text-amber-600 border border-amber-200 bg-white hover:bg-amber-50/50';
              else if (tab.id === 'followup') pillClass = 'text-blue-600 border border-blue-200 bg-white hover:bg-blue-50/50';
              else if (tab.id === 'converted') pillClass = 'text-green-600 border border-green-200 bg-white hover:bg-green-50/50';
              else pillClass = 'text-gray-700 border border-border bg-white hover:bg-surface-0';
            }

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`text-[10px] font-black uppercase tracking-wide px-3 py-1.5 rounded-full shrink-0 transition-all cursor-pointer ${pillClass}`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Lead List Scroll Area */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#E5E7EB] dark:divide-[#2A3942]">
          {loading ? (
            <LeadListSkeleton />
          ) : sortedLeads.length === 0 ? (
            <div className="p-8 text-center text-xs text-text-subtle italic">
              No conversations found.
            </div>
          ) : (
            sortedLeads.map((lead) => (
              <LeadListItem
                key={lead.phone}
                lead={lead}
                isActive={selectedLeadId === lead.phone}
                onClick={() => {
                  setSelectedLeadId(lead.phone);
                  setLeads((prevLeads) => 
                    prevLeads.map((l) => l.phone === lead.phone ? { ...l, unread_count: 0 } : l)
                  );
                  userInteracted.current = true;
                  const url = new URL(window.location.href);
                  url.searchParams.set('id', lead.phone);
                  window.history.pushState(null, '', url.pathname + url.search);
                }}
              />
            ))
          )}
        </div>

        {/* Sync Info Footer */}
        <div className="h-9 border-t border-[#E5E7EB] dark:border-[#2A3942] bg-[#FAF9F6] dark:bg-[#111B21] flex items-center justify-center select-none text-[10px] text-[#8696A0] uppercase font-bold tracking-wider shrink-0 gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
          <span>Live Sync Connection Online</span>
        </div>
      </div>

      {/* ========================================== */}
      {/* CENTER PANEL — WhatsApp Chat Window        */}
      {/* ========================================== */}
      <div className="flex-1 flex flex-col h-full bg-[#EFEAE2] dark:bg-[#0B141A] relative min-w-0">
        {selectedLead ? (
          <>
            {/* Header */}
            <ChatHeader
              name={cleanLeadName(selectedLead.name || selectedLead.phone)}
              phone={selectedLead.phone}
              intent={selectedLead.intent}
              connectionType={client?.connectionType}
              onAnalyzeLead={() => handleAnalyzeWithAI(selectedLead.phone)}
              onMarkConverted={() => handleMarkConverted(selectedLead.phone, !selectedLead.is_converted)}
              onToggleActions={() => setShowLeadActions(!showLeadActions)}
              showLeadActions={showLeadActions}
              isDnd={selectedLead.is_dnd}
              onToggleDnd={() => handleMarkDnd(selectedLead.phone, !selectedLead.is_dnd)}
            />

            {/* Connection Status Warn Banner */}
            {client?.status !== 'active' && (
              <div className="bg-[#FFF3E0] border-b border-orange-200 text-orange-950 text-[10px] font-bold py-1.5 px-4 text-center shrink-0 flex items-center justify-center gap-1.5">
                <AlertTriangle size={12} className="text-orange-700" />
                <span>WhatsApp Bot server pairing is disconnected. AI automated replies are inactive.</span>
                <Link href="/dashboard/status" className="underline font-black hover:text-black">Pair Now &rarr;</Link>
              </div>
            )}

            {/* Messages Scroll Panel */}
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-[6%] py-6 space-y-3">
              {loadingConv[selectedLead.phone] && !conversations[selectedLead.phone] ? (
                <ChatBubblesSkeleton />
              ) : !conversations[selectedLead.phone] || conversations[selectedLead.phone].length === 0 ? (
                <div className="text-center py-20 text-xs text-text-subtle font-semibold italic bg-white/40 dark:bg-black/10 rounded-xl p-6">
                  No conversation logs synced from the VPS. Check bot setup on the status page.
                </div>
              ) : (
                (() => {
                  let lastDateStr = '';
                  
                  // Pre-process messages to merge Audio shadow messages + Text transcriptions
                  const processedMsgs: any[] = [];
                  const rawMsgs = conversations[selectedLead.phone];
                  for (let i = 0; i < rawMsgs.length; i++) {
                    const msg = rawMsgs[i];
                    
                    // If this is an audio shadow message...
                    if (msg.role === 'user' && msg.text && msg.text.startsWith('[media:audio:')) {
                      // Check if the next message is a transcription (within 15 seconds)
                      const nextMsg = rawMsgs[i + 1];
                      if (nextMsg && nextMsg.role === 'user' && !nextMsg.text.startsWith('[media:')) {
                        const diffMs = new Date(nextMsg.timestamp).getTime() - new Date(msg.timestamp).getTime();
                        if (diffMs < 15000) {
                          // Merge them: append the transcription text as the caption of the audio media tag
                          // [media:audio:url] + transcription -> [media:audio:url]transcription
                          const mergedMsg = {
                            ...msg,
                            text: msg.text + nextMsg.text,
                            id: msg.id || nextMsg.id
                          };
                          processedMsgs.push(mergedMsg);
                          i++; // skip the next message since it's merged
                          continue;
                        }
                      }
                    }
                    processedMsgs.push(msg);
                  }

                  return processedMsgs.map((msg, idx) => {
                    const msgDateStr = new Date(msg.timestamp).toDateString();
                    const showDateSeparator = msgDateStr !== lastDateStr;
                    lastDateStr = msgDateStr;

                    // Consecutive logic (check if same sender within 5 mins)
                    let isConsecutive = false;
                    if (idx > 0) {
                      const prevMsg = processedMsgs[idx - 1];
                      const diffMs = new Date(msg.timestamp).getTime() - new Date(prevMsg.timestamp).getTime();
                      isConsecutive = prevMsg.sender === msg.sender && diffMs < 300000;
                    }

                    const msgTime = msg.timestamp ? new Date(msg.timestamp).getTime() : 0;
                    
                    // Directly map authentic Meta API status
                    const computedStatus: 'read' | 'delivered' | 'sent' | 'failed' = 
                      msg.status === 'failed' ? 'failed' 
                      : (msg.status === 'read' || msg.read) ? 'read' 
                      : (msg.status === 'delivered') ? 'delivered'
                      : (msg.status === 'sent') ? 'sent'
                      : 'delivered';

                    const msgWithStatus = {
                      ...msg,
                      id: msg.id || `${idx}_${msgTime}`,
                      read: computedStatus === 'read',
                      status: computedStatus
                    };

                    return (
                      <React.Fragment key={idx}>
                        {showDateSeparator && (
                          <div className="flex justify-center my-4 sticky top-1 z-10">
                            <span className="bg-[#E9EDEF]/90 backdrop-blur-xs text-[11px] font-bold text-[#54656F] rounded-full px-3 py-1 shadow-xs uppercase tracking-wide">
                              {formatDateSeparator(msg.timestamp)}
                            </span>
                          </div>
                        )}

                        <ChatBubble message={msgWithStatus} isConsecutive={isConsecutive} onRetry={handleRetryMessage} />
                      </React.Fragment>
                    );
                  });
                })()
              )}

              {/* Typing simulation bubble */}
              {isAgentTyping && <TypingIndicator />}

              <div ref={messagesEndRef} />
            </div>

            {/* Compose inputs */}
            <ComposeBar
              phone={selectedLead.phone}
              replyText={quickMsgText[selectedLead.phone] || ''}
              onReplyTextChange={(text) => setQuickMsgText({ ...quickMsgText, [selectedLead.phone]: text })}
              onSendReply={handleQuickSend}
              sendingReply={sendingMsg[selectedLead.phone] || false}
              noteText={quickNotesText[selectedLead.phone] || ''}
              onNoteTextChange={(text) => setQuickNotesText({ ...quickNotesText, [selectedLead.phone]: text })}
              onSaveNote={async () => {
                await handleSaveNotesOnBlur(selectedLead.phone, quickNotesText[selectedLead.phone]);
                myAlert('Note saved successfully!', 'success');
              }}
              savingNote={savingNote[selectedLead.phone] || false}
              followUpDate={followUpDate[selectedLead.phone] || ''}
              onFollowUpDateChange={(date) => setFollowUpDate({ ...followUpDate, [selectedLead.phone]: date })}
              onScheduleFollowUp={() => handleScheduleFollowUp(selectedLead.phone)}
              onCancelFollowUp={() => handleCancelFollowUp(selectedLead.phone)}
              hasFollowUp={!!selectedLead.follow_up_date}
              savingFollowUp={savingFollowUp[selectedLead.phone] || false}
              onAiDraftClick={handleAiDraftClick}
              loadingAiDraft={loadingPreview[selectedLead.phone] || false}
              activeTab={composeTab}
              onTabChange={(tab) => setComposeTab(tab)}
              onSendAttachment={handleSendAttachment}
              onSendVoiceNote={handleSendVoiceNote}
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white/40 dark:bg-black/10 select-none">
            <MessageSquare size={48} className="text-[#AEBAC1] dark:text-[#8696A0] mb-2" />
            <h3 className="text-sm font-black text-text-primary dark:text-[#E9EDEF] uppercase tracking-wider">
              No Conversation Selected
            </h3>
            <p className="text-xs text-text-subtle dark:text-[#8696A0] max-w-xs mt-1">
              Select a conversation from the left pane to view log transcripts and draft AI replies.
            </p>
          </div>
        )}
      </div>

      {/* ========================================== */}
      {/* RIGHT PANEL — Contact Info                 */}
      {/* ========================================== */}
      <div className="w-full md:w-[280px] bg-white dark:bg-[#1C1C1A] border-l border-border dark:border-[#2A3942] flex flex-col shrink-0 h-full overflow-y-auto select-none">
        {selectedLead ? (
          <div className="flex flex-col">
            {/* Header Profile Info card */}
            <div className="bg-[#202C33] p-6 text-center border-b border-border dark:border-border/10 flex flex-col items-center justify-center shrink-0">
              <Avatar name={cleanLeadName(selectedLead.name || selectedLead.phone)} phone={selectedLead.phone} intent={selectedLead.intent} size="xl" />
              <h4 className="text-[15px] font-black text-white mt-3 truncate w-full px-2">
                {cleanLeadName(selectedLead.name || selectedLead.phone)}
              </h4>
              <p className="text-xs text-[#8696A0] font-semibold mt-1">
                {formatPhoneNumber(selectedLead.phone)}
              </p>
            </div>

            <div className="p-4 space-y-6">
              {/* Engagement Score Chart */}
              <div className="space-y-2.5">
                <span className="block text-[10px] font-black text-text-muted dark:text-[#8696A0] uppercase tracking-wider">
                  Lead Intent Analytics
                </span>
                <div className="bg-surface-0 dark:bg-[#111B21] border border-border dark:border-[#2A3942] rounded-xl p-3.5 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-text-secondary dark:text-text-muted">Buying Score:</span>
                    <span className="text-sm font-black text-text-primary dark:text-foreground font-mono">{selectedLead.intent_score || 0} / 10</span>
                  </div>
                  
                  {/* Recharts Mini Bar Chart */}
                  <div className="h-16 w-full pt-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} layout="vertical">
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="name" width={40} tick={{ fill: '#8696A0', fontSize: 10, fontWeight: 'bold' }} stroke="none" />
                        <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ fontSize: 10, borderRadius: 6 }} />
                        <Bar dataKey="count" radius={4} barSize={8} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="text-[9px] text-text-subtle dark:text-text-subtle text-center font-bold uppercase tracking-wide border-t border-border dark:border-border/10 pt-2 flex justify-between items-center">
                    <span>User Msgs: {selectedLead.user_messages || 0}</span>
                    <span>Agent Msgs: {selectedLead.agent_messages || 0}</span>
                  </div>
                </div>
              </div>

              {/* Status Section */}
              <div className="space-y-2 border-t border-border dark:border-[#2A3942] pt-4">
                <span className="block text-[10px] font-black text-text-muted dark:text-[#8696A0] uppercase tracking-wider">
                  Intent Status & Tags
                </span>
                
                <select
                  value={selectedLead.intent}
                  onChange={async (e) => {
                    const val = e.target.value as any;
                    try {
                      const res = await fetch(`/api/dashboard/leads/${selectedLead.phone}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ intent: val, is_converted: val === 'converted' }),
                      });
                      if (!res.ok) throw new Error('Failed to update intent');
                      setLeads(prev => prev.map(l => l.phone === selectedLead.phone ? { ...l, intent: val, is_converted: val === 'converted' } : l));
                      myAlert('Intent status updated successfully!', 'success');
                    } catch (err: any) {
                      myAlert(err.message, 'error');
                    }
                  }}
                  className="w-full text-xs font-bold border border-border dark:border-[#2A3942] rounded-lg px-2.5 py-2 bg-white dark:bg-[#111B21] text-text-primary dark:text-[#E9EDEF] cursor-pointer focus:outline-none focus:border-brand"
                >
                  <option value="hot">🔥 Hot</option>
                  <option value="warm">⚡ Warm</option>
                  <option value="follow_up">📅 Follow-up</option>
                  <option value="cold">❄ Cold</option>
                  <option value="converted">✅ Converted</option>
                  <option value="not_interested">🚫 Not Interested</option>
                  <option value="spam">⚠️ Spam</option>
                </select>

                <div className="flex flex-wrap gap-1.5 pt-1.5">
                  <Badge variant="brand" size="sm">
                    {selectedLead.category ? selectedLead.category.replace('_', ' ') : 'General'}
                  </Badge>
                  <Badge variant="info" size="sm">
                    {selectedLead.language || 'English'}
                  </Badge>
                </div>
              </div>

              {/* Details List */}
              <div className="space-y-2 border-t border-border dark:border-[#2A3942] pt-4">
                <span className="block text-[10px] font-black text-text-muted dark:text-[#8696A0] uppercase tracking-wider">
                  Contact Metadata
                </span>
                
                <div className="space-y-2.5 text-xs text-text-secondary dark:text-[#AEBAC1]">
                  <div className="flex justify-between items-center">
                    <span className="text-text-subtle dark:text-text-subtle font-semibold">First Contact:</span>
                    <span className="font-bold text-text-primary dark:text-foreground">
                      {selectedLead.first_message_at ? new Date(selectedLead.first_message_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'N/A'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-text-subtle dark:text-text-subtle font-semibold">Total Messages:</span>
                    <span className="font-mono font-bold text-text-primary dark:text-foreground">
                      {selectedLead.total_messages || 0}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-text-subtle dark:text-text-subtle font-semibold">Estimated Cost:</span>
                    <span className="font-mono font-black text-success">
                      ₹{((selectedLead.agent_messages || 0) * 0.012).toFixed(3)}
                    </span>
                  </div>

                  {selectedLead.order_product && (
                    <div className="flex justify-between items-center">
                      <span className="text-text-subtle dark:text-text-subtle font-semibold">Order:</span>
                      <span className="font-bold text-brand truncate max-w-[120px]">{selectedLead.order_product}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* AI Summary */}
              {selectedLead.summary && (
                <div className="px-4 py-3 border-t border-[var(--color-border)]">
                  <p className="text-[11px] font-semibold text-[var(--color-text-subtle)] uppercase tracking-wider mb-2">
                    AI SUMMARY
                  </p>
                  <p className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed font-sans font-semibold">
                    {selectedLead.summary}
                  </p>
                </div>
              )}

              {/* Products Discussed */}
              {selectedLead.productsDiscussed && 
               selectedLead.productsDiscussed.length > 0 && (
                <div className="px-4 py-3 border-t border-[var(--color-border)]">
                  <p className="text-[11px] font-semibold text-[var(--color-text-subtle)] uppercase tracking-wider mb-2">
                    PRODUCTS DISCUSSED
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedLead.productsDiscussed.map(
                      (product: string) => (
                        <span key={product}
                          className="text-[11px] px-2 py-1 rounded-full bg-brand-light text-brand border border-brand/20 font-extrabold uppercase tracking-wide">
                          {product}
                        </span>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Follow-up History */}
              {selectedLead.followUpHistory && 
               selectedLead.followUpHistory.length > 0 && (
                <div className="px-4 py-3 border-t border-[var(--color-border)]">
                  <p className="text-[11px] font-semibold text-[var(--color-text-subtle)] uppercase tracking-wider mb-2">
                    FOLLOW-UP HISTORY
                  </p>
                  <div className="space-y-1.5">
                    {selectedLead.followUpHistory
                      .slice(0, 3)
                      .map((fu: any, i: number) => (
                        <div key={i} 
                          className="text-[11px] text-[var(--color-text-muted)] font-semibold">
                          {fu.sentAt ? 
                            new Date(fu.sentAt)
                              .toLocaleDateString('en-IN') 
                            : 'N/A'
                          } — {fu.message?.slice(0, 50)}...
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}

              {/* Shared Products */}
              {selectedLead.products_mentioned && selectedLead.products_mentioned.length > 0 && (
                <div className="space-y-2 border-t border-border dark:border-[#2A3942] pt-4">
                  <span className="block text-[10px] font-black text-text-muted dark:text-[#8696A0] uppercase tracking-wider">
                    Discussed Products
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {selectedLead.products_mentioned.map((prod, idx) => (
                      <span key={idx} className="bg-brand-light text-brand-dark dark:bg-brand/10 dark:text-brand px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide border border-brand/10">
                        {prod}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Private Notes (Autosaves) */}
              <div className="space-y-2 border-t border-border dark:border-[#2A3942] pt-4">
                <span className="block text-[10px] font-black text-text-muted dark:text-[#8696A0] uppercase tracking-wider">
                  Private Notes
                </span>
                <textarea
                  rows={3}
                  value={quickNotesText[selectedLead.phone] || ''}
                  onChange={(e) => setQuickNotesText({ ...quickNotesText, [selectedLead.phone]: e.target.value })}
                  onBlur={(e) => handleSaveNotesOnBlur(selectedLead.phone, e.target.value)}
                  placeholder="Add note..."
                  className="w-full text-xs font-semibold border border-border dark:border-[#2A3942] rounded-lg p-2.5 bg-surface-0 dark:bg-[#111B21] text-text-primary dark:text-[#E9EDEF] focus:outline-none focus:border-brand resize-none font-sans"
                />
              </div>

              {/* Actions Button Grid */}
              <div className="space-y-2 border-t border-border dark:border-[#2A3942] pt-4">
                <span className="block text-[10px] font-black text-text-muted dark:text-[#8696A0] uppercase tracking-wider">
                  Quick Actions
                </span>

                <div className="grid grid-cols-2 gap-2 text-center text-[10px] font-black uppercase tracking-wider">
                  <button
                    type="button"
                    onClick={handleAiDraftClick}
                    disabled={loadingPreview[selectedLead.phone]}
                    className="py-2.5 bg-brand-light hover:bg-brand-light/80 dark:bg-brand/10 text-brand-dark dark:text-brand border border-brand/10 hover:border-brand/20 rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    <Sparkles size={11} />
                    <span>AI Draft</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAnalyzeWithAI(selectedLead.phone)}
                    disabled={analyzingLead[selectedLead.phone]}
                    className="py-2.5 bg-gray-900 hover:bg-black text-white dark:bg-surface-2 dark:hover:bg-[#2A3942] rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    {analyzingLead[selectedLead.phone] ? (
                      <Loader2 size={11} className="animate-spin" />
                    ) : (
                      <Eye size={11} />
                    )}
                    <span>Analyze</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setComposeTab('followup')}
                    className="py-2.5 bg-white border border-border hover:bg-surface-0 dark:bg-transparent dark:hover:bg-[#1F2C33] dark:border-[#2A3942] text-text-secondary dark:text-[#E9EDEF] rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Calendar size={11} />
                    <span>Follow-up</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMarkConverted(selectedLead.phone, !selectedLead.is_converted)}
                    disabled={updatingConverted[selectedLead.phone]}
                    className="py-2.5 bg-brand hover:bg-brand-dark text-white rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center"
                  >
                    {selectedLead.is_converted ? 'Revert Done' : 'Convert'}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleMarkDnd(selectedLead.phone, !selectedLead.is_dnd)}
                  disabled={updatingDnd[selectedLead.phone]}
                  className="w-full py-2.5 bg-transparent border border-red-200 dark:border-red-900 text-danger hover:bg-danger-bg text-[10px] font-black uppercase tracking-wider rounded-lg transition-colors cursor-pointer disabled:opacity-50 mt-1 flex items-center justify-center"
                >
                  {selectedLead.is_dnd ? 'Remove DND' : 'Add DND'}
                </button>
              </div>

            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-text-subtle font-bold uppercase tracking-wider select-none italic pt-12">
            No contact selected
          </div>
        )}
      </div>

      {/* ========================================== */}
      {/* MODALS AND POPUPS                          */}
      {/* ========================================== */}

      {/* Custom Alert Modal */}
      {alertData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[9999] animate-fadeIn">
          <div className="bg-white rounded-2xl border border-border shadow-2xl p-6 max-w-sm w-full mx-4 transform scale-100 transition-transform duration-200 ease-out flex flex-col items-center text-center space-y-4">
            <div className={`p-3 rounded-full ${
              alertData.type === 'success' ? 'bg-success-bg text-success' :
              alertData.type === 'error' ? 'bg-danger-bg text-danger' :
              'bg-info-bg text-info'
            }`}>
              {alertData.type === 'success' && <CheckCircle size={28} />}
              {alertData.type === 'error' && <ShieldAlert size={28} />}
              {alertData.type === 'info' && <Info size={28} />}
            </div>
            <div className="space-y-1.5 w-full">
              <h3 className="text-xs font-black text-text-primary uppercase tracking-wider font-sans">
                {alertData.type === 'success' ? 'Success' :
                  alertData.type === 'error' ? 'Error' : 'Notification'}
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed break-words font-semibold">{alertData.message}</p>
            </div>
            <button
              onClick={() => setAlertData(null)}
              className="w-full bg-brand hover:bg-brand-dark text-white text-xs font-black py-2.5 rounded-lg shadow-sm transition-colors cursor-pointer uppercase tracking-wider"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Custom Confirm Modal */}
      {confirmData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[9999] animate-fadeIn">
          <div className="bg-white rounded-2xl border border-border shadow-2xl p-6 max-w-sm w-full mx-4 transform scale-100 transition-transform duration-200 ease-out flex flex-col items-center text-center space-y-4">
            <div className="p-3 rounded-full bg-warning-bg text-warning animate-bounce">
              <AlertTriangle size={28} />
            </div>
            <div className="space-y-1.5 w-full">
              <h3 className="text-xs font-black text-text-primary uppercase tracking-wider font-sans">
                Confirm Action
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed break-words font-semibold">{confirmData.message}</p>
            </div>
            <div className="flex w-full space-x-3">
              <button
                onClick={() => {
                  confirmData.resolve(false);
                  setConfirmData(null);
                }}
                className="flex-1 bg-surface-2 hover:bg-border text-text-secondary text-xs font-black py-2.5 rounded-lg transition-colors cursor-pointer uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  confirmData.resolve(true);
                  setConfirmData(null);
                }}
                className="flex-1 bg-brand hover:bg-brand-dark text-white text-xs font-black py-2.5 rounded-lg shadow-sm transition-colors cursor-pointer uppercase tracking-wider"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`fixed bottom-6 right-6 z-[99999] 
              flex items-center gap-3 px-4 py-3 
              rounded-xl shadow-lg text-white text-sm
              font-medium ${
              toast.type === 'success' 
                ? 'bg-green-600' 
                : 'bg-red-600'
            }`}
          >
            {toast.type === 'success' 
              ? <Check size={16} /> 
              : <X size={16} />
            }
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

export default function LeadsPage() {
  return (
    <Suspense fallback={<ListPageSkeleton rows={8} />}>
      <LeadsPageInner />
    </Suspense>
  );
}
