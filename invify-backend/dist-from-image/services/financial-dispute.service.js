"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancialDisputeService = void 0;
const crypto_1 = require("crypto");
const supabase_1 = require("../db/supabase");
const quasar_integration_store_1 = require("../integrations/quasar/quasar-integration.store");
const quasar_provisioning_service_1 = require("../integrations/quasar/quasar-provisioning.service");
const audit_service_1 = require("./audit.service");
const gov_audit_service_1 = require("./gov-audit.service");
const ledger_service_1 = require("./ledger.service");
const financial_dispute_policy_1 = require("./financial-dispute.policy");
function httpError(message, status) {
    const err = new financial_dispute_policy_1.DisputePolicyError(message, status);
    throw err;
}
class FinancialDisputeService {
    static async create(input, actor) {
        if (!actor?.id || !actor?.email) {
            httpError('Authenticated operator identity is required.', 401);
        }
        const tenantId = String(input.tenantId || '').trim();
        if (!tenantId)
            httpError('tenantId is required.', 400);
        const caseType = (0, financial_dispute_policy_1.parseCaseType)(input.caseType);
        const amountKobo = (0, financial_dispute_policy_1.parseAmountKobo)(input);
        const reason = String(input.reason || '').trim();
        if (reason.length < 8) {
            httpError('reason must be at least 8 characters (audit requirement).', 400);
        }
        const { data: tenant, error: tenantErr } = await supabase_1.supabaseAdmin
            .from('tenants')
            .select('id, name')
            .eq('id', tenantId)
            .maybeSingle();
        if (tenantErr)
            throw tenantErr;
        if (!tenant)
            httpError('Tenant not found.', 404);
        const idempotencyKey = String(input.idempotencyKey || '').trim() ||
            `dispute-create:${tenantId}:${caseType}:${amountKobo}:${reason.slice(0, 40)}:${new Date().toISOString().slice(0, 10)}:${actor.id}`;
        const { data: existing } = await supabase_1.supabaseAdmin
            .from('financial_disputes')
            .select('*')
            .eq('idempotency_key', idempotencyKey)
            .maybeSingle();
        if (existing) {
            return { ...existing, idempotentReplay: true };
        }
        const row = {
            tenant_id: tenantId,
            tenant_name: input.tenantName || tenant.name,
            case_type: caseType,
            status: 'PENDING_CHECKER',
            amount_kobo: amountKobo,
            currency: (input.currency || 'NGN').toUpperCase(),
            reason,
            original_payment_reference: String(input.originalPaymentReference || '').trim() || null,
            maker_id: actor.id,
            maker_email: actor.email,
            idempotency_key: idempotencyKey,
            metadata: {
                created_by: { id: actor.id, email: actor.email, name: actor.name || null },
            },
        };
        const { data, error } = await supabase_1.supabaseAdmin
            .from('financial_disputes')
            .insert(row)
            .select()
            .single();
        if (error) {
            if (String(error.message || '').toLowerCase().includes('duplicate')) {
                const { data: replay } = await supabase_1.supabaseAdmin
                    .from('financial_disputes')
                    .select('*')
                    .eq('idempotency_key', idempotencyKey)
                    .maybeSingle();
                if (replay)
                    return { ...replay, idempotentReplay: true };
            }
            httpError(error.message.includes('financial_disputes')
                ? `Failed to create case: ${error.message}. Apply migration 023_financial_disputes.sql.`
                : `Failed to create case: ${error.message}`, 500);
        }
        await this.recordEvent({
            caseId: data.id,
            eventType: 'CASE_CREATED',
            actor,
            fromStatus: null,
            toStatus: 'PENDING_CHECKER',
            payload: {
                case_type: caseType,
                amount_kobo: amountKobo,
                reason,
                original_payment_reference: row.original_payment_reference,
            },
        });
        return data;
    }
    static async list(filters) {
        let query = supabase_1.supabaseAdmin
            .from('financial_disputes')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(Math.min(200, Math.max(1, filters.limit || 50)));
        if (filters.status && filters.status !== 'ALL') {
            query = query.eq('status', String(filters.status).toUpperCase());
        }
        if (filters.tenantId) {
            query = query.eq('tenant_id', filters.tenantId);
        }
        const { data, error } = await query;
        if (error) {
            httpError(error.message.includes('does not exist') || error.code === '42P01'
                ? 'financial_disputes table is missing. Apply migration 023_financial_disputes.sql.'
                : error.message, 500);
        }
        return data || [];
    }
    static async getById(id) {
        const { data, error } = await supabase_1.supabaseAdmin
            .from('financial_disputes')
            .select('*')
            .eq('id', id)
            .maybeSingle();
        if (error)
            throw error;
        if (!data)
            httpError('Dispute case not found.', 404);
        return data;
    }
    static async listEvents(caseId) {
        await this.getById(caseId);
        const { data, error } = await supabase_1.supabaseAdmin
            .from('financial_dispute_events')
            .select('*')
            .eq('case_id', caseId)
            .order('created_at', { ascending: true });
        if (error)
            throw error;
        return data || [];
    }
    static async reject(caseId, actor, reason) {
        const row = await this.getById(caseId);
        if (row.status !== 'PENDING_CHECKER') {
            httpError(`Case cannot be rejected from status ${row.status}.`, 409);
        }
        (0, financial_dispute_policy_1.assertCheckerIsNotMaker)({
            makerId: row.maker_id,
            makerEmail: row.maker_email,
            checkerId: actor.id,
            checkerEmail: actor.email,
        });
        const rejectedReason = String(reason || '').trim();
        if (rejectedReason.length < 4) {
            httpError('Rejection reason is required.', 400);
        }
        const { data, error } = await supabase_1.supabaseAdmin
            .from('financial_disputes')
            .update({
            status: 'REJECTED',
            checker_id: actor.id,
            checker_email: actor.email,
            rejected_reason: rejectedReason,
            rejected_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
            .eq('id', caseId)
            .eq('status', 'PENDING_CHECKER')
            .select()
            .maybeSingle();
        if (error)
            throw error;
        if (!data)
            httpError('Case was already actioned by another checker.', 409);
        await this.recordEvent({
            caseId,
            eventType: 'CASE_REJECTED',
            actor,
            fromStatus: 'PENDING_CHECKER',
            toStatus: 'REJECTED',
            payload: { rejected_reason: rejectedReason },
            auditStatus: 'rejected',
        });
        return data;
    }
    static async approve(caseId, actor, comment) {
        const row = await this.getById(caseId);
        if (row.status === 'POSTED')
            return row;
        if (row.status === 'APPROVED_EXECUTING') {
            return this.finalizeFromQuasar(row, actor);
        }
        if (row.status !== 'PENDING_CHECKER' && row.status !== 'FAILED') {
            httpError(`Case cannot be approved from status ${row.status}.`, 409);
        }
        (0, financial_dispute_policy_1.assertCheckerIsNotMaker)({
            makerId: row.maker_id,
            makerEmail: row.maker_email,
            checkerId: actor.id,
            checkerEmail: actor.email,
        });
        const lockFrom = row.status === 'FAILED' ? 'FAILED' : 'PENDING_CHECKER';
        const { data: locked, error: lockErr } = await supabase_1.supabaseAdmin
            .from('financial_disputes')
            .update({
            status: 'APPROVED_EXECUTING',
            checker_id: actor.id,
            checker_email: actor.email,
            checker_comment: String(comment || '').trim() || null,
            failure_message: null,
            updated_at: new Date().toISOString(),
        })
            .eq('id', caseId)
            .eq('status', lockFrom)
            .select()
            .maybeSingle();
        if (lockErr)
            throw lockErr;
        if (!locked)
            httpError('Case was already actioned by another checker.', 409);
        await this.recordEvent({
            caseId,
            eventType: 'CASE_APPROVED',
            actor,
            fromStatus: lockFrom,
            toStatus: 'APPROVED_EXECUTING',
            payload: { checker_comment: comment || null },
            auditStatus: 'approved',
        });
        return this.executeQuasarDebit(locked, actor);
    }
    /**
     * Quasar webhook: dispute.debit.posted | dispute.debit.failed | dispute.debit.reversed
     * Completes cases left in APPROVED_EXECUTING after a timeout. Idempotent if already POSTED.
     */
    static async applyQuasarWebhook(event) {
        const data = event?.data || {};
        const caseId = data.invifyCaseId || data.invify_case_id || data.metadata?.invifyCaseId;
        if (!caseId)
            return { ignored: true, reason: 'missing_invify_case_id' };
        const row = await this.getById(String(caseId));
        const eventName = String(event?.event || '').toLowerCase();
        const actor = {
            id: 'quasar-webhook',
            email: 'quasar-webhook@invify.org',
            name: 'Quasar webhook',
            ip: '127.0.0.1',
        };
        if (eventName.endsWith('.posted') || eventName.endsWith('.success')) {
            if (row.status === 'POSTED')
                return { ...row, idempotentReplay: true };
            return this.completePosted(row, actor, {
                quasarDebitId: data.id || data.debitId || row.quasar_debit_id,
                quasarStatus: data.status || 'POSTED',
                providerPayload: data,
                source: 'webhook',
            });
        }
        if (eventName.endsWith('.failed')) {
            if (row.status === 'POSTED')
                return { ...row, ignored: true, reason: 'already_posted' };
            return this.markFailed(row, actor, data.message || data.error || 'Quasar debit failed', data);
        }
        return { ignored: true, reason: `unhandled_event:${eventName}` };
    }
    static async executeQuasarDebit(row, actor) {
        let providerResult;
        try {
            const paymentsClient = await quasar_provisioning_service_1.QuasarProvisioningService.getPaymentsClient(row.tenant_id);
            const integration = await quasar_integration_store_1.QuasarIntegrationStore.getByInvifyTenantId(row.tenant_id);
            const idempotencyKey = `dispute-debit:${row.id}`;
            if (row.case_type === 'REFUND' && row.original_payment_reference) {
                providerResult = await paymentsClient.createIntentRefund(row.original_payment_reference, { amount: row.amount_kobo, reason: row.reason }, { idempotencyKey });
            }
            else {
                providerResult = await paymentsClient.createDisputeDebit({
                    invifyTenantId: row.tenant_id,
                    quasarTenantId: integration?.quasar_tenant_id,
                    invifyCaseId: row.id,
                    amount: row.amount_kobo,
                    currency: row.currency || 'NGN',
                    type: row.case_type,
                    reason: row.reason,
                    originalPaymentReference: row.original_payment_reference || undefined,
                    makerEmail: row.maker_email,
                    checkerEmail: actor.email,
                    metadata: {
                        makerId: row.maker_id,
                        checkerId: actor.id,
                        tenantName: row.tenant_name,
                    },
                }, { idempotencyKey });
            }
        }
        catch (err) {
            if ((0, financial_dispute_policy_1.isTransientQuasarError)(err)) {
                await this.recordEvent({
                    caseId: row.id,
                    eventType: 'QUASAR_TIMEOUT',
                    actor,
                    fromStatus: 'APPROVED_EXECUTING',
                    toStatus: 'APPROVED_EXECUTING',
                    payload: { error: err.message },
                    auditStatus: 'pending',
                });
                return {
                    ...row,
                    waitingQuasar: true,
                    message: 'Quasar did not confirm in time. Case stays APPROVED_EXECUTING until webhook or retry.',
                };
            }
            return this.markFailed(row, actor, err.message || 'Quasar debit failed', {
                responseCode: err.responseCode,
            });
        }
        const quasarDebitId = providerResult?.id || providerResult?.debitId || providerResult?.reference || null;
        const quasarStatus = providerResult?.status || 'ACCEPTED';
        // Persist Quasar ids before ledger so a ledger failure can still be finalized later.
        if (quasarDebitId) {
            const { data: saved } = await supabase_1.supabaseAdmin
                .from('financial_disputes')
                .update({
                quasar_debit_id: quasarDebitId,
                quasar_status: quasarStatus,
                updated_at: new Date().toISOString(),
                metadata: {
                    ...(row.metadata || {}),
                    provider: providerResult || null,
                },
            })
                .eq('id', row.id)
                .eq('status', 'APPROVED_EXECUTING')
                .select()
                .maybeSingle();
            if (saved)
                row = saved;
        }
        try {
            return await this.completePosted(row, actor, {
                quasarDebitId,
                quasarStatus,
                providerPayload: providerResult,
                source: 'sync',
            });
        }
        catch (ledgerErr) {
            console.error('[FinancialDispute] ledger post after Quasar failed:', ledgerErr?.message || ledgerErr);
            await this.recordEvent({
                caseId: row.id,
                eventType: 'LEDGER_POST_FAILED',
                actor,
                fromStatus: 'APPROVED_EXECUTING',
                toStatus: 'APPROVED_EXECUTING',
                payload: { error: ledgerErr?.message || String(ledgerErr), quasarDebitId },
                auditStatus: 'pending',
            });
            await supabase_1.supabaseAdmin
                .from('financial_disputes')
                .update({
                failure_message: `Quasar accepted debit; local ledger pending: ${ledgerErr?.message || 'unknown'}`,
                updated_at: new Date().toISOString(),
            })
                .eq('id', row.id)
                .eq('status', 'APPROVED_EXECUTING');
            const err = new financial_dispute_policy_1.DisputePolicyError(`Quasar debit accepted but local ledger was not posted: ${ledgerErr?.message || 'ledger failure'}. Retry approve to finalize.`, 502);
            err.case = { ...row, quasar_debit_id: quasarDebitId, waitingLedger: true };
            throw err;
        }
    }
    static async finalizeFromQuasar(row, actor) {
        try {
            if (!row.quasar_debit_id) {
                return this.executeQuasarDebit(row, actor);
            }
            const paymentsClient = await quasar_provisioning_service_1.QuasarProvisioningService.getPaymentsClient(row.tenant_id);
            const remote = await paymentsClient.getDisputeDebit(row.quasar_debit_id);
            const status = String(remote?.status || '').toUpperCase();
            if (status === 'POSTED' || status === 'SUCCESS' || status === 'COMPLETED') {
                return this.completePosted(row, actor, {
                    quasarDebitId: remote.id || row.quasar_debit_id,
                    quasarStatus: remote.status,
                    providerPayload: remote,
                    source: 'poll',
                });
            }
            if (status === 'FAILED' || status === 'DECLINED') {
                return this.markFailed(row, actor, remote?.message || 'Quasar debit failed', remote);
            }
            return row;
        }
        catch (err) {
            if ((0, financial_dispute_policy_1.isTransientQuasarError)(err))
                return row;
            return this.executeQuasarDebit(row, actor);
        }
    }
    static async completePosted(row, actor, opts) {
        if (row.status === 'POSTED')
            return row;
        const ledgerRef = row.ledger_reference || `DSP-${String(row.id).replace(/-/g, '').slice(0, 16).toUpperCase()}`;
        const creditAccount = (0, financial_dispute_policy_1.ledgerCreditAccount)(row.case_type);
        await ledger_service_1.LedgerService.createDoubleEntry({
            idempotencyKey: `ledger:dispute:${row.id}`,
            tenantId: row.tenant_id,
            reference: ledgerRef,
            actorId: actor.id,
            provider: 'quasar',
            entries: [
                { account: 'USER_WALLET', type: 'DEBIT', amount: row.amount_kobo },
                { account: creditAccount, type: 'CREDIT', amount: row.amount_kobo },
            ],
            metadata: {
                caseId: row.id,
                caseType: row.case_type,
                originalPaymentReference: row.original_payment_reference,
                quasarDebitId: opts.quasarDebitId,
                source: opts.source,
            },
        });
        const { data, error } = await supabase_1.supabaseAdmin
            .from('financial_disputes')
            .update({
            status: 'POSTED',
            quasar_debit_id: opts.quasarDebitId || row.quasar_debit_id,
            quasar_status: opts.quasarStatus || 'POSTED',
            ledger_reference: ledgerRef,
            posted_at: new Date().toISOString(),
            failure_message: null,
            updated_at: new Date().toISOString(),
            metadata: {
                ...(row.metadata || {}),
                provider: opts.providerPayload || null,
                posted_source: opts.source,
            },
        })
            .eq('id', row.id)
            .in('status', ['APPROVED_EXECUTING', 'FAILED'])
            .select()
            .maybeSingle();
        if (error)
            throw error;
        if (!data) {
            return this.getById(row.id);
        }
        await audit_service_1.AuditService.log({
            eventType: 'dispute.debit.posted',
            reference: ledgerRef,
            tenantId: row.tenant_id,
            payload: {
                caseId: row.id,
                caseType: row.case_type,
                amountKobo: row.amount_kobo,
                quasarDebitId: opts.quasarDebitId,
                source: opts.source,
            },
        });
        await this.recordEvent({
            caseId: row.id,
            eventType: 'QUASAR_POSTED',
            actor,
            fromStatus: row.status,
            toStatus: 'POSTED',
            payload: {
                quasar_debit_id: opts.quasarDebitId,
                ledger_reference: ledgerRef,
                source: opts.source,
            },
        });
        return data;
    }
    static async markFailed(row, actor, message, payload) {
        const { data, error } = await supabase_1.supabaseAdmin
            .from('financial_disputes')
            .update({
            status: 'FAILED',
            failure_message: message,
            quasar_status: 'FAILED',
            updated_at: new Date().toISOString(),
            metadata: {
                ...(row.metadata || {}),
                provider_error: payload || { message },
            },
        })
            .eq('id', row.id)
            .neq('status', 'POSTED')
            .select()
            .maybeSingle();
        if (error)
            throw error;
        await audit_service_1.AuditService.log({
            eventType: 'dispute.debit.failed',
            reference: row.id,
            tenantId: row.tenant_id,
            payload: { message, payload },
        });
        await this.recordEvent({
            caseId: row.id,
            eventType: 'QUASAR_FAILED',
            actor,
            fromStatus: row.status,
            toStatus: 'FAILED',
            payload: { message, payload },
            auditStatus: 'failed',
        });
        const failErr = new financial_dispute_policy_1.DisputePolicyError(`Quasar debit failed — no local ledger posted (fail-closed): ${message}`, 502);
        failErr.case = data || { ...row, status: 'FAILED', failure_message: message };
        throw failErr;
    }
    static async recordEvent(params) {
        try {
            await supabase_1.supabaseAdmin.from('financial_dispute_events').insert({
                case_id: params.caseId,
                event_type: params.eventType,
                actor_id: params.actor.id,
                actor_email: params.actor.email,
                from_status: params.fromStatus,
                to_status: params.toStatus,
                payload: params.payload || {},
                ip_address: params.actor.ip || '127.0.0.1',
            });
        }
        catch (err) {
            console.error('[FinancialDispute] event insert failed:', err.message);
        }
        let tenantId = params.tenantId || params.payload?.tenant_id;
        if (!tenantId) {
            try {
                const { data } = await supabase_1.supabaseAdmin
                    .from('financial_disputes')
                    .select('tenant_id')
                    .eq('id', params.caseId)
                    .maybeSingle();
                tenantId = data?.tenant_id;
            }
            catch {
                tenantId = null;
            }
        }
        try {
            await gov_audit_service_1.GovAuditService.logAction({
                id: (0, crypto_1.randomUUID)(),
                timestamp: new Date().toISOString(),
                module: 'MAKER_CHECKER',
                action: `FINANCIAL_DISPUTE_${params.eventType}`,
                user_email: params.actor.email,
                user_name: params.actor.name || params.actor.email,
                ip_address: params.actor.ip || '127.0.0.1',
                target: params.caseId,
                status: params.auditStatus || 'success',
                tenant_id: tenantId || null,
                metadata: {
                    case_id: params.caseId,
                    tenant_id: tenantId || null,
                    from_status: params.fromStatus,
                    to_status: params.toStatus,
                    ...(params.payload || {}),
                },
            });
        }
        catch (err) {
            console.warn('[FinancialDispute] gov audit failed:', err.message);
        }
    }
}
exports.FinancialDisputeService = FinancialDisputeService;
//# sourceMappingURL=financial-dispute.service.js.map