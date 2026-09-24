/**
 * Centralized Product Configuration & Normalization Layer
 * Avoids duplicated business fields and manages dynamic fallbacks
 */

export interface LocalProduct {
  id: string;
  slug: string;
  name: { en: string };
  description: { en: string };
  priceINR: number;
  originalPriceINR: number;
  priceUSD: number;
  originalPriceUSD: number;
  features: string[];
  version: string;
  lastUpdated: string;
  releasedAt: string;
  status: 'active' | 'comingSoon' | 'beta' | 'deprecated';
  relatedProducts: string[]; // Related slugs
  bestForText?: string;
  crossSellText?: string;
  shortName?: string;
  category?: string;
  tags?: string[];
  currency?: string;
  discountPercent?: number;
  thumbnail?: string;
  coverImage?: string;
  heroImage?: string;
  featured?: boolean;
  isVisible?: boolean;
  isNew?: boolean;
  isBestSeller?: boolean;
  launchDate?: string;
  publishedAt?: string;
  searchText?: string;
  primaryCta?: string;
  secondaryCta?: string;
  content?: any;
  mediaAssets?: any[];
  testimonialsList?: any[];
  relationships?: any[];
}

export const LOCAL_PRODUCTS: Record<string, LocalProduct> = {
  "freelance-client-pipeline-blueprint": {
    id: "freelance-client-pipeline-blueprint",
    slug: "freelance-client-pipeline-blueprint",
    name: { en: "Freelance Client Pipeline Blueprint" },
    description: { en: "Losing track of client leads? Organize contacts in a visual sales CRM with proposal templates to close deals." },
    priceINR: 999,
    originalPriceINR: 1999,
    priceUSD: 12,
    originalPriceUSD: 24,
    features: [
      "1-Click Notion CRM Dashboard Workspace",
      "7-Day Client Acquisition Challenge",
      "Fastest Way To Get Your First Client Guide",
      "50+ Outreach Templates (Instagram DM, LinkedIn, Email)",
      "Follow-Up Systems (Day 3, 7, 14 breakup nudges)",
      "Word-for-Word Proposal & Onboarding Templates",
      "AI Prompt Assistants (Script refiners & handlers)",
      "Daily Workflows & Routines Checklist",
      "Master Lead Tracker Database",
      "Free Lifetime Updates",
      "Direct Founder WhatsApp Support"
    ],
    version: "2.4.0",
    lastUpdated: "2026-07-07",
    releasedAt: "2025-11-20",
    status: "active",
    relatedProducts: ["ai-lead-finder-system", "ai-systems-combo"],
    bestForText: "Business owners wanting organized deal tracking",
    crossSellText: "AI Lead Finder"
  },
  "ai-lead-finder-system": {
    id: "ai-lead-finder-system",
    slug: "ai-lead-finder-system",
    name: { en: "AI Lead Finder System" },
    description: { en: "Struggling to find new clients? Get step-by-step lead sourcing guides to build a consistent list of buyers." },
    priceINR: 499,
    originalPriceINR: 999,
    priceUSD: 6,
    originalPriceUSD: 12,
    features: [
      "Module 1: Setup & Daily Sourcing Routines",
      "Module 2: Instagram & Facebook Lead Sourcing",
      "Module 3: LinkedIn B2B Lead System",
      "Module 4: Google Maps Local Lead Machine",
      "Module 5: WhatsApp Group Lead Mining",
      "Module 6: Master AI Prompt Library",
      "Master Lead Tracker Database template",
      "Apify & Apollo.io workflow setups",
      "Free Lifetime Updates",
      "Direct Founder WhatsApp Support"
    ],
    version: "2.3.0",
    lastUpdated: "2026-06-15",
    releasedAt: "2026-01-10",
    status: "active",
    relatedProducts: ["freelance-client-pipeline-blueprint", "ai-systems-combo"],
    bestForText: "Freelancers & agencies needing fresh leads",
    crossSellText: "Client Pipeline CRM"
  },
  "ai-systems-combo": {
    id: "ai-systems-combo",
    slug: "ai-systems-combo",
    name: { en: "AI Systems Combo (Client Pipeline + Lead Finder)" },
    description: { en: "Need a complete sales process? Get both sourcing and CRM systems to find prospects and sign new clients." },
    priceINR: 1299,
    originalPriceINR: 2999,
    priceUSD: 16,
    originalPriceUSD: 36,
    features: [
      "Includes complete Freelancer Client Blueprint",
      "Includes complete AI Lead Finder System",
      "Full Notion CRM & Master Lead Tracker",
      "50+ Outreach scripts & customizers",
      "LinkedIn, Maps, and Instagram lead scrapers",
      "Proposal, contract & onboarding assets",
      "AI prompt helpers & breakup nudges",
      "Direct Founder WhatsApp Support",
      "Lifetime Updates & Results Guarantee"
    ],
    version: "2.4.0",
    lastUpdated: "2026-07-07",
    releasedAt: "2026-03-01",
    status: "active",
    relatedProducts: ["freelance-client-pipeline-blueprint", "ai-lead-finder-system"],
    bestForText: "Growth-stage teams wanting the complete system",
    crossSellText: "WhatsApp AI Agent"
  },
  "scalecraft-agent-saas": {
    id: "scalecraft-agent-saas",
    slug: "scalecraft-agent-saas",
    name: { en: "ScaleCraft Agent - Managed SaaS" },
    description: { en: "Wasting time on customer questions? Deploy a 24/7 WhatsApp AI agent to answer queries and capture leads." },
    priceINR: 7499,
    originalPriceINR: 7499,
    priceUSD: 90,
    originalPriceUSD: 90,
    features: [
      "Dedicated VPS server Mumbai",
      "We install everything",
      "Dashboard to manage products and leads",
      "Lead CRM synced to Google Sheets",
      "Chat memory system",
      "Usage and billing dashboard",
      "Priority support"
    ],
    version: "1.0.0",
    lastUpdated: "Recently",
    releasedAt: "2026",
    status: "active",
    relatedProducts: ["ai-systems-combo"],
    bestForText: "Businesses wanting automatic 24/7 support",
    crossSellText: "AI Systems Combo"
  },
  "consistent-fashion-studio": {
    id: "consistent-fashion-studio",
    slug: "consistent-fashion-studio",
    name: { en: "Consistent Fashion Studio" },
    description: { en: "Create professional fashion photos using your model and clothing references — without a photographer, studio, or expensive photoshoot." },
    priceINR: 399,
    originalPriceINR: 499,
    priceUSD: 5,
    originalPriceUSD: 6,
    features: [
      "Create professional fashion photos",
      "Use your own model reference",
      "Use your own clothing reference",
      "Explore different styles and locations",
      "Maintain model and outfit consistency",
      "Multiple poses and camera angles",
      "Multiple aspect ratios",
      "Create catalogue and social-media visuals",
      "Suitable for e-commerce and marketplace imagery",
      "Suitable for advertising creatives",
      "One-time payment",
      "No monthly subscription"
    ],
    version: "1.0.0",
    lastUpdated: "2026-09-04",
    releasedAt: "2026",
    status: "active",
    relatedProducts: ["ai-systems-combo", "ai-lead-finder-system"],
    bestForText: "Boutiques, clothing brands & Instagram fashion sellers",
    crossSellText: "AI Systems Combo",
    isNew: true,
    category: "ai-tools",
    tags: ["ai-tools", "fashion", "ecommerce", "photography", "digital"],
    currency: "INR"
  }
};

