import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { logAdminAction } from '@/lib/adminAudit';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { dailyBroadcastLimit } = body;

    // Check if client exists
    const { data: client, error: fetchErr } = await supabaseAdmin
      .from('agent_clients')
      .select('id, business_name')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Update in Supabase
    const { error: updateErr } = await supabaseAdmin
      .from('agent_clients')
      .update({
        daily_broadcast_limit: dailyBroadcastLimit === null ? null : parseInt(String(dailyBroadcastLimit), 10)
      })
      .eq('id', id);

    if (updateErr) {
      throw updateErr;
    }

    await logAdminAction(
      'Update Daily Broadcast Limit',
      { clientId: id, businessName: client.business_name, dailyBroadcastLimit },
      request
    );

    return NextResponse.json({
      success: true,
      message: 'Daily broadcast limit updated successfully.'
    });
  } catch (error: any) {
    console.error('Update Daily Broadcast Limit API Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
