import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const revalidate = 0;

export async function GET() {
  try {
    const [productsRes, faqsRes, mediaRes, downloadsRes] = await Promise.all([
      supabaseAdmin.from('saas_products').select('*').order('sort_order', { ascending: true }),
      supabaseAdmin.from('product_faqs').select('id, product_id'),
      supabaseAdmin.from('product_media').select('id, product_id'),
      supabaseAdmin.from('product_downloads').select('id, product_id')
    ]);

    if (productsRes.error) throw productsRes.error;

    const products = productsRes.data || [];
    const faqs = faqsRes.data || [];
    const media = mediaRes.data || [];
    const downloads = downloadsRes.data || [];

    // Map relational counts
    const faqCountMap: Record<string, number> = {};
    faqs.forEach((f: any) => {
      faqCountMap[f.product_id] = (faqCountMap[f.product_id] || 0) + 1;
    });

    const mediaCountMap: Record<string, number> = {};
    media.forEach((m: any) => {
      mediaCountMap[m.product_id] = (mediaCountMap[m.product_id] || 0) + 1;
    });

    const downloadCountMap: Record<string, number> = {};
    downloads.forEach((d: any) => {
      downloadCountMap[d.product_id] = (downloadCountMap[d.product_id] || 0) + 1;
    });

    // Track duplicate slugs
    const slugCounts: Record<string, number> = {};
    products.forEach((p: any) => {
      if (p.slug) slugCounts[p.slug] = (slugCounts[p.slug] || 0) + 1;
    });

    // Audit each product
    const healthAudit = products.map((p: any) => {
      const warnings: string[] = [];
      const errors: string[] = [];

      // Check required fields
      if (!p.name || !p.name.trim()) errors.push('Missing product name');
      if (!p.slug || !p.slug.trim()) errors.push('Missing product slug');
      if (typeof p.price !== 'number' || p.price <= 0) errors.push('Missing valid price');
      if (slugCounts[p.slug] > 1) errors.push(`Duplicate slug "${p.slug}"`);

      // Check warnings
      if (!p.thumbnail_url && !p.banner_url) warnings.push('Missing thumbnail or banner image');
      if (!p.description || !p.description.trim()) warnings.push('Missing product description');
      if (!p.product_type) warnings.push('Missing product_type classification');
      
      const faqCount = faqCountMap[p.id] || 0;
      if (faqCount === 0) warnings.push('No product FAQs mapped');

      const mediaCount = mediaCountMap[p.id] || 0;
      if (mediaCount === 0) warnings.push('No product media/screenshots mapped');

      const secVis = p.section_visibility || {};
      const demoUrl = p.demo_url || secVis.demo_url || secVis.loom_url || p.url;
      if (!demoUrl) warnings.push('Missing demo/preview URL');

      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (errors.length > 0) status = 'critical';
      else if (warnings.length > 0) status = 'warning';

      return {
        id: p.id,
        name: p.name || 'Unnamed Product',
        slug: p.slug || 'no-slug',
        status_db: p.status || 'published',
        product_type: p.product_type || 'digital',
        price: p.price,
        international_price: p.international_price,
        thumbnail_url: p.thumbnail_url || p.banner_url || null,
        faq_count: faqCount,
        media_count: mediaCount,
        download_count: downloadCountMap[p.id] || 0,
        healthStatus: status,
        errors,
        warnings,
      };
    });

    const summary = {
      totalProducts: healthAudit.length,
      healthyCount: healthAudit.filter(h => h.healthStatus === 'healthy').length,
      warningCount: healthAudit.filter(h => h.healthStatus === 'warning').length,
      criticalCount: healthAudit.filter(h => h.healthStatus === 'critical').length,
    };

    return NextResponse.json({ summary, audit: healthAudit });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Health audit failed' }, { status: 500 });
  }
}
