import { NextResponse } from 'next/server';
import { executeCommand } from '@/lib/ssh';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const { data: clients, error } = await supabaseAdmin
      .from('agent_clients')
      .select('server_ip, ssh_private_key, hermes_profile')
      .eq('hermes_profile', 'scalecraft')
      .limit(1);
    
    if (error) throw error;
    const client = clients?.[0];
    if (!client) {
      return NextResponse.json({ error: 'No client found' }, { status: 400 });
    }

    const ip = process.env.SHARED_SERVER_IP || client.server_ip || '13.206.143.171';
    let key = process.env.SHARED_SERVER_SSH_KEY || client.ssh_private_key || '';
    if (typeof key === 'string') {
      key = key.replace(/\\n/g, '\n');
    }
    
    const dbPath = `/home/ubuntu/.hermes/profiles/${client.hermes_profile}/state.db`;
    const cmd = `sqlite3 ${dbPath} "SELECT id, role, content FROM messages ORDER BY timestamp DESC LIMIT 20;"`;
    
    const res = await executeCommand(ip, key, cmd, 'ubuntu');
    
    return NextResponse.json({ 
      stdout: res.stdout,
      stderr: res.stderr 
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
