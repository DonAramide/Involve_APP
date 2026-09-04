export type InvoiceRail =
  | 'cash'
  | 'card'
  | 'va_transfer'
  | 'bank_transfer'
  | 'wallet'
  | 'other';

/**
 * Classify an invoice payment_method for dashboard rails.
 *
 * Wallet = customer store credit (not the tenant payout wallet).
 * VirtualAccount = paid into an Invify/Quasar VA (customer or staff).
 * Transfer = paid into the tenant's own/personal bank account — not Quasar.
 */
export function classifyInvoicePaymentMethod(raw?: string | null): InvoiceRail {
  const method = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  if (!method) return 'other';
  if (method === 'wallet' || method === 'customer_wallet') return 'wallet';
  if (method === 'cash') return 'cash';
  if (method === 'card' || method === 'pos') return 'card';
  if (
    method === 'virtualaccount' ||
    method === 'virtual_account' ||
    method === 'va' ||
    method === 'va_transfer'
  ) {
    return 'va_transfer';
  }
  if (method === 'transfer' || method === 'bank_transfer' || method === 'company_bank') {
    return 'bank_transfer';
  }
  return 'other';
}

export function isQuasarInvoiceRail(rail: InvoiceRail): boolean {
  return rail === 'va_transfer' || rail === 'card';
}
