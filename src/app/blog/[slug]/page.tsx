import { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, BookOpen } from 'lucide-react';
import { generateArticleSchema, generateBreadcrumbSchema } from '@/lib/schemaGenerator';

export const revalidate = 60;

export async function generateStaticParams() {
  const { data: posts } = await supabaseAdmin
    .from('blog_posts')
    .select('slug');

  return (posts || []).map((post: any) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  
  const { data: post } = await supabaseAdmin
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (!post) return {};

  const pageUrl = `https://thescalecraft.in/blog/${post.slug}`;
  const ogImage = post.main_image_url || 'https://thescalecraft.in/og-image.jpg';

  return {
    title: `${post.title} | ScaleCraft Blog`,
    description: post.excerpt || `Read ${post.title} on the ScaleCraft blog.`,
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: pageUrl,
      type: 'article',
      publishedTime: post.published_at,
      authors: ['Akhil'],
      images: [{ url: ogImage, alt: post.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: [ogImage],
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  
  const [postRes, otherPostsRes] = await Promise.all([
    supabaseAdmin.from('blog_posts').select('*').eq('slug', slug).maybeSingle(),
    supabaseAdmin.from('blog_posts').select('*').neq('slug', slug).order('published_at', { ascending: false }).limit(3)
  ]);

  const post = postRes.data;
  const otherPosts = otherPostsRes.data || [];

  if (!post) {
    notFound();
  }

  const articleSchema = generateArticleSchema(post);
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: 'https://thescalecraft.in' },
    { name: 'Blog', url: 'https://thescalecraft.in/blog' },
    { name: post.title, url: `https://thescalecraft.in/blog/${post.slug}` },
  ]);

  return (
    <>
      {articleSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
        />
      )}
      {breadcrumbSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
        />
      )}
      <article className="min-h-screen pt-28 pb-20 px-6 max-w-[840px] mx-auto font-body text-text-primary">
        <div className="mb-10 text-center">
          <div className="text-[12px] font-extrabold text-accent tracking-[0.15em] uppercase mb-3">{post.category}</div>
          <h1 className="font-heading text-clamp-h2 font-black tracking-[-1px] leading-[1.15] mb-6">
            {post.title}
          </h1>
          <div className="flex items-center justify-center gap-3 text-text-light text-[13px] font-semibold">
            <span>{new Date(post.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            <span>&middot;</span>
            <span>{post.read_time} read</span>
          </div>
        </div>

        {/* Blog Hero Image */}
        {post.main_image_url && (
          <div className="mb-12 rounded-2xl overflow-hidden border border-border-primary aspect-video bg-bg-secondary shadow-card">
            <img
              src={post.main_image_url}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* HTML Article Body */}
        <div 
          className="prose prose-zinc max-w-none text-[16.5px] leading-[1.8] text-text-muted space-y-6 border-b border-border-primary pb-16"
          dangerouslySetInnerHTML={{ __html: post.body_html || '' }}
        />

        {/* Product Interlinking Callout */}
        <div className="my-12 bg-bg-secondary border border-border-primary rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-card">
          <div className="space-y-1.5 text-center sm:text-left">
            <span className="text-[10px] font-black uppercase text-accent tracking-wider bg-accent/10 px-2.5 py-0.5 rounded-full">
              FEATURED SCALECRAFT SYSTEM
            </span>
            <h4 className="font-heading text-lg sm:text-xl font-black text-text-primary">
              Automate Client Acquisition with ScaleCraft Systems
            </h4>
            <p className="text-[13px] text-text-muted">
              Get pre-built Notion CRM workspaces, Gemini AI agent prompts, and cold outreach scripts.
            </p>
          </div>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 bg-accent text-white font-bold text-xs px-6 py-3.5 rounded-xl hover:bg-blue-600 shadow-md transition-all uppercase tracking-wider shrink-0"
          >
            <span>Explore Products</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Read More Other Articles Section */}
        {otherPosts.length > 0 && (
          <div className="mt-16 pt-6">
            <div className="flex items-center justify-between mb-8">
              <div>
                <span className="text-[11px] font-bold text-accent tracking-[0.15em] uppercase block mb-1">
                  KEEP READING
                </span>
                <h3 className="font-heading text-2xl font-black text-text-primary">
                  More Articles &amp; Guides
                </h3>
              </div>
              <Link
                href="/blog"
                className="inline-flex items-center gap-1.5 text-[13px] font-bold text-accent hover:text-blue-700 transition-colors"
              >
                <span>View All Articles</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {otherPosts.map((op: any) => (
                <Link
                  key={op.id}
                  href={`/blog/${op.slug}`}
                  className="bg-bg-secondary border border-border-primary rounded-xl overflow-hidden group hover:bg-white hover:shadow-card transition-all flex flex-col justify-between"
                >
                  <div>
                    {op.main_image_url ? (
                      <div className="h-32 overflow-hidden border-b border-border-primary bg-bg-tertiary">
                        <img
                          src={op.main_image_url}
                          alt={op.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    ) : (
                      <div className="h-32 bg-accent/5 flex items-center justify-center border-b border-border-primary">
                        <BookOpen className="w-8 h-8 text-accent" />
                      </div>
                    )}
                    <div className="p-4">
                      <span className="text-[9.5px] font-bold text-accent uppercase tracking-wider block mb-1">{op.category}</span>
                      <h4 className="font-heading text-[13px] font-bold text-text-primary group-hover:text-accent transition-colors line-clamp-2 leading-snug">
                        {op.title}
                      </h4>
                    </div>
                  </div>
                  <div className="px-4 pb-4 pt-0 text-[11px] text-text-light font-medium">
                    {op.read_time || '5 min'} read
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>
    </>
  );
}
