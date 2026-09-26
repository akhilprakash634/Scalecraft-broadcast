import { NextResponse } from 'next/server';
import { getSessionClient } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const clientRecord: any = await getSessionClient();
    if (!clientRecord || !clientRecord.whatsappPhoneNumberId || !clientRecord.whatsappAccessToken) {
      return NextResponse.json({ error: 'Unauthorized or Meta not configured' }, { status: 401 });
    }

    const { flow_id, phone_number } = await request.json();
    if (!flow_id || !phone_number) {
       return NextResponse.json({ error: 'Missing flow_id or phone_number' }, { status: 400 });
    }

    const cleanPhone = phone_number.replace(/\D/g, '');

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanPhone,
      type: 'interactive',
      interactive: {
        type: 'flow',
        header: {
          type: 'text',
          text: 'Interactive Form'
        },
        body: {
          text: 'Please tap the button below to open the form.'
        },
        footer: {
          text: 'Powered by ScaleCraft'
        },
        action: {
          name: 'flow',
          parameters: {
            flow_message_version: '3',
            flow_token: `test_${Date.now()}`,
            flow_id: flow_id,
            flow_cta: 'Open Form'
          }
        }
      }
    };

    const res = await fetch(`https://graph.facebook.com/v19.0/${clientRecord.whatsappPhoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${clientRecord.whatsappAccessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errorData = await res.json();
      console.error('Send Flow Error:', JSON.stringify(errorData));
      return NextResponse.json({ error: errorData.error?.message || 'Failed to send Flow' }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json({ success: true, messageId: data.messages?.[0]?.id });
  } catch (error: any) {
    console.error('Flows Test POST Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
