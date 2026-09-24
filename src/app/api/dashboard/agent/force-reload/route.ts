import { NextResponse } from 'next/server';
import { getSessionClient } from '@/lib/auth';
import { executeCommand, getClientServerIp, buildHermesCmd } from '@/lib/ssh';

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

    // 1. Try "hermes soul reload" first
    const reloadCmd = buildHermesCmd(client, 'soul reload 2>&1');
    const reloadRes = await executeCommand(serverIP, sshPrivateKey, reloadCmd, serverUser || 'ubuntu');

    let methodUsed = 'hermes soul reload';
    if (
      reloadRes.exitCode !== 0 ||
      reloadRes.stdout.toLowerCase().includes('not found') ||
      reloadRes.stdout.toLowerCase().includes('invalid command') ||
      reloadRes.stdout.toLowerCase().includes('error')
    ) {
      // Fallback: stop + start
      methodUsed = 'hermes gateway stop/start';
      await executeCommand(serverIP, sshPrivateKey, buildHermesCmd(client, 'gateway stop'), serverUser || 'ubuntu');
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await executeCommand(serverIP, sshPrivateKey, buildHermesCmd(client, 'gateway start'), serverUser || 'ubuntu');
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    // 2. Verify SOUL.md is loaded: hermes soul show | head -5
    const verifyCmd = buildHermesCmd(client, 'soul show 2>/dev/null | head -5');
    const verifyRes = await executeCommand(serverIP, sshPrivateKey, verifyCmd, serverUser || 'ubuntu');
    const soulSnippet = verifyRes.stdout.trim();

    return NextResponse.json({
      success: true,
      method: methodUsed,
      soulSnippet,
      message: `Agent successfully reloaded using ${methodUsed}.`,
    });
  } catch (error: any) {
    console.error('Agent Force Reload API Error:', error.message);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
