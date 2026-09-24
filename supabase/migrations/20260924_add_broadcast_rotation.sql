-- Migration: Add contact rotation logic fields

-- 1. Add current_broadcast_cycle to agent_clients
ALTER TABLE public.agent_clients 
ADD COLUMN IF NOT EXISTS current_broadcast_cycle INTEGER DEFAULT 1;

-- 2. Add last_broadcast_cycle to contacts
ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS last_broadcast_cycle INTEGER DEFAULT 0;

-- 3. Add last_broadcast_cycle to leads_cache
ALTER TABLE public.leads_cache 
ADD COLUMN IF NOT EXISTS last_broadcast_cycle INTEGER DEFAULT 0;
