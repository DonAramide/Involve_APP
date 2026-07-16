import { PoolClient } from 'pg';

export class InvoiceRepository {
  static async upsert(client: PoolClient, params: {
    id: string;
    tenantId: string;
    invoiceNumber: string;
    customerId?: string;
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    totalAmount: number;
    amountPaid: number;
    balanceAmount: number;
    paymentStatus: string;
    paymentMethod?: string;
    createdAt?: string;
  }) {
    const query = `
      INSERT INTO invoices (
        id, tenant_id, invoice_number, customer_id, subtotal, tax_amount, discount_amount, 
        total_amount, amount_paid, balance_amount, payment_status, payment_method, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
      ON CONFLICT (id) DO UPDATE 
      SET invoice_number = EXCLUDED.invoice_number,
          customer_id = EXCLUDED.customer_id,
          subtotal = EXCLUDED.subtotal,
          tax_amount = EXCLUDED.tax_amount,
          discount_amount = EXCLUDED.discount_amount,
          total_amount = EXCLUDED.total_amount,
          amount_paid = EXCLUDED.amount_paid,
          balance_amount = EXCLUDED.balance_amount,
          payment_status = EXCLUDED.payment_status,
          payment_method = EXCLUDED.payment_method,
          updated_at = NOW()
    `;
    await client.query(query, [
      params.id,
      params.tenantId,
      params.invoiceNumber,
      params.customerId || null,
      params.subtotal,
      params.taxAmount,
      params.discountAmount,
      params.totalAmount,
      params.amountPaid,
      params.balanceAmount,
      params.paymentStatus,
      params.paymentMethod || null,
      params.createdAt || new Date().toISOString()
    ]);
  }
}
