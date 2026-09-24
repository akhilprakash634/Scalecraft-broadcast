import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: posts, error } = await supabaseAdmin
      .from('blog_posts')
      .select('*')
      .order('published_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(posts || []);
  } catch (error: any) {
    console.error('Admin Blog GET Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, post } = body;

    if (!action) {
      return NextResponse.json({ error: 'Action is required.' }, { status: 400 });
    }

    if (action === 'save') {
      if (!post || !post.title || !post.slug) {
        return NextResponse.json({ error: 'Title and Slug are required.' }, { status: 400 });
      }

      // Generate a UUID for new posts if not provided
      const payload = {
        id: post.id || undefined, // Supabase will generate UUID if undefined
        title: post.title,
        slug: post.slug,
        category: post.category || 'General',
        read_time: post.read_time || '5 min read',
        excerpt: post.excerpt || '',
        body_html: post.body_html || '',
        main_image_url: post.main_image_url || '',
        author: post.author || 'Akhil',
        tags: post.tags || [],
        related_post_ids: post.related_post_ids || [],
        meta_title: post.meta_title || `${post.title} | ScaleCraft Blog`,
        meta_description: post.meta_description || post.excerpt || '',
        og_image: post.og_image || post.main_image_url || '',
        canonical: post.canonical || `https://thescalecraft.in/blog/${post.slug}`,
        published_at: post.published_at || new Date().toISOString()
      };

      const { data, error } = await supabaseAdmin
        .from('blog_posts')
        .upsert(payload)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, post: data });
    }

    if (action === 'delete') {
      const { id } = body;
      if (!id) {
        return NextResponse.json({ error: 'Post ID is required for deletion.' }, { status: 400 });
      }

      const { error } = await supabaseAdmin
        .from('blog_posts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Article deleted successfully.' });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (error: any) {
    console.error('Admin Blog POST Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
