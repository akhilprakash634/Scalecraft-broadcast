import { NextResponse } from 'next/server';
import { getSessionClient } from '@/lib/auth';
import { executeCommand, readFile, uploadFile, getClientServerIp, resolveHermesContext } from '@/lib/ssh';

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

    const ctx = resolveHermesContext(client);
    const blocklistPath = `${ctx.profileRoot}/blocklist.txt`;
    const content = await readFile(serverIP, sshPrivateKey, blocklistPath, serverUser || 'ubuntu');

    const numbers = content
      .split('\n')
      .map((n) => n.trim())
      .filter((n) => n.length > 0);

    return NextResponse.json({ blockedNumbers: numbers });
  } catch (error: any) {
    console.error('Blocklist GET API Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
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

    const { action, phone } = await request.json();
    if (!action || !phone) {
      return NextResponse.json({ error: 'Missing action or phone number' }, { status: 400 });
    }

    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (!cleanPhone) {
      return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 });
    }

    const ctx = resolveHermesContext(client);
    const blocklistPath = `${ctx.profileRoot}/blocklist.txt`;
    const content = await readFile(serverIP, sshPrivateKey, blocklistPath, serverUser || 'ubuntu');

    let numbers = content
      .split('\n')
      .map((n) => n.trim())
      .filter((n) => n.length > 0);

    if (action === 'add') {
      if (!numbers.includes(cleanPhone)) {
        numbers.push(cleanPhone);
      }
    } else if (action === 'remove') {
      numbers = numbers.filter((n) => n !== cleanPhone);
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const newContent = numbers.join('\n') + '\n';
    const uploadSuccess = await uploadFile(serverIP, sshPrivateKey, newContent, blocklistPath, serverUser || 'ubuntu');

    if (!uploadSuccess) {
      return NextResponse.json({ error: 'Failed to write blocklist file to VPS' }, { status: 500 });
    }

    return NextResponse.json({ success: true, blockedNumbers: numbers });
  } catch (error: any) {
    console.error('Blocklist POST API Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
