import { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabase';
import BlogGrid from '@/components/sections/BlogGrid';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Blog & Playbooks | ScaleCraft',
  description: 'Practical client acquisition guides, cold outreach scripts, and AI strategies for freelancers, agency owners, and consultants.',
  alternates: { canonical: 'https://thescalecraft.in/blog' },
};

export default async function BlogPage() {
  const { data: dbPosts } = await supabaseAdmin
    .from('blog_posts')
    .select('*')
    .order('published_at', { ascending: false });

  const posts = (dbPosts || []).map((p: any) => ({
    _id: p.id,
    title: p.title,
    slug: { current: p.slug },
    category: p.category,
    readTime: p.read_time,
    excerpt: p.excerpt,
    publishedAt: p.published_at,
    mainImage: p.main_image_url
  }));

  return (
    <div className="min-h-screen py-16 bg-background">
      <BlogGrid posts={posts} isHomePage={false} />
    </div>
  );
}
