import { NextResponse } from 'next/server';
import { getSessionClient } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const client = await getSessionClient();
    if (!client) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from('agent_clients')
      .select('crm_stage_templates')
      .eq('id', client.clientId)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ templates: data?.crm_stage_templates || {} });
  } catch (error: any) {
    console.error('[CRM Settings GET] Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const client = await getSessionClient();
    if (!client) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { templates } = await request.json();

    const { error } = await supabaseAdmin
      .from('agent_clients')
      .update({ crm_stage_templates: templates || {} })
      .eq('id', client.clientId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[CRM Settings POST] Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
