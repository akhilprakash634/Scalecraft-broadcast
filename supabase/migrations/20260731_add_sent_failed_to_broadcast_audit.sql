-- Migration: Add sent and failed columns to broadcast_audit table
-- All changes are idempotent.

ALTER TABLE public.broadcast_audit
  ADD COLUMN IF NOT EXISTS sent INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS failed INTEGER DEFAULT 0;
