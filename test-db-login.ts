import { createClient } from '@supabase/supabase-js';
require('dotenv').config();

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data: users, error: err1 } = await supabaseAdmin.auth.admin.listUsers();
  console.log('Users:', users?.users?.map(u => ({ id: u.id, email: u.email })));
  
  const { data: clients, error: err2 } = await supabaseAdmin.from('agent_clients').select('*');
  console.log('Clients:', clients);
}
check();
