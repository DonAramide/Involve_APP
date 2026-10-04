import {
  isQuasarCreditEntry,
  quasarLedgerAmountNaira,
  quasarLedgerReference,
  selectQuasarResyncEntries,
} from '../src/utils/quasar-resync';

const day = 24 * 60 * 60 * 1000;
const now = Date.parse('2026-10-03T00:00:00.000Z');

function entry(daysAgo: number, extra: Record<string, unknown> = {}) {
  return {
    direction: 'credit',
    amount_kobo: 250,
    reference: `ref-${daysAgo}`,
    created_at: new Date(now - daysAgo * day).toISOString(),
    ...extra,
  };
}

describe('selectQuasarResyncEntries', () => {
  it('keeps the newest 50 even when they are older than 20 days', () => {
    const rows = Array.from({ length: 50 }, (_, i) => entry(30 + i));
    expect(selectQuasarResyncEntries(rows, now)).toHaveLength(50);
  });

  it('also keeps entries past the 50th when they are inside 20 days', () => {
    const recent = Array.from({ length: 60 }, (_, i) => entry(i * 0.2));
    const selected = selectQuasarResyncEntries(recent, now);
    expect(selected).toHaveLength(60);
  });

  it('drops entries past the 50th that are older than 20 days', () => {
    const rows = [
      ...Array.from({ length: 50 }, (_, i) => entry(1)),
      entry(21),
      entry(10),
    ];
    const selected = selectQuasarResyncEntries(rows, now);
    expect(selected).toHaveLength(51);
    expect(selected.some((row) => row.reference === 'ref-21')).toBe(false);
    expect(selected.some((row) => row.reference === 'ref-10')).toBe(true);
  });
});

describe('quasar ledger credit shape', () => {
  it('reads kobo credits and ignores debits', () => {
    expect(quasarLedgerAmountNaira({ amount_kobo: 10100 })).toBe(101);
    expect(isQuasarCreditEntry({ direction: 'credit' })).toBe(true);
    expect(isQuasarCreditEntry({ direction: 'debit' })).toBe(false);
    expect(quasarLedgerReference({ id: 'led-1' }, 'acct')).toBe('quasar-ledger:acct:led-1');
  });
});
