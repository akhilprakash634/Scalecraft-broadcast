import { NextResponse } from 'next/server';
import { getSessionClient } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import {
  createSpreadsheet,
  shareSpreadsheet,
  initSheetHeaders,
  getClientAccessToken,
  performTwoWaySync
} from '@/lib/googleSheets';

export async function POST(request: Request) {
  try {
    const client = await getSessionClient();
    if (!client) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, spreadsheetId, appsScriptEnabled } = body;

    const { data: dbClient } = await supabaseAdmin
      .from('agent_clients')
      .select('*')
      .eq('id', client.clientId)
      .single();

    if (!dbClient) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    let tsd: any = {};
    if (dbClient.type_specific_data) {
      try {
        tsd = typeof dbClient.type_specific_data === 'string'
          ? JSON.parse(dbClient.type_specific_data)
          : dbClient.type_specific_data;
      } catch {}
    }

    if (action === 'disconnect') {
      delete tsd.google_oauth;
      await supabaseAdmin
        .from('agent_clients')
        .update({
          google_sheet_id: null,
          type_specific_data: JSON.stringify(tsd)
        })
        .eq('id', client.clientId);

      return NextResponse.json({ success: true });
    }

    if (action === 'toggle_apps_script') {
      if (!tsd.google_oauth) {
        return NextResponse.json({ error: 'Google account not connected' }, { status: 400 });
      }
      tsd.google_oauth.apps_script_enabled = !!appsScriptEnabled;
      await supabaseAdmin
        .from('agent_clients')
        .update({ type_specific_data: JSON.stringify(tsd) })
        .eq('id', client.clientId);

      return NextResponse.json({ success: true, google_oauth: tsd.google_oauth });
    }

    const accessToken = await getClientAccessToken(client.clientId);
    if (!accessToken) {
      return NextResponse.json({ error: 'Google Sheets access token not available. Reconnect OAuth.' }, { status: 400 });
    }

    let sheetId = spreadsheetId;

    if (action === 'create') {
      const title = `ScaleCraft Leads - ${dbClient.business_name || 'CRM'}`;
      const sheet = await createSpreadsheet(accessToken, title);
      sheetId = sheet.id;

      await initSheetHeaders(accessToken, sheetId);

      const userEmail = tsd.google_oauth?.email;
      if (userEmail) {
        await shareSpreadsheet(accessToken, sheetId, userEmail);
      }
    } else if (action === 'link') {
      if (!sheetId) {
        return NextResponse.json({ error: 'Spreadsheet ID required for linking' }, { status: 400 });
      }
      try {
        await initSheetHeaders(accessToken, sheetId);
      } catch (err: any) {
        console.warn('[Link Sheet] Init headers error (might already exist):', err.message);
      }
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    await supabaseAdmin
      .from('agent_clients')
      .update({ google_sheet_id: sheetId })
      .eq('id', client.clientId);

    const freshClient = { ...dbClient, google_sheet_id: sheetId };
    const syncRes = await performTwoWaySync(freshClient);

    return NextResponse.json({
      success: true,
      googleSheetId: sheetId,
      sync: syncRes
    });
  } catch (error: any) {
    console.error('[Google Link Error]:', error.message);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
