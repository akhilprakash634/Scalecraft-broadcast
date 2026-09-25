import { NextResponse } from 'next/server';
import { getSessionClient } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';

    const client = await getSessionClient();
    if (!client) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    // Gating check: reflect real capability based on credentials presence, not a database connectionType flag that could be stale
    if (!client.whatsappAccessToken || (!client.whatsappWabaId && !client.whatsappPhoneNumberId)) {
      return NextResponse.json({ 
        templates: [], 
        reason: 'not_configured',
        connectionType: client.connectionType || 'baileys',
        wabaId: client.whatsappWabaId || null,
        phoneNumberId: client.whatsappPhoneNumberId || null,
        debug: ['[Templates] Missing accessToken, or missing both wabaId and phoneNumberId.']
      });
    }

    const wabaId = client.whatsappWabaId;
    const phoneNumberId = client.whatsappPhoneNumberId;
    const accessToken = client.whatsappAccessToken;

    const debugLogs: string[] = [];
    const logDebug = (msg: string, data?: any) => {
      const formatted = msg + (data ? ' ' + JSON.stringify(data) : '');
      console.log(formatted);
      debugLogs.push(formatted);
    };

    logDebug('[Templates] Client credentials:', {
      wabaId,
      phoneNumberId,
      force,
      connectionType: client.connectionType,
      accessTokenPrefix: accessToken ? accessToken.substring(0, 8) + '...' : 'null'
    });

    let templates = [];
    let fetchSucceeded = false;
    let shouldDeriveWaba = !wabaId;
    let activeWabaId = wabaId;

    // Strategy 1: Try WABA ID directly (best)
    // Run even if force=true, but fall back to Strategy 2 if it fails with auth/permission issue
    if (activeWabaId) {
      try {
        const url = `https://graph.facebook.com/v20.0/${activeWabaId}/message_templates` +
          `?fields=name,status,language,category,components&limit=100`;
        logDebug('[Templates] Strategy 1 url:', url);
        const res = await fetch(url, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
          cache: 'no-store'
        });
        logDebug('[Templates] Strategy 1 status:', res.status);
        if (res.ok) {
          const data = await res.json();
          templates = data.data || [];
          fetchSucceeded = true;
          logDebug('[Templates] Strategy 1 found templates count:', templates.length);
        } else {
          const err = await res.json().catch(() => ({}));
          logDebug('[Templates] Strategy 1 failed:', err);
          const errorCode = err.error?.code;
          const errorType = err.error?.type;
          const errorMessage = err.error?.message;
          logDebug(`[Templates] Strategy 1 Graph API error details: [Code: ${errorCode}, Type: ${errorType}] - ${errorMessage}`);
          
          if (res.status === 401 || res.status === 403 || errorCode === 190 || errorCode === 100 || errorType === 'OAuthException') {
            logDebug('[Templates] Auth/Permission error detected on Strategy 1. Setting shouldDeriveWaba = true.');
            shouldDeriveWaba = true;
          }
        }
      } catch (err: any) {
        logDebug('[Templates] Strategy 1 exception:', err.message);
        shouldDeriveWaba = true;
      }
    }

    // Strategy 2: Derive WABA ID by querying the phone number fields directly
    if (shouldDeriveWaba) {
      try {
        logDebug(`[Templates] Strategy 2: Deriving WABA ID for phone number ID ${phoneNumberId}...`);
        const deriveUrl = `https://graph.facebook.com/v20.0/${phoneNumberId}?fields=whatsapp_business_account`;
        logDebug('[Templates] Strategy 2 url:', deriveUrl);
        const deriveRes = await fetch(deriveUrl, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
          cache: 'no-store'
        });
        logDebug('[Templates] Strategy 2 status:', deriveRes.status);
        if (deriveRes.ok) {
          const deriveData = await deriveRes.json();
          const correctWabaId = deriveData.whatsapp_business_account?.id;
          
          if (correctWabaId) {
            logDebug(`[Templates] Strategy 2 MATCH found! Resolved WABA ID is ${correctWabaId}`);
            activeWabaId = correctWabaId;

            // Save correct WABA ID and self-heal connection_type to Supabase for future use
            await supabaseAdmin
              .from('agent_clients')
              .update({ 
                whatsapp_waba_id: correctWabaId,
                connection_type: 'cloud_api'
              })
              .eq('id', client.id || client._id);

            // Fetch templates with correct WABA ID
            const tmplUrl = `https://graph.facebook.com/v20.0/${correctWabaId}/message_templates` +
              `?fields=name,status,language,category,components&limit=100`;
            logDebug('[Templates] Strategy 2 tmpl url:', tmplUrl);
            const tmplRes = await fetch(tmplUrl, {
              headers: { 'Authorization': `Bearer ${accessToken}` },
              cache: 'no-store'
            });
            logDebug('[Templates] Strategy 2 tmpl status:', tmplRes.status);
            if (tmplRes.ok) {
              const tmplData = await tmplRes.json();
              templates = tmplData.data || [];
              fetchSucceeded = true;
              logDebug('[Templates] Strategy 2 final templates:', templates.map((t: any) => ({ name: t.name, status: t.status })));
            } else {
              const err = await tmplRes.json().catch(() => ({}));
              logDebug('[Templates] Strategy 2 templates fetch failed:', err);
              const errorMessage = err.error?.message;
              logDebug(`[Templates] Strategy 2 Graph API templates error: ${errorMessage}`);
            }
          } else {
            logDebug('[Templates] Strategy 2: whatsapp_business_account field was missing in phone number response.');
          }
        } else {
          const err = await deriveRes.json().catch(() => ({}));
          logDebug('[Templates] Strategy 2 failed to derive WABA:', err);
          const errorMessage = err.error?.message;
          logDebug(`[Templates] Strategy 2 Graph API derivation error: ${errorMessage}`);
        }
      } catch (err: any) {
        logDebug('[Templates] Strategy 2 exception:', err.message);
      }
    }

    // No connection_type self-healing because column is missing

    // Show ALL templates except REJECTED
    // (show PENDING so client knows approval status)
    const mapped = templates
      .filter((t: any) => t.status !== 'REJECTED')
      .map((t: any) => ({
        name: t.name,
        status: t.status,
        language: t.language,
        category: t.category,
        bodyText: t.components?.find(
          (c: any) => c.type === 'BODY'
        )?.text || '',
        hasVariables: t.components?.some(
          (c: any) => c.text?.includes('{{')
        ) || false,
        headerText: t.components?.find(
          (c: any) => c.type === 'HEADER' && c.format === 'TEXT'
        )?.text || '',
        footerText: t.components?.find(
          (c: any) => c.type === 'FOOTER'
        )?.text || '',
        components: t.components,
      }));

    logDebug('[Templates] Mapped count:', mapped.length);

    let reason = 'success';
    if (templates.length === 0) {
      if (!wabaId) {
        reason = 'missing_waba_id';
      } else if (!fetchSucceeded) {
        reason = 'api_failed';
      } else {
        reason = 'empty_result';
      }
    }

    return NextResponse.json({ 
      templates: mapped, 
      reason,
      connectionType: client.connectionType || 'baileys',
      wabaId: wabaId || null,
      phoneNumberId: phoneNumberId || null,
      debug: debugLogs 
    });

  } catch (error: any) {
    console.error('[Templates] Error:', error);
    return NextResponse.json({ 
      error: error.message,
      templates: [],
      reason: 'api_failed',
      debug: ['[Templates] Exception: ' + error.message]
    }, { status: 500 });
  }
}
