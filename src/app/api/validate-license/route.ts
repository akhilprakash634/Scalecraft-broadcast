import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { licenseKey } = body;

    if (!licenseKey) {
      return NextResponse.json({ valid: false, message: 'License key is required' }, { status: 400 });
    }

    const trimmedKey = licenseKey.trim();

    // 1. Check if the license key belongs to a client in Supabase
    const { data: dbClient } = await supabaseAdmin
      .from('agent_clients')
      .select('id, plan_type')
      .eq('license_key', trimmedKey)
      .maybeSingle();

    if (dbClient) {
      return NextResponse.json({
        valid: true,
        product: dbClient.plan_type === 'trial' ? 'ScaleCraft Agent - Managed SaaS (Trial)' : 'ScaleCraft Agent - Managed SaaS'
      });
    }

    // 2. Check if the license key belongs to an order in Supabase
    const { data: dbOrder } = await supabaseAdmin
      .from('orders')
      .select('id, product_name')
      .eq('license_key', trimmedKey)
      .maybeSingle();

    if (dbOrder) {
      return NextResponse.json({
        valid: true,
        product: dbOrder.product_name || 'ScaleCraft Agent'
      });
    }

    return NextResponse.json({ 
      valid: false, 
      message: 'Invalid key' 
    }, { status: 400 });
  } catch (error) {
    console.error('License validation API error:', error);
    return NextResponse.json({ 
      valid: false, 
      message: 'Internal server error validating license' 
    }, { status: 500 });
  }
}
