import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export async function GET(request: NextRequest) {
  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const typeFilter = searchParams.get('type'); // 'digital' | 'saas' | null (all)

    let productsQuery = supabaseAdmin
      .from('saas_products')
      .select('*')
      .order('sort_order', { ascending: true });

    if (typeFilter === 'saas') {
      productsQuery = productsQuery.eq('product_type', 'saas');
    } else if (typeFilter === 'digital') {
      productsQuery = productsQuery.neq('product_type', 'saas');
    }

    const [productsRes, categoriesRes, mediaRes, analyticsRes, faqsRes, downloadsRes] = await Promise.all([
      productsQuery,
      supabaseAdmin.from('categories').select('*'),
      supabaseAdmin.from('product_media').select('*').order('sort_order', { ascending: true }),
      supabaseAdmin.from('product_analytics').select('*'),
      supabaseAdmin.from('product_faqs').select('*').order('sort_order', { ascending: true }),
      supabaseAdmin.from('product_downloads').select('*')
    ]);

    if (productsRes.error) throw productsRes.error;
    if (categoriesRes.error) throw categoriesRes.error;

    const products = productsRes.data || [];
    const media = mediaRes.data || [];
    const analytics = analyticsRes.data || [];
    const faqs = faqsRes.data || [];
    const downloads = downloadsRes.data || [];

    // Map media, analytics, faqs, downloads, and custom section visibility fields
    const enrichedProducts = products.map(p => {
      const pMedia = media.filter(m => m.product_id === p.id || m.product_id === p.slug);
      const pFaqs = faqs.filter(f => f.product_id === p.id || f.product_id === p.slug);
      const pDownloads = downloads.filter(d => d.product_id === p.id || d.product_id === p.slug);
      const pAnalytics = analytics.find(a => a.product_id === p.id || a.product_id === p.slug) || {
        views_count: 0,
        checkout_clicks_count: 0,
        purchases_count: 0
      };

      const secVis = p.section_visibility || {};

      return {
        ...p,
        long_description: p.long_description || secVis.long_description || '',
        banner_url: p.banner_url || secVis.banner_url || '',
        demo_video_url: p.demo_video_url || secVis.demo_video_url || '',
        youtube_url: p.youtube_url || secVis.youtube_url || '',
        loom_url: p.loom_url || secVis.loom_url || '',
        preview_url: p.preview_url || secVis.preview_url || '',
        documentation_url: p.documentation_url || secVis.documentation_url || '',
        github_url: p.github_url || secVis.github_url || '',
        url: p.url || p.notion_url || secVis.url || secVis.notion_url || '',
        notion_url: p.notion_url || p.url || secVis.notion_url || secVis.url || '',
        page_sections: p.page_sections || secVis.page_sections || [],
        preview_sections: p.preview_sections || secVis.preview_sections || [],
        quick_facts: p.quick_facts || secVis.quick_facts || {},
        review_count: p.review_count ?? secVis.review_count ?? 0,
        media: pMedia,
        faqs: pFaqs,
        downloads: pDownloads,
        analytics: pAnalytics
      };
    });

    return NextResponse.json({
      products: enrichedProducts,
      categories: categoriesRes.data || []
    });
  } catch (error: any) {
    console.error('Admin Products GET Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, product, id } = body;

    if (!action) {
      return NextResponse.json({ error: 'Action is required.' }, { status: 400 });
    }

    if (action === 'save') {
      if (!product || !product.id || !product.name || !product.slug) {
        return NextResponse.json({ error: 'Product ID, Name, and Slug are required.' }, { status: 400 });
      }

      // Store custom layout / section builder configs inside section_visibility JSONB column
      const sectionVisibilityPayload = {
        hero: true,
        benefits: true,
        preview: true,
        testimonials: true,
        faq: true,
        founder: true,
        guarantee: true,
        related: true,
        ...(product.section_visibility || {}),
        page_sections: product.page_sections || [],
        preview_sections: product.preview_sections || [],
        quick_facts: product.quick_facts || {},
        review_count: Number(product.review_count) || 0,
        url: product.url || product.notion_url || '',
        notion_url: product.notion_url || product.url || '',
        banner_url: product.banner_url || '',
        demo_video_url: product.demo_video_url || '',
        youtube_url: product.youtube_url || '',
        loom_url: product.loom_url || '',
        preview_url: product.preview_url || '',
        documentation_url: product.documentation_url || '',
        github_url: product.github_url || '',
        long_description: product.long_description || ''
      };

      // Base payload with standard columns
      const initialPayload: Record<string, any> = {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description || '',
        thumbnail_url: product.thumbnail_url || '',
        category_id: product.category_id || 'templates',
        product_type: product.product_type || 'digital',
        price: Number(product.price) || 0,
        original_price: Number(product.original_price) || Number(product.price) || 0,
        international_price: Number(product.international_price) || 0,
        international_actual_price: Number(product.international_actual_price) || 0,
        plan_type: product.plan_type || 'standard',
        status: product.status || 'draft',
        features: product.features || [],
        section_visibility: sectionVisibilityPayload,
        related_product_ids: product.related_product_ids || [],
        meta_title: product.meta_title || `${product.name} | ScaleCraft`,
        meta_description: product.meta_description || product.description || '',
        og_image: product.og_image || '',
        canonical: product.canonical || `https://thescalecraft.in/products/${product.slug}`,
        is_featured: product.is_featured ?? false,
        is_combo: product.is_combo ?? false,
        combo_product_ids: product.combo_product_ids || [],
        sort_order: Number(product.sort_order) || 0,
        product_subtype: product.product_subtype || null,
        long_description: product.long_description || '',
        banner_url: product.banner_url || '',
        demo_video_url: product.demo_video_url || '',
        youtube_url: product.youtube_url || '',
        loom_url: product.loom_url || '',
        preview_url: product.preview_url || '',
        documentation_url: product.documentation_url || '',
        github_url: product.github_url || '',
        // SEO & Sitemap fields (were previously missing and silently dropped)
        sitemap_priority: product.sitemap_priority != null ? Number(product.sitemap_priority) : 0.8,
        sitemap_changefreq: product.sitemap_changefreq || 'weekly',
        robots_meta: product.robots_meta || 'index, follow',
        focus_keyword: product.focus_keyword || '',
        schema_override: product.schema_override || '',
        redirect_urls: product.redirect_urls || [],
        aliases: product.aliases || [],
        legacy_slug: product.legacy_slug || null,
        test_mode: product.test_mode ?? false,
        notion_url: product.notion_url || product.url || '',
        url: product.url || product.notion_url || '',
        setup_price: product.setup_price != null ? Number(product.setup_price) : null,
        monthly_price: product.monthly_price != null ? Number(product.monthly_price) : null,
        review_count: Number(product.review_count) || 0
      };

      // Auto-healing upsert loop: moves any non-existent DB column directly into section_visibility JSONB
      let currentPayload: Record<string, any> = { ...initialPayload };
      let data: any = null;
      let error: any = null;

      for (let attempt = 0; attempt < 15; attempt++) {
        const res = await supabaseAdmin
          .from('saas_products')
          .upsert(currentPayload)
          .select()
          .single();

        data = res.data;
        error = res.error;

        if (!error) break; // Upsert succeeded!

        // Inspect error for missing column message from PostgREST schema cache
        const missingColMatch =
          error.details?.match(/Could not find the '([^']+)' column of 'saas_products'/i) ||
          error.message?.match(/Could not find the '([^']+)' column of 'saas_products'/i);

        if (missingColMatch && missingColMatch[1]) {
          const missingCol = missingColMatch[1];
          console.warn(`[Admin Products] Auto-healing schema: Column '${missingCol}' not found in DB table. Moving to section_visibility JSONB.`);

          const val = currentPayload[missingCol];
          delete currentPayload[missingCol];

          currentPayload.section_visibility = {
            ...(currentPayload.section_visibility || {}),
            [missingCol]: val
          };
        } else {
          // Unhandled error type, exit loop
          break;
        }
      }

      if (error) throw error;

      // Handle product_media relations
      if (product.media) {
        await supabaseAdmin
          .from('product_media')
          .delete()
          .eq('product_id', product.id);

        if (product.media.length > 0) {
          const mediaPayload = product.media.map((m: any) => ({
            product_id: product.id,
            type: m.type || 'screenshot',
            url: m.url,
            sort_order: Number(m.sort_order) || 0,
            alt_text: m.alt_text || '',
            title: m.title || ''
          }));
          const { error: mediaErr } = await supabaseAdmin
            .from('product_media')
            .insert(mediaPayload);
          if (mediaErr) {
            console.error('Error inserting media items:', mediaErr.message);
            throw mediaErr;
          }
        }
      }

      // Handle product_faqs relations
      if (product.faqs) {
        await supabaseAdmin
          .from('product_faqs')
          .delete()
          .eq('product_id', product.id);

        if (product.faqs.length > 0) {
          const faqsPayload = product.faqs.map((f: any) => ({
            product_id: product.id,
            question: f.question,
            answer: f.answer,
            sort_order: Number(f.sort_order) || 0
          }));
          const { error: faqsErr } = await supabaseAdmin
            .from('product_faqs')
            .insert(faqsPayload);
          if (faqsErr) {
            console.error('Error inserting faqs:', faqsErr.message);
            throw faqsErr;
          }
        }
      }

      // Handle product_downloads relations
      if (product.downloads) {
        await supabaseAdmin
          .from('product_downloads')
          .delete()
          .eq('product_id', product.id);

        if (product.downloads.length > 0) {
          const downloadsPayload = product.downloads.map((d: any) => ({
            product_id: product.id,
            title: d.title,
            url: d.url,
            type: d.type || 'notion_template'
          }));
          const { error: downloadsErr } = await supabaseAdmin
            .from('product_downloads')
            .insert(downloadsPayload);
          if (downloadsErr) {
            console.error('Error inserting downloads:', downloadsErr.message);
            throw downloadsErr;
          }
        }
      }

      // Revalidate cache instantly across all routes
      try {
        revalidatePath('/');
        revalidatePath('/products');
        revalidatePath(`/products/${product.slug}`);
        revalidatePath('/sitemap.xml');
      } catch (revErr: any) {
        console.error('Error trigger revalidate path:', revErr.message);
      }

      return NextResponse.json({ success: true, product: data });
    }

    if (action === 'duplicate') {
      if (!id) {
        return NextResponse.json({ error: 'Product ID is required for duplication.' }, { status: 400 });
      }

      // 1. Fetch original product
      const { data: orig, error: fetchErr } = await supabaseAdmin
        .from('saas_products')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchErr || !orig) throw new Error('Original product not found');

      // 2. Fetch original media, downloads, faqs
      const [mediaRes, downloadsRes, faqsRes] = await Promise.all([
        supabaseAdmin.from('product_media').select('*').eq('product_id', id),
        supabaseAdmin.from('product_downloads').select('*').eq('product_id', id),
        supabaseAdmin.from('product_faqs').select('*').eq('product_id', id)
      ]);

      // 3. Create unique keys
      const randHex = Math.random().toString(16).slice(-4);
      const newId = `${orig.id}-clone-${randHex}`;
      const newSlug = `${orig.slug}-clone-${randHex}`;
      const newName = `${orig.name} (Clone)`;

      const productPayload = {
        ...orig,
        id: newId,
        slug: newSlug,
        name: newName,
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // 4. Insert cloned product record
      const { data: dupProduct, error: insertErr } = await supabaseAdmin
        .from('saas_products')
        .insert(productPayload)
        .select()
        .single();

      if (insertErr) throw insertErr;

      // 5. Duplicate relational records
      if (mediaRes.data && mediaRes.data.length > 0) {
        const mediaPayload = mediaRes.data.map(m => ({
          product_id: newId,
          type: m.type,
          url: m.url,
          sort_order: m.sort_order,
          alt_text: m.alt_text,
          title: m.title
        }));
        await supabaseAdmin.from('product_media').insert(mediaPayload);
      }

      if (downloadsRes.data && downloadsRes.data.length > 0) {
        const downloadsPayload = downloadsRes.data.map(d => ({
          product_id: newId,
          title: d.title,
          url: d.url,
          type: d.type
        }));
        await supabaseAdmin.from('product_downloads').insert(downloadsPayload);
      }

      if (faqsRes.data && faqsRes.data.length > 0) {
        const faqsPayload = faqsRes.data.map(f => ({
          product_id: newId,
          question: f.question,
          answer: f.answer,
          sort_order: f.sort_order
        }));
        await supabaseAdmin.from('product_faqs').insert(faqsPayload);
      }

      // Initialize fresh 0-state analytics for the duplicated product (not cloned)
      await supabaseAdmin.from('product_analytics').insert({
        product_id: newId,
        views_count: 0,
        checkout_clicks_count: 0,
        purchases_count: 0
      });

      // Revalidate catalog path
      try {
        revalidatePath('/');
        revalidatePath('/products');
      } catch (revErr: any) {
        console.error('Error triggers path revalidate:', revErr.message);
      }

      return NextResponse.json({ success: true, product: dupProduct });
    }

    if (action === 'delete') {
      if (!id) {
        return NextResponse.json({ error: 'Product ID is required for deletion.' }, { status: 400 });
      }

      const { error } = await supabaseAdmin
        .from('saas_products')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Revalidate cache
      try {
        revalidatePath('/');
        revalidatePath('/products');
      } catch (revErr: any) {
        console.error('Error triggers path revalidate:', revErr.message);
      }

      return NextResponse.json({ success: true, message: 'Product deleted successfully.' });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (error: any) {
    console.error('Admin Products POST Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
