import {
  collectedInvoiceAmount,
  outstandingInvoiceAmount,
} from '../src/utils/invoice-collection';

describe('invoice collection', () => {
  test('pending checkout is not collected even when amount_paid equals total', () => {
    const inv = { total_amount: 1.15, amount_paid: 1.15, payment_status: 'Pending' };
    expect(collectedInvoiceAmount(inv)).toBe(0);
    expect(outstandingInvoiceAmount(inv)).toBe(1.15);
  });

  test('paid invoices count as collected', () => {
    const inv = { total_amount: 2.47, amount_paid: 2.47, payment_status: 'Paid' };
    expect(collectedInvoiceAmount(inv)).toBe(2.47);
    expect(outstandingInvoiceAmount(inv)).toBe(0);
  });

  test('partial invoices collect only the paid portion', () => {
    const inv = { total_amount: 10, amount_paid: 4, payment_status: 'Partial' };
    expect(collectedInvoiceAmount(inv)).toBe(4);
    expect(outstandingInvoiceAmount(inv)).toBe(6);
  });
});
