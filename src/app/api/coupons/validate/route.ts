import { NextResponse } from 'next/server';
import { validateCoupon } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { code, productId, price, currency = 'INR' } = 
      await request.json();
    
    if (!code?.trim()) {
      return NextResponse.json(
        { valid: false, error: 'Enter a coupon code' },
        { status: 400 }
      );
    }

    const originalPrice = Number(price) || 0;
    const result = await validateCoupon(
      code.trim(), 
      productId || '',
      originalPrice,
      currency
    );
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Coupon validation error:', error);
    // Return user-friendly error, not "Internal error"
    return NextResponse.json(
      { valid: false, error: 'Invalid coupon code' },
      { status: 200 } // 200 so frontend handles it
    );
  }
}

