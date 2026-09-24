-- ==============================================================================
-- Supabase Security Advisor Master Fix Script (v2 - View Safe)
-- Resolves "RLS Policy Always True", "Public Can Execute SECURITY DEFINER Function",
-- and "Multiple Permissive Policies" warnings across all public tables.
-- ==============================================================================

-- 1. CLEAN UP ALL EXISTING POLICIES TO ELIMINATE MULTIPLE PERMISSIVE POLICIES
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN (
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;', pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- 2. DYNAMICALLY ENSURE RLS IS ENABLED ON ALL BASE TABLES IN PUBLIC SCHEMA
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
    END LOOP;
END $$;

-- 3. HELPER FUNCTION TO ATTACH RLS POLICIES ONLY ON ACTUAL BASE TABLES (NOT VIEWS)
CREATE OR REPLACE FUNCTION public._create_table_policy(
    p_table_name TEXT,
    p_policy_name TEXT DEFAULT 'Public Read Access'
) RETURNS VOID AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = p_table_name
    ) THEN
        EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (true);', p_policy_name, p_table_name);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 4. PUBLIC STOREFRONT & CATALOG TABLES (ONLY BASE TABLES)
SELECT public._create_table_policy('saas_products');
SELECT public._create_table_policy('product_media');
SELECT public._create_table_policy('categories');
SELECT public._create_table_policy('product_faqs');
SELECT public._create_table_policy('product_downloads');
SELECT public._create_table_policy('product_analytics');
SELECT public._create_table_policy('blog_posts');
SELECT public._create_table_policy('offers');
SELECT public._create_table_policy('testimonials');
SELECT public._create_table_policy('faqs');
SELECT public._create_table_policy('site_settings');
SELECT public._create_table_policy('products');
SELECT public._create_table_policy('announcements');

-- 5. PUBLIC OPERATIONAL & CLIENT TABLES
SELECT public._create_table_policy('portal_users');
SELECT public._create_table_policy('installation_status');
SELECT public._create_table_policy('installation_logs');
SELECT public._create_table_policy('notifications');
SELECT public._create_table_policy('broadcast_jobs');
SELECT public._create_table_policy('leads_cache');
SELECT public._create_table_policy('usage_alerts');
SELECT public._create_table_policy('broadcast_audit');
SELECT public._create_table_policy('newsletter_subscribers');
SELECT public._create_table_policy('rate_limits');

-- 6. SENSITIVE / RESTRICTED TABLES (RLS ENABLED, NO PUBLIC POLICIES)
-- Tables: orders, agent_clients, coupons, admin_audit_log, license_keys
-- RLS is enabled, but NO public SELECT policy is created.
-- Service Role (supabaseAdmin) automatically bypasses RLS and handles all backend API routes securely,
-- while unauthenticated public REST endpoints cannot read sensitive order/client data.
-- This resolves "RLS Policy Always True" warnings on orders, agent_clients, and coupons!

-- 7. RESTRICT SECURITY DEFINER FUNCTION EXECUTION PERMISSIONS
-- Lock down SECURITY DEFINER functions so PUBLIC / anon cannot execute them arbitrarily.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' AND p.proname = 'increment_coupon_uses'
    ) THEN
        REVOKE EXECUTE ON FUNCTION public.increment_coupon_uses(TEXT) FROM PUBLIC, anon, authenticated;
        GRANT EXECUTE ON FUNCTION public.increment_coupon_uses(TEXT) TO service_role;
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' AND p.proname = 'rls_auto_enable'
    ) THEN
        REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
        GRANT EXECUTE ON FUNCTION public.rls_auto_enable() TO service_role;
    END IF;
END $$;

-- Cleanup temporary helper function
DROP FUNCTION IF EXISTS public._create_table_policy(TEXT, TEXT);
