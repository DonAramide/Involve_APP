import { premiumOverviewTotals, summarizeStatusAmounts } from '../src/modules/health-insurance/services/finance-summary';

describe('premium finance summary', () => {
  test('sums integer kobo by status and refuses to invent a missing amount', () => {
    const invoices = summarizeStatusAmounts([
      { status: 'issued', amount_due_minor: 1500000 },
      { status: 'issued', amount_due_minor: 50000 },
      { status: 'paid', amount_due_minor: '250000' }
    ], 'amount_due_minor');
    expect(invoices).toEqual([
      { status: 'issued', count: 2, amountMinor: 1550000 },
      { status: 'paid', count: 1, amountMinor: 250000 }
    ]);

    const unknown = summarizeStatusAmounts([
      { status: 'successful', amount_minor: null }
    ], 'amount_minor');
    expect(unknown).toEqual([{ status: 'successful', count: 1, amountMinor: null }]);
  });

  test('keeps payment states that exist on hw_payments', () => {
    const payments = summarizeStatusAmounts([
      { status: 'initiated', amount_minor: 100 },
      { status: 'pending', amount_minor: 100 },
      { status: 'successful', amount_minor: 100 },
      { status: 'failed', amount_minor: 100 },
      { status: 'reversed', amount_minor: 100 },
      { status: 'refunded', amount_minor: 100 }
    ], 'amount_minor');
    expect(payments.map((row) => row.status)).toEqual([
      'initiated', 'pending', 'successful', 'failed', 'reversed', 'refunded'
    ]);
  });

  test('bills issued minor units and collects only successful payments', () => {
    const totals = premiumOverviewTotals(
      [
        { status: 'issued', amount_due_minor: 1500000 },
        { status: 'draft', amount_due_minor: 900000 },
        { status: 'void', amount_due_minor: 100 }
      ],
      [
        { status: 'successful', amount_minor: 1500000 },
        { status: 'pending', amount_minor: 400000 },
        { status: 'settled', amount_minor: 999 }
      ]
    );
    expect(totals).toEqual({ billedMinor: 1500000, collectedMinor: 1500000 });
  });

  test('returns an unknown total when a persisted amount is not an integer minor unit', () => {
    const totals = premiumOverviewTotals(
      [{ status: 'issued', amount_due_minor: 10.5 }],
      [{ status: 'successful', amount_minor: 100 }]
    );
    expect(totals.billedMinor).toBeNull();
    expect(totals.collectedMinor).toBe(100);
  });
});
