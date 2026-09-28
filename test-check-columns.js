require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testCheck() {
  const { data: dbClient } = await supabase.from('agent_clients').select('*').limit(1).single();
  console.log("Columns:", Object.keys(dbClient));
}

testCheck();
