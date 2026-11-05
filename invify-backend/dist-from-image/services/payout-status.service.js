"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayoutStatusService = void 0;
exports.normalizeQuasarTransferStatus = normalizeQuasarTransferStatus;
exports.invifyStatusFromQuasar = invifyStatusFromQuasar;
exports.resolveTransferOutcome = resolveTransferOutcome;
const supabase_1 = require("../db/supabase");
const factory_1 = require("../integrations/quasar/factory");
const audit_service_1 = require("./audit.service");
const event_service_1 = require("./event.service");
const notification_service_1 = require("./notification.service");
const payout_reversal_service_1 = require("./payout-reversal.service");
const virtual_account_funds_1 = require("../utils/virtual-account-funds");
const OPEN_STATUSES = ['PENDING', 'PROCESSING'];
const TERMINAL = new Set(['SUCCESS', 'FAILED']);
function normalizeQuasarTransferStatus(raw) {
    const value = String(raw || '')
        .trim()
        .toUpperCase()
        .replace(/[\s-]+/g, '_');
    if (value === 'AWAITING_APPROVAL' ||
        value === 'PENDING' ||
        value === 'PROCESSING' ||
        value === 'SUCCESS' ||
        value === 'FAILED' ||
        value === 'REJECTED') {
        return value;
    }
    return 'UNKNOWN';
}
/** Map Quasar create/GET status onto Invify transactions_log.status. Never marks paid on open states. */
function invifyStatusFromQuasar(status) {
    switch (status) {
        case 'AWAITING_APPROVAL':
        case 'PENDING':
            return 'PENDING';
        case 'PROCESSING':
            return 'PROCESSING';
        case 'SUCCESS':
            return 'SUCCESS';
        case 'FAILED':
        case 'REJECTED':
            return 'FAILED';
        default:
            return null;
    }
}
/** Outcome from webhook event name and/or data.status. */
function resolveTransferOutcome(params) {
    const event = String(params.event || '')
        .trim()
        .toLowerCase();
    if (event === 'transfer.success')
        return 'success';
    if (event === 'transfer.failed')
        return 'failed';
    const status = normalizeQuasarTransferStatus(params.status);
    if (status === 'SUCCESS')
        return 'success';
    if (status === 'FAILED' || status === 'REJECTED')
        return 'failed';
    if (status === 'AWAITING_APPROVAL' || status === 'PENDING' || status === 'PROCESSING') {
        return 'open';
    }
    return 'ignore';
}
/**
 * Applies a Quasar transfer terminal/open outcome to an Invify payout row.
 * Idempotent once the payout is already SUCCESS or FAILED, and on repeated envelope.id.
 */
