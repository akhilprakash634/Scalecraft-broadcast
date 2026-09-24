require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { count, error } = await supabaseAdmin
    .from('broadcast_recipient_logs')
    .select('id', { count: 'exact', head: true });
    
  console.log('Total logs in broadcast_recipient_logs:', count);
}
run();
