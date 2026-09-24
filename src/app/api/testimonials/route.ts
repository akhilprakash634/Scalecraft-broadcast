import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const [reviewsRes, productsRes] = await Promise.all([
      supabaseAdmin
        .from('testimonials')
        .select('id, name, rating, comment, profession, created_at, saas_products(name)')
        .eq('approved', true)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('saas_products')
        .select('id, name')
        .eq('status', 'published')
        .order('sort_order', { ascending: true })
    ]);

    if (reviewsRes.error) throw reviewsRes.error;
    if (productsRes.error) throw productsRes.error;

    const formattedReviews = (reviewsRes.data || []).map((r: any) => ({
      _id: r.id,
      name: r.name,
      rating: r.rating,
      comment: r.comment,
      profession: r.profession,
      createdAt: r.created_at,
      productName: r.saas_products?.name || null
    }));

    const formattedProducts = (productsRes.data || []).map((p: any) => ({
      _id: p.id,
      name: p.name
    }));

    return NextResponse.json({ reviews: formattedReviews, products: formattedProducts });
  } catch (error: any) {
    console.error('Testimonials GET Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, rating, comment, productId, profession } = body;

    if (!name || !rating || !comment) {
      return NextResponse.json({ error: 'Name, rating, and comment are required.' }, { status: 400 });
    }

    const payload = {
      name,
      rating: Number(rating),
      comment,
      profession: profession || 'ScaleCraft User',
      product_id: productId || null,
      approved: false // Default to false, pending admin approval
    };

    const { data: result, error } = await supabaseAdmin
      .from('testimonials')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      message: 'Thank you! Your testimonial has been submitted for admin approval.',
      id: result.id 
    });
  } catch (error: any) {
    console.error('Testimonials POST Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
