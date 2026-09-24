import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { performTwoWaySync } from '@/lib/googleSheets';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'scalecraft-cron-secret-key-123';
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all clients that have Google Sheets linked
    const { data: clients, error: dbErr } = await supabaseAdmin
      .from('agent_clients')
      .select('*')
      .not('google_sheet_id', 'is', null);

    if (dbErr) {
      console.error('[Sheets Cron] DB fetch error:', dbErr.message);
      return NextResponse.json({ error: 'Database fetch failed' }, { status: 500 });
    }

    const results = [];
    for (const client of (clients || [])) {
      let tsd: any = {};
      if (client.type_specific_data) {
        try {
          tsd = typeof client.type_specific_data === 'string'
            ? JSON.parse(client.type_specific_data)
            : client.type_specific_data;
        } catch {}
      }

      const hasOauth = tsd?.google_oauth?.refresh_token;
      if (!hasOauth) {
        results.push({ clientId: client.id, status: 'skipped_no_oauth' });
        continue;
      }

      if (client.status !== 'active' || client.agent_paused_at) {
        results.push({ clientId: client.id, status: 'skipped_inactive_or_paused' });
        continue;
      }

      try {
        const syncRes = await performTwoWaySync(client);
        results.push({
          clientId: client.id,
          businessName: client.business_name,
          status: syncRes.success ? 'success' : 'failed',
          details: syncRes
        });
      } catch (err: any) {
        console.error(`[Sheets Cron] Sync failed for client ${client.id}:`, err.message);
        results.push({
          clientId: client.id,
          status: 'error',
          error: err.message
        });
      }
    }

    return NextResponse.json({
      processed: results.length,
      results
    });
  } catch (error: any) {
    console.error('[Sheets Cron] Global error:', error.message);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
