import { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabase';
import { notFound, redirect, RedirectType } from 'next/navigation';
import ProductPageClient from './ProductPageClient';
import { normalizeProduct } from '@/lib/content';
import { resolveProduct } from '@/lib/productResolver';
import { generateProductSchema, generateBreadcrumbSchema, generateFAQSchema } from '@/lib/schemaGenerator';

export const revalidate = 60;

export async function generateStaticParams() {
  try {
    const { data: products } = await supabaseAdmin
      .from('saas_products')
      .select('slug')
      .eq('status', 'published');

    return (products || []).filter(p => p && p.slug).map((product: any) => ({
      slug: String(product.slug),
    }));
  } catch (err) {
    console.error('[generateStaticParams] Error:', err);
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  try {
    const { slug } = await params;
    const resolution = await resolveProduct(slug);
    const dbProduct = resolution.product;

    if (!dbProduct) return {};
    return {
      title: dbProduct.meta_title || `${dbProduct.name} | ScaleCraft`,
      description: dbProduct.meta_description || dbProduct.description,
      openGraph: {
        title: dbProduct.name,
        description: dbProduct.description,
        images: [dbProduct.og_image || dbProduct.thumbnail_url || '/og-image.svg'],
      },
      alternates: {
        canonical: dbProduct.canonical || `https://thescalecraft.in/products/${dbProduct.slug}`,
      },
    };
  } catch {
    return {};
  }
}

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { slug } = await params;
  const sParams = await searchParams;
  const isPreview = sParams?.preview === 'true';

  const resolution = await resolveProduct(slug);

  if (resolution.shouldRedirect && resolution.canonicalSlug) {
    redirect(`/products/${resolution.canonicalSlug}`, RedirectType.replace);
  }

  const dbProduct = resolution.product;
  if (!dbProduct) notFound();
  if (dbProduct.status !== 'published' && !isPreview) notFound();

  // Safe relational data fetching (query by dbProduct.id directly)
  let faqsData: any[] = [];
  let mediaData: any[] = [];
  let downloadsData: any[] = [];
  let testimonialsData: any[] = [];

  try {
    const targetId = dbProduct.id;
    const targetSlug = dbProduct.slug;
    const [faqsRes, mediaRes, downloadsRes, testimonialsRes] = await Promise.all([
      supabaseAdmin.from('product_faqs').select('*').or(`product_id.eq.${targetId},product_id.eq.${targetSlug}`).order('sort_order', { ascending: true }),
      supabaseAdmin.from('product_media').select('*').or(`product_id.eq.${targetId},product_id.eq.${targetSlug}`).order('sort_order', { ascending: true }),
      supabaseAdmin.from('product_downloads').select('*').or(`product_id.eq.${targetId},product_id.eq.${targetSlug}`),
      supabaseAdmin.from('testimonials').select('id, name, rating, comment, profession, created_at, product_id').eq('approved', true).or(`product_id.eq.${targetId},product_id.eq.${targetSlug}`).order('created_at', { ascending: false }),
    ]);
    faqsData = faqsRes.data || [];
    mediaData = mediaRes.data || [];
    downloadsData = downloadsRes.data || [];
    testimonialsData = testimonialsRes.data || [];
  } catch (err: any) {
    console.warn('[ProductPage] Relational fetch warning:', err?.message);
  }

  // Fetch full details of related products based on relationships
  let relatedProducts: any[] = [];
  try {
    const relationships = dbProduct.relationships || [];
    if (relationships.length > 0) {
      const relIds = relationships.map((r: any) => r.related_product_id);
      const { data: relProds } = await supabaseAdmin
        .from('saas_products')
        .select('id, slug, name, price, original_price, international_price, international_actual_price, description, features, product_type, category')
        .in('id', relIds);
      relatedProducts = (relProds || []).map((p: any) => {
        const rel = relationships.find((r: any) => r.related_product_id === p.id);
        return {
          ...p,
          relationship_type: rel?.relationship_type || 'related'
        };
      });
    }
  } catch (err: any) {
    console.warn('[ProductPage] Related products fetch warning:', err?.message);
  }

  const secVis = dbProduct.section_visibility || {};

  const product = {
    ...dbProduct,
    _id: dbProduct.id,
    slug: { current: dbProduct.slug },
    price: Number(dbProduct.price) || 0,
    originalPrice: Number(dbProduct.original_price) || Number(dbProduct.price) || 0,
    internationalPrice: Number(dbProduct.international_price) || 0,
    internationalActualPrice: Number(dbProduct.international_actual_price) || 0,
    status: dbProduct.status === 'published' ? 'live' : 'coming_soon',
    features: Array.isArray(dbProduct.features) ? dbProduct.features : [],
    mainImage: dbProduct.thumbnail_url || undefined,
    page_sections: dbProduct.page_sections || secVis.page_sections || [],
    preview_sections: dbProduct.preview_sections || secVis.preview_sections || [],
    quick_facts: dbProduct.quick_facts || secVis.quick_facts || {},
    review_count: dbProduct.review_count ?? secVis.review_count ?? 0,
    faqs: faqsData,
    media: mediaData,
    downloads: downloadsData,
    testimonials: testimonialsData,
    relatedProducts: relatedProducts,
  };

  // Fetch active offer for product page banner
  let activeOffer = null;
  try {
    const { data: dbOffers } = await supabaseAdmin
      .from('offers')
      .select('*')
      .eq('active', true)
      .order('priority', { ascending: false });

    const now = new Date().getTime();
    const offers = (dbOffers || []).filter((offer: any) => {
      if (!offer.end_date) return true;
      const endDate = new Date(offer.end_date).getTime();
      return endDate > now;
    });
    if (offers.length > 0) {
      activeOffer = offers[0];
    }
  } catch (err) {
    console.warn('[ProductPage] Active offer fetch warning:', err);
  }

  const norm = normalizeProduct(product);

  const productSchema = generateProductSchema(product);
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: 'https://thescalecraft.in' },
    { name: 'Products', url: 'https://thescalecraft.in/products' },
    { name: product.name, url: `https://thescalecraft.in/products/${dbProduct.slug}` },
  ]);
  const faqSchema = generateFAQSchema(faqsData);

  return (
    <>
      {productSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />
      )}
      {breadcrumbSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      )}
      {faqSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      )}
      <ProductPageClient product={product} activeOffer={activeOffer} />
    </>
  );
}
