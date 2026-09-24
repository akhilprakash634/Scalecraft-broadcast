import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAgentClientByClientId } from '@/lib/agents';
import { executeCommand, hermesCmd } from '@/lib/ssh';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clientId, phone, reason, messageCount } = await request.json();

    if (!clientId || !phone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Fetch client details from database to bind authorization token
    const clientRecord = await getAgentClientByClientId(clientId);
    if (!clientRecord) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Auth validation: must match client's heartbeat_token OR global CRON_SECRET
    const expectedToken = clientRecord.heartbeatToken || clientRecord.heartbeat_token;
    const cronSecret = process.env.CRON_SECRET;

    const isCronAuthorized = cronSecret && token === cronSecret;
    const isClientAuthorized = expectedToken && token === expectedToken;

    if (!isCronAuthorized && !isClientAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Derive estimatedCost server-side to prevent client-side estimatedCost spoofing
    const estimatedCost = Math.round(Number(messageCount || 0) * 0.30 * 100) / 100;

    // 3. Create usage_alert in Supabase
    const alertMsg = `Possible bot loop with ${phone}. ${messageCount} messages in 1 hour. Reason: ${reason}. Estimated cost: Rs.${estimatedCost}`;
    await supabaseAdmin.from('usage_alerts').insert({
      client_id: clientId,
      alert_type: 'bot_loop_detected',
      message: alertMsg,
      current_value: messageCount,
      threshold_value: 20,
      resolved: false
    });

    const { businessName, ownerPhone, serverIP, sshPrivateKey, serverUser } = clientRecord;

    // 4. Send WhatsApp warning to owner
    if (ownerPhone && serverIP && sshPrivateKey) {
      const cleanPhone = ownerPhone.replace(/[^\d]/g, '');
      if (cleanPhone) {
        let text = '';
        if (phone === 'SYSTEM' || reason.toLowerCase().includes('daily limit')) {
          text = `ALERT: ScaleCraft Agent for ${businessName || 'your business'} has reached its daily message limit!\n\nMessages sent today: ${messageCount}\nEstimated API cost: Rs.${estimatedCost}\n\nAgent has been auto-paused for safety.\nLogin to check/upgrade: https://thescalecraft.in/dashboard`;
        } else {
          text = `ALERT: ScaleCraft Agent for ${businessName || 'your business'} may be in a bot loop!\n\nMessages sent in last hour: ${messageCount}\nEstimated API cost: Rs.${estimatedCost}\nSuspicious number: ${phone}\n\nAgent auto-paused for safety.\nLogin to resume: https://thescalecraft.in/dashboard`;
        }
        const sendPayload = JSON.stringify({
          chatId: `${cleanPhone}@s.whatsapp.net`,
          message: text
        });
        const curlCmd = `curl -s -X POST -H "Content-Type: application/json" -d '${sendPayload.replace(/'/g, "'\\''")}' http://127.0.0.1:3009/send || true`;
        await executeCommand(serverIP, sshPrivateKey, curlCmd, serverUser || 'ubuntu');
      }
    }

    // 5. Update Supabase status to "paused_bot_alert"
    const { updateClient } = await import('@/lib/db');
    await updateClient(clientId, { status: 'paused_bot_alert' });

    // 6. Emergency stop gateway if cost > Rs.100
    if (estimatedCost > 100 && serverIP && sshPrivateKey) {
      const stopCmd = hermesCmd('systemctl --user stop hermes-gateway --no-block || hermes gateway stop || true');
      await executeCommand(serverIP, sshPrivateKey, stopCmd, serverUser || 'ubuntu');
    }

    return NextResponse.json({ success: true, message: 'Bot alert processed successfully' });
  } catch (error: any) {
    console.error('Bot Alert webhook error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
