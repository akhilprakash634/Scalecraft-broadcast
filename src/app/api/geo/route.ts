import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    // 1. Try Vercel geo headers (most accurate on Vercel)
    const vercelCountry = request.headers.get('x-vercel-ip-country');
    const vercelCity = request.headers.get('x-vercel-ip-city');
    if (vercelCountry) {
      return NextResponse.json({ 
        country_code: vercelCountry, 
        city: vercelCity || 'India' 
      });
    }

    // 2. Try Cloudflare header (works on CF pages/edge)
    const cfCountry = request.headers.get('cf-ipcountry');
    if (cfCountry) {
      return NextResponse.json({ 
        country_code: cfCountry, 
        city: 'India' 
      });
    }

    // 3. Fallback: call ipapi server-to-server
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      '';

    const url = ip ? `https://ipapi.co/${ip}/json/` : 'https://ipapi.co/json/';
    const res = await fetch(url, {
      headers: { 'User-Agent': 'scalecraft-geo/1.0' },
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) throw new Error('ipapi fetch failed');
    const data = await res.json();
    return NextResponse.json({ 
      country_code: data.country_code ?? 'IN',
      city: data.city ?? 'India'
    });
  } catch {
    // Default to India on failure
    return NextResponse.json({ country_code: 'IN', city: 'India' });
  }
}
