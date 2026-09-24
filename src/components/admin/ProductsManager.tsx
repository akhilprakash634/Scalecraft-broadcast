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
  Eye,
  CheckCircle,
  AlertTriangle,
  Package,
  Layers,
  DollarSign,
  Settings,
  ListPlus,
  Copy,
  Upload,
  Image as ImageIcon,
  HelpCircle,
  Download,
  Filter,
  EyeOff,
  Tag
} from 'lucide-react';

interface ProductMedia {
  id?: string;
  type: string;
  url: string;
  sort_order: number;
  alt_text?: string;
  title?: string;
}

interface ProductFaq {
  id?: string;
  question: string;
  answer: string;
  sort_order: number;
}

interface ProductDownload {
  id?: string;
  title: string;
  url: string;
  type: string;
}

interface Offer {
  id: string;
  name: string;
  banner_url: string;
  description: string;
  offer_type: string;
  discount_value: number;
  start_date: string;
  end_date: string;
  priority: number;
  active: boolean;
  show_countdown: boolean;
  coupon_code: string;
  products_included: string[];
}

interface ProductAnalytics {
  views_count: number;
  checkout_clicks_count: number;
  purchases_count: number;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  legacy_slug?: string;
  aliases?: string[];
  description: string;
  long_description: string;
  thumbnail_url: string;
  banner_url: string;
  category_id: string;
  product_type: string;
  product_subtype?: string;
  price: number;
  original_price: number;
  international_price: number;
  international_actual_price: number;
  setup_price: number | null;
  monthly_price: number | null;
  plan_type: string;
  status: string;
  features: string[];
  is_featured: boolean;
  is_combo: boolean;
  combo_product_ids: string[];
  related_product_ids: string[];
  test_mode: boolean;
  sort_order: number;
  notion_url: string | null;
  url: string | null;
  meta_title: string;
  meta_description: string;
  og_image: string;
  canonical: string;
  focus_keyword?: string;
  schema_override?: string;
  robots_meta?: string;
  sitemap_priority?: number;
  sitemap_changefreq?: string;
  redirect_urls?: string[];

  // Checkout & Experience Engine
  checkout_title?: string;
  checkout_description?: string;
  custom_cta?: string;
  cta_text?: string;
  trust_badges?: Array<{ label: string; icon?: string }>;
  guarantee_title?: string;
  guarantee_description?: string;
  guarantee_badge?: string;
  social_proof_badge?: string;
  delivery_message?: string;
  how_it_works_steps?: Array<{ number: number; title: string; desc: string }>;
  email_subject?: string;
  email_headline?: string;
  email_action_label?: string;

