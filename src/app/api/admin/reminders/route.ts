/**
 * GET /api/admin/reminders
 *
 * Returns all clients with computed billing/trial urgency, sorted most-urgent-first.
 * Read-only — no sends happen here.
 *
 * Security:
 *  - Auth: isAdminAuthenticated() — 401 if not admin.
 *  - All data read via supabaseAdmin (service role) — no client-side credentials exposed.
 *  - No user input is interpolated into queries; all filtering is server-side.
 *  - TODO(security): Add rate-limiting middleware if this endpoint is heavily polled.
 */

import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { mapDbClientToAgentClient } from '@/lib/agents';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysFrom(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  return Math.floor((new Date(dateStr).getTime() - Date.now()) / MS_PER_DAY);
}

export async function GET() {
  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from('agent_clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Admin Reminders GET] DB error:', error.message);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }

    const clients = (data || [])
      .map(mapDbClientToAgentClient)
      .filter(Boolean)
      .map((c) => {
        const isTrial = c!.planType === 'trial';
        const daysUntilDue = daysFrom(c!.nextBillingDate);
        const daysUntilTrialEnd = daysFrom(c!.trialEndsAt);
        const daysUntilGraceEnd = daysFrom(c!.gracePeriodEndsAt);

        return {
          id: c!.id,
          businessName: c!.businessName,
          ownerName: c!.ownerName,
          // Mask phone: show last 4 digits only in the response for privacy
          ownerPhone: c!.ownerPhone,
          planType: c!.planType || 'standard',
          connectionType: c!.connectionType,
          status: c!.status,
          // Billing fields
          billingStatus: c!.billingStatus || 'active',
          nextBillingDate: c!.nextBillingDate || null,
          monthlyAmount: c!.monthlyAmount ?? 1299,
          daysUntilDue,
          lastBillingReminderSentAt: c!.lastBillingReminderSentAt || null,
          billingReminderCount: c!.billingReminderCount ?? 0,
          // Trial fields
          trialEndsAt: c!.trialEndsAt || null,
          gracePeriodEndsAt: c!.gracePeriodEndsAt || null,
          trialReminderSent: c!.trialReminderSent || false,
          daysUntilTrialEnd,
          daysUntilGraceEnd,
          agentPausedAt: c!.agentPausedAt || null,
          isTrial,
        };
      });

    // Sort: most urgent first
    // Priority order:
    //   1. Overdue billing (billing_status=overdue OR daysUntilDue < 0)
    //   2. paused_unpaid
    //   3. Billing due ≤ 7 days
    //   4. Trial ending / in grace ≤ 7 days
    //   5. Everything else (active/fine)
    const urgencyScore = (c: (typeof clients)[0]) => {
      if (c.billingStatus === 'paused_unpaid') return 0;
      if (c.billingStatus === 'overdue' || (c.daysUntilDue !== null && c.daysUntilDue < 0)) return 1;
      if (c.daysUntilDue !== null && c.daysUntilDue <= 7) return 2;
      if (c.isTrial) {
        if (c.daysUntilTrialEnd !== null && c.daysUntilTrialEnd <= 0) return 1; // expired trial
        if (c.daysUntilTrialEnd !== null && c.daysUntilTrialEnd <= 7) return 3;
      }
      return 10;
    };

    clients.sort((a, b) => {
      const sa = urgencyScore(a);
      const sb = urgencyScore(b);
      if (sa !== sb) return sa - sb;
      // Within same urgency: sort by daysUntilDue ascending (most overdue first)
      const da = a.daysUntilDue ?? a.daysUntilTrialEnd ?? 999;
      const db = b.daysUntilDue ?? b.daysUntilTrialEnd ?? 999;
      return da - db;
    });

    return NextResponse.json({ clients });
  } catch (error: any) {
    console.error('[Admin Reminders GET] Unexpected error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
