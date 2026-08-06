import { getClient } from '../db/pg';
import { CustomerRepository } from '../repositories/customer.repository';
import { InvoiceRepository } from '../repositories/invoice.repository';
import { InvoiceItemRepository } from '../repositories/invoice-item.repository';
import { LedgerService, LedgerEntry } from './ledger.service';
import { supabaseAdmin } from '../db/supabase';

export class InvoiceApplicationService {
  /**
   * Orchestrates the creation of an offline invoice into a single ACID Postgres transaction.
   * Leverages repositories for DML and delegates accounting logic to LedgerService.
   */
  static async processOfflineInvoice(payload: any, context: { tenantId: string; deviceId?: string }, idempotencyKey: string, correlationId?: string) {
    if (!process.env.DATABASE_URL) {
      console.log('[InvoiceApplicationService] DATABASE_URL not set. Falling back to Supabase REST client.');
      
      // 1. Upsert Customer (if provided)
      if (payload.customerId && payload.customerName) {
        const { error } = await supabaseAdmin.from('customers').upsert({
          id: payload.customerId,
          tenant_id: context.tenantId,
          name: payload.customerName,
          phone: payload.customerPhone || null,
          address: payload.customerAddress || null,
          created_at: payload.dateCreated,
          updated_at: new Date().toISOString()
        });
        if (error) throw new Error(`Customer upsert failed: ${error.message}`);
      }

      // 2. Upsert Invoice
      const { error: invErr } = await supabaseAdmin.from('invoices').upsert({
        id: payload.syncId,
        tenant_id: context.tenantId,
        invoice_number: payload.invoiceNumber,
        customer_id: payload.customerId || null,
        subtotal: payload.subtotal || 0,
        tax_amount: payload.taxAmount || 0,
        discount_amount: payload.discountAmount || 0,
        total_amount: payload.totalAmount || 0,
        amount_paid: payload.amountPaid || 0,
        balance_amount: payload.balanceAmount || 0,
        payment_status: payload.paymentStatus || 'Unpaid',
        payment_method: payload.paymentMethod || null,
        created_at: payload.dateCreated,
        updated_at: new Date().toISOString()
      });
      if (invErr) throw new Error(`Invoice upsert failed: ${invErr.message}`);

      // 3. Upsert Invoice Items
      if (payload.items && Array.isArray(payload.items)) {
        const itemsToInsert = payload.items.map((item: any) => {
          const itemId = item.productSyncId || item.itemId;
          const invoiceItemId = item.invoiceItemSyncId || item.syncId;
          return {
            id: invoiceItemId,
            invoice_id: payload.syncId,
            item_id: itemId,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            type: item.type || 'product',
            created_at: payload.dateCreated,
            updated_at: new Date().toISOString()
          };
        });
        const { error: itemsErr } = await supabaseAdmin.from('invoice_items').upsert(itemsToInsert);
        if (itemsErr) throw new Error(`Invoice items upsert failed: ${itemsErr.message}`);
      }

      // 4. Double-Entry Accounting (best-effort — invoice sync must not be blocked by ledger issues)
      const entries: LedgerEntry[] = [
        { account: 'USER_WALLET', type: 'DEBIT', amount: payload.totalAmount },
        { account: 'REVENUE', type: 'CREDIT', amount: payload.totalAmount }
      ];

      if (payload.amountPaid && payload.amountPaid > 0) {
        entries.push({ account: 'EXTERNAL_BANK', type: 'DEBIT', amount: payload.amountPaid });
        entries.push({ account: 'USER_WALLET', type: 'CREDIT', amount: payload.amountPaid });
      }

      try {
        await LedgerService.createDoubleEntry({
          idempotencyKey: idempotencyKey,
          tenantId: context.tenantId,
          reference: payload.syncId,
          entries,
          correlationId: correlationId,
          metadata: {
            source: 'flutter_outbox',
            eventName: 'invoice.created',
            invoiceNumber: payload.invoiceNumber
          }
        });
      } catch (ledgerErr: any) {
        // Non-fatal: invoice data is already saved. Ledger reconciliation can be re-run.
        console.warn('[InvoiceApplicationService] Ledger recording skipped (non-critical):', ledgerErr.message);
      }
      return;
    }

    const client = await getClient();
    try {
      await client.query('BEGIN');

      // 1. Upsert Customer (if provided)
      if (payload.customerId && payload.customerName) {
        await CustomerRepository.upsert(client, {
          id: payload.customerId,
          tenantId: context.tenantId,
          name: payload.customerName,
          phone: payload.customerPhone,
          address: payload.customerAddress,
          createdAt: payload.dateCreated
        });
      }

      // 2. Upsert Invoice
      await InvoiceRepository.upsert(client, {
        id: payload.syncId,
        tenantId: context.tenantId,
        invoiceNumber: payload.invoiceNumber,
        customerId: payload.customerId,
        subtotal: payload.subtotal || 0,
        taxAmount: payload.taxAmount || 0,
        discountAmount: payload.discountAmount || 0,
        totalAmount: payload.totalAmount || 0,
        amountPaid: payload.amountPaid || 0,
        balanceAmount: payload.balanceAmount || 0,
        paymentStatus: payload.paymentStatus || 'Unpaid',
        paymentMethod: payload.paymentMethod,
        createdAt: payload.dateCreated
      });

      // 3. Upsert Invoice Items
      if (payload.items && Array.isArray(payload.items)) {
        const itemsToInsert = payload.items.map((item: any) => {
          // Use explicitly mapped names
          const itemId = item.productSyncId || item.itemId;
          const invoiceItemId = item.invoiceItemSyncId || item.syncId;
          return {
            id: invoiceItemId,
            invoiceId: payload.syncId,
            itemId: itemId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            type: item.type
          };
        });
        
        await InvoiceItemRepository.bulkUpsert(client, itemsToInsert);
      }

      // 4. Double-Entry Accounting
      const entries: LedgerEntry[] = [
        { account: 'USER_WALLET', type: 'DEBIT', amount: payload.totalAmount }, // Receivables
        { account: 'REVENUE', type: 'CREDIT', amount: payload.totalAmount }
      ];

      if (payload.amountPaid && payload.amountPaid > 0) {
        entries.push({ account: 'EXTERNAL_BANK', type: 'DEBIT', amount: payload.amountPaid }); // Cash/Bank
        entries.push({ account: 'USER_WALLET', type: 'CREDIT', amount: payload.amountPaid }); // Receivables reduced
      }

      await LedgerService.createDoubleEntry({
        idempotencyKey: idempotencyKey,
        tenantId: context.tenantId,
        reference: payload.syncId, // Use Invoice UUID as reference
        entries,
        correlationId: correlationId,
        metadata: {
          source: 'flutter_outbox',
          eventName: 'invoice.created',
          invoiceNumber: payload.invoiceNumber
        }
      }, { pgClient: client });

      await client.query('COMMIT');

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
