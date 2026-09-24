'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { waLink } from '@/lib/config';
import { ShieldCheck, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

export default function Footer() {
  const pathname = usePathname();
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mdpqloubogfwvthpxskl.supabase.co';
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_CN0Cny9GyQEEUw_piFspUA_AYGjough';
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        const { data } = await supabase
          .from('saas_products')
          .select('id, slug, name, status, sort_order')
          .eq('status', 'published')
          .order('sort_order', { ascending: true })
          .limit(4);
        
        if (data) {
          setProducts(data);
        }
      } catch (e) {
        console.error('Error fetching footer products:', e);
      }
    }
    fetchProducts();
  }, []);

  // Hide footer on dashboard and admin pages
  if (pathname?.startsWith('/dashboard') || pathname?.startsWith('/admin')) {
    return null;
  }

  return (
    <footer className="bg-foreground text-white border-t border-white/5">
      <div className="max-w-[1100px] mx-auto py-16 px-6 md:px-10 grid grid-cols-1 md:grid-cols-[1.6fr_1fr_1fr_1.2fr] gap-12">
        
        {/* Brand Column */}
        <div className="space-y-4">
          <Link href="/">
            <img 
              src="/scalecraft-logo-dark.svg" 
              alt="ScaleCraft" 
              className="h-[30px] w-auto"
            />
          </Link>
          <p className="text-[13.5px] text-white/40 leading-relaxed max-w-[240px]">
            Practical client acquisition systems and templates built through real freelance and business experience.
          </p>
          <div className="space-y-1.5 pt-2">
            <p className="text-[12px] text-white/30">Founded by Akhil Prakash</p>
            <div className="flex items-center gap-1.5 text-[11px] text-[#9FE1CB] font-semibold">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '8s' }} />
              <span>Last updated: July 2026</span>
            </div>
          </div>
        </div>
        
        {/* Products Column */}
        <div>
          <h4 className="text-[11px] font-extrabold text-white/20 tracking-[0.15em] uppercase mb-4">Products</h4>
          <nav className="flex flex-col gap-3">
            {products.length > 0 ? (
              products.map((p) => {
                const isCombo = p.slug.includes('combo') || p.slug.includes('bundle');
                return (
                  <Link
                    key={p.id}
                    href={`/products/${p.slug}`}
                    className={`text-[13.5px] text-white/50 hover:text-white transition-colors ${
                      isCombo ? 'font-bold text-accent' : ''
                    }`}
                  >
                    {p.name.replace("ScaleCraft ", "")}
                  </Link>
                );
              })
            ) : (
              <>
                <Link href="/products/freelance-client-pipeline-blueprint" className="text-[13.5px] text-white/50 hover:text-white transition-colors">
                  Client Acquisition Blueprint
                </Link>
                <Link href="/products/ai-lead-finder-system" className="text-[13.5px] text-white/50 hover:text-white transition-colors">
                  AI Lead Finder System
                </Link>
                <Link href="/products/ai-systems-combo" className="text-[13.5px] text-white/50 hover:text-white transition-colors font-bold text-accent">
                  AI Systems Combo Bundle
                </Link>
              </>
            )}
            <span className="text-[12.5px] text-white/20 italic">More releases coming soon</span>
          </nav>
        </div>

        {/* Resources Column */}
        <div>
          <h4 className="text-[11px] font-extrabold text-white/20 tracking-[0.15em] uppercase mb-4">Resources</h4>
          <nav className="flex flex-col gap-3">
            <Link href="/resources" className="text-[13.5px] text-white/50 hover:text-white transition-colors font-semibold">
              Resources Center
            </Link>
            <Link href="/blog" className="text-[13.5px] text-white/50 hover:text-white transition-colors">
              Learning Guides & Blog
            </Link>
            <Link href="/changelog" className="text-[13.5px] text-white/50 hover:text-white transition-colors">
              Update Changelog
            </Link>
            <Link href="/roadmap" className="text-[13.5px] text-white/50 hover:text-white transition-colors">
              Public Roadmap
            </Link>
            <a href="/#sandbox" className="text-[13.5px] text-white/50 hover:text-white transition-colors">
              Free Generators & Tools
            </a>
          </nav>
        </div>

        {/* Trust & Company Column */}
        <div className="space-y-5">
          <div>
            <h4 className="text-[11px] font-extrabold text-white/20 tracking-[0.15em] uppercase mb-4">Company</h4>
            <nav className="flex flex-col gap-3">
              <Link href="/#founder" className="text-[13.5px] text-white/50 hover:text-white transition-colors">
                About the Founder
              </Link>
              <Link href="/refund-policy" className="text-[13.5px] text-white/50 hover:text-white transition-colors">
                Refund Policy
              </Link>
              <Link href="/legal/privacy-policy" className="text-[13.5px] text-white/50 hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <Link href="/legal/terms" className="text-[13.5px] text-white/50 hover:text-white transition-colors">
                Terms of Service
              </Link>
            </nav>
          </div>

          <div className="pt-2 border-t border-white/5 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs text-white/60">
              <ShieldCheck className="w-4 h-4 text-accent shrink-0" />
              <span>Payments secured via Razorpay & PayPal</span>
            </div>
            <a 
              href={waLink("Hi Akhil, I have a question about ScaleCraft before buying")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-full bg-white/10 hover:bg-white/15 text-white text-xs font-semibold py-2.5 px-4 rounded-xl border border-white/10 transition-all text-center"
            >
              Questions? Message on WhatsApp
            </a>
          </div>
        </div>
      </div>
      
      {/* Bottom Row */}
      <div className="max-w-[1100px] mx-auto px-6 md:px-10 py-6 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-3">
        <span className="text-[12px] text-white/30">© 2026 ScaleCraft · thescalecraft.in</span>
        <span className="text-[12px] text-white/30">Made with ❤️ for freelancers worldwide 🌎</span>
      </div>
    </footer>
  );
}
