import { Metadata } from 'next';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import ProductsGrid from '../ProductsGrid';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Digital Products | ScaleCraft: Templates, Guides & Prompt Packs',
  description:
    'Browse ScaleCraft digital products: Notion templates, AI prompt packs, business playbooks, client acquisition kits, and bundles. Instant delivery. Lifetime access.',
  alternates: {
    canonical: 'https://thescalecraft.in/products/digital',
  },
  openGraph: {
    title: 'Digital Products | ScaleCraft',
    description: 'Notion templates, AI prompt packs, guides and bundles for business owners. Instant access.',
    url: 'https://thescalecraft.in/products/digital',
    images: ['/og-image.jpg'],
  },
};

export default async function DigitalProductsPage() {
  const { data: dbProducts } = await supabaseAdmin
    .from('saas_products')
    .select('*')
    .eq('status', 'published')
    .neq('product_type', 'saas')
    .order('sort_order', { ascending: true });

  const liveProducts = (dbProducts || []).map((p: any) => ({
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

  const schemaData = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'ScaleCraft Digital Products',
    description: 'Notion templates, prompt packs, and business guides',
    itemListElement: liveProducts.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `https://thescalecraft.in/products/${p.slug?.current ?? ''}`,
      name: p.name,
    })),
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://thescalecraft.in' },
      { '@type': 'ListItem', position: 2, name: 'Products', item: 'https://thescalecraft.in/products' },
      { '@type': 'ListItem', position: 3, name: 'Digital Products', item: 'https://thescalecraft.in/products/digital' },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <main className="min-h-screen py-20 px-6 max-w-[1100px] mx-auto">
        {/* Back breadcrumb */}
        <div className="mb-8">
          <Link href="/products" className="text-xs text-gray-400 hover:text-gray-200 transition-colors flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            All Products
          </Link>
        </div>

        <div className="text-center mb-14 max-w-[640px] mx-auto">
          <span className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] font-bold px-4 py-1.5 rounded-full mb-4">
            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
            📦 Digital Products
          </span>
          <h1 className="font-heading text-clamp-h2 font-black tracking-[-1.5px] leading-tight mb-4 text-foreground">
            Templates, Guides & Prompt Packs
          </h1>
          <p className="text-[15px] text-text-muted leading-[1.7]">
            Notion systems, AI prompts, business playbooks, and client acquisition kits • instant download, lifetime access, zero subscriptions.
          </p>
        </div>

        <ProductsGrid liveProducts={liveProducts} />
      </main>
    </>
  );
}
