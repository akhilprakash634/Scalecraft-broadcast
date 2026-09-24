'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Search, FileText, Bot, Briefcase, HelpCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { queryWeightedSearch, trackEvent } from '@/lib/content';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 80);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const filtered = queryWeightedSearch(query);
    setResults(filtered);

    // Track search execution query custom events
    trackEvent('search_executed', { search_term: query, results_count: filtered.length });
  }, [query]);

  if (!isOpen) return null;

  const handleItemClick = (item: any) => {
    // Track clicked items in search funnel
    trackEvent('search_result_clicked', { search_term: query, clicked_title: item.title, clicked_url: item.url });
    setQuery('');
    onClose();
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'product':
        return <Briefcase className="w-4 h-4 text-accent" />;
      case 'article':
        return <FileText className="w-4 h-4 text-gray-500" />;
      case 'tool':
        return <Bot className="w-4 h-4 text-green" />;
      case 'faq':
        return <HelpCircle className="w-4 h-4 text-purple-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-400" />;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'product': return 'Product';
      case 'article': return 'Guide';
      case 'tool': return 'Free Resource';
      case 'faq': return 'FAQ';
      default: return 'Result';
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-start justify-center pt-20 px-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-[#09090B]/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Search Card */}
      <div className="relative w-full max-w-2xl bg-background rounded-card border border-border-dark shadow-premium overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">
        
        {/* Input Bar */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border-primary bg-bg-secondary">
          <Search className="w-5 h-5 text-text-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products, guides, free templates, e.g., 'need clients'..."
            className="flex-grow bg-transparent text-[15px] text-text-primary placeholder:text-text-light outline-none border-none py-1"
          />
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-border-primary rounded-full transition-colors"
            aria-label="Close search"
          >
            <X className="w-4 h-4 text-text-muted" />
          </button>
        </div>

        {/* Results Body */}
        <div className="max-h-[380px] overflow-y-auto p-4">
          {query.trim() === '' ? (
            <div className="py-8 px-4 text-center">
              <p className="text-[13px] text-text-muted mb-4">Try searching for things like:</p>
              <div className="flex flex-wrap justify-center gap-2 max-w-sm mx-auto">
                {['outreach scripts', 'lead finder', 'refund policy', 'free tools', 'notion setup'].map((term) => (
                  <button
                    key={term}
                    onClick={() => setQuery(term)}
                    className="px-3 py-1.5 bg-bg-secondary border border-border-primary rounded-full text-xs font-semibold text-text-muted hover:border-accent hover:text-accent transition-colors"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold text-text-light uppercase tracking-wider px-2 mb-2">
                Found {results.length} matches
              </p>
              {results.map((item, idx) => (
                <Link
                  key={idx}
                  href={item.url}
                  onClick={() => handleItemClick(item)}
                  className="flex items-start gap-3.5 p-3 rounded-xl hover:bg-bg-secondary transition-all group"
                >
                  <div className="w-8 h-8 rounded-lg bg-bg-tertiary flex items-center justify-center shrink-0">
                    {getCategoryIcon(item.category)}
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-bold text-text-primary group-hover:text-accent transition-colors">
                        {item.title}
                      </span>
                      <span className="text-[9px] font-extrabold uppercase tracking-wider bg-bg-tertiary text-text-muted px-1.5 py-0.5 rounded">
                        {getCategoryLabel(item.category)}
                      </span>
                    </div>
                    <p className="text-[12.5px] text-text-muted mt-0.5 leading-relaxed truncate">
                      {item.description}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-text-light opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all self-center shrink-0" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-12 px-4 text-center">
              <HelpCircle className="w-10 h-10 text-text-light mx-auto mb-3" />
              <p className="text-[14px] font-bold text-text-primary">No exact matches found</p>
              <p className="text-[12.5px] text-text-muted mt-1 max-w-xs mx-auto">
                Try querying simpler words like 'prompts', 'clients', 'refund', or 'calc'.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
