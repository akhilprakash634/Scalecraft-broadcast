const { createClient } = require('next-sanity');

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '73xk02vb';
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';
const token = process.env.NEXT_PUBLIC_SANITY_TOKEN || process.env.NEXT_PUBLIC_SANITY_API_TOKEN || 'skc7HnniWstSoyC7mJsw414GZLgPt2Nlc3CISGLtJar532FVTTQSuIApKsIkD9g4bXKw1N3YnhYcwCSqbnxtLlwNJAvgr2065ZQktcgVSXTrTtzIAUb8MZjyg2Wqr0RlAVeAiZZYNSGbupfG14R2SsVrzwaXEkvHb0K6YndyRj9Oen7xurOR';

const client = createClient({
  projectId,
  dataset,
  apiVersion: '2024-05-14',
  useCdn: false,
  token,
});

async function seed() {
  const saasProduct = {
    _id: 'scalecraft-agent-saas',
    _type: 'product',
    name: 'ScaleCraft Agent - Managed SaaS',
    slug: { _type: 'slug', current: 'scalecraft-agent-saas' },
    price: 7499, // Rupees - ₹7,499 real setup price
    setupPrice: 7499, // Rupees - ₹7,499 setup price
    originalPrice: 7499, // Rupees
    monthlyPrice: 749, // Rupees - ₹749/month
    testMode: true,
    planType: 'saas',
    status: 'live',
    description: 'Wasting time on customer questions? Deploy a 24/7 WhatsApp AI agent to answer queries and capture leads.',
    features: [
      'Dedicated VPS server Mumbai',
      'We install everything',
      'Dashboard to manage products and leads',
      'Lead CRM synced to Google Sheets',
      'Chat memory system',
      'Usage and billing dashboard',
      'Priority support'
    ]
  };

  console.log('Seeding SaaS product into Sanity...');
  try {
    const res = await client.createOrReplace(saasProduct);
    console.log('SaaS product seeded successfully:', res);
  } catch (err) {
    console.error('Failed to seed SaaS product:', err);
    process.exit(1);
  }
}

seed();
