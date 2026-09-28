-- Add Flow Auto-Start settings to agent_clients
ALTER TABLE public.agent_clients
ADD COLUMN IF NOT EXISTS flow_auto_start BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS flow_auto_start_message TEXT DEFAULT 'Hi 👋 Welcome! How can we help you today?',
ADD COLUMN IF NOT EXISTS flow_auto_start_id TEXT;

-- Create Flow Sessions table
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

-- Index for checking active sessions quickly
CREATE INDEX IF NOT EXISTS idx_whatsapp_flow_sessions_active 
ON public.whatsapp_flow_sessions(business_id, contact_id)
WHERE status = 'active';
