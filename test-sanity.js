require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@sanity/client');

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: '2024-05-14',
  useCdn: false,
});

async function main() {
  const data = await client.fetch(`*[_type == "product"]{
            _id,
            name,
            "downloadLink": notionUrl,
            price,
            isCombo,
            comboProducts[]->{
              name,
              "downloadLink": notionUrl
            }
          }`);
  console.log(JSON.stringify(data, null, 2));
}
main().catch(console.error);
