import { NextResponse } from 'next/server';
import { getSessionClient } from '@/lib/auth';
import { executeCommand, hermesCmd, restartAgent } from '@/lib/ssh';

export async function POST() {
  try {
    const client = await getSessionClient();
    if (!client) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { serverIP, sshPrivateKey, serverUser } = client;
    if (!serverIP || !sshPrivateKey) {
      return NextResponse.json({ error: 'Server details missing' }, { status: 400 });
    }

    const fixConfigCommand = hermesCmd(`
      CONFIG_PATH=~/.hermes/config.yaml
      if [ -f "$CONFIG_PATH" ]; then
        sed -i 's/user_profile_enabled: true/user_profile_enabled: false/g' $CONFIG_PATH
        sed -i 's/mode: both/mode: context/g' $CONFIG_PATH
        hermes gateway restart whatsapp
      else
        echo "config.yaml not found"
        exit 1
      fi
    `);

    const res = await executeCommand(serverIP, sshPrivateKey, fixConfigCommand, serverUser || 'ubuntu');

    // Trigger systemd restart for maximum reliability
    await restartAgent(serverIP, sshPrivateKey, serverUser || 'ubuntu');

    if (res.exitCode !== 0) {
      return NextResponse.json({ error: `Failed to fix config: ${res.stderr || res.stdout}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, stdout: res.stdout });
  } catch (error: any) {
    console.error('Fix Session Config API Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
