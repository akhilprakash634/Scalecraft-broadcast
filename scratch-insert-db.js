import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data: cols } = await supabase.rpc('get_table_columns', { table_name: 'messages' });
  console.log("messages columns (RPC):", cols);
  
  const { data, error } = await supabase.from('messages').select('*').limit(1);
  console.log("data:", data, "error:", error);
}
main();