/**
 * Normalization Layer
 * Safe adapter formatting DB products or falling back to local config files
 */
export function normalizeProduct(sanityProduct: any): LocalProduct {
  if (!sanityProduct) {
    return LOCAL_PRODUCTS['ai-systems-combo'];
  }

  const slug = typeof sanityProduct?.slug === 'object' ? sanityProduct.slug.current : (sanityProduct?.slug || '');
  const rawName = sanityProduct?.name?.en || sanityProduct?.name || '';
  const rawDesc = sanityProduct?.description?.en || sanityProduct?.description || '';

  // Check if we have an exact match in local fallback file by slug
  const localMatch = LOCAL_PRODUCTS[slug];

  // REAL DATABASE VALUES OVERRIDE FALLBACKS
  const nameEn = rawName || localMatch?.name?.en || 'ScaleCraft Product';
  const descEn = rawDesc || localMatch?.description?.en || '';

  const priceINR = Number(sanityProduct?.price ?? sanityProduct?.priceINR ?? sanityProduct?.offerPrice) || localMatch?.priceINR || 0;
  const originalPriceINR = Number(sanityProduct?.originalPrice ?? sanityProduct?.originalPriceINR ?? sanityProduct?.original_price ?? sanityProduct?.actualPrice) || localMatch?.originalPriceINR || priceINR;
  
  const priceUSD = Number(sanityProduct?.internationalPrice ?? sanityProduct?.priceUSD) || localMatch?.priceUSD || (priceINR > 0 ? Math.round(priceINR / 83) : 0);
  const originalPriceUSD = Number(sanityProduct?.internationalActualPrice ?? sanityProduct?.originalPriceUSD) || localMatch?.originalPriceUSD || (originalPriceINR > 0 ? Math.round(originalPriceINR / 83) : 0);

  // Custom metadata fields resolved dynamically from DB/Sanity or falling back to local matches
  const bestForText = sanityProduct?.best_for || sanityProduct?.section_visibility?.quick_facts?.best_for || localMatch?.bestForText || 'Freelancers & business builders';
  const crossSellText = sanityProduct?.cross_sell_text || sanityProduct?.section_visibility?.cross_sell_text || localMatch?.crossSellText || 'AI Systems Combo';

  return {
    id: sanityProduct?._id || sanityProduct?.id || slug || 'unknown',
    slug: slug || 'unknown',
    name: { en: nameEn },
    description: { en: descEn },
    priceINR,
    originalPriceINR,
    priceUSD,
    originalPriceUSD,
    features: sanityProduct?.features || localMatch?.features || [],
    version: sanityProduct?.version || localMatch?.version || '1.0.0',
    lastUpdated: sanityProduct?.lastUpdated || localMatch?.lastUpdated || 'Recently',
    releasedAt: sanityProduct?.releasedAt || localMatch?.releasedAt || '2026',
    status: sanityProduct?.status || localMatch?.status || 'active',
    relatedProducts: sanityProduct?.related_product_ids || localMatch?.relatedProducts || [],
    bestForText,
    crossSellText,

    // Relational schema attributes
    shortName: sanityProduct?.short_name || localMatch?.shortName || nameEn.replace("ScaleCraft ", ""),
    category: sanityProduct?.category || localMatch?.category || 'templates',
    tags: sanityProduct?.tags || localMatch?.tags || [],
    currency: sanityProduct?.currency || localMatch?.currency || 'INR',
    discountPercent: sanityProduct?.discount_percent || localMatch?.discountPercent || 0,
    thumbnail: sanityProduct?.thumbnail || localMatch?.thumbnail || '',
    coverImage: sanityProduct?.cover_image || localMatch?.coverImage || '',
    heroImage: sanityProduct?.hero_image || localMatch?.heroImage || '',
    featured: sanityProduct?.featured || localMatch?.featured || false,
    isVisible: sanityProduct?.is_visible !== false,
    isNew: sanityProduct?.is_new || localMatch?.isNew || false,
    isBestSeller: sanityProduct?.is_best_seller || localMatch?.isBestSeller || false,
    launchDate: sanityProduct?.launch_date || localMatch?.launchDate || '',
    publishedAt: sanityProduct?.published_at || localMatch?.publishedAt || '',
    searchText: sanityProduct?.search_text || localMatch?.searchText || '',
    primaryCta: sanityProduct?.primary_cta || localMatch?.primaryCta || '',
    secondaryCta: sanityProduct?.secondary_cta || localMatch?.secondaryCta || '',
    content: sanityProduct?.content || null,
    mediaAssets: sanityProduct?.media_assets || [],
    testimonialsList: sanityProduct?.testimonials_list || [],
    relationships: sanityProduct?.relationships || []
  };
}

