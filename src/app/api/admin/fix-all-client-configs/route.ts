import { NextRequest, NextResponse } from 'next/server';
import { mapDbClientToAgentClient } from '@/lib/agents';
import { executeCommand, hermesCmd, restartAgent } from '@/lib/ssh';
import { supabaseAdmin } from '@/lib/supabase';
import { isAdminAuthenticated } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    let isAuthorized = await isAdminAuthenticated();
    if (!isAuthorized) {
      const adminSecret = request.headers.get('x-admin-secret');
      if (adminSecret && process.env.ADMIN_SECRET && adminSecret === process.env.ADMIN_SECRET) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 401 });
    }

    // Query all active clients from Supabase
    const { data: dbClients, error: dbError } = await supabaseAdmin
      .from('agent_clients')
      .select('*')
      .eq('status', 'active')
      .not('server_ip', 'is', null);

    if (dbError) {
      console.error('Database query error:', dbError.message);
      return NextResponse.json({ error: `Database error: ${dbError.message}` }, { status: 500 });
    }

    const clients = (dbClients || []).map(mapDbClientToAgentClient).filter(Boolean);

    const fixConfigCommand = hermesCmd(`
      CONFIG_PATH=~/.hermes/config.yaml
      if [ -f "$CONFIG_PATH" ]; then
        sed -i 's/user_profile_enabled: true/user_profile_enabled: false/g' $CONFIG_PATH
        sed -i 's/mode: both/mode: context/g' $CONFIG_PATH
        hermes gateway restart whatsapp
      else
        echo "config.yaml not found"
        exit 1
      fi
    `);

    // Run the fix command in parallel across all active client VPS instances
    const results = await Promise.all(
      clients.map(async (client) => {
        if (!client) return null;
        const { serverIP, sshPrivateKey, serverUser, businessName, id } = client;
        try {
          const res = await executeCommand(serverIP, sshPrivateKey, fixConfigCommand, serverUser || 'ubuntu');

          // Trigger systemd restart for reliability
          await restartAgent(serverIP, sshPrivateKey, serverUser || 'ubuntu');

          if (res.exitCode === 0) {
            return {
              id,
              businessName,
              ip: serverIP,
              success: true,
              message: 'Successfully updated config and restarted gateway.'
            };
          } else {
            return {
              id,
              businessName,
              ip: serverIP,
              success: false,
              message: `Fix script failed with exit code ${res.exitCode}: ${res.stderr || res.stdout}`
            };
          }
        } catch (err: any) {
          return {
            id,
            businessName,
            ip: serverIP,
            success: false,
            message: `SSH failed: ${err.message}`
          };
        }
      })
    );

    const filteredResults = results.filter(Boolean);

    return NextResponse.json({
      success: true,
      total: filteredResults.length,
      fixed: filteredResults.filter(r => r?.success).length,
      failed: filteredResults.filter(r => !r?.success).length,
      report: filteredResults
    });

  } catch (error: any) {
    console.error('Fix All Client Configs API Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
