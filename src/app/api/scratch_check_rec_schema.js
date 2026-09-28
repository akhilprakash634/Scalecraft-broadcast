require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkCols() {
  const { data: row } = await supabase.from('whatsapp_campaign_recipients').select('*').limit(1);
  console.log("Columns from row:", Object.keys(row[0] || {}));
}

checkCols();
