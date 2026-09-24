import { NextResponse } from 'next/server';
import { getSessionClient } from '@/lib/auth';

import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const client = await getSessionClient();
    if (!client) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch active coupons from Supabase
    const { data: dbCoupons, error: dbError } = await supabaseAdmin
      .from('coupons')
      .select('*')
      .eq('is_active', true);

    if (dbError) throw dbError;

    // 2. Fetch all products from Supabase to map allowed product names
    const { data: dbProducts } = await supabaseAdmin
      .from('saas_products')
      .select('id, name');
    const productMap = new Map((dbProducts || []).map((p: any) => [p.id, p]));

    // 3. Map to compatibility response format
    const coupons = (dbCoupons || []).map((coupon: any) => {
      const allowedProducts = (coupon.allowed_product_ids || []).map((id: string) => {
        const prod = productMap.get(id) as any;
        return prod ? { name: prod.name } : null;
      }).filter(Boolean);

      return {
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        allowedProducts
      };
    });

    return NextResponse.json({ success: true, coupons });
  } catch (error: any) {
    console.error('Leads Coupons GET API Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
