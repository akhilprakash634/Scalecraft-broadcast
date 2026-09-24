import { NextResponse } from 'next/server';
import { getSessionClient } from '@/lib/auth';
import { uploadFile, executeCommand, restartAgent } from '@/lib/ssh';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const client = await getSessionClient();
    if (!client) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { shopifyStoreUrl, shopifyApiKey, products } = await request.json();
    if (!shopifyStoreUrl || !shopifyApiKey || !Array.isArray(products)) {
      return NextResponse.json({ error: 'Shopify Store URL, API Key, and Products are required' }, { status: 400 });
    }

    if (products.length > 20) {
      return NextResponse.json({ error: 'Maximum limit is 20 products per agent' }, { status: 400 });
    }

    const { serverIP, sshPrivateKey, serverUser } = client;
    if (!serverIP || !sshPrivateKey) {
      return NextResponse.json({ error: 'Server details missing' }, { status: 400 });
    }

    // 1. Update in Supabase
    const { error: updateError } = await supabaseAdmin
      .from('agent_clients')
      .update({
        shopify_store_url: shopifyStoreUrl.trim(),
        shopify_api_key: shopifyApiKey.trim()
      })
      .eq('id', client._id);

    if (updateError) {
      console.error('[Shopify Import] Supabase update error:', updateError);
      throw new Error(`Failed to update shopify credentials: ${updateError.message}`);
    }

    // 2. Save shopify credentials as a config file on VPS
    const shopifyConfig = {
      shopifyStoreUrl: shopifyStoreUrl.trim(),
      shopifyApiKey: shopifyApiKey.trim()
    };
    await uploadFile(
      serverIP,
      sshPrivateKey,
      JSON.stringify(shopifyConfig, null, 2),
      '/home/ubuntu/shopify_config.json',
      serverUser || 'ubuntu'
    );

    // 3. Save standard products list to products.json
    await uploadFile(
      serverIP,
      sshPrivateKey,
      JSON.stringify(products, null, 2),
      '/home/ubuntu/products.json',
      serverUser || 'ubuntu'
    );

    // 4. Deploy daily sync Python script
    const pythonSyncScript = `import json, os, urllib.request, re

config_path = '/home/ubuntu/shopify_config.json'
products_path = '/home/ubuntu/products.json'
soul_path = os.path.expanduser('~/.hermes/SOUL.md')

if not os.path.exists(config_path):
    print("No shopify config found")
    exit(1)

with open(config_path) as f:
    config = json.load(f)

shopifyStoreUrl = config.get('shopifyStoreUrl', '').strip()
shopifyApiKey = config.get('shopifyApiKey', '').strip()

if not shopifyStoreUrl or not shopifyApiKey:
    print("Invalid shopify config")
    exit(1)

# Clean store domain
domain = shopifyStoreUrl
if domain.startswith('http://'): domain = domain[7:]
if domain.startswith('https://'): domain = domain[8:]
if domain.startswith('www.'): domain = domain[4:]
domain = domain.split('/')[0]

url = f"https://{domain}/admin/api/2024-01/products.json"
req = urllib.request.Request(url, headers={
    'X-Shopify-Access-Token': shopifyApiKey,
    'Content-Type': 'application/json'
})

try:
    with urllib.request.urlopen(req) as response:
        res_data = json.loads(response.read().decode('utf-8'))
except Exception as e:
    print(f"Shopify request failed: {e}")
    exit(1)

shopify_products = res_data.get('products', [])
mapped_products = []

def strip_html(html):
    if not html: return ''
    clean = re.sub(r'<[^>]*>', ' ', html)
    return re.sub(r'\\s+', ' ', clean).strip()

for p in shopify_products:
    try:
        price_val = float(p.get('variants', [{}])[0].get('price', '0'))
    except Exception:
        price_val = 0.0
        
    img_src = ''
    if p.get('images'):
        img_src = p.get('images')[0].get('src', '')
    elif p.get('image'):
        img_src = p.get('image', {}).get('src', '')
        
    mapped_products.append({
        'id': str(p.get('id', '')),
        'name': p.get('title', 'Untitled'),
        'price': price_val,
        'description': strip_html(p.get('body_html', '')),
        'image': img_src,
        'active': p.get('status') == 'active',
        'url': f"https://{domain}/products/{p.get('handle', '')}" if p.get('handle') else '',
        'demo_url': '',
        'demo_type': 'Video'
    })

# Write to products.json
with open(products_path, 'w') as f:
    json.dump(mapped_products, f, indent=2)

# Update SOUL.md
prod_md = "## Products Offered\\n\\n"
active_products = [p for p in mapped_products if p.get('active', True)]
if active_products:
    for p in active_products:
        prod_md += f"- **{p['name']}** (Price: INR {p['price']})\\n"
        prod_md += f"  Description: {p['description']}\\n"
        if p.get('image'):
            prod_md += f"  Image: {p['image']}\\n"
        if p.get('url'):
            prod_md += f"  URL: {p['url']}\\n"
        prod_md += "\\n"
else:
    prod_md += "No products are currently available in our catalog.\\n\\n"

if os.path.exists(soul_path):
    with open(soul_path) as f:
        soul_content = f.read()
else:
    soul_content = "# Agent Personality\\n\\n"

headings = ["## Products Offered", "## OFFERED PRODUCTS", "## WHAT YOU SELL"]
found_heading = None
for h in headings:
    if h in soul_content:
        found_heading = h
        break

if found_heading:
    parts = soul_content.split(found_heading, 1)
    after = parts[1]
    next_heading_idx = after.find('\\n## ')
    if next_heading_idx != -1:
        rest = after[next_heading_idx:]
    else:
        rest = ""
    new_soul = parts[0] + prod_md + rest
else:
    new_soul = soul_content + "\\n\\n" + prod_md

with open(soul_path, 'w') as f:
    f.write(new_soul)

# Restart gateway
os.system("systemctl --user restart hermes-gateway")
print("SUCCESS")
`;

    const syncScriptPath = '/home/ubuntu/shopify_sync.py';
    await uploadFile(serverIP, sshPrivateKey, pythonSyncScript, syncScriptPath, serverUser || 'ubuntu');
    await executeCommand(serverIP, sshPrivateKey, `chmod +x ${syncScriptPath}`, serverUser || 'ubuntu');

    // 5. Setup daily cron job (runs every 24 hours at midnight)
    const setupCronCmd = `(crontab -l 2>/dev/null | grep -F "${syncScriptPath}") || (crontab -l 2>/dev/null; echo "0 0 * * * /usr/bin/python3 ${syncScriptPath} >/home/ubuntu/shopify_sync.log 2>&1") | crontab -`;
    await executeCommand(serverIP, sshPrivateKey, setupCronCmd, serverUser || 'ubuntu');

    // 6. Perform initial prompt rebuild by running the sync script now
    const runResult = await executeCommand(serverIP, sshPrivateKey, `python3 ${syncScriptPath}`, serverUser || 'ubuntu');

    if (!runResult.stdout.includes('SUCCESS')) {
      return NextResponse.json(
        { error: `Failed to compile/run initial sync on VPS: ${runResult.stderr || runResult.stdout}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Shopify credentials saved and daily sync scheduled. Products updated successfully!' });
  } catch (error: any) {
    console.error('Shopify Import API Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
