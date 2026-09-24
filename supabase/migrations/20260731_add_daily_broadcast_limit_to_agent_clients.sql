-- Migration: Add daily_broadcast_limit column to agent_clients table
ALTER TABLE public.agent_clients ADD COLUMN IF NOT EXISTS daily_broadcast_limit INTEGER;
