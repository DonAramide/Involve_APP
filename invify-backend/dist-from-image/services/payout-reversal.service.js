"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayoutReversalService = void 0;
exports.payoutReversalIdempotencyKey = payoutReversalIdempotencyKey;
exports.isPayoutInitiationKey = isPayoutInitiationKey;
exports.isDefinitiveTransferRejection = isDefinitiveTransferRejection;
const supabase_1 = require("../db/supabase");
const audit_service_1 = require("./audit.service");
const ledger_service_1 = require("./ledger.service");
function payoutReversalIdempotencyKey(tenantId, reference) {
    return `payout-reversal:${tenantId}:${reference}`;
}
/** Initiation ledgers are keyed `payout:{tenant}:{clientKey}` or `payout:{reference}`. */
function isPayoutInitiationKey(idempotencyKey) {
    return idempotencyKey.startsWith('payout:');
}
const NON_DEFINITIVE_HTTP = new Set([408, 409, 423, 425, 429]);
/**
 * True only when the provider definitively rejected the transfer request, so no
 * money can have left. Timeouts, network errors, 5xx and unknown shapes are
 * ambiguous and must wait for the webhook / reconciliation instead.
 */
function isDefinitiveTransferRejection(error) {
    const status = Number(error?.response?.status ?? error?.statusCode ?? error?.status ?? error?.httpStatus ?? error?.responseCode);
    if (Number.isInteger(status) && status >= 400 && status < 500 && !NON_DEFINITIVE_HTTP.has(status)) {
        return true;
    }
    // Quasar validation failures arrive as QuasarApiError with the provider message
    // and sometimes without a numeric HTTP status. No money has left.
    const message = String(error?.message || '');
    // Provider config missing: the transfer was never accepted, so reverse locally.
    if (/PlatformTransferSettings|No metadata for/i.test(message)) {
        return true;
    }
    return /must be an object|should not exist|must be a|validation failed/i.test(message);
}
function isUniqueViolation(error) {
    const message = String(error?.message || error || '');
    return /duplicate key|unique constraint|23505/i.test(message);
}
class PayoutReversalService {
    static async reverseFailedPayout(params) {
        const { tenantId, reference, reason, source } = params;
        const idempotencyKey = payoutReversalIdempotencyKey(tenantId, reference);
        const { data: ledgers, error: ledgerErr } = await supabase_1.supabaseAdmin
            .from('ledgers')
            .select('id, idempotency_key')
            .eq('tenant_id', tenantId)
            .eq('reference', reference);
        if (ledgerErr) {
            throw new Error(`Payout reversal lookup failed for ${reference}: ${ledgerErr.message}`);
        }
        const rows = (ledgers || []);
        const originals = rows.filter((row) => isPayoutInitiationKey(String(row.idempotency_key)));
        const amountKobo = await PayoutReversalService.netWalletDebitKobo(originals.map((row) => row.id));
        if (rows.some((row) => row.idempotency_key === idempotencyKey)) {
            return { status: 'ALREADY_REVERSED', amountKobo, idempotencyKey };
        }
        if (amountKobo <= 0) {
            await PayoutReversalService.audit('payout.reversal_skipped', tenantId, reference, {
                reason,
                source,
                detail: 'NO_ORIGINAL_WALLET_DEBIT',
            });
            return { status: 'NOTHING_TO_REVERSE', amountKobo: 0, idempotencyKey };
        }
        const reverseEntries = await PayoutReversalService.invertOriginalEntries(originals.map((row) => row.id));
        if (!reverseEntries.length) {
            return { status: 'NOTHING_TO_REVERSE', amountKobo: 0, idempotencyKey };
        }
        try {
            const result = await ledger_service_1.LedgerService.createDoubleEntry({
                idempotencyKey,
                tenantId,
                reference,
                entries: reverseEntries,
                actorId: 'SYSTEM_PAYOUT_REVERSAL',
                provider: 'quasar',
                metadata: {
                    type: 'payout_reversal',
                    reason,
                    source,
                    original_ledger_ids: originals.map((row) => row.id),
                },
            });
            if (result?.status === 'DE-DUPLICATED' || result?.data?.status === 'DE-DUPLICATED') {
                return { status: 'ALREADY_REVERSED', amountKobo, idempotencyKey };
            }
        }
        catch (err) {
            if (isUniqueViolation(err) && (await ledger_service_1.LedgerService.exists(idempotencyKey))) {
                return { status: 'ALREADY_REVERSED', amountKobo, idempotencyKey };
            }
            throw err;
        }
        await PayoutReversalService.audit('payout.reversed', tenantId, reference, {
            reason,
            source,
            amount_kobo: amountKobo,
            idempotency_key: idempotencyKey,
        });
        return { status: 'REVERSED', amountKobo, idempotencyKey };
    }
    static async hasReversal(tenantId, reference) {
        return ledger_service_1.LedgerService.exists(payoutReversalIdempotencyKey(tenantId, reference));
    }
    /**
     * RESERVED: initiation debit present and not reversed — success needs no posting.
     * REVERSED_BEFORE_SUCCESS: funds were already restored; a later success means money left twice.
     * NO_ORIGINAL_DEBIT: no initiation ledger — never invent one from a webhook.
     */
    static async settlementState(tenantId, reference) {
        const { data: ledgers, error } = await supabase_1.supabaseAdmin
            .from('ledgers')
            .select('id, idempotency_key')
            .eq('tenant_id', tenantId)
            .eq('reference', reference);
        if (error) {
            throw new Error(`Payout settlement lookup failed for ${reference}: ${error.message}`);
        }
        const rows = (ledgers || []);
        if (rows.some((row) => row.idempotency_key === payoutReversalIdempotencyKey(tenantId, reference))) {
            return 'REVERSED_BEFORE_SUCCESS';
        }
        const originals = rows.filter((row) => isPayoutInitiationKey(String(row.idempotency_key)));
        const debited = await PayoutReversalService.netWalletDebitKobo(originals.map((row) => row.id));
        return debited > 0 ? 'RESERVED' : 'NO_ORIGINAL_DEBIT';
    }
    static async invertOriginalEntries(ledgerIds) {
        if (!ledgerIds.length)
            return [];
        const { data: entries, error } = await supabase_1.supabaseAdmin
            .from('ledger_entries')
            .select('account, type, amount')
            .in('ledger_id', ledgerIds);
        if (error) {
            throw new Error(`Payout reversal entry lookup failed: ${error.message}`);
        }
        const inverted = [];
        for (const entry of (entries || [])) {
            const amount = Number(entry.amount);
            if (!(amount > 0))
                continue;
            inverted.push({
                account: entry.account,
                type: entry.type === 'DEBIT' ? 'CREDIT' : 'DEBIT',
                amount,
            });
        }
        return inverted;
    }
    static async netWalletDebitKobo(ledgerIds) {
        if (!ledgerIds.length)
            return 0;
        const { data: entries, error } = await supabase_1.supabaseAdmin
            .from('ledger_entries')
            .select('account, type, amount')
            .in('ledger_id', ledgerIds);
        if (error) {
            throw new Error(`Payout reversal entry lookup failed: ${error.message}`);
        }
        let net = 0;
        for (const entry of (entries || [])) {
            if (entry.account !== 'USER_WALLET')
                continue;
            const amount = Number(entry.amount);
            if (entry.type === 'DEBIT')
                net += amount;
            else if (entry.type === 'CREDIT')
                net -= amount;
        }
        return net;
    }
    static async audit(eventType, tenantId, reference, payload) {
        try {
            await audit_service_1.AuditService.log({ eventType: eventType, reference, tenantId, payload });
        }
        catch (err) {
            console.error(`[PayoutReversal] audit ${eventType} failed for ${reference}:`, err?.message || err);
        }
    }
}
exports.PayoutReversalService = PayoutReversalService;
//# sourceMappingURL=payout-reversal.service.js.map