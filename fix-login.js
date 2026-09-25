const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fix() {
  const hash = '$2b$10$/v3Lhx5PXeabZeojh7q1B.ITY0ep2n9g2mFS4R6AcriTJVwactWTi';

  console.log('Fixing agent_clients...');
  const { error: e1 } = await supabaseAdmin
    .from('agent_clients')
    .update({ portal_password: hash })
    .eq('whatsapp_bot_number', '1234567890');
    
  if (e1) console.error('e1:', e1);

  console.log('Fixing portal_users...');
  const { error: e2 } = await supabaseAdmin
    .from('portal_users')
    .update({ password_hash: hash })
    .eq('bot_phone', '1234567890');

  if (e2) console.error('e2:', e2);

  console.log('Done.');
}

fix();
