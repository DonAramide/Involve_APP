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

export function integerMinor(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) return value;
  if (typeof value === 'string' && /^-?\d+$/.test(value)) return Number(value);
  return null;
}

const OPEN_INVOICE_STATUSES = new Set(['issued', 'partially_paid']);

/**
 * Outstanding premium is amount_due_minor minus amount_paid_minor on issued and
 * partially paid invoices. Drafts, voids, paid, and refunded invoices are not open.
 * A missing or non-integer amount makes the total unavailable.
 * An empty open set is a real zero after a successful read.
 */
export function outstandingPremiumMinor(rows: any[] | null | undefined): number | null {
  let total = 0;
  let open = 0;
  for (const row of rows || []) {
    if (!OPEN_INVOICE_STATUSES.has(String(row?.status || ''))) continue;
    open += 1;
    const due = integerMinor(row?.amount_due_minor);
    const paid = integerMinor(row?.amount_paid_minor);
    if (due === null || paid === null || paid < 0 || due < paid) return null;
    total += due - paid;
  }
  return open === 0 ? 0 : total;
}

/** Successful payment minor units only. Refunded and reversed rows are excluded. */
export function collectedPremiumMinor(rows: any[] | null | undefined): number | null {
  let total = 0;
  for (const row of rows || []) {
    if (String(row?.status || '') !== 'successful') continue;
    const amount = integerMinor(row?.amount_minor);
    if (amount === null) return null;
    total += amount;
  }
  return total;
}

/** Successful payments that also have a reconciliation timestamp. */
export function reconciledCollectionMinor(rows: any[] | null | undefined): number | null {
  let total = 0;
  for (const row of rows || []) {
    if (String(row?.status || '') !== 'successful' || !row?.reconciled_at) continue;
    const amount = integerMinor(row?.amount_minor);
    if (amount === null) return null;
    total += amount;
  }
  return total;
}

/**
 * Collection rate in basis points. A zero or missing billed total is not a rate.
 */
export function collectionRateBps(billedMinor: number | null, collectedMinor: number | null): number | null {
  if (billedMinor === null || collectedMinor === null || billedMinor <= 0) return null;
  return Math.round((collectedMinor / billedMinor) * 10000);
}

export function commandPremiumTotals(
  invoices: any[] | null | undefined,
  payments: any[] | null | undefined,
  from: string | null,
  to: string | null
) {
  const periodInvoices = (invoices || []).filter((row) => !from && !to || inRange(row?.issued_at, from, to));
  const periodPayments = (payments || []).filter((row) => !from && !to || inRange(row?.created_at, from, to));
  const billed = premiumOverviewTotals(periodInvoices, []).billedMinor;
  return {
    billedMinor: billed,
    collectedMinor: collectedPremiumMinor(periodPayments),
    reconciledMinor: reconciledCollectionMinor(periodPayments),
    outstandingMinor: outstandingPremiumMinor(periodInvoices),
    collectionRateBps: collectionRateBps(billed, collectedPremiumMinor(periodPayments))
  };
}

function monthKey(value: unknown): string | null {
  const text = String(value || '');
  const match = text.match(/^(\d{4}-\d{2})/);
  return match ? match[1] : null;
}

function inRange(value: unknown, from: string | null, to: string | null): boolean {
  const day = String(value || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}/.test(day)) return false;
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
}

export interface PremiumMonthPoint {
  month: string;
  invoicedMinor: number;
  collectedMinor: number;
}

/**
 * Monthly invoiced premium uses issued_at. Collected premium uses successful
 * payments by created_at. Rows without a usable timestamp are counted aside
 * and are not placed in a guessed month.
 */
export function premiumMonthSeries(
  invoices: any[] | null | undefined,
  payments: any[] | null | undefined,
  from: string | null,
  to: string | null
): { points: PremiumMonthPoint[]; undatedInvoices: number; undatedPayments: number; incomplete: boolean } {
  const months = new Map<string, PremiumMonthPoint>();
  let undatedInvoices = 0;
  let undatedPayments = 0;
  let incomplete = false;
  const point = (month: string) => {
    const current = months.get(month) || { month, invoicedMinor: 0, collectedMinor: 0 };
    months.set(month, current);
    return current;
  };
  for (const row of invoices || []) {
    const status = String(row?.status || '');
    if (UNBILLED_INVOICE_STATUSES.has(status)) continue;
    if (!inRange(row?.issued_at, from, to)) {
      if (!monthKey(row?.issued_at)) undatedInvoices += 1;
      continue;
    }
    const amount = integerMinor(row?.amount_due_minor);
    const month = monthKey(row?.issued_at);
    if (amount === null || !month) {
      incomplete = true;
      if (!month) undatedInvoices += 1;
      continue;
    }
    point(month).invoicedMinor += amount;
  }
  for (const row of payments || []) {
    if (String(row?.status || '') !== 'successful') continue;
    if (!inRange(row?.created_at, from, to)) {
      if (!monthKey(row?.created_at)) undatedPayments += 1;
      continue;
    }
    const amount = integerMinor(row?.amount_minor);
    const month = monthKey(row?.created_at);
    if (amount === null || !month) {
      incomplete = true;
      if (!month) undatedPayments += 1;
      continue;
    }
    point(month).collectedMinor += amount;
  }
  return {
    points: [...months.values()].sort((left, right) => left.month.localeCompare(right.month)),
    undatedInvoices,
    undatedPayments,
    incomplete
  };
}

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
