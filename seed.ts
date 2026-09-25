import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config({ path: '.env' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function seed() {
  const passwordHash = await bcrypt.hash('password123', 10);
  
  const dummyClient = {
    businessName: 'Dummy Business',
    whatsappBotNumber: '1234567890',
    email: 'dummy@example.com',
    ownerName: 'Dummy Owner',
    portalPassword: passwordHash,
  };

  const { data, error } = await supabaseAdmin
    .from('agent_clients')
    .upsert([dummyClient], { onConflict: 'whatsappBotNumber' })
    .select();

  if (error) {
    console.error('Error seeding:', error);
  } else {
    console.log('Seeded successfully:', data);
  }
}

seed();
