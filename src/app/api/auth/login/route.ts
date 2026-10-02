import { NextResponse } from 'next/server';
import { signJWT } from '@/lib/jwt';
import { supabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { botNumber, password } = await request.json();

    if (!botNumber || !password) {
      return NextResponse.json({ error: 'WhatsApp bot number and password are required' }, { status: 400 });
    }

    const cleanedBotNumber = String(botNumber).replace(/\D/g, '');

    // Look up the client directly by bot number
    const { data: client, error: clientErr } = await supabaseAdmin
      .from('agent_clients')
      .select('*')
      .eq('whatsapp_bot_number', cleanedBotNumber)
      .maybeSingle();

    if (!client) {
      return NextResponse.json({ error: 'Incorrect bot number or password.' }, { status: 401 });
    }

    if (!client.portal_password) {
      return NextResponse.json({ error: 'No password set for this account.' }, { status: 401 });
    }

    // Compare hashed password
    const isPasswordMatch = await bcrypt.compare(password, client.portal_password);
    if (!isPasswordMatch) {
      return NextResponse.json({ error: 'Incorrect bot number or password.' }, { status: 401 });
    }

    // Create JWT Session
    const payload = {
      clientId: client.id,
      botNumber: client.whatsapp_bot_number,
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
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Password Login API Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
