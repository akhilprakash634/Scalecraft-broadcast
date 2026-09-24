import { NextResponse } from 'next/server';
import { getSessionClient } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { performTwoWaySync } from '@/lib/googleSheets';

export async function POST(request: Request) {
  try {
    const client = await getSessionClient();
    if (!client) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: dbClient } = await supabaseAdmin
      .from('agent_clients')
      .select('*')
      .eq('id', client.clientId)
      .single();

    if (!dbClient) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const syncRes = await performTwoWaySync(dbClient);
    return NextResponse.json(syncRes);
  } catch (error: any) {
    console.error('[Google Sync Error]:', error.message);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
