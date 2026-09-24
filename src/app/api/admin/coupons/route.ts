import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { getAllCoupons, createCoupon, toggleCoupon, deleteCoupon } from '@/lib/db';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [coupons, dbProductsRes] = await Promise.all([
      getAllCoupons(),
      supabaseAdmin
        .from('saas_products')
        .select('id, name, price, status')
        .order('sort_order', { ascending: true })
    ]);

    const products = (dbProductsRes.data || []).map((p: any) => ({
      _id: p.id,
      name: p.name,
      price: Number(p.price),
      status: p.status === 'published' ? 'live' : p.status
    }));

    return NextResponse.json({ coupons, products });
  } catch (error: any) {
    console.error('Admin Coupons GET Error:', error.message);
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
    const { code, type, value, allowed_product_ids, max_uses, expires_at } = body;
    if (!code || !type || value === undefined) {
      return NextResponse.json({ error: 'Code, type, and value are required' }, { status: 400 });
    }
    const newCoupon = await createCoupon({
      code,
      type,
      value: Number(value),
      allowed_product_ids: allowed_product_ids || undefined,
      max_uses: max_uses ? parseInt(max_uses) : undefined,
      expires_at: expires_at || undefined
    });
    return NextResponse.json({ success: true, coupon: newCoupon });
  } catch (error: any) {
    console.error('Admin Coupons POST Error:', error.message);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const { id, is_active } = body;
    if (!id || is_active === undefined) {
      return NextResponse.json({ error: 'ID and is_active status are required' }, { status: 400 });
    }
    const updated = await toggleCoupon(id, is_active);
    return NextResponse.json({ success: true, coupon: updated });
  } catch (error: any) {
    console.error('Admin Coupons PATCH Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }
    await deleteCoupon(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Admin Coupons DELETE Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
