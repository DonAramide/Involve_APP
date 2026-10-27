export type CollectionConfirmation = 'unconfirmed' | 'recorded' | 'settled';

function normalizeMethod(method: unknown): string {
  return String(method || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function isStableCommandId(value: unknown): boolean {
  const id = String(value || '').trim();
  if (id.length < 16) return false;
  if (/^\d+$/.test(id)) return false;
  return true;
}

export function classifyCollectionConfirmation(
  method: unknown,
  opts: { confirmed?: boolean; providerReference?: string | null } = {},
): CollectionConfirmation {
  const m = normalizeMethod(method);
  const provider = String(opts.providerReference || '').trim();
  const confirmed = opts.confirmed === true;

  if (m === 'parent_credit' || m.includes('parent_credit') || m === 'wallet' || m === 'parent_wallet') {
    return 'recorded';
  }
  if (
    m.includes('virtualaccount') ||
    m.includes('virtual_account') ||
    m === 'va' ||
    m.includes('va_transfer')
  ) {
    return provider ? 'settled' : 'unconfirmed';
  }
  if (m === 'transfer' || m.includes('bank_transfer') || m.includes('company_account') || m.includes('company_bank')) {
    return confirmed ? 'recorded' : 'unconfirmed';
  }
  if (m.includes('pos') || m.includes('card') || m.includes('mpos') || m.includes('nibss')) {
    return provider ? 'settled' : 'unconfirmed';
  }
  if (m === 'cash' || m.includes('cash')) {
    return 'recorded';
  }
  return 'unconfirmed';
}

export function providerCreditIdempotencyKey(reference: string): string {
  const cleaned = String(reference || '').trim().replace(/^qwd:/, '');
  return `quasar:${cleaned}:credit`;
}
