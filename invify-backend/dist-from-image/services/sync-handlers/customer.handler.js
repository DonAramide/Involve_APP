"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerCreatedHandler = void 0;
const supabase_1 = require("../../db/supabase");
class CustomerCreatedHandler {
    async handle(event, context) {
        const payload = event.payload;
        const { error } = await supabase_1.supabase.from('customers').upsert({
            id: payload.syncId || event.aggregateId,
            tenant_id: context.tenantId,
            name: payload.name,
            phone: payload.phone || null,
            address: payload.address || null,
            balance: payload.balance || 0,
            created_at: payload.createdAt || event.createdAt,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'id, tenant_id' });
        if (error) {
            throw new Error(`Customer upsert failed: ${error.message}`);
        }
    }
}
exports.CustomerCreatedHandler = CustomerCreatedHandler;
//# sourceMappingURL=customer.handler.js.map