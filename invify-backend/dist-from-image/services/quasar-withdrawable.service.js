"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuasarWithdrawableService = void 0;
exports.withTenantWithdrawLock = withTenantWithdrawLock;
const supabase_1 = require("../db/supabase");
const school_fund_ownership_1 = require("./school-fund-ownership");
const locks = new Map();
function withTenantWithdrawLock(tenantId, task) {
    const previous = locks.get(tenantId) ?? Promise.resolve();
    const run = previous.catch(() => undefined).then(task);
    locks.set(tenantId, run.then(() => undefined, () => undefined));
    return run;
}
function roundNaira(value) {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}
/**
 * Shared card + spent virtual-account pool.
 * Devices upload the settleable slices. Pending and successful payouts reduce it
 * so two devices cannot each take the full amount.
 */
class QuasarWithdrawableService {
    static async sync(tenantId, credits) {
        const rows = (credits || [])
            .map((credit) => {
            const reference = String(credit.reference || credit.localInvoiceNumber || '').trim();
            const amount = roundNaira(Number(credit.amount || 0));
            if (!reference || !(amount > 0))
                return null;
            const rail = String(credit.rail || 'va').toLowerCase() === 'card' ? 'card' : 'va';
            return {
                tenant_id: tenantId,
                local_invoice_number: `qwd:${reference}`,
                amount,
                payment_method: rail === 'card' ? 'Card' : 'VirtualAccount',
                payment_status: 'Paid',
                metadata: { quasarSettleable: true, rail },
                paid_at: credit.paidAt || credit.at || new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
        })
            .filter(Boolean);
        if (rows.length) {
            const { error } = await supabase_1.supabaseAdmin
                .from('school_payment_events')
                .upsert(rows, { onConflict: 'tenant_id,local_invoice_number' });
            if (error)
                throw new Error(error.message);
        }
        const available = await this.available(tenantId);
        await this.publish(tenantId, available);
        return available;
    }
    static async available(tenantId) {
        const [{ data: credits }, { data: payouts }] = await Promise.all([
            supabase_1.supabaseAdmin
                .from('school_payment_events')
                .select('amount, metadata, payment_status, local_invoice_number')
                .eq('tenant_id', tenantId)
                .eq('metadata->>quasarSettleable', 'true')
                .limit(5000),
            supabase_1.supabaseAdmin
                .from('transactions_log')
                .select('amount, status, type')
                .eq('tenant_id', tenantId)
                .eq('type', 'payout')
                .in('status', ['PENDING', 'SUCCESS', 'PROCESSING'])
                .eq('metadata->>quasarCap', 'true')
                .limit(5000),
        ]);
        let gross = 0;
        const seen = new Set();
        for (const row of credits || []) {
            const meta = row.metadata || {};
            if (meta.quasarSettleable !== true)
                continue;
            if (String(row.payment_status || '').toLowerCase() === 'pending')
                continue;
            const identity = (0, school_fund_ownership_1.allocationIdentity)(String(row.local_invoice_number || ''));
            if (!identity || seen.has(identity))
                continue;
            seen.add(identity);
            gross += Number(row.amount || 0);
        }
        let reserved = 0;
        for (const row of payouts || []) {
            reserved += Number(row.amount || 0);
        }
        return roundNaira(Math.max(0, gross - reserved));
    }
    static async publish(tenantId, available) {
        try {
            const { io } = await Promise.resolve().then(() => __importStar(require('../app')));
            io.to(`tenant:${tenantId}`).emit('withdrawable_updated', {
                tenantId,
                available,
            });
        }
        catch (err) {
            console.warn('[QuasarWithdrawable] socket publish skipped:', err?.message || err);
        }
    }
}
exports.QuasarWithdrawableService = QuasarWithdrawableService;
//# sourceMappingURL=quasar-withdrawable.service.js.map