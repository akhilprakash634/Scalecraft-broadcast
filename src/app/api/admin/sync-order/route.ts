import { NextResponse } from 'next/server';
import { createOrder, incrementCouponUse } from '@/lib/db';

export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const adminSecret = request.headers.get('x-admin-secret');
    const expectedSecret = process.env.ADMIN_SECRET;
    if (!expectedSecret) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }
    if (adminSecret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orderData = await request.json();
    console.log('[sync-order API] Received order to sync:', orderData.order_id);
    
    const created = await createOrder(orderData);
    
    // Increment coupon usage if applied
    if (orderData.coupon_code) {
      try {
        await incrementCouponUse(orderData.coupon_code);
      } catch (couponErr: any) {
        console.error('[sync-order API] Failed to increment coupon usage:', couponErr.message);
      }
    }

    return NextResponse.json({ success: true, order: created });
  } catch (err: any) {
    console.error('[sync-order API] Error:', err);
    return NextResponse.json({ error: err.message || 'Sync failed' }, { status: 500 });
  }
}
