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

// Query to get foreign keys for broadcast_recipient_logs using RPC if available, or just use PostgREST
// Actually PostgREST doesn't expose information_schema directly.
// Let's just try inserting a row into broadcast_recipient_logs without an auth token, but using a valid campaign ID vs invalid.
// I can't insert because of RLS in development.
