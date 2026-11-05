"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParentAllocationService = void 0;
const ledger_service_1 = require("./ledger.service");
const school_fund_ownership_1 = require("./school-fund-ownership");
const virtual_account_ownership_1 = require("./virtual-account-ownership");
/**
 * New parent deposits only. Historical USER_WALLET rows are not scanned or rewritten.
 * One invoice identity posts at most one school credit.
 */
class ParentAllocationService {
    static async creditSchoolOnce(params) {
        if (params.historicalBackfill) {
            return { status: 'SKIPPED', reason: 'historical_backfill_forbidden' };
        }
        if (!(0, virtual_account_ownership_1.isSchoolParentWalletPayment)(params.paymentMethod, {
            businessMode: params.businessMode,
            studentId: params.studentId,
        })) {
            return { status: 'SKIPPED', reason: 'not_parent_wallet' };
        }
        const identity = (0, school_fund_ownership_1.allocationIdentity)(String(params.invoiceNumber || params.reference || ''));
        if (!identity)
            return { status: 'SKIPPED', reason: 'missing_identity' };
        const amount = Number(params.amountNaira);
        if (!(amount > 0))
            return { status: 'SKIPPED', reason: 'no_amount' };
        let posted;
        try {
            posted = await ledger_service_1.LedgerService.allocateParentCredit({
                idempotencyKey: (0, virtual_account_ownership_1.newParentAllocationIdempotencyKey)(params.tenantId, identity),
                tenantId: params.tenantId,
                reference: identity,
                amountNaira: amount,
                metadata: {
                    source: 'new_parent_allocation',
                    schoolWalletCredit: true,
                    historicalBackfill: false,
                    actorId: 'SYSTEM_PARENT_ALLOCATION',
                },
            }, params.pgClient ? { pgClient: params.pgClient } : undefined);
        }
        catch (err) {
            if (err?.code === 'INSUFFICIENT_PARENT_LIABILITY' || err?.message === 'insufficient_parent_credit') {
                return { status: 'SKIPPED', reason: 'insufficient_parent_credit' };
            }
            throw err;
        }
        if (posted?.status === 'DE-DUPLICATED') {
            return { status: 'DE-DUPLICATED' };
        }
        return { status: 'CREATED' };
    }
}
exports.ParentAllocationService = ParentAllocationService;
//# sourceMappingURL=parent-allocation.service.js.map