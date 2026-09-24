import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import crypto from 'crypto';

// Helper to generate random string for license key
function randStr(len: number) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export async function POST(request: Request) {
  try {
    const { 
      name, 
      email, 
      businessName, 
      botPhone, 
      ownerPhone, 
      geminiApiKey, 
      plan, 
      businessType, 
      plan_type,
      connectionType,
      whatsappPhoneNumberId,
      whatsappAccessToken,
      whatsappAppSecret,
      whatsappWabaId
    } = await request.json();

    if (!botPhone || !email || !name) {
      return NextResponse.json({ error: 'Name, email, and WhatsApp bot phone are required.' }, { status: 400 });
    }

    const cleanBotPhone = botPhone.replace(/\D/g, '');
    const cleanOwnerPhone = ownerPhone ? ownerPhone.replace(/\D/g, '') : '';

    // Extract client IP address from standard request headers
    const rawIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
    // Split to handle comma-separated lists of proxies, taking the client IP
    const acceptedFromIP = rawIp.split(',')[0].trim();

    const termsAccepted = true;
    const termsAcceptedAt = new Date().toISOString();
    const termsVersion = '1.0';

    // 1. If it's a trial checkout request, check if they already had a trial (trial_started_at is not null)
    if (plan_type === 'trial') {
      const { data: existingTrial, error: trialError } = await supabaseAdmin
        .from('agent_clients')
        .select('id, trial_started_at')
        .or(`whatsapp_bot_number.eq.${cleanBotPhone},owner_phone.eq.${cleanOwnerPhone},email.eq.${email.toLowerCase().trim()}`)
        .not('trial_started_at', 'is', null)
        .maybeSingle();

      if (trialError) {
        console.error('[Checkout API] Error checking trial history:', trialError);
      }

      if (existingTrial) {
        return NextResponse.json(
          { 
            error: 'already_had_trial', 
            message: 'This email or phone number has already used a 5-day trial. You can purchase the standard plan to get started immediately.' 
          },
          { status: 400 }
        );
      }
    }

    // Query Supabase for existing record
    const { data: existingClient, error: fetchError } = await supabaseAdmin
      .from('agent_clients')
      .select('id, license_key, status')
      .or(`whatsapp_bot_number.eq.${cleanBotPhone},email.eq.${email.toLowerCase().trim()}`)
      .maybeSingle();

    if (fetchError) {
      console.error('[Checkout API] Error checking existing client in Supabase:', fetchError);
    }

    const clientId = existingClient ? existingClient.id : crypto.randomUUID();
    const licenseKey = existingClient?.license_key || `SCA-${randStr(5)}-${randStr(5)}`;

    const resolvedConnectionType = (whatsappPhoneNumberId && whatsappAccessToken) ? 'cloud_api' : (connectionType || 'baileys');

    // Upsert client to Supabase agent_clients
    const { error: insertError } = await supabaseAdmin
      .from('agent_clients')
      .upsert({
        id: clientId,
        business_name: businessName || 'My Business',
        owner_name: name,
        whatsapp_bot_number: cleanBotPhone,
        owner_phone: cleanOwnerPhone,
        email: email.toLowerCase().trim(),
        business_type: businessType || 'local_services',
        gemini_api_key: geminiApiKey || '',
        plan: plan || 'starter',
        plan_type: plan_type || 'standard',
        connection_type: resolvedConnectionType,
        intended_connection_type: resolvedConnectionType,
        whatsapp_phone_number_id: whatsappPhoneNumberId || null,
        whatsapp_access_token: whatsappAccessToken || null,
        whatsapp_app_secret: whatsappAppSecret || null,
        whatsapp_waba_id: whatsappWabaId || null,
        status: existingClient?.status && existingClient.status !== 'pending' ? existingClient.status : 'pending',
        server_user: 'ubuntu',
        license_key: licenseKey,
        current_otp: '',
        otp_expires_at: new Date(0).toISOString(),
        terms_accepted: termsAccepted,
        terms_accepted_at: termsAcceptedAt,
        terms_version: termsVersion,
        accepted_from_ip: acceptedFromIP,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (insertError) {
      console.error('[Checkout API] Supabase upsert error:', insertError);
      throw new Error(`Failed to create agent client: ${insertError.message}`);
    }

    console.log(`[Checkout API] Upserted client record with terms: ${clientId}`);

    return NextResponse.json({
      success: true,
      message: 'Terms and Privacy Policy acceptance recorded successfully.',
      clientId: clientId,
    });
  } catch (error: any) {
    console.error('[Checkout API] Exception recording terms acceptance:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
