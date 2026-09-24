import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      amount,        // in paise
      currency = 'INR',
      buyerName,
      buyerEmail,
      productId,
      productName,
      productSlug,
      couponCode,
      originalPrice,
      discountAmount,
      notionUrl,
      clientId,
      plan_type,
    } = body;

    if (!amount || !buyerEmail || !productId) {
      return NextResponse.json(
        { error: 'amount, buyerEmail and productId are required' },
        { status: 400 }
      );
    }

    // Instantiate lazily - env vars are not available at module evaluation time
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    // Create Razorpay order with all notes embedded
    // so the webhook can reconstruct the full purchase record
    const order = await (razorpay.orders as any).create({

      amount: Math.round(amount), // paise
      currency,
      receipt: `rcpt_${Date.now()}`,
      notes: {
        buyer_name: buyerName || '',
        buyer_email: buyerEmail.toLowerCase().trim(),
        productId: productId || '',
        productName: productName || '',
        productSlug: productSlug || '',
        coupon_code: couponCode || '',
        originalPrice: String(originalPrice || amount / 100),
        discountAmount: String(discountAmount || 0),
        notionUrl: notionUrl || '',
        clientId: clientId || '',
        plan_type: plan_type || '',
      },
    });

    return NextResponse.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error: any) {
    console.error('[create-order] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create order' },
      { status: 500 }
    );
  }
}
