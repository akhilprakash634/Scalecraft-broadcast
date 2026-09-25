const { Client } = require('pg');
require('dotenv').config();

// The user provided: postgresql://postgres:Akhil@242001@db.uifttrknecwjbuosbyes.supabase.co:5432/postgres
// We must encode the @ in password
const connectionString = 'postgresql://postgres:Akhil%40242001@db.uifttrknecwjbuosbyes.supabase.co:5432/postgres';

const client = new Client({
  connectionString: connectionString,
});

async function run() {
  try {
    await client.connect();
    console.log('Connected to database');

    const schema = `
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
    `;

    await client.query(schema);
    console.log('Schema created');

    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('password123', 10);

    const insertAgent = `
      INSERT INTO agent_clients (whatsapp_bot_number, business_name, owner_name, email, portal_password)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (whatsapp_bot_number) DO UPDATE SET portal_password = EXCLUDED.portal_password
      RETURNING id;
    `;
    const res = await client.query(insertAgent, ['1234567890', 'Dummy Business', 'Dummy Owner', 'dummy@example.com', hash]);
    const clientId = res.rows[0].id;
    console.log('Agent client seeded:', clientId);

    const insertPortalUser = `
      INSERT INTO portal_users (client_id, bot_phone, email, owner_name, business_name, password_hash)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (bot_phone) DO UPDATE SET password_hash = EXCLUDED.password_hash;
    `;
    await client.query(insertPortalUser, [clientId, '1234567890', 'dummy@example.com', 'Dummy Owner', 'Dummy Business', hash]);
    console.log('Portal user seeded');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

run();
