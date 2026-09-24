-- Migration: Update claim_followup_lead with tenant isolation and inbound message check

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
    AND (last_customer_message_at IS NULL OR follow_up_date IS NULL OR last_customer_message_at < follow_up_date)
  RETURNING true INTO v_claimed;
  
  RETURN COALESCE(v_claimed, false);
END;
$$;

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
    AND (last_customer_message_at IS NULL OR follow_up_date IS NULL OR last_customer_message_at < follow_up_date)
  RETURNING true INTO v_claimed;
  
  RETURN COALESCE(v_claimed, false);
END;
$$;
