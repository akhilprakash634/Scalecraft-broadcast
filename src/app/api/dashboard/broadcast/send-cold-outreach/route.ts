import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ error: 'Cold outreach is deprecated on this platform.' }, { status: 410 });
}
