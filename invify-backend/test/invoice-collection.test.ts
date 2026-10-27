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

  test('rolled-forward bills are not collected again', () => {
    const inv = { total_amount: 20, amount_paid: 20, payment_status: 'Rolled Forward' };
    expect(collectedInvoiceAmount(inv)).toBe(0);
    expect(outstandingInvoiceAmount(inv)).toBe(0);
  });

  test('pay later is outstanding and not collected', () => {
    const inv = {
      total_amount: 6,
      amount_paid: 2,
      payment_status: 'Partial',
      payment_method: 'Deferred',
    };
    expect(collectedInvoiceAmount(inv)).toBe(0);
    expect(outstandingInvoiceAmount(inv)).toBe(6);
  });

  test('payment slips and negative rows are not collected', () => {
    expect(
      collectedInvoiceAmount({
        invoice_number: 'PMT-1',
        total_amount: 50,
        amount_paid: 50,
        payment_status: 'Paid',
      }),
    ).toBe(0);
    expect(
      collectedInvoiceAmount({
        invoice_number: 'INV-1',
        total_amount: -80,
        amount_paid: -80,
        payment_status: 'Paid',
      }),
    ).toBe(0);
  });
});
