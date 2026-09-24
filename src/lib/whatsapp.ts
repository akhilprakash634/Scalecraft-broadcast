import { executeCommand } from './ssh';

export async function sendAdminAlert(text: string) {
  try {
    const alertPhone = process.env.ADMIN_ALERT_PHONE || '918078004732';
    const serverIP = '13.127.46.147';
    const privateKey = Buffer.from(
      process.env.SCALECRAFT_SSH_PRIVATE_KEY || '',
      'base64'
    ).toString('utf8');

    if (!privateKey.includes('BEGIN')) {
      console.warn('[AdminAlert] Invalid SSH key format, skipping WhatsApp alert.');
      return;
    }

    const curlCommand = `curl -s -X POST http://127.0.0.1:3009/send -H "Content-Type: application/json" -d '${JSON.stringify({
      chatId: `${alertPhone}@s.whatsapp.net`,
      message: text,
    }).replace(/'/g, "'\\''")}'`;

    await executeCommand(serverIP, privateKey, curlCommand, 'ubuntu');
    console.log('[AdminAlert] WhatsApp alert sent successfully.');
  } catch (err: any) {
    console.error('[AdminAlert] Failed to send WhatsApp alert:', err.message);
  }
}

export async function sendWhatsAppMessage(
  recipientPhone: string,
  serverIP: string,
  sshPrivateKey: string,
  message: string,
  username = 'ubuntu'
) {
  try {
    if (!recipientPhone || !serverIP) {
      console.warn('[WhatsApp] Missing recipientPhone or serverIP, skipping message.');
      return;
    }
    const cleanPhone = recipientPhone.replace(/\D/g, '');

    // OUTBOUND SAFETY GUARD: Prevent AI control tokens and errors from reaching customers
    const cleanText = message?.trim() || '';
    if (!cleanText) {
      console.error("[Outbound Guard] Suppressing empty message to", cleanPhone);
      return;
    }
    if (cleanText === "[IGNORE]" || cleanText === "[SILENCE]") {
      console.log("[Outbound Guard] Suppressing AI control token response to", cleanPhone);
      return;
    }
    if (cleanText.includes("⚠️ No reply") || cleanText.includes("empty content after retries")) {
      console.error("[Outbound Guard] Suppressing failed AI fallback response to", cleanPhone);
      return;
    }

    const curlCommand = `curl -s -X POST http://127.0.0.1:3009/send -H "Content-Type: application/json" -d '${JSON.stringify({
      chatId: `${cleanPhone}@s.whatsapp.net`,
      message: message,
    }).replace(/'/g, "'\\''")}'`;

    const privateKey = sshPrivateKey || Buffer.from(
      process.env.SCALECRAFT_SSH_PRIVATE_KEY || '',
      'base64'
    ).toString('utf8');

    if (!privateKey.includes('BEGIN')) {
      console.warn('[WhatsApp] Invalid SSH key format, skipping message.');
      return;
    }

    await executeCommand(serverIP, privateKey, curlCommand, username);
    console.log(`[WhatsApp] Message sent to ${cleanPhone} successfully.`);
  } catch (err: any) {
    console.error(`[WhatsApp] Failed to send message to ${recipientPhone}:`, err.message);
  }
}
