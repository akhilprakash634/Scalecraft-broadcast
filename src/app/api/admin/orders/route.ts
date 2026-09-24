import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { getAllOrders } from '@/lib/db';

export async function GET() {
  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [dbOrders, dbProductsRes] = await Promise.all([
      getAllOrders(1000), // Get up to 1000 orders
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

    const mappedOrders = dbOrders.map((o: any) => ({
      _id: o.id || o.order_id,
      customerName: o.customer_name || 'Learner',
      customerEmail: o.customer_email,
      productId: o.sanity_product_id,
      amount: Number(o.amount),
      paymentId: o.payment_id || '',
      orderId: o.order_id,
      status: o.status || 'completed',
      createdAt: o.created_at || new Date().toISOString(),
      licenseKey: o.license_key || undefined,
      couponCode: o.coupon_code || undefined
    }));

    return NextResponse.json({ orders: mappedOrders, products });
  } catch (error: any) {
    console.error('Admin Orders GET Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
