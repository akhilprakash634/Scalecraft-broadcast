-- ==============================================================================
-- Migration DDL: Upgrade Database to ScaleCraft Product Operating System V5
-- Date: 2026-08-03 18:28:00
-- ==============================================================================

-- 1. Enable Vector Extension (for pgvector search index)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create Custom Types / Enums safely
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_lifecycle_state') THEN
    CREATE TYPE product_lifecycle_state AS ENUM ('upcoming', 'launching', 'best_seller', 'stable', 'legacy', 'archived');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'editorial_workflow_state') THEN
    CREATE TYPE editorial_workflow_state AS ENUM ('draft', 'preview', 'qa', 'published', 'rollback');
  END IF;
END
$$;

-- 3. Safely Upgrade saas_products Table
ALTER TABLE saas_products DROP CONSTRAINT IF EXISTS saas_products_product_type_check;
ALTER TABLE saas_products ADD COLUMN IF NOT EXISTS product_type TEXT DEFAULT 'digital';
ALTER TABLE saas_products ADD CONSTRAINT saas_products_product_type_check 
  CHECK (product_type IN ('saas', 'digital', 'service', 'bundle', 'course'));
ALTER TABLE saas_products ADD COLUMN IF NOT EXISTS lifecycle_state product_lifecycle_state DEFAULT 'stable';
ALTER TABLE saas_products ADD COLUMN IF NOT EXISTS version TEXT DEFAULT '1.0.0';


-- 4. Create product_marketing Table
CREATE TABLE IF NOT EXISTS product_marketing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT UNIQUE REFERENCES saas_products(id) ON DELETE CASCADE,
  
  -- Localized text values
  localized_name JSONB NOT NULL DEFAULT '{}'::JSONB,
  localized_short_description JSONB NOT NULL DEFAULT '{}'::JSONB,
  localized_long_description JSONB NOT NULL DEFAULT '{}'::JSONB,
  localized_solution_statement JSONB NOT NULL DEFAULT '{}'::JSONB,
  
  -- Sourcing structures
  personas JSONB DEFAULT '[]'::JSONB,
  competitor_positioning JSONB DEFAULT '[]'::JSONB,
  localized_workflow_steps JSONB DEFAULT '[]'::JSONB,
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Safely Upgrade product_content Table
ALTER TABLE product_content ADD COLUMN IF NOT EXISTS workflow_state editorial_workflow_state DEFAULT 'draft';
ALTER TABLE product_content ADD COLUMN IF NOT EXISTS sections JSONB NOT NULL DEFAULT '[]'::JSONB;
ALTER TABLE product_content ADD COLUMN IF NOT EXISTS pricing_tiers JSONB NOT NULL DEFAULT '[]'::JSONB;

-- Copy any existing data from legacy page_sections to sections if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'product_content' AND column_name = 'page_sections'
  ) THEN
    UPDATE product_content SET sections = page_sections WHERE sections = '[]'::JSONB;
  END IF;
END
$$;

-- 6. Create search_index Table
CREATE TABLE IF NOT EXISTS search_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT REFERENCES saas_products(id) ON DELETE CASCADE,
  keywords TEXT[] DEFAULT '{}'::TEXT[],
  synonyms TEXT[] DEFAULT '{}'::TEXT[],
  categories TEXT[] DEFAULT '{}'::TEXT[],
  buyer_intent TEXT NOT NULL DEFAULT 'transactional',
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on the new table
ALTER TABLE product_marketing ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_index ENABLE ROW LEVEL SECURITY;

-- Setup Public Read Policies
DROP POLICY IF EXISTS "Allow public read on product_marketing" ON product_marketing;
CREATE POLICY "Allow public read on product_marketing" ON product_marketing
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM saas_products
      WHERE saas_products.id = product_marketing.product_id
        AND (saas_products.status = 'published' OR saas_products.status = 'archived')
    )
  );

DROP POLICY IF EXISTS "Allow public read on search_index" ON search_index;
CREATE POLICY "Allow public read on search_index" ON search_index
  FOR SELECT USING (true);
