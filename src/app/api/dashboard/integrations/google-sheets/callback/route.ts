import { NextResponse } from 'next/server';
import { getSessionClient } from '@/lib/auth';
import { exchangeCodeForTokens, getGoogleUserEmail } from '@/lib/googleSheets';
import { supabaseAdmin } from '@/lib/supabase';
import { randomUUID } from 'crypto';

export async function GET(request: Request) {
  try {
    const client = await getSessionClient();
    if (!client) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    if (!code) {
      return NextResponse.redirect(new URL('/dashboard/crm?sync_setup=error&reason=no_code', request.url));
    }

    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const redirectUri = `${protocol}://${host}/api/dashboard/integrations/google-sheets/callback`;

    const tokens = await exchangeCodeForTokens(code, redirectUri);
    const email = await getGoogleUserEmail(tokens.access_token);

    const { data: dbClient } = await supabaseAdmin
      .from('agent_clients')
      .select('type_specific_data')
      .eq('id', client.clientId)
      .single();

    let tsd: any = {};
    if (dbClient?.type_specific_data) {
      try {
        tsd = typeof dbClient.type_specific_data === 'string'
          ? JSON.parse(dbClient.type_specific_data)
          : dbClient.type_specific_data;
      } catch {}
    }

    const webhookSecret = tsd.google_oauth?.webhook_secret || randomUUID();

    tsd.google_oauth = {
      ...(tsd.google_oauth || {}),
      refresh_token: tokens.refresh_token || tsd.google_oauth?.refresh_token,
      access_token: tokens.access_token,
      expiry_date: Date.now() + (tokens.expires_in * 1000),
      email: email || tsd.google_oauth?.email || '',
      webhook_secret: webhookSecret,
      row_hashes: tsd.google_oauth?.row_hashes || {}
    };

    await supabaseAdmin
      .from('agent_clients')
      .update({ type_specific_data: JSON.stringify(tsd) })
      .eq('id', client.clientId);

    return NextResponse.redirect(new URL('/dashboard/crm?sync_setup=success', request.url));
  } catch (error: any) {
    console.error('[Google Callback Error]:', error.message);
    return NextResponse.redirect(new URL(`/dashboard/crm?sync_setup=error&reason=${encodeURIComponent(error.message)}`, request.url));
  }
}
