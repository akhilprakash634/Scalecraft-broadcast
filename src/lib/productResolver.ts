import { supabaseAdmin } from '@/lib/supabase';
import { Product } from '@/types/product';

export interface ProductResolutionResult {
  product: Product | any | null;
  canonicalSlug: string | null;
  matchedBy: 'slug' | 'alias' | 'legacy_slug' | 'id' | null;
  shouldRedirect: boolean;
}

/**
 * Unified Product Resolver
 * Resolves a product record by exact unique identifiers only:
 * 1. Primary slug
 * 2. Aliases array (e.g. ['scalecraft-agent', 'whatsapp-agent'])
 * 3. Legacy slug
 * 4. UUID / ID
 *
 * Never resolves by product_type to avoid ambiguous non-unique matches.
 */
export async function resolveProduct(identifier: string): Promise<ProductResolutionResult> {
  const cleanId = identifier.replace(/^\/+/, '').trim();

  if (!cleanId) {
    return { product: null, canonicalSlug: null, matchedBy: null, shouldRedirect: false };
  }

  try {
    // Query published products
    const { data: products } = await supabaseAdmin
      .from('saas_products')
      .select('*')
      .eq('status', 'published');

    if (!products || products.length === 0) {
      return { product: null, canonicalSlug: null, matchedBy: null, shouldRedirect: false };
    }

    // 1. Check exact canonical slug match
    const slugMatch = products.find((p: any) => p.slug === cleanId);

    // 2. Check aliases array match
    const aliasMatch = products.find((p: any) => {
      const aliases: string[] = Array.isArray(p.aliases)
        ? p.aliases
        : typeof p.aliases === 'string'
        ? p.aliases.split(',').map((a: string) => a.trim().replace(/^\/+/, ''))
        : [];
      return aliases.includes(cleanId);
    });

    // 3. Check legacy_slug match
    const legacyMatch = products.find((p: any) => p.legacy_slug === cleanId);

    // 4. Check ID match
    const idMatch = products.find((p: any) => p.id === cleanId);

    // Find and return the matching product with its relational contents
    const matchedProduct = slugMatch || aliasMatch || legacyMatch || idMatch;
    if (matchedProduct) {
      const productId = matchedProduct.id;

      const [contentRes, mediaRes, testimonialsRes, relationshipsRes] = await Promise.all([
        supabaseAdmin.from('product_content').select('*').eq('product_id', productId).maybeSingle(),
        supabaseAdmin.from('product_media').select('*').eq('product_id', productId).order('sort_order', { ascending: true }),
        supabaseAdmin.from('product_testimonials').select('*').eq('product_id', productId).order('sort_order', { ascending: true }),
        supabaseAdmin.from('product_relationships').select('*').eq('product_id', productId)
      ]);

      const fullProduct = {
        ...matchedProduct,
        content: contentRes?.data || null,
        media_assets: mediaRes?.data || [],
        testimonials_list: testimonialsRes?.data || [],
        relationships: relationshipsRes?.data || []
      };

      return {
        product: fullProduct,
        canonicalSlug: matchedProduct.slug,
        matchedBy: slugMatch ? 'slug' : aliasMatch ? 'alias' : legacyMatch ? 'legacy_slug' : 'id',
        shouldRedirect: !slugMatch,
      };
    }
  } catch (err) {
    console.error(`[resolveProduct] Error resolving identifier "${identifier}":`, err);
  }

  return { product: null, canonicalSlug: null, matchedBy: null, shouldRedirect: false };
}
