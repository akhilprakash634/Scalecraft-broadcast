const { createClient } = require('@sanity/client');
const client = createClient({
  projectId: '73xk02vb',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2024-05-14',
});
async function run() {
  const data2 = await client.fetch(
    `*[_type == "product" && _id == $id][0]{
      name,
      "downloadLink": notionUrl,
      price,
      isCombo,
      comboProducts[]->{
        name,
        "downloadLink": notionUrl
      }
    }`,
    { id: "107d9692-842f-4580-9d86-a22f730f6770" }
  );
  console.log('SINGLE:', JSON.stringify(data2, null, 2));
}
run();
