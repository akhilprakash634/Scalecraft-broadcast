-- Migration: Add crm_stage_templates column to agent_clients
-- All changes are idempotent.

ALTER TABLE public.agent_clients ADD COLUMN IF NOT EXISTS crm_stage_templates JSONB DEFAULT '{}'::jsonb;
