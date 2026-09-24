import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createOrder, getOrderByRazorpayId, incrementCouponUse } from '@/lib/db';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      buyer_email,
      buyer_name,
      product_id,
      amount,        // in paise
      couponCode,
    } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: 'Missing payment verification fields' },
        { status: 400 }
      );
    }

    // 1. Verify Razorpay signature
    const keySecret = process.env.RAZORPAY_KEY_SECRET!;
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      console.error('[verify-payment] Signature mismatch');
      return NextResponse.json(
        { error: 'Payment signature verification failed' },
        { status: 400 }
      );
    }

    // 2. Idempotency - skip if already written by webhook
    const existing = await getOrderByRazorpayId(razorpay_order_id);
    if (existing) {
      console.log('[verify-payment] Order already exists, skipping duplicate write.');
      return NextResponse.json({ success: true, message: 'Payment verified' });
    }

    // 3. Fetch product details from Supabase for notion URL
    let productName = 'ScaleCraft Product';
    let productSlug = 'scalecraft-product';
    let notionUrl = '';
    try {
      const { data: prod } = await supabaseAdmin
        .from('saas_products')
        .select('id, name, slug, section_visibility')
        .or(`id.eq.${product_id || ''},slug.eq.${product_id || ''}`)
        .maybeSingle();

      if (prod) {
        productName = prod.name || productName;
        productSlug = prod.slug || productSlug;
        const secVis = prod.section_visibility || {};
        notionUrl = secVis.notion_url || secVis.url || '';

        if (!notionUrl) {
          const { data: dlData } = await supabaseAdmin
            .from('product_downloads')
            .select('url')
            .eq('product_id', prod.id)
            .limit(1)
            .maybeSingle();
          if (dlData?.url) notionUrl = dlData.url;
        }
      }
    } catch (dbErr: any) {
      console.warn('[verify-payment] Could not fetch product from Supabase:', dbErr.message);
    }

    const amountInRupees = amount / 100;

    // Get geolocation from request
    let city = 'India';
    let countryCode = 'IN';
    try {
      const { origin } = new URL(request.url);
      const geoRes = await fetch(`${origin}/api/geo`, {
        headers: {
          'x-forwarded-for': request.headers.get('x-forwarded-for') || '',
          'x-real-ip': request.headers.get('x-real-ip') || '',
          'cf-ipcountry': request.headers.get('cf-ipcountry') || '',
          'x-vercel-ip-country': request.headers.get('x-vercel-ip-country') || '',
          'x-vercel-ip-city': request.headers.get('x-vercel-ip-city') || '',
        },
        signal: AbortSignal.timeout(3500),
      });
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        city = geoData.city || 'India';
        countryCode = geoData.country_code || 'IN';
      }
    } catch (err) {
      console.warn('[verify-payment] Failed to call /api/geo during checkout:', err);
    }

    // 4. Write order to Supabase (fallback - webhook may also write it,
    //    but getOrderByRazorpayId above prevents double-insertion)
    await createOrder({
      order_id: razorpay_order_id,
      payment_id: razorpay_payment_id,
      customer_name: buyer_name || 'Valued Customer',
      customer_email: (buyer_email || '').toLowerCase().trim(),
      sanity_product_id: product_id || 'unknown',
      product_name: productName,
      product_slug: productSlug,
      amount: amountInRupees,
      currency: 'INR',
      original_price: amountInRupees,
      coupon_code: couponCode || '',
      discount_amount: 0,
      status: 'completed',
      notion_url: notionUrl,
      city,
      country_code: countryCode,
    });

    console.log(`[verify-payment] Order written to Supabase: ${razorpay_order_id}`);

    // 5. Increment coupon usage if applied
    if (couponCode) {
      try {
        await incrementCouponUse(couponCode);
      } catch (couponErr: any) {
        console.error('[verify-payment] Failed to increment coupon:', couponErr.message);
      }
    }

    return NextResponse.json({ success: true, message: 'Payment verified and order recorded' });
  } catch (error: any) {
    console.error('[verify-payment] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Verification failed' },
      { status: 500 }
    );
  }
}
