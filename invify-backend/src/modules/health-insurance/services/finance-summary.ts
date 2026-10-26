/**
 * Status buckets for premium invoices and payments.
 * Amounts are summed only when the source field is an integer minor unit.
 * A missing amount is reported as unknown rather than zero.
 */

export interface StatusAmountBucket {
  status: string;
  count: number;
  amountMinor: number | null;
}

const UNBILLED_INVOICE_STATUSES = new Set(['draft', 'void']);

function sumKnown(buckets: StatusAmountBucket[]): number | null {
  if (buckets.some((bucket) => bucket.amountMinor === null)) return null;
  return buckets.reduce((sum, bucket) => sum + (bucket.amountMinor ?? 0), 0);
}

/**
 * Billed premium is the sum of persisted invoice minor units, excluding drafts and voids.
 * Collected premium is the sum of hw_payments rows whose status is successful.
 * Either total is null when a persisted amount is missing or not an integer minor unit.
 */
export function premiumOverviewTotals(
  invoices: any[] | null | undefined,
  payments: any[] | null | undefined
): { billedMinor: number | null; collectedMinor: number | null } {
  const billed = summarizeStatusAmounts(invoices, 'amount_due_minor')
    .filter((bucket) => !UNBILLED_INVOICE_STATUSES.has(bucket.status));
  const collected = summarizeStatusAmounts(payments, 'amount_minor')
    .filter((bucket) => bucket.status === 'successful');
  return {
    billedMinor: sumKnown(billed),
    collectedMinor: sumKnown(collected)
  };
}

export function summarizeStatusAmounts(rows: any[] | null | undefined, amountKey: string): StatusAmountBucket[] {
  const buckets = new Map<string, { status: string; count: number; amountMinor: number; amountKnown: boolean }>();
  for (const row of rows || []) {
    const status = String(row?.status || 'unknown');
    const current = buckets.get(status) || { status, count: 0, amountMinor: 0, amountKnown: true };
    current.count += 1;
    const amount = row?.[amountKey];
    if (typeof amount === 'number' && Number.isInteger(amount)) {
      current.amountMinor += amount;
    } else if (typeof amount === 'string' && /^-?\d+$/.test(amount)) {
      current.amountMinor += Number(amount);
    } else {
      current.amountKnown = false;
    }
    buckets.set(status, current);
  }
  return [...buckets.values()].map((bucket) => ({
    status: bucket.status,
    count: bucket.count,
    amountMinor: bucket.amountKnown ? bucket.amountMinor : null
  }));
}
