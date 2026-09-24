-- ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Razorpay data
  order_id TEXT UNIQUE NOT NULL,
  payment_id TEXT,
  
  -- Customer
  customer_name TEXT,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  
  -- Product (Sanity product ID - stays as string)
  sanity_product_id TEXT NOT NULL,
  product_name TEXT,
  product_slug TEXT,
  
  -- Pricing
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'INR',
  original_price NUMERIC,
  
  -- Coupon
  coupon_code TEXT,
  discount_amount NUMERIC DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'pending',
  -- pending | completed | failed | refunded
  
  -- Access
  notion_url TEXT,
  access_sent BOOLEAN DEFAULT false,
  access_sent_at TIMESTAMPTZ,
  license_key TEXT,
  
  -- Meta
  razorpay_webhook_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- COUPONS TABLE
-- Note: allowedProducts stores Sanity product IDs
-- as text array since products stay in Sanity
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  
  -- Discount
  type TEXT DEFAULT 'fixed',
  -- fixed | percent
  value NUMERIC NOT NULL,
  
  -- Scope
  allowed_product_ids TEXT[],
  -- NULL = applies to all products
  -- array of Sanity product _id strings
  
  -- Limits
  max_uses INTEGER,
  -- NULL = unlimited
  uses_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- AGENT CLIENTS (add missing columns)
ALTER TABLE agent_clients
  ADD COLUMN IF NOT EXISTS agent_name 
    TEXT DEFAULT 'Meera',
  ADD COLUMN IF NOT EXISTS tagline TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS working_hours TEXT,
  ADD COLUMN IF NOT EXISTS primary_language 
    TEXT DEFAULT 'English',
  ADD COLUMN IF NOT EXISTS response_style 
    TEXT DEFAULT 'Friendly',
  ADD COLUMN IF NOT EXISTS response_length 
    TEXT DEFAULT 'Medium',
  ADD COLUMN IF NOT EXISTS use_emojis 
    BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS collect_lead_info 
    BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS use_urgency 
    BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS business_type 
    TEXT DEFAULT 'digital_saas',
  ADD COLUMN IF NOT EXISTS primary_audience TEXT,
  ADD COLUMN IF NOT EXISTS key_selling_points TEXT,
  ADD COLUMN IF NOT EXISTS handoff_number TEXT,
  ADD COLUMN IF NOT EXISTS handoff_triggers TEXT,
  ADD COLUMN IF NOT EXISTS handoff_message TEXT,
  ADD COLUMN IF NOT EXISTS restrictions TEXT,
  ADD COLUMN IF NOT EXISTS competitors TEXT,
  ADD COLUMN IF NOT EXISTS advanced_instructions TEXT,
  ADD COLUMN IF NOT EXISTS special_offers TEXT,
  ADD COLUMN IF NOT EXISTS type_specific_data JSONB,
  ADD COLUMN IF NOT EXISTS gemini_api_key TEXT,
  ADD COLUMN IF NOT EXISTS owner_name TEXT,
  ADD COLUMN IF NOT EXISTS owner_phone TEXT,
  ADD COLUMN IF NOT EXISTS server_user TEXT DEFAULT 'ubuntu',
  ADD COLUMN IF NOT EXISTS ssh_private_key TEXT,
  ADD COLUMN IF NOT EXISTS google_sheet_id TEXT,
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS portal_password TEXT,
  ADD COLUMN IF NOT EXISTS portal_created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS license_key TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS installed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS current_otp TEXT,
  ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS provisioning_logs TEXT[],
  ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS terms_version TEXT,
  ADD COLUMN IF NOT EXISTS accepted_from_ip TEXT,
  ADD COLUMN IF NOT EXISTS bot_protection_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS bot_protection_applied_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT 'creating',
  ADD COLUMN IF NOT EXISTS instance_name TEXT,
  ADD COLUMN IF NOT EXISTS server_ip TEXT,
  ADD COLUMN IF NOT EXISTS install_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS install_triggered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS shopify_store_url TEXT,
  ADD COLUMN IF NOT EXISTS shopify_api_key TEXT,
  ADD COLUMN IF NOT EXISTS cached_status TEXT DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS status_checked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at 
    TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS hermes_profile 
    TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS shared_server_ip 
    TEXT DEFAULT NULL;

-- Partial unique index to allow unlimited legacy clients but enforce multi-tenant uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_hermes_profile
  ON agent_clients (hermes_profile)
  WHERE hermes_profile IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agent_clients_profile 
  ON agent_clients(hermes_profile);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_orders_email 
  ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_order_id 
  ON orders(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_product 
  ON orders(sanity_product_id);
CREATE INDEX IF NOT EXISTS idx_coupons_code 
  ON coupons(code);

-- AUTO UPDATE updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS orders_updated_at ON orders;
CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS clients_updated_at 
  ON agent_clients;
CREATE TRIGGER clients_updated_at
  BEFORE UPDATE ON agent_clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RPC for incrementing coupon usage counts
CREATE OR REPLACE FUNCTION increment_coupon_uses(coupon_code TEXT)
RETURNS void AS $$
  UPDATE coupons 
  SET uses_count = uses_count + 1
  WHERE code = coupon_code;
$$ LANGUAGE sql SECURITY DEFINER;

-- ALTER PRODUCTS TABLE
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS demo_url TEXT,
  ADD COLUMN IF NOT EXISTS demo_type TEXT DEFAULT 'Video';

-- ALTER AGENT_CLIENTS TABLE FOR MULTI-TENANCY CONNECTION TYPES
ALTER TABLE agent_clients
  ADD COLUMN IF NOT EXISTS connection_type TEXT DEFAULT 'baileys',
  ADD COLUMN IF NOT EXISTS whatsapp_phone_number_id TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_access_token TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_app_secret TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_waba_id TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_verify_token TEXT,
  ADD COLUMN IF NOT EXISTS intended_connection_type TEXT DEFAULT NULL;

