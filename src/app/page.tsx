import { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabase';
import { generateOrganizationSchema, generateWebSiteSchema, generateFounderSchema, generateFAQSchema } from '@/lib/schemaGenerator';

// Platform Landing Sections
import Hero from '@/components/sections/Hero';
import TrustBar from '@/components/sections/TrustBar';
import WhyScaleCraft from '@/components/sections/WhyScaleCraft';
import ProductsSection from '@/components/sections/ProductsSection';
import HowYouGoLeadsToClients from '@/components/sections/HowYouGoLeadsToClients';
import ComparisonTable from '@/components/sections/ComparisonTable';
import ResultsSection from '@/components/sections/ResultsSection';
import FounderSection from '@/components/sections/FounderSection';
import AfterPurchase from '@/components/sections/AfterPurchase';
import FAQ from '@/components/sections/FAQ';
import BlogGrid from '@/components/sections/BlogGrid';
import FinalCTA from '@/components/sections/FinalCTA';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'ScaleCraft — AI Business Tools, CRM Templates & Automation Solutions',
  description: 'Get practical AI tools, CRM templates, and business automation systems to find new customers, track sales, and save time on daily work.',
  alternates: { canonical: 'https://thescalecraft.in' },
};

export default async function Home() {
  const [productsRes, postsRes, reviewsRes, faqsRes, settingsRes] = await Promise.all([
    supabaseAdmin
      .from('saas_products')
      .select('*')
      .eq('status', 'published')
      .order('sort_order', { ascending: true }),
    supabaseAdmin
      .from('blog_posts')
      .select('*')
      .order('published_at', { ascending: false }),
    supabaseAdmin
      .from('testimonials')
      .select('*')
      .eq('approved', true)
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('faqs')
      .select('*')
      .order('sort_order', { ascending: true }),
    supabaseAdmin
      .from('site_settings')
      .select('*')
  ]);

  const rawProducts = productsRes.data || [];
  const rawPosts = postsRes.data || [];
  const rawReviews = reviewsRes.data || [];
  const dbFaqs = faqsRes.data || [];

  const settingsMap = (settingsRes.data || []).reduce((acc: any, cur: any) => {
    acc[cur.key] = cur.value;
    return acc;
  }, {});

  // Map featured products for platform landing page
  const liveProducts = rawProducts.map((p: any) => ({
    _id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    thumbnail_url: p.thumbnail_url || p.banner_url || '',
    banner_url: p.banner_url || '',
    price: Number(p.price),
    originalPrice: Number(p.original_price),
    internationalPrice: Number(p.international_price),
    internationalActualPrice: Number(p.international_actual_price),
    features: p.features || [],
    product_type: p.product_type || 'digital',
    product_subtype: p.product_subtype || '',
    isCombo: p.is_combo ?? false,
    status: p.status === 'published' ? 'live' : p.status
  }));

  const posts = rawPosts.map((p: any) => ({
    _id: p.id,
    title: p.title,
    slug: { current: p.slug },
    category: p.category,
    readTime: p.read_time,
    excerpt: p.excerpt,
    publishedAt: p.published_at,
    mainImage: p.main_image_url
  }));

  const reviews = rawReviews.map((r: any) => ({
    _id: r.id,
    name: r.name,
    rating: r.rating,
    comment: r.comment,
    profession: r.profession
  }));

  // Clean Platform Section Order (No product-specific walkthroughs on homepage)
  const defaultSections = [
    "Hero",
    "TrustBar",
    "WhyScaleCraft",
    "ProductsSection",
    "HowYouGoLeadsToClients",
    "ComparisonTable",
    "ResultsSection",
    "FounderSection",
    "AfterPurchase",
    "FAQ",
    "BlogGrid",
    "FinalCTA"
  ];

  const rawSectionOrder: string[] = settingsMap.home_sections_order || defaultSections;
  const sectionOrder = rawSectionOrder.filter(s => s !== 'SeeBeforeYouBuy');

  const waPrefillMsg: string = settingsMap.whatsapp_prefill_msg || '';

  const orgSchema = generateOrganizationSchema();
  const websiteSchema = generateWebSiteSchema();
  const founderSchema = generateFounderSchema();
  const homepageFaqSchema = generateFAQSchema(dbFaqs);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(founderSchema) }}
      />
      {homepageFaqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(homepageFaqSchema) }}
        />
      )}

      {sectionOrder.map((sectionName) => {
        switch (sectionName) {
          case "Hero":
            return <Hero key="Hero" liveProducts={liveProducts} />;
          case "TrustBar":
            return <TrustBar key="TrustBar" />;
          case "WhyScaleCraft":
            return <WhyScaleCraft key="WhyScaleCraft" />;
          case "ProductsSection":
            return <ProductsSection key="ProductsSection" liveProducts={liveProducts} />;
          case "HowYouGoLeadsToClients":
            return <HowYouGoLeadsToClients key="HowYouGoLeadsToClients" liveProducts={liveProducts} />;
          case "ComparisonTable":
            return <ComparisonTable key="ComparisonTable" liveProducts={liveProducts} comparisonConfig={settingsMap.comparison_table} />;
          case "ResultsSection":
            return <ResultsSection key="ResultsSection" reviews={reviews} />;
          case "FounderSection":
            return <FounderSection key="FounderSection" />;
          case "AfterPurchase":
            return <AfterPurchase key="AfterPurchase" />;
          case "FAQ":
            return <FAQ key="FAQ" faqs={dbFaqs} waPrefillMsg={waPrefillMsg} />;
          case "BlogGrid":
            return <BlogGrid key="BlogGrid" posts={posts} isHomePage={true} />;
          case "FinalCTA":
            return <FinalCTA key="FinalCTA" liveProducts={liveProducts} />;
          default:
            return null;
        }
      })}
    </>
  );
}
