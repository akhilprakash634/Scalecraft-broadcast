import { createClient } from '@supabase/supabase-js';
require('dotenv').config();

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const email = 'dummy@example.com';
  const password = 'password123';
  
  const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.user) {
    console.log('401 Error:', authError);
    return;
  }
  const userId = authData.user.id;
  console.log('UserId:', userId);

  let { data: client, error: clientErr } = await supabaseAdmin
    .from('agent_clients')
    .select('id, name, whatsapp_phone_number_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!client) {
    const { data: fallbackClient } = await supabaseAdmin
      .from('agent_clients')
      .select('id, name, whatsapp_phone_number_id')
      .limit(1)
      .maybeSingle();
      
    if (fallbackClient) {
      client = fallbackClient;
      await supabaseAdmin.from('agent_clients').update({ user_id: userId }).eq('id', client.id);
      console.log('Auto-healed user_id for client');
    }
  }

  if (!client) {
    console.log('500 Error: Business profile not configured.');
    return;
  }
  
  console.log('Success:', client);
}
run();
