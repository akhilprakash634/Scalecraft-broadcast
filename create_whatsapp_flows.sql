-- Create whatsapp_flows table
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

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_whatsapp_flows_business_id ON public.whatsapp_flows(business_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_flows_meta_flow_id ON public.whatsapp_flows(meta_flow_id);
