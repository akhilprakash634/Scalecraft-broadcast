import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    // 1. Fetch unresolved usage_alerts
    const { data: alerts, error: dbError } = await supabaseAdmin
      .from('usage_alerts')
      .select('*')
      .order('created_at', { ascending: false });

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    // 2. Fetch clients from Supabase to map businessNames
    const { data: dbClients } = await supabaseAdmin
      .from('agent_clients')
      .select('id, business_name, owner_phone');

    const clientMap = new Map((dbClients || []).map((c: any) => [c.id, c]));

    const mappedAlerts = (alerts || []).map((alert: any) => {
      const clientObj = (clientMap.get(alert.client_id) || {}) as any;
      return {
        ...alert,
        businessName: clientObj.business_name || 'Unknown Business',
        ownerPhone: clientObj.owner_phone || 'N/A'
      };
    });

    return NextResponse.json({ alerts: mappedAlerts });
  } catch (error: any) {
    console.error('Admin Fetch Alerts Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
