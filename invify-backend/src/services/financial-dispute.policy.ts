export const DISPUTE_TYPES = ['REFUND', 'CHARGEBACK', 'MANUAL_DEBIT'] as const;
export type DisputeCaseType = (typeof DISPUTE_TYPES)[number];

export const DISPUTE_STATUSES = [
  'PENDING_CHECKER',
  'APPROVED_EXECUTING',
  'POSTED',
  'REJECTED',
  'FAILED',
] as const;
export type DisputeStatus = (typeof DISPUTE_STATUSES)[number];

export class DisputePolicyError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = 'DisputePolicyError';
    this.status = status;
  }
}

export function normalizeEmail(value?: string | null): string {
  return String(value || '').trim().toLowerCase();
}

export function assertCheckerIsNotMaker(params: {
  makerId?: string | null;
  makerEmail?: string | null;
  checkerId?: string | null;
  checkerEmail?: string | null;
}): void {
  const makerId = String(params.makerId || '').trim();
  const checkerId = String(params.checkerId || '').trim();
  const makerEmail = normalizeEmail(params.makerEmail);
  const checkerEmail = normalizeEmail(params.checkerEmail);

  if (makerId && checkerId && makerId === checkerId) {
    throw new DisputePolicyError(
      'Maker-checker violation: the operator who created this case cannot approve or reject it.',
      403,
    );
  }

  if (makerEmail && checkerEmail && makerEmail === checkerEmail) {
    throw new DisputePolicyError(
      'Maker-checker violation: the operator who created this case cannot approve or reject it.',
      403,
    );
  }
}

export function parseAmountKobo(body: {
  amountKobo?: unknown;
  amount_kobo?: unknown;
  amountNaira?: unknown;
  amount?: unknown;
}): number {
  const koboRaw = body.amountKobo ?? body.amount_kobo;
  if (koboRaw !== undefined && koboRaw !== null && koboRaw !== '') {
    const kobo = Math.round(Number(koboRaw));
    if (!Number.isFinite(kobo) || kobo <= 0) {
      throw new DisputePolicyError('amountKobo must be a positive integer (kobo).');
    }
    return kobo;
  }

  const nairaRaw = body.amountNaira ?? body.amount;
  const naira = Number(nairaRaw);
  if (!Number.isFinite(naira) || naira <= 0) {
    throw new DisputePolicyError('Enter a positive amount in Naira (or amountKobo).');
  }
  return Math.round(naira * 100);
}

export function parseCaseType(raw: unknown): DisputeCaseType {
  const value = String(raw || '').trim().toUpperCase();
  if ((DISPUTE_TYPES as readonly string[]).includes(value)) {
    return value as DisputeCaseType;
  }
  throw new DisputePolicyError('caseType must be REFUND, CHARGEBACK, or MANUAL_DEBIT.');
}

export function ledgerCreditAccount(type: DisputeCaseType): 'REFUNDS' | 'CHARGEBACKS' | 'ADJUSTMENTS' {
  if (type === 'REFUND') return 'REFUNDS';
  if (type === 'CHARGEBACK') return 'CHARGEBACKS';
  return 'ADJUSTMENTS';
}

export function isTransientQuasarError(err: { message?: string; responseCode?: string } | null | undefined): boolean {
  const message = String(err?.message || '');
  return /timeout|ECONNABORTED|ETIMEDOUT|ECONNRESET|socket hang up|network/i.test(message);
}

export function koboToNaira(kobo: number): number {
  return Math.round(Number(kobo) || 0) / 100;
}
