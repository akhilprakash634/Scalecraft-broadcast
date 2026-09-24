import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://paymentgateway.growyourbusiness.today';
const SANITY_API_TOKEN = process.env.NEXT_PUBLIC_SANITY_TOKEN || 
  process.env.NEXT_PUBLIC_SANITY_API_TOKEN || 
  'skc7HnniWstSoyC7mJsw414GZLgPt2Nlc3CISGLtJar532FVTTQSuIApKsIkD9g4bXKw1N3YnhYcwCSqbnxtLlwNJAvgr2065ZQktcgVSXTrTtzIAUb8MZjyg2Wqr0RlAVeAiZZYNSGbupfG14R2SsVrzwaXEkvHb0K6YndyRj9Oen7xurOR';

export async function POST(request: NextRequest) {
  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { email, name, productId, amount, couponCode, paymentId, businessName, botPhone, ownerPhone, geminiApiKey } = body;

    if (!email || !productId) {
      return NextResponse.json({ error: 'Email and Product ID are required' }, { status: 400 });
    }

    const res = await fetch(`${API_URL}/api/admin/manual-register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-sanity-token': SANITY_API_TOKEN
      },
      body: JSON.stringify({
        email,
        name,
        productId,
        amount,
        couponCode,
        paymentId,
        businessName,
        botPhone,
        ownerPhone,
        geminiApiKey
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: errText || 'Failed to manually register purchase via payment server' }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('API Manual Register Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
