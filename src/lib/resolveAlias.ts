import { supabaseAdmin } from '@/lib/supabase';

/**
 * Dynamic Product Alias Resolver
 * Given a legacy URL path or alias string (e.g. '/scalecraft-agent', 'scalecraft-agent', 'whatsapp-agent'),
 * queries Supabase to resolve the current active product slug.
 *
 * This ensures redirects remain resilient if an admin renames a product slug in the database.
 */
export async function resolveCanonicalProductSlug(aliasOrSlug: string): Promise<string> {
  const cleanAlias = aliasOrSlug.replace(/^\/+/, '').trim();

  try {
    // 1. Direct slug match
    const { data: directMatch } = await supabaseAdmin
      .from('saas_products')
      .select('slug')
      .eq('slug', cleanAlias)
      .eq('status', 'published')
      .maybeSingle();

    if (directMatch?.slug) return directMatch.slug;

    // 2. Query product by ID or legacy_slug match
    const { data: idMatch } = await supabaseAdmin
      .from('saas_products')
      .select('slug')
      .or(`id.eq.${cleanAlias},legacy_slug.eq.${cleanAlias}`)
      .eq('status', 'published')
      .maybeSingle();

    if (idMatch?.slug) return idMatch.slug;

    // 3. Fallback: if SaaS product query
    if (cleanAlias.includes('agent') || cleanAlias.includes('saas')) {
      const { data: saasMatch } = await supabaseAdmin
        .from('saas_products')
        .select('slug')
        .eq('product_type', 'saas')
        .eq('status', 'published')
        .limit(1)
        .maybeSingle();

      if (saasMatch?.slug) return saasMatch.slug;
    }
  } catch (err) {
    console.error(`[resolveCanonicalProductSlug] Error resolving alias "${aliasOrSlug}":`, err);
  }

  // Fallback default canonical slug
  return 'scalecraft-agent-saas';
}
