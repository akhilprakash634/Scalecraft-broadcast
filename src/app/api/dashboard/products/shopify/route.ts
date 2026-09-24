import { NextResponse } from 'next/server';
import { getSessionClient } from '@/lib/auth';

function stripHtml(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function POST(request: Request) {
  try {
    const client = await getSessionClient();
    if (!client) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { shopifyStoreUrl, shopifyApiKey } = await request.json();
    if (!shopifyStoreUrl || !shopifyApiKey) {
      return NextResponse.json({ error: 'Shopify Store URL and Admin API Key are required' }, { status: 400 });
    }

    // Clean Shopify store URL
    let domain = shopifyStoreUrl.trim();
    domain = domain.replace(/^(https?:\/\/)?(www\.)?/, '');
    domain = domain.replace(/\/+$/, '');

    const shopifyUrl = `https://${domain}/admin/api/2024-01/products.json`;

    const response = await fetch(shopifyUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': shopifyApiKey.trim(),
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Shopify API Error response:', errorText);
      return NextResponse.json(
        { error: `Failed to connect to Shopify API. Status: ${response.status}. Please check your store URL and API key.` },
        { status: response.status }
      );
    }

    const data = await response.json();
    if (!data.products || !Array.isArray(data.products)) {
      return NextResponse.json({ error: 'Invalid response from Shopify API.' }, { status: 502 });
    }

    // Map to our standard Product structure
    const mappedProducts = data.products.map((p: any) => {
      const priceVal = parseFloat(p.variants?.[0]?.price || '0');
      return {
        id: p.id ? p.id.toString() : Date.now().toString() + Math.random().toString().slice(2, 6),
        name: p.title || 'Untitled Product',
        price: isNaN(priceVal) ? 0 : priceVal,
        description: stripHtml(p.body_html || ''),
        image: p.images?.[0]?.src || p.image?.src || '',
        images: p.images ? p.images.map((img: any) => img.src) : (p.image?.src ? [p.image.src] : []),
        active: p.status === 'active',
        url: p.handle ? `https://${domain}/products/${p.handle}` : '',
        demo_url: '',
        demo_type: 'Video',
      };
    });

    return NextResponse.json(mappedProducts);
  } catch (error: any) {
    console.error('Shopify Preview API Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
