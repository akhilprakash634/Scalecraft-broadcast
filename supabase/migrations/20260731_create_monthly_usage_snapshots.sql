-- Migration: Create monthly_usage_snapshots table for billing invoice history
-- All changes are idempotent.

CREATE TABLE IF NOT EXISTS public.monthly_usage_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id TEXT NOT NULL,
  month TEXT NOT NULL, -- e.g. "July 2026"
  message_count INTEGER DEFAULT 0,
  gemini_cost NUMERIC DEFAULT 0,
  server_cost NUMERIC DEFAULT 700,
  service_fee NUMERIC DEFAULT 599,
  meta_cost NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'Paid',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_client_month UNIQUE (client_id, month)
);

ALTER TABLE public.monthly_usage_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read on monthly_usage_snapshots" ON public.monthly_usage_snapshots FOR SELECT USING (true);
