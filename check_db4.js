const fs = require('fs');
const path = require('path');
const https = require('https');

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

// Fetch any logs containing f04070
const url = `${supabaseUrl}/rest/v1/broadcast_recipient_logs?campaign_id=ilike.*f04070*`;

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
    console.log(`Status: ${res.statusCode}`);
    try {
        const json = JSON.parse(data);
        console.log(`Found ${json.length} rows`);
        if (json.length > 0) {
            console.log(json[0]);
        }
    } catch(e) {
        console.log(data);
    }
  });
});
req.end();
