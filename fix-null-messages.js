require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fixNullBusinessIds() {
  console.log("Fetching messages with null business_id...");
  const { data: messages, error: msgError } = await supabase
    .from('whatsapp_messages')
    .select('id, campaign_id, conversation_id')
    .is('business_id', null);
    
  if (msgError) {
    console.error("Error fetching messages:", msgError);
    return;
  }
  
  console.log(`Found ${messages?.length || 0} messages with null business_id.`);
  
  for (const msg of messages || []) {
    if (!msg.campaign_id) continue;
    
    // Find the campaign to get the correct business_id
    const { data: campaign } = await supabase
      .from('whatsapp_campaigns')
      .select('business_id')
      .eq('id', msg.campaign_id)
      .single();
      
    if (campaign && campaign.business_id) {
      console.log(`Fixing message ${msg.id} with business_id ${campaign.business_id}`);
      // Fix message
      await supabase.from('whatsapp_messages').update({ business_id: campaign.business_id }).eq('id', msg.id);
      
      // Fix conversation
      if (msg.conversation_id) {
        await supabase.from('whatsapp_conversations').update({ business_id: campaign.business_id }).eq('id', msg.conversation_id).is('business_id', null);
      }
    }
  }
  
  console.log("Done.");
}

fixNullBusinessIds();
