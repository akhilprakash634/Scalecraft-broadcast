-- Create whatsapp_flow_submissions table
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
    
    -- Idempotency constraint: A specific message ID from WhatsApp can only be recorded once
    UNIQUE(message_id)
);

CREATE INDEX IF NOT EXISTS idx_flow_sub_business ON public.whatsapp_flow_submissions(business_id);
CREATE INDEX IF NOT EXISTS idx_flow_sub_contact ON public.whatsapp_flow_submissions(contact_id);
CREATE INDEX IF NOT EXISTS idx_flow_sub_flow ON public.whatsapp_flow_submissions(flow_id);
