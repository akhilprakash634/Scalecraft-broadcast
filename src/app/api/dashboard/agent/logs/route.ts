import { NextResponse } from 'next/server';
import { getSessionClient } from '@/lib/auth';
import { executeCommand, hermesCmd, getClientServerIp } from '@/lib/ssh';

export async function GET() {
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

    const serviceName = client.hermesProfile ? `hermes-gateway-${client.hermesProfile}` : 'hermes-gateway';
    const result = await executeCommand(
      serverIP,
      sshPrivateKey,
      hermesCmd(`journalctl --user -u ${serviceName} -n 50 --no-pager`),
      serverUser || 'ubuntu'
    );

    if (result.exitCode !== 0 && !result.stdout) {
      return NextResponse.json({ error: `Failed to fetch logs: ${result.stderr}` }, { status: 500 });
    }

    return NextResponse.json({ logs: result.stdout || 'No logs generated yet.' });
  } catch (error: any) {
    console.error('Agent Logs API Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
