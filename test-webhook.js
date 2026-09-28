require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const payload = {"object":"whatsapp_business_account","entry":[{"id":"1567195922090922","changes":[{"value":{"messaging_product":"whatsapp","metadata":{"display_phone_number":"1234567890","phone_number_id":"1236413252899740"},"contacts":[{"profile":{"name":"Akhil"},"wa_id":"917902819158"}],"messages":[{"from":"917902819158","id":"wamid.FAKE_TEST_MESSAGE_LOCAL_5","timestamp":"1695648000","text":{"body":"This is a test from local curl 5"},"type":"text"}]},"field":"messages"}]}]};
const body = JSON.stringify(payload);

async function test() {
  try {
    const eventHash = crypto.createHash('sha256').update(body).digest('hex');
    console.log('eventHash:', eventHash);

    const { data: existingEvent, error: err1 } = await supabaseAdmin
      .from('whatsapp_webhook_events')
      .select('id')
      .eq('event_hash', eventHash)
      .maybeSingle();
      
    if (existingEvent) {
      console.log('Already processed');
      return;
    }

    const phoneNumberId = payload.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;
    console.log('phoneNumberId:', phoneNumberId);
    let clientId = '';
    
    if (phoneNumberId) {
      const { data, error: err2 } = await supabaseAdmin
        .from('agent_clients')
        .select('id, whatsapp_access_token, type_specific_data')
        .eq('whatsapp_phone_number_id', phoneNumberId)
        .single();
      
      console.log('client data:', data, 'error:', err2);
      if (data) clientId = data.id;
    }

    if (!clientId) {
      console.log('no clientId');
      return;
    }

    const { error: insertErr } = await supabaseAdmin.from('whatsapp_webhook_events').insert({
      business_id: clientId,
      event_hash: eventHash,
      payload: payload
    });
    console.log('webhook insert err:', insertErr);

  } catch(e) {
    console.error(e);
  }
}
test();
