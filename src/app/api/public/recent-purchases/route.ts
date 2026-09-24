import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('customer_email, product_name, city, created_at')
      .eq('status', 'completed')
      .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString())
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Supabase recent-purchases error:', error);
      throw error;
    }

    const purchases = (data || []).map(order => {
      const email = order.customer_email || '';
      const localPart = email.split('@')[0] || '';
      const cleanName = localPart.split('.')[0] || '';
      
      const capitalized = cleanName 
        ? cleanName.charAt(0).toUpperCase() + cleanName.slice(1) 
        : 'Someone';

      return {
        name: capitalized,
        location: order.city || 'India',
        product: order.product_name || 'ScaleCraft Product',
      };
    });

    return NextResponse.json({ purchases });
  } catch (err) {
    console.error('Recent purchases API exception:', err);
    return NextResponse.json({ purchases: [] });
  }
}
