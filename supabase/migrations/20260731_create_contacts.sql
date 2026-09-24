-- Migration: Create contacts table for address book management
-- All changes are idempotent.

CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id TEXT NOT NULL,
  phone TEXT NOT NULL,
  name TEXT,
  group_tags TEXT[] DEFAULT '{}',
  source TEXT DEFAULT 'import', -- 'import' | 'manual' | 'synced_from_leads'
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  is_dnd BOOLEAN DEFAULT false,
  
  CONSTRAINT unique_client_contact_phone UNIQUE (client_id, phone)
);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read on contacts" ON public.contacts FOR SELECT USING (true);
CREATE POLICY "Allow public write on contacts" ON public.contacts FOR ALL USING (true);
