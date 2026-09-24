const fs = require('fs');
const path = require('path');
const https = require('https');

// Manually parse .env.development.local
const envPath = path.join(__dirname, '.env.development.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// client.clientId from the fac1da sample
const clientId = 'd19a7f04-74cb-4302-9df5-e4d9229ec47d';
const url = `${supabaseUrl}/rest/v1/broadcast_recipient_logs?select=id,campaign_id,client_id,phone,status,sent_at&client_id=eq.${clientId}&limit=100&order=sent_at.desc`;

const parsedUrl = new URL(url);
const options = {
  hostname: parsedUrl.hostname,
  path: parsedUrl.pathname + parsedUrl.search,
  method: 'GET',
  headers: {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const json = JSON.parse(data);
    console.log(`Found ${json.length} rows for client ${clientId}`);
    
    // Group by campaign_id
    const byCampaign = {};
    json.forEach(row => {
        byCampaign[row.campaign_id] = byCampaign[row.campaign_id] || {count: 0, sent_at: row.sent_at};
        byCampaign[row.campaign_id].count++;
    });
    console.log('By campaign:', byCampaign);
  });
});
req.end();
