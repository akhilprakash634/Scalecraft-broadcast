import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { syncChangedLeadsToVps } from '@/lib/googleSheets';

export async function POST(request: Request) {
  try {
    const token = request.headers.get('x-scalecraft-token');
    if (!token) {
      return NextResponse.json({ error: 'Missing authentication token' }, { status: 401 });
    }

    // Lookup client by webhook secret in JSONB field
    const { data: dbClient, error: clientErr } = await supabaseAdmin
      .from('agent_clients')
      .select('*')
      .eq('type_specific_data->google_oauth->>webhook_secret', token)
      .maybeSingle();

    if (clientErr || !dbClient) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { phone, name, status, category, notes } = body;

    if (!phone) {
      return NextResponse.json({ error: 'Missing phone number' }, { status: 400 });
    }

    const cleanPhone = String(phone).replace(/\D/g, '');
    const nowStr = new Date().toISOString();

    // 1. Update DB leads_cache
    const updatePayload: Record<string, any> = {
      updated_at: nowStr
    };
    if (name !== undefined) updatePayload.name = name;
    if (status !== undefined) updatePayload.manual_status = status;
    if (category !== undefined) updatePayload.category = category;
    if (notes !== undefined) updatePayload.notes = notes;

    const { error: dbErr } = await supabaseAdmin
      .from('leads_cache')
      .update(updatePayload)
      .eq('phone', cleanPhone)
      .eq('client_id', dbClient.id);

    if (dbErr) {
      console.error(`[Webhook Sync] DB update error:`, dbErr.message);
      return NextResponse.json({ error: 'Failed to update lead in database' }, { status: 500 });
    }

    // 2. Update VPS lead_memory.json
    const vpsUpdate = {
      phone: cleanPhone,
      name,
      status: status || 'New',
      intent: category === 'hot' || category === 'warm' || category === 'cold' || category === 'dead' ? category : 'warm',
      notes
    };

    await syncChangedLeadsToVps(dbClient, [vpsUpdate]).catch(err => {
      console.error('[Webhook Sync] VPS sync failed:', err.message);
    });

    // 3. Update local row hash to prevent redundant cron updates
    let tsd: any = {};
    if (dbClient.type_specific_data) {
      try {
        tsd = typeof dbClient.type_specific_data === 'string'
          ? JSON.parse(dbClient.type_specific_data)
          : dbClient.type_specific_data;
      } catch {}
    }

    const oauth = tsd.google_oauth || {};
    const rowHashes = oauth.row_hashes || {};
    rowHashes[cleanPhone] = `${name || ''}|${status || ''}|${category || ''}|${notes || ''}`;
    oauth.row_hashes = rowHashes;
    oauth.last_sync_time = nowStr;
    tsd.google_oauth = oauth;

    await supabaseAdmin
      .from('agent_clients')
      .update({ type_specific_data: JSON.stringify(tsd) })
      .eq('id', dbClient.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Webhook Sync Error]:', error.message);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
