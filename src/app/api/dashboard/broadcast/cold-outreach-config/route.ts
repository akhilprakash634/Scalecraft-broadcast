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
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json({ error: 'jobId parameter is required' }, { status: 400 });
    }

    // Try reading the specific campaign config first, fallback to the general one
    const cmd = `cat /home/ubuntu/cold_outreach_campaign_${jobId}.json 2>/dev/null || cat /home/ubuntu/cold_outreach_campaign.json 2>/dev/null || echo ""`;
    const configResult = await executeCommand(serverIP, sshPrivateKey, cmd, serverUser || 'ubuntu');

    if (!configResult.stdout.trim()) {
      return NextResponse.json({ error: 'Campaign configuration not found on the server' }, { status: 404 });
    }

    try {
      const campaignConfig = JSON.parse(configResult.stdout.trim());
      return NextResponse.json({ campaignConfig });
    } catch {
      return NextResponse.json({ error: 'Failed to parse campaign configuration' }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Cold Outreach Config API Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
