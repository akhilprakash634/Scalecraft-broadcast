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

    // 1. Fetch the latest cold outreach job for this client from Supabase
    const { data: job, error: dbError } = await supabaseAdmin
      .from('broadcast_jobs')
      .select('*')
      .eq('client_id', client.clientId)
      .eq('job_type', 'cold_outreach')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (dbError) {
      console.error('[Cold Outreach Status] Supabase fetch error:', dbError.message);
      return NextResponse.json({ error: 'Failed to fetch job status from database.' }, { status: 500 });
    }

    // 2. Fetch the last 15 lines of execution logs from VPS
    const logResult = await executeCommand(
      serverIP,
      sshPrivateKey,
      'tail -n 15 /home/ubuntu/cold_outreach_details.log 2>/dev/null || echo ""',
      serverUser || 'ubuntu'
    );

    const logHistory = logResult.stdout
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    // 3. Fetch campaign configuration JSON from VPS
    const configResult = await executeCommand(
      serverIP,
      sshPrivateKey,
      'cat /home/ubuntu/cold_outreach_campaign.json 2>/dev/null || echo ""',
      serverUser || 'ubuntu'
    );
    let campaignConfig = null;
    if (configResult.stdout.trim()) {
      try {
        campaignConfig = JSON.parse(configResult.stdout);
      } catch {}
    }

    return NextResponse.json({
      job: job || null,
      logHistory,
      campaignConfig,
    });
  } catch (error: any) {
    console.error('Cold Outreach Status API Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
