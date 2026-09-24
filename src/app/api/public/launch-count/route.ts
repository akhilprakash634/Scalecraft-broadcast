import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { count, error } = await supabaseAdmin
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed')
      .gte('created_at', '2026-06-01T00:00:00.000Z');
    
    if (error) {
      console.error('Supabase query error:', error);
      throw error;
    }
    
    return NextResponse.json({ 
      count: count || 0 
    });
  } catch (err) {
    console.error('Launch count endpoint error:', err);
    return NextResponse.json({ count: 0 });
  }
}
