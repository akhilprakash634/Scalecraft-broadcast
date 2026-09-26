'use client';

import React, { useState, useEffect } from 'react';
import { Package, Send, Search, CheckCircle, RefreshCcw, X, Eye, Users, MessageSquare } from 'lucide-react';
import Link from 'next/link';

export default function FlowsPage() {
  const [activeTab, setActiveTab] = useState<'flows' | 'submissions'>('flows');
  
  // Flows state
  const [flows, setFlows] = useState<any[]>([]);
  const [loadingFlows, setLoadingFlows] = useState(true);
  const [errorFlows, setErrorFlows] = useState('');
  
  // Test modal state
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [selectedFlow, setSelectedFlow] = useState<any>(null);
  const [testPhone, setTestPhone] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  
  // Submissions state
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);

  useEffect(() => {
    if (activeTab === 'flows') fetchFlows();
    else fetchSubmissions();
  }, [activeTab]);

  const fetchFlows = async () => {
    setLoadingFlows(true);
    setErrorFlows('');
    try {
      const res = await fetch('/api/dashboard/flows');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch flows');
      setFlows(data.flows || []);
    } catch (err: any) {
      setErrorFlows(err.message);
    }
    setLoadingFlows(false);
  };

  const fetchSubmissions = async () => {
    setLoadingSubmissions(true);
    try {
      const res = await fetch('/api/dashboard/flows/submissions');
      const data = await res.json();
      if (res.ok) {
        setSubmissions(data.submissions || []);
      }
    } catch (err: any) {
      console.error('Failed to fetch submissions', err);
    }
    setLoadingSubmissions(false);
  };

  const handleTestFlow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone || !selectedFlow) return;
    
    setSendingTest(true);
    try {
      const res = await fetch('/api/dashboard/flows/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flow_id: selectedFlow.id,
          phone_number: testPhone
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send test flow');
      
      alert('Test flow sent successfully!');
      setTestModalOpen(false);
      setTestPhone('');
    } catch (err: any) {
      alert(err.message);
    }
    setSendingTest(false);
  };

  const filteredSubmissions = submissions.filter(sub => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (sub.whatsapp_contacts?.name && sub.whatsapp_contacts.name.toLowerCase().includes(q)) ||
      (sub.phone_number && sub.phone_number.includes(q)) ||
      (sub.reference_number && sub.reference_number.toLowerCase().includes(q))
    );
  });

  const handleExportCSV = () => {
    if (filteredSubmissions.length === 0) return;
    
    // Find all possible keys in response_data
    const allKeys = new Set<string>();
    filteredSubmissions.forEach(sub => {
      if (sub.response_data) {
        Object.keys(sub.response_data).forEach(k => allKeys.add(k));
      }
    });
    
    const dynamicHeaders = Array.from(allKeys);
    const standardHeaders = ['Flow', 'Customer', 'Phone', 'Reference', 'Status', 'Submitted At'];
    
    const csvHeaders = [...standardHeaders, ...dynamicHeaders];
    
    const csvRows = filteredSubmissions.map(sub => {
      const row = [
        `"${sub.flow_name || ''}"`,
        `"${(sub.whatsapp_contacts?.name || '').replace(/"/g, '""')}"`,
        `"${sub.phone_number || ''}"`,
        `"${sub.reference_number || ''}"`,
        `"${sub.status || ''}"`,
        `"${new Date(sub.submitted_at).toLocaleString()}"`
      ];
      
      dynamicHeaders.forEach(key => {
        let val = sub.response_data?.[key] ?? '';
        if (typeof val === 'object') val = JSON.stringify(val);
        row.push(`"${String(val).replace(/"/g, '""')}"`);
      });
      
      return row.join(',');
    });
    
    const csvText = [csvHeaders.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `flow_submissions_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex border-b border-border dark:border-border">
        <button
          onClick={() => setActiveTab('flows')}
          className={`px-6 py-3 font-semibold text-sm transition-colors ${
            activeTab === 'flows'
              ? 'border-b-2 border-brand text-brand'
              : 'text-text-muted hover:text-text-primary dark:text-text-subtle dark:hover:text-foreground'
          }`}
        >
          WhatsApp Flows
        </button>
        <button
          onClick={() => setActiveTab('submissions')}
          className={`px-6 py-3 font-semibold text-sm transition-colors ${
            activeTab === 'submissions'
              ? 'border-b-2 border-brand text-brand'
              : 'text-text-muted hover:text-text-primary dark:text-text-subtle dark:hover:text-foreground'
          }`}
        >
          Submissions
        </button>
      </div>

      {activeTab === 'flows' && (
        <div className="bg-white dark:bg-surface-1 rounded-xl shadow-sm border border-border dark:border-border overflow-hidden">
          <div className="p-6 border-b border-border dark:border-border flex justify-between items-center">
            <h3 className="font-bold text-text-primary dark:text-foreground">Your Meta Flows</h3>
            <button
              onClick={fetchFlows}
              className="flex items-center gap-2 text-sm font-semibold text-brand hover:text-brand-dark transition-colors cursor-pointer"
            >
              <RefreshCcw size={16} /> Refresh
            </button>
          </div>
          
          <div className="p-6">
            {loadingFlows ? (
              <div className="text-center py-10 text-text-muted">Loading flows from Meta...</div>
            ) : errorFlows ? (
              <div className="text-center py-10 text-danger bg-red-50 dark:bg-red-950/20 rounded-xl">
                {errorFlows}
              </div>
            ) : flows.length === 0 ? (
              <div className="text-center py-10 text-text-muted bg-surface-0 dark:bg-surface-2 rounded-xl">
                No flows found. Create one in your Meta Business account first.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-text-muted dark:text-text-subtle uppercase bg-surface-0 dark:bg-surface-2 border-y border-border dark:border-border">
                    <tr>
                      <th className="px-6 py-4 font-bold">Flow Name</th>
                      <th className="px-6 py-4 font-bold">Status</th>
                      <th className="px-6 py-4 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border dark:divide-border">
                    {flows.map((flow: any) => (
                      <tr key={flow.id} className="hover:bg-surface-0 dark:hover:bg-surface-2 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-text-primary dark:text-foreground">{flow.name}</div>
                          <div className="text-[11px] text-text-muted">ID: {flow.id}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            flow.status === 'PUBLISHED' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning-dark'
                          }`}>
                            {flow.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedFlow(flow);
                              setTestModalOpen(true);
                            }}
                            className="bg-brand hover:bg-brand-dark text-white px-4 py-2 rounded-lg font-bold text-xs transition-colors"
                          >
                            Test Flow
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'submissions' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             <div className="bg-white dark:bg-surface-1 rounded-xl shadow-sm border border-border dark:border-border p-4">
                <div className="text-text-muted dark:text-text-subtle text-xs font-bold uppercase">Total Submissions</div>
                <div className="text-2xl font-black text-text-primary dark:text-foreground mt-1">{submissions.length}</div>
             </div>
             <div className="bg-white dark:bg-surface-1 rounded-xl shadow-sm border border-border dark:border-border p-4">
                <div className="text-text-muted dark:text-text-subtle text-xs font-bold uppercase">Today</div>
                <div className="text-2xl font-black text-brand mt-1">
                  {submissions.filter(s => new Date(s.submitted_at).toDateString() === new Date().toDateString()).length}
                </div>
             </div>
          </div>
        
          <div className="bg-white dark:bg-surface-1 rounded-xl shadow-sm border border-border dark:border-border overflow-hidden flex flex-col md:flex-row h-[600px]">
            {/* List */}
            <div className="w-full md:w-1/3 border-r border-border dark:border-border flex flex-col h-full">
              <div className="p-4 border-b border-border dark:border-border space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-text-primary dark:text-foreground">Submissions</span>
                  <button
                    onClick={handleExportCSV}
                    className="text-xs bg-surface-0 hover:bg-surface-1 dark:bg-surface-2 dark:hover:bg-surface-3 border border-border text-text-primary px-3 py-1.5 rounded-lg transition-colors font-semibold"
                  >
                    Export CSV
                  </button>
                </div>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    placeholder="Search submissions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-surface-0 dark:bg-surface-2 border border-border dark:border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {loadingSubmissions ? (
                  <div className="p-8 text-center text-text-muted">Loading...</div>
                ) : filteredSubmissions.length === 0 ? (
                  <div className="p-8 text-center text-text-muted">No submissions found.</div>
                ) : (
                  <div className="divide-y divide-border dark:divide-border">
                    {filteredSubmissions.map((sub: any) => (
                      <div
                        key={sub.id}
                        onClick={() => setSelectedSubmission(sub)}
                        className={`p-4 cursor-pointer transition-colors ${selectedSubmission?.id === sub.id ? 'bg-brand/5 dark:bg-brand/10 border-l-4 border-brand' : 'hover:bg-surface-0 dark:hover:bg-surface-2 border-l-4 border-transparent'}`}
                      >
                        <div className="font-bold text-text-primary dark:text-foreground truncate">{sub.whatsapp_contacts?.name || sub.phone_number}</div>
                        <div className="text-xs text-text-muted dark:text-text-subtle mt-1 flex justify-between">
                          <span className="truncate mr-2">{sub.flow_name}</span>
                          <span className="shrink-0">{new Date(sub.submitted_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Details */}
            <div className="w-full md:w-2/3 h-full overflow-y-auto bg-surface-0 dark:bg-surface-2/30">
              {selectedSubmission ? (
                <div className="p-6 md:p-8">
                  <div className="bg-white dark:bg-surface-1 rounded-xl shadow-sm border border-border dark:border-border p-6 mb-6">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h2 className="text-xl font-black text-text-primary dark:text-foreground">{selectedSubmission.flow_name}</h2>
                        <div className="text-sm text-text-muted dark:text-text-subtle font-mono mt-1">{selectedSubmission.reference_number}</div>
                      </div>
                      <span className="bg-brand/10 text-brand px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                        {selectedSubmission.status}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                      <div>
                        <div className="text-text-muted dark:text-text-subtle font-bold mb-1">Customer</div>
                        <div className="font-semibold text-text-primary dark:text-foreground">{selectedSubmission.whatsapp_contacts?.name || 'Unknown'}</div>
                      </div>
                      <div>
                        <div className="text-text-muted dark:text-text-subtle font-bold mb-1">Phone</div>
                        <div className="font-semibold text-text-primary dark:text-foreground">{selectedSubmission.phone_number}</div>
                      </div>
                      <div>
                        <div className="text-text-muted dark:text-text-subtle font-bold mb-1">Submitted At</div>
                        <div className="font-semibold text-text-primary dark:text-foreground">{new Date(selectedSubmission.submitted_at).toLocaleString()}</div>
                      </div>
                    </div>
                    
                    <div className="flex gap-3">
                      {selectedSubmission.contact_id && (
                        <Link href={`/dashboard/contacts`} className="flex-1 flex items-center justify-center gap-2 bg-surface-0 dark:bg-surface-2 hover:bg-surface-1 dark:hover:bg-surface-3 text-text-primary dark:text-foreground border border-border py-2 px-4 rounded-lg text-xs font-bold transition-colors">
                          <Users size={14} /> Open Contact
                        </Link>
                      )}
                      <Link href={`/dashboard/leads`} className="flex-1 flex items-center justify-center gap-2 bg-surface-0 dark:bg-surface-2 hover:bg-surface-1 dark:hover:bg-surface-3 text-text-primary dark:text-foreground border border-border py-2 px-4 rounded-lg text-xs font-bold transition-colors">
                        <MessageSquare size={14} /> Open Inbox
                      </Link>
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-surface-1 rounded-xl shadow-sm border border-border dark:border-border p-6">
                    <h3 className="font-black text-text-primary dark:text-foreground uppercase tracking-wider text-xs mb-6 pb-2 border-b border-border">Collected Data</h3>
                    
                    <div className="space-y-4">
                      {Object.keys(selectedSubmission.response_data || {}).map((key) => (
                        <div key={key}>
                          <div className="text-xs font-bold text-text-muted dark:text-text-subtle uppercase tracking-wider mb-1">
                            {key.replace(/_/g, ' ')}
                          </div>
                          <div className="text-sm font-medium text-text-primary dark:text-foreground whitespace-pre-wrap">
                            {String(selectedSubmission.response_data[key])}
                          </div>
                        </div>
                      ))}
                      {Object.keys(selectedSubmission.response_data || {}).length === 0 && (
                        <div className="text-sm text-text-muted">No data fields found in this submission.</div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-text-muted">
                  Select a submission to view details
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Test Modal */}
      {testModalOpen && selectedFlow && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-surface-1 w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-fadeIn scale-100">
            <div className="px-6 py-4 border-b border-border dark:border-border flex justify-between items-center">
              <h3 className="font-black text-text-primary dark:text-foreground">Test Flow</h3>
              <button onClick={() => setTestModalOpen(false)} className="text-text-muted hover:text-text-primary cursor-pointer"><X size={20} /></button>
            </div>
            <form onSubmit={handleTestFlow} className="p-6">
              <div className="mb-4">
                <label className="block text-xs font-bold text-text-primary dark:text-foreground uppercase tracking-wider mb-2">Flow</label>
                <div className="p-3 bg-surface-0 dark:bg-surface-2 rounded-lg text-sm border border-border text-text-muted">
                  {selectedFlow.name} (ID: {selectedFlow.id})
                </div>
              </div>
              <div className="mb-6">
                <label className="block text-xs font-bold text-text-primary dark:text-foreground uppercase tracking-wider mb-2">Test WhatsApp Number</label>
                <input
                  type="text"
                  placeholder="e.g. 971501234567"
                  value={testPhone}
                  onChange={e => setTestPhone(e.target.value)}
                  className="w-full px-4 py-3 bg-white dark:bg-surface-1 border border-border dark:border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                  required
                />
                <p className="text-[10px] text-text-muted mt-2">Include country code without '+'</p>
              </div>
              
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setTestModalOpen(false)}
                  className="px-4 py-2 font-bold text-sm text-text-muted hover:text-text-primary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingTest || !testPhone}
                  className="bg-brand hover:bg-brand-dark disabled:opacity-50 text-white px-6 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2"
                >
                  {sendingTest ? 'Sending...' : <><Send size={16} /> Send Flow</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
