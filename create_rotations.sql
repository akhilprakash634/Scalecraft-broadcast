-- Create whatsapp_broadcast_rotations table
CREATE TABLE IF NOT EXISTS public.whatsapp_broadcast_rotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.agent_clients(id) ON DELETE CASCADE,
    cycle_number INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'active',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create whatsapp_broadcast_rotation_recipients table
CREATE TABLE IF NOT EXISTS public.whatsapp_broadcast_rotation_recipients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rotation_id UUID NOT NULL REFERENCES public.whatsapp_broadcast_rotations(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES public.agent_clients(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES public.whatsapp_contacts(id) ON DELETE CASCADE,
    campaign_id UUID, -- Can be linked after the campaign is created
    message_id UUID,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE,
    
    -- UNIQUE constraint to prevent duplicate contacts in the same rotation
    UNIQUE(rotation_id, contact_id)
);

-- Create indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_wb_rotations_business_status ON public.whatsapp_broadcast_rotations(business_id, status);
CREATE INDEX IF NOT EXISTS idx_wb_rot_recipients_rotation ON public.whatsapp_broadcast_rotation_recipients(rotation_id);
CREATE INDEX IF NOT EXISTS idx_wb_rot_recipients_campaign ON public.whatsapp_broadcast_rotation_recipients(campaign_id);
