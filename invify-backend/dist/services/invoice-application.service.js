"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoiceApplicationService = void 0;
const pg_1 = require("../db/pg");
const customer_repository_1 = require("../repositories/customer.repository");
const invoice_repository_1 = require("../repositories/invoice.repository");
const invoice_item_repository_1 = require("../repositories/invoice-item.repository");
const ledger_service_1 = require("./ledger.service");
class InvoiceApplicationService {
    /**
     * Orchestrates the creation of an offline invoice into a single ACID Postgres transaction.
     * Leverages repositories for DML and delegates accounting logic to LedgerService.
     */
    static async processOfflineInvoice(payload, context, idempotencyKey, correlationId) {
        const client = await (0, pg_1.getClient)();
        try {
            await client.query('BEGIN');
            // 1. Upsert Customer (if provided)
            if (payload.customerId && payload.customerName) {
                await customer_repository_1.CustomerRepository.upsert(client, {
                    id: payload.customerId,
                    tenantId: context.tenantId,
                    name: payload.customerName,
                    phone: payload.customerPhone,
                    address: payload.customerAddress,
                    createdAt: payload.dateCreated
                });
            }
            // 2. Upsert Invoice
            await invoice_repository_1.InvoiceRepository.upsert(client, {
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
                const itemsToInsert = payload.items.map((item) => {
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
                await invoice_item_repository_1.InvoiceItemRepository.bulkUpsert(client, itemsToInsert);
            }
            // 4. Double-Entry Accounting
            const entries = [
                { account: 'USER_WALLET', type: 'DEBIT', amount: payload.totalAmount }, // Receivables
                { account: 'REVENUE', type: 'CREDIT', amount: payload.totalAmount }
            ];
            if (payload.amountPaid && payload.amountPaid > 0) {
                entries.push({ account: 'EXTERNAL_BANK', type: 'DEBIT', amount: payload.amountPaid }); // Cash/Bank
                entries.push({ account: 'USER_WALLET', type: 'CREDIT', amount: payload.amountPaid }); // Receivables reduced
            }
            await ledger_service_1.LedgerService.createDoubleEntry({
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
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
}
exports.InvoiceApplicationService = InvoiceApplicationService;
//# sourceMappingURL=invoice-application.service.js.map