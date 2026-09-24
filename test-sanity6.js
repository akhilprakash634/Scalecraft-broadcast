const { createClient } = require('@sanity/client');
require('dotenv').config({ path: '.env.local' });

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '73xk02vb',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-05-14',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN || process.env.NEXT_PUBLIC_SANITY_TOKEN
});

async function run() {
  console.log('Testing create + patch order...');
  try {
    const doc = {
      _type: 'order',
      customerName: 'Test Buyer',
      customerEmail: 'test-buyer@example.com',
      productId: 'mOBd3I07NrgTLn79T01oEq',
      amount: 2999,
      paymentId: 'pay_test_temp_123',
      orderId: 'order_test_temp_123',
      status: 'completed',
      createdAt: new Date().toISOString(),
    };

    const created = await client.create(doc);
    console.log('Created order ID:', created._id);

    const patched = await client.patch(created._id).set({ licenseKey: 'SCA-TESTY-KEY12' }).commit();
    console.log('Patched order licenseKey:', patched.licenseKey);

    // clean up
    await client.delete(created._id);
    console.log('Deleted test order.');
  } catch (error) {
    console.error('Error during test:', error);
  }
}

run();
