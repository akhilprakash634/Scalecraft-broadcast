import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { updateClient } from '@/lib/db';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { executeCommand } from '@/lib/ssh';

export async function GET(request: Request) {
  try {
    // 1. Authenticate: Either vercel-cron header or Bearer token (secret key)
    const vercelCronHeader = request.headers.get('x-vercel-cron');
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'scalecraft-cron-secret-key-123';
    const keyParam = new URL(request.url).searchParams.get('key');

    const isAuthorized = vercelCronHeader === 'true' ||
      authHeader === `Bearer ${cronSecret}` ||
      keyParam === cronSecret ||
      process.env.NODE_ENV === 'development';

    if (!isAuthorized) {
      console.warn('[Trial Cron] Unauthorized access attempt.');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Trial Cron] Running trial lifecycle cron job...');
    const now = new Date();

    // Fetch active trial clients whose agents are not paused
    const { data: trialClients, error: fetchError } = await supabaseAdmin
      .from('agent_clients')
      .select('*')
      .eq('plan_type', 'trial')
      .is('agent_paused_at', null);

    if (fetchError) {
      console.error('[Trial Cron] Error fetching trial clients:', fetchError.message);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    console.log(`[Trial Cron] Found ${trialClients?.length || 0} active trial client(s).`);
    const results = [];

    if (trialClients && trialClients.length > 0) {
      for (const client of trialClients) {
        if (!client.trial_ends_at) continue;

        try {
          const trialEnds = new Date(client.trial_ends_at);
          // Calculate difference in days
          const daysLeft = (trialEnds.getTime() - now.getTime()) / 86400000;
          const statusResult: any = { id: client.id, daysLeft };

          // Day 4 reminder (1 day left in 5-day trial — fires when daysLeft <= 1)
          if (daysLeft <= 1 && daysLeft > 0 && !client.trial_reminder_sent) {
            console.log(`[Trial Cron] Sending Day 4 reminder to client ${client.id}...`);
            const recipient = client.owner_phone || client.whatsapp_bot_number;
            const customMonthly = client.monthly_amount || client.monthlyAmount || 1299;
            const customSetup = client.setup_amount || client.setupAmount || 6999;
            const message = `Hi! 👋 Your ScaleCraft Agent trial ends tomorrow.

Upgrade now to keep your agent running 24/7:
👉 https://thescalecraft.in/upgrade

Setup: ₹${customSetup} one-time + ₹${customMonthly}/month
Any questions? Just reply here 😊`;

            await sendWhatsAppMessage(
              recipient,
              client.server_ip,
              client.ssh_private_key,
              message,
              client.server_user || 'ubuntu'
            );

            await updateClient(client.id, {
              trial_reminder_sent: true
            });
            statusResult.action = 'reminder_sent';
          }

          // Trial ended - start grace period (daysLeft <= 0)
          if (daysLeft <= 0 && !client.grace_period_ends_at) {
            console.log(`[Trial Cron] Trial ended for client ${client.id}. Starting grace period...`);
            const gracePeriodEnds = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

            await updateClient(client.id, {
              grace_period_ends_at: gracePeriodEnds.toISOString()
            });

            const recipient = client.owner_phone || client.whatsapp_bot_number;
            const customMonthly = client.monthly_amount || client.monthlyAmount || 1299;
            const customSetup = client.setup_amount || client.setupAmount || 6999;
            const message = `Hi! Your 5-day ScaleCraft Agent trial has ended.

Your agent is still running for 3 more days 😊
Upgrade before ${gracePeriodEnds.toLocaleDateString('en-IN')} to keep it live without interruption:
👉 https://thescalecraft.in/upgrade

Setup: ₹${customSetup} one-time + ₹${customMonthly}/month`;

            await sendWhatsAppMessage(
              recipient,
              client.server_ip,
              client.ssh_private_key,
              message,
              client.server_user || 'ubuntu'
            );
            statusResult.action = 'grace_period_started';
          }

          // Grace period ended - pause agent
          if (client.grace_period_ends_at) {
            const graceEnds = new Date(client.grace_period_ends_at);
            if (graceEnds < now) {
              console.log(`[Trial Cron] Grace period expired for client ${client.id}. Pausing agent...`);

              // Stop Hermes on VPS
              const privateKey = client.ssh_private_key || process.env.SCALECRAFT_SSH_PRIVATE_KEY || '';
              await executeCommand(
                client.server_ip,
                privateKey,
                'systemctl --user stop hermes-gateway || pm2 stop hermes',
                client.server_user || 'ubuntu'
              );

              await updateClient(client.id, {
                agent_paused_at: new Date().toISOString()
              });

              const recipient = client.owner_phone || client.whatsapp_bot_number;
              const message = `Hi! Your ScaleCraft Agent has been paused as your trial period has ended.

To resume your agent immediately:
👉 https://thescalecraft.in/upgrade

Your configuration is saved - agent resumes within minutes of upgrading 😊`;

              await sendWhatsAppMessage(
                recipient,
                client.server_ip,
                client.ssh_private_key,
                message,
                client.server_user || 'ubuntu'
              );
              statusResult.action = 'agent_paused';
            }
          }

          results.push(statusResult);
        } catch (clientErr: any) {
          console.error(`[Trial Cron] Error processing client ${client.id}:`, clientErr.message);
          results.push({ id: client.id, error: clientErr.message });
        }
      }
    }

    return NextResponse.json({
      success: true,
      processed: results,
    });
  } catch (error: any) {
    console.error('[Trial Cron] Exception in cron handler:', error.message);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
