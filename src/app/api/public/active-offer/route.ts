import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const revalidate = 60; // Cache for 60 seconds

export async function GET() {
  try {
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

    if (offers.length > 0) {
      return NextResponse.json({ offer: offers[0] });
    }
    
    return NextResponse.json({ offer: null });
  } catch (error) {
    return NextResponse.json({ offer: null }, { status: 500 });
  }
}
