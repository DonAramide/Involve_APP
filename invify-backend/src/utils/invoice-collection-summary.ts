import {
  collectedInvoiceAmount,
  countsTowardSales,
  isRolledForwardStatus,
  outstandingInvoiceAmount,
} from './invoice-collection';
import { classifyInvoicePaymentMethod } from './invoice-payment-method';

const LAGOS = 'Africa/Lagos';

function roundNaira(value: number): number {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export type CollectionSummary = {
  timezone: string;
  period: { start: string | null; end: string | null };
  invoiced: number;
  recordedCollected: number;
  pending: number;
  settledFundsNote: string;
  rails: {
    cash: number;
    card: number;
    bankTransfer: number;
    vaTransfer: number;
    wallet: number;
  };
  invoiceCount: number;
};

/** Same rails as tablet salesPeriodTotals / salesRailTotals (confirmed collected only). */
export function collectionSummaryFromInvoices(
  invoices: any[] | null | undefined,
  period: { start?: string | null; end?: string | null } = {},
): CollectionSummary {
  let invoiced = 0;
  let recordedCollected = 0;
  let pending = 0;
  let cash = 0;
  let card = 0;
  let bankTransfer = 0;
  let vaTransfer = 0;
  let wallet = 0;
  let invoiceCount = 0;

  for (const inv of invoices || []) {
    if (!countsTowardSales(inv)) continue;
    if (isRolledForwardStatus(inv.payment_status ?? inv.paymentStatus)) continue;
    invoiceCount += 1;
    const billed = Number(inv.total_amount ?? inv.totalAmount ?? 0);
    invoiced += billed > 0 ? billed : 0;
    const collected = collectedInvoiceAmount(inv);
    recordedCollected += collected;
    pending += outstandingInvoiceAmount(inv);
    const rail = classifyInvoicePaymentMethod(String(inv.payment_method ?? inv.paymentMethod ?? ''));
    if (rail === 'cash') cash += collected;
    else if (rail === 'card') card += collected;
    else if (rail === 'bank_transfer') bankTransfer += collected;
    else if (rail === 'va_transfer') vaTransfer += collected;
    else if (rail === 'wallet') wallet += collected;
  }

  return {
    timezone: LAGOS,
    period: { start: period.start || null, end: period.end || null },
    invoiced: roundNaira(invoiced),
    recordedCollected: roundNaira(recordedCollected),
    pending: roundNaira(pending),
    settledFundsNote:
      'recordedCollected is confirmed invoice receipts. Cash and own-bank transfer are not Invify-settled. Card and VA are provider rails.',
    rails: {
      cash: roundNaira(cash),
      card: roundNaira(card),
      bankTransfer: roundNaira(bankTransfer),
      vaTransfer: roundNaira(vaTransfer),
      wallet: roundNaira(wallet),
    },
    invoiceCount,
  };
}
