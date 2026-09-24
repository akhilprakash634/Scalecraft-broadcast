import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyJWT } from './lib/jwt';
import { supabaseAdmin } from './lib/supabase';
import { validateEnv } from './lib/env';

// Startup environment variable check
validateEnv();

function getClientIP(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')
    ?.split(',')[0]?.trim() || 
    request.headers.get('x-real-ip') || 
    'unknown';
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', pathname);

  const ip = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || '';

  // Protect /admin routes
  if (pathname.startsWith('/admin')) {
    // 1. IP Allowlist Check
    const allowedIpsEnv = process.env.ADMIN_ALLOWED_IPS;
    const ADMIN_ALLOWED_IPS = allowedIpsEnv ? allowedIpsEnv.split(',').map(i => i.trim()).filter(Boolean) : [];

    if (ADMIN_ALLOWED_IPS.length > 0 && !ADMIN_ALLOWED_IPS.includes(ip)) {
      // Log blocked attempt to Supabase
      try {
        await supabaseAdmin.from('admin_audit_log').insert({
          action: 'Admin IP Blocked',
          details: { ip, userAgent, path: pathname },
          ip_address: ip,
          user_agent: userAgent,
          success: false
        });
      } catch (err: any) {
        console.error('[Middleware] Failed to log IP block:', err.message);
      }

      return new NextResponse(
        `<html><head><title>403 Forbidden</title></head><body style="font-family:sans-serif; text-align:center; padding-top:100px; background:#F8FBF8; color:#111110;">
          <h1 style="font-size:24px; font-weight:bold; color:#C62828;">403 Forbidden</h1>
          <p style="font-size:14px; color:#6F6E69;">Your IP address (${ip}) is not authorized to access this administration page.</p>
        </body></html>`,
        {
          status: 403,
          headers: { 'Content-Type': 'text/html' }
        }
      );
    }

    // Skip verification for login page/endpoints
    if (pathname === '/admin/login' || pathname.startsWith('/admin/api/') || pathname === '/admin/setup-2fa') {
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }

    const adminCookie = request.cookies.get('scalecraft_admin_session')?.value;
    if (!adminCookie) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    const secret = process.env.ADMIN_SECRET!;
    const decoded = await verifyJWT(adminCookie, secret);

    if (!decoded || decoded.role !== 'admin') {
      const response = NextResponse.redirect(new URL('/admin/login', request.url));
      response.cookies.delete('scalecraft_admin_session');
      return response;
    }

    // IP and User Agent Session Binding check
    if (decoded.ip !== ip || decoded.ua !== userAgent) {
      console.warn(`[Admin Session] Security violation. IP or User Agent changed. Decoded IP: ${decoded.ip}, Current: ${ip}`);
      try {
        await supabaseAdmin.from('admin_audit_log').insert({
          action: 'Admin Session Invalidation',
          details: { reason: 'IP or User Agent mismatch', decodedIp: decoded.ip, currentIp: ip, decodedUa: decoded.ua, currentUa: userAgent },
          ip_address: ip,
          user_agent: userAgent,
          success: false
        });
      } catch (err: any) {
        console.error('[Middleware] Failed to log session invalidation:', err.message);
      }
      
      const response = NextResponse.redirect(new URL('/admin/login', request.url));
      response.cookies.delete('scalecraft_admin_session');
      return response;
    }

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // Protect /dashboard routes (excluding login and auth api)
  if (pathname.startsWith('/dashboard')) {
    if (pathname === '/dashboard/login' || pathname.startsWith('/dashboard/api/') || pathname === '/dashboard/forgot-password' || pathname === '/dashboard/reset-password') {
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }

    const sessionCookie = request.cookies.get('scalecraft_session')?.value;
    if (!sessionCookie) {
      return NextResponse.redirect(new URL('/dashboard/login', request.url));
    }

    const secret = process.env.JWT_SECRET!;
    const decoded = await verifyJWT(sessionCookie, secret);
    if (!decoded) {
      const response = NextResponse.redirect(new URL('/dashboard/login', request.url));
      response.cookies.delete('scalecraft_session');
      return response;
    }

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
};
