import { NextResponse } from 'next/server';
import { getSessionClient } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const clientRecord: any = await getSessionClient();
    if (!clientRecord || !clientRecord.whatsappWabaId || !clientRecord.whatsappAccessToken) {
      return NextResponse.json({ error: 'Unauthorized or Meta not configured' }, { status: 401 });
    }

    const res = await fetch(`https://graph.facebook.com/v19.0/${clientRecord.whatsappWabaId}/flows?fields=id,name,status,categories,version,validation_errors`, {
      headers: {
        'Authorization': `Bearer ${clientRecord.whatsappAccessToken}`
      }
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Meta API Error:', errorText);
      return NextResponse.json({ error: 'Failed to fetch Meta flows' }, { status: 502 });
    }

    const data = await res.json();
    const flows = data.data || [];
    
    if (flows.length > 0) {
      const { error: upsertError } = await supabaseAdmin
        .from('whatsapp_flows')
        .upsert(
          flows.map((f: any) => ({
            business_id: clientRecord.id,
            meta_flow_id: f.id,
            name: f.name,
            status: f.status,
            category: (f.categories && f.categories.length > 0) ? f.categories[0] : 'OTHER',
            version: f.version || null,
            updated_at: new Date().toISOString(),
            last_synced_at: new Date().toISOString()
          })),
          { onConflict: 'business_id, meta_flow_id' }
        );
        
      if (upsertError) console.error('Failed to sync flows to DB:', upsertError);
    }

    return NextResponse.json({ flows });
  } catch (error: any) {
    console.error('Flows GET Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
