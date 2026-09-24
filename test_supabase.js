require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data, count, error } = await supabaseAdmin.from('broadcast_recipient_logs').select('id', { count: 'exact' });
  console.log('Total rows:', count, 'Rows returned:', data ? data.length : 0);
}
run();
