import { NextResponse } from 'next/server';

export const revalidate = 0;

export async function GET() {
  try {
    const ip = process.env.SHARED_SERVER_IP || '13.206.143.171';
    
    const res = await fetch(`http://${ip}:8090/health`, {
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({
        status: 'ok',
        hermes: data,
        server: ip,
      });
    }

    return NextResponse.json({
      status: 'error',
      message: 'Hermes gateway unreachable',
    }, { status: 503 });

  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Could not reach shared server',
    }, { status: 503 });
  }
}
