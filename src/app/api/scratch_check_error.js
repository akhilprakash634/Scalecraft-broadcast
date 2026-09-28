require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkError() {
  const { data, error } = await supabase
    .from('whatsapp_campaign_recipients')
    .select('status, error_message, campaign_id, whatsapp_contacts(phone)')
    .eq('status', 'failed')
    .limit(5);
    
  console.log("Recent failed recipients:");
  console.log(JSON.stringify(data, null, 2));
  if (error) console.error("Query Error:", error);
}

checkError();
