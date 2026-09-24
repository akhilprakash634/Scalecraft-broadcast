import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://paymentgateway.growyourbusiness.today';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { license_key } = body;

    if (!license_key) {
      return NextResponse.json({ valid: false, message: 'License key is required' }, { status: 400 });
    }

    const response = await fetch(`${API_URL}/api/scalecraft-agent/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ license_key }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { valid: false, message: data.message || 'Invalid key' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('License key validation error:', error);
    return NextResponse.json(
      { valid: false, message: 'Internal server error validating key' },
      { status: 500 }
    );
  }
}
