import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { getAllAgentClients, getAgentClientByClientId } from '@/lib/agents';
import { signJWT } from '@/lib/jwt';
import { restartAgent, executeCommand, resolveHermesContext } from '@/lib/ssh';
import { logAdminAction } from '@/lib/adminAudit';
import { supabaseAdmin } from '@/lib/supabase';
 
export async function GET() {
  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
 
    const clients = await getAllAgentClients();

    // Count ALL unique phones broadcast to today per client — Meta's daily limit applies
    // to every recipient sent to, not just ones who lacked an active 24h session window.
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const { data: usageLogs, error: usageError } = await supabaseAdmin
      .from('broadcast_recipient_logs')
      .select('client_id, phone')
      .gte('sent_at', startOfDay.toISOString());

    const usageMap: Record<string, number> = {};
    if (!usageError && usageLogs) {
      const clientPhones: Record<string, Set<string>> = {};
      for (const log of usageLogs) {
        if (!log.client_id || !log.phone) continue;
        if (!clientPhones[log.client_id]) {
          clientPhones[log.client_id] = new Set();
        }
        clientPhones[log.client_id].add(log.phone);
      }
      for (const cid in clientPhones) {
        usageMap[cid] = clientPhones[cid].size;
      }
    }

    const clientsWithUsage = clients.map((c) => ({
      ...c,
      totalSentToday: usageMap[c.clientId] || 0,
    }));

    return NextResponse.json(clientsWithUsage);
  } catch (error: any) {
    console.error('Admin Clients GET Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
 
export async function POST(request: Request) {
  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
 
    const { action, documentId, status } = await request.json();
 
    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }
 
    // Fetch client details from Supabase
    const clientRecord = await getAgentClientByClientId(documentId);
 
    if (!clientRecord) {
      return NextResponse.json({ error: 'Client record not found' }, { status: 404 });
    }
 
    if (action === 'update_status') {
      if (!status) {
        return NextResponse.json({ error: 'Status is required' }, { status: 400 });
      }
 
      const { updateClient } = await import('@/lib/db');
      await updateClient(documentId, { status });
      await logAdminAction('Update Client Status', { documentId, status }, request);
      return NextResponse.json({ success: true, message: `Status updated to ${status}` });
    }
 
    if (action === 'delete') {
      const { supabaseAdmin } = await import('@/lib/supabase');
      const { error: deleteErr } = await supabaseAdmin.from('agent_clients').delete().eq('id', documentId);
      if (deleteErr) throw deleteErr;

      // Atomically decrement server load count if client had an assigned server
      if (clientRecord.sharedServerIp) {
        try {
          await supabaseAdmin.rpc('decrement_server_client_count', { server_ip: clientRecord.sharedServerIp });
        } catch (rpcErr: any) {
          console.error('[Admin Clients delete] Failed to decrement server client count:', rpcErr.message);
        }
      }

      await logAdminAction('Delete Client', { documentId }, request);
      return NextResponse.json({ success: true, message: 'Client record deleted from database' });
    }
 
    if (action === 'impersonate') {
      // Sign JWT session for this client
      const payload = {
        clientId: clientRecord.clientId,
        botNumber: clientRecord.whatsappBotNumber,
        businessName: clientRecord.businessName,
        exp: Math.floor(Date.now() / 1000) + 2 * 60 * 60, // 2 hours expiration for impersonation
        iat: Math.floor(Date.now() / 1000),
      };
 
      const secret = process.env.JWT_SECRET!;
      const token = await signJWT(payload, secret);
 
      const response = NextResponse.json({ success: true, redirect: '/dashboard' });
 
      // Append cookie
      response.cookies.set('scalecraft_session', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 2 * 60 * 60,
        path: '/',
      });
 
      await logAdminAction('Impersonate Client', { documentId, clientId: clientRecord.clientId }, request);
      return response;
    }
 
    if (action === 'restart') {
      const { serverIP, serverUser } = clientRecord;
      const sshPrivateKey = process.env.SCALECRAFT_SSH_PRIVATE_KEY || 'mock-private-key-content';
      if (!serverIP || !sshPrivateKey) {
        return NextResponse.json({ error: 'Server details missing on client record' }, { status: 400 });
      }
 
      const success = await restartAgent(clientRecord, sshPrivateKey, serverUser || 'ubuntu');
      if (!success) {
        return NextResponse.json({ error: 'Failed to restart remote agent service' }, { status: 500 });
      }
 
      await logAdminAction('Restart Client Agent', { documentId, serverIP }, request);
      return NextResponse.json({ success: true, message: 'Agent gateway restarted successfully!' });
    }
 
    if (action === 'logs') {
      const { serverIP, serverUser } = clientRecord;
      const sshPrivateKey = process.env.SCALECRAFT_SSH_PRIVATE_KEY || 'mock-private-key-content';
      if (!serverIP || !sshPrivateKey) {
        return NextResponse.json({ error: 'Server details missing on client record' }, { status: 400 });
      }
 
      const ctx = resolveHermesContext(clientRecord);
      const result = await executeCommand(
        ctx.ip,
        sshPrivateKey,
        `journalctl --user -u ${ctx.serviceName} -n 50 --no-pager`,
        serverUser || 'ubuntu'
      );

      if (result.exitCode !== 0 && !result.stdout) {
        return NextResponse.json({ error: `Failed to fetch logs: ${result.stderr}` }, { status: 500 });
      }

      await logAdminAction('View Client Agent Logs', { documentId, serverIP }, request);
      return NextResponse.json({ success: true, logs: result.stdout || 'No logs generated yet.' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Admin Clients POST Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
