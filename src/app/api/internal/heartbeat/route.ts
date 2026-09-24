import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { clientId, status } = body;
    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
    }

    // Validate the per-client heartbeat token supplied as the Authorization bearer.
    // The token is generated once during provisioning and stored in agent_clients.heartbeat_token.
    const authHeader = request.headers.get('authorization') || '';
    const suppliedToken = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : '';

    const { data: client, error: fetchError } = await supabaseAdmin
      .from('agent_clients')
      .select('id, heartbeat_token')
      .eq('id', clientId)
      .maybeSingle();

    if (fetchError || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Enforce token check when the client has a stored token.
    // Older clients provisioned before this change may not yet have a token;
    // they continue to work until they are re-provisioned / manually updated.
    if (client.heartbeat_token) {
      if (!suppliedToken || suppliedToken !== client.heartbeat_token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // Only accept 'online' or 'offline' as valid status values
    const safeStatus = status === 'online' || status === 'offline' ? status : 'online';

    const { error } = await supabaseAdmin
      .from('agent_clients')
      .update({
        cached_status: safeStatus,
        status_checked_at: new Date().toISOString(),
      })
      .eq('id', clientId);

    if (error) {
      console.error('[heartbeat] Failed to update status in Supabase:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[heartbeat] Endpoint error:', err.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
