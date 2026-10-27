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

  test('keeps outstanding, collections, and the collection rate on the existing minor-unit basis', () => {
    const {
      collectionRateBps,
      collectedPremiumMinor,
      outstandingPremiumMinor,
      reconciledCollectionMinor,
      premiumMonthSeries,
      commandPremiumTotals
    } = require('../src/modules/health-insurance/services/finance-summary');

    expect(collectionRateBps(0, 0)).toBeNull();
    expect(collectionRateBps(null, 100)).toBeNull();
    expect(collectedPremiumMinor([
      { status: 'successful', amount_minor: 500 },
      { status: 'refunded', amount_minor: 500 },
      { status: 'reversed', amount_minor: 500 },
      { status: 'failed', amount_minor: 500 }
    ])).toBe(500);
    expect(reconciledCollectionMinor([
      { status: 'successful', amount_minor: 500, reconciled_at: '2026-03-16' },
      { status: 'successful', amount_minor: 200, reconciled_at: null }
    ])).toBe(500);
    expect(outstandingPremiumMinor([
      { status: 'issued', amount_due_minor: 1000, amount_paid_minor: 400 },
      { status: 'paid', amount_due_minor: 1000, amount_paid_minor: 1000 },
      { status: 'draft', amount_due_minor: 900, amount_paid_minor: 0 }
    ])).toBe(600);
    expect(outstandingPremiumMinor([
      { status: 'issued', amount_due_minor: null, amount_paid_minor: 0 }
    ])).toBeNull();
    expect(outstandingPremiumMinor([])).toBe(0);

    const series = premiumMonthSeries(
      [
        { status: 'issued', amount_due_minor: 1000, issued_at: '2026-03-02T00:00:00.000Z' },
        { status: 'issued', amount_due_minor: 1000, issued_at: null },
        { status: 'draft', amount_due_minor: 900, issued_at: '2026-03-03T00:00:00.000Z' }
      ],
      [
        { status: 'successful', amount_minor: 250, created_at: '2026-03-15T00:00:00.000Z' },
        { status: 'refunded', amount_minor: 250, created_at: '2026-03-16T00:00:00.000Z' }
      ],
      '2026-03-01',
      '2026-03-31'
    );
    expect(series.points).toEqual([{ month: '2026-03', invoicedMinor: 1000, collectedMinor: 250 }]);
    expect(series.undatedInvoices).toBe(1);

    const totals = commandPremiumTotals(
      [{ status: 'issued', amount_due_minor: 1000, amount_paid_minor: 250, issued_at: '2026-03-02' }],
      [{ status: 'successful', amount_minor: 250, created_at: '2026-03-15', reconciled_at: '2026-03-16' }],
      '2026-03-01',
      '2026-03-31'
    );
    expect(totals).toEqual({
      billedMinor: 1000,
      collectedMinor: 250,
      reconciledMinor: 250,
      outstandingMinor: 750,
      collectionRateBps: 2500
    });
  });
});
