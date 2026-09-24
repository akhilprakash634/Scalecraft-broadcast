'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Search, RefreshCw } from 'lucide-react';
import SearchOverlay from './SearchOverlay';

export default function Nav() {
  const pathname = usePathname();
  const [activeSection, setActiveSection] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Hide header on dashboard and admin pages
  if (pathname?.startsWith('/dashboard') || pathname?.startsWith('/admin')) {
    return null;
  }

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { threshold: 0.3 }
    );
    const sections = ['products', 'success-stories', 'faq'];
    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const navLinks = [
    { href: '/products', label: 'Products', id: 'products' },
    { href: '/offers', label: 'Offers', id: 'offers' },
    { href: '/resources', label: 'Resources', id: 'resources' },
    { href: '/#success-stories', label: 'Success Stories', id: 'success-stories' },
    { href: '/changelog', label: 'Changelog', id: 'changelog' },
    { href: '/#faq', label: 'FAQ', id: 'faq' },
  ];

  const isActive = (link: { href: string; id: string }) => {
    if (link.href.startsWith('/#')) {
      return activeSection === link.id;
    }
    if (link.href === '/products') {
      return pathname === '/products' || pathname?.startsWith('/products/');
    }
    if (link.href === '/offers') {
      return pathname === '/offers' || pathname?.startsWith('/offers/');
    }
    if (link.href === '/resources') {
      return pathname === '/resources' || pathname?.startsWith('/resources/');
    }
    return pathname === link.href;
  };

  return (
    <>
      <header className="sticky top-0 z-[100] w-full border-b border-border-primary glassmorphism h-[64px] flex items-center justify-between px-6 md:px-10">
        <Link href="/" className="flex items-center shrink-0">
          <img src="/scalecraft-logo-light.svg" alt="ScaleCraft" className="h-[28px] md:h-[30px] w-auto" />
        </Link>

        {/* Desktop Links */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3.5 py-2 rounded-lg text-[13.5px] font-semibold transition-all ${
                isActive(link)
                  ? 'text-accent bg-accent/5'
                  : 'text-text-muted hover:text-foreground hover:bg-bg-secondary'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Action Elements */}
        <div className="flex items-center gap-2">
          {/* Last Updated Badge */}
          <div className="hidden lg:flex items-center gap-1.5 bg-bg-secondary border border-border-primary rounded-full px-3 py-1.5 text-[11px] text-text-muted select-none">
            <RefreshCw className="w-3 h-3 text-accent animate-spin" style={{ animationDuration: '6s' }} />
            <span>Updated July 2026</span>
          </div>

          {/* Search Trigger */}
          <button
            onClick={() => setSearchOpen(true)}
            className="p-2.5 rounded-xl hover:bg-bg-secondary border border-transparent hover:border-border-primary text-text-muted hover:text-foreground transition-all cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Open search"
          >
            <Search size={18} />
          </button>

          {/* Get started CTA */}
          <Link
            href="/products"
            className="hidden md:inline-flex bg-accent text-white px-4.5 py-2.5 rounded-xl text-[13px] font-bold hover:bg-blue-600 shadow-sm transition-all min-h-[44px] items-center"
          >
            Get Instant Access →
          </Link>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden p-2.5 rounded-xl text-text-primary hover:bg-bg-secondary transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Open navigation menu"
          >
            <Menu size={22} />
          </button>
        </div>
      </header>

      {/* Search Overlay component */}
      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Mobile Menu Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[200] flex md:hidden">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-[#09090B]/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          {/* Slide-out Menu */}
          <div className="relative ml-auto w-[82%] max-w-[300px] h-full bg-background shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 h-[64px] border-b border-border-primary">
              <Link href="/" onClick={() => setMobileOpen(false)}>
                <img src="/scalecraft-logo-light.svg" alt="ScaleCraft" className="h-[26px] w-auto" />
              </Link>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2.5 rounded-xl text-text-muted hover:bg-bg-secondary transition-colors min-h-[48px] min-w-[48px] flex items-center justify-center"
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>
            {/* Links */}
            <nav className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-1.5">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center px-4 py-3 rounded-xl text-[14.5px] font-bold transition-all ${
                    isActive(link)
                      ? 'text-accent bg-accent/5 font-bold'
                      : 'text-text-primary hover:bg-bg-secondary'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            {/* CTA */}
            <div className="px-6 pb-10 pt-4 border-t border-border-primary flex flex-col gap-3">
              <div className="flex items-center gap-1.5 self-center text-[11px] text-text-muted">
                <RefreshCw className="w-3 h-3 text-accent" />
                <span>Updated July 2026</span>
              </div>
              <Link
                href="/products"
                onClick={() => setMobileOpen(false)}
                className="block w-full bg-accent text-white text-center py-3.5 rounded-xl text-[14px] font-bold hover:bg-blue-600 shadow-md transition-all min-h-[48px]"
              >
                Get Instant Access →
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
