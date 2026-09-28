require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data: events } = await supabase
    .from('whatsapp_webhook_events')
    .select('id, created_at, processed')
    .order('created_at', { ascending: false })
    .limit(3);
  console.log("Recent Webhook Events:", events);

  const { data: messages } = await supabase
    .from('whatsapp_messages')
    .select('id, content, direction, status, created_at')
    .order('created_at', { ascending: false })
    .limit(3);
  console.log("Recent Messages:", messages);

  const { data: convs } = await supabase
    .from('whatsapp_conversations')
    .select('id, unread_count, updated_at')
    .order('updated_at', { ascending: false })
    .limit(3);
  console.log("Recent Conversations:", convs);
}
check();
