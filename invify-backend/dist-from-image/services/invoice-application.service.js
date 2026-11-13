"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoiceApplicationService = void 0;
const pg_1 = require("../db/pg");
const customer_repository_1 = require("../repositories/customer.repository");
const invoice_repository_1 = require("../repositories/invoice.repository");
const invoice_item_repository_1 = require("../repositories/invoice-item.repository");
const ledger_service_1 = require("./ledger.service");
const parent_allocation_service_1 = require("./parent-allocation.service");
const virtual_account_ownership_1 = require("./virtual-account-ownership");
const collection_confirmation_1 = require("./collection-confirmation");
const supabase_1 = require("../db/supabase");
const stable_uuid_1 = require("../utils/stable-uuid");
class InvoiceApplicationService {
    /**
     * Orchestrates the creation of an offline invoice into a single ACID Postgres transaction.
     * Leverages repositories for DML and delegates accounting logic to LedgerService.
     */
    static async processOfflineInvoice(payload, context, idempotencyKey, correlationId) {
        const invoiceId = (0, stable_uuid_1.toStableUuid)(context.tenantId, 'invoice', String(payload.syncId || payload.id || payload.invoiceNumber || idempotencyKey));
        const customerId = (0, stable_uuid_1.asUuid)(payload.customerId) ||
            (0, stable_uuid_1.asUuid)(payload.studentSyncId) ||
            (0, stable_uuid_1.asUuid)(payload.student_id) ||
            null;
        payload.syncId = invoiceId;
        payload.customerId = customerId;
        if (!process.env.DATABASE_URL) {
            console.log('[InvoiceApplicationService] DATABASE_URL not set. Falling back to Supabase REST client.');
            // 1. Upsert Customer (if provided)
            if (customerId && payload.customerName) {
                const { error } = await supabase_1.supabaseAdmin.from('customers').upsert({
                    id: customerId,
                    tenant_id: context.tenantId,
                    name: payload.customerName,
                    phone: payload.customerPhone || null,
                    address: payload.customerAddress || null,
                    created_at: payload.dateCreated,
                    updated_at: new Date().toISOString()
                });
                if (error)
                    throw new Error(`Customer upsert failed: ${error.message}`);
            }
            const { data: existingRow } = await supabase_1.supabaseAdmin
                .from('invoices')
                .select('id')
                .eq('id', invoiceId)
                .eq('tenant_id', context.tenantId)
                .maybeSingle();
            const alreadyExists = !!existingRow;
            // 2. Upsert Invoice
            const invoiceRow = {
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
            if (payload.customerName)
                invoiceRow.customer_name = payload.customerName;
            if (payload.staffName)
                invoiceRow.staff_name = payload.staffName;
            let { error: invErr } = await supabase_1.supabaseAdmin.from('invoices').upsert(invoiceRow);
            if (invErr && /customer_name|staff_name/.test(invErr.message || '')) {
                delete invoiceRow.customer_name;
                delete invoiceRow.staff_name;
                const retry = await supabase_1.supabaseAdmin.from('invoices').upsert(invoiceRow);
                invErr = retry.error;
            }
            if (invErr)
                throw new Error(`Invoice upsert failed: ${invErr.message}`);
            // 3. Upsert Invoice Items
            if (payload.items && Array.isArray(payload.items)) {
                const itemsToInsert = payload.items
                    .map((item) => {
                    const itemId = (0, stable_uuid_1.asUuid)(item.productSyncId) || (0, stable_uuid_1.asUuid)(item.itemId);
                    if (!itemId)
                        return null;
                    const invoiceItemId = (0, stable_uuid_1.toStableUuid)(context.tenantId, 'invoice_item', String(item.invoiceItemSyncId || item.syncId || `${invoiceId}:${itemId}`));
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
                    const { error: itemsErr } = await supabase_1.supabaseAdmin.from('invoice_items').upsert(itemsToInsert);
                    if (itemsErr) {
                        console.warn('[InvoiceApplicationService] Invoice items skipped:', itemsErr.message);
                    }
                }
            }
            // 4. Double-Entry Accounting (create only — updates must not double-post)
            if (!alreadyExists) {
                try {
                    if ((0, virtual_account_ownership_1.isSchoolParentWalletPayment)(payload.paymentMethod, payload)) {
                        await parent_allocation_service_1.ParentAllocationService.creditSchoolOnce({
                            tenantId: context.tenantId,
                            invoiceNumber: payload.invoiceNumber,
                            reference: payload.syncId,
                            paymentMethod: payload.paymentMethod,
                            amountNaira: Number(payload.amountPaid || 0),
                            historicalBackfill: false,
                            businessMode: payload.businessMode,
                            studentId: payload.studentId,
                        });
                    }
                    else {
                        const entries = [
                            { account: 'USER_WALLET', type: 'DEBIT', amount: payload.totalAmount },
                            { account: 'REVENUE', type: 'CREDIT', amount: payload.totalAmount }
                        ];
                        if (payload.amountPaid && payload.amountPaid > 0) {
                            const confirmation = (0, collection_confirmation_1.classifyCollectionConfirmation)(payload.paymentMethod, {
                                confirmed: payload.confirmed === true,
                                providerReference: payload.providerReference || payload.reference,
                            });
                            if (confirmation !== 'unconfirmed') {
                                entries.push({ account: 'EXTERNAL_BANK', type: 'DEBIT', amount: payload.amountPaid });
                                entries.push({ account: 'USER_WALLET', type: 'CREDIT', amount: payload.amountPaid });
                            }
                        }
                        await ledger_service_1.LedgerService.createDoubleEntry({
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
                    }
                }
                catch (ledgerErr) {
                    // Non-fatal: invoice data is already saved. Ledger reconciliation can be re-run.
                    console.warn('[InvoiceApplicationService] Ledger recording skipped (non-critical):', ledgerErr.message);
                }
            }
            return { alreadyExists, invoiceId };
        }
        const client = await (0, pg_1.getClient)();
        try {
            await client.query('BEGIN');
            // 1. Upsert Customer (if provided)
            if (customerId && payload.customerName) {
                await customer_repository_1.CustomerRepository.upsert(client, {
                    id: customerId,
                    tenantId: context.tenantId,
                    name: payload.customerName,
                    phone: payload.customerPhone,
                    address: payload.customerAddress,
                    createdAt: payload.dateCreated
                });
            }
            const existingPg = await client.query('SELECT 1 FROM invoices WHERE id = $1 AND tenant_id = $2 LIMIT 1', [invoiceId, context.tenantId]);
            const alreadyExists = (existingPg.rowCount || 0) > 0;
            // 2. Upsert Invoice
            await invoice_repository_1.InvoiceRepository.upsert(client, {
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
                    .map((item) => {
                    const itemId = (0, stable_uuid_1.asUuid)(item.productSyncId) || (0, stable_uuid_1.asUuid)(item.itemId);
                    if (!itemId)
                        return null;
                    return {
                        id: (0, stable_uuid_1.toStableUuid)(context.tenantId, 'invoice_item', String(item.invoiceItemSyncId || item.syncId || `${invoiceId}:${itemId}`)),
                        invoiceId,
                        itemId,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        type: item.type
                    };
                })
                    .filter((row) => !!row);
                if (itemsToInsert.length) {
                    try {
                        await invoice_item_repository_1.InvoiceItemRepository.bulkUpsert(client, itemsToInsert);
                    }
                    catch (itemErr) {
                        console.warn('[InvoiceApplicationService] Invoice items skipped:', itemErr?.message || itemErr);
                    }
                }
            }
            // 4. Double-Entry Accounting (create only — updates must not double-post)
            if (!alreadyExists) {
                if ((0, virtual_account_ownership_1.isSchoolParentWalletPayment)(payload.paymentMethod, payload)) {
                    await parent_allocation_service_1.ParentAllocationService.creditSchoolOnce({
                        tenantId: context.tenantId,
                        invoiceNumber: payload.invoiceNumber,
                        reference: payload.syncId,
                        paymentMethod: payload.paymentMethod,
                        amountNaira: Number(payload.amountPaid || 0),
                        historicalBackfill: false,
                        businessMode: payload.businessMode,
                        studentId: payload.studentId,
                        pgClient: client,
                    });
                }
                else {
                    const entries = [
                        { account: 'USER_WALLET', type: 'DEBIT', amount: payload.totalAmount }, // Receivables
                        { account: 'REVENUE', type: 'CREDIT', amount: payload.totalAmount }
                    ];
                    if (payload.amountPaid && payload.amountPaid > 0) {
                        const confirmation = (0, collection_confirmation_1.classifyCollectionConfirmation)(payload.paymentMethod, {
                            confirmed: payload.confirmed === true,
                            providerReference: payload.providerReference || payload.reference,
                        });
                        if (confirmation !== 'unconfirmed') {
                            entries.push({ account: 'EXTERNAL_BANK', type: 'DEBIT', amount: payload.amountPaid });
                            entries.push({ account: 'USER_WALLET', type: 'CREDIT', amount: payload.amountPaid });
                        }
                    }
                    await ledger_service_1.LedgerService.createDoubleEntry({
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
            }
            await client.query('COMMIT');
            return { alreadyExists, invoiceId };
        }
        catch (error) {
            await client.query('ROLLBACK');
            // Keep the invoice visible on web even if PG ledger/FK fails (school cash often has no customer UUID).
            try {
                const fallbackRow = {
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
                    created_at: payload.dateCreated || new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                };
                let { error: fbErr } = await supabase_1.supabaseAdmin.from('invoices').upsert(fallbackRow);
                if (fbErr && /customer/i.test(fbErr.message || '')) {
                    fallbackRow.customer_id = null;
                    const retry = await supabase_1.supabaseAdmin.from('invoices').upsert(fallbackRow);
                    fbErr = retry.error;
                }
                if (!fbErr) {
                    console.warn('[InvoiceApplicationService] PG invoice rolled back; saved via Supabase fallback:', error?.message || error);
                    return { alreadyExists: false, invoiceId, fallback: true };
                }
            }
            catch (fallbackErr) {
                console.error('[InvoiceApplicationService] Supabase invoice fallback failed:', fallbackErr?.message || fallbackErr);
            }
            throw error;
        }
        finally {
            client.release();
        }
    }
}
exports.InvoiceApplicationService = InvoiceApplicationService;
//# sourceMappingURL=invoice-application.service.js.map