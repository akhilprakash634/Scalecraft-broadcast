require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function test() {
  const { data, error } = await supabase.from('agent_clients').update({ timezone: 'Asia/Kolkata' }).eq('id', '0473ebb1-f2c0-433e-8e2b-5204c43e1a0e').select();
  console.log('Error:', error);
  console.log('Data:', data);
}
test();
