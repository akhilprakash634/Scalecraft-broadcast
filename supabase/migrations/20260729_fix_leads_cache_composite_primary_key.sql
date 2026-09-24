-- Migration: Fix leads_cache tenant isolation
-- 1. Drop existing primary key on phone
ALTER TABLE public.leads_cache DROP CONSTRAINT IF EXISTS leads_cache_pkey CASCADE;

-- 2. Add client_id and phone as composite primary key
ALTER TABLE public.leads_cache ADD PRIMARY KEY (client_id, phone);

-- 3. Re-create claim_followup_lead function with client_id filtering
CREATE OR REPLACE FUNCTION claim_followup_lead(
  p_client_id TEXT,
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
  WHERE client_id = p_client_id
    AND phone = p_phone
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
