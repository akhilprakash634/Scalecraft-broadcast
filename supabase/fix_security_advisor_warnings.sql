-- ==============================================================================
-- Supabase Security Advisor Final Polish Script
-- Resolves Security Definer View, Function Search Path, and Duplicate Policy Warnings
-- ==============================================================================

-- 1. FIX SECURITY DEFINER VIEW WARNING (capacity_status)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'capacity_status'
    ) THEN
        ALTER VIEW public.capacity_status SET (security_invoker = true);
        RAISE NOTICE 'Updated public.capacity_status view to use security_invoker = true';
    END IF;
END $$;

-- 2. FIX FUNCTION SEARCH PATH MUTABLE WARNINGS
-- Explicitly lock down search_path = '' on stored functions to prevent search path hijacking (CWE-426)

-- Function: update_updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN 
  NEW.updated_at = now(); 
  RETURN NEW; 
END;
$$;

-- Function: increment_coupon_uses
CREATE OR REPLACE FUNCTION public.increment_coupon_uses(coupon_code TEXT)
RETURNS void 
LANGUAGE sql 
SECURITY DEFINER
SET search_path = ''
AS $$
  UPDATE public.coupons 
  SET uses_count = uses_count + 1
  WHERE code = coupon_code;
$$;

-- Function: claim_followup_lead
CREATE OR REPLACE FUNCTION public.claim_followup_lead(p_phone TEXT)
RETURNS BOOLEAN
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
  RETURNING true INTO v_claimed;
  
  RETURN COALESCE(v_claimed, false);
END;
$$;

-- Apply ALTER FUNCTION SET search_path = '' directly if functions already existed
ALTER FUNCTION public.update_updated_at() SET search_path = '';
ALTER FUNCTION public.increment_coupon_uses(TEXT) SET search_path = '';
ALTER FUNCTION public.claim_followup_lead(TEXT) SET search_path = '';


-- 3. CLEAN UP MULTIPLE PERMISSIVE POLICIES
-- Drop duplicate/multiple policies on broadcast_jobs and products, replacing with a single clean policy

DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'broadcast_jobs'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.broadcast_jobs;', pol.policyname);
    END LOOP;
END $$;
CREATE POLICY "Allow public read on broadcast_jobs" ON public.broadcast_jobs FOR SELECT USING (true);

DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'products'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.products;', pol.policyname);
    END LOOP;
END $$;
CREATE POLICY "Allow public read on products" ON public.products FOR SELECT USING (true);
