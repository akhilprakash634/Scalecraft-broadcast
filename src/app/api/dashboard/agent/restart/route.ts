import { NextResponse } from 'next/server';
import { getSessionClient } from '@/lib/auth';
import { restartAgent, getClientServerIp } from '@/lib/ssh';

export async function POST() {
  try {
    const client = await getSessionClient();
    if (!client) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serverIP = getClientServerIp(client);
    const { sshPrivateKey, serverUser } = client;
    if (!serverIP || !sshPrivateKey) {
      return NextResponse.json({ error: 'Server details missing' }, { status: 400 });
    }

    const active = await restartAgent(client, sshPrivateKey, serverUser || 'ubuntu');
    // Even if the post-restart status check shows inactive, return success -
    // the gateway may still be starting up. The dashboard polls every 30s.
    if (!active) {
      console.warn('[restart] Gateway restart issued but service not yet active');
    }
    return NextResponse.json({ success: true, active, message: active ? 'Agent gateway restarted and running.' : 'Restart command issued - gateway still starting up, check status in 15s.' });
  } catch (error: any) {
    console.error('Agent Restart API Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
