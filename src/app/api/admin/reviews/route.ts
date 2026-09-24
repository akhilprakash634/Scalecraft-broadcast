import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: dbReviews, error } = await supabaseAdmin
      .from('testimonials')
      .select('id, name, rating, comment, profession, approved, created_at, product_id, saas_products(name)')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const { data: dbProducts, error: prodError } = await supabaseAdmin
      .from('saas_products')
      .select('id, name')
      .order('sort_order', { ascending: true });

    if (prodError) throw prodError;

    const reviews = (dbReviews || []).map((r: any) => ({
      _id: r.id,
      name: r.name,
      rating: r.rating,
      comment: r.comment,
      profession: r.profession,
      approved: r.approved,
      createdAt: r.created_at,
      productId: r.product_id,
      productName: r.saas_products?.name || null
    }));

    const products = (dbProducts || []).map((p: any) => ({
      _id: p.id,
      name: p.name
    }));

    return NextResponse.json({ reviews, products });
  } catch (error: any) {
    console.error('Admin Reviews GET Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, reviewId, productId } = await request.json();

    if (!reviewId) {
      return NextResponse.json({ error: 'Review ID is required.' }, { status: 400 });
    }

    if (action === 'approve') {
      const { error } = await supabaseAdmin
        .from('testimonials')
        .update({ approved: true })
        .eq('id', reviewId);
      
      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Review approved successfully' });
    }

    if (action === 'delete') {
      const { error } = await supabaseAdmin
        .from('testimonials')
        .delete()
        .eq('id', reviewId);

      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Review deleted successfully' });
    }

    if (action === 'attach_product') {
      const { error } = await supabaseAdmin
        .from('testimonials')
        .update({ product_id: productId || null })
        .eq('id', reviewId);
      
      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Product attached successfully' });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (error: any) {
    console.error('Admin Reviews POST Error:', error.message);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
