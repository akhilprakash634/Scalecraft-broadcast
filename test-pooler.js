const { Client } = require('pg');
const host = 'aws-0-ap-northeast-2.pooler.supabase.com';

async function main() {
  const client = new Client({
    connectionString: `postgresql://postgres.uifttrknecwjbuosbyes:Akhil%40242001@${host}:6543/postgres`,
  });
  try {
    await client.connect();
    await client.query("ALTER TABLE agent_clients ADD COLUMN IF NOT EXISTS whatsapp_app_secret text;");
    await client.query("ALTER TABLE agent_clients ADD COLUMN IF NOT EXISTS whatsapp_verify_token text;");
    await client.query("ALTER TABLE agent_clients ADD COLUMN IF NOT EXISTS connection_type text;");
    await client.query("ALTER TABLE agent_clients ADD COLUMN IF NOT EXISTS status text;");
    await client.query("ALTER TABLE agent_clients ADD COLUMN IF NOT EXISTS stage text;");
    console.log('MIGRATION SUCCESSFUL!');
  } catch (e) {
    console.error(e);
  } finally {
    await client.end().catch(()=>{});
  }
}
main();
