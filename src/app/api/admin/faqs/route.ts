import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: faqs, error } = await supabaseAdmin
      .from('faqs')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return NextResponse.json(faqs || []);
  } catch (error: any) {
    console.error('Admin FAQs GET Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, faq } = body;

    if (!action) {
      return NextResponse.json({ error: 'Action is required.' }, { status: 400 });
    }

    if (action === 'save') {
      if (!faq || !faq.question || !faq.answer) {
        return NextResponse.json({ error: 'Question and Answer are required.' }, { status: 400 });
      }

      const payload = {
        id: faq.id || undefined, // UUID generated if undefined
        objection: faq.objection || 'General',
        question: faq.question,
        answer: faq.answer,
        category: faq.category || 'General',
        sort_order: Number(faq.sort_order) || 0
      };

      const { data, error } = await supabaseAdmin
        .from('faqs')
        .upsert(payload)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, faq: data });
    }

    if (action === 'delete') {
      const { id } = body;
      if (!id) {
        return NextResponse.json({ error: 'FAQ ID is required for deletion.' }, { status: 400 });
      }

      const { error } = await supabaseAdmin
        .from('faqs')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return NextResponse.json({ success: true, message: 'FAQ entry deleted successfully.' });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (error: any) {
    console.error('Admin FAQs POST Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
