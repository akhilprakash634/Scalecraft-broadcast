import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { signJWT } from '@/lib/jwt';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // 1. Authenticate with Supabase Auth using a temporary client so we don't mutate the global supabaseAdmin
    const { createClient } = require('@supabase/supabase-js');
    const tempClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const { data: authData, error: authError } = await tempClient.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Incorrect email or password.' }, { status: 401 });
    }

    const userId = authData.user.id;

    // 2. Map authenticated user to the AgentClient profile
    // In a single tenant system, there is usually only one client, but we match by user_id
    let { data: client, error: clientErr } = await supabaseAdmin
      .from('agent_clients')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    // Fallback: If agent_clients hasn't been linked to user_id yet, just grab the first/only client
    if (!client) {
      const { data: fallbackClient } = await supabaseAdmin
        .from('agent_clients')
        .select('*')
        .limit(1)
        .maybeSingle();
        
      if (fallbackClient) {
        client = fallbackClient;
        // Auto-heal: Link this user to the single tenant client profile
        await supabaseAdmin.from('agent_clients').update({ user_id: userId }).eq('id', client.id);
      }
    }

    if (!client) {
      return NextResponse.json({ error: 'Business profile not configured. Please run database setup.' }, { status: 500 });
    }

    // 3. Create the legacy custom JWT so the rest of the application (getSessionClient) continues working untouched
    const payload = {
      clientId: client.id,
      botNumber: client.whatsapp_phone_number_id || 'unconfigured',
      businessName: client.business_name || client.name,
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days expiration
      iat: Math.floor(Date.now() / 1000),
    };

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return NextResponse.json({ error: 'Server authentication configuration error' }, { status: 500 });
    }
    
    const token = await signJWT(payload, secret);

    const response = NextResponse.json({ success: true, message: 'Logged in successfully' });

    // Set HTTP-only secure cookie
    response.cookies.set('scalecraft_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Login API Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
