'use client';

import { useEffect, useRef, useState } from 'react';

interface Review {
  _id: string;
  name: string;
  rating: number;
  comment: string;
  profession: string;
  product?: string;
}

interface ReviewsProps {
  reviews: Review[];
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div style={{ display: 'flex', gap: '3px' }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          width="15"
          height="15"
          viewBox="0 0 16 16"
          fill={star <= rating ? '#059669' : '#D9D9D9'}
        >
          <path d="M8 1l1.854 3.757L14 5.528l-3 2.922.708 4.129L8 10.5l-3.708 2.079L5 8.45 2 5.528l4.146-.771L8 1z" />
        </svg>
      ))}
    </div>
  );
}

function ReviewCard({ review, index }: { review: Review; index: number }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.12 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const initials = review.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: `opacity 0.5s ease ${index * 0.08}s, transform 0.5s ease ${index * 0.08}s`,
        background: '#FFFFFF',
        border: '1px solid #EBEBEB',
        borderRadius: '14px',
        padding: '28px',
        boxShadow: '0 2px 16px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle top accent bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: 'linear-gradient(90deg, #059669, #0055FF)',
          borderRadius: '14px 14px 0 0',
        }}
      />

      {/* Stars */}
      <StarRating rating={review.rating} />

      {/* Comment */}
      <p
        style={{
          fontSize: '15px',
          lineHeight: '1.7',
          color: '#6F6E69',
          margin: 0,
          flex: 1,
        }}
      >
        "{review.comment}"
      </p>

      {/* Divider */}
      <div style={{ height: '1px', background: '#EBEBEB' }} />

      {/* Author row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Avatar */}
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: '#F7F7F5',
            border: '1.5px solid #EBEBEB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '13px',
            fontWeight: 700,
            color: '#0055FF',
            flexShrink: 0,
            fontFamily: 'var(--font-inter, Inter, sans-serif)',
            letterSpacing: '0.02em',
          }}
        >
          {initials}
        </div>

        <div>
          <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#111110', lineHeight: 1.2 }}>
            {review.name}
          </p>
          <p style={{ margin: 0, fontSize: '12px', color: '#AEACA5', marginTop: '3px' }}>
            {review.profession}
            {review.product && (
              <span style={{ marginLeft: '6px', color: '#D9D9D9' }}>·</span>
            )}
            {review.product && (
              <span style={{ marginLeft: '4px', color: '#AEACA5' }}>{review.product}</span>
            )}
          </p>
        </div>

        {/* Verified badge */}
        <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background: '#ECFDF5',
              color: '#059669',
              fontSize: '11px',
              fontWeight: 600,
              padding: '3px 8px',
              borderRadius: '99px',
              letterSpacing: '0.02em',
            }}
          >
            ✓ Verified
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Reviews({ reviews }: ReviewsProps) {
  if (!reviews || reviews.length === 0) return null;

  const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

  return (
    <section
      id="reviews"
      style={{
        padding: '96px 40px',
        background: '#F7F7F5',
        borderTop: '1px solid #EBEBEB',
        borderBottom: '1px solid #EBEBEB',
      }}
    >
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '14px' }}>
            <span
              style={{
                width: '6px',
                height: '6px',
                background: '#059669',
                borderRadius: '50%',
                display: 'inline-block',
              }}
            />
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: '#6F6E69',
              }}
            >
              Customer reviews
            </span>
          </div>

          <h2
            style={{
              fontFamily: 'var(--font-heading, Inter, sans-serif)',
              fontSize: 'clamp(30px, 4.5vw, 44px)',
              fontWeight: 900,
              letterSpacing: '-1.5px',
              lineHeight: 1.1,
              color: '#111110',
              margin: '0 0 16px',
            }}
          >
            Real results from{' '}
            <span style={{ color: '#0055FF' }}>real freelancers.</span>
          </h2>

          <p
            style={{
              color: '#6F6E69',
              fontSize: '16px',
              maxWidth: '440px',
              marginInline: 'auto',
              lineHeight: 1.65,
            }}
          >
            Freelancers across India and UAE are landing consistent clients with ScaleCraft systems.
          </p>
        </div>

        {/* Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '18px',
          }}
        >
          {reviews.map((review, i) => (
            <ReviewCard key={review._id} review={review} index={i} />
          ))}
        </div>

        {/* Social proof bar */}
        <div
          style={{
            marginTop: '52px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '48px',
            flexWrap: 'wrap',
            padding: '28px 32px',
            background: '#FFFFFF',
            border: '1px solid #EBEBEB',
            borderRadius: '14px',
            boxShadow: '0 2px 16px rgba(0,0,0,0.04)',
          }}
        >
          {[
            { label: 'Average Rating', value: `${avgRating.toFixed(1)} / 5.0` },
            { label: 'Verified Buyers', value: '100+' },
            { label: 'Customer Reviews', value: `${reviews.length}` },
          ].map((stat, i, arr) => (
            <div
              key={stat.label}
              style={{
                textAlign: 'center',
                paddingRight: i < arr.length - 1 ? '48px' : 0,
                borderRight: i < arr.length - 1 ? '1px solid #EBEBEB' : 'none',
              }}
            >
              <p style={{ margin: 0, fontSize: '22px', fontWeight: 900, color: '#111110', letterSpacing: '-0.5px', fontFamily: 'var(--font-heading, Inter, sans-serif)' }}>
                {stat.value}
              </p>
              <p style={{ margin: 0, fontSize: '12px', color: '#AEACA5', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500 }}>
                {stat.label}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