export async function getProductBySlug(slug: string): Promise<LocalProduct | null> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    if (!supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) {
      supabaseUrl = 'https://mdpqloubogfwvthpxskl.supabase.co';
    }
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_CN0Cny9GyQEEUw_piFspUA_AYGjough';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Query the base product catalog
    const { data: dbProd } = await supabase
      .from('saas_products')
      .select('*')
      .or(`id.eq.${slug},slug.eq.${slug}`)
      .maybeSingle();

    if (dbProd) {
      const productId = dbProd.id;

      // 2. Fetch the normalized relational page settings, assets, reviews & links in parallel
      const [contentRes, mediaRes, testimonialsRes, relationshipsRes] = await Promise.all([
        supabase.from('product_content').select('*').eq('product_id', productId).maybeSingle(),
        supabase.from('product_media').select('*').eq('product_id', productId).order('sort_order', { ascending: true }),
        supabase.from('product_testimonials').select('*').eq('product_id', productId).order('sort_order', { ascending: true }),
        supabase.from('product_relationships').select('*').eq('product_id', productId)
      ]);

      const fullProduct = {
        ...dbProd,
        content: contentRes?.data || null,
        media_assets: mediaRes?.data || [],
        testimonials_list: testimonialsRes?.data || [],
        relationships: relationshipsRes?.data || []
      };

      return normalizeProduct(fullProduct);
    }
  } catch (err) {
    console.error('Error in getProductBySlug:', err);
  }

  // Fallback to local configuration file
  const localMatch = LOCAL_PRODUCTS[slug];
  if (localMatch) return localMatch;

  return null;
}

