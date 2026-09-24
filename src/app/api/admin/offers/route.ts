import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: offers, error } = await supabaseAdmin
      .from('offers')
      .select('*')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, offers });
  } catch (error: any) {
    console.error('Admin Offers GET Error:', error.message);
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
    const { action, offer } = body;

    if (!action) {
      return NextResponse.json({ error: 'Action is required.' }, { status: 400 });
    }

    if (action === 'save') {
      if (!offer || !offer.name || offer.discount_value === undefined) {
        return NextResponse.json({ error: 'Offer Name and Discount Value are required.' }, { status: 400 });
      }

      const payload = {
        name: offer.name,
        title: offer.name, // sync for legacy queries if any
        banner_url: offer.banner_url || '',
        description: offer.description || '',
        offer_type: offer.offer_type || 'flash_sale',
        discount_value: Number(offer.discount_value) || 0,
        start_date: offer.start_date || new Date().toISOString(),
        end_date: offer.end_date || new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
        priority: Number(offer.priority) || 0,
        active: offer.active ?? true,
        status: offer.active ? 'active' : 'draft',
        show_countdown: offer.show_countdown ?? false,
        coupon_code: offer.coupon_code || '',
        products_included: offer.products_included || [],
      };

      let result;
      if (offer.id) {
        // Update existing
        const { data, error } = await supabaseAdmin
          .from('offers')
          .update(payload)
          .eq('id', offer.id)
          .select()
          .single();
        if (error) throw error;
        result = data;
      } else {
        // Insert new
        const { data, error } = await supabaseAdmin
          .from('offers')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        result = data;
      }

      return NextResponse.json({ success: true, offer: result });
    }

    if (action === 'delete') {
      const { id } = body;
      if (!id) {
        return NextResponse.json({ error: 'Offer ID is required for deletion.' }, { status: 400 });
      }

      const { error } = await supabaseAdmin
        .from('offers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Offer deleted successfully.' });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (error: any) {
    console.error('Admin Offers POST Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
