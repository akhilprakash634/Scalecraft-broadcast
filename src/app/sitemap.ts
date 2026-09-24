/* eslint-disable @typescript-eslint/no-explicit-any */
import { MetadataRoute } from 'next';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://thescalecraft.in';

  let products: any[] = [];
  let posts: any[] = [];

  try {
    const [productsRes, postsRes] = await Promise.all([
      supabaseAdmin
        .from('saas_products')
        .select('slug, updated_at')
        .eq('status', 'published'),
      supabaseAdmin
        .from('blog_posts')
        .select('slug, updated_at, created_at')
    ]);

    products = productsRes.data || [];
    posts = postsRes.data || [];
  } catch (err) {
    console.error('[Sitemap] Database fetch error:', err);
  }

  const productUrls = products
    .filter((p: any) => p && p.slug)
    .map((p: any) => {
      const date = p.updated_at ? new Date(p.updated_at) : new Date();
      return {
        url: `${baseUrl}/products/${p.slug.toLowerCase()}`,
        lastModified: isNaN(date.getTime()) ? new Date() : date,
        changeFrequency: 'weekly' as const,
        priority: 0.9,
      };
    });

  const postUrls = posts
    .filter((p: any) => p && p.slug)
    .map((p: any) => {
      const date = p.updated_at || p.created_at ? new Date(p.updated_at || p.created_at) : new Date();
      return {
        url: `${baseUrl}/blog/${p.slug.toLowerCase()}`,
        lastModified: isNaN(date.getTime()) ? new Date() : date,
        changeFrequency: 'monthly' as const,
        priority: 0.7,
      };
    });

  const staticUrls: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/products`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/products/digital`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/products/saas`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/resources`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/offers`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/testimonials`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/changelog`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/roadmap`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/refund-policy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/legal/privacy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/legal/terms`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
  ];

  return [...staticUrls, ...productUrls, ...postUrls];
}
