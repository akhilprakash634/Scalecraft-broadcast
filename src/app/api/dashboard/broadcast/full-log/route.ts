import { NextResponse } from 'next/server';
import { getSessionClient } from '@/lib/auth';
import { executeCommand } from '@/lib/ssh';

export async function GET(request: Request) {
  try {
    const client = await getSessionClient();
    if (!client) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { serverIP, sshPrivateKey, serverUser } = client;
    if (!serverIP || !sshPrivateKey) {
      return NextResponse.json({ error: 'Server details missing' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'regular'; // 'regular' or 'cold'
    const logFile = type === 'cold' ? '/home/ubuntu/cold_outreach_details.log' : '/home/ubuntu/broadcast_details.log';

    // Get all contents of the campaign details logs
    const logResult = await executeCommand(
      serverIP,
      sshPrivateKey,
      `cat ${logFile} 2>/dev/null || echo ""`,
      serverUser || 'ubuntu'
    );

    return new Response(logResult.stdout || '', {
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': `attachment; filename="${type}_broadcast_full_log.txt"`,
      },
    });
  } catch (error: any) {
    console.error('Broadcast Full Log API Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
