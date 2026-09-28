require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkCols() {
  const { data, error } = await supabase.rpc('execute_sql', { sql_query: "SELECT column_name FROM information_schema.columns WHERE table_name = 'whatsapp_campaigns'" });
  if (error) {
    // try direct read of a single row to infer columns
    const { data: row } = await supabase.from('whatsapp_campaigns').select('*').limit(1);
    console.log("Columns from row:", Object.keys(row[0] || {}));
  } else {
    console.log(data);
  }
}

checkCols();
