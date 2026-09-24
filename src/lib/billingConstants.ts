/**
 * billingConstants.ts
 *
 * Single source of truth for billing/trial duration values used across
 * webhook handlers, cron jobs, and checkout pages.
 *
 * Change TRIAL_DURATION_DAYS here and it propagates everywhere automatically —
 * no need to hunt down duplicate magic numbers.
 */

/** Trial period in days. Must match checkout page copy and cron reminder logic. */
export const TRIAL_DURATION_DAYS = 5;

/** Monthly subscription cycle in days (used for next_billing_date projection). */
export const BILLING_CYCLE_DAYS = 30;

/** Milliseconds in one day. */
export const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Default monthly subscription price (INR) fallback if DB query fails. */
export const DEFAULT_MONTHLY_PRICE = 1299;

/** Estimated Gemini API cost (INR) per message based on 1.5K input + 100 output tokens. */
export const GEMINI_COST_PER_MESSAGE = 0.012;

/** Flat managed VPS server cost (INR) per month. */
export const SERVER_COST_MONTHLY = 700;

/** Returns an ISO string exactly TRIAL_DURATION_DAYS from now. */
export function trialEndsAt(): string {
  return new Date(Date.now() + TRIAL_DURATION_DAYS * MS_PER_DAY).toISOString();
}

/** Returns an ISO string exactly BILLING_CYCLE_DAYS from now. */
export function nextBillingDate(): string {
  return new Date(Date.now() + BILLING_CYCLE_DAYS * MS_PER_DAY).toISOString();
}