class PayoutStatusService {
    /** True when this Quasar delivery id was already applied to a payout row. */
    static async envelopeAlreadyProcessed(envelopeId) {
        const id = String(envelopeId || '').trim();
        if (!id)
            return false;
        const { data, error } = await supabase_1.supabaseAdmin
            .from('transactions_log')
            .select('id')
            .eq('type', 'payout')
            .filter('metadata->>last_webhook_envelope_id', 'eq', id)
            .limit(1);
        if (error) {
            console.warn('[PayoutStatus] envelope lookup failed:', error.message);
            return false;
        }
        return Boolean(data?.length);
    }
    static async applyOutcome(params) {
        const reference = String(params.reference || '').trim();
        if (!reference)
            return { applied: false, status: 'MISSING_REFERENCE' };
        const { data: row, error } = await supabase_1.supabaseAdmin
            .from('transactions_log')
            .select('id, tenant_id, wallet_id, amount, status, type, metadata')
            .eq('reference', reference)
            .eq('type', 'payout')
            .maybeSingle();
        if (error)
            throw new Error(error.message);
        if (!row)
            return { applied: false, status: 'NOT_FOUND', note: 'payout_row_missing' };
        const prior = String(row.status || '').toUpperCase();
        if (TERMINAL.has(prior)) {
            return { applied: false, status: prior, note: 'already_terminal' };
        }
        if (params.outcome === 'open') {
            const next = params.openStatus ||
                invifyStatusFromQuasar(normalizeQuasarTransferStatus(params.quasarStatus)) ||
                'PENDING';
            if (next === 'SUCCESS' || next === 'FAILED') {
                return { applied: false, status: prior, note: 'open_outcome_invalid' };
            }
            if (prior === next)
                return { applied: false, status: prior, note: 'unchanged' };
            const meta = {
                ...(row.metadata || {}),
                quasar_status: normalizeQuasarTransferStatus(params.quasarStatus),
                status_source: params.source,
                ...(params.envelopeId ? { last_webhook_envelope_id: params.envelopeId } : {}),
            };
            await supabase_1.supabaseAdmin
                .from('transactions_log')
                .update({ status: next, metadata: meta, processed_at: new Date().toISOString() })
                .eq('id', row.id);
            return { applied: true, status: next };
        }
        if (params.outcome === 'success') {
            return PayoutStatusService.markSuccess({
                row,
                prior,
                source: params.source,
                quasarStatus: params.quasarStatus,
                envelopeId: params.envelopeId,
                amount: params.amount,
            });
        }
        return PayoutStatusService.markFailed({
            row,
            prior,
            source: params.source,
            quasarStatus: params.quasarStatus,
            reason: params.reason,
            envelopeId: params.envelopeId,
            amount: params.amount,
        });
    }
    static async markSuccess(params) {
        const { row, prior, source } = params;
        const tenantId = row.tenant_id;
        const reference = row.reference || '';
        const amount = (0, virtual_account_funds_1.roundNaira)(Number(params.amount ?? row.amount) || 0);
        const verdict = await payout_reversal_service_1.PayoutReversalService.settlementState(tenantId, reference);
        if (verdict !== 'RESERVED') {
            await audit_service_1.AuditService.log({
                eventType: 'payout.reconciliation_required',
                reference,
                tenantId,
                payload: { reason: verdict, webhook_status: 'success', amount, source },
            });
            return { applied: false, status: prior, note: `reconciliation:${verdict}` };
        }
        const meta = {
            ...(row.metadata || {}),
            quasar_status: 'SUCCESS',
            status_source: source,
            ...(params.envelopeId ? { last_webhook_envelope_id: params.envelopeId } : {}),
        };
        await supabase_1.supabaseAdmin
            .from('transactions_log')
            .update({ status: 'SUCCESS', metadata: meta, processed_at: new Date().toISOString() })
            .eq('id', row.id);
        await event_service_1.FinancialEventService.emit({
            type: 'payout.success',
            reference,
            tenantId,
            walletId: row.wallet_id,
            amount,
            metadata: meta,
            idempotencyKey: `event:payout_success:${reference}`,
        });
        await notification_service_1.NotificationService.notifySchoolAdminOfPayoutSuccess(tenantId, amount);
        await audit_service_1.AuditService.log({
            eventType: 'payout.success',
            reference,
            tenantId,
            payload: { amount, source, prior },
        });
        try {
            const { io } = require('../app');
            if (io) {
                io.to(`tenant:${tenantId}`).emit('payment.success', {
                    type: 'payout.success',
                    reference,
                    tenantId,
                    walletId: row.wallet_id,
                    amount,
                    metadata: meta,
                });
            }
        }
        catch (e) {
            console.error('[PayoutStatus] socket emit failed:', e?.message || e);
        }
        return { applied: true, status: 'SUCCESS' };
    }
    static async markFailed(params) {
        const { row, prior, source } = params;
        const tenantId = row.tenant_id;
        const reference = String(row.reference || '');
        const amount = (0, virtual_account_funds_1.roundNaira)(Number(params.amount ?? row.amount) || 0);
        const reason = String(params.reason || params.quasarStatus || 'transfer.failed').trim();
        const quasarStatus = normalizeQuasarTransferStatus(params.quasarStatus || 'FAILED');
        if (prior === 'SUCCESS') {
            await audit_service_1.AuditService.log({
                eventType: 'payout.reconciliation_required',
                reference,
                tenantId,
                payload: { reason: 'FAILED_AFTER_SUCCESS', source, detail: reason },
            });
            return { applied: false, status: 'SUCCESS', note: 'failed_after_success' };
        }
        await payout_reversal_service_1.PayoutReversalService.reverseFailedPayout({
            tenantId,
            reference,
            reason,
            source: source === 'POLL' ? 'POLL_PAYOUT_FAILED' : 'WEBHOOK_PAYOUT_FAILED',
        });
        const meta = {
            ...(row.metadata || {}),
            quasar_status: quasarStatus,
            status_source: source,
            transfer_error: reason,
            failure_reason: reason,
            ...(params.envelopeId ? { last_webhook_envelope_id: params.envelopeId } : {}),
        };
        if (prior !== 'FAILED') {
            await supabase_1.supabaseAdmin
                .from('transactions_log')
                .update({ status: 'FAILED', metadata: meta, processed_at: new Date().toISOString() })
                .eq('id', row.id);
            await event_service_1.FinancialEventService.emit({
                type: 'payout.failed',
                reference,
                tenantId,
                walletId: row.wallet_id,
                amount,
                metadata: meta,
                idempotencyKey: `event:payout_failed:${reference}`,
            });
            await notification_service_1.NotificationService.notifySchoolAdminOfPayoutFailure(tenantId, amount);
            await audit_service_1.AuditService.log({
                eventType: 'payout.failed',
                reference,
                tenantId,
                payload: { amount, source, reason, quasarStatus },
            });
        }
        else {
            await supabase_1.supabaseAdmin
                .from('transactions_log')
                .update({ metadata: meta, processed_at: new Date().toISOString() })
                .eq('id', row.id);
        }
        return { applied: prior !== 'FAILED', status: 'FAILED' };
    }
    /** GET Quasar /transfers/{reference} and apply the same state machine. */
    static async pollOne(tenantId, reference) {
        const quasar = await (0, factory_1.getQuasarService)(tenantId);
        const transfer = await quasar.getTransfer(reference);
        const quasarStatus = normalizeQuasarTransferStatus(transfer?.status || transfer?.data?.status);
        const outcome = resolveTransferOutcome({ status: quasarStatus });
        if (outcome === 'ignore') {
            return { applied: false, status: quasarStatus, note: 'unknown_remote_status' };
        }
        return PayoutStatusService.applyOutcome({
            tenantId,
            reference,
            outcome: outcome === 'open' ? 'open' : outcome,
            quasarStatus,
            reason: transfer?.reason || transfer?.failureReason || null,
            amount: transfer?.amount,
            source: 'POLL',
            openStatus: invifyStatusFromQuasar(quasarStatus) || undefined,
        });
    }
    /** Poll a batch of open payouts. Safe to run in production (read + local status only). */
    static async pollOpenPayouts(limit = 40) {
        const { data, error } = await supabase_1.supabaseAdmin
            .from('transactions_log')
            .select('id, tenant_id, reference, status, created_at')
            .eq('type', 'payout')
            .eq('provider', 'quasar')
            .in('status', [...OPEN_STATUSES])
            .order('created_at', { ascending: true })
            .limit(Math.min(Math.max(limit, 1), 100));
        if (error) {
            console.error('[PayoutStatus] poll query failed:', error.message);
            return { checked: 0, applied: 0 };
        }
        let applied = 0;
        for (const row of data || []) {
            const tenantId = String(row.tenant_id || '');
            const reference = String(row.reference || '');
            if (!tenantId || !reference)
                continue;
            try {
                const result = await PayoutStatusService.pollOne(tenantId, reference);
                if (result.applied)
                    applied += 1;
            }
            catch (err) {
                console.warn(`[PayoutStatus] poll ${reference.slice(-6)} failed:`, String(err?.message || err).slice(0, 160));
            }
        }
        return { checked: (data || []).length, applied };
    }
    static async pollTenantOpenPayouts(tenantId, limit = 20) {
        const { data, error } = await supabase_1.supabaseAdmin
            .from('transactions_log')
            .select('reference')
            .eq('tenant_id', tenantId)
            .eq('type', 'payout')
            .eq('provider', 'quasar')
            .in('status', [...OPEN_STATUSES])
            .order('created_at', { ascending: true })
            .limit(Math.min(Math.max(limit, 1), 50));
        if (error)
            return { checked: 0, applied: 0 };
        let applied = 0;
        for (const row of data || []) {
            try {
                const result = await PayoutStatusService.pollOne(tenantId, String(row.reference));
                if (result.applied)
                    applied += 1;
            }
            catch (err) {
                console.warn('[PayoutStatus] tenant poll failed:', String(err?.message || err).slice(0, 120));
            }
        }
        return { checked: (data || []).length, applied };
    }
}
exports.PayoutStatusService = PayoutStatusService;
//# sourceMappingURL=payout-status.service.js.map