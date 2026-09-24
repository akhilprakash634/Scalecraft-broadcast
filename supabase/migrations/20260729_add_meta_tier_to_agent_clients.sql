-- Migration: Add Meta API caching fields, broadcast_audit logs column, and broadcast_recipient_logs table
ALTER TABLE public.agent_clients ADD COLUMN IF NOT EXISTS meta_limit_tier TEXT;
ALTER TABLE public.agent_clients ADD COLUMN IF NOT EXISTS meta_quality_rating TEXT;
ALTER TABLE public.agent_clients ADD COLUMN IF NOT EXISTS meta_limit_expires_at TIMESTAMPTZ;
ALTER TABLE public.agent_clients ADD COLUMN IF NOT EXISTS meta_throughput_limit INTEGER DEFAULT 80;

ALTER TABLE public.broadcast_audit ADD COLUMN IF NOT EXISTS logs TEXT[] DEFAULT '{}';

CREATE TABLE IF NOT EXISTS public.broadcast_recipient_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id TEXT NOT NULL,
  campaign_id UUID NOT NULL,
  phone TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  is_new_session BOOLEAN DEFAULT TRUE
);

-- Enable RLS and add basic select policy
ALTER TABLE public.broadcast_recipient_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read on broadcast_recipient_logs" ON public.broadcast_recipient_logs FOR SELECT USING (true);

-- Add last_customer_message_at column to leads_cache table for exact 24h session tracking
ALTER TABLE public.leads_cache ADD COLUMN IF NOT EXISTS last_customer_message_at TIMESTAMPTZ;

-- Index for fast daily headroom queries: unique phones sent today as new sessions
CREATE INDEX IF NOT EXISTS idx_brl_client_sent_at
  ON public.broadcast_recipient_logs (client_id, sent_at)
  WHERE is_new_session = true;
