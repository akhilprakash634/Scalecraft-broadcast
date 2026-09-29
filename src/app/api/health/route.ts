import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const checks: any = {
      database: 'pending',
      whatsapp_configured: 'pending',
      flows_configured: 'pending',
      env_variables: 'pending'
    };

    // 1. Env Variables
    checks.env_variables = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY ? 'ok' : 'missing';

    // 2. Database Connection & Client Configuration
    if (checks.env_variables === 'ok') {
      const { data: clients, error } = await supabaseAdmin.from('agent_clients').select('id, whatsapp_access_token, whatsapp_phone_number_id').limit(1);
      
      if (error) {
        checks.database = 'error';
      } else {
        checks.database = 'connected';
        
        const client = clients?.[0];
        if (client) {
          checks.whatsapp_configured = client.whatsapp_access_token && client.whatsapp_phone_number_id ? 'ok' : 'missing_credentials';
        } else {
          checks.whatsapp_configured = 'no_client_found';
        }
      }
    }

    // 3. Flows Configuration
    checks.flows_configured = !!process.env.WHATSAPP_FLOW_PRIVATE_KEY ? 'ok' : 'missing';

    return NextResponse.json({
      status: 'success',
      checks,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return NextResponse.json({ status: 'error', message: err.message }, { status: 500 });
  }
}
