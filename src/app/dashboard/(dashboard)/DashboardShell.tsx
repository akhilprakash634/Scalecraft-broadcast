'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Megaphone,
  Package,
  CreditCard,
  LogOut,
  Menu,
  X,
  Bell,
  Info,
  Clock,
  AlertTriangle,
  Moon,
  Sun,
  ChevronDown,
  MessageSquare,
  Bot,
  Settings2,
  Users,
  Kanban
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AnimatePresence, motion } from 'framer-motion';

interface DashboardShellProps {
  children: React.ReactNode;
  businessName: string;
  botNumber: string;
  clientId: string;
}

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success';
  created_at: string;
  expires_at?: string;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  action_url?: string;
  created_at: string;
}

export default function DashboardShell({ children, businessName, botNumber, clientId }: DashboardShellProps) {
  const pathname = usePathname();
  const isInbox = pathname.startsWith('/dashboard/leads');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingFollowupCount, setPendingFollowupCount] = useState<number>(0);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [status, setStatus] = useState<string>('loading');
  const [clientData, setClientData] = useState<any>(null);
  const statusPollRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('scalecraft-theme');
    if (saved === 'dark') {
      setDarkMode(true);
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    if (next) {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.classList.add('dark');
      localStorage.setItem('scalecraft-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      document.documentElement.classList.remove('dark');
      localStorage.setItem('scalecraft-theme', 'light');
    }
  };

  const navItems = [
    { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Inbox', href: '/dashboard/leads', icon: MessageSquare, badge: pendingFollowupCount > 0 ? pendingFollowupCount : undefined },
    { name: 'Broadcast', href: '/dashboard/broadcast', icon: Megaphone },
    { name: 'Contacts', href: '/dashboard/contacts', icon: Users },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings2 },
  ];

  const visibleNavItems = navItems;

  const formatPhoneNumber = (num: string) => {
    if (!num) return '';
    return `+${num.slice(0, 2)} ${num.slice(2, 7)} ${num.slice(7)}`;
  };

  useEffect(() => {
    if (!clientId) return;

    // Fetch initial notifications
    async function fetchNotifications() {
      try {
        const res = await fetch('/api/dashboard/notifications');
        if (res.ok) {
          const data = await res.json();
          setNotifications(data);
          setUnreadCount(data.filter((n: any) => !n.read).length);
        }
      } catch (err) {
        console.error('Error fetching notifications:', err);
      }
    }

    // Fetch active announcement
    async function fetchAnnouncement() {
      try {
        const { data, error } = await supabase
          .from('announcements')
          .select('*')
          .eq('active', true);

        if (!error && data && data.length > 0) {
          const activeAnn = data.find((ann: any) => {
            if (!ann.expires_at) return true;
            return new Date(ann.expires_at) > new Date();
          });

          if (activeAnn) {
            const dismissed = localStorage.getItem(`dismissed_announcement_${activeAnn.id}`);
            if (!dismissed) {
              setAnnouncement(activeAnn);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching announcement:', err);
      }
    }

    // Fetch initial setup status
    async function fetchSetupStatus() {
      try {
        const res = await fetch('/api/dashboard/client');
        if (res.ok) {
          const data = await res.json();
          setStatus(data.status || 'active');
          setClientData(data);
        } else {
          setStatus('active');
        }
      } catch (err) {
        console.error('Error fetching client status:', err);
        setStatus('active');
      }
    }

    // Fetch pending follow-ups count
    async function fetchPendingCount() {
      try {
        const res = await fetch('/api/dashboard/leads');
        if (res.ok) {
          const data = await res.json();
          const leadsList = data.leads || [];
          const now = new Date();
          const count = leadsList.filter((l: any) =>
            l.follow_up_date &&
            new Date(l.follow_up_date) <= now &&
            !l.follow_up_sent &&
            !l.is_dnd &&
            !l.is_converted &&
            ['warm', 'hot', 'follow_up'].includes(l.intent || '') &&
            (l.follow_up_count || 0) < 1
          ).length;
          setPendingFollowupCount(count);
        }
      } catch (err) {
        console.error('Error fetching pending count:', err);
      }
    }

    fetchNotifications();
    fetchAnnouncement();
    fetchSetupStatus();
    fetchPendingCount();

    statusPollRef.current = setInterval(fetchSetupStatus, 30000);

    // Subscribe to new notifications
    const channel = supabase
      .channel(`notifications-${clientId}`)
      .on(
        'postgres_changes' as any,
        {
          event: 'INSERT',
          table: 'notifications',
          filter: `client_id=eq.${clientId}`,
        },
        (payload: any) => {
          const newNotif = payload.new as Notification;
          setNotifications((prev) => [newNotif, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    // Subscribe to installation status updates
    const statusChannel = supabase
      .channel(`status-${clientId}`)
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          table: 'installation_status',
          filter: `client_id=eq.${clientId}`,
        },
        (payload: any) => {
          if (payload.new && payload.new.status) {
            setStatus(payload.new.status);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(statusChannel);
      if (statusPollRef.current) clearInterval(statusPollRef.current);
    };
  }, [clientId]);

  // Click outside detector to close notifications dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleMarkAllRead = async () => {
    try {
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      await fetch('/api/dashboard/notifications', { method: 'POST' });
    } catch (err) {
      console.error('Error marking notifications as read:', err);
    }
  };

  const handleDismissAnnouncement = () => {
    if (announcement) {
      localStorage.setItem(`dismissed_announcement_${announcement.id}`, 'true');
      setAnnouncement(null);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const renderNotificationsDropdown = () => {
    return (
      <div
        ref={dropdownRef}
        className="absolute right-0 mt-2 w-80 bg-white dark:bg-surface-1 rounded-xl border border-border dark:border-border shadow-lg py-2 z-50 animate-fadeIn"
      >
        <div className="px-4 py-2 border-b border-border dark:border-border flex justify-between items-center">
          <h4 className="text-xs font-black text-text-primary dark:text-foreground">Notifications</h4>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-[10px] font-bold text-brand hover:underline cursor-pointer"
            >
              Mark all as read
            </button>
          )}
        </div>
        <div className="max-h-64 overflow-y-auto divide-y divide-border dark:divide-border text-xs">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-text-muted dark:text-text-subtle">
              No notifications yet.
            </div>
          ) : (
            notifications.map((n) => (
              <div key={n.id} className={`p-3 space-y-1 transition-colors ${n.read ? 'bg-white dark:bg-surface-1' : 'bg-surface-0 dark:bg-surface-2'}`}>
                <div className="flex justify-between items-start">
                  <span className="font-bold text-text-primary dark:text-foreground">{n.title}</span>
                  <span className="text-[9px] text-text-muted dark:text-text-subtle">{formatDate(n.created_at)}</span>
                </div>
                <p className="text-text-secondary dark:text-text-muted leading-relaxed">{n.message}</p>
                {n.action_url && (
                  <Link href={n.action_url} className="text-[10px] font-bold text-brand hover:underline block mt-1">
                    View details &rarr;
                  </Link>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const now = new Date();
  const trialEnds = clientData?.trialEndsAt ? new Date(clientData.trialEndsAt) : null;
  const graceEnds = clientData?.gracePeriodEndsAt ? new Date(clientData.gracePeriodEndsAt) : null;
  const isPaused = !!clientData?.agentPausedAt;

  let bannerType: 'active' | 'grace' | 'paused' | null = null;
  let remainingText = '';

  if (clientData?.planType === 'trial') {
    if (isPaused) {
      bannerType = 'paused';
    } else if (trialEnds) {
      if (now < trialEnds) {
        bannerType = 'active';
        const msDiff = trialEnds.getTime() - now.getTime();
        const days = Math.floor(msDiff / (1000 * 60 * 60 * 24));
        const hours = Math.ceil((msDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        if (days > 0) {
          remainingText = `${days}d ${hours}h`;
        } else {
          remainingText = `${hours}h`;
        }
      } else {
        const assumedGraceEnds = graceEnds || new Date(trialEnds.getTime() + 3 * 24 * 60 * 60 * 1000);
        if (now < assumedGraceEnds) {
          bannerType = 'grace';
          const msDiff = assumedGraceEnds.getTime() - now.getTime();
          const days = Math.floor(msDiff / (1000 * 60 * 60 * 24));
          const hours = Math.ceil((msDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          if (days > 0) {
            remainingText = `${days}d ${hours}h`;
          } else {
            remainingText = `${hours}h`;
          }
        } else {
          bannerType = 'paused';
        }
      }
    }
  }

  const getInitials = (name: string) => {
    if (!name) return 'SC';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Get active menu item name for header page title
  const activeNavItem = visibleNavItems.find(
    (item) => pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
  );

  return (
    <div className="min-h-screen bg-background dark:bg-background flex flex-col font-sans">
      {/* Announcements Banner */}
      {announcement && (
        <div className={`relative flex items-center justify-between px-6 py-2.5 text-xs text-white z-50 shrink-0 font-semibold ${
          announcement.type === 'warning' ? 'bg-warning' : announcement.type === 'success' ? 'bg-success' : 'bg-info'
        }`}>
          <div className="flex items-center space-x-2 truncate mx-auto">
            <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
              <Info size={12} /> {announcement.type}
            </span>
            <span className="truncate">{announcement.message}</span>
          </div>
          <button
            onClick={handleDismissAnnouncement}
            className="text-white/80 hover:text-white p-1 rounded transition-colors cursor-pointer shrink-0 absolute right-4"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex-1 flex flex-col md:flex-row">
        {/* Mobile Header */}
        <header className="md:hidden bg-sidebar-bg border-b border-[#2A3942] h-16 px-4 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center space-x-2">
            <img 
              src="/scalecraft-logo-dark.svg" 
              alt="WhatsApp Platform"
              className="h-6 w-auto"
            />
            <span className="text-[10px] bg-brand text-white px-2 py-0.5 rounded font-black uppercase">
              Agent
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-1.5 rounded-lg hover:bg-sidebar-hover text-sidebar-text transition-colors cursor-pointer flex items-center justify-center"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-danger"></span>
                )}
              </button>
              {notificationsOpen && renderNotificationsDropdown()}
            </div>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg hover:bg-sidebar-hover text-sidebar-text transition-colors cursor-pointer"
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </header>

        <aside
          className={`fixed inset-y-0 left-0 z-50 w-60 bg-sidebar-bg flex flex-col justify-between transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:h-screen shrink-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div>
            {/* Sidebar Header — px-5 matches the nav item's icon left inset */}
            <div className="h-16 px-5 border-b border-[#2A3942] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <img 
                  src="/scalecraft-logo-dark.svg" 
                  alt="WhatsApp Platform"
                  className="h-6 w-auto"
                />
                <span className="text-[9px] bg-brand text-white px-1.5 py-0.5 rounded font-black uppercase">
                  Agent
                </span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="md:hidden p-1 rounded-lg hover:bg-sidebar-hover text-sidebar-muted cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Navigation Links */}
            {/* px-3 outer + px-3 on each Link = icon sits at ~24 px from sidebar edge, matching logo */}
            <nav className="px-3 py-2 space-y-0.5 mt-3">
              {visibleNavItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                const Icon = item.icon;

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`relative flex items-center justify-between py-2.5 px-3 rounded-lg transition-all duration-150 cursor-pointer ${
                      isActive
                        ? 'text-sidebar-text font-semibold bg-sidebar-active'
                        : 'text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-text font-medium'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="nav-active"
                        className="absolute inset-0 bg-sidebar-active rounded-lg -z-10"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                    <div className="flex items-center relative">
                      <div className="relative mr-3 shrink-0 flex items-center justify-center">
                        <Icon size={18} className={isActive ? 'text-brand' : 'text-sidebar-muted'} />
                        {item.name === 'Inbox' && item.badge !== undefined && (
                          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-brand text-white text-[9px] font-black rounded-full flex items-center justify-center">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <span className="text-[13px]">{item.name}</span>
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-[#2A3942] space-y-3 bg-[#111B21]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 px-2 min-w-0">
                <div className="w-9 h-9 rounded-full bg-brand-light text-brand-dark dark:bg-brand/10 dark:text-brand font-black text-xs flex items-center justify-center shrink-0">
                  {getInitials(businessName)}
                </div>
                <div className="flex flex-col truncate">
                  <span className="text-xs font-bold text-sidebar-text truncate leading-tight flex items-center gap-1.5">
                    <span>{businessName}</span>
                    <span className="w-1.5 h-1.5 bg-success rounded-full shrink-0" title="Online" />
                  </span>
                  <span className="text-[10px] text-sidebar-muted leading-none mt-1">Owner</span>
                </div>
              </div>

              {/* Dark mode & Logout panel */}
              <div className="flex items-center gap-1">
                <button
                  onClick={toggleDarkMode}
                  className="p-2 rounded-lg hover:bg-sidebar-hover text-sidebar-muted hover:text-sidebar-text transition-colors cursor-pointer"
                  title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {darkMode ? <Sun size={15} /> : <Moon size={15} />}
                </button>
                <a
                  href="/api/dashboard/auth/logout"
                  className="p-2 rounded-lg hover:bg-red-950/20 text-sidebar-muted hover:text-danger transition-colors cursor-pointer"
                  title="Logout"
                >
                  <LogOut size={15} />
                </a>
              </div>
            </div>
          </div>
        </aside>

        {/* Overlay backdrop for mobile */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs md:hidden"
          />
        )}

        {/* Main Content Area */}
        <div className={`flex-1 flex flex-col md:h-screen bg-[#F9FAFB] dark:bg-surface-0 ${isInbox ? 'overflow-hidden' : 'md:overflow-y-auto pb-20 md:pb-0'}`}>
          {/* Desktop Header — px-6 matches the main content gutter */}
          <header className="hidden md:flex h-14 bg-white dark:bg-surface-1 border-b border-border dark:border-border px-6 items-center justify-between shrink-0 sticky top-0 z-30 select-none">
            {/* Dynamic page title */}
            <h2 className="text-sm font-black text-text-primary dark:text-text-primary uppercase tracking-wider font-sans">
              {activeNavItem?.name || 'Dashboard'}
            </h2>

            {/* Bell Icon for Desktop */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-1.5 rounded-lg hover:bg-surface-0 dark:hover:bg-surface-2 text-text-muted hover:text-text-primary dark:text-text-subtle dark:hover:text-text-primary transition-colors cursor-pointer flex items-center justify-center"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-danger"></span>
                )}
              </button>
              {notificationsOpen && renderNotificationsDropdown()}
            </div>
          </header>

          {/* Trial LifeCycle Banners */}
          {bannerType === 'active' && (
            <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-900 px-8 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-amber-300 shadow-sm shrink-0 animate-fadeIn select-none">
              <div className="flex items-center gap-3">
                <div className="bg-slate-900/10 p-2 rounded-lg">
                  <Clock className="w-5 h-5 text-slate-900 animate-pulse" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm tracking-tight font-sans">Trial Account Active</h4>
                  <p className="text-xs font-semibold opacity-90">Your WhatsApp Agent is on a 7-day trial. You have <span className="font-extrabold text-[#1b5e20]">{remainingText}</span> remaining. Upgrade today to ensure uninterrupted automated service.</p>
                </div>
              </div>
              <a href="/upgrade" className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-xs font-black transition-all hover:scale-[1.03] active:scale-95 shadow-md uppercase tracking-wider shrink-0">
                Upgrade Now
              </a>
            </div>
          )}

          {bannerType === 'grace' && (
            <div className="bg-gradient-to-r from-orange-500 via-orange-600 to-red-500 text-white px-8 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-orange-400 shadow-sm shrink-0 animate-fadeIn select-none">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-white animate-bounce" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm tracking-tight font-sans">Trial Ended - Grace Period Active</h4>
                  <p className="text-xs font-semibold opacity-90">Your trial has ended. You have <span className="font-bold underline">{remainingText}</span> left in your grace period before the agent is paused. Upgrade now to keep it running.</p>
                </div>
              </div>
              <a href="/upgrade" className="bg-white text-orange-700 hover:bg-slate-100 px-5 py-2.5 rounded-xl text-xs font-black transition-all hover:scale-[1.03] active:scale-95 shadow-md uppercase tracking-wider shrink-0">
                Keep Agent Running
              </a>
            </div>
          )}

          {bannerType === 'paused' && (
            <div className="bg-gradient-to-r from-red-700 via-rose-700 to-red-800 text-white px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-red-900 shadow-sm shrink-0 animate-fadeIn select-none">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-white animate-pulse" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm tracking-tight font-sans">SaaS Agent Automatically Paused</h4>
                  <p className="text-xs font-semibold opacity-90">Your trial and grace period have expired, and your agent has been paused. All settings and logs are saved. Upgrade to the premium plan to resume immediately.</p>
                </div>
              </div>
              <a href="/upgrade" className="bg-white text-red-700 hover:bg-slate-100 px-6 py-3 rounded-xl text-xs font-black transition-all hover:scale-[1.03] active:scale-95 shadow-md uppercase tracking-wider shrink-0">
                Resume Agent
              </a>
            </div>
          )}

          <main className="flex-1 min-h-0 bg-[#F9FAFB] dark:bg-surface-0 flex flex-col">
            {isInbox ? (
              children
            ) : (
              /* Consistent px-6 gutter on every dashboard page — matches the header padding */
              <div className="flex-1 px-6 py-6">
                {children}
              </div>
            )}
          </main>
        </div>

        {/* Bottom Nav Bar for Mobile viewports */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-surface-1 border-t border-border dark:border-border flex items-center justify-around px-2 z-40 pb-safe shadow-md">
          {visibleNavItems.slice(0, 5).map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`relative flex flex-col items-center justify-center space-y-1 py-1 px-3 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${isActive ? 'text-brand' : 'text-text-muted'
                  }`}
              >
                <Icon size={20} className={isActive ? 'text-brand' : 'text-text-subtle'} />
                <span>{item.name}</span>
                {item.name === 'Inbox' && pendingFollowupCount > 0 && (
                  <span className="absolute top-1 right-3 h-4 w-4 bg-brand text-white text-[9px] font-black rounded-full flex items-center justify-center">
                    {pendingFollowupCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
