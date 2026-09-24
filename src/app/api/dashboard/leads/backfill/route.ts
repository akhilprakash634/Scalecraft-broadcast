import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { executeCommand, getClientServerIp } from '@/lib/ssh';
import { isAdminAuthenticated } from '@/lib/auth';

export async function GET() {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Backfill API] Fetching leads with null last_customer_message_at...');
    const { data: leads, error: leadsErr } = await supabaseAdmin
      .from('leads_cache')
      .select('phone, client_id, last_message_at, last_customer_message_at, name')
      .is('last_customer_message_at', null);

    if (leadsErr) {
      return NextResponse.json({ error: leadsErr.message }, { status: 500 });
    }

    console.log(`[Backfill API] Found ${leads.length} leads with null last_customer_message_at.`);

    const clientsMap: Record<string, any[]> = {};
    for (const lead of leads) {
      if (!clientsMap[lead.client_id]) {
        clientsMap[lead.client_id] = [];
      }
      clientsMap[lead.client_id].push(lead);
    }

    let totalUpdated = 0;
    const results: any[] = [];

    for (const [clientId, clientLeads] of Object.entries(clientsMap)) {
      const { data: client, error: clientErr } = await supabaseAdmin
        .from('agent_clients')
        .select('*')
        .eq('id', clientId)
        .maybeSingle();

      if (clientErr || !client) {
        console.error(`[Backfill API] Failed to fetch agent client ${clientId}:`, clientErr);
        results.push({ clientId, error: 'Client not found or query failed' });
        continue;
      }

      const serverIP = getClientServerIp(client);
      const serverUser = client.serverUser || 'ubuntu';
      const profile = client.hermesProfile || '';
      
      console.log(`[Backfill API] Client: ${client.businessName || clientId}. IP: ${serverIP}`);

      const clientResults: any[] = [];

      for (const lead of clientLeads) {
        const phoneClean = lead.phone.replace("+", "").split(":")[0].split("@", 1)[0];
        
        const pythonScript = `python3 -c '
import sqlite3, os
profile = "${profile}"
if profile:
    db_path = f"/home/ubuntu/.hermes/profiles/{profile}/state.db"
else:
    db_path = "/home/ubuntu/.hermes/state.db"

if not os.path.exists(db_path):
    print("NO_DB")
    exit()

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

phone_clean = "${phoneClean}"
cursor.execute("""
    SELECT s.id 
    FROM sessions s  
    WHERE (s.session_key LIKE ? OR s.session_key LIKE ?)
    ORDER BY s.id DESC
    LIMIT 1
""", (
    f"%whatsapp_cloud%dm%{phone_clean}%",
    f"%whatsapp%dm%{phone_clean}%"
))
row = cursor.fetchone()
if not row:
    print("NO_SESSION")
    conn.close()
    exit()

sid = row[0]
cursor.execute("SELECT MAX(timestamp) FROM messages WHERE session_id = ? AND role = \\"user\\"", (sid,))
row_msg = cursor.fetchone()
if row_msg and row_msg[0]:
    print(f"FOUND:{row_msg[0]}")
else:
    print("NO_USER_MSG")
conn.close()
'`;

        try {
          const res = await executeCommand(serverIP, '', pythonScript, serverUser);
          const stdout = res.stdout.trim();
          
          if (stdout.startsWith('FOUND:')) {
            const epoch = parseFloat(stdout.split(':')[1]);
            const isoTimestamp = new Date(epoch * 1000).toISOString();
            
            const { error: updateErr } = await supabaseAdmin
              .from('leads_cache')
              .update({ last_customer_message_at: isoTimestamp })
              .eq('client_id', clientId)
              .eq('phone', lead.phone);

            if (updateErr) {
              clientResults.push({ phone: lead.phone, status: 'update_failed', error: updateErr.message });
            } else {
              clientResults.push({ phone: lead.phone, status: 'updated', timestamp: isoTimestamp });
              totalUpdated++;
            }
          } else {
            clientResults.push({ phone: lead.phone, status: 'no_vps_messages', reason: stdout });
          }
        } catch (err: any) {
          clientResults.push({ phone: lead.phone, status: 'ssh_error', error: err.message });
        }
      }
      results.push({ clientId, clientName: client.businessName, leadsChecked: clientLeads.length, details: clientResults });
    }

    return NextResponse.json({ success: true, totalUpdated, results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
