import { NextResponse } from 'next/server';
import { getSessionClient } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const clientRecord = await getSessionClient();
    if (!clientRecord) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('client_id', clientRecord._id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fetch notifications error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('Notifications GET Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST() {
  try {
    const clientRecord = await getSessionClient();
    if (!clientRecord) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ read: true })
      .eq('client_id', clientRecord._id);

    if (error) {
      console.error('Mark read notifications error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'All notifications marked as read' });
  } catch (error: any) {
    console.error('Notifications POST Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
