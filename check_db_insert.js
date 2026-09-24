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

// Fake insert with random UUID
const data = JSON.stringify([{
    client_id: 'd19a7f04-74cb-4302-9df5-e4d9229ec47d',
    campaign_id: '123e4567-e89b-12d3-a456-426614174000', // Random UUID, neither in audit nor jobs
    phone: '917902819158',
    is_new_session: false,
    message_id: 'wamid.fake123',
    status: 'sent'
}]);

const url = `${supabaseUrl}/rest/v1/broadcast_recipient_logs`;
const parsedUrl = new URL(url);
const options = {
  hostname: parsedUrl.hostname,
  path: parsedUrl.pathname + parsedUrl.search,
  method: 'POST',
  headers: {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = https.request(options, (res) => {
  let resData = '';
  res.on('data', (chunk) => { resData += chunk; });
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(resData);
  });
});
req.write(data);
req.end();
