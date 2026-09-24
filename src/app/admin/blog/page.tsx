'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Search,
  Edit,
  Trash2,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  BookOpen,
  User,
  Calendar,
  Settings,
  Upload,
  Image as ImageIcon
} from 'lucide-react';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  category: string;
  read_time: string;
  excerpt: string;
  body_html: string;
  main_image_url: string;
  author: string;
  tags: string[];
  related_post_ids: string[];
  meta_title: string;
  meta_description: string;
  og_image: string;
  canonical: string;
  published_at: string;
}

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Partial<BlogPost> | null>(null);
  const [activeTab, setActiveTab] = useState<'content' | 'seo'>('content');
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  const fetchPosts = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/blog');
      if (!res.ok) throw new Error('Failed to fetch blog articles.');
      const data = await res.json();
      setPosts(data || []);
    } catch (err: any) {
      setError(err.message || 'Error loading articles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleEdit = (post: BlogPost) => {
    setEditingPost({ ...post });
    setActiveTab('content');
    setIsModalOpen(true);
  };

  const handleCreateNew = () => {
    setEditingPost({
      title: '',
      slug: '',
      category: 'General',
      read_time: '5 min read',
      excerpt: '',
      body_html: '',
      main_image_url: '',
      author: 'Akhil',
      tags: [],
      related_post_ids: [],
      meta_title: '',
      meta_description: '',
      og_image: '',
      canonical: '',
      published_at: new Date().toISOString()
    });
    setActiveTab('content');
    setIsModalOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'main_image_url' | 'og_image') => {
    const file = e.target.files?.[0];
    if (!file || !editingPost) return;

    setUploadingField(field);
    setError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'File upload failed');

      setEditingPost(prev => prev ? { ...prev, [field]: data.url } : null);
      setSuccess('Image uploaded successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Error uploading image.');
    } finally {
      setUploadingField(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this blog post? This action cannot be undone.')) return;
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/admin/blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete blog post.');
      
      setSuccess('Article deleted successfully!');
      setPosts(prev => prev.filter(p => p.id !== id));
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.message || 'Error deleting article.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPost) return;
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/admin/blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', post: editingPost })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save article.');

      setSuccess('Blog post saved successfully!');
      setIsModalOpen(false);
      setEditingPost(null);
      fetchPosts();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.message || 'Error saving article.');
    }
  };

  const filteredPosts = posts.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F8FBF8] p-6 md:p-12 space-y-8 text-xs font-semibold text-gray-800">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[#E0E0E0] pb-6 gap-4">
        <div className="flex items-center space-x-4">
          <Link
            href="/admin"
            className="p-2 bg-white border border-[#E0E0E0] hover:bg-[#F8FBF8] rounded-xl text-[#757575] transition-all cursor-pointer shadow-xs"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-[#212121] tracking-tight uppercase font-heading">
              Blog Editor
            </h1>
            <p className="text-sm text-[#757575] mt-1 font-medium">
              Create, update, and manage articles in ScaleCraft's database-driven publishing engine.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleCreateNew}
            className="flex items-center space-x-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer"
          >
            <Plus size={14} />
            <span>New Article</span>
          </button>
          <button
            onClick={fetchPosts}
            className="p-2.5 bg-white border border-[#E0E0E0] hover:bg-[#F8FBF8] rounded-xl text-[#757575] cursor-pointer shadow-xs transition-colors"
            title="Refresh List"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-800 text-xs font-semibold p-4 rounded-xl flex items-center space-x-2">
          <AlertTriangle size={16} className="text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-150 text-green-800 text-xs font-semibold p-4 rounded-xl flex items-center space-x-2">
          <CheckCircle size={16} className="text-green-600 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Search Header */}
      <div className="bg-white rounded-2xl border border-[#E0E0E0] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex items-center">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#AEACA5]" size={14} />
          <input
            type="text"
            placeholder="Search articles by title, category, or slug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] focus:ring-1 focus:ring-[#212121] rounded-xl pl-9 pr-4 py-2 text-xs font-semibold placeholder-[#AEACA5] outline-none"
          />
        </div>
      </div>

      {/* Articles List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-24 bg-white border border-gray-150 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="p-12 text-center text-[#AEACA5] bg-white rounded-2xl border border-[#E0E0E0]">
          <BookOpen className="mx-auto" size={32} />
          <p className="font-bold text-gray-500 mt-2">No articles found in the database.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E0E0E0] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FBF8] border-b border-[#E0E0E0] text-[10px] font-black text-[#757575] uppercase tracking-wider">
                  <th className="px-6 py-4">Title</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Author</th>
                  <th className="px-6 py-4">Published Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E0E0E0] text-xs">
                {filteredPosts.map(p => (
                  <tr key={p.id} className="hover:bg-[#F8FBF8]/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-950 text-sm font-heading">{p.title}</div>
                      <div className="text-[10px] text-gray-400 font-semibold mt-0.5">{p.slug}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[9px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded">
                        {p.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 flex items-center gap-1 mt-2.5">
                      <User size={12} className="text-gray-400" />
                      <span>{p.author}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <Calendar size={12} className="text-gray-400" />
                        <span>{new Date(p.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => handleEdit(p)}
                        className="p-1.5 bg-white border border-[#E0E0E0] hover:bg-[#F8FBF8] rounded-lg text-gray-700 cursor-pointer shadow-2xs"
                        title="Edit Article"
                      >
                        <Edit size={12} />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="p-1.5 bg-red-50 border border-red-150 hover:bg-red-100 rounded-lg text-red-600 cursor-pointer shadow-2xs"
                        title="Delete Article"
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Editor Modal */}
      {isModalOpen && editingPost && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-[#E0E0E0] shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-150 flex justify-between items-center">
              <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight">
                {editingPost.id ? 'Edit Blog Post' : 'Create New Article'}
              </h2>
              <button
                onClick={() => { setIsModalOpen(false); setEditingPost(null); }}
                className="text-gray-400 hover:text-gray-600 text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-gray-100 px-6">
              <button
                type="button"
                onClick={() => setActiveTab('content')}
                className={`py-3 px-4 border-b-2 text-xs font-black uppercase tracking-wider cursor-pointer ${
                  activeTab === 'content' ? 'border-emerald-700 text-emerald-800' : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                Article Content
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('seo')}
                className={`py-3 px-4 border-b-2 text-xs font-black uppercase tracking-wider cursor-pointer ${
                  activeTab === 'seo' ? 'border-emerald-700 text-emerald-800' : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                SEO settings
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
              {activeTab === 'content' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-500 uppercase font-black">Title</label>
                      <input
                        type="text"
                        value={editingPost.title || ''}
                        onChange={(e) => setEditingPost({ ...editingPost, title: e.target.value })}
                        className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-1.5 outline-none font-semibold text-xs text-gray-900"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-500 uppercase font-black">Slug</label>
                      <input
                        type="text"
                        value={editingPost.slug || ''}
                        onChange={(e) => setEditingPost({ ...editingPost, slug: e.target.value })}
                        placeholder="e.g. how-to-land-clients"
                        className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-1.5 outline-none font-semibold text-xs text-gray-900"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-500 uppercase font-black">Category</label>
                      <input
                        type="text"
                        value={editingPost.category || ''}
                        onChange={(e) => setEditingPost({ ...editingPost, category: e.target.value })}
                        className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-1.5 outline-none font-semibold text-xs text-gray-900"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-500 uppercase font-black">Read Time</label>
                      <input
                        type="text"
                        value={editingPost.read_time || ''}
                        onChange={(e) => setEditingPost({ ...editingPost, read_time: e.target.value })}
                        placeholder="5 min read"
                        className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-1.5 outline-none font-semibold text-xs text-gray-900"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-500 uppercase font-black">Author</label>
                      <input
                        type="text"
                        value={editingPost.author || ''}
                        onChange={(e) => setEditingPost({ ...editingPost, author: e.target.value })}
                        className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-1.5 outline-none font-semibold text-xs text-gray-900"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-500 uppercase font-black">Published Date</label>
                      <input
                        type="datetime-local"
                        value={editingPost.published_at ? new Date(editingPost.published_at).toISOString().slice(0, 16) : ''}
                        onChange={(e) => setEditingPost({ ...editingPost, published_at: new Date(e.target.value).toISOString() })}
                        className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-1.5 outline-none font-semibold text-xs text-gray-900"
                      />
                    </div>
                  </div>

                  {/* MAIN IMAGE URL WITH UPLOAD BUTTON */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-gray-500 uppercase font-black">Main Image URL</label>
                      <label className="text-[10.5px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-md cursor-pointer transition-colors flex items-center gap-1.5 shadow-2xs">
                        <Upload size={12} />
                        <span>{uploadingField === 'main_image_url' ? 'Uploading Image...' : 'Upload Image'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e, 'main_image_url')}
                          disabled={uploadingField !== null}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <input
                      type="text"
                      value={editingPost.main_image_url || ''}
                      onChange={(e) => setEditingPost({ ...editingPost, main_image_url: e.target.value })}
                      placeholder="https://... or /images/blog/img.png"
                      className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-1.5 outline-none font-semibold text-xs text-gray-900"
                    />
                    {editingPost.main_image_url && (
                      <div className="mt-2 rounded-lg overflow-hidden border border-gray-200 max-h-36 w-60 bg-gray-50 flex items-center justify-center p-1">
                        <img src={editingPost.main_image_url} alt="Main Image Preview" className="w-full h-full object-cover rounded" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 uppercase font-black">Excerpt / summary</label>
                    <textarea
                      value={editingPost.excerpt || ''}
                      onChange={(e) => setEditingPost({ ...editingPost, excerpt: e.target.value })}
                      className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-1.5 outline-none font-semibold text-xs text-gray-900 h-16 resize-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 uppercase font-black">Body Content (HTML)</label>
                    <textarea
                      value={editingPost.body_html || ''}
                      onChange={(e) => setEditingPost({ ...editingPost, body_html: e.target.value })}
                      placeholder="<p>Write your article body here in standard HTML...</p>"
                      className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-1.5 outline-none font-mono text-[11px] h-64"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="text-xs uppercase text-emerald-800 font-black border-b border-gray-100 pb-1 flex items-center gap-1.5">
                    <Settings size={13} />
                    <span>SEO settings</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-500 uppercase font-black">Meta Title</label>
                      <input
                        type="text"
                        value={editingPost.meta_title || ''}
                        onChange={(e) => setEditingPost({ ...editingPost, meta_title: e.target.value })}
                        placeholder="Article Meta Title"
                        className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-1.5 outline-none font-semibold text-xs text-gray-900"
                      />
                    </div>

                    {/* OG IMAGE URL WITH UPLOAD BUTTON */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] text-gray-500 uppercase font-black">OG Image URL</label>
                        <label className="text-[10.5px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-md cursor-pointer transition-colors flex items-center gap-1.5 shadow-2xs">
                          <Upload size={12} />
                          <span>{uploadingField === 'og_image' ? 'Uploading...' : 'Upload Image'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileUpload(e, 'og_image')}
                            disabled={uploadingField !== null}
                            className="hidden"
                          />
                        </label>
                      </div>
                      <input
                        type="text"
                        value={editingPost.og_image || ''}
                        onChange={(e) => setEditingPost({ ...editingPost, og_image: e.target.value })}
                        placeholder="/images/blog/og-slug.png"
                        className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-1.5 outline-none font-semibold text-xs text-gray-900"
                      />
                      {editingPost.og_image && (
                        <div className="mt-2 rounded-lg overflow-hidden border border-gray-200 max-h-36 w-60 bg-gray-50 flex items-center justify-center p-1">
                          <img src={editingPost.og_image} alt="OG Image Preview" className="w-full h-full object-cover rounded" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 uppercase font-black">Meta Description</label>
                    <textarea
                      value={editingPost.meta_description || ''}
                      onChange={(e) => setEditingPost({ ...editingPost, meta_description: e.target.value })}
                      className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-1.5 outline-none font-semibold text-xs text-gray-900 h-16 resize-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 uppercase font-black">Canonical Link</label>
                    <input
                      type="text"
                      value={editingPost.canonical || ''}
                      onChange={(e) => setEditingPost({ ...editingPost, canonical: e.target.value })}
                      placeholder="https://thescalecraft.in/blog/..."
                      className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-1.5 outline-none font-semibold text-xs text-gray-900"
                    />
                  </div>
                </div>
              )}

              {/* Form buttons */}
              <div className="border-t border-gray-150 pt-4 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); setEditingPost(null); }}
                  className="bg-white border border-[#E0E0E0] hover:bg-[#F8FBF8] text-gray-700 text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-2xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-5 py-2 rounded-xl transition-all shadow-2xs cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
