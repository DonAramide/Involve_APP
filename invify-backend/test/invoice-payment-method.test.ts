import { classifyInvoicePaymentMethod, isQuasarInvoiceRail } from '../src/utils/invoice-payment-method';
import { splitUnsweptVirtualAccountFunds } from '../src/utils/virtual-account-funds';

describe('classifyInvoicePaymentMethod', () => {
  test('keeps company/personal bank transfer off the Quasar VA rail', () => {
    expect(classifyInvoicePaymentMethod('Transfer')).toBe('bank_transfer');
    expect(isQuasarInvoiceRail('bank_transfer')).toBe(false);
  });

  test('maps virtual account to the Quasar VA rail', () => {
    expect(classifyInvoicePaymentMethod('VirtualAccount')).toBe('va_transfer');
    expect(classifyInvoicePaymentMethod('virtual_account')).toBe('va_transfer');
    expect(isQuasarInvoiceRail('va_transfer')).toBe(true);
    expect(isQuasarInvoiceRail('card')).toBe(true);
  });

  test('maps Wallet / Customer Wallet to customer store credit', () => {
    expect(classifyInvoicePaymentMethod('Wallet')).toBe('wallet');
    expect(classifyInvoicePaymentMethod('Customer Wallet')).toBe('wallet');
  });

  test('does not treat mixed methods as a single rail', () => {
    expect(classifyInvoicePaymentMethod('Cash + Wallet')).toBe('other');
    expect(classifyInvoicePaymentMethod('Deferred + Wallet')).toBe('other');
  });
});

describe('splitUnsweptVirtualAccountFunds', () => {
  test('splits unswept VA between customer and staff accounts', () => {
    const split = splitUnsweptVirtualAccountFunds({
      customerVas: ['111'],
      staffVas: ['222'],
      transactions: [
        { type: 'CREDIT', amount: 5000, reference: 'c1', metadata: { accountNumber: '111' } },
        { type: 'CREDIT', amount: 3000, reference: 's1', metadata: { accountNumber: '222' } },
        { type: 'SWEEP', amount: 1000, reference: 'sw1', metadata: { accountNumber: '111' } },
      ],
    });
    expect(split.customer).toBe(4000);
    expect(split.staff).toBe(3000);
    expect(split.unmapped).toBe(0);
    expect(split.total).toBe(7000);
  });

  test('puts credits with no VA number into unmapped so totals still add', () => {
    const split = splitUnsweptVirtualAccountFunds({
      customerVas: ['111'],
      staffVas: [],
      transactions: [
        { type: 'CREDIT', amount: 9527.4, reference: 'c1', metadata: { accountNumber: '111' } },
        { type: 'CREDIT', amount: 21.6, reference: 'orphan', metadata: {} },
      ],
    });
    expect(split.customer).toBe(9527.4);
    expect(split.staff).toBe(0);
    expect(split.unmapped).toBe(21.6);
    expect(split.total).toBe(9549);
  });
});
