import { supabaseAdmin } from './supabase';

export interface ServerRecord {
  id: string;
  ip: string;
  ssh_key_ref: string;
  ssh_user: string;
  max_capacity: number;
  current_client_count: number;
  status: 'active' | 'full' | 'maintenance' | 'decommissioned';
  region: string;
  notes?: string;
  created_at: string;
}

export async function getServerForNewClient(): Promise<ServerRecord> {
  const { data, error } = await supabaseAdmin
    .from('servers')
    .select('*')
    .eq('status', 'active')
    .order('current_client_count', { ascending: true });

  if (error) throw error;
  const available = (data || []).find(s => s.current_client_count < s.max_capacity);
  if (!available) {
    throw new Error('No server capacity available — register a new server before provisioning more clients.');
  }
  return available as ServerRecord;
}
