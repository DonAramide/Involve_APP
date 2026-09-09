import { presentInvoice } from '../src/utils/present-invoice';

describe('presentInvoice', () => {
  test('maps payment_status and joined customer name for tenant admin', () => {
    const presented = presentInvoice({
      invoice_number: 'INV-1',
      payment_status: 'Pending',
      amount_paid: 1.15,
      customer: { name: 'Ada Lovelace' },
    });
    expect(presented.status).toBe('Pending');
    expect(presented.customer_name).toBe('Ada Lovelace');
    expect(presented.metadata.customer_name).toBe('Ada Lovelace');
  });
});
