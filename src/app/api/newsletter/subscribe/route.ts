import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_mock');

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // 1. Store in Supabase newsletter_subscribers
    const { error: dbError } = await supabaseAdmin
      .from('newsletter_subscribers')
      .insert({ email, source: 'website' });

    if (dbError) {
      console.error('Database subscription error:', dbError);
      // Unique constraint violation (duplicate key) is code 23505
      if (dbError.code !== '23505') {
        return NextResponse.json({ error: dbError.message }, { status: 500 });
      }
    }

    // 2. Also try subscribing to Resend if configured
    if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 're_mock') {
      try {
        const audienceId = process.env.RESEND_AUDIENCE_ID;
        if (audienceId) {
          await resend.contacts.create({
            email,
            audienceId,
          });
        }
      } catch (resendErr) {
        console.error('Resend subscription error:', resendErr);
        // Do not fail the request if Supabase succeeded but Resend failed
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Subscribe error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
