import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ valid: false, message: 'Reset token is required.' });
    }

    // 1. Look up portal_users by reset_token in Supabase
    const { data: portalUser, error: queryError } = await supabaseAdmin
      .from('portal_users')
      .select('*')
      .eq('reset_token', token)
      .maybeSingle();

    if (queryError) {
      console.error('[Verify Token] Supabase query error:', queryError.message);
      return NextResponse.json({ valid: false, message: 'Error querying token database.' });
    }

    if (!portalUser) {
      return NextResponse.json({ valid: false, message: 'Invalid or expired password reset link.' });
    }

    // 2. Check reset_token_expires_at > now
    const expiresAt = portalUser.reset_token_expires_at;
    if (!expiresAt || new Date(expiresAt).getTime() < Date.now()) {
      return NextResponse.json({ valid: false, message: 'This reset link has expired.' });
    }

    // 3. Return valid
    return NextResponse.json({ valid: true, message: 'Token is valid.' });
  } catch (error: any) {
    console.error('[Verify Token] API Route Error:', error.message);
    return NextResponse.json({ valid: false, message: 'Internal Server Error' });
  }
}
