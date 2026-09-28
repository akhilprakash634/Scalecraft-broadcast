import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data: cols1 } = await supabase.rpc('get_table_columns', { table_name: 'broadcast_audit' });
  console.log("broadcast_audit columns (RPC):", cols1);
  
  const { data: cols, error: err } = await supabaseAdmin.from('broadcast_audit').select('id, client_id, status, created_at').limit(1).catch(()=>({data:null, error:null})); // try some known names
}
main();
