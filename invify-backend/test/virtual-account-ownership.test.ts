import {
  classifyVirtualAccount,
  creditsSchoolWallet,
  isParentWalletPaymentMethod,
  isSchoolParentWalletPayment,
  newParentAllocationIdempotencyKey,
  payloadHoldsAccount,
} from '../src/services/virtual-account-ownership';

describe('virtual account ownership (in-memory)', () => {
  test('unknown accounts do not credit the school wallet', () => {
    const kind = classifyVirtualAccount({ va: '5555666677' });
    expect(kind).toBe('unknown');
    expect(creditsSchoolWallet(kind)).toBe(false);
  });

  test('parent payload keys accountNumber and virtualAccountNumber both match', () => {
    expect(payloadHoldsAccount({ accountNumber: '9988776655' }, '9988776655')).toBe(true);
    expect(payloadHoldsAccount({ virtualAccountNumber: '9988776655' }, '9988776655')).toBe(true);
    expect(
      classifyVirtualAccount({
        va: '9988776655',
        parentRegistered: true,
      }),
    ).toBe('parent');
  });

  test('school and staff accounts may credit USER_WALLET', () => {
    expect(
      creditsSchoolWallet(
        classifyVirtualAccount({ va: '1234567890', tenantVirtualAccount: '1234567890' }),
      ),
    ).toBe(true);
    expect(
      creditsSchoolWallet(
        classifyVirtualAccount({ va: '1234567890', staffVirtualAccount: '1234567890' }),
      ),
    ).toBe(true);
  });

  test('parent-wallet methods are the only new allocation source', () => {
    expect(isParentWalletPaymentMethod('Parent Credit')).toBe(true);
    expect(isParentWalletPaymentMethod('Transfer')).toBe(false);
    expect(isSchoolParentWalletPayment('Wallet', { businessMode: 'school' })).toBe(true);
    expect(isSchoolParentWalletPayment('Wallet', { studentId: 's1' })).toBe(true);
    expect(isSchoolParentWalletPayment('Wallet', { businessMode: 'retail' })).toBe(false);
    expect(isSchoolParentWalletPayment('Cash', { businessMode: 'school' })).toBe(false);
    expect(isSchoolParentWalletPayment('POS', { businessMode: 'school' })).toBe(false);
    expect(isSchoolParentWalletPayment('Transfer', { businessMode: 'school' })).toBe(false);
    expect(isSchoolParentWalletPayment('VirtualAccount', { businessMode: 'school' })).toBe(false);
    expect(newParentAllocationIdempotencyKey('t1', 'alloc:INV-1')).toBe('alloc:t1:alloc:INV-1');
  });
});
