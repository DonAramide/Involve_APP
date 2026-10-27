import {
  allocationIdentity,
  creditsUserWallet,
  koboToNaira,
  nairaToKobo,
  parentAllocationLedgerEntries,
  parentCreditLandedOnSchoolWallet,
  parentDepositLedgerEntries,
  spendableSchoolKobo,
} from '../src/services/school-fund-ownership';

describe('school fund ownership', () => {
  test('a parent deposit does not credit USER_WALLET', () => {
    const entries = parentDepositLedgerEntries(140);
    expect(creditsUserWallet(entries)).toBe(false);
    expect(entries.map((entry) => entry.account).sort()).toEqual(['PARENT_LIABILITY', 'QUASAR_CLEARING']);
    expect(entries.reduce((sum, entry) => sum + (entry.type === 'CREDIT' ? entry.amount : -entry.amount), 0)).toBe(0);
  });

  test('allocation moves the kobo amount once', () => {
    const entries = parentAllocationLedgerEntries(3.5);
    expect(nairaToKobo(3.5)).toBe(350);
    expect(koboToNaira(350)).toBe(3.5);
    expect(entries.find((entry) => entry.account === 'USER_WALLET')?.amount).toBe(3.5);
    expect(entries.find((entry) => entry.account === 'PARENT_LIABILITY')?.type).toBe('DEBIT');
  });

  test('a low cache is not an input to spendable school funds', () => {
    expect(spendableSchoolKobo(30722, 25400)).toBe(5322);
    expect(spendableSchoolKobo(1000, 5000)).toBe(0);
  });

  test('historical parent credits on the school wallet are recognized', () => {
    expect(parentCreditLandedOnSchoolWallet({ paidVia: 'parent_account' })).toBe(true);
    expect(parentCreditLandedOnSchoolWallet({ paidVia: 'parent_account', schoolWalletCredit: false })).toBe(false);
    expect(parentCreditLandedOnSchoolWallet({ paidVia: 'school_account' })).toBe(false);
  });

  test('one allocation keeps a single identity across reference shapes', () => {
    expect(allocationIdentity('qwd:PAR-1')).toBe('alloc:PAR-1');
    expect(allocationIdentity('PAR-1')).toBe(allocationIdentity('qwd:PAR-1'));
  });

  test('partial allocation leaves the remainder out of the school credit', () => {
    const allocated = parentAllocationLedgerEntries(40);
    const school = allocated.find((entry) => entry.account === 'USER_WALLET')!.amount;
    expect(school).toBe(40);
    expect(140 - school).toBe(100);
  });
});
