import { supabaseAdmin } from '../src/lib/supabase';
import { applyBotProtectionConfig } from '../src/lib/ssh';

async function run() {
  console.log('[Backfill] Starting bot-guard redeployment and token backfill...');

  // 1. Fetch all client records
  const { data: dbClients, error: dbError } = await supabaseAdmin
    .from('agent_clients')
    .select('*');

  if (dbError) {
    console.error('[Backfill] Error fetching clients from database:', dbError.message);
    process.exit(1);
  }

  if (!dbClients || dbClients.length === 0) {
    console.log('[Backfill] No clients found in database.');
    return;
  }

  console.log(`[Backfill] Found ${dbClients.length} clients to process.`);

  for (const client of dbClients) {
    const clientId = client.id || client._id;
    console.log(`\n----------------------------------------\n[Backfill] Processing Client ID: ${clientId} (${client.business_name || 'No Name'})`);

    let heartbeatToken = client.heartbeat_token;

    // 2. Generate token if missing
    if (!heartbeatToken) {
      heartbeatToken = [
        Math.random().toString(36).slice(2),
        Math.random().toString(36).slice(2),
        Date.now().toString(36),
      ].join('-');

      console.log(`[Backfill] Generating new heartbeat_token for client: ${heartbeatToken}`);
      const { error: updateErr } = await supabaseAdmin
        .from('agent_clients')
        .update({ heartbeat_token: heartbeatToken })
        .eq('id', clientId);

      if (updateErr) {
        console.error(`[Backfill] Failed to update heartbeat_token in DB for client ${clientId}:`, updateErr.message);
        continue;
      }
      console.log(`[Backfill] Token updated successfully in DB.`);
    } else {
      console.log(`[Backfill] Existing heartbeat_token found: ${heartbeatToken}`);
    }

    // 3. Redeploy bot_guard.py if VPS is active
    const ip = client.shared_server_ip || client.server_ip;
    const sshKey = client.ssh_private_key;
    const user = client.server_user || 'ubuntu';

    if (ip && sshKey && ['active', 'installed'].includes(client.status)) {
      console.log(`[Backfill] Active VPS detected at IP: ${ip}. Redeploying bot_guard.py...`);
      try {
        await applyBotProtectionConfig(ip, sshKey, clientId, user);
        console.log(`[Backfill] bot_guard.py successfully redeployed to ${ip}`);
      } catch (err: any) {
        console.error(`[Backfill] Failed to redeploy bot_guard.py to ${ip} via SSH:`, err.message);
      }
    } else {
      console.log(`[Backfill] VPS is not active or missing parameters (IP: ${ip || 'N/A'}, Status: ${client.status || 'N/A'}). Skipping VPS update.`);
    }
  }

  console.log('\n========================================\n[Backfill] Bot-guard backfill completed.');
}

run().catch((err) => {
  console.error('[Backfill] Unexpected execution error:', err);
  process.exit(1);
});
