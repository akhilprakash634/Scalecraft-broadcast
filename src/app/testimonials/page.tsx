import { Metadata } from 'next';
import TestimonialsClientPage from './TestimonialsClientPage';

export const metadata: Metadata = {
  title: 'Client Success & Testimonials | ScaleCraft',
  description: 'Read real reviews, customer success stories, and results from founders, builders, and freelancers using ScaleCraft AI systems.',
  alternates: {
    canonical: 'https://thescalecraft.in/testimonials',
  },
  openGraph: {
    title: 'Client Success & Testimonials | ScaleCraft',
    description: 'Read real reviews, customer success stories, and results from founders, builders, and freelancers using ScaleCraft AI systems.',
    url: 'https://thescalecraft.in/testimonials',
    images: ['/og-image.jpg'],
  },
};

export default function TestimonialsPage() {
  return <TestimonialsClientPage />;
}
