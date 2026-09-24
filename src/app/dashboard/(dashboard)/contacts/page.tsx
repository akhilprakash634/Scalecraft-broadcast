'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Upload,
  Download,
  Search,
  Trash2,
  AlertTriangle,
  UserCheck,
  Tag,
  Ban,
  CheckSquare,
  Square,
  X,
  FileSpreadsheet
} from 'lucide-react';

interface Contact {
  id: string;
  name: string | null;
  phone: string;
  group_tags: string[];
  source: string;
  imported_at: string;
  is_dnd: boolean;
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search and Filters
  const [search, setSearch] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState('');
  const [selectedSourceFilter, setSelectedSourceFilter] = useState('');
  
  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Manual Add Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newTagsStr, setNewTagsStr] = useState('');
  const [newDnd, setNewDnd] = useState(false);

  // Bulk Tags Modal
  const [isBulkTagOpen, setIsBulkTagOpen] = useState(false);
  const [bulkTagInput, setBulkTagInput] = useState('');

  // CSV Import Modal
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [csvContent, setCsvContent] = useState<string>('');
  const [defaultImportTag, setDefaultImportTag] = useState('');
  const [importSummary, setImportSummary] = useState<{
    importedCount: number;
    duplicateCount: number;
    invalidCount: number;
    totalProcessed: number;
  } | null>(null);

  const fetchContacts = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (selectedTagFilter) params.set('tag', selectedTagFilter);
      if (selectedSourceFilter) params.set('source', selectedSourceFilter);
      const url = params.toString() ? `/api/dashboard/contacts?${params.toString()}` : '/api/dashboard/contacts';

      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load contacts');
      const data = await res.json();
      setContacts(data.contacts || []);
    } catch (err: any) {
      setError(err.message || 'Error loading contacts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [selectedTagFilter, selectedSourceFilter]);

  const handleExportCSV = () => {
    const dataToExport = getFilteredContacts();
    if (dataToExport.length === 0) {
      alert('No contacts available to export.');
      return;
    }

    const headers = ['Name', 'Phone', 'Source', 'Group Tags', 'DND Status', 'Date Added'];
    const rows = dataToExport.map(c => {
      const sourceLabel = c.source === 'inbox' ? 'From Inbox' : c.source === 'both' ? 'Both' : 'Imported';
      const tagsStr = Array.isArray(c.group_tags) ? c.group_tags.join(';') : '';
      const dndStr = c.is_dnd ? 'Opt-out / DND' : 'Subscribed';
      const dateStr = c.imported_at ? new Date(c.imported_at).toISOString().split('T')[0] : '';
      return [
        `"${(c.name || '').replace(/"/g, '""')}"`,
        `"+${c.phone}"`,
        `"${sourceLabel}"`,
        `"${tagsStr}"`,
        `"${dndStr}"`,
        `"${dateStr}"`
      ].join(',');
    });

    const csvText = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `contacts_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setCsvContent(text);
      }
    };
    reader.readAsText(file);
  };

  // Aggregate all tags from contacts for filter dropdown
  const allGroupTagsSet = new Set<string>();
  contacts.forEach(c => {
    if (Array.isArray(c.group_tags)) {
      c.group_tags.forEach(t => allGroupTagsSet.add(t));
    }
  });
  const allUniqueTags = Array.from(allGroupTagsSet);

  const handleSelectAll = () => {
    const visible = getFilteredContacts();
    if (selectedIds.size === visible.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visible.map(c => c.id)));
    }
  };

  const handleSelectRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhone.trim()) return;
    setError('');
    try {
      const parsedTags = newTagsStr
        .split(',')
        .map(t => t.trim().toLowerCase())
        .filter(Boolean);

      const res = await fetch('/api/dashboard/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          phone: newPhone.trim(),
          group_tags: parsedTags,
          is_dnd: newDnd,
          source: 'manual'
        })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add contact');
      }
      setIsAddOpen(false);
      setNewName('');
      setNewPhone('');
      setNewTagsStr('');
      setNewDnd(false);
      fetchContacts();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCSVImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvContent.trim()) return;
    setError('');
    setImportSummary(null);
    try {
      // Basic CSV parser
      const lines = csvContent.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length <= 1) {
        throw new Error('CSV must contain a header row and at least one contact row.');
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
      const nameIdx = headers.findIndex(h => /name/i.test(h));
      const phoneIdx = headers.findIndex(h => /phone|number/i.test(h));
      const tagsIdx = headers.findIndex(h => /tag/i.test(h));

      if (phoneIdx === -1) {
        throw new Error('CSV must contain a column named "phone" or "number".');
      }

      const parsedRows = [];
      for (let i = 1; i < lines.length; i++) {
        const columns = lines[i].split(',').map(col => col.trim().replace(/^["']|["']$/g, ''));
        if (columns.length === 0 || !columns[phoneIdx]) continue;

        parsedRows.push({
          name: nameIdx !== -1 ? columns[nameIdx] : '',
          phone: columns[phoneIdx],
          group_tags: tagsIdx !== -1 ? columns[tagsIdx] : ''
        });
      }

      const res = await fetch('/api/dashboard/contacts/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvData: parsedRows,
          defaultGroupTag: defaultImportTag
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to import CSV');

      setImportSummary(data);
      setCsvContent('');
      setDefaultImportTag('');
      fetchContacts();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleBulkTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.size === 0 || !bulkTagInput.trim()) return;
    setError('');
    try {
      const newTag = bulkTagInput.trim().toLowerCase();
      // Sequentially apply new tag to all selected rows
      for (const id of Array.from(selectedIds)) {
        const contact = contacts.find(c => c.id === id);
        if (!contact) continue;
        const nextTags = Array.from(new Set([...(contact.group_tags || []), newTag]));
        await fetch('/api/dashboard/contacts', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, group_tags: nextTags })
        });
      }
      setIsBulkTagOpen(false);
      setBulkTagInput('');
      setSelectedIds(new Set());
      fetchContacts();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleBulkDnd = async (isDnd: boolean) => {
    if (selectedIds.size === 0) return;
    setError('');
    try {
      for (const id of Array.from(selectedIds)) {
        await fetch('/api/dashboard/contacts', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, is_dnd: isDnd })
        });
      }
      setSelectedIds(new Set());
      fetchContacts();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} selected contacts?`)) return;
    setError('');
    try {
      const idsParam = Array.from(selectedIds).join(',');
      const res = await fetch(`/api/dashboard/contacts?ids=${idsParam}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete selected contacts');
      setSelectedIds(new Set());
      fetchContacts();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getFilteredContacts = () => {
    return contacts.filter(c => {
      const cleanSearch = search.toLowerCase().trim();
      const nameMatch = c.name ? c.name.toLowerCase().includes(cleanSearch) : false;
      const phoneMatch = c.phone.includes(cleanSearch);
      return nameMatch || phoneMatch;
    });
  };

  const filtered = getFilteredContacts();

  return (
    <div className="space-y-6">
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#212121] tracking-tight font-heading flex items-center gap-2">
            <Users className="text-[#1B5E20]" /> Address Book (Contacts)
          </h1>
          <p className="text-xs text-[#757575] mt-1">
            Manage reusable customer lists, upload contact databases, and run broad targeted campaigns.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            className="border border-[#E0E0E0] hover:bg-[#F8FBF8] bg-white text-gray-700 text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
          >
            <Download size={14} /> Export CSV
          </button>
          <button
            onClick={() => setIsImportOpen(true)}
            className="border border-[#E0E0E0] hover:bg-[#F8FBF8] bg-white text-gray-700 text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
          >
            <Upload size={14} /> Import CSV
          </button>
          <button
            onClick={() => setIsAddOpen(true)}
            className="bg-[#1B5E20] hover:bg-[#144317] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
          >
            <Plus size={14} /> Add Contact
          </button>
        </div>
      </div>

      {/* Filter and search bar */}
      <div className="bg-white border border-[#E0E0E0] rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts by name or phone..."
            className="w-full text-xs border border-[#E0E0E0] rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-[#1B5E20] bg-gray-50/50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Source:</span>
            <select
              value={selectedSourceFilter}
              onChange={(e) => setSelectedSourceFilter(e.target.value)}
              className="text-xs border border-[#E0E0E0] rounded-xl px-3 py-2.5 bg-white cursor-pointer font-bold focus:outline-none"
            >
              <option value="">All Sources</option>
              <option value="import">Imported / Manual</option>
              <option value="inbox">From Inbox</option>
              <option value="both">Both</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Filter Tag:</span>
            <select
              value={selectedTagFilter}
              onChange={(e) => setSelectedTagFilter(e.target.value)}
              className="text-xs border border-[#E0E0E0] rounded-xl px-3 py-2.5 bg-white cursor-pointer font-bold focus:outline-none"
            >
              <option value="">All Group Tags</option>
              {allUniqueTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="bg-[#E8F5E9] border border-[#C8E6C9] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
          <span className="text-xs font-bold text-[#1B5E20]">
            Selected {selectedIds.size} contact(s)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setIsBulkTagOpen(true)}
              className="bg-white text-gray-700 hover:bg-[#F8FBF8] border border-[#E0E0E0] text-[10px] font-bold px-3 py-2 rounded-xl transition-all inline-flex items-center gap-1 cursor-pointer"
            >
              <Tag size={12} /> Assign Tag
            </button>
            <button
              onClick={() => handleBulkDnd(true)}
              className="bg-white text-gray-700 hover:bg-[#F8FBF8] border border-[#E0E0E0] text-[10px] font-bold px-3 py-2 rounded-xl transition-all inline-flex items-center gap-1 cursor-pointer"
            >
              <Ban size={12} className="text-amber-600" /> Mark DND
            </button>
            <button
              onClick={() => handleBulkDnd(false)}
              className="bg-white text-gray-700 hover:bg-[#F8FBF8] border border-[#E0E0E0] text-[10px] font-bold px-3 py-2 rounded-xl transition-all inline-flex items-center gap-1 cursor-pointer"
            >
              <UserCheck size={12} className="text-emerald-600" /> Opt-in
            </button>
            <button
              onClick={handleBulkDelete}
              className="bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 text-[10px] font-bold px-3 py-2 rounded-xl transition-all inline-flex items-center gap-1 cursor-pointer"
            >
              <Trash2 size={12} /> Delete
            </button>
          </div>
        </div>
      )}

      {/* Main contacts Table */}
      <div className="bg-white border border-[#E0E0E0] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F8FBF8] border-b border-[#E0E0E0] text-[10px] font-black text-[#757575] uppercase tracking-wider">
                <th className="px-6 py-4 w-10">
                  <button onClick={handleSelectAll} className="text-[#757575] hover:text-[#212121]">
                    {selectedIds.size === filtered.length && filtered.length > 0 ? (
                      <CheckSquare size={16} className="text-[#1B5E20]" />
                    ) : (
                      <Square size={16} />
                    )}
                  </button>
                </th>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Phone Number</th>
                <th className="px-6 py-4">Group Tags</th>
                <th className="px-6 py-4">Source</th>
                <th className="px-6 py-4">Date Added</th>
                <th className="px-6 py-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E0E0E0]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 italic">
                    Loading contacts directory...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 italic">
                    No contacts found matching criteria. Add some to get started.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-[#F8FBF8]/40 transition-colors">
                    <td className="px-6 py-4">
                      <button onClick={() => handleSelectRow(c.id)} className="text-[#757575] hover:text-[#212121]">
                        {selectedIds.has(c.id) ? (
                          <CheckSquare size={16} className="text-[#1B5E20]" />
                        ) : (
                          <Square size={16} />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 font-bold text-[#212121]">{c.name || '—'}</td>
                    <td className="px-6 py-4 font-mono text-gray-600">+{c.phone}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {c.group_tags.map(tag => (
                          <span key={tag} className="bg-gray-100 text-gray-700 text-[9px] px-2 py-0.5 rounded font-black uppercase">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {c.source === 'inbox' ? (
                        <span className="bg-blue-50 text-blue-700 border border-blue-100 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          From Inbox
                        </span>
                      ) : c.source === 'both' ? (
                        <span className="bg-purple-50 text-purple-700 border border-purple-100 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          Both
                        </span>
                      ) : (
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          Imported
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(c.imported_at).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                        c.is_dnd ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      }`}>
                        {c.is_dnd ? 'DND / Opt-out' : 'Subscribed'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Add Contact Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white border border-[#E0E0E0] rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E0E0E0] pb-3">
              <h3 className="text-sm font-bold text-[#212121] font-heading">Add New Contact</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddContact} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider">Full Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Alexis Carter"
                  className="w-full text-xs border border-[#E0E0E0] rounded-lg px-3 py-2 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider">Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="e.g. 918078004732"
                  className="w-full text-xs border border-[#E0E0E0] rounded-lg px-3 py-2 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider">Group Tags (Comma-separated)</label>
                <input
                  type="text"
                  value={newTagsStr}
                  onChange={(e) => setNewTagsStr(e.target.value)}
                  placeholder="e.g. vip, newsletter"
                  className="w-full text-xs border border-[#E0E0E0] rounded-lg px-3 py-2 focus:outline-none"
                />
              </div>

              <label className="flex items-center gap-2 p-2 border border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={newDnd}
                  onChange={(e) => setNewDnd(e.target.checked)}
                  className="h-4 w-4 text-[#1B5E20] border-gray-300 rounded focus:ring-0"
                />
                <span className="text-xs text-gray-700">Mark as DND (Do Not Disturb)</span>
              </label>

              <button
                type="submit"
                className="w-full bg-[#1B5E20] hover:bg-[#144317] text-white text-xs font-bold py-2.5 rounded-lg transition-colors cursor-pointer"
              >
                Add Contact
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Tag Modal */}
      {isBulkTagOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white border border-[#E0E0E0] rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E0E0E0] pb-3">
              <h3 className="text-sm font-bold text-[#212121] font-heading">Assign Group Tag</h3>
              <button onClick={() => setIsBulkTagOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleBulkTag} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider">Group Tag Name</label>
                <input
                  type="text"
                  required
                  value={bulkTagInput}
                  onChange={(e) => setBulkTagInput(e.target.value)}
                  placeholder="e.g. active_customers"
                  className="w-full text-xs border border-[#E0E0E0] rounded-lg px-3 py-2 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-[#1B5E20] hover:bg-[#144317] text-white text-xs font-bold py-2.5 rounded-lg transition-colors cursor-pointer"
              >
                Apply Tag to {selectedIds.size} Contacts
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {isImportOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white border border-[#E0E0E0] rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E0E0E0] pb-3">
              <h3 className="text-sm font-bold text-[#212121] font-heading flex items-center gap-1">
                <FileSpreadsheet size={16} className="text-[#1B5E20]" /> Import Contacts CSV
              </h3>
              <button onClick={() => { setIsImportOpen(false); setImportSummary(null); }} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            {importSummary ? (
              <div className="space-y-4 py-2">
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl space-y-2">
                  <p className="font-bold">✓ CSV Import successfully processed!</p>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs pt-2">
                    <div className="p-2 bg-white rounded-lg border border-emerald-100">
                      <span className="block font-black text-emerald-800 text-base">{importSummary.importedCount}</span>
                      <span className="block text-[9px] text-gray-500 uppercase tracking-wider mt-0.5">Imported</span>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-emerald-100">
                      <span className="block font-black text-amber-800 text-base">{importSummary.duplicateCount}</span>
                      <span className="block text-[9px] text-gray-500 uppercase tracking-wider mt-0.5">Duplicates</span>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-emerald-100">
                      <span className="block font-black text-red-800 text-base">{importSummary.invalidCount}</span>
                      <span className="block text-[9px] text-gray-500 uppercase tracking-wider mt-0.5">Invalid</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => { setIsImportOpen(false); setImportSummary(null); }}
                  className="w-full bg-[#1B5E20] text-white py-2.5 rounded-lg text-xs font-bold"
                >
                  Close Window
                </button>
              </div>
            ) : (
              <form onSubmit={handleCSVImport} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider">Upload CSV File</label>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileUpload}
                    className="w-full text-xs border border-[#E0E0E0] rounded-lg px-3 py-2 bg-gray-50 cursor-pointer focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider">Or Paste CSV Plaintext *</label>
                  <textarea
                    rows={5}
                    required
                    value={csvContent}
                    onChange={(e) => setCsvContent(e.target.value)}
                    placeholder="name,phone,group_tags&#13;John Doe,918078004732,vip&#13;Alexis Carter,917200192841,newsletter"
                    className="w-full text-xs border border-[#E0E0E0] rounded-lg px-3 py-2 font-mono focus:outline-none"
                  />
                  <span className="block text-[10px] text-gray-500 leading-relaxed mt-1">
                    First row must be header row. Ensure columns are named <strong>name</strong>, <strong>phone</strong> (or number), and optional <strong>group_tags</strong>.
                  </span>
                </div>

                <div className="space-y-1 border-t border-[#E0E0E0] pt-3">
                  <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider">Default Tag for all imported rows (Optional)</label>
                  <input
                    type="text"
                    value={defaultImportTag}
                    onChange={(e) => setDefaultImportTag(e.target.value)}
                    placeholder="e.g. cold_leads"
                    className="w-full text-xs border border-[#E0E0E0] rounded-lg px-3 py-2 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold py-2.5 rounded-lg transition-colors cursor-pointer"
                >
                  Process CSV Data
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
