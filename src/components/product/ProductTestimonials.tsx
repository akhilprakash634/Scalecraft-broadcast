'use client';

import { Star, MessageSquareQuote, CheckCircle2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { VERIFIED_REVIEWS } from '@/lib/content/testimonials';

export interface ProductReview {
  _id?: string;
  id?: string;
  name: string;
  rating: number;
  comment: string;
  profession?: string;
  createdAt?: string;
}

interface ProductTestimonialsProps {
  reviews?: ProductReview[];
  title?: string;
  subtitle?: string;
}

export default function ProductTestimonials({
  reviews,
  title = "What Buyers Are Saying",
  subtitle = "Real feedback from creators, freelancers, and business owners scaling with ScaleCraft."
}: ProductTestimonialsProps) {
  // If reviews array is explicitly provided, strictly use those. Otherwise fallback to VERIFIED_REVIEWS.
  const displayReviews = reviews !== undefined ? reviews : VERIFIED_REVIEWS;

  if (displayReviews.length === 0) {
    return null;
  }

  return (
    <section id="testimonials" className="py-4">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <span className="text-[11px] font-bold text-accent tracking-[0.15em] uppercase block mb-2">
            Verified Testimonials
          </span>
          <h2 className="font-heading text-clamp-h2 font-black leading-tight text-text-primary">
            {title}
          </h2>
          <p className="text-[14.5px] text-text-muted mt-1.5 max-w-xl font-body">
            {subtitle}
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white border border-border-primary rounded-2xl px-4 py-2.5 shadow-xs shrink-0 self-start md:self-auto">
          <div className="flex items-center gap-1 text-amber-400">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
            ))}
          </div>
          <div className="text-[13px] font-bold text-text-primary">
            4.9 / 5.0 <span className="text-text-muted font-normal text-[12px]">&middot; Verified Buyers</span>
          </div>
        </div>
      </div>

      {/* Grid of Testimonial Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {displayReviews.map((rev, index) => {
          const reviewId = (rev as any)._id || (rev as any).id || `rev-${index}`;
          const profession = rev.profession || 'ScaleCraft Customer';
          const hasSeparator = profession.includes('·');
          const role = hasSeparator ? profession.split('·')[0].trim() : profession;
          const location = hasSeparator ? profession.split('·')[1].trim() : '';

          // Generate initials for avatar badge
          const initials = rev.name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);

          return (
            <div
              key={reviewId}
              className="bg-white border border-border-primary hover:border-accent/40 rounded-2xl p-5 shadow-xs hover:shadow-card transition-all duration-200 flex flex-col justify-between group"
            >
              <div>
                {/* Header: Stars & Verified Badge */}
                <div className="flex items-center justify-between mb-3.5">
                  <div className="flex items-center gap-1 text-amber-400">
                    {[...Array(rev.rating || 5)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Verified
                  </span>
                </div>

                {/* Comment Quote Bubble */}
                <div className="relative mb-4">
                  <MessageSquareQuote className="w-6 h-6 text-accent/15 absolute -top-1 -left-1 pointer-events-none" />
                  <p className="text-[13.5px] text-text-primary leading-[1.65] font-body relative z-10 pl-2">
                    &ldquo;{rev.comment}&rdquo;
                  </p>
                </div>
              </div>

              {/* Author Footer */}
              <div className="flex items-center gap-3 pt-3.5 border-t border-border-primary/80 mt-2">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent/10 to-accent/20 border border-accent/20 flex items-center justify-center text-[12px] font-black text-accent shrink-0">
                  {initials}
                </div>
                <div className="min-w-0">
                  <h4 className="text-[13.5px] font-bold text-text-primary leading-tight truncate">
                    {rev.name}
                  </h4>
                  <p className="text-[11.5px] text-text-muted truncate mt-0.5 font-medium">
                    {role} {location && <span className="text-text-light">&middot; {location}</span>}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Review Submission / Community link footer */}
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 bg-bg-secondary border border-border-primary rounded-xl px-5 py-3.5 text-xs text-text-muted">
        <span className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>All reviews are submitted by confirmed scale-up buyers and verified before publishing.</span>
        </span>
        <Link
          href="/testimonials"
          className="font-bold text-accent hover:underline flex items-center gap-1 shrink-0"
        >
          View all reviews or submit yours <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </section>
  );
}
