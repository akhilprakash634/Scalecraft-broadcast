const { createClient } = require('@sanity/client');
require('dotenv').config({ path: '.env.local' });

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '73xk02vb',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-05-14',
  useCdn: false,
  token: process.env.NEXT_PUBLIC_SANITY_TOKEN || process.env.SANITY_API_TOKEN
});

const generateLicenseKey = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const randStr = (len) => Array.from({length: len}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return 'SCA-' + randStr(5) + '-' + randStr(5);
};

async function patchMissingLicenseKeys() {
  console.log('Fetching all ScaleCraft Agent orders without license keys...');
  try {
    const orders = await client.fetch(
      '*[_type == "order" && (productId == $productId || productId == "7ca5a08c-6f75-4be5-aa86-d41c2f2d669c") && (licenseKey == null || !defined(licenseKey))] | order(createdAt desc) { _id, customerName, customerEmail, paymentId, licenseKey, createdAt }',
      { productId: 'mOBd3I07NrgTLn79T01oEq' }
    );

    console.log('Found ' + orders.length + ' orders without license keys.');

    for (const order of orders) {
      const newKey = generateLicenseKey();
      console.log('Patching order ' + order._id + ' (email: ' + order.customerEmail + ', paymentId: ' + order.paymentId + ') -> ' + newKey);
      await client.patch(order._id).set({ licenseKey: newKey }).commit();
      console.log('  OK patched.');
    }

    console.log('\nDone! Verification:');
    const verifiedOrders = await client.fetch(
      '*[_type == "order" && (productId == $productId || productId == "7ca5a08c-6f75-4be5-aa86-d41c2f2d669c")] | order(createdAt desc)[0..4] { _id, customerEmail, paymentId, licenseKey, createdAt }',
      { productId: 'mOBd3I07NrgTLn79T01oEq' }
    );
    verifiedOrders.forEach(o => {
      console.log('  paymentId: ' + o.paymentId + '  licenseKey: ' + (o.licenseKey || 'NULL'));
    });
  } catch (error) {
    console.error('Error:', error.message);
  }
}

patchMissingLicenseKeys();
