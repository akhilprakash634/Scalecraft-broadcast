const fetch = require('node-fetch');
require('dotenv').config();

async function run() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL + '/pg-meta/default/query';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const sql = `
    CREATE TABLE IF NOT EXISTS agent_clients (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      whatsapp_bot_number TEXT UNIQUE,
      business_name TEXT,
      owner_name TEXT,
      email TEXT,
      portal_password TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      whatsapp_phone_number_id TEXT,
      whatsapp_access_token TEXT
    );

    CREATE TABLE IF NOT EXISTS portal_users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id UUID REFERENCES agent_clients(id),
      bot_phone TEXT UNIQUE,
      email TEXT,
      owner_name TEXT,
      business_name TEXT,
      password_hash TEXT,
      portal_created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      last_login_at TIMESTAMP WITH TIME ZONE
    );

    CREATE TABLE IF NOT EXISTS leads_cache (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id UUID REFERENCES agent_clients(id),
      phone TEXT,
      name TEXT,
      intent TEXT,
      summary TEXT,
      is_converted BOOLEAN DEFAULT false,
      is_dnd BOOLEAN DEFAULT false,
      last_message_at TIMESTAMP WITH TIME ZONE,
      user_messages INTEGER DEFAULT 0,
      agent_messages INTEGER DEFAULT 0,
      total_messages INTEGER DEFAULT 0,
      UNIQUE (client_id, phone)
    );

    CREATE TABLE IF NOT EXISTS broadcast_audit (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id UUID REFERENCES agent_clients(id),
      campaign_type TEXT,
      total_leads INTEGER,
      sent INTEGER,
      failed INTEGER,
      status TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS broadcast_jobs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id UUID REFERENCES agent_clients(id)
    );

    CREATE TABLE IF NOT EXISTS broadcast_recipient_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id UUID REFERENCES agent_clients(id),
      message_id TEXT UNIQUE,
      phone TEXT,
      status TEXT,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id UUID REFERENCES agent_clients(id),
      phone TEXT,
      name TEXT,
      opt_in_status TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Reload schema cache
    NOTIFY pgrst, 'reload schema';
  `;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey
      },
      body: JSON.stringify({ query: sql })
    });

    const text = await res.text();
    console.log(res.status, text);
  } catch(e) {
    console.error(e);
  }
}
run();
