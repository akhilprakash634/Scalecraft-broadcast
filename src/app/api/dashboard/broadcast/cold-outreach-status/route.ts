import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ error: 'Cold outreach is deprecated on this platform.' }, { status: 410 });
}
