/* eslint-disable @typescript-eslint/no-explicit-any */
import { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabase';
import StorefrontClient from './StorefrontClient';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'ScaleCraft Products – AI Business Systems for Freelancers & Businesses',
  description:
    'Explore ScaleCraft\'s AI-powered business systems, client acquisition tools, automation solutions and ready-to-use resources for freelancers, agencies, creators and small businesses.',
  alternates: {
    canonical: 'https://thescalecraft.in/products',
  },
  openGraph: {
    title: 'ScaleCraft Products – AI Business Systems',
    description: 'Explore ScaleCraft\'s AI-powered business systems, client acquisition tools, and automation solutions.',
    url: 'https://thescalecraft.in/products',
    images: ['/og-image.jpg'],
  },
};

export default async function ProductsOverviewPage() {
  const [productsRes, testimonialsRes] = await Promise.all([
    supabaseAdmin
      .from('saas_products')
      .select('*')
      .eq('status', 'published')
      .order('sort_order', { ascending: true }),
    supabaseAdmin
      .from('testimonials')
      .select('id, name, rating, comment, profession, created_at, saas_products(name)')
      .eq('approved', true)
      .order('created_at', { ascending: false })
  ]);

  const products = productsRes.data || [];
  const testimonials = testimonialsRes.data || [];

  const liveProducts = products.map((p: any) => ({
    ...p,
    _id: p.id,
    slug: { current: p.slug },
    price: Number(p.price),
    originalPrice: Number(p.original_price),
    internationalPrice: Number(p.international_price),
    internationalActualPrice: Number(p.international_actual_price),
    features: p.features || [],
    status: 'live'
  }));

  const formattedReviews = testimonials.map((r: any) => ({
    _id: r.id,
    name: r.name,
    rating: Number(r.rating || 5),
    comment: r.comment,
    profession: r.profession,
    createdAt: r.created_at,
    productName: r.saas_products?.name || null
  }));

  const collectionPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'ScaleCraft Products Directory',
    description: 'Practical AI tools, sales CRM templates, and business automation systems.',
    url: 'https://thescalecraft.in/products',
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://thescalecraft.in' },
      { '@type': 'ListItem', position: 2, name: 'Products', item: 'https://thescalecraft.in/products' },
    ],
  };

  const productSchemaList = liveProducts.map((p: any) => ({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: p.description,
    image: p.thumbnail_url || '/og-image.jpg',
    offers: {
      '@type': 'Offer',
      price: p.price,
      priceCurrency: 'INR',
      availability: 'https://schema.org/InStock',
      url: `https://thescalecraft.in/products/${p.slug?.current || p.slug}`,
    }
  }));

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPageSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchemaList) }} />

      <main className="min-h-screen pt-16">
        <StorefrontClient products={liveProducts} testimonials={formattedReviews} />
      </main>
    </>
  );
}

