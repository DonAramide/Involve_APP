import { roundNaira } from './virtual-account-funds';

export const QUASAR_RESYNC_LIMIT = 50;
export const QUASAR_RESYNC_DAYS = 20;

export function quasarEntryTimestamp(entry: any): number {
  const ts = Date.parse(
    String(entry?.created_at || entry?.createdAt || entry?.timestamp || entry?.postedAt || ''),
  );
  return Number.isFinite(ts) ? ts : NaN;
}

/**
 * Newest-first ledger page. Keep the latest 50 entries, and also any older
 * entry that still falls inside the last 20 days.
 */
export function selectQuasarResyncEntries(entriesNewestFirst: any[], now = Date.now()): any[] {
  const cutoff = now - QUASAR_RESYNC_DAYS * 24 * 60 * 60 * 1000;
  return (entriesNewestFirst || []).filter((entry, index) => {
    if (index < QUASAR_RESYNC_LIMIT) return true;
    const ts = quasarEntryTimestamp(entry);
    return Number.isFinite(ts) && ts >= cutoff;
  });
}

export function quasarLedgerAmountNaira(entry: any): number {
  const exact = Number(entry?.amountNaira ?? entry?.amount_naira);
  if (Number.isFinite(exact) && exact > 0) return roundNaira(exact);
  const kobo = Number(entry?.amount_kobo ?? entry?.amountKobo);
  if (Number.isFinite(kobo) && kobo > 0) return roundNaira(kobo / 100);
  const amount = Number(entry?.amount);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  if (String(entry?.amount).includes('.')) return roundNaira(amount);
  return roundNaira(amount / 100);
}

export function isQuasarCreditEntry(entry: any): boolean {
  const direction = String(entry?.direction || entry?.type || entry?.entryType || '').toLowerCase();
  if (['debit', 'dr', 'sweep', 'withdrawal', 'out'].includes(direction)) return false;
  return ['credit', 'cr', 'deposit', 'inward', 'funding'].includes(direction);
}

export function quasarLedgerReference(entry: any, accountId: string): string {
  const reference = String(entry?.reference || entry?.correlation_id || entry?.correlationId || '').trim();
  if (reference) return reference;
  const id = String(entry?.id || entry?.ledgerEntryId || '').trim();
  return id ? `quasar-ledger:${accountId}:${id}` : '';
}
