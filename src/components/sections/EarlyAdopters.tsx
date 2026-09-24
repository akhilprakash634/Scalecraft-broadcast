import { Star } from 'lucide-react';

interface Review {
  _id: string;
  name: string;
  rating: number;
  comment: string;
  profession?: string;
}

export default function EarlyAdopters({ reviews }: { reviews: Review[] }) {
  if (!reviews || reviews.length === 0) return null;

  const list = [...reviews].slice(0, 6);

  return (
    <section className="bg-[#FAFAF9] py-10 md:py-16 border-y border-border-primary" id="testimonials">
      <div className="max-w-[1100px] mx-auto px-6 md:px-10 text-center flex flex-col items-center">
        {/* Section Title / Eyebrow */}
        <div className="text-[11px] font-bold text-text-light tracking-[0.1em] uppercase mb-2.5">
          From the first buyers
        </div>

        {/* Headline */}
        <h2 className="font-heading text-[28px] md:text-[36px] font-black tracking-[-1.5px] leading-tight text-[#1a1a18] mb-2">
          What early customers are saying
        </h2>

        {/* Subheadline */}
        <p className="text-[14px] text-text-muted max-w-[480px] mb-10 leading-normal">
          Honest feedback from the first people to try ScaleCraft - good and not-so-good.
        </p>

        {/* Testimonial Cards Grid */}
        <div 
          className={`grid grid-cols-1 gap-4 w-full max-w-[900px] text-left ${
            list.length >= 3 
              ? 'md:grid-cols-3' 
              : list.length === 2 
                ? 'md:grid-cols-2' 
                : 'md:grid-cols-1 max-w-[400px]'
          }`}
        >
          {list.map((card) => {
            const profession = card.profession || '';
            const hasSeparator = profession.includes('·');
            const role = hasSeparator ? profession.split('·')[0].trim() : profession;
            const location = hasSeparator ? profession.split('·')[1].trim() : '';

            return (
              <div 
                key={card._id} 
                className="bg-white border border-[#E5E5E3] rounded-[12px] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.06)] flex flex-col justify-between"
              >
                <div>
                  {/* Top Row: Stars */}
                  <div className="flex items-center gap-0.5 mb-2.5 text-[#EF9F27]">
                    {Array.from({ length: card.rating || 5 }).map((_, idx) => (
                      <Star 
                        key={idx} 
                        className="w-[14px] h-[14px] fill-[#EF9F27] stroke-[#EF9F27]" 
                      />
                    ))}
                  </div>

                  {/* Quote (WhatsApp Bubble style) */}
                  <div className="bg-[#EAF3DE] rounded-[0_12px_12px_12px] p-[12px_16px] my-[10px] min-h-[76px] flex items-center relative">
                    {/* Visual bubble indicator tail */}
                    <div 
                      className="absolute top-0 -left-[6px] w-[6px] h-3 bg-[#EAF3DE]" 
                      style={{ clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }}
                    />
                    <p className="text-[13px] text-[#1a1a18] leading-[1.6] font-body font-normal">
                      &ldquo;{card.comment}&rdquo;
                    </p>
                  </div>
                </div>

                {/* Attribution */}
                <div className="mt-2 pl-1.5">
                  <div className="font-bold text-[13px] text-[#1a1a18]">{card.name}</div>
                  {role && (
                    <div className="text-[12px] text-[#888780] mt-0.5">
                      {role}
                      {location && (
                        <span className="text-[#a1a09a] font-normal"> &middot; {location}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Soft CTA */}
        <div className="mt-6">
          <a
            href="https://wa.me/918078004732?text=Hi%20Akhil%2C%20I%20want%20to%20share%20my%20result%20from%20the%20Freelance%20Client%20Pipeline%20Blueprint"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-[14px] font-bold text-accent hover:underline"
          >
            Used our system? Share your result &rarr;
          </a>
        </div>

        {/* Note Below Cards */}
        <div className="text-center mt-8 text-[12px] text-[#888780] font-medium">
          Verified buyers only.
        </div>
      </div>
    </section>
  );
}
