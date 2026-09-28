import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;
const client = new Client({
  connectionString: 'postgresql://postgres.uifttrknecwjbuosbyes:Akhil@242001@aws-0-ap-south-1.pooler.supabase.com:6543/postgres'
});

async function main() {
  await client.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id UUID REFERENCES agent_clients(id),
        lead_id TEXT,
        role TEXT,
        content TEXT,
        source TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log("Created messages table successfully!");
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
main();
