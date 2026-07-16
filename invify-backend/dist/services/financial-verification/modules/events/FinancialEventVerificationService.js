"use strict";
// src/services/financial-verification/modules/events/FinancialEventVerificationService.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancialEventVerificationService = void 0;
const supabase_1 = require("../../../../db/supabase");
class FinancialEventVerificationService {
    moduleId = 'financial_event_verification';
    domain = 'Banking';
    priority = 50;
    mandatory = true;
    version = '1.0.0';
    capabilities = ['event.exists'];
    async verify(context) {
        try {
            if (!context.financialEventId) {
                return {
                    passed: false,
                    error: 'Financial Event ID is missing from verification context.'
                };
            }
            const { value: event, hit } = await context.getCached(`event_${context.financialEventId}`, async () => {
                const { data, error } = await supabase_1.supabaseAdmin
                    .from('financial_events')
                    .select('*')
                    .eq('id', context.financialEventId)
                    .maybeSingle();
                if (error)
                    throw new Error(error.message);
                return data;
            });
            if (!event) {
                return {
                    passed: false,
                    error: `Financial event not found for ID: ${context.financialEventId}`,
                    metrics: { dbQueries: hit ? 0 : 1, cacheHits: hit ? 1 : 0 }
                };
            }
            if (event.tenant_id !== context.tenantId) {
                return {
                    passed: false,
                    error: `Event tenant ownership mismatch. Event tenant: ${event.tenant_id}, Context tenant: ${context.tenantId}`,
                    metrics: { dbQueries: hit ? 0 : 1, cacheHits: hit ? 1 : 0 }
                };
            }
            // Allow initialized/pending state, reject invalid/orphaned states
            if (event.state === 'CANCELLED' || event.state === 'REJECTED') {
                return {
                    passed: false,
                    error: `Financial event state is in invalid/terminal rejected state: ${event.state}`,
                    metrics: { dbQueries: hit ? 0 : 1, cacheHits: hit ? 1 : 0 }
                };
            }
            return {
                passed: true,
                metrics: { dbQueries: hit ? 0 : 1, cacheHits: hit ? 1 : 0 }
            };
        }
        catch (err) {
            return {
                passed: false,
                error: `Financial event verification exception: ${err.message}`
            };
        }
    }
}
exports.FinancialEventVerificationService = FinancialEventVerificationService;
//# sourceMappingURL=FinancialEventVerificationService.js.map