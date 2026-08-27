import { InvoiceApplicationService } from '../services/invoice-application.service';
import { supabaseAdmin } from '../db/supabase';
import { io } from '../app';
import { GovAuditService } from '../services/gov-audit.service';
import { randomUUID } from 'crypto';
import { getClient } from '../db/pg';
import { LedgerService } from '../services/ledger.service';
import { WhatsAppNotificationService } from '../services/whatsapp-notification.service';

export class InvoiceFacade {
  /**
   * The canonical entry point for creating an invoice, shared by REST and Sync.
   * Delegates the actual ACID transaction to InvoiceApplicationService.
   */
  static async createInvoice(payload: any, context: { tenantId: string; deviceId?: string }, idempotencyKey: string, correlationId?: string) {
    // 1. Delegate business logic (reusing offline engine)
    await InvoiceApplicationService.processOfflineInvoice(payload, context, idempotencyKey, correlationId);
    
    // 2. We do NOT duplicate ledger or audit logic here because processOfflineInvoice already handles it.
    // We only trigger transport-agnostic realtime events that the dashboard might rely on.
    io.to(`tenant:${context.tenantId}`).emit('finance.invoice.created', payload);

    // 3. WhatsApp invoice notification (non-fatal — never rolls back invoice persistence)
    try {
      const invoiceId = String(payload.id || payload.invoiceId || payload.syncId || idempotencyKey);
      WhatsAppNotificationService.notifyInvoiceCreated({
        tenantId: context.tenantId,
        customerId: payload.customerId || payload.customer_id || null,
        invoiceId,
        invoiceNumber: payload.invoiceNumber || payload.localInvoiceNumber || invoiceId,
        amount: payload.totalAmount ?? payload.total_amount ?? payload.amount,
        currency: payload.currency || 'NGN',
        recipientPhone: payload.customerPhone || payload.customer_phone || null,
        customerName: payload.customerName || payload.customer_name,
        dueDate: payload.dueDate || payload.due_date,
      });
    } catch (e: any) {
      console.error('[InvoiceFacade] WhatsApp invoice notify failed (non-fatal):', e?.message || e);
    }
    
    return { success: true, syncId: payload.syncId };
  }

  static async getInvoices(tenantId: string, filters: any = {}) {
    let query = supabaseAdmin.from('invoices').select('*, customer:customer_id(*)').eq('tenant_id', tenantId);
    
    if (filters.status) query = query.eq('payment_status', filters.status);
    if (filters.limit) query = query.limit(filters.limit);
    
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    
    return data;
  }

  static async getInvoice(tenantId: string, id: string) {
    const { data: invoice, error } = await supabaseAdmin
      .from('invoices')
      .select('*, customer:customer_id(*)')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .maybeSingle();
      
    if (error) throw new Error(error.message);
    if (!invoice) return null;
    
    const { data: items, error: itemsError } = await supabaseAdmin
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', id);
      
    if (itemsError) throw new Error(itemsError.message);

    const itemIds = (items || []).map((i: any) => i.item_id).filter(Boolean);
    const itemMap: Record<string, string> = {};
    if (itemIds.length > 0) {
      const { data: dbItems, error: dbItemsErr } = await supabaseAdmin
        .from('items')
        .select('id, name')
        .in('id', itemIds);
      if (dbItemsErr) console.error('Error fetching item details:', dbItemsErr);
      if (dbItems) {
        dbItems.forEach((it: any) => {
          itemMap[it.id] = it.name;
        });
      }
    }
    
    const enrichedItems = (items || []).map((i: any) => ({
      ...i,
      name: itemMap[i.item_id] || 'Product Item',
      total: Number(i.quantity || 0) * Number(i.unit_price || 0)
    }));
    
    return { ...invoice, items: enrichedItems };
  }

