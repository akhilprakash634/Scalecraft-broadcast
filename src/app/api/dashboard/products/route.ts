import { NextResponse } from 'next/server';
import { getSessionClient } from '@/lib/auth';
import { readFile, uploadFile, executeCommand, restartAgent, resolveHermesContext } from '@/lib/ssh';
import { getProducts, upsertProduct, deleteProduct, bulkUpsertProducts } from '@/lib/db';

async function syncProductsToVPS(client: any) {
  const ctx = resolveHermesContext(client);
  const products = await getProducts(client.id || client._id);
  const json = JSON.stringify(products, null, 2);
  const productsPath = `${ctx.profileRoot}/products.json`;
  await uploadFile(
    ctx.ip,
    client.ssh_private_key || client.sshPrivateKey,
    json,
    productsPath,
    client.server_user || client.serverUser || 'ubuntu'
  );
}

export async function GET() {
  try {
    const client = await getSessionClient();
    if (!client) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clientId = client.id || client._id;
    let products = await getProducts(clientId);

    if (products.length === 0) {
      // First time - migrate from VPS
      const { sshPrivateKey, serverUser } = client;
      const ctx = resolveHermesContext(client);
      const ip = ctx.ip;
      const productsPath = `${ctx.profileRoot}/products.json`;
      if (ip && sshPrivateKey) {
        const vpsContent = await readFile(
          ip,
          sshPrivateKey,
          productsPath,
          serverUser || 'ubuntu'
        );
        if (vpsContent) {
          try {
            const vpsProducts = JSON.parse(vpsContent);
            // Bulk insert into Supabase
            await bulkUpsertProducts(clientId,
              vpsProducts.map((p: any, i: number) => ({
                id: p.id || undefined,
                name: p.name,
                description: p.description,
                price: p.price,
                url: p.url,
                image_url: p.image || p.image_url,
                images: p.images || (p.image || p.image_url ? [p.image || p.image_url] : []),
                features: p.features || p.whatsInside || p.content,
                demo_url: p.demo_url || '',
                demo_type: p.demo_type || 'Video',
                support_notes: p.support_notes || '',
                not_included: p.not_included || '',
                active: p.active ?? true,
                sort_order: i,
              }))
            );
            // Return migrated products
            products = await getProducts(clientId);
          } catch (e: any) {
            console.error('Failed to parse or migrate products from VPS:', e.message);
          }
        }
      }
    }

    return NextResponse.json(products);
  } catch (error: any) {
    console.error('Products GET API Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const client = await getSessionClient();
    if (!client) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { products } = await request.json();
    if (!Array.isArray(products)) {
      return NextResponse.json({ error: 'Products list must be an array' }, { status: 400 });
    }

    if (products.length > 20) {
      return NextResponse.json({ error: 'Maximum limit is 20 products per agent' }, { status: 400 });
    }

    const clientId = client.id || client._id;

    // Get existing products from Supabase first
    const existing = await getProducts(clientId);

    // Bulk upsert new list
    await bulkUpsertProducts(clientId, products);

    // Find any deleted products
    const incomingIds = new Set(products.map((p: any) => p.id).filter(Boolean));
    const deleted = existing.filter((p: any) => p.id && !incomingIds.has(p.id));
    for (const d of deleted) {
      await deleteProduct(clientId, d.id);
    }

    // Sync updated Supabase catalog to VPS
    await syncProductsToVPS(client);

    const ctx = resolveHermesContext(client);
    const { sshPrivateKey, serverUser } = client;
    const ip = ctx.ip;
    if (!ip || !sshPrivateKey) {
      return NextResponse.json({ error: 'Server details missing' }, { status: 400 });
    }

    const productsPath = `${ctx.profileRoot}/products.json`;
    const soulPath = ctx.soulPath;

    // Python script to parse products.json and update the "## Products Offered" section in SOUL.md
    const updateSoulPython = `
import json, os
products_path = '${productsPath}'
soul_path = '${soulPath}'

products = []
if os.path.exists(products_path):
    try:
        with open(products_path) as f:
            products = json.load(f)
    except Exception:
        pass

prod_md = "## PRODUCTS & SERVICES\\n\\n"
active_products = [p for p in products if p.get('active', True)]
if active_products:
    for p in active_products:
        prod_md += f"- **{p['name']}** (Price: INR {p['price']})\\n"
        prod_md += f"  Description: {p['description']}\\n"
        if p.get('url'):
            prod_md += f"  Purchase URL: {p['url']}\\n"
        if p.get('content'):
            prod_md += f"  What's Inside:\\n"
            for line in p['content'].strip().splitlines():
                if line.strip():
                    prod_md += f"    {line.strip()}\\n"
        prod_md += "\\n"
else:
    prod_md += "No products are currently available in our catalog.\\n\\n"

if os.path.exists(soul_path):
    with open(soul_path) as f:
        soul_content = f.read()
else:
    soul_content = "# Agent Personality\\n\\n"

headings = ["## PRODUCTS & SERVICES", "## Products Offered", "## OFFERED PRODUCTS", "## WHAT YOU SELL"]
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
print("SUCCESS")
    `;

    // Upload script
    const pyScriptPath = `/home/ubuntu/update_products_soul_${client._id}.py`;
    await uploadFile(ip, sshPrivateKey, updateSoulPython, pyScriptPath, serverUser || 'ubuntu');

    // Run script
    const pyResult = await executeCommand(ip, sshPrivateKey, `python3 ${pyScriptPath}`, serverUser || 'ubuntu');
    // Clean up
    await executeCommand(ip, sshPrivateKey, `rm ${pyScriptPath}`, serverUser || 'ubuntu');

    if (!pyResult.stdout.includes('SUCCESS')) {
      return NextResponse.json(
        { error: `Failed to rebuild agent SOUL.md prompt: ${pyResult.stderr}` },
        { status: 500 }
      );
    }

    // Clear stale session system_prompts in SQLite state.db so Hermes
    // rebuilds from the fresh SOUL.md on the next conversation turn
    // (same logic as instructions/route.ts - without this, ongoing chats
    //  keep using the old cached system prompt even after SOUL.md is updated)
    const stateDb = `${ctx.profileRoot}/state.db`;
    await executeCommand(
      ip,
      sshPrivateKey,
      `python3 -c "import sqlite3; conn = sqlite3.connect('${stateDb}'); conn.execute('UPDATE sessions SET system_prompt = NULL'); conn.commit(); conn.close(); print('Sessions cleared')" 2>/dev/null || true`,
      serverUser || 'ubuntu'
    );

    // Restart agent gateway
    const restartSuccess = await restartAgent(client, sshPrivateKey, serverUser || 'ubuntu');
    if (!restartSuccess) {
      return NextResponse.json({
        success: true,
        message: 'Products saved, but gateway restart command failed. Please restart manually.',
      });
    }

    return NextResponse.json({ success: true, message: 'Products saved and agent prompt rebuilt. Restarting agent...' });
  } catch (error: any) {
    console.error('Products POST API Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
