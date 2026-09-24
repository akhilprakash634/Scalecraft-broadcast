-- ==============================================================================
-- Migration DDL: Create Simplified Relational CMS Tables
-- Date: 2026-08-01 21:15:00
-- ==============================================================================

-- 1. Alter saas_products safely
ALTER TABLE saas_products ADD COLUMN IF NOT EXISTS short_name TEXT;
ALTER TABLE saas_products ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE saas_products ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'::TEXT[];
ALTER TABLE saas_products ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR';
ALTER TABLE saas_products ADD COLUMN IF NOT EXISTS discount_percent INTEGER;
ALTER TABLE saas_products ADD COLUMN IF NOT EXISTS thumbnail TEXT;
ALTER TABLE saas_products ADD COLUMN IF NOT EXISTS cover_image TEXT;
ALTER TABLE saas_products ADD COLUMN IF NOT EXISTS hero_image TEXT;
ALTER TABLE saas_products ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT FALSE;
ALTER TABLE saas_products ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT TRUE;
ALTER TABLE saas_products ADD COLUMN IF NOT EXISTS is_new BOOLEAN DEFAULT FALSE;
ALTER TABLE saas_products ADD COLUMN IF NOT EXISTS is_best_seller BOOLEAN DEFAULT FALSE;
ALTER TABLE saas_products ADD COLUMN IF NOT EXISTS launch_date TIMESTAMPTZ;
ALTER TABLE saas_products ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2);
ALTER TABLE saas_products ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;
ALTER TABLE saas_products ADD COLUMN IF NOT EXISTS version TEXT DEFAULT '1.0.0';
ALTER TABLE saas_products ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE saas_products ADD COLUMN IF NOT EXISTS primary_cta TEXT;
ALTER TABLE saas_products ADD COLUMN IF NOT EXISTS secondary_cta TEXT;
ALTER TABLE saas_products ADD COLUMN IF NOT EXISTS search_text TEXT;

-- 2. Create product_content table
CREATE TABLE IF NOT EXISTS product_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT UNIQUE REFERENCES saas_products(id) ON DELETE CASCADE,
  page_sections JSONB DEFAULT '[]'::JSONB,
  cta_buttons JSONB DEFAULT '[]'::JSONB,
  display_config JSONB DEFAULT '{}'::JSONB,
  refund_policy TEXT,
  support_details TEXT,
  delivery_time TEXT,
  download_type TEXT,
  access_type TEXT,
  lifetime_updates BOOLEAN DEFAULT TRUE,
  seo_metadata JSONB DEFAULT '{}'::JSONB,
  ai_context JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create/Alter product_media table
CREATE TABLE IF NOT EXISTS product_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT REFERENCES saas_products(id) ON DELETE CASCADE,
  type TEXT,
  purpose TEXT,
  url TEXT NOT NULL,
  alt_text TEXT,
  width INTEGER,
  height INTEGER,
  mime_type TEXT,
  filesize INTEGER,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE product_media ADD COLUMN IF NOT EXISTS purpose TEXT;
ALTER TABLE product_media ADD COLUMN IF NOT EXISTS alt_text TEXT;
ALTER TABLE product_media ADD COLUMN IF NOT EXISTS width INTEGER;
ALTER TABLE product_media ADD COLUMN IF NOT EXISTS height INTEGER;
ALTER TABLE product_media ADD COLUMN IF NOT EXISTS mime_type TEXT;
ALTER TABLE product_media ADD COLUMN IF NOT EXISTS filesize INTEGER;

-- 4. Create product_testimonials table
CREATE TABLE IF NOT EXISTS product_testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT REFERENCES saas_products(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  company TEXT,
  role TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  testimonial TEXT NOT NULL,
  avatar TEXT,
  featured BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create product_relationships table
CREATE TABLE IF NOT EXISTS product_relationships (
  product_id TEXT REFERENCES saas_products(id) ON DELETE CASCADE,
  related_product_id TEXT REFERENCES saas_products(id) ON DELETE CASCADE,
  relationship_type TEXT CHECK (relationship_type IN ('bundle', 'upsell', 'cross_sell', 'alternative')),
  PRIMARY KEY (product_id, related_product_id, relationship_type)
);

-- 6. Create product_revisions table
CREATE TABLE IF NOT EXISTS product_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT REFERENCES saas_products(id) ON DELETE CASCADE,
  json_snapshot JSONB NOT NULL,
  version TEXT NOT NULL,
  change_summary TEXT,
  published BOOLEAN DEFAULT FALSE,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Configure Row Level Security (RLS)
ALTER TABLE product_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Drop legacy public read policies to recreate clean ones
DROP POLICY IF EXISTS "Allow public read on public products" ON saas_products;
DROP POLICY IF EXISTS "Allow public read on product_content" ON product_content;
DROP POLICY IF EXISTS "Allow public read on product_media" ON product_media;
DROP POLICY IF EXISTS "Allow public read on product_testimonials" ON product_testimonials;
DROP POLICY IF EXISTS "Allow public read on product_relationships" ON product_relationships;
DROP POLICY IF EXISTS "Allow public read on site_settings" ON site_settings;

-- Public SELECT Policies
CREATE POLICY "Allow public read on public products" ON saas_products
  FOR SELECT USING (status = 'published' OR status = 'archived');

CREATE POLICY "Allow public read on product_content" ON product_content
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM saas_products
      WHERE saas_products.id = product_content.product_id
        AND (saas_products.status = 'published' OR saas_products.status = 'archived')
    )
  );

CREATE POLICY "Allow public read on product_media" ON product_media
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM saas_products
      WHERE saas_products.id = product_media.product_id
        AND (saas_products.status = 'published' OR saas_products.status = 'archived')
    )
  );

CREATE POLICY "Allow public read on product_testimonials" ON product_testimonials
  FOR SELECT USING (
    product_id IS NULL OR EXISTS (
      SELECT 1 FROM saas_products
      WHERE saas_products.id = product_testimonials.product_id
        AND (saas_products.status = 'published' OR saas_products.status = 'archived')
    )
  );

CREATE POLICY "Allow public read on product_relationships" ON product_relationships
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM saas_products
      WHERE saas_products.id = product_relationships.product_id
        AND (saas_products.status = 'published' OR saas_products.status = 'archived')
    )
  );

CREATE POLICY "Allow public read on site_settings" ON site_settings
  FOR SELECT USING (true);
