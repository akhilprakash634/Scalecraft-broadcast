import { supabaseAdmin } from './supabase';

export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMinutes: number
): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const now = new Date();
    const windowMs = windowMinutes * 60 * 1000;

    // 1. Fetch current rate limit record
    const { data: record, error: selectError } = await supabaseAdmin
      .from('rate_limits')
      .select('*')
      .eq('key', key)
      .maybeSingle();

    if (selectError) {
      console.error('[RateLimit] Select error:', selectError.message);
      return { allowed: false, remaining: 0 };
    }

    if (!record) {
      // 2. Try to insert new rate limit record
      const { error: insertError } = await supabaseAdmin
        .from('rate_limits')
        .insert({
          key,
          count: 1,
          window_start: now.toISOString(),
        });

      if (insertError) {
        // Concurrency catch: if another request inserted it in the split second, retry select
        const { data: retryRecord, error: retryError } = await supabaseAdmin
          .from('rate_limits')
          .select('*')
          .eq('key', key)
          .maybeSingle();

        if (retryError || !retryRecord) {
          return { allowed: false, remaining: 0 };
        }
        return handleExistingRecord(retryRecord, now, windowMs, maxRequests, key);
      }

      return { allowed: true, remaining: maxRequests - 1 };
    }

    return handleExistingRecord(record, now, windowMs, maxRequests, key);
  } catch (error) {
    console.error('[RateLimit] Exception:', error);
    return { allowed: false, remaining: 0 };
  }
}

async function handleExistingRecord(
  record: any,
  now: Date,
  windowMs: number,
  maxRequests: number,
  key: string
): Promise<{ allowed: boolean; remaining: number }> {
  const windowStart = new Date(record.window_start);
  const timePassed = now.getTime() - windowStart.getTime();

  if (timePassed > windowMs) {
    // Window expired, reset count and window_start
    const { error: updateError } = await supabaseAdmin
      .from('rate_limits')
      .update({
        count: 1,
        window_start: now.toISOString(),
      })
      .eq('id', record.id);

    if (updateError) {
      console.error('[RateLimit] Reset error:', updateError.message);
      return { allowed: false, remaining: 0 };
    }

    return { allowed: true, remaining: maxRequests - 1 };
  }

  // Window active: check count
  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  // Increment count
  const newCount = record.count + 1;
  const { error: updateError } = await supabaseAdmin
    .from('rate_limits')
    .update({ count: newCount })
    .eq('id', record.id);

  if (updateError) {
    console.error('[RateLimit] Increment error:', updateError.message);
    return { allowed: false, remaining: 0 };
  }

  return { allowed: true, remaining: maxRequests - newCount };
}
