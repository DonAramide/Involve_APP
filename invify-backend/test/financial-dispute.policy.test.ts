import {
  assertCheckerIsNotMaker,
  DisputePolicyError,
  isTransientQuasarError,
  ledgerCreditAccount,
  parseAmountKobo,
  parseCaseType,
} from '../src/services/financial-dispute.policy';

describe('financial dispute maker-checker policy', () => {
  test('blocks checker who is the same user id as maker', () => {
    expect(() =>
      assertCheckerIsNotMaker({
        makerId: 'op-1',
        makerEmail: 'maker@invify.org',
        checkerId: 'op-1',
        checkerEmail: 'other@invify.org',
      }),
    ).toThrow(DisputePolicyError);
  });

  test('blocks checker who is the same email as maker (case-insensitive)', () => {
    expect(() =>
      assertCheckerIsNotMaker({
        makerId: 'op-1',
        makerEmail: 'Maker@Invify.org',
        checkerId: 'op-2',
        checkerEmail: 'maker@invify.org',
      }),
    ).toThrow(/Maker-checker violation/);
  });

  test('allows a different checker', () => {
    expect(() =>
      assertCheckerIsNotMaker({
        makerId: 'op-1',
        makerEmail: 'maker@invify.org',
        checkerId: 'op-2',
        checkerEmail: 'checker@invify.org',
      }),
    ).not.toThrow();
  });

  test('parses naira into kobo', () => {
    expect(parseAmountKobo({ amountNaira: 150.5 })).toBe(15050);
    expect(parseAmountKobo({ amountKobo: 2500 })).toBe(2500);
  });

  test('rejects zero and negative amounts', () => {
    expect(() => parseAmountKobo({ amountNaira: 0 })).toThrow(DisputePolicyError);
    expect(() => parseAmountKobo({ amount: -1 })).toThrow(DisputePolicyError);
  });

  test('maps ledger credit accounts', () => {
    expect(ledgerCreditAccount('REFUND')).toBe('REFUNDS');
    expect(ledgerCreditAccount('CHARGEBACK')).toBe('CHARGEBACKS');
    expect(ledgerCreditAccount('MANUAL_DEBIT')).toBe('ADJUSTMENTS');
  });

  test('parses case types', () => {
    expect(parseCaseType('refund')).toBe('REFUND');
    expect(() => parseCaseType('payout')).toThrow(DisputePolicyError);
  });

  test('treats timeouts as transient (leave APPROVED_EXECUTING)', () => {
    expect(isTransientQuasarError({ message: 'timeout of 30000ms exceeded' })).toBe(true);
    expect(isTransientQuasarError({ message: 'INSUFFICIENT_FUNDS' })).toBe(false);
  });
});
