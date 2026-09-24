import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL('/admin/login', request.url));
  response.cookies.delete('scalecraft_admin_session');
  return response;
}

export async function POST(request: Request) {
  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
  response.cookies.delete('scalecraft_admin_session');
  return response;
}
