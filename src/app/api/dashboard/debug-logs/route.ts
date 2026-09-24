import { NextResponse } from 'next/server';
import { executeCommand } from '@/lib/ssh';
import { supabaseAdmin } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const { data: clients, error } = await supabaseAdmin
      .from('agent_clients')
      .select('server_ip, ssh_private_key')
      .not('ssh_private_key', 'is', null)
      .limit(1);
    
    if (error) throw error;
    const client = clients?.[0];
    if (!client) throw new Error('No client found with SSH key');

    const ip = process.env.SHARED_SERVER_IP || client.server_ip || '13.206.143.171';
    let key = process.env.SHARED_SERVER_SSH_KEY || client.ssh_private_key || '';
    if (typeof key === 'string') {
      key = key.replace(/\\n/g, '\n');
    }
    const cmd = `cat /home/ubuntu/.hermes/hermes-agent/venv/lib/python3.10/site-packages/tools/tts_tool.py`;
    const res = await executeCommand(ip, key, cmd, 'ubuntu');
    
    return NextResponse.json({ 
      cmd_output: res.stdout,
      err: res.stderr
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message });
  }
}
