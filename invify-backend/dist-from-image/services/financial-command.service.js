"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancialCommandService = void 0;
const supabase_1 = require("../db/supabase");
const stable_uuid_1 = require("../utils/stable-uuid");
const ledger_service_1 = require("./ledger.service");
const parent_allocation_service_1 = require("./parent-allocation.service");
const collection_confirmation_1 = require("./collection-confirmation");
const school_fund_ownership_1 = require("./school-fund-ownership");
const virtual_account_ownership_1 = require("./virtual-account-ownership");
const ENTITY = 'financial_command';
async function loadCommand(tenantId, commandId) {
    const syncId = (0, stable_uuid_1.toStableUuid)(tenantId, ENTITY, commandId);
    const { data, error } = await supabase_1.supabaseAdmin
        .from('school_entities')
        .select('payload, tenant_id, sync_id')
        .eq('tenant_id', tenantId)
        .eq('entity_type', ENTITY)
        .eq('sync_id', syncId)
        .maybeSingle();
    if (error) {
        const err = new Error(`financial_command_store_unavailable: ${error.message}`);
        err.status = 503;
        throw err;
    }
    return { syncId, row: data };
}
async function patchCommand(tenantId, commandId, patch) {
    const { syncId, row } = await loadCommand(tenantId, commandId);
    if (!row) {
        const err = new Error('financial_command_missing');
        err.status = 409;
        throw err;
    }
    const next = { ...(row.payload || {}), ...patch, commandId, syncId };
    const { error } = await supabase_1.supabaseAdmin
        .from('school_entities')
        .update({ payload: next, updated_at: new Date().toISOString() })
        .eq('tenant_id', tenantId)
        .eq('entity_type', ENTITY)
        .eq('sync_id', syncId);
    if (error) {
        const err = new Error(`financial_command_store_unavailable: ${error.message}`);
        err.status = 503;
        throw err;
    }
    return next;
}
async function saveCommand(tenantId, commandId, payload) {
    const { syncId, row } = await loadCommand(tenantId, commandId);
    if (row) {
        return { duplicate: true, syncId, payload: row.payload || {} };
    }
    const { error } = await supabase_1.supabaseAdmin.from('school_entities').insert({
        tenant_id: tenantId,
        entity_type: ENTITY,
        sync_id: syncId,
        payload: { ...payload, commandId, syncId },
        updated_at: new Date().toISOString(),
    });
    if (error) {
        if (String(error.message || '').toLowerCase().includes('duplicate') || error.code === '23505') {
            return { duplicate: true, syncId, payload };
        }
        const err = new Error(`financial_command_store_unavailable: ${error.message}`);
        err.status = 503;
        throw err;
    }
    return { duplicate: false, syncId, payload };
}
function requireAmount(amount) {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
        const err = new Error('amount_required');
        err.status = 400;
        throw err;
    }
    return n;
}
class FinancialCommandService {
    static async load(tenantId, commandId) {
        return loadCommand(tenantId, commandId);
    }
    static async mark(tenantId, commandId, patch) {
        return patchCommand(tenantId, commandId, patch);
    }
    static async listUnfinalized(tenantId) {
        const { data, error } = await supabase_1.supabaseAdmin
            .from('school_entities')
            .select('sync_id, payload, updated_at')
            .eq('tenant_id', tenantId)
            .eq('entity_type', ENTITY);
        if (error) {
            const err = new Error(`financial_command_store_unavailable: ${error.message}`);
            err.status = 503;
            throw err;
        }
        return (data || []).filter((row) => {
            const payload = row.payload || {};
            return payload.finalized !== true;
        });
    }
    static async claim(tenantId, commandId, payload) {
        if (!(0, collection_confirmation_1.isStableCommandId)(commandId)) {
            return { ack: 'rejected', reason: 'unstable_command_id', commandId };
        }
        const stored = await saveCommand(tenantId, commandId, payload);
        if (stored.duplicate) {
            return { ack: 'duplicate', commandId, reason: 'idempotent_replay' };
        }
        return { ack: 'accepted', commandId };
    }
    static async parentFund(params) {
        if (!(0, collection_confirmation_1.isStableCommandId)(params.commandId)) {
            return { ack: 'rejected', reason: 'unstable_command_id', commandId: String(params.commandId || '') };
        }
        const amount = requireAmount(params.amount);
        const confirmation = (0, collection_confirmation_1.classifyCollectionConfirmation)(params.method, {
            confirmed: params.confirmed,
            providerReference: params.providerReference,
        });
        const stored = await saveCommand(params.tenantId, params.commandId, {
            kind: 'parent_fund',
            amount,
            method: params.method,
            parentId: params.parentId || null,
            confirmation,
            providerReference: params.providerReference || null,
            finalized: false,
        });
        if (stored.duplicate) {
            const loaded = await loadCommand(params.tenantId, params.commandId);
            return this.resumeParentFund(params.tenantId, params.commandId, (loaded.row?.payload || stored.payload));
        }
        if (confirmation === 'unconfirmed') {
            await patchCommand(params.tenantId, params.commandId, { finalized: true, reason: 'pending_evidence' });
            return { ack: 'accepted', commandId: params.commandId, confirmation, reason: 'pending_evidence' };
        }
        if (confirmation === 'settled') {
            return this.settleParentFund(params.tenantId, params.commandId, amount, String(params.providerReference || '').trim());
        }
        await patchCommand(params.tenantId, params.commandId, { finalized: true, reason: 'recorded_unsettled' });
        return { ack: 'accepted', commandId: params.commandId, confirmation, reason: 'recorded_unsettled' };
    }
    static async resumeParentFund(tenantId, commandId, payload) {
        if (payload.finalized === true) {
            return {
                ack: 'duplicate',
                commandId,
                confirmation: payload.confirmation,
                reason: 'idempotent_replay',
            };
        }
        const confirmation = payload.confirmation;
        if (confirmation === 'settled') {
            return this.settleParentFund(tenantId, commandId, Number(payload.amount), String(payload.providerReference || ''));
        }
        await patchCommand(tenantId, commandId, { finalized: true, recovered: true });
        return { ack: 'accepted', commandId, confirmation, reason: String(payload.reason || 'recovered') };
    }
    static async settleParentFund(tenantId, commandId, amount, ref) {
        if (!ref) {
            return { ack: 'rejected', commandId, reason: 'provider_reference_required', confirmation: 'settled' };
        }
        const key = (0, collection_confirmation_1.providerCreditIdempotencyKey)(ref);
        try {
            const posted = await ledger_service_1.LedgerService.createDoubleEntry({
                idempotencyKey: key,
                tenantId,
                reference: ref,
                entries: (0, school_fund_ownership_1.parentDepositLedgerEntries)(amount),
                actorId: 'PARENT_FUND_COMMAND',
                provider: 'invify',
                metadata: { source: 'parent_fund_command', commandId, paidVia: 'parent_account', schoolWalletCredit: false },
            });
            await patchCommand(tenantId, commandId, { finalized: true, ledgerStatus: posted.status });
            return {
                ack: posted.status === 'DE-DUPLICATED' ? 'duplicate' : 'accepted',
                commandId,
                confirmation: 'settled',
                ledgerStatus: String(posted.status),
            };
        }
        catch (err) {
            return {
                ack: 'reconciliation-required',
                commandId,
                confirmation: 'settled',
                reason: err?.message || 'parent_fund_unsettled',
            };
        }
    }
    static async parentAllocate(params) {
        if (!(0, collection_confirmation_1.isStableCommandId)(params.commandId)) {
            return { ack: 'rejected', reason: 'unstable_command_id', commandId: String(params.commandId || '') };
        }
        const amount = requireAmount(params.amount);
        const method = params.paymentMethod || 'Parent Credit';
        if (!(0, virtual_account_ownership_1.isSchoolParentWalletPayment)(method, params.payload || { businessMode: 'school' })) {
            return { ack: 'rejected', reason: 'not_parent_wallet', commandId: params.commandId };
        }
        const stored = await saveCommand(params.tenantId, params.commandId, {
            kind: 'parent_allocate',
            amount,
            invoiceNumber: params.invoiceNumber || null,
            reference: params.reference || null,
            paymentMethod: method,
            finalized: false,
        });
        if (stored.duplicate) {
            const payload = stored.payload;
            if (payload.finalized === true) {
                return { ack: 'duplicate', commandId: params.commandId, reason: 'idempotent_replay' };
            }
            return this.finishParentAllocate(params);
        }
        return this.finishParentAllocate(params);
    }
    static async finishParentAllocate(params) {
        const amount = requireAmount(params.amount);
        try {
            const posted = await parent_allocation_service_1.ParentAllocationService.creditSchoolOnce({
                tenantId: params.tenantId,
                invoiceNumber: params.invoiceNumber,
                reference: params.reference || params.commandId,
                paymentMethod: 'Parent Credit',
                amountNaira: amount,
                historicalBackfill: false,
            });
            if (posted.status === 'SKIPPED') {
                await patchCommand(params.tenantId, params.commandId, { finalized: true, rejected: true, reason: posted.reason });
                return { ack: 'rejected', reason: posted.reason, commandId: params.commandId };
            }
            await patchCommand(params.tenantId, params.commandId, { finalized: true, ledgerStatus: posted.status });
            if (posted.status === 'DE-DUPLICATED') {
                return { ack: 'duplicate', commandId: params.commandId, ledgerStatus: 'DE-DUPLICATED' };
            }
            return { ack: 'accepted', commandId: params.commandId, ledgerStatus: 'CREATED' };
        }
        catch (err) {
            return {
                ack: 'reconciliation-required',
                commandId: params.commandId,
                reason: err?.message || 'parent_allocate_unsettled',
            };
        }
    }
}
exports.FinancialCommandService = FinancialCommandService;
//# sourceMappingURL=financial-command.service.js.map