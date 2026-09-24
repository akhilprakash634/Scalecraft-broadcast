const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.production.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data, error } = await supabase.from('messages')
    .select('*')
    .or(`lead_id.eq.917902819158,lead_id.eq.+917902819158`)
    .order('created_at', { ascending: false })
    .limit(10);
  console.log(JSON.stringify(data, null, 2));
}
run();
