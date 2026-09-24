'use client';

import React, { useEffect, useState } from 'react';
import { SkeletonBlock } from '@/components/ui/PageLoader';

import {
  Package,
  Plus,
  Edit2,
  Trash2,
  Save,
  CheckCircle,
  AlertTriangle,
  Info,
  X,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Download,
  Upload,
  Database,
  RefreshCw,
  FileSpreadsheet,
  ExternalLink,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  image?: string;
  image_url?: string;
  images?: string[];
  active: boolean;
  url?: string;
  content?: string; // What's Inside - modules, FAQs, bonuses, who it's for
  demo_url?: string;
  demo_type?: string;
  support_notes?: string;
  not_included?: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Editing state
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formImage, setFormImage] = useState('');
  const [formImages, setFormImages] = useState<string[]>([]);
  const [formUrl, setFormUrl] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [formDemoUrl, setFormDemoUrl] = useState('');
  const [formDemoType, setFormDemoType] = useState('Video');
  const [formSupportNotes, setFormSupportNotes] = useState('');
  const [formNotIncluded, setFormNotIncluded] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  const moveImage = (index: number, direction: 'left' | 'right') => {
    const newImages = [...formImages];
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newImages.length) {
      const temp = newImages[index];
      newImages[index] = newImages[targetIndex];
      newImages[targetIndex] = temp;
      setFormImages(newImages);
    }
  };

  const removeImage = (index: number) => {
    setFormImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddImageUrl = () => {
    if (formImage.trim()) {
      setFormImages((prev) => [...prev, formImage.trim()]);
      setFormImage('');
    }
  };

  // Restart sequence state
  const [saving, setSaving] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // CSV Import state
  const [isCSVModalOpen, setIsCSVModalOpen] = useState(false);
  const [csvPreviewProducts, setCsvPreviewProducts] = useState<Product[]>([]);
  const [csvFileName, setCsvFileName] = useState('');

  // Shopify Import state
  const [isShopifyModalOpen, setIsShopifyModalOpen] = useState(false);
  const [shopifyStoreUrl, setShopifyStoreUrl] = useState('');
  const [shopifyApiKey, setShopifyApiKey] = useState('');
  const [shopifyPreviewProducts, setShopifyPreviewProducts] = useState<Product[]>([]);
  const [shopifyLoading, setShopifyLoading] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/dashboard/products');
      if (!res.ok) {
        throw new Error('Failed to load products database from server.');
      }
      const data = await res.json();
      setProducts(data);
    } catch (err: any) {
      setError(err.message || 'Error fetching products.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const openAddPanel = () => {
    setEditingProduct(null);
    setFormName('');
    setFormDescription('');
    setFormPrice('');
    setFormImage('');
    setFormImages([]);
    setFormUrl('');
    setFormContent('');
    setFormActive(true);
    setFormDemoUrl('');
    setFormDemoType('Video');
    setFormSupportNotes('');
    setFormNotIncluded('');
    setIsPanelOpen(true);
  };

  const openEditPanel = (product: Product) => {
    setEditingProduct(product);
    setFormName(product.name);
    setFormDescription(product.description);
    setFormPrice(product.price.toString());
    setFormImage('');
    setFormImages(product.images || (product.image || product.image_url ? [product.image || product.image_url!] : []).filter(Boolean));
    setFormUrl(product.url || '');
    setFormContent(product.content || '');
    setFormActive(product.active);
    setFormDemoUrl(product.demo_url || '');
    setFormDemoType(product.demo_type || 'Video');
    setFormSupportNotes(product.support_notes || '');
    setFormNotIncluded(product.not_included || '');
    setIsPanelOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    setError('');

    const newUrls: string[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/dashboard/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to upload image.');
        }
        newUrls.push(data.url);
      }
      setFormImages((prev) => [...prev, ...newUrls]);
    } catch (err: any) {
      alert(err.message || 'Error uploading image.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPrice.trim()) {
      alert('Product Name and Price are required.');
      return;
    }

    const priceNum = parseFloat(formPrice);
    if (isNaN(priceNum)) {
      alert('Price must be a valid number.');
      return;
    }

    let updatedList: Product[];

    if (editingProduct) {
      updatedList = products.map((p) =>
        p.id === editingProduct.id
          ? {
            ...p,
            name: formName.trim(),
            description: formDescription.trim(),
            price: priceNum,
            image: formImages[0] || '',
            image_url: formImages[0] || '',
            images: formImages,
            url: formUrl.trim(),
            content: formContent.trim() || undefined,
            active: formActive,
            demo_url: formDemoUrl.trim() || '',
            demo_type: formDemoType,
            support_notes: formSupportNotes.trim() || '',
            not_included: formNotIncluded.trim() || '',
          }
          : p
      );
    } else {
      const newProduct: Product = {
        id: Date.now().toString(),
        name: formName.trim(),
        description: formDescription.trim(),
        price: priceNum,
        image: formImages[0] || '',
        image_url: formImages[0] || '',
        images: formImages,
        url: formUrl.trim(),
        content: formContent.trim() || undefined,
        active: formActive,
        demo_url: formDemoUrl.trim() || '',
        demo_type: formDemoType,
        support_notes: formSupportNotes.trim() || '',
        not_included: formNotIncluded.trim() || '',
      };
      updatedList = [...products, newProduct];
    }

    setProducts(updatedList);
    setIsPanelOpen(false);
    // Auto-save to Supabase + VPS immediately on every add/edit
    handleSaveToAgentForList(updatedList);
  };

  const handleDeleteProduct = (id: string) => {
    if (confirm('Are you sure you want to delete this product from the catalog?')) {
      const filtered = products.filter((p) => p.id !== id);
      setProducts(filtered);
    }
  };

  const handleSaveToAgent = async () => {
    await handleSaveToAgentForList(products);
  };

  const handleSaveToAgentForList = async (updatedList: Product[]) => {
    setSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/dashboard/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: updatedList }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save product list to remote agent.');
      }

      setSuccessMessage('Products updated! Rebuilding agent prompts...');

      setCountdown(10);
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setSaving(false);
            setSuccessMessage('Agent restarted and prompt updated successfully!');
            setTimeout(() => setSuccessMessage(''), 5000);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Error synchronizing products.');
      setSaving(false);
    }
  };

  // CSV actions
  const handleDownloadCSVTemplate = () => {
    const headers = 'name,price,description,category,image_url,active,url\n';
    const row1 = 'BeatBox Nova,1199,Rugged portable Bluetooth speaker engineered to deliver rich sound.,Speakers,https://cdn.sanity.io/images/73xk02vb/production/af98e975f3c9fefbb65093fd0d8279ad5d311fa6-1254x1254.png,true,https://example.com/beatbox\n';
    const row2 = 'PowerBuds Pro,2499,Active noise cancelling wireless earbuds with deep bass.,Audio,https://example.com/powerbuds.png,true,https://example.com/powerbuds\n';
    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(headers + row1 + row2);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', csvContent);
    downloadAnchor.setAttribute('download', 'scalecraft_products_template.csv');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split('\n').filter((l) => l.trim());
      if (lines.length < 2) {
        alert('Invalid CSV format. Header and at least one row are required.');
        return;
      }

      const parseCSVLine = (line: string) => {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"' || char === "'") {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      };

      const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase());
      const required = ['name', 'price', 'description'];
      const missing = required.filter((r) => !headers.includes(r));
      if (missing.length > 0) {
        alert(`Missing required columns: ${missing.join(', ')}`);
        return;
      }

      const parsed: Product[] = [];
      for (let i = 1; i < lines.length; i++) {
        const row = parseCSVLine(lines[i]);
        if (row.length < headers.length) continue;

        const name = row[headers.indexOf('name')] || '';
        const priceStr = row[headers.indexOf('price')] || '0';
        const price = parseFloat(priceStr);
        const description = row[headers.indexOf('description')] || '';
        const image = headers.includes('image_url') ? row[headers.indexOf('image_url')] : '';
        const activeStr = headers.includes('active') ? row[headers.indexOf('active')].toLowerCase() : 'true';
        const active = activeStr === 'true' || activeStr === '1';
        const url = headers.includes('url') ? row[headers.indexOf('url')] : (headers.includes('product_url') ? row[headers.indexOf('product_url')] : '');

        if (!name) continue;

        parsed.push({
          id: (Date.now() + i).toString(),
          name,
          price: isNaN(price) ? 0 : price,
          description,
          image: image || undefined,
          image_url: image || undefined,
          images: image ? [image] : [],
          active,
          url: url || undefined,
          support_notes: '',
          not_included: '',
        });
      }

      if (parsed.length === 0) {
        alert('No valid products found in CSV.');
        return;
      }

      setCsvPreviewProducts(parsed);
    };
    reader.readAsText(file);
  };

  const handleConfirmCSVImport = () => {
    if (products.length + csvPreviewProducts.length > 20) {
      alert('Total product count cannot exceed the limit of 20 products.');
      return;
    }
    const merged = [...products, ...csvPreviewProducts];
    setProducts(merged);
    setIsCSVModalOpen(false);
    setCsvPreviewProducts([]);
    setCsvFileName('');
    setTimeout(() => handleSaveToAgentForList(merged), 300);
  };

  // Shopify actions
  const handleFetchShopifyProducts = async () => {
    if (!shopifyStoreUrl || !shopifyApiKey) {
      alert('Please fill in both the Shopify Store URL and Admin API Key.');
      return;
    }
    setShopifyLoading(true);
    setShopifyPreviewProducts([]);
    try {
      const res = await fetch('/api/dashboard/products/shopify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopifyStoreUrl, shopifyApiKey }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch Shopify products.');
      }
      setShopifyPreviewProducts(data);
    } catch (err: any) {
      alert(err.message || 'Error fetching Shopify products.');
    } finally {
      setShopifyLoading(false);
    }
  };

  const handleConfirmShopifyImport = async () => {
    if (shopifyPreviewProducts.length === 0) return;
    if (shopifyPreviewProducts.length > 20) {
      alert('Only the first 20 products will be imported due to agent capacity limits.');
    }

    const productsToImport = shopifyPreviewProducts.slice(0, 20);

    setSaving(true);
    setError('');
    setSuccessMessage('');
    setIsShopifyModalOpen(false);

    try {
      const res = await fetch('/api/dashboard/products/shopify/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopifyStoreUrl,
          shopifyApiKey,
          products: productsToImport,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save Shopify config and products.');
      }

      setProducts(productsToImport);
      setSuccessMessage('Shopify integration configured! Rebuilding prompts...');
      setCountdown(10);
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setSaving(false);
            setSuccessMessage('Shopify products sync completed and daily task scheduled!');
            setTimeout(() => setSuccessMessage(''), 5000);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Error configuring Shopify integration.');
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between space-y-4 xl:space-y-0">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
            Products Catalog
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your catalog. The agent uses this list to answer buyers about prices, inventory, and details.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsCSVModalOpen(true)}
            disabled={saving || loading}
            className="flex items-center space-x-1.5 border border-gray-300 hover:bg-gray-50 text-gray-700 bg-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50 h-9"
          >
            <FileSpreadsheet size={15} />
            <span>CSV Import</span>
          </button>

          <button
            onClick={() => setIsShopifyModalOpen(true)}
            disabled={saving || loading}
            className="flex items-center space-x-1.5 border border-gray-300 hover:bg-gray-50 text-gray-700 bg-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50 h-9"
          >
            <Database size={15} />
            <span>Shopify Import</span>
          </button>

          <button
            onClick={openAddPanel}
            disabled={saving || loading || products.length >= 20}
            className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50 h-9"
          >
            <Plus size={15} />
            <span>Add Product</span>
          </button>

          <button
            onClick={handleSaveToAgent}
            disabled={saving || loading}
            className="flex items-center space-x-1.5 bg-white border border-gray-300 hover:bg-gray-55 text-gray-700 text-xs font-semibold px-4.5 py-2.5 rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50 h-9"
          >
            <Save size={15} />
            <span>Save & Restart Agent</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-800 text-xs font-semibold p-4 rounded-xl flex items-center space-x-2">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 border border-green-100 text-green-800 text-xs font-semibold p-4 rounded-xl flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle size={16} />
            <span>{successMessage}</span>
          </div>
          {countdown > 0 && (
            <span className="bg-green-600 text-white px-2 py-0.5 rounded font-bold font-mono">
              {countdown}s
            </span>
          )}
        </div>
      )}

      {/* Info card */}
      <div className="flex items-start gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg text-[12px] text-gray-500 mb-4">
        <Info size={14} className="shrink-0 mt-0.5 text-gray-400" />
        <p>
          <strong className="text-gray-600">Note:</strong> Changes to products are not live until saved to the agent. CSV imports automatically trigger prompt rebuild and agent restart. Shopify imports configure a cron job to sync your store automatically every 24 hours. Max limit: 20 products.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <SkeletonBlock className="h-28 w-full rounded-none" />
              <div className="p-5 space-y-3">
                <div className="flex justify-between">
                  <SkeletonBlock className="h-4 w-32" />
                  <SkeletonBlock className="h-4 w-14" />
                </div>
                <SkeletonBlock className="h-3 w-full" />
                <SkeletonBlock className="h-3 w-3/4" />
              </div>
              <div className="px-5 pb-5 pt-3 border-t border-gray-100 flex justify-between">
                <SkeletonBlock className="h-5 w-14 rounded-full" />
                <SkeletonBlock className="h-7 w-16 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-2xs">
          <Package className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-base font-semibold text-gray-900">No Products Registered</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            Your catalog is currently empty. Add products manually, import from CSV, or link a Shopify store to populate your catalog.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onEdit={openEditPanel}
              onDelete={handleDeleteProduct}
            />
          ))}
        </div>
      )}

      {/* CSV Import Modal */}
      {isCSVModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-gray-200 animate-scale-in">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">Import Products via CSV</h3>
                <p className="text-xs text-gray-500 mt-0.5">Upload a CSV file containing your product catalog database.</p>
              </div>
              <button
                onClick={() => {
                  setIsCSVModalOpen(false);
                  setCsvPreviewProducts([]);
                  setCsvFileName('');
                }}
                className="p-1.5 hover:bg-gray-100 text-gray-500 rounded-lg cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-50 border border-gray-100 p-4 rounded-xl gap-4">
                <div>
                  <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wide">1. Download Template File</h4>
                  <p className="text-xs text-gray-500 mt-1">Get the blank formatted sheet with correct column structure.</p>
                </div>
                <button
                  onClick={handleDownloadCSVTemplate}
                  className="flex items-center space-x-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 text-xs font-semibold px-4 py-2.5 rounded-lg cursor-pointer transition-colors shadow-2xs h-9"
                >
                  <Download size={14} />
                  <span>Download Template</span>
                </button>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wide">2. Upload Filled CSV</h4>
                <label className="border-2 border-dashed border-gray-200 hover:border-blue-500 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer bg-gray-50/50 transition-colors">
                  <Upload size={32} className="text-blue-600 mb-2" />
                  <span className="text-sm font-semibold text-gray-900">{csvFileName || 'Choose CSV File'}</span>
                  <span className="text-xs text-gray-500 mt-1">or drag and drop here</span>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCSVUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {csvPreviewProducts.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wide">3. Preview Mapped Products ({csvPreviewProducts.length})</h4>
                  <div className="border border-gray-200 rounded-xl overflow-hidden overflow-x-auto max-h-60">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 font-semibold text-gray-700 uppercase tracking-wider h-10">
                          <th className="p-3">Product</th>
                          <th className="p-3">Price</th>
                          <th className="p-3">Description</th>
                          <th className="p-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {csvPreviewProducts.map((p, idx) => (
                          <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50/50 h-12">
                            <td className="p-3 font-semibold text-gray-950 flex items-center space-x-2">
                              {p.image && <img src={p.image} className="w-6 h-6 object-cover rounded" />}
                              <span>{p.name}</span>
                            </td>
                            <td className="p-3 font-semibold text-blue-600">₹{p.price}</td>
                            <td className="p-3 text-gray-500 max-w-[200px] truncate">{p.description}</td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${p.active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                {p.active ? 'Active' : 'Disabled'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end space-x-3 bg-gray-50">
              <button
                type="button"
                onClick={() => {
                  setIsCSVModalOpen(false);
                  setCsvPreviewProducts([]);
                  setCsvFileName('');
                }}
                className="border border-gray-300 hover:bg-white text-xs font-semibold px-4 py-2.5 rounded-lg cursor-pointer bg-white text-gray-700 h-9"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCSVImport}
                disabled={csvPreviewProducts.length === 0}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2.5 rounded-lg cursor-pointer transition-colors shadow-2xs h-9"
              >
                Confirm Import & Update Agent
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shopify Import Modal */}
      {isShopifyModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-gray-200 animate-scale-in">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">Link Shopify Catalog</h3>
                <p className="text-xs text-gray-500 mt-0.5">Integrate your Shopify store products directly and enable daily automatic sync.</p>
              </div>
              <button
                onClick={() => {
                  setIsShopifyModalOpen(false);
                  setShopifyPreviewProducts([]);
                }}
                className="p-1.5 hover:bg-gray-100 text-gray-500 rounded-lg cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Shopify Store Domain *
                  </label>
                  <input
                    type="text"
                    value={shopifyStoreUrl}
                    onChange={(e) => setShopifyStoreUrl(e.target.value)}
                    placeholder="e.g. mystore.myshopify.com"
                    className="w-full text-sm border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-600 bg-gray-50/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Admin Access Token *
                  </label>
                  <input
                    type="password"
                    value={shopifyApiKey}
                    onChange={(e) => setShopifyApiKey(e.target.value)}
                    placeholder="shpat_xxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full text-sm border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-600 bg-gray-50/50"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleFetchShopifyProducts}
                  disabled={shopifyLoading || !shopifyStoreUrl || !shopifyApiKey}
                  className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2.5 rounded-lg cursor-pointer transition-colors shadow-2xs h-9"
                >
                  {shopifyLoading ? (
                    <>
                      <Loader2 className="animate-spin" size={14} />
                      <span>Fetching Products...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw size={14} />
                      <span>Fetch Products Preview</span>
                    </>
                  )}
                </button>
              </div>

              {shopifyPreviewProducts.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wide">Products Preview ({shopifyPreviewProducts.length})</h4>
                  <div className="border border-gray-200 rounded-xl overflow-hidden overflow-x-auto max-h-60">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 font-semibold text-gray-750 uppercase tracking-wider h-10">
                          <th className="p-3">Product</th>
                          <th className="p-3">Price</th>
                          <th className="p-3">Description</th>
                          <th className="p-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {shopifyPreviewProducts.map((p, idx) => (
                          <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50/50 h-12">
                            <td className="p-3 font-semibold text-gray-905 flex items-center space-x-2">
                              {p.image && <img src={p.image} className="w-6 h-6 object-cover rounded" />}
                              <span>{p.name}</span>
                            </td>
                            <td className="p-3 font-semibold text-blue-600">₹{p.price}</td>
                            <td className="p-3 text-gray-500 max-w-[200px] truncate">{p.description}</td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${p.active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                {p.active ? 'Active' : 'Disabled'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end space-x-3 bg-gray-50">
              <button
                type="button"
                onClick={() => {
                  setIsShopifyModalOpen(false);
                  setShopifyPreviewProducts([]);
                }}
                className="border border-gray-300 hover:bg-white text-xs font-semibold px-4 py-2.5 rounded-lg cursor-pointer bg-white text-gray-700 h-9"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmShopifyImport}
                disabled={shopifyPreviewProducts.length === 0}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2.5 rounded-lg cursor-pointer transition-colors shadow-2xs h-9"
              >
                Confirm Import & Enable 24h Sync
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slide-over Form Panel Modal */}
      {isPanelOpen && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-end z-50 animate-fadeIn">
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col justify-between border-l border-gray-200 animate-slideInRight">
            {/* Panel Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">
                {editingProduct ? 'Edit Catalog Product' : 'Add Catalog Product'}
              </h3>
              <button
                onClick={() => setIsPanelOpen(false)}
                className="p-1 hover:bg-gray-100 text-gray-500 rounded-lg cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Panel Body Form */}
            <form onSubmit={handleFormSubmit} id="product-form" className="p-6 overflow-y-auto space-y-5 flex-1">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Heart Keychain"
                  className="w-full text-sm border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-600 bg-gray-50/50"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Price (INR) *
                </label>
                <input
                  type="number"
                  required
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  placeholder="199"
                  className="w-full text-sm border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-600 bg-gray-50/50"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Product Images
                </label>
                {formImages.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 py-2">
                    {formImages.map((imgUrl, index) => (
                      <div
                        key={index}
                        className="relative w-full aspect-square rounded-lg border border-gray-200 overflow-hidden bg-gray-50 flex flex-col items-center justify-between group"
                      >
                        <img
                          src={imgUrl}
                          alt={`Preview ${index + 1}`}
                          className="object-cover w-full h-full"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-black/60 flex items-center justify-between px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => moveImage(index, 'left')}
                            className="text-white hover:text-blue-400 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                          >
                            <ChevronLeft size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="text-white hover:text-red-400 cursor-pointer"
                          >
                            <Trash2 size={12} />
                          </button>
                          <button
                            type="button"
                            disabled={index === formImages.length - 1}
                            onClick={() => moveImage(index, 'right')}
                            className="text-white hover:text-blue-400 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                          >
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={formImage}
                    onChange={(e) => setFormImage(e.target.value)}
                    placeholder="Image URL..."
                    className="flex-1 text-sm border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-600 bg-gray-50/50"
                  />
                  {formImage.trim() && (
                    <button
                      type="button"
                      onClick={handleAddImageUrl}
                      className="bg-white hover:bg-gray-55 text-gray-700 border border-gray-300 text-xs font-semibold px-3.5 py-2.5 rounded-lg cursor-pointer transition-colors h-9"
                    >
                      Add
                    </button>
                  )}
                  <label className="bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 text-xs font-semibold px-4 py-2.5 rounded-lg cursor-pointer transition-colors flex items-center space-x-1.5 shrink-0 h-9">
                    {uploadingImage ? (
                      <>
                        <Loader2 className="animate-spin" size={14} />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <span>Upload</span>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploadingImage}
                    />
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Product URL
                </label>
                <input
                  type="url"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  placeholder="https://example.com/product"
                  className="w-full text-sm border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-600 bg-gray-50/50"
                />
              </div>

              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-8 space-y-1">
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Demo / Preview Link
                  </label>
                  <input
                    type="url"
                    value={formDemoUrl}
                    onChange={(e) => setFormDemoUrl(e.target.value)}
                    placeholder="YouTube video, website..."
                    className="w-full text-sm border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-600 bg-gray-50/50"
                  />
                </div>
                <div className="col-span-4 space-y-1">
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Demo Type
                  </label>
                  <select
                    value={formDemoType}
                    onChange={(e) => setFormDemoType(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-600 bg-white cursor-pointer"
                  >
                    <option value="Video">Video</option>
                    <option value="Website">Website</option>
                    <option value="Notion">Notion</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Description
                </label>
                <textarea
                  rows={4}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Describe your product details, materials, specs..."
                  className="w-full text-sm border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-600 bg-gray-50/50"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    📄 What's Inside
                    <span className="ml-1.5 text-[10px] font-normal text-gray-400 normal-case tracking-normal">optional</span>
                  </label>
                  <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">Boosts agent knowledge</span>
                </div>
                <textarea
                  rows={6}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder={`Module 1: CRM Setup - Build a Notion CRM from scratch\nModule 2: Follow-up Sequences - templates\nBonus: 5 cold outreach templates\nWho this is for: Freelancers\nQ: Is this for beginners? A: Yes.`}
                  className="w-full text-sm border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-650 bg-gray-50/50 font-mono leading-relaxed"
                />
                <p className="text-[10px] text-gray-400 leading-relaxed">
                  Paste your product's modules, FAQs, bonuses, and who it's for. The agent uses this to answer questions, handle objections, and compare products.
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    After-Purchase Support Notes
                    <span className="ml-1.5 text-[10px] font-normal text-gray-400 normal-case tracking-normal">optional</span>
                  </label>
                  <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-105">Helps agent support buyers</span>
                </div>
                <textarea
                  rows={3}
                  value={formSupportNotes}
                  onChange={(e) => setFormSupportNotes(e.target.value)}
                  placeholder="e.g. Start with Module 1, use Google Maps for Kerala leads, target 5 leads/day..."
                  className="w-full text-sm border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-600 bg-gray-50/50"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    What's Not Included
                    <span className="ml-1.5 text-[10px] font-normal text-gray-400 normal-case tracking-normal">optional</span>
                  </label>
                  <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">Sets correct expectations</span>
                </div>
                <textarea
                  rows={3}
                  value={formNotIncluded}
                  onChange={(e) => setFormNotIncluded(e.target.value)}
                  placeholder="e.g. No videos, not done-for-you, no community access..."
                  className="w-full text-sm border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:border-amber-600 bg-gray-50/50"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 bg-gray-50/50 border border-gray-200 rounded-xl">
                <div>
                  <h4 className="text-xs font-semibold text-gray-900 uppercase">Active Catalog Item</h4>
                  <p className="text-[10px] text-gray-500 mt-0.5">Toggle whether the agent is allowed to sell this.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormActive(!formActive)}
                  className="text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
                >
                  {formActive ? <ToggleRight size={36} /> : <ToggleLeft size={36} className="text-gray-400" />}
                </button>
              </div>
            </form>

            {/* Panel Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end space-x-3 bg-gray-50">
              <button
                type="button"
                onClick={() => setIsPanelOpen(false)}
                className="border border-gray-300 hover:bg-white text-xs font-semibold px-4 py-2.5 rounded-lg cursor-pointer bg-white text-gray-700 h-9"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="product-form"
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg cursor-pointer h-9 shadow-2xs"
              >
                {editingProduct ? 'Update Product' : 'Add to Catalog'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface ProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
}

const getGradient = (name: string) => {
  const gradients = [
    'from-blue-50 to-indigo-100 text-indigo-650',
    'from-emerald-50 to-teal-100 text-teal-700',
    'from-purple-50 to-fuchsia-100 text-purple-700',
    'from-amber-50 to-orange-100 text-amber-700',
    'from-rose-50 to-pink-100 text-rose-700',
    'from-cyan-50 to-sky-100 text-cyan-700',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
};

function ProductCard({ product, onEdit, onDelete }: ProductCardProps) {
  const images = product.images && product.images.length > 0
    ? product.images
    : product.image
      ? [product.image]
      : product.image_url
        ? [product.image_url]
        : [];

  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const [imageError, setImageError] = useState(false);

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setCurrentImgIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setCurrentImgIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const currentImage = images[currentImgIndex];
  const hasImage = currentImage && !imageError;

  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 overflow-hidden shadow-2xs flex flex-col justify-between transition-all duration-200 hover:border-gray-300 hover:shadow-md ${
        !product.active ? 'opacity-65' : ''
      }`}
    >
      <div>
        {hasImage ? (
          <div className="relative h-28 w-full bg-gray-50 border-b border-gray-200 flex items-center justify-center overflow-hidden group">
            <img
              src={currentImage}
              alt={product.name}
              onError={() => setImageError(true)}
              className="object-cover h-full w-full hover:scale-105 transition-transform duration-300"
            />
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-1 rounded-full bg-white/90 hover:bg-white text-gray-800 shadow-2xs border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  type="button"
                  onClick={handleNextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full bg-white/90 hover:bg-white text-gray-800 shadow-2xs border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
                >
                  <ChevronRight size={14} />
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-1 z-10 bg-black/35 px-2 py-0.5 rounded-full">
                  {images.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setCurrentImgIndex(idx);
                      }}
                      className={`w-1.5 h-1.5 rounded-full transition-colors cursor-pointer ${
                        idx === currentImgIndex ? 'bg-white' : 'bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="relative h-28 w-full bg-slate-50 border-b border-gray-100 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-slate-200 border border-slate-300/40 flex items-center justify-center shadow-3xs">
              <span className="text-sm font-black text-slate-500">
                {product.name.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        )}

        <div className="p-5 flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="font-bold text-gray-900 text-sm truncate flex-1 leading-snug">{product.name}</h3>
            <span className="font-extrabold text-blue-600 text-sm shrink-0">₹{product.price}</span>
          </div>
          <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed min-h-[54px]">
            {product.description}
          </p>
          <div className="flex items-center gap-2 flex-wrap min-h-[22px]">
            {(product as any).type ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100 uppercase tracking-wide">
                <span>📦</span>
                <span>{(product as any).type}</span>
              </span>
            ) : product.content ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100 uppercase tracking-wide">
                <span>📄</span>
                <span>Content</span>
              </span>
            ) : null}
            {product.url && (
              <a
                href={product.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline"
              >
                <span>View Product</span>
                <ExternalLink size={12} />
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="px-5 pb-5 pt-3 border-t border-gray-100 flex items-center justify-between">
        <span
          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
            product.active
              ? 'bg-green-50 text-green-700 border border-green-100'
              : 'bg-gray-100 text-gray-500 border border-gray-200'
          }`}
        >
          {product.active ? 'Active' : 'Disabled'}
        </span>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onEdit(product)}
            className="p-1.5 bg-gray-50 hover:bg-blue-50 text-gray-700 hover:text-blue-600 rounded-lg cursor-pointer transition-all border border-gray-200 shadow-3xs"
            title="Edit Product"
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={() => onDelete(product.id)}
            className="p-1.5 bg-gray-50 hover:bg-red-50 text-gray-700 hover:text-red-650 rounded-lg cursor-pointer transition-all border border-gray-200 shadow-3xs"
            title="Delete Product"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
