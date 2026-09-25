'use client';

import React, { useEffect, useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import {
  Settings,
  MessageSquare,
  Building,
  LogOut,
  CheckCircle,
  AlertTriangle,
  Copy,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<any>(null);
  
  // Cloud API Form
  const [cloudPhoneId, setCloudPhoneId] = useState('');
  const [cloudAccessToken, setCloudAccessToken] = useState('');
  const [cloudWabaId, setCloudWabaId] = useState('');
  const [cloudAppSecret, setCloudAppSecret] = useState('');
  const [submittingCloud, setSubmittingCloud] = useState(false);
  const [cloudSuccess, setCloudSuccess] = useState('');
  const [cloudError, setCloudError] = useState('');

  // Business Form
  const [businessName, setBusinessName] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [submittingBusiness, setSubmittingBusiness] = useState(false);
  const [businessSuccess, setBusinessSuccess] = useState('');

  const [webhookUrl, setWebhookUrl] = useState('Loading...');
  const verifyToken = client?.whatsappVerifyToken || (client?.hermesProfile ? `${client.hermesProfile}-webhook-token` : '');

  const fetchClientProfile = async () => {
    try {
      setWebhookUrl(`${window.location.origin}/api/webhooks/whatsapp-cloud`);
      const res = await fetch('/api/dashboard/client');
      if (res.ok) {
        const data = await res.json();
        setClient(data);
        setBusinessName(data.businessName || '');
        setTimezone(data.timezone || 'UTC');
        
        // Don't show full access token, mask it if it exists
        if (data.whatsappAccessToken) {
          setCloudAccessToken('••••••••••••••••••••••••••••••••');
        }
        setCloudPhoneId(data.whatsappPhoneNumberId || '');
        setCloudWabaId(data.whatsappWabaId || '');
        setCloudAppSecret(data.whatsappAppSecret ? '••••••••••••••••' : '');
      }
    } catch (err) {
      console.error('Failed to load client profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientProfile();
  }, []);

  const handleConfigureCloudApi = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingCloud(true);
    setCloudError('');
    setCloudSuccess('');
    try {
      // If the field is masked (starts with bullet), we don't send it unless changed
      const payload: any = { action: 'configure_cloud_api' };
      if (!cloudPhoneId.startsWith('•')) payload.whatsappPhoneNumberId = cloudPhoneId.trim();
      if (!cloudAccessToken.startsWith('•')) payload.whatsappAccessToken = cloudAccessToken.trim();
      if (!cloudWabaId.startsWith('•')) payload.whatsappWabaId = cloudWabaId.trim();
      if (!cloudAppSecret.startsWith('•')) payload.whatsappAppSecret = cloudAppSecret.trim();

      const res = await fetch('/api/dashboard/agent/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to configure WhatsApp Cloud API.');
      
      setCloudSuccess('WhatsApp Cloud API connected successfully');
      await fetchClientProfile();
    } catch (err: any) {
      setCloudError(err.message || 'An error occurred.');
    } finally {
      setSubmittingCloud(false);
    }
  };

  const handleUpdateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingBusiness(true);
    setBusinessSuccess('');
    try {
      const res = await fetch('/api/dashboard/client', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessName, timezone }),
      });
      if (!res.ok) throw new Error('Failed to update business settings');
      setBusinessSuccess('Business settings updated successfully.');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingBusiness(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  if (loading) {
    return <div className="p-6">Loading settings...</div>;
  }

  const isConnected = !!client?.whatsappPhoneNumberId && !!client?.whatsappAccessToken;

  return (
    <div className="p-6 space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-black text-text-primary tracking-tight font-sans">
          Settings
        </h1>
        <p className="text-xs font-semibold text-text-muted mt-1">
          Manage your WhatsApp Cloud API connection and business preferences.
        </p>
      </div>

      {/* WhatsApp Cloud API Section */}
      <Card padding="lg" className="space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center">
              <MessageSquare className="text-brand" size={20} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text-primary">WhatsApp Cloud API</h2>
              <p className="text-[11px] text-text-muted">Connect your official WhatsApp Business account</p>
            </div>
          </div>
          <Badge variant={isConnected ? 'success' : 'default'} size="md">
            {isConnected ? '● Connected' : 'Not Connected'}
          </Badge>
        </div>

        <form onSubmit={handleConfigureCloudApi} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-text-muted uppercase tracking-wider">
                WhatsApp Business Account ID (WABA)
              </label>
              <input
                type="text"
                value={cloudWabaId}
                onChange={(e) => setCloudWabaId(e.target.value)}
                placeholder="Enter WABA ID"
                className="w-full text-xs border border-border bg-white dark:bg-surface-0 rounded-lg p-2.5 outline-none focus:border-brand"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-text-muted uppercase tracking-wider">
                Phone Number ID
              </label>
              <input
                type="text"
                value={cloudPhoneId}
                onChange={(e) => setCloudPhoneId(e.target.value)}
                placeholder="Enter Phone Number ID"
                className="w-full text-xs border border-border bg-white dark:bg-surface-0 rounded-lg p-2.5 outline-none focus:border-brand"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-wider">
              System User Access Token
            </label>
            <input
              type="password"
              value={cloudAccessToken}
              onChange={(e) => setCloudAccessToken(e.target.value)}
              placeholder="EAAI..."
              className="w-full text-xs border border-border bg-white dark:bg-surface-0 rounded-lg p-2.5 outline-none focus:border-brand"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-wider">
              App Secret (Optional for advanced verify)
            </label>
            <input
              type="password"
              value={cloudAppSecret}
              onChange={(e) => setCloudAppSecret(e.target.value)}
              placeholder="Enter App Secret"
              className="w-full text-xs border border-border bg-white dark:bg-surface-0 rounded-lg p-2.5 outline-none focus:border-brand"
            />
          </div>

          {cloudError && (
            <div className="text-xs font-semibold text-danger flex items-center gap-2">
              <AlertTriangle size={14} /> {cloudError}
            </div>
          )}
          {cloudSuccess && (
            <div className="text-xs font-semibold text-success flex items-center gap-2">
              <CheckCircle size={14} /> {cloudSuccess}
            </div>
          )}

          <div>
            <Button
              variant="primary"
              size="md"
              type="submit"
              loading={submittingCloud}
              disabled={submittingCloud}
            >
              Save Connection Settings
            </Button>
          </div>
        </form>

        {/* Webhook Settings Read-only */}
        <div className="mt-8 pt-6 border-t border-border space-y-4">
          <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
            Webhook Configuration
          </h3>
          <p className="text-[11px] text-text-muted">
            Configure these in your Meta Developer Dashboard under WhatsApp &gt; Configuration.
          </p>
          <div className="space-y-3">
            <div className="bg-surface-0 dark:bg-surface-2 p-3 rounded-lg flex items-center justify-between border border-border">
              <div>
                <div className="text-[10px] font-black text-text-muted uppercase tracking-wider mb-0.5">Callback URL</div>
                <div className="text-xs font-mono">{webhookUrl}</div>
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(webhookUrl)}
                className="text-text-muted hover:text-brand transition-colors p-2"
                title="Copy URL"
              >
                <Copy size={16} />
              </button>
            </div>
            <div className="bg-surface-0 dark:bg-surface-2 p-3 rounded-lg flex items-center justify-between border border-border">
              <div>
                <div className="text-[10px] font-black text-text-muted uppercase tracking-wider mb-0.5">Verify Token</div>
                <div className="text-xs font-mono">{verifyToken || 'Not generated yet'}</div>
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(verifyToken)}
                className="text-text-muted hover:text-brand transition-colors p-2"
                title="Copy Token"
              >
                <Copy size={16} />
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Business & Account Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card padding="lg" className="space-y-6">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <Building className="text-text-secondary" size={20} />
            <h2 className="text-sm font-bold text-text-primary">Business Profile</h2>
          </div>
          <form onSubmit={handleUpdateBusiness} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-text-muted uppercase tracking-wider">
                Business Name
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full text-xs border border-border bg-white dark:bg-surface-0 rounded-lg p-2.5 outline-none focus:border-brand"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-text-muted uppercase tracking-wider">
                Timezone
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full text-xs border border-border bg-white dark:bg-surface-0 rounded-lg p-2.5 outline-none focus:border-brand"
              >
                <option value="UTC">UTC</option>
                <option value="Asia/Kolkata">India Standard Time (IST)</option>
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="Europe/London">Greenwich Mean Time (GMT)</option>
              </select>
            </div>
            {businessSuccess && (
              <div className="text-xs font-semibold text-success flex items-center gap-2">
                <CheckCircle size={14} /> {businessSuccess}
              </div>
            )}
            <Button
              variant="secondary"
              size="md"
              type="submit"
              loading={submittingBusiness}
              disabled={submittingBusiness}
            >
              Save Profile
            </Button>
          </form>
        </Card>

        <Card padding="lg" className="space-y-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 border-b border-border pb-4">
              <Settings className="text-text-secondary" size={20} />
              <h2 className="text-sm font-bold text-text-primary">Account</h2>
            </div>
            <div className="mt-5 space-y-4">
              <div>
                <p className="text-[10px] font-black text-text-muted uppercase tracking-wider mb-1">Email</p>
                <p className="text-xs font-bold text-text-primary">{client?.email || 'Loading...'}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-text-muted uppercase tracking-wider mb-1">Owner</p>
                <p className="text-xs font-bold text-text-primary">{client?.ownerName || 'Loading...'}</p>
              </div>
            </div>
          </div>
          <div className="mt-8 border-t border-border pt-4">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-danger hover:text-red-700 text-xs font-bold transition-colors cursor-pointer"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
