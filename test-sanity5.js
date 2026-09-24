const { createClient } = require('@sanity/client');
require('dotenv').config({ path: '.env.local' });

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '73xk02vb',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-05-14',
  useCdn: false,
  token: process.env.NEXT_PUBLIC_SANITY_TOKEN
});

async function run() {
  console.log('Testing with token prefix:', process.env.NEXT_PUBLIC_SANITY_TOKEN ? process.env.NEXT_PUBLIC_SANITY_TOKEN.substring(0, 10) : 'none');
  try {
    const orders = await client.fetch(`*[_type == "order"] | order(createdAt desc)[0..2] {
      _id,
      customerName,
      customerEmail,
      paymentId,
      productId,
      amount,
      licenseKey,
      createdAt
    }`);
    console.log('Recent orders:', JSON.stringify(orders, null, 2));
  } catch (error) {
    console.error('Error fetching orders:', error);
  }
}

run();
