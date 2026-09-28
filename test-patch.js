const { NextRequest } = require('next/server');
const { PATCH } = require('./src/app/api/dashboard/client/route.ts'); // Needs ts-node or similar.

async function test() {
  const req = new NextRequest('http://localhost:3000/api/dashboard/client', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      // We need to bypass auth or set a cookie.
    },
    body: JSON.stringify({ businessName: 'Test Dummy', timezone: 'IST' })
  });
  const res = await PATCH(req);
  console.log('Status:', res.status);
  console.log('Body:', await res.json());
}
test();
