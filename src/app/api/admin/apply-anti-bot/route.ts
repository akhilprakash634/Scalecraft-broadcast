import { NextResponse } from 'next/server';
import { getAllAgentClients } from '@/lib/agents';
import { updateSOUL, applyBotProtectionConfig, prependAntiBotRules, executeCommand, buildHermesCmd, getSoulMdPath } from '@/lib/ssh';
import { compileSoulMarkdown } from '@/lib/soulCompiler';
import { updateClient } from '@/lib/db';

export async function POST() {
  try {
    const clients = await getAllAgentClients();
    
    // Filter active clients with valid serverIP
    const activeClients = clients.filter(
      (c) => c.status === 'active' && c.serverIP
    );

    const jobs = activeClients.map(async (clientRecord) => {
      try {
        // Pass empty list for products as default or fetch if needed
        const compiledSoul = compileSoulMarkdown(clientRecord, []);
        const prependedSoul = prependAntiBotRules(compiledSoul);

        // 1. Configure SOUL.md path explicitly
        const soulPath = getSoulMdPath(clientRecord);
        await executeCommand(
          clientRecord.serverIP,
          clientRecord.sshPrivateKey,
          buildHermesCmd(clientRecord, `config set soul_file ${soulPath}`),
          clientRecord.serverUser || 'ubuntu'
        );

        // 2. Update SOUL.md and restart
        await updateSOUL(
          clientRecord,
          clientRecord.sshPrivateKey,
          prependedSoul,
          clientRecord.serverUser || 'ubuntu'
        );

        // 3. Apply config settings
        await applyBotProtectionConfig(
          clientRecord,
          clientRecord.sshPrivateKey,
          clientRecord._id,
          clientRecord.serverUser || 'ubuntu'
        );

        // Update Supabase document to reflect that bot protection is applied
        await updateClient(clientRecord._id, {
          bot_protection_enabled: true,
          bot_protection_applied_at: new Date().toISOString(),
        });

        return {
          clientId: clientRecord._id,
          businessName: clientRecord.businessName,
          status: 'success',
        };
      } catch (err: any) {
        return {
          clientId: clientRecord._id,
          businessName: clientRecord.businessName,
          status: 'failed',
          error: err.message,
        };
      }
    });

    const outcomes = await Promise.all(jobs);

    return NextResponse.json({
      success: true,
      message: `Batch update complete. Processed ${outcomes.length} clients.`,
      outcomes,
    });
  } catch (error: any) {
    console.error('Batch Anti-Bot API Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
