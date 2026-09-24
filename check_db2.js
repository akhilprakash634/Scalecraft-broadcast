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

const url = `${supabaseUrl}/rest/v1/broadcast_recipient_logs?campaign_id=like.f04070*&limit=1`;

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
    console.log(data);
  });
});
req.end();
