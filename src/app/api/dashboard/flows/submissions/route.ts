import { NextResponse } from 'next/server';
import { getSessionClient } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const clientRecord: any = await getSessionClient();
    if (!clientRecord) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get('contact_id');
    const flowId = searchParams.get('flow_id');
    const search = searchParams.get('search');

    const clientId = clientRecord.clientId || clientRecord.id || clientRecord._id;

    let query = supabaseAdmin
      .from('whatsapp_flow_submissions')
      .select('*, whatsapp_contacts(name)')
      .eq('business_id', clientId)
      .order('submitted_at', { ascending: false });

    if (contactId) {
      query = query.eq('contact_id', contactId);
    }
    if (flowId) {
      query = query.eq('flow_id', flowId);
    }

    const { data: submissions, error } = await query;

    if (error) {
      console.error('Flow Submissions Query Error:', error.message);
      throw error;
    }

    let filteredSubmissions = submissions || [];
    if (search) {
      const s = search.toLowerCase();
      filteredSubmissions = filteredSubmissions.filter((sub: any) => 
        (sub.whatsapp_contacts?.name && sub.whatsapp_contacts.name.toLowerCase().includes(s)) ||
        (sub.phone_number && sub.phone_number.includes(s)) ||
        (sub.reference_number && sub.reference_number.toLowerCase().includes(s))
      );
    }

    return NextResponse.json({ submissions: filteredSubmissions });
  } catch (error: any) {
    console.error('Flow Submissions GET Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
