const { createClient } = require('@sanity/client');
const client = createClient({
  projectId: '73xk02vb',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2024-05-14',
});
async function run() {
  const p = await client.fetch(`*[_type == "product"]{_id, name}`);
  console.log('All products:', p);
}
run();