  section_visibility: {
    hero: boolean;
    benefits: boolean;
    preview: boolean;
    testimonials: boolean;
    faq: boolean;
    founder: boolean;
    guarantee: boolean;
    related: boolean;
  };
  page_sections?: string[];
  quick_facts?: Record<string, string>;
  preview_sections?: any[];
  review_count?: number;
  demo_video_url?: string;
  youtube_url?: string;
  loom_url?: string;
  preview_url?: string;
  documentation_url?: string;
  github_url?: string;
  media: ProductMedia[];
  faqs: ProductFaq[];
  downloads: ProductDownload[];
  analytics?: ProductAnalytics;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface ProductsManagerProps {
  productType?: 'digital' | 'saas' | 'all';
  defaultNewType?: 'digital' | 'saas';
  pageTitle?: string;
  pageDescription?: string;
}

export default function ProductsManager({
  productType = 'all',
  defaultNewType = 'digital',
  pageTitle = 'Product Catalog',
  pageDescription = 'Manage all catalog products.'
}: ProductsManagerProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allOffers, setAllOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [sortBy, setSortBy] = useState('sort_order');

  const [uploadingField, setUploadingField] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [originalProductString, setOriginalProductString] = useState('');
  const [activeTab, setActiveTab] = useState('general');

  const [newMediaType, setNewMediaType] = useState('screenshot');
  const [newMediaUrl, setNewMediaUrl] = useState('');
  const [newMediaSort, setNewMediaSort] = useState(0);

  const getProductUrl = (p: Partial<Product>) => {
    return `/products/${p.slug}`;
  };

  const getProductPreviewUrl = (p: Partial<Product>) => {
    const baseUrl = getProductUrl(p);
    if (p.status !== 'published') return `${baseUrl}?preview=true`;
    return baseUrl;
  };

  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleNameChange = (newName: string) => {
    if (!editingProduct) return;
    const isNew = !originalProductString || (() => {
      try { return !JSON.parse(originalProductString).id; } catch { return true; }
    })();

    const generated = slugify(newName);

    if (isNew) {
      const prevAuto = slugify(editingProduct.name || '');
      const slugIsUntouched = !editingProduct.slug || editingProduct.slug === prevAuto;
      const idIsUntouched = !editingProduct.id || editingProduct.id === prevAuto;

      setEditingProduct({
        ...editingProduct,
        name: newName,
        slug: slugIsUntouched ? generated : editingProduct.slug,
        id: idIsUntouched ? generated : editingProduct.id,
      });
    } else {
      setEditingProduct({ ...editingProduct, name: newName });
    }
  };

  const handleSlugChange = (newSlug: string) => {
    if (!editingProduct) return;
    const isNew = !originalProductString || (() => {
      try { return !JSON.parse(originalProductString).id; } catch { return true; }
    })();

    if (isNew) {
      const prevSlug = editingProduct.slug || slugify(editingProduct.name || '');
      const idIsUntouched = !editingProduct.id || editingProduct.id === prevSlug;

      setEditingProduct({
        ...editingProduct,
        slug: newSlug,
        id: idIsUntouched ? slugify(newSlug) : editingProduct.id,
      });
    } else {
      setEditingProduct({ ...editingProduct, slug: newSlug });
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const apiUrl = productType !== 'all'
        ? `/api/admin/products?type=${productType}`
        : '/api/admin/products';

      const [prodRes, offersRes] = await Promise.all([
        fetch(apiUrl),
        fetch('/api/admin/offers')
      ]);

      if (!prodRes.ok) throw new Error('Failed to fetch catalog products.');
      const prodData = await prodRes.json();
      setProducts(prodData.products || []);
      setCategories(prodData.categories || []);

      if (offersRes.ok) {
        const offersData = await offersRes.json();
        setAllOffers(offersData.offers || []);
      }
    } catch (err: any) {
      setError(err.message || 'Error loading catalog data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleEdit = (product: Product) => {
    setEditingProduct({ ...product });
    setOriginalProductString(JSON.stringify(product));
    setActiveTab('general');
    setIsModalOpen(true);
  };

  const handleCreateNew = () => {
    const emptyProduct: Partial<Product> = {
      id: '', name: '', slug: '', description: '', long_description: '',
      thumbnail_url: '', banner_url: '', category_id: 'templates',
      product_type: defaultNewType, product_subtype: '',
      price: 0, original_price: 0, international_price: 0, international_actual_price: 0,
      setup_price: null, monthly_price: null, plan_type: 'standard', status: 'draft',
      features: [], is_featured: false, is_combo: false, combo_product_ids: [],
      related_product_ids: [], test_mode: false, sort_order: 0,
      notion_url: '', url: '', meta_title: '', meta_description: '', og_image: '', canonical: '',
      demo_video_url: '', youtube_url: '', loom_url: '', preview_url: '',
      documentation_url: '', github_url: '',
      media: [], faqs: [], downloads: [], preview_sections: [], quick_facts: {}, page_sections: [],
      review_count: 0,
      section_visibility: { hero: true, benefits: true, preview: true, testimonials: true, faq: true, founder: true, guarantee: true, related: true }
    };
    setEditingProduct(emptyProduct);
    setOriginalProductString(JSON.stringify(emptyProduct));
    setActiveTab('general');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    const hasChanges = JSON.stringify(editingProduct) !== originalProductString;
    if (hasChanges && !confirm('You have unsaved changes. Are you sure you want to discard them and leave?')) return;
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const handleToggleOfferInclusion = async (offer: Offer) => {
    if (!editingProduct || !editingProduct.id) return;
    const isIncluded = (offer.products_included || []).includes(editingProduct.id);
    const updatedIncluded = isIncluded
      ? (offer.products_included || []).filter(id => id !== editingProduct.id)
      : [...(offer.products_included || []), editingProduct.id];
    const updatedOffer = { ...offer, products_included: updatedIncluded };
    try {
      const res = await fetch('/api/admin/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', offer: updatedOffer })
      });
      if (!res.ok) throw new Error('Failed to update offer');
      setAllOffers(prev => prev.map(o => o.id === offer.id ? updatedOffer : o));
    } catch (err: any) { alert(err.message || 'Error updating offer inclusion'); }
  };

  const handleDuplicate = async (id: string) => {
    if (!confirm('Duplicate this product? All related FAQs and downloads will be duplicated.')) return;
    setLoading(true); setError(''); setSuccess('');
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'duplicate', id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to duplicate product.');
      setSuccess('Product duplicated successfully as Draft!');
      fetchData();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.message || 'Error duplicating product.');
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product? All dependent records will be deleted.')) return;
    setError(''); setSuccess('');
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete product.');
      setSuccess('Product deleted successfully!');
      setProducts(prev => prev.filter(p => p.id !== id));
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) { setError(err.message || 'Error deleting product.'); }
  };

  const saveProductDirectly = async (productToSave: Partial<Product>) => {
    setError(''); setSuccess('');
    const finalProduct = { ...productToSave };

    if (!finalProduct.id) {
      finalProduct.id = finalProduct.slug || slugify(finalProduct.name || '') || `prod-${Date.now()}`;
    }
    if (!finalProduct.slug) {
      finalProduct.slug = finalProduct.id || slugify(finalProduct.name || '');
    }

    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', product: finalProduct })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save product.');
      setSuccess('Product saved successfully!');
      setIsModalOpen(false);
      setEditingProduct(null);
      fetchData();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) { setError(err.message || 'Error saving product.'); }
  };

  const handleSaveWithStatus = async (status: string) => {
    if (!editingProduct) return;
    const updated = { ...editingProduct, status };
    setEditingProduct(updated);
    await saveProductDirectly(updated);
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct) saveProductDirectly(editingProduct);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetField: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingField(targetField); setError('');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      if (editingProduct) {
        if (targetField === 'thumbnail') setEditingProduct({ ...editingProduct, thumbnail_url: data.url });
        else if (targetField === 'banner') setEditingProduct({ ...editingProduct, banner_url: data.url });
        else if (targetField === 'new_media') {
          setNewMediaUrl(data.url);
          const currentMedia = editingProduct.media || [];
          setEditingProduct({
            ...editingProduct,
            media: [
              ...currentMedia,
              { type: newMediaType || 'screenshot', url: data.url, sort_order: Number(newMediaSort) || currentMedia.length }
            ]
          });
        }
      }
      setSuccess(`${targetField} uploaded!`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) { setError(err.message || 'Error uploading file.'); }
    finally { setUploadingField(null); }
  };

  const handleAddMediaItem = () => {
    if (!newMediaUrl || !editingProduct) return;
    const currentMedia = editingProduct.media || [];
    setEditingProduct({ ...editingProduct, media: [...currentMedia, { type: newMediaType, url: newMediaUrl, sort_order: Number(newMediaSort) || 0 }] });
    setNewMediaUrl(''); setNewMediaSort(0);
  };

  const handleRemoveMediaItem = (index: number) => {
    if (!editingProduct) return;
    const currentMedia = [...(editingProduct.media || [])];
    currentMedia.splice(index, 1);
    setEditingProduct({ ...editingProduct, media: currentMedia });
  };

  const handleAddFaqItem = () => {
    if (!editingProduct) return;
    const currentFaqs = editingProduct.faqs || [];
    setEditingProduct({ ...editingProduct, faqs: [...currentFaqs, { question: '', answer: '', sort_order: currentFaqs.length }] });
  };

  const handleFaqChange = (index: number, field: keyof ProductFaq, val: any) => {
    if (!editingProduct) return;
    const currentFaqs = [...(editingProduct.faqs || [])];
    currentFaqs[index] = { ...currentFaqs[index], [field]: val };
    setEditingProduct({ ...editingProduct, faqs: currentFaqs });
  };

  const handleRemoveFaqItem = (index: number) => {
    if (!editingProduct) return;
    const currentFaqs = [...(editingProduct.faqs || [])];
    currentFaqs.splice(index, 1);
    setEditingProduct({ ...editingProduct, faqs: currentFaqs });
  };

  const handleAddDownloadItem = () => {
    if (!editingProduct) return;
    const currentDownloads = editingProduct.downloads || [];
    setEditingProduct({ ...editingProduct, downloads: [...currentDownloads, { title: '', url: '', type: 'notion_template' }] });
  };

  const handleDownloadChange = (index: number, field: keyof ProductDownload, val: any) => {
    if (!editingProduct) return;
    const currentDownloads = [...(editingProduct.downloads || [])];
    currentDownloads[index] = { ...currentDownloads[index], [field]: val };
    setEditingProduct({ ...editingProduct, downloads: currentDownloads });
  };

  const handleRemoveDownloadItem = (index: number) => {
    if (!editingProduct) return;
    const currentDownloads = [...(editingProduct.downloads || [])];
    currentDownloads.splice(index, 1);
    setEditingProduct({ ...editingProduct, downloads: currentDownloads });
  };

  const handleFeatureAdd = () => {
    if (!editingProduct) return;
    setEditingProduct({ ...editingProduct, features: [...(editingProduct.features || []), ''] });
  };

  const handleFeatureChange = (index: number, val: string) => {
    if (!editingProduct) return;
    const currentFeatures = [...(editingProduct.features || [])];
    currentFeatures[index] = val;
    setEditingProduct({ ...editingProduct, features: currentFeatures });
  };

  const handleFeatureRemove = (index: number) => {
    if (!editingProduct) return;
    const currentFeatures = [...(editingProduct.features || [])];
    currentFeatures.splice(index, 1);
    setEditingProduct({ ...editingProduct, features: currentFeatures });
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.slug.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || p.category_id === selectedCategory;
    const matchesStatus = !selectedStatus || p.status === selectedStatus;
    const matchesType = productType === 'all' ? true
      : productType === 'saas' ? p.product_type === 'saas'
      : p.product_type !== 'saas';
    return matchesSearch && matchesCategory && matchesStatus && matchesType;
  }).sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'price') return a.price - b.price;
    if (sortBy === 'views') return (b.analytics?.views_count || 0) - (a.analytics?.views_count || 0);
    if (sortBy === 'sales') return (b.analytics?.purchases_count || 0) - (a.analytics?.purchases_count || 0);
    return a.sort_order - b.sort_order;
  });

  return (
    <div className="min-h-screen bg-[#F8FBF8] p-6 md:p-12 space-y-8 text-xs font-semibold text-gray-800">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[#E0E0E0] pb-6 gap-4">
        <div className="flex items-center space-x-4">
          <Link href="/admin" className="p-2 bg-white border border-[#E0E0E0] hover:bg-[#F8FBF8] rounded-xl text-[#757575] transition-all cursor-pointer shadow-xs">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-[#212121] tracking-tight uppercase font-heading">{pageTitle}</h1>
            <p className="text-sm text-[#757575] mt-1 font-medium">{pageDescription}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button onClick={handleCreateNew} className="flex items-center space-x-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer">
            <Plus size={14} /><span>Create Product</span>
          </button>
          <button onClick={fetchData} className="p-2.5 bg-white border border-[#E0E0E0] hover:bg-[#F8FBF8] rounded-xl text-[#757575] cursor-pointer shadow-xs transition-colors" title="Refresh">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-800 text-xs font-semibold p-4 rounded-xl flex items-center space-x-2">
          <AlertTriangle size={16} className="text-red-600 flex-shrink-0" /><span>{error}</span>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-150 text-green-800 text-xs font-semibold p-4 rounded-xl flex items-center space-x-2">
          <CheckCircle size={16} className="text-green-600 flex-shrink-0" /><span>{success}</span>
        </div>
      )}

      {/* Filters Toolbar */}
      <div className="bg-white rounded-2xl border border-[#E0E0E0] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#AEACA5]" size={14} />
          <input type="text" placeholder="Search products..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] focus:ring-1 focus:ring-[#212121] rounded-xl pl-9 pr-4 py-2.5 text-xs font-semibold placeholder-[#AEACA5] outline-none" />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 bg-gray-50 border border-[#E0E0E0] px-3 py-1.5 rounded-xl text-gray-700">
            <Filter size={12} className="text-gray-400" />
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="bg-transparent border-none outline-none font-semibold text-xs cursor-pointer">
              <option value="">All Categories</option>
              {categories.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
          </div>
          <div className="flex items-center space-x-2 bg-gray-50 border border-[#E0E0E0] px-3 py-1.5 rounded-xl text-gray-700">
            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="bg-transparent border-none outline-none font-semibold text-xs cursor-pointer">
              <option value="">All Statuses</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="coming_soon">Coming Soon</option>
              <option value="hidden">Hidden</option>
            </select>
          </div>
          <div className="flex items-center space-x-2 bg-gray-50 border border-[#E0E0E0] px-3 py-1.5 rounded-xl text-gray-700">
            <span className="text-gray-400">Sort:</span>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="bg-transparent border-none outline-none font-semibold text-xs cursor-pointer">
              <option value="sort_order">Display Order</option>
              <option value="name">Name</option>
              <option value="price">Price</option>
              <option value="views">Most Viewed</option>
              <option value="sales">Most Sold</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (<div key={i} className="h-64 bg-white border border-gray-150 rounded-2xl animate-pulse" />))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="p-12 text-center text-[#AEACA5] bg-white rounded-2xl border border-[#E0E0E0]">
          <Package className="mx-auto" size={32} />
          <p className="font-bold text-gray-500 mt-2">No products found matching filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map(p => {
            const views = p.analytics?.views_count || 0;
            const sales = p.analytics?.purchases_count || 0;
            const convRate = views > 0 ? ((sales / views) * 100).toFixed(1) : '0.0';
            return (
              <div key={p.id} className="bg-white rounded-2xl border border-[#E0E0E0] shadow-xs flex flex-col justify-between overflow-hidden hover:shadow-sm transition-all">
                <div className="p-5 space-y-4">
                  <div className="flex gap-4">
                    {p.thumbnail_url ? (
                      <img src={p.thumbnail_url} alt={p.name} className="w-14 h-14 rounded-lg object-cover border border-gray-100 shrink-0" />
                    ) : (
                      <div className="w-14 h-14 bg-gray-50 border border-gray-150 rounded-lg shrink-0 flex items-center justify-center text-gray-400">
                        <ImageIcon size={18} />
                      </div>
                    )}
                    <div className="space-y-0.5 truncate">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[8px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">{p.product_type}</span>
                        {p.product_subtype && (
                          <span className="text-[8px] font-black uppercase tracking-wider text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded">{p.product_subtype}</span>
                        )}
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${p.status === 'published' ? 'bg-green-50 text-green-700' : p.status === 'draft' ? 'bg-yellow-50 text-yellow-700' : 'bg-blue-50 text-blue-700'}`}>{p.status}</span>
                      </div>
                      <h3 className="text-[13px] font-black text-gray-900 leading-snug truncate" title={p.name}>{p.name}</h3>
                      <p className="text-[10px] text-gray-400 font-bold font-mono leading-none">{p.slug}</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-500 leading-relaxed font-medium line-clamp-3">{p.description || 'No description.'}</p>
                  <div className="grid grid-cols-4 bg-gray-50 rounded-xl p-3 text-center border border-gray-100 divide-x divide-gray-200">
                    <div><div className="text-[11px] font-black text-gray-900">{views}</div><div className="text-[8px] text-gray-400 font-bold uppercase">Views</div></div>
                    <div><div className="text-[11px] font-black text-gray-900">{p.analytics?.checkout_clicks_count || 0}</div><div className="text-[8px] text-gray-400 font-bold uppercase">Clicks</div></div>
                    <div><div className="text-[11px] font-black text-gray-900">{sales}</div><div className="text-[8px] text-gray-400 font-bold uppercase">Sales</div></div>
                    <div><div className="text-[11px] font-black text-emerald-800">{convRate}%</div><div className="text-[8px] text-gray-400 font-bold uppercase">CR</div></div>
                  </div>
                  <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
                    <div className="flex items-center gap-1 text-gray-900 font-black">
                      <DollarSign size={12} className="text-gray-400" />
                      <span>₹{p.price}</span>
                      {p.original_price > p.price && (<span className="text-[10px] text-gray-400 line-through font-normal ml-1">₹{p.original_price}</span>)}
                    </div>
                    <div className="text-[10px] text-gray-500 font-bold">USD: ${p.international_price}</div>
                  </div>
                </div>
                <div className="bg-[#FAF9F6] border-t border-[#E0E0E0] px-5 py-3 flex justify-between items-center gap-2">
                  <span className="text-[10px] text-gray-400 font-bold">Order: {p.sort_order} &middot; {p.media?.length || 0} Assets</span>
                  <div className="flex items-center space-x-1.5">
                    <a href={getProductPreviewUrl(p)} target="_blank" rel="noopener noreferrer"
                      className="p-1.5 bg-white border border-[#E0E0E0] hover:bg-[#F8FBF8] rounded-lg text-gray-700 cursor-pointer shadow-2xs flex items-center gap-1"
                      title={p.status === 'published' ? 'View Live' : 'Preview Draft'}>
                      {p.status === 'published' ? <Eye size={12} /> : <EyeOff size={12} className="text-orange-500" />}
                      <span className="text-[9px] font-bold">{p.status === 'published' ? 'Live' : 'Preview'}</span>
                    </a>
                    <button onClick={() => handleDuplicate(p.id)} className="p-1.5 bg-white border border-[#E0E0E0] hover:bg-[#F8FBF8] rounded-lg text-gray-700 cursor-pointer shadow-2xs" title="Clone"><Copy size={12} /></button>
                    <button onClick={() => handleEdit(p)} className="p-1.5 bg-white border border-[#E0E0E0] hover:bg-[#F8FBF8] rounded-lg text-gray-700 cursor-pointer shadow-2xs" title="Edit"><Edit size={12} /></button>
                    <button onClick={() => handleDelete(p.id)} className="p-1.5 bg-red-50 border border-red-150 hover:bg-red-100 rounded-lg text-red-600 cursor-pointer shadow-2xs" title="Delete"><Trash2 size={12} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Editor Modal */}
      {isModalOpen && editingProduct && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-[#E0E0E0] shadow-xl w-full max-w-4xl max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-150 flex justify-between items-center bg-gray-50 rounded-t-2xl">
              <div>
                <h2 className="text-base font-black text-gray-900 uppercase tracking-tight">
                  {editingProduct.id ? `Edit: ${editingProduct.name}` : 'Create New Product'}
                </h2>
                <p className="text-[10px] text-gray-400 font-bold font-mono leading-none mt-1">
                  ID: {editingProduct.id || 'New'} &middot; Status: <span className="uppercase text-emerald-800">{editingProduct.status}</span>
                </p>
              </div>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-650 text-xl font-bold cursor-pointer">&times;</button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-gray-200 overflow-x-auto bg-gray-50 text-[10px] uppercase font-black tracking-wider text-gray-500 scrollbar-none shrink-0">
              {[
                { id: 'general', label: 'General', icon: <Package size={11} /> },
                { id: 'pricing', label: 'Pricing', icon: <DollarSign size={11} /> },
                { id: 'experience', label: 'Checkout & Experience', icon: <Settings size={11} /> },
                { id: 'seo', label: 'SEO & Indexing', icon: <Layers size={11} /> },
                { id: 'media', label: 'Media Manager', icon: <ImageIcon size={11} /> },
                { id: 'faqs_downloads', label: 'FAQs & Downloads', icon: <HelpCircle size={11} /> },
                { id: 'content_builder', label: 'Content Builder', icon: <ListPlus size={11} /> },
                { id: 'marketing', label: 'Marketing/Demo', icon: <Settings size={11} /> },
                { id: 'toggles', label: 'Landing Sections', icon: <Settings size={11} /> },
                { id: 'offers', label: 'Offers', icon: <Tag size={11} /> }
              ].map(tab => (
                <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-5 py-3 border-b-2 font-bold cursor-pointer transition-colors whitespace-nowrap ${activeTab === tab.id ? 'border-emerald-700 text-emerald-800 bg-white font-extrabold' : 'border-transparent hover:text-gray-900 hover:bg-gray-100'}`}>
                  {tab.icon}<span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Form */}
            <form onSubmit={handleSaveSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">

              {/* TAB: GENERAL */}
              {activeTab === 'general' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-500 uppercase font-black">Product Database ID</label>
                      <input type="text" value={editingProduct.id || ''} onChange={(e) => setEditingProduct({ ...editingProduct, id: e.target.value })}
                        disabled={!!(originalProductString && (() => { try { return JSON.parse(originalProductString).id; } catch { return false; } })())}
                        placeholder="Auto-generated from name or slug"
                        className="w-full bg-white border border-[#E0E0E0] disabled:bg-gray-100 focus:border-[#212121] rounded-lg px-3 py-2 outline-none font-semibold text-xs" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-500 uppercase font-black">Product Name</label>
                      <input type="text" value={editingProduct.name || ''} onChange={(e) => handleNameChange(e.target.value)}
                        placeholder="e.g. ScaleCraft CRM Template"
                        className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-2 outline-none font-semibold text-xs" required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-500 uppercase font-black">Slug (URL segment)</label>
                      <input type="text" value={editingProduct.slug || ''} onChange={(e) => handleSlugChange(e.target.value)}
                        placeholder="e.g. crm-template"
                        className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-2 outline-none font-semibold text-xs" required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-500 uppercase font-black">URL Aliases (Comma Separated)</label>
                      <input type="text" value={Array.isArray(editingProduct.aliases) ? editingProduct.aliases.join(', ') : (editingProduct.aliases || '')}
                        onChange={(e) => setEditingProduct({ ...editingProduct, aliases: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                        placeholder="e.g. scalecraft-agent, whatsapp-agent, managed-ai"
                        className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-2 outline-none font-semibold text-xs" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-500 uppercase font-black">Category</label>
                      <select value={editingProduct.category_id || 'templates'} onChange={(e) => setEditingProduct({ ...editingProduct, category_id: e.target.value })}
                        className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-2 outline-none font-semibold text-xs cursor-pointer">
                        {categories.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-500 uppercase font-black">Product Type</label>
                      <select value={editingProduct.product_type || 'digital'}
                        onChange={(e) => setEditingProduct({ ...editingProduct, product_type: e.target.value, product_subtype: '' })}
                        className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-2 outline-none font-semibold text-xs cursor-pointer">
                        <option value="digital">Digital Product</option>
                        <option value="saas">SaaS Plan</option>
                        <option value="service">Agency Service</option>
                        <option value="bundle">Bundle/Combo</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-500 uppercase font-black">Subtype</label>
                      <select value={editingProduct.product_subtype || ''}
                        onChange={(e) => setEditingProduct({ ...editingProduct, product_subtype: e.target.value })}
                        className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-2 outline-none font-semibold text-xs cursor-pointer">
                        <option value="">— None —</option>
                        {(editingProduct.product_type === 'saas' || editingProduct.product_type === 'service') ? (
                          <>
                            <option value="subscription">Subscription</option>
                            <option value="lifetime">Lifetime Deal</option>
                            <option value="setup_service">Setup Service</option>
                          </>
                        ) : (
                          <>
                            <option value="template">Template</option>
                            <option value="notion">Notion Workspace</option>
                            <option value="prompt">Prompt Pack</option>
                            <option value="guide">Guide / Playbook</option>
                            <option value="bundle">Bundle / Combo</option>
                            <option value="ebook">Ebook / PDF</option>
                          </>
                        )}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-500 uppercase font-black">Status</label>
                      <select value={editingProduct.status || 'draft'} onChange={(e) => setEditingProduct({ ...editingProduct, status: e.target.value })}
                        className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-2 outline-none font-semibold text-xs cursor-pointer">
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                        <option value="hidden">Hidden</option>
                        <option value="coming_soon">Coming Soon</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 uppercase font-black">Short Card Description</label>
                    <textarea value={editingProduct.description || ''} onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                      placeholder="2-3 sentence overview for the product grids..."
                      className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-2 outline-none font-semibold text-xs h-16 resize-none" required />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 uppercase font-black">Long Description (Landing Page — Problem Block)</label>
                    <textarea value={editingProduct.long_description || ''} onChange={(e) => setEditingProduct({ ...editingProduct, long_description: e.target.value })}
                      placeholder="Explain the problem this product solves in 2-4 paragraphs. Shown on the product landing page under 'Why this was built'..."
                      className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-2 outline-none font-semibold text-xs h-28 resize-y" />
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="flex justify-between items-center border-b border-gray-150 pb-1">
                      <label className="text-[10px] text-gray-500 uppercase font-black">Key Highlights / Features</label>
                      <button type="button" onClick={handleFeatureAdd} className="text-emerald-700 hover:text-emerald-900 font-bold text-[10px]">+ Add Row</button>
                    </div>
                    <div className="space-y-2">
                      {(editingProduct.features || []).map((feat, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input type="text" value={feat} onChange={(e) => handleFeatureChange(idx, e.target.value)}
                            placeholder="e.g. 50+ pre-filled client cold templates included"
                            className="flex-1 bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-1.5 outline-none font-semibold text-xs" />
                          <button type="button" onClick={() => handleFeatureRemove(idx)} className="text-red-500 hover:text-red-700 font-black px-2 py-1">Delete</button>
                        </div>
                      ))}
                      {(editingProduct.features || []).length === 0 && (
                        <span className="text-gray-400 italic text-[11px]">No features listed. Click &quot;+ Add Row&quot;</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: PRICING */}
              {activeTab === 'pricing' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[
                      { label: 'Price (INR)', field: 'price', required: true },
                      { label: 'Original Price (INR)', field: 'original_price' },
                      { label: 'USD Price', field: 'international_price' },
                      { label: 'USD Strike Price', field: 'international_actual_price' }
                    ].map(({ label, field, required }) => (
                      <div key={field} className="space-y-1">
                        <label className="text-[10px] text-gray-500 uppercase font-black">{label}</label>
                        <input type="number" value={(editingProduct as any)[field] ?? ''}
                          onChange={(e) => setEditingProduct({ ...editingProduct, [field]: Number(e.target.value) })}
                          className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-2 outline-none font-semibold text-xs"
                          required={required} />
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-500 uppercase font-black">Setup Price (SaaS)</label>
                      <input type="number" value={editingProduct.setup_price ?? ''}
                        onChange={(e) => setEditingProduct({ ...editingProduct, setup_price: e.target.value ? Number(e.target.value) : null })}
                        className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-2 outline-none font-semibold text-xs" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-500 uppercase font-black">Monthly Subscription</label>
                      <input type="number" value={editingProduct.monthly_price ?? ''}
                        onChange={(e) => setEditingProduct({ ...editingProduct, monthly_price: e.target.value ? Number(e.target.value) : null })}
                        className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-2 outline-none font-semibold text-xs" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-500 uppercase font-black">Plan Type</label>
                      <input type="text" value={editingProduct.plan_type || ''}
                        onChange={(e) => setEditingProduct({ ...editingProduct, plan_type: e.target.value })}
                        placeholder="e.g. starter, complete, managed"
                        className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-2 outline-none font-semibold text-xs" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-150">
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-500 uppercase font-black">Sort Rank</label>
                      <input type="number" value={editingProduct.sort_order ?? ''}
                        onChange={(e) => setEditingProduct({ ...editingProduct, sort_order: Number(e.target.value) })}
                        className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-1.5 outline-none font-semibold text-xs" required />
                    </div>
                    <div className="flex items-end pb-2">
                      <label className="flex items-center gap-2 text-xs text-gray-900 font-bold select-none cursor-pointer">
                        <input type="checkbox" checked={editingProduct.is_featured || false}
                          onChange={(e) => setEditingProduct({ ...editingProduct, is_featured: e.target.checked })}
                          className="rounded text-emerald-700 focus:ring-emerald-700" />
                        <span>Feature on Catalog?</span>
                      </label>
                    </div>
                    <div className="flex items-end pb-2">
                      <label className="flex items-center gap-2 text-xs text-gray-900 font-bold select-none cursor-pointer">
                        <input type="checkbox" checked={editingProduct.test_mode || false}
                          onChange={(e) => setEditingProduct({ ...editingProduct, test_mode: e.target.checked })}
                          className="rounded text-emerald-700 focus:ring-emerald-700" />
                        <span>Sandbox Test Mode?</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: MEDIA */}
              {activeTab === 'media' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { label: 'Thumbnail URL', field: 'thumbnail_url', uploadKey: 'thumbnail' },
                      { label: 'Hero Banner URL', field: 'banner_url', uploadKey: 'banner' }
                    ].map(({ label, field, uploadKey }) => (
                      <div key={field} className="space-y-1.5">
                        <label className="text-[10px] text-gray-500 uppercase font-black block">{label}</label>
                        <div className="flex items-center gap-2">
                          <input type="text" value={(editingProduct as any)[field] || ''}
                            onChange={(e) => setEditingProduct({ ...editingProduct, [field]: e.target.value })}
                            placeholder="https://..." className="flex-1 bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-2 outline-none font-semibold text-xs font-mono" />
                          <div className="relative shrink-0">
                            <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, uploadKey)} disabled={uploadingField !== null}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                            <button type="button" className="flex items-center space-x-1 bg-gray-150 hover:bg-gray-200 border border-gray-300 px-3.5 py-2 rounded-lg text-[10px] font-bold">
                              <Upload size={10} /><span>{uploadingField === uploadKey ? '...' : 'Upload'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3 border border-gray-150 p-4 rounded-xl bg-gray-50">
                    <div className="flex justify-between items-center border-b border-gray-200 pb-1.5">
                      <span className="text-[10px] text-gray-700 uppercase font-black">Screenshots & Gallery</span>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {(editingProduct.media || []).map((m, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-white border border-gray-100 rounded-lg p-2 gap-3 text-[10px]">
                          <span className="font-black uppercase text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded text-[8px]">{m.type}</span>
                          <span className="truncate text-gray-500 font-mono flex-1">{m.url}</span>
                          <span className="text-gray-400">Order: {m.sort_order}</span>
                          <button type="button" onClick={() => handleRemoveMediaItem(idx)} className="text-red-600 hover:text-red-800 font-black cursor-pointer px-1">Delete</button>
                        </div>
                      ))}
                      {(editingProduct.media || []).length === 0 && (
                        <span className="text-gray-400 italic text-[11px] block py-1.5 text-center">No screenshots added yet.</span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-gray-200">
                      <select value={newMediaType} onChange={(e) => setNewMediaType(e.target.value)}
                        className="bg-white border border-[#E0E0E0] rounded-lg px-2 py-1 outline-none text-[10px] cursor-pointer">
                        <option value="screenshot">Screenshot</option>
                        <option value="gallery">Gallery Image</option>
                        <option value="video">Demo Video</option>
                        <option value="pdf">PDF Resource</option>
                      </select>
                      <div className="flex-2 min-w-[200px] flex items-center gap-2">
                        <input type="text" value={newMediaUrl} onChange={(e) => setNewMediaUrl(e.target.value)}
                          placeholder="Image URL or upload file"
                          className="flex-1 bg-white border border-[#E0E0E0] rounded-lg px-2 py-1 outline-none text-[10px] font-mono" />
                        <div className="relative shrink-0">
                          <input type="file" onChange={(e) => handleFileUpload(e, 'new_media')} disabled={uploadingField !== null}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                          <button type="button" className="bg-gray-150 hover:bg-gray-200 border border-gray-300 p-1.5 rounded text-[10px]"><Upload size={10} /></button>
                        </div>
                      </div>
                      <input type="number" value={newMediaSort} onChange={(e) => setNewMediaSort(Number(e.target.value))}
                        placeholder="Sort" className="w-16 bg-white border border-[#E0E0E0] rounded-lg px-2 py-1 outline-none text-[10px]" />
                      <button type="button" onClick={handleAddMediaItem}
                        className="bg-emerald-750 hover:bg-emerald-800 text-white text-[10px] font-bold px-3 py-1 rounded-lg shrink-0 cursor-pointer">
                        + Add Asset
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: FAQS & DOWNLOADS */}
              {activeTab === 'faqs_downloads' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-500 uppercase font-black">Notion Template URL</label>
                      <input type="text" value={editingProduct.notion_url || ''} onChange={(e) => setEditingProduct({ ...editingProduct, notion_url: e.target.value })}
                        placeholder="https://notion.so/..."
                        className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-2 outline-none font-semibold text-xs font-mono" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-500 uppercase font-black">Alternative Download URL</label>
                      <input type="text" value={editingProduct.url || ''} onChange={(e) => setEditingProduct({ ...editingProduct, url: e.target.value })}
                        placeholder="https://..."
                        className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-2 outline-none font-semibold text-xs font-mono" />
                    </div>
                  </div>

                  <div className="space-y-3 border border-gray-150 p-4 rounded-xl bg-gray-50">
                    <div className="flex justify-between items-center border-b border-gray-200 pb-1">
                      <label className="text-[10px] text-gray-700 uppercase font-black">Product Downloads</label>
                      <button type="button" onClick={handleAddDownloadItem} className="text-emerald-700 hover:text-emerald-900 font-bold text-[10px]">+ Add Download</button>
                    </div>
                    <div className="space-y-3">
                      {(editingProduct.downloads || []).map((d, idx) => (
                        <div key={idx} className="grid grid-cols-1 sm:grid-cols-[1.5fr_2fr_1fr_auto] gap-3 items-center bg-white border border-gray-100 p-3 rounded-lg">
                          <input type="text" value={d.title} onChange={(e) => handleDownloadChange(idx, 'title', e.target.value)}
                            placeholder="Resource Title" className="bg-gray-50 border border-gray-200 rounded px-2.5 py-1 text-xs" required />
                          <input type="text" value={d.url} onChange={(e) => handleDownloadChange(idx, 'url', e.target.value)}
                            placeholder="File URL" className="bg-gray-50 border border-gray-200 rounded px-2.5 py-1 text-xs font-mono" required />
                          <select value={d.type} onChange={(e) => handleDownloadChange(idx, 'type', e.target.value)}
                            className="bg-gray-50 border border-gray-200 rounded px-2 py-1 text-xs cursor-pointer">
                            <option value="notion_template">Notion Template</option>
                            <option value="zip">ZIP File</option>
                            <option value="pdf">PDF Ebook</option>
                            <option value="video">Video</option>
                          </select>
                          <button type="button" onClick={() => handleRemoveDownloadItem(idx)} className="text-red-500 hover:text-red-700 font-bold px-2">Delete</button>
                        </div>
                      ))}
                      {(editingProduct.downloads || []).length === 0 && (
                        <span className="text-gray-400 italic text-[11px] text-center block py-1.5">No downloads defined.</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 border border-gray-150 p-4 rounded-xl bg-gray-50">
                    <div className="flex justify-between items-center border-b border-gray-200 pb-1">
                      <label className="text-[10px] text-gray-700 uppercase font-black">Product FAQs</label>
                      <button type="button" onClick={handleAddFaqItem} className="text-emerald-700 hover:text-emerald-900 font-bold text-[10px]">+ Add FAQ</button>
                    </div>
                    <div className="space-y-4">
                      {(editingProduct.faqs || []).map((f, idx) => (
                        <div key={idx} className="bg-white border border-gray-150 p-3 rounded-lg space-y-2 relative">
                          <button type="button" onClick={() => handleRemoveFaqItem(idx)} className="absolute top-2 right-2 text-red-500 hover:text-red-700 font-bold">Remove</button>
                          <div className="grid grid-cols-[1fr_80px] gap-3">
                            <input type="text" value={f.question} onChange={(e) => handleFaqChange(idx, 'question', e.target.value)}
                              placeholder="Question / Objection" className="bg-gray-50 border border-gray-200 rounded px-2.5 py-1 text-xs" required />
                            <input type="number" value={f.sort_order} onChange={(e) => handleFaqChange(idx, 'sort_order', Number(e.target.value))}
                              placeholder="Order" className="bg-gray-50 border border-gray-200 rounded px-2 py-1 text-xs" />
                          </div>
                          <textarea value={f.answer} onChange={(e) => handleFaqChange(idx, 'answer', e.target.value)}
                            placeholder="Answer explanation..." className="w-full bg-gray-50 border border-gray-200 rounded px-2.5 py-1 text-xs h-14 resize-none" required />
                        </div>
                      ))}
                      {(editingProduct.faqs || []).length === 0 && (
                        <span className="text-gray-400 italic text-[11px] text-center block py-1.5">No FAQs assigned.</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: MARKETING */}
              {activeTab === 'marketing' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                      { label: 'Live Preview URL', field: 'preview_url', placeholder: 'https://...' },
                      { label: 'Documentation URL', field: 'documentation_url', placeholder: 'https://docs...' },
                      { label: 'GitHub Repository', field: 'github_url', placeholder: 'https://github.com/...' },
                      { label: 'Demo Raw Video URL', field: 'demo_video_url', placeholder: 'https://...' },
                      { label: 'YouTube Embed URL', field: 'youtube_url', placeholder: 'https://youtube.com/embed/...' },
                      { label: 'Loom Recording URL', field: 'loom_url', placeholder: 'https://loom.com/share/...' }
                    ].map(({ label, field, placeholder }) => (
                      <div key={field} className="space-y-1">
                        <label className="text-[10px] text-gray-500 uppercase font-black">{label}</label>
                        <input type="text" value={(editingProduct as any)[field] || ''}
                          onChange={(e) => setEditingProduct({ ...editingProduct, [field]: e.target.value })}
                          placeholder={placeholder}
                          className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-2 outline-none font-semibold text-xs font-mono" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB: LANDING SECTIONS */}
              {activeTab === 'toggles' && (
                <div className="space-y-4">
                  <label className="text-[10px] text-gray-500 uppercase font-black block border-b border-gray-100 pb-1">Landing Page Section Controls</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-150">
                    {Object.keys(editingProduct.section_visibility || {}).map((secKey) => {
                      const typedKey = secKey as keyof typeof editingProduct.section_visibility;
                      const isVisible = !!editingProduct.section_visibility?.[typedKey];
                      return (
                        <label key={secKey} className="flex items-center gap-2 text-xs text-gray-900 font-bold select-none cursor-pointer">
                          <input type="checkbox" checked={isVisible}
                            onChange={(e) => {
                              const visibilityObj = { ...(editingProduct.section_visibility || {}) };
                              (visibilityObj as any)[typedKey] = e.target.checked;
                              setEditingProduct({ ...editingProduct, section_visibility: visibilityObj as any });
                            }}
                            className="rounded text-emerald-700 focus:ring-emerald-700" />
                          <span className="capitalize">{secKey}</span>
                        </label>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-xs text-gray-900 font-bold select-none cursor-pointer">
                        <input type="checkbox" checked={editingProduct.is_combo || false}
                          onChange={(e) => setEditingProduct({ ...editingProduct, is_combo: e.target.checked })}
                          className="rounded text-emerald-700 focus:ring-emerald-700" />
                        <span>Is this a Product Combo/Bundle?</span>
                      </label>
                      {editingProduct.is_combo && (
                        <div className="space-y-1">
                          <label className="text-[10px] text-gray-500 uppercase font-black block">Combo Sub-Product IDs (comma-separated)</label>
                          <input type="text" value={editingProduct.combo_product_ids?.join(', ') || ''}
                            onChange={(e) => setEditingProduct({ ...editingProduct, combo_product_ids: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                            className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-1.5 outline-none font-semibold text-xs" />
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-500 uppercase font-black">Related Product IDs (comma-separated)</label>
                      <input type="text" value={editingProduct.related_product_ids?.join(', ') || ''}
                        onChange={(e) => setEditingProduct({ ...editingProduct, related_product_ids: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                        className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-1.5 outline-none font-semibold text-xs" />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: OFFERS */}
              {activeTab === 'offers' && (
                <div className="space-y-4">
                  <h3 className="text-xs uppercase text-emerald-800 font-black border-b border-gray-100 pb-1 flex items-center gap-1.5">
                    <Tag size={13} /><span>Linked Offer Campaigns</span>
                  </h3>
                  <p className="text-[11px] text-gray-500 font-medium leading-relaxed">Toggle which campaigns include this product. Changes save immediately.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {allOffers.map(o => {
                      const isIncluded = (o.products_included || []).includes(editingProduct.id || '');
                      return (
                        <div key={o.id} className="bg-white border border-gray-150 p-4 rounded-xl flex items-start gap-3 shadow-2xs">
                          <input type="checkbox" checked={isIncluded} onChange={() => handleToggleOfferInclusion(o)}
                            className="rounded text-emerald-700 focus:ring-emerald-700 mt-0.5 cursor-pointer" />
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-gray-900 text-xs">{o.name}</span>
                              <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${o.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                                {o.active ? 'Active' : 'Draft'}
                              </span>
                            </div>
                            <p className="text-[10px] text-gray-500">{o.description || 'No description'}</p>
                            <div className="text-[9px] font-black text-orange-600">
                              Discount: ₹{o.discount_value} OFF &middot; Code: {o.coupon_code || 'None'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {allOffers.length === 0 && (
                      <div className="text-gray-400 italic py-4 col-span-2">No offer campaigns created yet.</div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB: CONTENT BUILDER */}
              {activeTab === 'content_builder' && (
                <div className="space-y-6">

                  {/* Quick Facts */}
                  <div className="space-y-3 border border-gray-150 p-4 rounded-xl bg-gray-50">
                    <div className="flex justify-between items-center border-b border-gray-200 pb-1">
                      <label className="text-[10px] text-gray-700 uppercase font-black">Quick Facts (shown under hero)</label>
                      <button type="button" onClick={() => {
                        const updated = { ...(editingProduct.quick_facts || {}), '': '' };
                        setEditingProduct({ ...editingProduct, quick_facts: updated });
                      }} className="text-emerald-700 hover:text-emerald-900 font-bold text-[10px]">+ Add Fact</button>
                    </div>
                    <p className="text-[10px] text-gray-400 italic">Keys: setup_time, best_for, skill_level, delivery, updates, support, format, platform, language</p>
                    <div className="space-y-2">
                      {Object.entries(editingProduct.quick_facts || {}).map(([k, v], qi) => (
                        <div key={qi} className="flex gap-2 items-center">
                          <input type="text" value={k} placeholder="key (e.g. setup_time)"
                            onChange={(e) => {
                              const facts = { ...(editingProduct.quick_facts || {}) };
                              const val = facts[k]; delete facts[k]; facts[e.target.value] = val;
                              setEditingProduct({ ...editingProduct, quick_facts: facts });
                            }}
                            className="w-36 bg-white border border-gray-200 rounded px-2 py-1 text-[10px] font-mono" />
                          <input type="text" value={String(v)} placeholder="value (e.g. 10 minutes)"
                            onChange={(e) => {
                              const facts = { ...(editingProduct.quick_facts || {}), [k]: e.target.value };
                              setEditingProduct({ ...editingProduct, quick_facts: facts });
                            }}
                            className="flex-1 bg-white border border-gray-200 rounded px-2 py-1 text-[10px]" />
                          <button type="button" onClick={() => {
                            const facts = { ...(editingProduct.quick_facts || {}) }; delete facts[k];
                            setEditingProduct({ ...editingProduct, quick_facts: facts });
                          }} className="text-red-500 font-bold text-[10px] px-1">✕</button>
                        </div>
                      ))}
                      {Object.keys(editingProduct.quick_facts || {}).length === 0 && (
                        <span className="text-gray-400 italic text-[11px]">No facts added yet.</span>
                      )}
                    </div>
                  </div>

                  {/* Review Count */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 uppercase font-black">Customer / Review Count (shown in purchase card)</label>
                    <input type="number" value={editingProduct.review_count ?? ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, review_count: Number(e.target.value) })}
                      placeholder="e.g. 120"
                      className="w-40 bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-2 outline-none font-semibold text-xs" />
                  </div>

                  {/* Page Section Order */}
                  <div className="space-y-2 border border-gray-150 p-4 rounded-xl bg-gray-50">
                    <div className="flex justify-between items-center border-b border-gray-200 pb-1">
                      <label className="text-[10px] text-gray-700 uppercase font-black">Page Section Order (comma-separated)</label>
                    </div>
                    <p className="text-[10px] text-gray-400 italic">Available: hero, quick_facts, problem, inside, how_it_works, features, gallery, video, downloads, faq, related</p>
                    <input type="text"
                      value={(editingProduct.page_sections || []).join(', ')}
                      onChange={(e) => setEditingProduct({ ...editingProduct, page_sections: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                      placeholder="hero, quick_facts, problem, inside, how_it_works, features, gallery, faq, related"
                      className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-2 outline-none font-semibold text-xs" />
                    <p className="text-[10px] text-gray-400">Leave blank to use default order. Sections with no content are auto-hidden.</p>
                  </div>

                  {/* Preview Sections (Inside This Product) Builder */}
                  <div className="space-y-3 border border-gray-150 p-4 rounded-xl bg-gray-50">
                    <div className="flex justify-between items-center border-b border-gray-200 pb-1">
                      <label className="text-[10px] text-gray-700 uppercase font-black">"Inside This Product" Explorer Sections</label>
                      <button type="button" onClick={() => {
                        const sections = [...(editingProduct.preview_sections || []), { title: 'New Section', icon: 'file', items: [] }];
                        setEditingProduct({ ...editingProduct, preview_sections: sections });
                      }} className="text-emerald-700 hover:text-emerald-900 font-bold text-[10px]">+ Add Section</button>
                    </div>
                    <p className="text-[10px] text-gray-400 italic">Icons: sparkles, search, wrench, file, video, book, dashboard, zap, list, code, download, image, metric, timeline, link, callout</p>
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                      {(editingProduct.preview_sections || []).map((sec: any, si: number) => (
                        <div key={si} className="bg-white border border-gray-200 rounded-xl p-3 space-y-3">
                          <div className="flex items-center gap-2">
                            <input type="text" value={sec.title} placeholder="Section title"
                              onChange={(e) => {
                                const ss = [...(editingProduct.preview_sections || [])];
                                ss[si] = { ...ss[si], title: e.target.value };
                                setEditingProduct({ ...editingProduct, preview_sections: ss });
                              }}
                              className="flex-1 bg-gray-50 border border-gray-200 rounded px-2 py-1 text-xs font-bold" />
                            <input type="text" value={sec.icon || ''} placeholder="icon"
                              onChange={(e) => {
                                const ss = [...(editingProduct.preview_sections || [])];
                                ss[si] = { ...ss[si], icon: e.target.value };
                                setEditingProduct({ ...editingProduct, preview_sections: ss });
                              }}
                              className="w-24 bg-gray-50 border border-gray-200 rounded px-2 py-1 text-[10px] font-mono" />
                            <button type="button" onClick={() => {
                              const ss = [...(editingProduct.preview_sections || [])];
                              ss.splice(si, 1);
                              setEditingProduct({ ...editingProduct, preview_sections: ss });
                            }} className="text-red-500 font-black text-[10px] px-1 hover:text-red-700">✕</button>
                          </div>
                          {/* Items */}
                          <div className="space-y-2 pl-2 border-l-2 border-emerald-100">
                            {(sec.items || []).map((item: any, ii: number) => (
                              <div key={ii} className="bg-gray-50 border border-gray-100 rounded-lg p-2 space-y-1.5">
                                <div className="flex items-center gap-2">
                                  <select value={item.type || 'text'}
                                    onChange={(e) => {
                                      const ss = [...(editingProduct.preview_sections || [])];
                                      const items = [...ss[si].items]; items[ii] = { ...items[ii], type: e.target.value };
                                      ss[si] = { ...ss[si], items };
                                      setEditingProduct({ ...editingProduct, preview_sections: ss });
                                    }}
                                    className="bg-white border border-gray-200 rounded px-1.5 py-1 text-[9px] font-bold cursor-pointer">
                                    {['text','prompt','checklist','metric','callout','video','image','gallery','table','timeline','code','download','link','button'].map(t => <option key={t} value={t}>{t}</option>)}
                                  </select>
                                  <input type="text" value={item.title || ''} placeholder="Item title"
                                    onChange={(e) => {
                                      const ss = [...(editingProduct.preview_sections || [])];
                                      const items = [...ss[si].items]; items[ii] = { ...items[ii], title: e.target.value };
                                      ss[si] = { ...ss[si], items };
                                      setEditingProduct({ ...editingProduct, preview_sections: ss });
                                    }}
                                    className="flex-1 bg-white border border-gray-200 rounded px-2 py-1 text-[10px]" />
                                  <button type="button" onClick={() => {
                                    const ss = [...(editingProduct.preview_sections || [])];
                                    const items = [...ss[si].items]; items.splice(ii, 1);
                                    ss[si] = { ...ss[si], items };
                                    setEditingProduct({ ...editingProduct, preview_sections: ss });
                                  }} className="text-red-400 font-black text-[10px] px-1">✕</button>
                                </div>
                                <textarea value={item.description || ''} placeholder="Description / Content"
                                  onChange={(e) => {
                                    const ss = [...(editingProduct.preview_sections || [])];
                                    const items = [...ss[si].items]; items[ii] = { ...items[ii], description: e.target.value };
                                    ss[si] = { ...ss[si], items };
                                    setEditingProduct({ ...editingProduct, preview_sections: ss });
                                  }}
                                  className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-[10px] h-10 resize-none" />
                                {['prompt','code'].includes(item.type || 'text') && (
                                  <textarea value={item.preview || ''} placeholder="Copy text / code content"
                                    onChange={(e) => {
                                      const ss = [...(editingProduct.preview_sections || [])];
                                      const items = [...ss[si].items]; items[ii] = { ...items[ii], preview: e.target.value };
                                      ss[si] = { ...ss[si], items };
                                      setEditingProduct({ ...editingProduct, preview_sections: ss });
                                    }}
                                    className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-[10px] font-mono h-14 resize-none" />
                                )}
                                {['link','download','button','video','image'].includes(item.type || 'text') && (
                                  <input type="text" value={item.url || item.src || ''} placeholder="URL / src"
                                    onChange={(e) => {
                                      const ss = [...(editingProduct.preview_sections || [])];
                                      const items = [...ss[si].items]; items[ii] = { ...items[ii], url: e.target.value, src: e.target.value };
                                      ss[si] = { ...ss[si], items };
                                      setEditingProduct({ ...editingProduct, preview_sections: ss });
                                    }}
                                    className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-[10px] font-mono" />
                                )}
                                {item.type === 'metric' && (
                                  <div className="flex gap-2">
                                    <input type="text" value={item.value || ''} placeholder="Value (e.g. 120)"
                                      onChange={(e) => {
                                        const ss = [...(editingProduct.preview_sections || [])];
                                        const items = [...ss[si].items]; items[ii] = { ...items[ii], value: e.target.value };
                                        ss[si] = { ...ss[si], items };
                                        setEditingProduct({ ...editingProduct, preview_sections: ss });
                                      }}
                                      className="w-28 bg-white border border-gray-200 rounded px-2 py-1 text-[10px]" />
                                    <input type="text" value={item.unit || ''} placeholder="Unit (e.g. %)"
                                      onChange={(e) => {
                                        const ss = [...(editingProduct.preview_sections || [])];
                                        const items = [...ss[si].items]; items[ii] = { ...items[ii], unit: e.target.value };
                                        ss[si] = { ...ss[si], items };
                                        setEditingProduct({ ...editingProduct, preview_sections: ss });
                                      }}
                                      className="w-20 bg-white border border-gray-200 rounded px-2 py-1 text-[10px]" />
                                  </div>
                                )}
                              </div>
                            ))}
                            <button type="button" onClick={() => {
                              const ss = [...(editingProduct.preview_sections || [])];
                              ss[si] = { ...ss[si], items: [...(ss[si].items || []), { title: '', type: 'text', description: '' }] };
                              setEditingProduct({ ...editingProduct, preview_sections: ss });
                            }} className="text-emerald-700 font-bold text-[10px] hover:text-emerald-900">+ Add Item</button>
                          </div>
                        </div>
                      ))}
                      {(editingProduct.preview_sections || []).length === 0 && (
                        <span className="text-gray-400 italic text-[11px] block py-2">No sections yet. Click &quot;+ Add Section&quot;.</span>
                      )}
                    </div>
                  </div>

                </div>
              )}

              {/* TAB: EXPERIENCE & CHECKOUT */}
              {activeTab === 'experience' && (
                <div className="space-y-6">
                  {/* Checkout & CTA Copy */}
                  <div className="space-y-3 border border-gray-150 p-4 rounded-xl bg-gray-50">
                    <label className="text-[10px] text-gray-700 uppercase font-black block border-b border-gray-200 pb-1">
                      Checkout Modal &amp; Call To Action
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] text-gray-500 uppercase font-black">Checkout Modal Title</label>
                        <input type="text" value={editingProduct.checkout_title || ''}
                          onChange={(e) => setEditingProduct({ ...editingProduct, checkout_title: e.target.value })}
                          placeholder="e.g. Almost there! One step to access your purchase."
                          className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-2 outline-none font-semibold text-xs" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-gray-500 uppercase font-black">Custom Primary CTA Text</label>
                        <input type="text" value={editingProduct.custom_cta || editingProduct.cta_text || ''}
                          onChange={(e) => setEditingProduct({ ...editingProduct, custom_cta: e.target.value, cta_text: e.target.value })}
                          placeholder="e.g. Continue to Onboarding →"
                          className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-2 outline-none font-semibold text-xs" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-500 uppercase font-black">Checkout Modal Description</label>
                      <textarea value={editingProduct.checkout_description || ''}
                        onChange={(e) => setEditingProduct({ ...editingProduct, checkout_description: e.target.value })}
                        placeholder="e.g. Complete your payment. Our onboarding team will contact you shortly..."
                        className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-2 outline-none font-semibold text-xs h-16 resize-none" />
                    </div>
                  </div>

                  {/* Delivery & Guarantees */}
                  <div className="space-y-3 border border-gray-150 p-4 rounded-xl bg-gray-50">
                    <label className="text-[10px] text-gray-700 uppercase font-black block border-b border-gray-200 pb-1">
                      Delivery Note &amp; Risk Reversal Guarantees
                    </label>
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-500 uppercase font-black">Delivery Message / Note</label>
                      <input type="text" value={editingProduct.delivery_message || ''}
                        onChange={(e) => setEditingProduct({ ...editingProduct, delivery_message: e.target.value })}
                        placeholder="e.g. Delivered instantly to your email · Lifetime access"
                        className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-2 outline-none font-semibold text-xs" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] text-gray-500 uppercase font-black">Guarantee Title</label>
                        <input type="text" value={editingProduct.guarantee_title || ''}
                          onChange={(e) => setEditingProduct({ ...editingProduct, guarantee_title: e.target.value })}
                          placeholder="e.g. 7-Day Outreach Results Guarantee"
                          className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-2 outline-none font-semibold text-xs" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-gray-500 uppercase font-black">Guarantee Badge Label</label>
                        <input type="text" value={editingProduct.guarantee_badge || ''}
                          onChange={(e) => setEditingProduct({ ...editingProduct, guarantee_badge: e.target.value })}
                          placeholder="e.g. 7-Day Results Guarantee"
                          className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-2 outline-none font-semibold text-xs" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-gray-500 uppercase font-black">Social Proof Badge Label</label>
                        <input type="text" value={editingProduct.social_proof_badge || ''}
                          onChange={(e) => setEditingProduct({ ...editingProduct, social_proof_badge: e.target.value })}
                          placeholder="e.g. Instant Digital Access"
                          className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-2 outline-none font-semibold text-xs" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-500 uppercase font-black">Guarantee Full Description</label>
                      <textarea value={editingProduct.guarantee_description || ''}
                        onChange={(e) => setEditingProduct({ ...editingProduct, guarantee_description: e.target.value })}
                        placeholder="Use it for 7 days. If you don't get results, we'll personally assist or issue a 100% refund..."
                        className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-2 outline-none font-semibold text-xs h-16 resize-none" />
                    </div>
                  </div>

                  {/* Email Confirmation Overrides */}
                  <div className="space-y-3 border border-gray-150 p-4 rounded-xl bg-gray-50">
                    <label className="text-[10px] text-gray-700 uppercase font-black block border-b border-gray-200 pb-1">
                      Confirmation Email Customization
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] text-gray-500 uppercase font-black">Email Subject Line</label>
                        <input type="text" value={editingProduct.email_subject || ''}
                          onChange={(e) => setEditingProduct({ ...editingProduct, email_subject: e.target.value })}
                          placeholder="e.g. Your ScaleCraft Product Access & Receipt"
                          className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-2 outline-none font-semibold text-xs" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-gray-500 uppercase font-black">Email Headline Banner</label>
                        <input type="text" value={editingProduct.email_headline || ''}
                          onChange={(e) => setEditingProduct({ ...editingProduct, email_headline: e.target.value })}
                          placeholder="e.g. Your Digital System is Ready!"
                          className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-2 outline-none font-semibold text-xs" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-gray-500 uppercase font-black">Email Action Button Label</label>
                        <input type="text" value={editingProduct.email_action_label || ''}
                          onChange={(e) => setEditingProduct({ ...editingProduct, email_action_label: e.target.value })}
                          placeholder="e.g. Access Digital Resource"
                          className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-2 outline-none font-semibold text-xs" />
                      </div>
                    </div>
                  </div>

                  {/* Trust Badges */}
                  <div className="space-y-3 border border-gray-150 p-4 rounded-xl bg-gray-50">
                    <div className="flex justify-between items-center border-b border-gray-200 pb-1">
                      <label className="text-[10px] text-gray-700 uppercase font-black">Trust Badges (Card &amp; Checkout)</label>
                      <button type="button" onClick={() => {
                        const badges = [...(editingProduct.trust_badges || []), { label: 'New Trust Badge', icon: 'zap' }];
                        setEditingProduct({ ...editingProduct, trust_badges: badges });
                      }} className="text-emerald-700 hover:text-emerald-900 font-bold text-[10px]">+ Add Badge</button>
                    </div>
                    <p className="text-[10px] text-gray-400 italic">Icons: zap, refresh, lock, shield, users, server, headphones, check, layers, activity, award</p>
                    <div className="space-y-2">
                      {(editingProduct.trust_badges || []).map((tb: any, tbi: number) => (
                        <div key={tbi} className="flex gap-2 items-center">
                          <input type="text" value={tb.label} placeholder="Badge Label"
                            onChange={(e) => {
                              const badges = [...(editingProduct.trust_badges || [])];
                              badges[tbi] = { ...badges[tbi], label: e.target.value };
                              setEditingProduct({ ...editingProduct, trust_badges: badges });
                            }}
                            className="flex-1 bg-white border border-gray-200 rounded px-2.5 py-1 text-xs font-semibold" />
                          <select value={tb.icon || 'zap'}
                            onChange={(e) => {
                              const badges = [...(editingProduct.trust_badges || [])];
                              badges[tbi] = { ...badges[tbi], icon: e.target.value };
                              setEditingProduct({ ...editingProduct, trust_badges: badges });
                            }}
                            className="bg-white border border-gray-200 rounded px-2 py-1 text-[10px] font-mono cursor-pointer">
                            {['zap', 'refresh', 'lock', 'shield', 'users', 'server', 'headphones', 'check', 'layers', 'activity', 'award'].map(ic => <option key={ic} value={ic}>{ic}</option>)}
                          </select>
                          <button type="button" onClick={() => {
                            const badges = [...(editingProduct.trust_badges || [])];
                            badges.splice(tbi, 1);
                            setEditingProduct({ ...editingProduct, trust_badges: badges });
                          }} className="text-red-500 font-bold text-[10px] px-1 hover:text-red-700">✕</button>
                        </div>
                      ))}
                      {(editingProduct.trust_badges || []).length === 0 && (
                        <span className="text-gray-400 italic text-[11px]">Default product type trust badges will be rendered.</span>
                      )}
                    </div>
                  </div>

                  {/* How It Works Steps */}
                  <div className="space-y-3 border border-gray-150 p-4 rounded-xl bg-gray-50">
                    <div className="flex justify-between items-center border-b border-gray-200 pb-1">
                      <label className="text-[10px] text-gray-700 uppercase font-black">"How It Works" Steps Builder</label>
                      <button type="button" onClick={() => {
                        const steps = [...(editingProduct.how_it_works_steps || []), { number: (editingProduct.how_it_works_steps?.length || 0) + 1, title: 'New Step', desc: '' }];
                        setEditingProduct({ ...editingProduct, how_it_works_steps: steps });
                      }} className="text-emerald-700 hover:text-emerald-900 font-bold text-[10px]">+ Add Step</button>
                    </div>
                    <div className="space-y-3">
                      {(editingProduct.how_it_works_steps || []).map((st: any, sti: number) => (
                        <div key={sti} className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center shrink-0">{sti + 1}</span>
                            <input type="text" value={st.title} placeholder="Step Title"
                              onChange={(e) => {
                                const steps = [...(editingProduct.how_it_works_steps || [])];
                                steps[sti] = { ...steps[sti], title: e.target.value };
                                setEditingProduct({ ...editingProduct, how_it_works_steps: steps });
                              }}
                              className="flex-1 bg-gray-50 border border-gray-200 rounded px-2.5 py-1 text-xs font-bold" />
                            <button type="button" onClick={() => {
                              const steps = [...(editingProduct.how_it_works_steps || [])];
                              steps.splice(sti, 1);
                              setEditingProduct({ ...editingProduct, how_it_works_steps: steps });
                            }} className="text-red-500 font-bold text-[10px] px-1 hover:text-red-700">✕</button>
                          </div>
                          <textarea value={st.desc} placeholder="Step Description..."
                            onChange={(e) => {
                              const steps = [...(editingProduct.how_it_works_steps || [])];
                              steps[sti] = { ...steps[sti], desc: e.target.value };
                              setEditingProduct({ ...editingProduct, how_it_works_steps: steps });
                            }}
                            className="w-full bg-gray-50 border border-gray-200 rounded px-2.5 py-1 text-xs h-12 resize-none" />
                        </div>
                      ))}
                      {(editingProduct.how_it_works_steps || []).length === 0 && (
                        <span className="text-gray-400 italic text-[11px]">Default product type steps will be rendered.</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: SEO & INDEXING */}
              {activeTab === 'seo' && (
                <div className="space-y-6">
                  <div className="space-y-3 border border-gray-150 p-4 rounded-xl bg-gray-50">
                    <label className="text-[10px] text-gray-700 uppercase font-black block border-b border-gray-200 pb-1">
                      Meta Tags &amp; Search Engine Optimization
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] text-gray-500 uppercase font-black">Meta Title</label>
                        <input type="text" value={editingProduct.meta_title || ''}
                          onChange={(e) => setEditingProduct({ ...editingProduct, meta_title: e.target.value })}
                          placeholder="e.g. ScaleCraft Agent | AI Client Pipeline System"
                          className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-2 outline-none font-semibold text-xs" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-gray-500 uppercase font-black">Target Focus Keyword</label>
                        <input type="text" value={editingProduct.focus_keyword || ''}
                          onChange={(e) => setEditingProduct({ ...editingProduct, focus_keyword: e.target.value })}
                          placeholder="e.g. notion crm template for agency"
                          className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-2 outline-none font-semibold text-xs" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-500 uppercase font-black">Meta Description</label>
                      <textarea value={editingProduct.meta_description || ''}
                        onChange={(e) => setEditingProduct({ ...editingProduct, meta_description: e.target.value })}
                        placeholder="SEO-friendly meta description for web crawlers..."
                        className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-2 outline-none font-semibold text-xs h-20 resize-none" />
                    </div>
                  </div>

                  <div className="space-y-3 border border-gray-150 p-4 rounded-xl bg-gray-50">
                    <label className="text-[10px] text-gray-700 uppercase font-black block border-b border-gray-200 pb-1">
                      Social Sharing &amp; Canonicals
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] text-gray-500 uppercase font-black">Canonical URL Override</label>
                        <input type="text" value={editingProduct.canonical || ''}
                          onChange={(e) => setEditingProduct({ ...editingProduct, canonical: e.target.value })}
                          placeholder="https://thescalecraft.in/products/..."
                          className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-2 outline-none font-semibold text-xs font-mono" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-gray-500 uppercase font-black">OpenGraph Image URL</label>
                        <input type="text" value={editingProduct.og_image || ''}
                          onChange={(e) => setEditingProduct({ ...editingProduct, og_image: e.target.value })}
                          placeholder="https://thescalecraft.in/og-image.jpg"
                          className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-2 outline-none font-semibold text-xs font-mono" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 border border-gray-150 p-4 rounded-xl bg-gray-50">
                    <label className="text-[10px] text-gray-700 uppercase font-black block border-b border-gray-200 pb-1">
                      Robots &amp; Sitemap Configuration
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] text-gray-500 uppercase font-black">Robots Meta Directive</label>
                        <select value={editingProduct.robots_meta || 'index, follow'}
                          onChange={(e) => setEditingProduct({ ...editingProduct, robots_meta: e.target.value })}
                          className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-2 outline-none font-semibold text-xs cursor-pointer">
                          <option value="index, follow">index, follow (Default)</option>
                          <option value="noindex, follow">noindex, follow</option>
                          <option value="noindex, nofollow">noindex, nofollow</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-gray-500 uppercase font-black">Sitemap Priority (0.1 - 1.0)</label>
                        <input type="number" step="0.1" min="0.1" max="1.0"
                          value={editingProduct.sitemap_priority ?? 0.8}
                          onChange={(e) => setEditingProduct({ ...editingProduct, sitemap_priority: Number(e.target.value) })}
                          className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-2 outline-none font-semibold text-xs" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-gray-500 uppercase font-black">Sitemap Change Frequency</label>
                        <select value={editingProduct.sitemap_changefreq || 'weekly'}
                          onChange={(e) => setEditingProduct({ ...editingProduct, sitemap_changefreq: e.target.value })}
                          className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-2 outline-none font-semibold text-xs cursor-pointer">
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1 pt-2">
                      <label className="text-[10px] text-gray-500 uppercase font-black">301/308 Redirect URLs (Comma-Separated)</label>
                      <input type="text"
                        value={Array.isArray(editingProduct.redirect_urls) ? editingProduct.redirect_urls.join(', ') : (editingProduct.redirect_urls || '')}
                        onChange={(e) => setEditingProduct({ ...editingProduct, redirect_urls: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                        placeholder="e.g. /products/old-slug, /v1/product-link"
                        className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-2 outline-none font-semibold text-xs font-mono" />
                    </div>
                  </div>

                  <div className="space-y-2 border border-gray-150 p-4 rounded-xl bg-gray-50">
                    <label className="text-[10px] text-gray-700 uppercase font-black block border-b border-gray-200 pb-1">
                      Custom Schema Override (JSON-LD)
                    </label>
                    <textarea value={editingProduct.schema_override || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, schema_override: e.target.value })}
                      placeholder='{"@context": "https://schema.org", "@type": "Product", ...}'
                      className="w-full bg-white border border-[#E0E0E0] focus:border-[#212121] rounded-lg px-3 py-2 outline-none font-mono text-[11px] h-28 resize-y" />
                    <p className="text-[10px] text-gray-400">Leave blank to use automatic dynamic Schema Generator.</p>
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="border-t border-gray-150 pt-4 flex justify-between items-center shrink-0">
                <div className="flex gap-2">
                  <button type="button" onClick={() => handleSaveWithStatus('draft')}
                    className="bg-white border border-gray-350 hover:bg-[#F8FBF8] text-gray-700 text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-2xs cursor-pointer">
                    Save Draft
                  </button>
                  {editingProduct.status === 'published' ? (
                    <button type="button" onClick={() => handleSaveWithStatus('draft')}
                      className="bg-yellow-50 border border-yellow-150 hover:bg-yellow-100 text-yellow-800 text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-2xs cursor-pointer">
                      Unpublish
                    </button>
                  ) : (
                    <button type="button" onClick={() => handleSaveWithStatus('published')}
                      className="bg-emerald-50 border border-emerald-150 hover:bg-emerald-100 text-emerald-800 text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-2xs cursor-pointer">
                      Publish
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={handleCloseModal}
                    className="bg-white border border-gray-300 hover:bg-[#F8FBF8] text-gray-700 text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-2xs cursor-pointer">
                    Cancel
                  </button>
                  <button type="submit"
                    className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-5 py-2 rounded-xl transition-all shadow-2xs cursor-pointer">
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
