-- Migration: Add billing/subscription tracking fields to agent_clients
-- All changes are idempotent (IF NOT EXISTS / DO NOTHING patterns).

ALTER TABLE public.agent_clients
  ADD COLUMN IF NOT EXISTS monthly_amount              NUMERIC         DEFAULT 1299,
  ADD COLUMN IF NOT EXISTS next_billing_date           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_payment_at             TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS billing_status              TEXT            DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS last_billing_reminder_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS billing_reminder_count      INTEGER         DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_payment_link_id     TEXT,
  ADD COLUMN IF NOT EXISTS current_payment_link_url    TEXT,
  ADD COLUMN IF NOT EXISTS payment_link_expires_at     TIMESTAMPTZ;

-- Backfill next_billing_date for existing standard clients.
-- Uses created_at (always present) to project forward to the next future 30-day cycle.
UPDATE public.agent_clients
SET next_billing_date = (
  created_at
  + (
      CEIL(
        EXTRACT(EPOCH FROM (NOW() - created_at)) / (30.0 * 86400)
      ) * INTERVAL '30 days'
    )
)
WHERE plan_type = 'standard'
  AND created_at IS NOT NULL
  AND next_billing_date IS NULL;

-- Index for fast overdue/due-soon lookups by admin reminders panel
CREATE INDEX IF NOT EXISTS idx_ac_billing_status_next_billing
  ON public.agent_clients (billing_status, next_billing_date)
  WHERE plan_type != 'trial';

-- Add setup_amount column (one-time setup fee, per-client configurable)
ALTER TABLE public.agent_clients
  ADD COLUMN IF NOT EXISTS setup_amount NUMERIC DEFAULT 6999;
