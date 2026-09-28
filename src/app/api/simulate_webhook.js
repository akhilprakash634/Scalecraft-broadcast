const http = require('http');

const payload = {
  object: 'whatsapp_business_account',
  entry: [
    {
      id: '1582230076722568',
      changes: [
        {
          value: {
            messaging_product: 'whatsapp',
            metadata: {
              display_phone_number: '1234567890',
              phone_number_id: '1388515367672960' // Matches the one from logs
            },
            contacts: [
              {
                profile: { name: 'Test User' },
                wa_id: '917902819158'
              }
            ],
            messages: [
              {
                from: '917902819158',
                id: 'wamid.HBgLOTE3OTAyODE5MTU4FQIAEhgUM0EwQTgzM0Q3NjJGODFBNTEzMkEA',
                timestamp: Math.floor(Date.now() / 1000).toString(),
                text: { body: 'Hello! This is a simulated reply to test the inbox.' },
                type: 'text'
              }
            ]
          },
          field: 'messages'
        }
      ]
    }
  ]
};

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/webhooks/whatsapp-cloud',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  }
};

const req = http.request(options, (res) => {
  console.log(`Webhook simulation status: ${res.statusCode}`);
});

req.on('error', (error) => {
  console.error('Error simulating webhook:', error);
});

req.write(JSON.stringify(payload));
req.end();
