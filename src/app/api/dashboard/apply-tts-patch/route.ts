import { NextResponse } from 'next/server';
import { executeCommand } from '@/lib/ssh';
import { supabaseAdmin } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // 1. Get the SSH Key for the production VPS from the database
    const { data: clients, error } = await supabaseAdmin
      .from('agent_clients')
      .select('server_ip, ssh_private_key')
      .not('ssh_private_key', 'is', null)
      .limit(1);
    
    if (error) throw error;
    const client = clients?.[0];
    if (!client) {
      return NextResponse.json({ error: 'No client with SSH key found in database' }, { status: 400 });
    }

    const ip = process.env.SHARED_SERVER_IP || client.server_ip || '13.206.143.171';
    let key = process.env.SHARED_SERVER_SSH_KEY || client.ssh_private_key || '';
    if (typeof key === 'string') {
      key = key.replace(/\\n/g, '\n');
    }

    // 2. Read the local patch_tts.py script
    const scriptPath = path.join(process.cwd(), 'patch_tts.py');
    const pythonScript = fs.readFileSync(scriptPath, 'utf-8');

    // 3. Execute the script on the VPS
    // We run it by passing the script contents to `python3 -c`
    const escapedScript = pythonScript.replace(/'/g, "'\\''"); // Escape single quotes for bash
    const cmd = `python3 -c '${escapedScript}'`;
    
    const res = await executeCommand(ip, key, cmd, 'ubuntu');
    
    if (res.exitCode !== 0) {
      return NextResponse.json({ 
        error: 'Failed to patch VPS', 
        stdout: res.stdout,
        stderr: res.stderr 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Successfully patched TTS logic on Hermes VPS',
      stdout: res.stdout
    });
  } catch (e: any) {
    console.error('Error applying patch:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
