import React from 'react';
import { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabase';
import OffersClientPage from './OffersClientPage';

export const revalidate = 10; // refresh dynamically

export const metadata: Metadata = {
  title: 'Special Deals & Offers | ScaleCraft',
  description: 'Unlock limited-time discounts, flash sales, and bundle offers on ScaleCraft AI systems and resources.',
  alternates: {
    canonical: 'https://thescalecraft.in/offers',
  },
  openGraph: {
    title: 'Special Deals & Offers | ScaleCraft',
    description: 'Unlock limited-time discounts, flash sales, and bundle offers on ScaleCraft AI systems and resources.',
    url: 'https://thescalecraft.in/offers',
  },
};

export default async function OffersPage() {
  // Query all active offers sorted by priority
  const { data: dbOffers } = await supabaseAdmin
    .from('offers')
    .select('*')
    .eq('active', true)
    .order('priority', { ascending: false });

  const now = new Date().getTime();
  const offers = (dbOffers || []).filter((offer: any) => {
    if (!offer.end_date) return true;
    const endDate = new Date(offer.end_date).getTime();
    return endDate > now;
  });

  if (offers.length === 0) {
    return (
      <main className="min-h-[70vh] flex flex-col items-center justify-center py-20 px-6 text-center max-w-lg mx-auto">
        <div className="w-16 h-16 bg-gray-50 border border-gray-150 rounded-2xl flex items-center justify-center text-gray-400 mb-6">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h1 className="font-heading text-2xl font-black text-foreground tracking-tight mb-2 uppercase">No Active Offers</h1>
        <p className="text-sm text-text-muted leading-relaxed">
          There are no active discount campaigns running right now. Follow our newsletter to receive notification updates on upcoming flash sales!
        </p>
        <a
          href="/products"
          className="mt-6 inline-flex items-center justify-center bg-black hover:bg-neutral-800 text-white text-xs font-bold px-6 py-3 rounded-xl transition-colors"
        >
          Browse All Products
        </a>
      </main>
    );
  }

  // Use the highest priority active offer
  const activeOffer = offers[0];

  // Fetch the products included in this offer
  let products: any[] = [];
  if (activeOffer.products_included && activeOffer.products_included.length > 0) {
    const { data: dbProducts } = await supabaseAdmin
      .from('saas_products')
      .select('*')
      .in('id', activeOffer.products_included)
      .eq('status', 'published');

    if (dbProducts) {
      products = dbProducts.map((p: any) => ({
        ...p,
        price: Number(p.price),
        originalPrice: Number(p.original_price),
        features: p.features || []
      }));
    }
  }

  return (
    <OffersClientPage
      offer={activeOffer}
      products={products}
    />
  );
}
