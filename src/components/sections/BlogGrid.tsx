'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, IndianRupee, Bot, FileText, ArrowRight, Search } from 'lucide-react';

interface Post {
  _id: string;
  title: string;
  slug: { current: string };
  category: string;
  readTime: string;
  excerpt: string;
  publishedAt: string;
  mainImage?: any;
}

export default function BlogGrid({ posts, isHomePage = true }: { posts: Post[]; isHomePage?: boolean }) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const categoryStyles: Record<string, { icon: any; bg: string; color: string }> = {
    'Outreach': { icon: Mail, bg: 'bg-blue-50', color: 'text-blue-500' },
    'Pricing': { icon: IndianRupee, bg: 'bg-green-50', color: 'text-green-500' },
    'AI Tools': { icon: Bot, bg: 'bg-purple-50', color: 'text-purple-500' },
  };

  const targetSlugs = [
    'how-to-land-your-first-high-ticket-client-in-2026-using-ai-and-personalization',
    'we-tried-to-find-5-real-indian-d2c-skincare-brands-here-s-exactly-what-worked-and-what-didn-t',
    'how-to-write-cold-dm-gets-replies'
  ];

  // Homepage: 3 curated guides
  // Full Blog Page: ALL articles dynamically from DB with filters
  const displayPosts = (() => {
    if (isHomePage) {
      const matched = targetSlugs.map(slug => posts.find(p => p.slug?.current === slug)).filter(Boolean) as Post[];
      if (matched.length > 0) return matched;
      return posts.slice(0, 3);
    }

    return posts.filter(p => {
      const matchesCategory = selectedCategory === 'All' || p.category?.toLowerCase() === selectedCategory.toLowerCase();
      const matchesSearch = !searchQuery || 
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.excerpt?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  })();

  // Extract unique categories for filter tabs
  const categories = ['All', ...Array.from(new Set(posts.map(p => p.category).filter(Boolean)))];

  return (
    <section className="px-6 md:px-10 py-12 md:py-16 max-w-[1100px] mx-auto" id="blog">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <span className="text-[11px] font-bold text-accent tracking-[0.15em] uppercase mb-1 block">
            PRACTICAL GUIDES
          </span>
          <h2 className="font-heading text-clamp-h2 font-black leading-tight text-text-primary">
            {isHomePage ? 'Learn Client Acquisition' : 'All Articles & Growth Playbooks'}
          </h2>
        </div>

        {isHomePage && (
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-[13.5px] font-bold text-accent hover:text-blue-700 transition-colors shrink-0"
          >
            <span>View All Articles</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* Filter Tabs & Search on Full Blog Page */}
      {!isHomePage && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-border-primary">
          {/* Category Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-[12px] font-bold transition-all shrink-0 cursor-pointer ${
                  selectedCategory.toLowerCase() === cat.toLowerCase()
                    ? 'bg-foreground text-white shadow-xs'
                    : 'bg-bg-secondary text-text-muted hover:text-text-primary border border-border-primary hover:border-border-dark'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-light" />
            <input
              type="text"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-border-primary rounded-xl pl-9 pr-3 py-1.5 text-[12px] font-medium text-text-primary outline-none focus:border-accent transition-colors"
            />
          </div>
        </div>
      )}

      {/* Posts Grid */}
      {displayPosts.length === 0 ? (
        <div className="text-center py-16 bg-bg-secondary border border-border-primary rounded-2xl p-8">
          <FileText className="w-10 h-10 text-text-light mx-auto mb-3 opacity-60" />
          <p className="text-[14px] font-bold text-text-primary mb-1">No articles found</p>
          <p className="text-[12px] text-text-muted">Try selecting a different category or clearing your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {displayPosts.map((post) => {
            const style = categoryStyles[post.category] || { icon: FileText, bg: 'bg-gray-50', color: 'text-gray-400' };
            const Icon = style.icon;

            return (
              <Link 
                key={post._id} 
                href={`/blog/${post.slug.current}`}
                className="bg-bg-secondary border border-border-primary rounded-card overflow-hidden group hover:bg-white hover:shadow-premium transition-all flex flex-col justify-between"
              >
                <div>
                  <div className={`h-[180px] flex items-center justify-center relative overflow-hidden border-b border-border-primary ${!post.mainImage ? style.bg : 'bg-bg-tertiary'}`}>
                    {post.mainImage ? (
                      <img 
                        src={post.mainImage} 
                        alt={post.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="transition-transform duration-500 group-hover:scale-110">
                        <Icon className={`w-9 h-9 ${style.color}`} />
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="text-[10px] font-bold text-accent tracking-[0.1em] uppercase mb-1.5">{post.category}</div>
                    <h3 className="font-heading text-[14px] font-bold text-foreground leading-[1.35] mb-2 tracking-[-0.2px] group-hover:text-accent transition-colors">
                      {post.title}
                    </h3>
                  </div>
                </div>
                <div className="px-5 pb-5 pt-0 text-[11px] text-text-light font-medium">
                  {post.readTime || '5 min'} read &middot; Free Guide
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
