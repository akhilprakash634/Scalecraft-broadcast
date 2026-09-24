const { createClient } = require('@sanity/client');

const client = createClient({
  projectId: '73xk02vb',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2024-05-14',
});

async function run() {
  const data = await client.fetch(
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
    { id: "23fed2de-5b67-44e7-afca-a84709fa5bf0" }
  );
  console.log('COMBO:', JSON.stringify(data, null, 2));

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
    { id: "0ba70dd5-83e4-4c4f-9e79-880d850ca431" }
  );
  console.log('SINGLE:', JSON.stringify(data2, null, 2));
}

run();
