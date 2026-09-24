import { NextResponse } from 'next/server';
import { getSessionClient } from '@/lib/auth';
import { executeCommand, restartAgent, applyAntiBotConfig, getClientServerIp, buildHermesCmd } from '@/lib/ssh';

export async function POST(request: Request) {
  try {
    const client: any = await getSessionClient();
    if (!client) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { enabled } = await request.json();
    const serverIP = getClientServerIp(client);
    const { sshPrivateKey, serverUser } = client;
    if (!serverIP || !sshPrivateKey) {
      return NextResponse.json({ error: 'Server details missing' }, { status: 400 });
    }

    if (enabled) {
      await applyAntiBotConfig(client, sshPrivateKey, serverUser || 'ubuntu');
    } else {
      // Disable/unset anti-bot settings
      const profilePart = client.hermesProfile ? `-p ${client.hermesProfile} ` : '';
      const cmd = buildHermesCmd(client, 
        `config set max_messages_per_contact_per_hour 9999 && ` +
        `hermes ${profilePart}config set max_conversation_length 9999 && ` +
        `hermes ${profilePart}config set busy_input_mode queue`
      );
      await executeCommand(serverIP, sshPrivateKey, cmd, serverUser || 'ubuntu');
      await restartAgent(client, sshPrivateKey, serverUser || 'ubuntu');
    }

    // Save the status in Supabase's type_specific_data
    const { updateClient } = await import('@/lib/db');
    let tsdObj: any = {};
    if (client.typeSpecificData) {
      try {
        tsdObj = typeof client.typeSpecificData === 'string'
          ? JSON.parse(client.typeSpecificData)
          : client.typeSpecificData;
      } catch {
        tsdObj = {};
      }
    }
    tsdObj.antiBotActive = enabled;
    
    await updateClient(client._id, {
      type_specific_data: tsdObj
    });

    return NextResponse.json({ success: true, antiBotActive: enabled });
  } catch (error: any) {
    console.error('Toggle Protection API Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
