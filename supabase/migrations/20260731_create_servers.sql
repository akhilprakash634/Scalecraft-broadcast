-- Create servers table
CREATE TABLE IF NOT EXISTS public.servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip TEXT UNIQUE NOT NULL,
  ssh_key_ref TEXT DEFAULT 'SHARED_SERVER_SSH_KEY',
  ssh_user TEXT DEFAULT 'ubuntu',
  max_capacity INTEGER DEFAULT 15,
  current_client_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active', -- active | full | maintenance | decommissioned
  region TEXT DEFAULT 'ap-south-1',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security (RLS) with zero public policies.
-- This ensures only the admin service role key (which bypasses RLS) can read/write to this table.
ALTER TABLE public.servers ENABLE ROW LEVEL SECURITY;

-- Insert initial row for the existing server, setting count dynamically
INSERT INTO public.servers (ip, current_client_count, notes)
VALUES (
  '13.206.143.171',
  (SELECT COUNT(*) FROM public.agent_clients WHERE shared_server_ip = '13.206.143.171'),
  'Initial shared server setup'
)
ON CONFLICT (ip) DO UPDATE 
SET current_client_count = EXCLUDED.current_client_count;

-- Atomic RPC function to increment client count
CREATE OR REPLACE FUNCTION public.increment_server_client_count(server_ip TEXT)
RETURNS void AS $$
BEGIN
  UPDATE public.servers
  SET current_client_count = current_client_count + 1
  WHERE ip = server_ip;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic RPC function to decrement client count
CREATE OR REPLACE FUNCTION public.decrement_server_client_count(server_ip TEXT)
RETURNS void AS $$
BEGIN
  UPDATE public.servers
  SET current_client_count = GREATEST(0, current_client_count - 1)
  WHERE ip = server_ip;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
