"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isFeeOrchestrationLive = isFeeOrchestrationLive;
exports.isAgentPayoutExecutionEnabled = isAgentPayoutExecutionEnabled;
exports.filterAssessmentsByOwnedTenants = filterAssessmentsByOwnedTenants;
exports.agentShareKobo = agentShareKobo;
exports.summarizeAgentFeeReadModel = summarizeAgentFeeReadModel;
exports.loadAgentFeeReadModel = loadAgentFeeReadModel;
exports.loadAttributedTenantIds = loadAttributedTenantIds;
const supabase_1 = require("../../../db/supabase");
const build_variant_1 = require("../../../config/build-variant");
function isFeeOrchestrationLive() {
    return process.env.FEE_ORCHESTRATION_LIVE === 'true';
}
function isAgentPayoutExecutionEnabled() {
    try {
        return build_variant_1.FeatureGateService.isFeatureEnabled('real_money_payouts');
    }
    catch {
        return process.env.FEATURE_REAL_MONEY_PAYOUTS === 'true';
    }
}
function filterAssessmentsByOwnedTenants(rows, ownedTenantIds) {
    const owned = new Set(Array.from(ownedTenantIds).filter(Boolean).map(String));
    return rows.filter((row) => owned.has(String(row.tenant_id)));
}
function agentShareKobo(assessment, lines) {
    const line = lines.find((l) => String(l.assessment_id) === String(assessment.id) && String(l.component) === 'AGENT_FEE');
    if (line)
        return Number(line.amount_kobo || 0);
    return Number(assessment.agent_amount_kobo || 0);
}
function summarizeAgentFeeReadModel(input) {
    const live = isFeeOrchestrationLive();
    const payouts = isAgentPayoutExecutionEnabled();
    const scoped = filterAssessmentsByOwnedTenants(input.assessments, input.ownedTenantIds);
    const agentLines = (input.lines || []).filter((l) => String(l.component) === 'AGENT_FEE');
    const ownStakeholderId = input.stakeholderId && input.stakeholderId !== input.systemAgentStakeholderId
        ? String(input.stakeholderId)
        : '';
    let assessedKobo = 0;
    const recent = [];
    const byDay = new Map();
    const byTenant = new Map();
    for (const assessment of scoped) {
        const share = agentShareKobo(assessment, agentLines);
        assessedKobo += share;
        const day = String(assessment.created_at || '').slice(0, 10);
        if (day)
            byDay.set(day, (byDay.get(day) || 0) + share);
        const tid = String(assessment.tenant_id);
        const prev = byTenant.get(tid) || { tenant_id: tid, assessed_kobo: 0, txn_count: 0 };
        prev.assessed_kobo += share;
        prev.txn_count += 1;
        byTenant.set(tid, prev);
        if (recent.length < 25) {
            recent.push({
                assessment_id: assessment.id,
                date: assessment.created_at,
                tenant_id: assessment.tenant_id,
                transaction_type: assessment.transaction_type,
                transaction_reference: assessment.source_idempotency_key,
                transaction_amount_kobo: Number(assessment.principal_amount_kobo || 0),
                fee_amount_kobo: Number(assessment.final_fee_kobo || 0),
                agent_share_kobo: share,
                status: live ? 'ASSESSED' : 'PENDING',
                mode: assessment.mode || (live ? 'LIVE' : 'SHADOW'),
            });
        }
    }
    const ownPayables = ownStakeholderId
        ? (input.payables || []).filter((p) => String(p.stakeholder_id) === ownStakeholderId)
        : [];
    const pendingKobo = ownPayables
        .filter((p) => p.status === 'PENDING')
        .reduce((sum, p) => sum + Number(p.amount_kobo || 0), 0);
    const availableRaw = ownPayables
        .filter((p) => p.status === 'AVAILABLE')
        .reduce((sum, p) => sum + Number(p.amount_kobo || 0), 0);
    const ownWithdrawals = ownStakeholderId
        ? (input.withdrawals || []).filter((w) => String(w.stakeholder_id) === ownStakeholderId)
        : [];
    const pendingWithdrawal = ownWithdrawals
        .filter((w) => ['REQUESTED', 'APPROVED', 'PROCESSING'].includes(String(w.status)))
        .reduce((sum, w) => sum + Number(w.amount_kobo || 0), 0);
    const withdrawn = ownWithdrawals
        .filter((w) => w.status === 'COMPLETED')
        .reduce((sum, w) => sum + Number(w.amount_kobo || 0), 0);
    const availableKobo = live ? Math.max(0, availableRaw - pendingWithdrawal) : 0;
    return {
        agent_code: input.agentCode,
        agent_id: input.agentId || null,
        stakeholder_id: ownStakeholderId || null,
        mode: live ? 'LIVE' : 'SHADOW',
        fee_orchestration_live: live,
        payout_execution_enabled: payouts,
        individual_agent_stakeholder: Boolean(ownStakeholderId),
        isolation: {
            strategy: 'fee_assessments.agent_id (immutable) + agent_fee_stakeholders + ownership for legacy null agent_id',
            global_agent_stakeholder: false,
            note: 'AGENT_FEE payables are scoped to the individual agent stakeholder. Global AGENT is never this agent\'s cash.',
        },
        labels: {
            assessed: 'ASSESSED COMMISSION',
            pending: 'PENDING PAYABLE',
            available: live ? 'AVAILABLE COMMISSION' : 'NOT YET AVAILABLE',
            withdrawn: 'TOTAL WITHDRAWN',
            pending_withdrawal: 'PENDING WITHDRAWAL',
        },
        assessed_kobo: assessedKobo,
        pending_kobo: live ? pendingKobo : assessedKobo,
        pending_payable_kobo: live ? pendingKobo : assessedKobo,
        available_kobo: availableKobo,
        withdrawn_kobo: withdrawn,
        pending_withdrawal_kobo: pendingWithdrawal,
        rejected_withdrawal_kobo: ownWithdrawals
            .filter((w) => w.status === 'REJECTED' || w.status === 'FAILED')
            .reduce((sum, w) => sum + Number(w.amount_kobo || 0), 0),
        assessment_count: scoped.length,
        recent,
        charts: {
            commission_by_day: Array.from(byDay.entries())
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([day, kobo]) => ({ day, assessed_kobo: kobo })),
            top_tenants_by_commission: Array.from(byTenant.values())
                .sort((a, b) => b.assessed_kobo - a.assessed_kobo)
                .slice(0, 5),
        },
    };
}
async function loadAgentFeeReadModel(agentCode, ownedTenantIds, agentId) {
    const empty = summarizeAgentFeeReadModel({
        agentCode,
        agentId: agentId || null,
        assessments: [],
        lines: [],
        ownedTenantIds,
    });
    const ids = [...new Set(ownedTenantIds.filter(Boolean).map(String))];
    if (!ids.length || !agentCode)
        return empty;
    try {
        const { data: byAgent } = agentId
            ? await supabase_1.supabaseAdmin
                .from('fee_assessments')
                .select('id, tenant_id, agent_id, transaction_type, source_idempotency_key, principal_amount_kobo, final_fee_kobo, agent_amount_kobo, mode, created_at')
                .eq('agent_id', agentId)
                .order('created_at', { ascending: false })
                .limit(500)
            : { data: [] };
        const { data: assessments, error } = await supabase_1.supabaseAdmin
            .from('fee_assessments')
            .select('id, tenant_id, agent_id, transaction_type, source_idempotency_key, principal_amount_kobo, final_fee_kobo, agent_amount_kobo, mode, created_at')
            .in('tenant_id', ids)
            .order('created_at', { ascending: false })
            .limit(500);
        if (error) {
            console.warn('[agent-fee-read-model] fee_assessments unavailable:', error.message);
            return empty;
        }
        const merged = new Map();
        for (const row of assessments || []) {
            if (row.agent_id && agentId && String(row.agent_id) !== String(agentId))
                continue;
            merged.set(String(row.id), row);
        }
        for (const row of byAgent || [])
            merged.set(String(row.id), row);
        const rows = Array.from(merged.values());
        const assessmentIds = rows.map((r) => r.id);
        let lines = [];
        if (assessmentIds.length) {
            const { data: lineRows, error: lineErr } = await supabase_1.supabaseAdmin
                .from('fee_assessment_lines')
                .select('assessment_id, component, amount_kobo')
                .in('assessment_id', assessmentIds)
                .eq('component', 'AGENT_FEE');
            if (lineErr) {
                console.warn('[agent-fee-read-model] fee_assessment_lines unavailable:', lineErr.message);
            }
            else {
                lines = (lineRows || []);
            }
        }
        let stakeholderId = null;
        let systemAgentStakeholderId = null;
        const { data: systemAgent } = await supabase_1.supabaseAdmin
            .from('fee_stakeholders')
            .select('id')
            .eq('stakeholder_type', 'AGENT')
            .contains('metadata', { system: true })
            .maybeSingle();
        systemAgentStakeholderId = systemAgent?.id ? String(systemAgent.id) : null;
        if (agentId) {
            const { data: mapRow } = await supabase_1.supabaseAdmin
                .from('agent_fee_stakeholders')
                .select('stakeholder_id')
                .eq('agent_id', agentId)
                .maybeSingle();
            stakeholderId = mapRow?.stakeholder_id ? String(mapRow.stakeholder_id) : null;
        }
        let payables = [];
        let withdrawals = [];
        if (stakeholderId && stakeholderId !== systemAgentStakeholderId) {
            const { data: payableRows } = await supabase_1.supabaseAdmin
                .from('fee_stakeholder_payables')
                .select('stakeholder_id, amount_kobo, status')
                .eq('stakeholder_id', stakeholderId);
            payables = payableRows || [];
            const { data: wdRows } = await supabase_1.supabaseAdmin
                .from('fee_withdrawal_requests')
                .select('stakeholder_id, amount_kobo, status')
                .eq('stakeholder_id', stakeholderId);
            withdrawals = wdRows || [];
        }
        return summarizeAgentFeeReadModel({
            agentCode,
            agentId: agentId || null,
            stakeholderId,
            systemAgentStakeholderId,
            assessments: rows,
            lines,
            ownedTenantIds: ids,
            payables,
            withdrawals,
        });
    }
    catch (err) {
        console.warn('[agent-fee-read-model] load failed:', err?.message || err);
        return empty;
    }
}
async function loadAttributedTenantIds(agentId, agentCode) {
    const tenantIds = new Set();
    const attributedTenants = [];
    const { data: linked } = await supabase_1.supabaseAdmin
        .from('agent_tenants')
        .select('*')
        .eq('agent_id', agentId)
        .is('deleted_at', null);
    for (const row of linked || []) {
        const tid = String(row.tenant_id || row.id || '');
        if (tid)
            tenantIds.add(tid);
        attributedTenants.push(row);
    }
    if (agentCode) {
        const { data: byCode } = await supabase_1.supabaseAdmin
            .from('tenants')
            .select('id, name, business_name, status, agent_code, created_at, updated_at')
            .ilike('agent_code', agentCode);
        for (const row of byCode || []) {
            const tid = String(row.id);
            if (!tenantIds.has(tid)) {
                attributedTenants.push({
                    id: row.id,
                    tenant_id: row.id,
                    business_name: row.business_name || row.name,
                    status: row.status,
                    agent_code: row.agent_code,
                    created_at: row.created_at,
                    updated_at: row.updated_at,
                    volume: 0,
                    health: 0,
                    attribution: 'agent_code',
                });
            }
            tenantIds.add(tid);
        }
    }
    return { tenantIds: [...tenantIds], attributedTenants };
}
//# sourceMappingURL=agent-fee-read-model.js.map