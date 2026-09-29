-- ScaleCraft Broadcast - Single-Tenant Installation SQL
-- This script must be run once in the Supabase SQL Editor on a fresh project.
-- It creates the complete isolated database schema for an individual business.

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. BUSINESS SETTINGS (agent_clients)
-- ==========================================
-- This table stores the single-tenant business profile and WhatsApp configuration.
CREATE TABLE IF NOT EXISTS public.agent_clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID, -- References auth.users(id) for the single tenant admin
    name TEXT NOT NULL,
    whatsapp_phone_number_id TEXT,
    whatsapp_business_account_id TEXT,
    whatsapp_access_token TEXT,
    meta_app_id TEXT,
    meta_app_secret TEXT,
    timezone TEXT DEFAULT 'UTC',
    
    -- Flow Settings
    flow_auto_start BOOLEAN DEFAULT false,
    flow_auto_start_message TEXT DEFAULT 'Hi 👋 Welcome! How can we help you today?',
    flow_auto_start_id TEXT,

    -- Legacy/Additional fields used in the codebase
    owner_phone TEXT,
    server_ip TEXT,
    ssh_private_key TEXT,
    server_user TEXT DEFAULT 'ubuntu',
    gemini_api_key TEXT,
    google_sheet_id TEXT,
    plan TEXT DEFAULT 'starter',
    setup_date TIMESTAMP WITH TIME ZONE,
    monthly_usage INTEGER DEFAULT 0,
    license_key TEXT,
    current_otp TEXT,
    otp_expires_at TIMESTAMP WITH TIME ZONE,
    portal_created_at TIMESTAMP WITH TIME ZONE,
    provisioning_logs JSONB,
    hermes_profile TEXT,
    shared_server_ip TEXT,
    type_specific_data TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 2. CONTACTS (whatsapp_contacts)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.whatsapp_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.agent_clients(id) ON DELETE CASCADE,
    name TEXT,
    phone TEXT NOT NULL,
    normalized_phone TEXT NOT NULL,
    opt_in BOOLEAN DEFAULT true,
    opt_in_source TEXT,
    opt_in_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'active',
    tags JSONB DEFAULT '[]'::jsonb,
    last_contacted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(business_id, normalized_phone)
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_business ON public.whatsapp_contacts(business_id);

-- ==========================================
-- 3. CONVERSATIONS (whatsapp_conversations)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.whatsapp_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.agent_clients(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES public.whatsapp_contacts(id) ON DELETE CASCADE,
    unread_count INTEGER DEFAULT 0,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(business_id, contact_id)
);

-- ==========================================
-- 4. MESSAGES (whatsapp_messages)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.agent_clients(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES public.whatsapp_contacts(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
    whatsapp_message_id TEXT UNIQUE,
    content TEXT,
    type TEXT DEFAULT 'text',
    direction TEXT NOT NULL,
    status TEXT DEFAULT 'sent',
    media_url TEXT,
    error_code TEXT,
    error_message TEXT,
    campaign_id UUID, -- For broadcasts
    flow_submission_id UUID,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_conversation ON public.whatsapp_messages(conversation_id);

-- ==========================================
-- 5. BROADCAST CAMPAIGNS (whatsapp_campaigns)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.whatsapp_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.agent_clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    template_name TEXT NOT NULL,
    template_language TEXT DEFAULT 'en',
    template_components JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'draft',
    scheduled_at TIMESTAMP WITH TIME ZONE,
    total_recipients INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    read_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 6. BROADCAST RECIPIENTS (whatsapp_campaign_recipients)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.whatsapp_campaign_recipients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES public.whatsapp_campaigns(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES public.whatsapp_contacts(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES public.agent_clients(id) ON DELETE CASCADE,
    message_id UUID REFERENCES public.whatsapp_messages(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending',
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(campaign_id, contact_id)
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_campaign_recipients_campaign ON public.whatsapp_campaign_recipients(campaign_id);

-- ==========================================
-- 7. FLOWS (whatsapp_flows)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.whatsapp_flows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.agent_clients(id) ON DELETE CASCADE,
    meta_flow_id TEXT NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL,
    category TEXT,
    version TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(business_id, meta_flow_id)
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_flows_business_id ON public.whatsapp_flows(business_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_flows_meta_flow_id ON public.whatsapp_flows(meta_flow_id);

-- ==========================================
-- 8. FLOW SUBMISSIONS (whatsapp_flow_submissions)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.whatsapp_flow_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.agent_clients(id) ON DELETE CASCADE,
    flow_id TEXT NOT NULL,
    flow_name TEXT,
    phone_number TEXT NOT NULL,
    contact_id UUID REFERENCES public.whatsapp_contacts(id) ON DELETE SET NULL,
    message_id TEXT NOT NULL,
    response_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    reference_number TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'NEW',
    raw_payload JSONB,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(message_id)
);
CREATE INDEX IF NOT EXISTS idx_flow_sub_business ON public.whatsapp_flow_submissions(business_id);
CREATE INDEX IF NOT EXISTS idx_flow_sub_contact ON public.whatsapp_flow_submissions(contact_id);
CREATE INDEX IF NOT EXISTS idx_flow_sub_flow ON public.whatsapp_flow_submissions(flow_id);

-- ==========================================
-- 9. FLOW SESSIONS (whatsapp_flow_sessions)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.whatsapp_flow_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.agent_clients(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES public.whatsapp_contacts(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
    phone_number TEXT NOT NULL,
    flow_id TEXT NOT NULL,
    flow_token TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_flow_sessions_active 
ON public.whatsapp_flow_sessions(business_id, contact_id)
WHERE status = 'active';

-- ==========================================
-- 10. BROADCAST ROTATIONS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.whatsapp_broadcast_rotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.agent_clients(id) ON DELETE CASCADE,
    cycle_number INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'active',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wb_rotations_business_status ON public.whatsapp_broadcast_rotations(business_id, status);

CREATE TABLE IF NOT EXISTS public.whatsapp_broadcast_rotation_recipients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rotation_id UUID NOT NULL REFERENCES public.whatsapp_broadcast_rotations(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES public.agent_clients(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES public.whatsapp_contacts(id) ON DELETE CASCADE,
    campaign_id UUID,
    message_id UUID,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(rotation_id, contact_id)
);
CREATE INDEX IF NOT EXISTS idx_wb_rot_recipients_rotation ON public.whatsapp_broadcast_rotation_recipients(rotation_id);
CREATE INDEX IF NOT EXISTS idx_wb_rot_recipients_campaign ON public.whatsapp_broadcast_rotation_recipients(campaign_id);

-- ==========================================
-- 11. AUDIT LOGGING (admin_audit_log)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID,
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Setup Single-Tenant Initialization Trigger
-- This ensures that when the administrator first logs in, they are linked to the single business profile.
-- Alternatively, this can be done via API on first login. For safety, we keep RLS open to authenticated users on their own records.

-- RLS (Row Level Security) - Basic Setup for Single-Tenant
ALTER TABLE public.agent_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_campaign_recipients ENABLE ROW LEVEL SECURITY;

-- Create policies allowing authenticated users full access in a single-tenant environment
CREATE POLICY "Enable ALL for authenticated users" ON public.agent_clients FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable ALL for authenticated users" ON public.whatsapp_contacts FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable ALL for authenticated users" ON public.whatsapp_conversations FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable ALL for authenticated users" ON public.whatsapp_messages FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable ALL for authenticated users" ON public.whatsapp_campaigns FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable ALL for authenticated users" ON public.whatsapp_campaign_recipients FOR ALL TO authenticated USING (true);
