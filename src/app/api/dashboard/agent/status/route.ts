import { NextResponse } from 'next/server';
import { getSessionClient } from '@/lib/auth';
import { agentStatus, executeCommand, executeCommandWithPty, readFile, restartAgent, getClientServerIp, buildHermesCmd, getSoulMdPath, resolveHermesContext, writeSoulMd } from '@/lib/ssh';
import { compileSoulMarkdown } from '@/lib/soulCompiler';

export async function GET(request: Request) {
  try {
    const client = await getSessionClient();
    if (!client) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serverIP = getClientServerIp(client);
    const { sshPrivateKey, serverUser } = client;
    if (!serverIP || !sshPrivateKey) {
      return NextResponse.json({ error: 'Server details missing. Contact support.' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';
    const range = searchParams.get('range') || 'today';
    const isOverview = searchParams.get('overview') === 'true';

    const { supabaseAdmin } = await import('@/lib/supabase');
    const { data: dbClient, error: dbError } = await supabaseAdmin
      .from('agent_clients')
      .select('cached_status, status_checked_at, bot_protection_enabled')
      .eq('id', client.id || client._id)
      .maybeSingle();

    if (dbError || !dbClient) {
      return NextResponse.json({ error: 'Client record not found' }, { status: 404 });
    }

    const cachedStatus = dbClient.cached_status || 'unknown';
    const statusCheckedAt = dbClient.status_checked_at || null;
    const isBotProtectionEnabled = dbClient.bot_protection_enabled || false;

    // Fast-path ONLY if force is false AND not overview AND range is 'today'
    const shouldRunSlowPath = force || isOverview || range !== 'today';

    if (!shouldRunSlowPath) {
      // FAST path: return cached status
      const isOnline = cachedStatus === 'online';
      const checkedAtTime = statusCheckedAt ? new Date(statusCheckedAt).getTime() : 0;
      const diffMins = Math.floor((Date.now() - checkedAtTime) / 60000);
      const running = isOnline && diffMins < 5; // 5-min window — heartbeat runs every 1-2 min

      return NextResponse.json({
        running,
        uptime: statusCheckedAt ? `Last seen ${diffMins} min ago` : 'N/A',
        lastMessage: 'N/A (Refresh to check)',
        messageCount: 0,
        assistantMessageCount: 0,
        paired: isOnline,
        antiBotActive: isBotProtectionEnabled,
        soul_file_configured: true,
        cronInstalled: true,
        cachedStatus,
        statusCheckedAt,
      });
    }

    // SLOW path: SSH to VPS (Strictly Read-Only check, no auto-restarts)
    let status: any;
    try {
      status = await agentStatus(client, sshPrivateKey, serverUser || 'ubuntu', 5000, range);
    } catch (err: any) {
      console.warn('[status] SSH check timed out or failed:', err.message);
      return NextResponse.json({
        running: false,
        uptime: 'Offline',
        lastMessage: 'N/A',
        messageCount: 0,
        assistantMessageCount: 0,
        paired: false,
        antiBotActive: false,
        soul_file_configured: false,
        cronInstalled: false,
        cachedStatus: 'offline',
        statusCheckedAt: new Date().toISOString(),
      });
    }

    // Update database cached status in the background/asynchronously to keep it sync'd
    const runningStatusStr = status.running ? 'online' : 'offline';
    await supabaseAdmin
      .from('agent_clients')
      .update({
        cached_status: runningStatusStr,
        status_checked_at: new Date().toISOString()
      })
      .eq('id', client.id || client._id);

    return NextResponse.json({
      running: status.running,
      uptime: status.uptime,
      lastMessage: status.lastMessage,
      messageCount: status.messageCount,
      assistantMessageCount: status.assistantMessageCount || 0,
      paired: status.paired,
      antiBotActive: status.antiBotActive,
      soul_file_configured: status.soulFileConfigured,
      cronInstalled: status.cronInstalled,
      sessionConfigUpdateRequired: status.sessionConfigUpdateRequired,
      cachedStatus: runningStatusStr,
      statusCheckedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Agent Status API Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const client = await getSessionClient();
    if (!client) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;
    if (action !== 'pair' && action !== 'poll' && action !== 'fix_soul_path' && action !== 'configure_cloud_api') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (action === 'configure_cloud_api') {
      const rawPhoneId = body.whatsappPhoneNumberId || '';
      const rawAccessToken = body.whatsappAccessToken || '';
      const rawWabaId = body.whatsappWabaId || '';
      const rawAppSecret = body.whatsappAppSecret || '';

      if (!rawPhoneId || !rawAccessToken || !rawWabaId || !rawAppSecret) {
        return NextResponse.json({ error: 'All parameters (Phone ID, Access Token, WABA ID, and App Secret) are required.' }, { status: 400 });
      }

      // Sanitize inputs
      const sanitizeVal = (val: string) => val.replace(/[^a-zA-Z0-9_\-\.\=\/]/g, '');
      const whatsappPhoneNumberId = sanitizeVal(rawPhoneId);
      const whatsappAccessToken = sanitizeVal(rawAccessToken);
      const whatsappWabaId = sanitizeVal(rawWabaId);
      const whatsappAppSecret = sanitizeVal(rawAppSecret);

      const { supabaseAdmin } = await import('@/lib/supabase');
      const { data: dbClient } = await supabaseAdmin
        .from('agent_clients')
        .select('*')
        .eq('id', client.id || client._id)
        .maybeSingle();

      if (!dbClient) {
        return NextResponse.json({ error: 'Client record not found' }, { status: 404 });
      }

      const profileName = dbClient.hermes_profile || dbClient.id;

      await supabaseAdmin
        .from('agent_clients')
        .update({
          connection_type: 'cloud_api',
          whatsapp_phone_number_id: whatsappPhoneNumberId,
          whatsapp_access_token: whatsappAccessToken,
          whatsapp_app_secret: whatsappAppSecret,
          whatsapp_waba_id: whatsappWabaId,
          whatsapp_verify_token: `${profileName}-webhook-token`,
          status: 'active',
          stage: 'live'
        })
        .eq('id', client.id || client._id);

      return NextResponse.json({ success: true, message: 'WhatsApp Cloud API connected successfully!' });
    }

    const serverIP = getClientServerIp(client);
    const { sshPrivateKey, serverUser } = client;
    if (!serverIP || !sshPrivateKey) {
      return NextResponse.json({ error: 'Server details missing' }, { status: 400 });
    }

    if (action === 'fix_soul_path') {
      const soulPath = getSoulMdPath(client);
      const cmd = buildHermesCmd(client, `config set soul_file ${soulPath}`);
      await executeCommand(
        serverIP,
        sshPrivateKey,
        cmd,
        serverUser || 'ubuntu'
      );

      // Deploycompiled SOUL.md to the correct profile path
      let activeProducts: any[] = [];
      try {
        const { getProducts } = await import('@/lib/db');
        activeProducts = await getProducts(client.id || client._id);
      } catch {}
      const compiledSoul = compileSoulMarkdown(client, activeProducts);
      await writeSoulMd(client, sshPrivateKey, compiledSoul, serverUser || 'ubuntu');

      await restartAgent(client, sshPrivateKey, serverUser || 'ubuntu');
      return NextResponse.json({ success: true });
    }

    if (action === 'poll') {
      const ctx = resolveHermesContext(client);
      const qrPath = ctx.qrPath;
      const output = await readFile(serverIP, sshPrivateKey, qrPath, serverUser || 'ubuntu');
      return NextResponse.json({ qrCodeOutput: output || 'Initializing pairing process...' });
    }

    // Run hermes whatsapp with a real PTY so it doesn't refuse to show QR.
    // hermesCmd sets the PATH; PTY makes hermes think it's in a real terminal.
    const result = await executeCommandWithPty(
      client,
      sshPrivateKey,
      buildHermesCmd(client, 'whatsapp'),
      serverUser || 'ubuntu',
      35000 // 35s - enough to print QR and idle-exit
    );

    // Strip out unnecessary logs, keeping the ANSI/text QR
    let output = result.output || 'No response from pairing command.';
    return NextResponse.json({ qrCodeOutput: output });
  } catch (error: any) {
    console.error('Agent Pair API Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

