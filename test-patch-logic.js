require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testPatch() {
  const clientId = '0473ebb1-f2c0-433e-8e2b-5204c43e1a0e';
  
  // Simulate getSessionClient()
  const { data: dbClient } = await supabase.from('agent_clients').select('*').eq('id', clientId).single();
  
  let currentTsd = {};
  if (dbClient.type_specific_data) {
    try {
      currentTsd = JSON.parse(dbClient.type_specific_data);
    } catch {}
  }
  
  const patchData = {
    businessName: 'Scalecraft demo',
    timezone: 'Asia/Kolkata' // Let's use IST
  };
  
  const mappedPatchData = {};
  if (patchData.businessName) mappedPatchData.business_name = patchData.businessName;
  
  let tsdChanged = false;
  if (patchData.timezone) {
    currentTsd.timezone = patchData.timezone;
    tsdChanged = true;
  }
  
  if (tsdChanged) {
    mappedPatchData.type_specific_data = JSON.stringify(currentTsd);
  }
  
  console.log("Updating Supabase with:", mappedPatchData);
  const { data, error } = await supabase.from('agent_clients').update(mappedPatchData).eq('id', clientId).select().single();
  
  if (error) {
    console.error("Supabase Error:", error);
  } else {
    console.log("Supabase Success:", data);
  }
}

testPatch();
