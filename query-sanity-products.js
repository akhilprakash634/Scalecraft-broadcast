require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@sanity/client');

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '73xk02vb',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-05-14',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

async function main() {
  const query = `*[_type == "product" && (slug.current == "scalecraft-agent-saas" || _id == "scalecraft-agent-saas" || _id == "drafts.scalecraft-agent-saas")]`;
  const result = await client.fetch(query);
  console.log('Sanity products found matching SaaS:', JSON.stringify(result, null, 2));
}

main().catch(console.error);
