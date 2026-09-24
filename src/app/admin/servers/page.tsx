'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Server,
  Plus,
  TrendingUp,
  Cpu,
  CheckCircle,
  AlertTriangle,
  X,
  Loader2,
  Trash2,
} from 'lucide-react';

interface ServerNode {
  id: string;
  ip: string;
  ssh_key_ref: string;
  ssh_user: string;
  max_capacity: number;
  current_client_count: number;
  status: 'active' | 'full' | 'maintenance' | 'decommissioned';
  region: string;
  notes?: string;
  created_at: string;
}

export default function AdminServersPage() {
  const [servers, setServers] = useState<ServerNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [ip, setIp] = useState('');
  const [maxCapacity, setMaxCapacity] = useState('15');
  const [sshKeyRef, setSshKeyRef] = useState('SHARED_SERVER_SSH_KEY');
  const [sshUser, setSshUser] = useState('ubuntu');
  const [region, setRegion] = useState('ap-south-1');
  const [notes, setNotes] = useState('');

  // Messages
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchServers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/servers');
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to retrieve servers list.');
      }
      const data = await res.json();
      if (Array.isArray(data.servers)) {
        setServers(data.servers);
      }
    } catch (err: any) {
      setError(err.message || 'Error loading servers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServers();
  }, []);

  const handleRegisterServer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/admin/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip,
          max_capacity: Number(maxCapacity),
          ssh_key_ref: sshKeyRef,
          ssh_user: sshUser,
          region,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Server registration failed.');
      }

      setSuccess('Server node registered successfully!');
      // Reset form fields
      setIp('');
      setMaxCapacity('15');
      setSshKeyRef('SHARED_SERVER_SSH_KEY');
      setSshUser('ubuntu');
      setRegion('ap-south-1');
      setNotes('');

      fetchServers();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.message || 'Error registering server.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FBF8] p-6 md:p-12 space-y-8 text-xs font-semibold">
      {/* Header */}
      <div className="flex items-center space-x-4 border-b border-[#E0E0E0] pb-6">
        <Link
          href="/admin"
          className="p-2 bg-white border border-[#E0E0E0] hover:bg-[#F8FBF8] rounded-lg text-[#757575] transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black text-[#212121] tracking-tight uppercase font-heading">
              Server Pool
            </h1>
            <span className="bg-blue-50 text-blue-700 text-[9px] font-black px-2 py-0.5 rounded uppercase">
              Infrastructure
            </span>
          </div>
          <p className="text-sm text-[#757575] mt-1">
            Manage multi-server Lightsail hosting nodes and monitor client capacity distribution.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-[#FFEBEE] border border-red-100 text-[#C62828] text-xs font-semibold p-4 rounded-xl flex items-center space-x-2">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-[#E8F5E9] border border-green-100 text-[#2E7D32] text-xs font-semibold p-4 rounded-xl flex items-center space-x-2">
          <CheckCircle size={16} />
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Servers List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-[#E0E0E0] shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="p-5 border-b border-[#E0E0E0] bg-[#F8FBF8]/40">
              <h3 className="text-sm font-black text-[#212121] uppercase tracking-wider flex items-center gap-2">
                <Server size={14} className="text-[#1B5E20]" />
                <span>Active Infrastructure Pool</span>
              </h3>
            </div>

            {loading ? (
              <div className="p-12 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-[#1B5E20]" />
                <span className="text-[#757575]">Querying server nodes...</span>
              </div>
            ) : servers.length === 0 ? (
              <div className="p-12 text-center text-[#757575]">
                No server hosting nodes registered. Register your first server box.
              </div>
            ) : (
              <div className="divide-y divide-[#E0E0E0]">
                {servers.map((s) => {
                  const percent = Math.min(100, Math.round((s.current_client_count / s.max_capacity) * 100));
                  return (
                    <div key={s.id} className="p-6 hover:bg-[#F8FBF8]/20 transition-colors space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        {/* Server Info */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-base font-bold text-[#212121]">
                              {s.ip}
                            </span>
                            <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                              {s.region}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-400">
                            User: <span className="font-mono">{s.ssh_user}</span> | SSH Key Ref: <span className="font-mono text-gray-600">{s.ssh_key_ref}</span>
                          </p>
                          {s.notes && (
                            <p className="text-[10px] text-gray-500 font-normal italic mt-1">
                              &ldquo;{s.notes}&rdquo;
                            </p>
                          )}
                        </div>

                        {/* Status Badge */}
                        <div className="flex items-center gap-2 sm:self-center">
                          <span
                            className={`text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${
                              s.status === 'active'
                                ? 'bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9]'
                                : s.status === 'full'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-[#FFEBEE] text-[#C62828] border-red-150'
                            }`}
                          >
                            {s.status}
                          </span>
                        </div>
                      </div>

                      {/* Capacity Progress Bar */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px] font-bold">
                          <span className="text-gray-500 uppercase tracking-wider">Client Load Capacity</span>
                          <span className="text-[#212121]">
                            {s.current_client_count} / {s.max_capacity} clients ({percent}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden border border-gray-200">
                          <div
                            className={`h-full transition-all duration-500 ${
                              percent >= 90
                                ? 'bg-red-600'
                                : percent >= 75
                                ? 'bg-amber-500'
                                : 'bg-[#1B5E20]'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Register Form */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-[#E0E0E0] shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-6 space-y-6">
            <div className="border-b border-[#E0E0E0] pb-4">
              <h3 className="text-sm font-black text-[#212121] uppercase tracking-wider flex items-center gap-2">
                <Plus size={16} className="text-blue-600" />
                <span>Register Server Node</span>
              </h3>
              <p className="text-[10px] text-gray-500 mt-1">
                Add an manually provisioned Lightsail box running the Hermes gateway image.
              </p>
            </div>

            <form onSubmit={handleRegisterServer} className="space-y-4">
              {/* IP Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-gray-500 block">
                  Server IPv4 Address
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 13.206.143.171"
                  value={ip}
                  onChange={(e) => setIp(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#E0E0E0] rounded-lg text-xs font-mono focus:outline-none focus:border-[#1B5E20] transition-colors"
                />
              </div>

              {/* SSH User */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-gray-500 block">
                  SSH SSH Username
                </label>
                <input
                  type="text"
                  required
                  placeholder="ubuntu"
                  value={sshUser}
                  onChange={(e) => setSshUser(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#E0E0E0] rounded-lg text-xs focus:outline-none focus:border-[#1B5E20] transition-colors"
                />
              </div>

              {/* SSH Key Ref */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-gray-500 block">
                  SSH Private Key Env Variable
                </label>
                <input
                  type="text"
                  required
                  placeholder="SHARED_SERVER_SSH_KEY"
                  value={sshKeyRef}
                  onChange={(e) => setSshKeyRef(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#E0E0E0] rounded-lg text-xs font-mono focus:outline-none focus:border-[#1B5E20] transition-colors"
                />
                <p className="text-[9px] text-gray-400 font-normal">
                  Environment variable key (e.g. `SHARED_SERVER_SSH_KEY` or `SCALECRAFT_SSH_PRIVATE_KEY`) holding this node's private SSH key.
                </p>
              </div>

              {/* Max Capacity */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-gray-500 block">
                  Max Client Capacity
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max="100"
                  value={maxCapacity}
                  onChange={(e) => setMaxCapacity(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#E0E0E0] rounded-lg text-xs focus:outline-none focus:border-[#1B5E20] transition-colors"
                />
              </div>

              {/* Region */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-gray-500 block">
                  AWS Region
                </label>
                <input
                  type="text"
                  required
                  placeholder="ap-south-1"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#E0E0E0] rounded-lg text-xs focus:outline-none focus:border-[#1B5E20] transition-colors"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-gray-500 block">
                  Notes
                </label>
                <textarea
                  placeholder="Notes or physical location description..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 bg-white border border-[#E0E0E0] rounded-lg text-xs focus:outline-none focus:border-[#1B5E20] transition-colors resize-none"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-xs font-bold py-2.5 rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Registering Node...</span>
                  </>
                ) : (
                  <>
                    <Plus size={14} />
                    <span>Register Server Node</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
