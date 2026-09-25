import { NextResponse } from 'next/server';
import { getSessionClient } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const clientRecord = await getSessionClient();
    if (!clientRecord) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json([]);
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

    // No-op since notifications table is removed

    return NextResponse.json({ success: true, message: 'All notifications marked as read' });
  } catch (error: any) {
    console.error('Notifications POST Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
