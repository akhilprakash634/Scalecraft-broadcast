const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data, error } = await supabase.rpc('execute_sql', {
    sql_query: "ALTER TABLE whatsapp_campaign_recipients ADD COLUMN IF NOT EXISTS phone TEXT;"
  });
  console.log("RPC Error:", error);
  
  if (error) {
    console.log("Attempting direct table modification if RPC fails...");
    // Often there's no generic execute_sql RPC in standard Supabase.
    // If so, we might not be able to alter the DB without the dashboard.
    // Let's see if we can do it.
  }
}

run();
