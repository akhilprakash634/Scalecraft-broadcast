import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: settings, error } = await supabaseAdmin
      .from('site_settings')
      .select('*');

    if (error) throw error;

    const settingsMap = (settings || []).reduce((acc: any, cur: any) => {
      acc[cur.key] = cur.value;
      return acc;
    }, {});

    // Provide default fallback ordering if empty
    if (!settingsMap.home_sections_order) {
      settingsMap.home_sections_order = [
        "Hero",
        "TrustBar",
        "WhyScaleCraft",
        "ProductsSection",
        "SeeBeforeYouBuy",
        "HowYouGoLeadsToClients",
        "ComparisonTable",
        "ResultsSection",
        "FounderSection",
        "AfterPurchase",
        "FAQ",
        "BlogGrid",
        "FinalCTA"
      ];
    }

    return NextResponse.json(settingsMap);
  } catch (error: any) {
    console.error('Admin Settings GET Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, key, value } = body;

    if (!action || !key) {
      return NextResponse.json({ error: 'Action and setting Key are required.' }, { status: 400 });
    }

    if (action === 'save') {
      const { error } = await supabaseAdmin
        .from('site_settings')
        .upsert({
          key,
          value,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      return NextResponse.json({ success: true, message: `Setting "${key}" saved successfully.` });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (error: any) {
    console.error('Admin Settings POST Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
