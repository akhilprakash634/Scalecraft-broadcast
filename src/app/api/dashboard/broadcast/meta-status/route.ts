import { NextResponse } from 'next/server';
import { getSessionClient } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const client = await getSessionClient();
    if (!client) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (client.connectionType !== 'cloud_api') {
      return NextResponse.json({ error: 'Endpoint only available for Cloud API clients' }, { status: 400 });
    }

    const { whatsappPhoneNumberId, whatsappAccessToken } = client;
    if (!whatsappPhoneNumberId || !whatsappAccessToken) {
      return NextResponse.json({ error: 'Cloud API credentials not configured' }, { status: 400 });
    }

    let metaLimitTier = client.metaLimitTier || null;
    let metaQualityRating = client.metaQualityRating || null;
    let metaLimitExpiresAt = client.metaLimitExpiresAt || null;
    const metaThroughputLimit = client.metaThroughputLimit || 80;

    const now = new Date();
    const isExpired = !metaLimitExpiresAt || new Date(metaLimitExpiresAt) <= now;

    if (isExpired || !metaLimitTier || !metaQualityRating) {
      try {
        const url = `https://graph.facebook.com/v20.0/${whatsappPhoneNumberId}?fields=messaging_limit_tier,quality_rating`;
        const res = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${whatsappAccessToken}`
          },
          cache: 'no-store'
        });

        if (res.ok) {
          const data = await res.json();
          metaLimitTier = data.messaging_limit_tier || 'TIER_250';
          metaQualityRating = data.quality_rating || 'GREEN';
          metaLimitExpiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();

          await supabaseAdmin
            .from('agent_clients')
            .update({
              meta_limit_tier: metaLimitTier,
              meta_quality_rating: metaQualityRating,
              meta_limit_expires_at: metaLimitExpiresAt
            })
            .eq('id', client.clientId);

          console.log(`[Meta Status] Successfully refreshed and cached Meta limits for client ${client.clientId}`);
        } else {
          const err = await res.json().catch(() => ({}));
          console.error('[Meta Status] Graph API error response:', err);
        }
      } catch (err: any) {
        console.error('[Meta Status] Fetch error calling Graph API:', err.message);
      }
    }
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // Count ALL unique phones broadcast to today, regardless of session state.
    // Meta's daily unique recipient limit applies to every recipient sent to,
    // not just out-of-session ones (is_new_session=true was under-counting).
    const clientIds = Array.from(new Set([client.clientId, client.id, client._id].filter(Boolean)));

    const { data: sentLogs } = await supabaseAdmin
      .from('broadcast_recipient_logs')
      .select('phone')
      .in('client_id', clientIds)
      .gte('sent_at', startOfDay.toISOString());

    const totalSentToday = new Set((sentLogs || []).map((x) => x.phone)).size;

    const tierMap: Record<string, number> = {
      TIER_250: 250,
      TIER_1K: 1000,
      TIER_10K: 10000,
      TIER_100K: 100000,
      TIER_UNLIMITED: 100000000
    };
    const metaLimit = tierMap[metaLimitTier || 'TIER_250'] || 250;

    const dailyBroadcastLimit = client.dailyBroadcastLimit ?? null;
    const effectiveLimit = dailyBroadcastLimit !== null
      ? Math.min(dailyBroadcastLimit, metaLimit)
      : metaLimit;

    return NextResponse.json({
      metaLimitTier,
      metaQualityRating,
      metaLimitExpiresAt,
      metaThroughputLimit,
      dailyBroadcastLimit,
      totalSentToday,
      effectiveLimit
    });
  } catch (error: any) {
    console.error('[Meta Status API] Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
