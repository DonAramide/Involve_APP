import { getClient } from '../db/pg';
import { CustomerRepository } from '../repositories/customer.repository';
import { InvoiceRepository } from '../repositories/invoice.repository';
import { InvoiceItemRepository } from '../repositories/invoice-item.repository';
import { LedgerService, LedgerEntry } from './ledger.service';
import { supabaseAdmin } from '../db/supabase';
import { asUuid, toStableUuid } from '../utils/stable-uuid';

export class InvoiceApplicationService {
  /**
   * Orchestrates the creation of an offline invoice into a single ACID Postgres transaction.
   * Leverages repositories for DML and delegates accounting logic to LedgerService.
   */
  static async processOfflineInvoice(payload: any, context: { tenantId: string; deviceId?: string }, idempotencyKey: string, correlationId?: string) {
    const invoiceId = toStableUuid(
      context.tenantId,
      'invoice',
      String(payload.syncId || payload.id || payload.invoiceNumber || idempotencyKey),
    );
    const customerId =
      asUuid(payload.customerId) ||
      asUuid(payload.studentSyncId) ||
      asUuid(payload.student_id) ||
      null;
    payload.syncId = invoiceId;
    payload.customerId = customerId;

    if (!process.env.DATABASE_URL) {
      console.log('[InvoiceApplicationService] DATABASE_URL not set. Falling back to Supabase REST client.');
      
      // 1. Upsert Customer (if provided)
      if (customerId && payload.customerName) {
        const { error } = await supabaseAdmin.from('customers').upsert({
          id: customerId,
          tenant_id: context.tenantId,
          name: payload.customerName,
          phone: payload.customerPhone || null,
          address: payload.customerAddress || null,
          created_at: payload.dateCreated,
          updated_at: new Date().toISOString()
        });
        if (error) throw new Error(`Customer upsert failed: ${error.message}`);
      }
      const { data: existingRow } = await supabaseAdmin
        .from('invoices')
        .select('id')
        .eq('id', invoiceId)
        .eq('tenant_id', context.tenantId)
        .maybeSingle();
      const alreadyExists = !!existingRow;

      // 2. Upsert Invoice
      const invoiceRow: Record<string, unknown> = {
        id: invoiceId,
        tenant_id: context.tenantId,
        invoice_number: payload.invoiceNumber,
        customer_id: customerId,
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
      };
      if (payload.customerName) invoiceRow.customer_name = payload.customerName;
      if (payload.staffName) invoiceRow.staff_name = payload.staffName;

      let { error: invErr } = await supabaseAdmin.from('invoices').upsert(invoiceRow);
      if (invErr && /customer_name|staff_name/.test(invErr.message || '')) {
        delete invoiceRow.customer_name;
        delete invoiceRow.staff_name;
        const retry = await supabaseAdmin.from('invoices').upsert(invoiceRow);
        invErr = retry.error;
      }
      if (invErr) throw new Error(`Invoice upsert failed: ${invErr.message}`);

      // 3. Upsert Invoice Items
      if (payload.items && Array.isArray(payload.items)) {
        const itemsToInsert = payload.items
          .map((item: any) => {
            const itemId = asUuid(item.productSyncId) || asUuid(item.itemId);
            if (!itemId) return null;
            const invoiceItemId = toStableUuid(
              context.tenantId,
              'invoice_item',
              String(item.invoiceItemSyncId || item.syncId || `${invoiceId}:${itemId}`),
            );
            return {
              id: invoiceItemId,
              invoice_id: invoiceId,
              item_id: itemId,
              quantity: item.quantity,
              unit_price: item.unitPrice,
              type: item.type || 'product',
              created_at: payload.dateCreated,
              updated_at: new Date().toISOString()
            };
          })
          .filter(Boolean);
        if (itemsToInsert.length) {
          const { error: itemsErr } = await supabaseAdmin.from('invoice_items').upsert(itemsToInsert);
          if (itemsErr) {
            console.warn('[InvoiceApplicationService] Invoice items skipped:', itemsErr.message);
          }
        }
      }

      // 4. Double-Entry Accounting (create only — updates must not double-post)
      if (!alreadyExists) {
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
      }
      return { alreadyExists, invoiceId };
    }

    const client = await getClient();
    try {
      await client.query('BEGIN');

      // 1. Upsert Customer (if provided)
      if (customerId && payload.customerName) {
        await CustomerRepository.upsert(client, {
          id: customerId,
          tenantId: context.tenantId,
          name: payload.customerName,
          phone: payload.customerPhone,
          address: payload.customerAddress,
          createdAt: payload.dateCreated
        });
      }

      const existingPg = await client.query(
        'SELECT 1 FROM invoices WHERE id = $1 AND tenant_id = $2 LIMIT 1',
        [invoiceId, context.tenantId]
      );
      const alreadyExists = (existingPg.rowCount || 0) > 0;

      // 2. Upsert Invoice
      await InvoiceRepository.upsert(client, {
        id: invoiceId,
        tenantId: context.tenantId,
        invoiceNumber: payload.invoiceNumber,
        customerId: customerId || undefined,
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
        const itemsToInsert = payload.items
          .map((item: any) => {
            const itemId = asUuid(item.productSyncId) || asUuid(item.itemId);
            if (!itemId) return null;
            return {
              id: toStableUuid(
                context.tenantId,
                'invoice_item',
                String(item.invoiceItemSyncId || item.syncId || `${invoiceId}:${itemId}`),
              ),
              invoiceId,
              itemId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              type: item.type
            };
          })
          .filter((row: any) => !!row);
        
        if (itemsToInsert.length) {
          try {
            await InvoiceItemRepository.bulkUpsert(client, itemsToInsert);
          } catch (itemErr: any) {
            console.warn('[InvoiceApplicationService] Invoice items skipped:', itemErr?.message || itemErr);
          }
        }
      }

      // 4. Double-Entry Accounting (create only — updates must not double-post)
      if (!alreadyExists) {
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
          reference: invoiceId,
          entries,
          correlationId: correlationId,
          metadata: {
            source: 'flutter_outbox',
            eventName: 'invoice.created',
            invoiceNumber: payload.invoiceNumber
          }
        }, { pgClient: client });
      }

      await client.query('COMMIT');
      return { alreadyExists, invoiceId };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
