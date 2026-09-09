export function isPendingInvoiceStatus(status: unknown): boolean {
  return String(status || '').trim().toLowerCase() === 'pending';
}

function money(value: unknown): number {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

/** Confirmed receipts only. Pending checkout (awaiting transfer/VA) is 0. */
export function collectedInvoiceAmount(inv: {
  amount_paid?: unknown;
  amountPaid?: unknown;
  payment_status?: unknown;
  paymentStatus?: unknown;
}): number {
  const status = inv.payment_status ?? inv.paymentStatus;
  if (isPendingInvoiceStatus(status)) return 0;
  return money(inv.amount_paid ?? inv.amountPaid);
}

/** Still owed, including the full total of pending invoices. */
export function outstandingInvoiceAmount(inv: {
  total_amount?: unknown;
  totalAmount?: unknown;
  amount_paid?: unknown;
  amountPaid?: unknown;
  payment_status?: unknown;
  paymentStatus?: unknown;
}): number {
  const total = money(inv.total_amount ?? inv.totalAmount);
  const paid = money(inv.amount_paid ?? inv.amountPaid);
  const status = inv.payment_status ?? inv.paymentStatus;
  if (isPendingInvoiceStatus(status)) return total;
  const balance = total - paid;
  return balance > 0 ? balance : 0;
}
