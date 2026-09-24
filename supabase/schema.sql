-- 1. Create Tables
CREATE TABLE IF NOT EXISTS portal_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id TEXT NOT NULL UNIQUE, -- links to Sanity agentClient._id
  bot_phone TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  business_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  portal_created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  password_changed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS installation_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'pending', -- pending, provisioning, installing, active, failed
  current_step INTEGER DEFAULT 0,
  total_steps INTEGER DEFAULT 9,
  step_description TEXT,
  server_ip TEXT,
  instance_name TEXT,
  license_key TEXT,
  installed_at TIMESTAMPTZ,
  failed_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS installation_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id TEXT NOT NULL,
  log_message TEXT NOT NULL,
  log_level TEXT DEFAULT 'info', -- info, success, error, warning
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_installation_logs_client ON installation_logs(client_id, created_at);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id TEXT NOT NULL,
  type TEXT NOT NULL, -- installation_update, billing_reminder, system_alert, announcement
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  action_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_client_read ON notifications(client_id, read);

CREATE TABLE IF NOT EXISTS announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info', -- info, warning, success
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS broadcast_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id TEXT NOT NULL,
  job_type TEXT DEFAULT 'cold_outreach',
  total_leads INTEGER,
  sent INTEGER DEFAULT 0,
  failed INTEGER DEFAULT 0,
  status TEXT DEFAULT 'running',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE portal_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE installation_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE installation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcast_jobs ENABLE ROW LEVEL SECURITY;

-- 3. RLS Select Policies (Bridges custom JWT session with anon browser client select/subscriptions)
CREATE POLICY "Allow public read on portal_users" ON portal_users FOR SELECT USING (true);
CREATE POLICY "Allow public read on installation_status" ON installation_status FOR SELECT USING (true);
CREATE POLICY "Allow public read on installation_logs" ON installation_logs FOR SELECT USING (true);
CREATE POLICY "Allow public read on notifications" ON notifications FOR SELECT USING (true);
CREATE POLICY "Allow public read on announcements" ON announcements FOR SELECT USING (true);
CREATE POLICY "Allow public read on broadcast_jobs" ON broadcast_jobs FOR SELECT USING (true);

-- 4. Leads Intelligence Cache Updates
CREATE TABLE IF NOT EXISTS leads_cache (
  phone TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  name TEXT,
  intent TEXT,
  category TEXT, -- 5 core categories
  requirements JSONB DEFAULT '{}'::jsonb,
  summary TEXT,
  next_action TEXT,
  analyzed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

ALTER TABLE leads_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read on leads_cache" ON leads_cache FOR SELECT USING (true);

ALTER TABLE leads_cache ADD COLUMN IF NOT EXISTS
  session_file TEXT,
  total_messages INTEGER DEFAULT 0,
  user_messages INTEGER DEFAULT 0,
  agent_messages INTEGER DEFAULT 0,
  first_message_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,
  days_since_last INTEGER,
  language TEXT DEFAULT 'english',
  intent_score INTEGER DEFAULT 0,
  buying_signals JSONB DEFAULT '[]',
  negative_signals JSONB DEFAULT '[]',
  follow_up_signals JSONB DEFAULT '[]',
  products_mentioned JSONB DEFAULT '[]',
  shared_phone TEXT,
  shared_name TEXT,
  is_converted BOOLEAN DEFAULT FALSE,
  order_product TEXT,
  order_amount INTEGER,
  order_date TIMESTAMPTZ,
  order_id TEXT,
  is_dnd BOOLEAN DEFAULT FALSE,
  follow_up_date TIMESTAMPTZ,
  follow_up_sent BOOLEAN DEFAULT FALSE,
  notes TEXT,
  manual_status TEXT,
  last_analyzed_at TIMESTAMPTZ,
  last_analyzed_message_hash TEXT,
  category TEXT,
  follow_up_score INTEGER DEFAULT 0,
  follow_up_reason TEXT,
  is_price_sensitive BOOLEAN DEFAULT FALSE,
  price_signals_found JSONB DEFAULT '[]',
  customer_questions INTEGER DEFAULT 0,
  last_message_from TEXT DEFAULT 'unknown';

CREATE TABLE IF NOT EXISTS usage_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id TEXT NOT NULL,
  alert_type TEXT NOT NULL,
  message TEXT NOT NULL,
  current_value INTEGER,
  threshold_value INTEGER,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE usage_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read on usage_alerts" ON usage_alerts FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS broadcast_audit (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id TEXT NOT NULL,
  campaign_type TEXT,
  recipient_count INTEGER,
  sent INTEGER DEFAULT 0,
  failed INTEGER DEFAULT 0,
  status TEXT DEFAULT 'running',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE broadcast_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read on broadcast_audit" ON broadcast_audit FOR SELECT USING (true);


-- 5. Smart Follow-up Lock and Audit Columns
ALTER TABLE leads_cache
  ADD COLUMN IF NOT EXISTS follow_up_locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS follow_up_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS follow_up_message TEXT,
  ADD COLUMN IF NOT EXISTS follow_up_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMPTZ;

-- Atomic lock claim function
CREATE OR REPLACE FUNCTION claim_followup_lead(
  p_phone TEXT
) RETURNS BOOLEAN 
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_claimed BOOLEAN;
BEGIN
  UPDATE public.leads_cache
  SET follow_up_locked_at = NOW()
  WHERE phone = p_phone
    AND follow_up_sent = false
    AND (
      follow_up_locked_at IS NULL OR
      follow_up_locked_at < NOW() - INTERVAL '10 minutes'
    )
    AND follow_up_count < 1
  RETURNING true INTO v_claimed;
  
  RETURN COALESCE(v_claimed, false);
END;
$$;

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  source TEXT DEFAULT 'website',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read on newsletter_subscribers" ON newsletter_subscribers FOR SELECT USING (true);

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS country_code TEXT;

-- Dynamic RLS Enabler for all public schema tables
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
    END LOOP;
END $$;

