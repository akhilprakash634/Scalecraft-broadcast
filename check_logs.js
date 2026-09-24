require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkLogs() {
  // Get recent logs for campaign a3a1c4
  const { data, error } = await supabaseAdmin
    .from('broadcast_recipient_logs')
    .select('id, phone, status, message_id')
    .limit(10)
    .order('sent_at', { ascending: false });

  if (error) {
    console.error('Error fetching logs:', error);
    return;
  }

  console.log('Recent broadcast_recipient_logs sample:');
  console.dir(data, { depth: null });
}

checkLogs();
