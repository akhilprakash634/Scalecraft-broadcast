import { NextResponse } from 'next/server';
import { getSessionClient } from '@/lib/auth';
import { pauseAgentEmergency, getClientServerIp } from '@/lib/ssh';

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

    // Call emergency pause (pass simulated current daily usage and estimated cost as 0 if not tracking here)
    const success = await pauseAgentEmergency(client, sshPrivateKey, 0, 0, serverUser || 'ubuntu');

    return NextResponse.json({
      success,
      message: 'Agent emergency pause command successfully executed.',
    });
  } catch (error: any) {
    console.error('Agent Emergency Pause API Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