  static async recordPayment(tenantId: string, id: string, payload: any) {
    const applySideEffects = async (newStatus: string, newBalance: number) => {
      io.to(`tenant:${tenantId}`).emit('finance.invoice.payment_recorded', {
        invoiceId: id,
        amount: payload.amount,
        status: newStatus,
      });

      try {
        const receiptId = `pay-${id}-${Date.now()}`;
        let recipientPhone = payload.customerPhone || payload.customer_phone || null;
        let customerId = payload.customerId || payload.customer_id || null;
        let customerName = payload.customerName || payload.customer_name;

        if (!recipientPhone) {
          const { data: invRow } = await supabaseAdmin
            .from('invoices')
            .select('customer_id, customer:customer_id(id, phone, name)')
            .eq('id', id)
            .eq('tenant_id', tenantId)
            .maybeSingle();
          const customer = (invRow as any)?.customer;
          recipientPhone = customer?.phone || null;
          customerId = customerId || customer?.id || invRow?.customer_id || null;
          customerName = customerName || customer?.name;
        }

        WhatsAppNotificationService.notifyReceipt({
          tenantId,
          invoiceId: id,
          receiptId,
          amount: payload.amount,
          currency: payload.currency || 'NGN',
          recipientPhone,
          customerName,
          customerId,
          reference: receiptId,
        });
      } catch (e: any) {
        console.error('[InvoiceFacade] WhatsApp receipt notify failed (non-fatal):', e?.message || e);
      }

      return { success: true, newStatus, newBalance };
    };

    // Staging/containers often omit DATABASE_URL; use service-role REST path (same as invoice create).
    if (!process.env.DATABASE_URL) {
      const { data: inv, error: invErr } = await supabaseAdmin
        .from('invoices')
        .select('total_amount, amount_paid, balance_amount, payment_status')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .maybeSingle();
      if (invErr || !inv) throw new Error('Invoice not found');

      const newAmountPaid = Number(inv.amount_paid) + Number(payload.amount);
      const newBalance = Number(inv.total_amount) - newAmountPaid;
      const newStatus = newBalance <= 0 ? 'Paid' : 'Partial';

      const { error: updErr } = await supabaseAdmin
        .from('invoices')
        .update({
          amount_paid: newAmountPaid,
          balance_amount: newBalance,
          payment_status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('tenant_id', tenantId);
      if (updErr) throw new Error(`Invoice payment update failed: ${updErr.message}`);

      try {
        await LedgerService.createDoubleEntry({
          idempotencyKey: randomUUID(),
          tenantId,
          reference: `PAY-${id}-${Date.now()}`,
          entries: [
            { account: 'EXTERNAL_BANK', type: 'DEBIT', amount: payload.amount },
            { account: 'USER_WALLET', type: 'CREDIT', amount: payload.amount },
          ],
          metadata: {
            source: 'invoice_payment',
            invoiceId: id,
            paymentMethod: payload.paymentMethod,
          },
        });
      } catch (ledgerErr: any) {
        console.warn('[InvoiceFacade] Ledger recording skipped (non-critical):', ledgerErr?.message || ledgerErr);
      }

      await GovAuditService.logAction({
        id: `gov-${Date.now()}-${randomUUID().slice(0, 5)}`,
        timestamp: new Date().toISOString(),
        module: 'FINANCIAL',
        action: 'INVOICE_PAYMENT_RECORDED',
        user_email: payload.userEmail || 'system',
        user_name: payload.userName || 'System',
        ip_address: payload.ip || '127.0.0.1',
        target: id,
        status: 'success',
        metadata: { amount: payload.amount, method: payload.paymentMethod },
      });

      return applySideEffects(newStatus, newBalance);
    }

    const client = await getClient();
    try {
      await client.query('BEGIN');
      
      const { rows } = await client.query('SELECT total_amount, amount_paid, balance_amount, payment_status FROM invoices WHERE id = $1 AND tenant_id = $2 FOR UPDATE', [id, tenantId]);
      if (rows.length === 0) throw new Error('Invoice not found');
      
      const inv = rows[0];
      const newAmountPaid = Number(inv.amount_paid) + Number(payload.amount);
      const newBalance = Number(inv.total_amount) - newAmountPaid;
      const newStatus = newBalance <= 0 ? 'Paid' : 'Partial';
      
      await client.query('UPDATE invoices SET amount_paid = $1, balance_amount = $2, payment_status = $3, updated_at = NOW() WHERE id = $4', [newAmountPaid, newBalance, newStatus, id]);
      
      // Ledger entry for manual payment
      await LedgerService.createDoubleEntry({
        idempotencyKey: randomUUID(),
        tenantId,
        reference: `PAY-${id}-${Date.now()}`,
        entries: [
          { account: 'EXTERNAL_BANK', type: 'DEBIT', amount: payload.amount },
          { account: 'USER_WALLET', type: 'CREDIT', amount: payload.amount }
        ],
        metadata: {
          source: 'invoice_payment',
          invoiceId: id,
          paymentMethod: payload.paymentMethod
        }
      }, { pgClient: client });
      
      await GovAuditService.logAction({
        id: `gov-${Date.now()}-${randomUUID().slice(0, 5)}`,
        timestamp: new Date().toISOString(),
        module: 'FINANCIAL',
        action: 'INVOICE_PAYMENT_RECORDED',
        user_email: payload.userEmail || 'system',
        user_name: payload.userName || 'System',
        ip_address: payload.ip || '127.0.0.1',
        target: id,
        status: 'success',
        metadata: { amount: payload.amount, method: payload.paymentMethod }
      });
      
      await client.query('COMMIT');
      return applySideEffects(newStatus, newBalance);
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  static async getTimeline(tenantId: string, id: string) {
    // Leverage GovAuditService to fetch audit logs for this specific invoice
    return await GovAuditService.getLedger({ search: id });
  }
}
