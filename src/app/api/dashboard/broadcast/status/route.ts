import { NextResponse } from 'next/server';
import { getSessionClient } from '@/lib/auth';
import { executeCommand } from '@/lib/ssh';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const client = await getSessionClient();
    if (!client) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { serverIP, sshPrivateKey, serverUser } = client;
    if (!serverIP || !sshPrivateKey) {
      return NextResponse.json({ error: 'Server details missing' }, { status: 400 });
    }

    // Fetch the most recent campaign started by this client
    const { data: latestCampaign, error: dbError } = await supabaseAdmin
      .from('broadcast_audit')
      .select('*')
      .eq('client_id', client.clientId)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (dbError) {
      console.error('[broadcast/status] DB error:', dbError.message);
    }

    if (client.connectionType === 'cloud_api') {
      const running = latestCampaign?.status === 'running';
      const paused = latestCampaign?.status === 'paused';
      return NextResponse.json({
        progress: {
          sent: latestCampaign?.sent || 0,
          failed: latestCampaign?.failed || 0,
          total: latestCampaign?.recipient_count || 0,
          running,
          paused
        },
        logHistory: latestCampaign?.logs || []
      });
    }

    // If no Baileys campaign is running in the database, return stopped status instantly (no SSH delay!)
    if (!latestCampaign || latestCampaign.status !== 'running') {
      return NextResponse.json({
        progress: { sent: 0, failed: 0, total: 0, running: false, paused: false },
        logHistory: []
      });
    }

    // Single SSH call optimization: Fetch both progress stats and logs in one SSH command
    const combinedCmd = `cat /home/ubuntu/broadcast_log.txt 2>/dev/null; echo "---PAUSE_CHECK---"; [ -f /home/ubuntu/broadcast_pause ] && echo "paused" || echo "not_paused"; echo "---LOG_CHECK---"; tail -n 15 /home/ubuntu/broadcast_details.log 2>/dev/null || echo ""`;
    
    const result = await executeCommand(serverIP, sshPrivateKey, combinedCmd, serverUser || 'ubuntu');
    const stdout = result.stdout || '';

    const parts = stdout.split('---LOG_CHECK---');
    const statusPart = parts[0] || '';
    const logPart = parts[1] || '';

    const statusSubparts = statusPart.split('---PAUSE_CHECK---');
    const logContent = statusSubparts[0]?.trim();
    const pauseStatus = statusSubparts[1]?.trim();
    const paused = pauseStatus === 'paused';

    let progress = { sent: 0, failed: 0, total: 0, running: false, paused };
    try {
      if (logContent) {
        const parsed = JSON.parse(logContent);
        progress = { ...parsed, paused };
      }
    } catch {}

    const logHistory = logPart
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    return NextResponse.json({ progress, logHistory });
  } catch (error: any) {
    console.error('Broadcast Status API Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
