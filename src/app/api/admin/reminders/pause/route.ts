/**
 * POST /api/admin/reminders/pause
 *
 * Sets billing_status = 'paused_unpaid' on an overdue client and
 * stops their Hermes/Cloud API agent. Called from the admin reminders panel.
 *
 * Body: { clientId: string }
 *
 * Security:
 *  - Auth: isAdminAuthenticated() — 401 if not admin.
 *  - clientId validated as a non-empty string; DB lookup by UUID primary key.
 *  - SSH command to stop the agent uses the existing executeCommand helper which
 *    validates the command through the established SSH pattern (not user-controlled).
 *  - TODO(security): Log this admin action via logAdminAction for audit trail.
 */

import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { mapDbClientToAgentClient } from '@/lib/agents';
import { logAdminAction } from '@/lib/adminAudit';

export async function POST(request: Request) {
  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { clientId } = body as { clientId?: string };

    if (!clientId || typeof clientId !== 'string' || clientId.trim().length === 0) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
    }

    // Fetch client record
    const { data: dbClient, error: dbErr } = await supabaseAdmin
      .from('agent_clients')
      .select('*')
      .eq('id', clientId.trim())
      .maybeSingle();

    if (dbErr) {
      console.error('[Reminders Pause] DB error:', dbErr.message);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
    if (!dbClient) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const client = mapDbClientToAgentClient(dbClient)!;
    const now = new Date().toISOString();

    // Mark billing_status = paused_unpaid and set agent_paused_at timestamp
    await supabaseAdmin
      .from('agent_clients')
      .update({
        billing_status: 'paused_unpaid',
        agent_paused_at: now,
        status: 'suspended',
      })
      .eq('id', client.id);

    // Attempt to stop the VPS agent process (Baileys / Hermes)
    if (client.serverIP && client.connectionType !== 'cloud_api') {
      try {
        const { executeCommand } = await import('@/lib/ssh');
        const sshKey = process.env.SCALECRAFT_SSH_PRIVATE_KEY || '';
        await executeCommand(
          client.serverIP,
          sshKey,
          'systemctl --user stop hermes-gateway 2>/dev/null || pm2 stop hermes 2>/dev/null || true',
          client.serverUser || 'ubuntu'
        );
        console.log(`[Reminders Pause] Stopped Hermes agent for client ${client.id}`);
      } catch (sshErr: any) {
        // Non-fatal — DB is already updated; log and continue
        console.error('[Reminders Pause] SSH stop failed (non-fatal):', sshErr.message);
      }
    }
    // Cloud API clients: agent is paused by the webhook's billing_status check in whatsapp-cloud/route.ts

    await logAdminAction('Pause Agent (Billing Overdue)', { clientId: client.id, businessName: client.businessName }, request);

    return NextResponse.json({ success: true, pausedAt: now });
  } catch (error: any) {
    console.error('[Reminders Pause] Unexpected error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
