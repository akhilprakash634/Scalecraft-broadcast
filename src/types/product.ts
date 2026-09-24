/**
 * ScaleCraft Strict Product Contract Interface
 * Single Authoritative Product Object Schema used across frontend components,
 * API routes, and database queries.
 */

export type ProductType = 'digital' | 'saas' | 'service' | 'bundle';

export interface ProductMediaItem {
  id?: string;
  product_id?: string;
  type: 'image' | 'video' | 'screenshot' | 'loom';
  url: string;
  title?: string;
  caption?: string;
  sort_order?: number;
}

export interface ProductFaqItem {
  id?: string;
  product_id?: string;
  question: string;
  answer: string;
  sort_order?: number;
}

export interface ProductDownloadItem {
  id?: string;
  product_id?: string;
  title: string;
  type: 'pdf' | 'video' | 'notion_template' | 'zip' | 'link';
  download_url?: string;
}

export interface Product {
  id: string;
  slug: string;
  legacy_slug?: string;
  aliases?: string[];
  name: string;
  short_description?: string;
  long_description?: string;
  description: string;

  thumbnail_url?: string;
  banner_url?: string;
  mainImage?: string;

  product_type: ProductType;
  product_subtype?: string;

  price: number;
  original_price?: number;
  originalPrice?: number;

  international_price?: number;
  internationalPrice?: number;
  international_actual_price?: number;
  internationalActualPrice?: number;

  features?: string[];
  badges?: string[];

  preview_sections?: any[];
  page_sections?: any[];

  media?: ProductMediaItem[];
  faqs?: ProductFaqItem[];
  downloads?: ProductDownloadItem[];
  related_products?: (string | Product)[];

  cta_text?: string;
  custom_cta?: string;

  demo_url?: string;
  documentation_url?: string;
  notion_url?: string;

  status?: 'published' | 'draft' | 'archived';
  sort_order?: number;
  is_combo?: boolean;
  review_count?: number;
  purchases_count?: number;

  // SEO & Search Indexing
  meta_title?: string;
  meta_description?: string;
  og_image?: string;
  canonical?: string;
  focus_keyword?: string;
  schema_override?: string;
  robots_meta?: string;
  sitemap_priority?: number;
  sitemap_changefreq?: string;
  redirect_urls?: string[];

  // Checkout & Experience Engine
  checkout_title?: string;
  checkout_description?: string;
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

  // New Relational Columns
  short_name?: string;
  category?: string;
  tags?: string[];
  currency?: string;
  discount_percent?: number;
  thumbnail?: string;
  cover_image?: string;
  hero_image?: string;
  featured?: boolean;
  is_visible?: boolean;
  is_new?: boolean;
  is_best_seller?: boolean;
  launch_date?: string;
  published_at?: string;
  search_text?: string;
  primary_cta?: string;
  secondary_cta?: string;

  // Resolved relational data
  content?: ProductContent;
  media_assets?: ProductMedia[];
  testimonials_list?: ProductTestimonial[];
  relationships?: ProductRelationship[];

  created_at?: string;
  updated_at?: string;
}

export interface ProductContent {
  id: string;
  product_id: string;
  page_sections: any[];
  cta_buttons: any[];
  display_config: any;
  refund_policy?: string;
  support_details?: string;
  delivery_time?: string;
  download_type?: string;
  access_type?: string;
  lifetime_updates?: boolean;
  seo_metadata?: any;
  ai_context?: any;
}

export interface ProductMedia {
  id: string;
  product_id: string;
  type: 'image' | 'video' | 'loom' | 'pdf';
  purpose: 'thumbnail' | 'hero' | 'gallery' | 'dashboard' | 'workflow' | 'comparison' | 'og' | 'demo';
  url: string;
  alt_text?: string;
  width?: number;
  height?: number;
  mime_type?: string;
  filesize?: number;
  sort_order?: number;
}

export interface ProductTestimonial {
  id: string;
  product_id?: string;
  customer_name: string;
  company?: string;
  role?: string;
  rating: number;
  testimonial: string;
  avatar?: string;
  featured?: boolean;
  sort_order?: number;
}

export interface ProductRelationship {
  product_id: string;
  related_product_id: string;
  relationship_type: 'bundle' | 'upsell' | 'cross_sell' | 'alternative';
}

export interface ProductRevision {
  id: string;
  product_id: string;
  json_snapshot: any;
  version: string;
  change_summary?: string;
  published?: boolean;
  created_by?: string;
  created_at?: string;
}

