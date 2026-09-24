/**
 * platformMessage.ts
 *
 * Sends WhatsApp messages from ScaleCraft's OWN Cloud API WABA number —
 * the platform sender — not the receiving client's own agent number.
 *
 * Uses SCALECRAFT_PLATFORM_CLIENT_ID env var to look up ScaleCraft's own
 * agent_clients row and read its whatsappPhoneNumberId + whatsappAccessToken.
 *
 * Security notes:
 *  - Credentials are read from the DB server-side only; never exposed to the client.
 *  - All inputs (phone, message, template params) are validated before use.
 *  - toPhone is stripped to digits only — no user-controlled format strings are
 *    interpolated into Graph API URLs.
 *  - TODO(security): Rate-limit this helper per-caller if exposed to user-triggered paths.
 */

import { supabaseAdmin } from './supabase';

export interface PlatformMessageOptions {
  /** Approved Meta template name to use for cold sends (outside 24h window) */
  templateName?: string;
  /** Ordered parameter values for the template body components */
  templateParams?: string[];
  /** Template language code, defaults to 'en' */
  templateLanguage?: string;
  /** Force template even if a plain-text send would work */
  forceTemplate?: boolean;
  /** Optional image URL for image+caption sends */
  imageUrl?: string;
}

interface PlatformCredentials {
  phoneNumberId: string;
  accessToken: string;
}

/**
 * Load ScaleCraft's platform Cloud API credentials once per request.
 * Throws if the env var is missing or the DB row is not found.
 */
async function getPlatformCredentials(): Promise<PlatformCredentials> {
  const platformClientId = process.env.SCALECRAFT_PLATFORM_CLIENT_ID;
  if (!platformClientId) {
    throw new Error(
      '[platformMessage] SCALECRAFT_PLATFORM_CLIENT_ID env var is not set. ' +
      'Configure it in .env.local / Vercel to point at ScaleCraft\'s own agent_clients row.'
    );
  }

  const { data, error } = await supabaseAdmin
    .from('agent_clients')
    .select('whatsapp_phone_number_id, whatsapp_access_token')
    .eq('id', platformClientId)
    .maybeSingle();

  if (error) throw new Error('[platformMessage] DB error loading platform credentials: ' + error.message);
  if (!data?.whatsapp_phone_number_id || !data?.whatsapp_access_token) {
    throw new Error(
      '[platformMessage] ScaleCraft platform client row is missing whatsapp_phone_number_id ' +
      'or whatsapp_access_token. Check SCALECRAFT_PLATFORM_CLIENT_ID and the DB record.'
    );
  }

  return {
    phoneNumberId: data.whatsapp_phone_number_id,
    accessToken: data.whatsapp_access_token,
  };
}

/**
 * Send a WhatsApp message from ScaleCraft's platform number to any phone.
 *
 * @param toPhone  Recipient phone number (any format — will be digit-stripped)
 * @param message  Plain-text message body (used for text sends or as fallback preview)
 * @param opts     Optional: templateName/params for cold sends, imageUrl, forceTemplate
 * @returns        Meta API response object { messages: [{ id }] } on success
 * @throws         On credential failure, invalid phone, or Meta API error
 */
export async function sendPlatformMessage(
  toPhone: string,
  message: string,
  opts: PlatformMessageOptions = {}
): Promise<{ messageId: string }> {
  // Validate and sanitise phone number — digits only, 7–15 chars (ITU-T E.164 range)
  const cleanPhone = toPhone.replace(/[^0-9]/g, '');
  if (cleanPhone.length < 7 || cleanPhone.length > 15) {
    throw new Error(`[platformMessage] Invalid phone number: "${toPhone}" (cleaned: "${cleanPhone}")`);
  }

  // Validate message length
  if (!message || message.length > 4096) {
    throw new Error('[platformMessage] Message must be 1–4096 characters.');
  }

  const { phoneNumberId, accessToken } = await getPlatformCredentials();
  const {
    templateName,
    templateParams = [],
    templateLanguage = 'en',
    forceTemplate = false,
    imageUrl,
  } = opts;

  let body: Record<string, unknown>;

  if (templateName && forceTemplate) {
    // Template send — required for cold recipients outside the 24h window
    body = {
      messaging_product: 'whatsapp',
      to: cleanPhone,
      type: 'template',
      template: {
        name: templateName,
        language: { code: templateLanguage },
        components: templateParams.length > 0
          ? [{
              type: 'body',
              parameters: templateParams.map(p => ({ type: 'text', text: p })),
            }]
          : [],
      },
    };
  } else if (imageUrl) {
    body = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanPhone,
      type: 'image',
      image: { link: imageUrl, caption: message },
    };
  } else {
    body = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanPhone,
      type: 'text',
      text: { body: message },
    };
  }

  const res = await fetch(
    `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  const result = await res.json();

  if (!res.ok || result.error) {
    throw new Error(
      `[platformMessage] Meta API error (${res.status}): ` +
      (result.error?.message || JSON.stringify(result.error || result))
    );
  }

  const messageId: string = result.messages?.[0]?.id || 'unknown';
  console.log(`[platformMessage] Sent to +${cleanPhone} via platform number. Meta msgId: ${messageId}`);
  return { messageId };
}
