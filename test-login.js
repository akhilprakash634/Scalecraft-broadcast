const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  const dummyClient = {
    whatsapp_bot_number: '1234567890',
    business_name: 'Dummy Business',
    owner_name: 'Dummy Owner',
    email: 'dummy@example.com',
    portal_password: '$2b$10$/v3Lhx5PXeabZeojh7q1B.ITY0ep2n9g2mFS4R6AcriTJVwactWTi'
  };

  const { data: insertedClient, error: err1 } = await supabaseAdmin
    .from('agent_clients')
    .upsert([dummyClient], { onConflict: 'whatsapp_bot_number' })
    .select()
    .single();

  console.log('Inserted Client:', insertedClient?.id, err1);

  if (insertedClient) {
    const dummyPortalUser = {
      client_id: insertedClient.id,
      bot_phone: '1234567890',
      email: 'dummy@example.com',
      owner_name: 'Dummy Owner',
      business_name: 'Dummy Business',
      password_hash: '$2b$10$/v3Lhx5PXeabZeojh7q1B.ITY0ep2n9g2mFS4R6AcriTJVwactWTi'
    };

    const { data: insertedUser, error: err2 } = await supabaseAdmin
      .from('portal_users')
      .upsert([dummyPortalUser], { onConflict: 'bot_phone' })
      .select();

    console.log('Inserted Portal User:', insertedUser, err2);
  }
}

test();
