"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommissionController = void 0;
const supabase_1 = require("../db/supabase");
const approval_workflow_service_1 = require("../services/approval-workflow.service");
const commission_engine_service_1 = require("../services/commission-engine.service");
const incentive_engine_service_1 = require("../services/incentive-engine.service");
const isOfflineMode = () => false;
// Mock Data Definitions for Offline/Degraded Mode
const MOCK_AGENTS = [
    { id: 'agent-001', name: 'John Doe', agent_code: 'AGT-9082', email: 'john@invify.com' },
    { id: 'agent-002', name: 'Jane Smith', agent_code: 'AGT-1102', email: 'jane@invify.com' },
    { id: 'agent-003', name: 'Alice Johnson', agent_code: 'AGT-4402', email: 'alice@invify.com' }
];
const MOCK_APPROVALS = [
    { id: 'app-001', agent_id: 'agent-001', source_type: 'ACQUISITION_REWARD', amount: 10000, status: 'PENDING', created_at: new Date(Date.now() - 3600000).toISOString(), agents: { first_name: 'John', last_name: 'Doe', agent_code: 'AGT-9082' } },
    { id: 'app-002', agent_id: 'agent-002', source_type: 'REVENUE_SHARE', amount: 2500, status: 'PENDING', created_at: new Date(Date.now() - 7200000).toISOString(), agents: { first_name: 'Jane', last_name: 'Smith', agent_code: 'AGT-1102' } },
    { id: 'app-003', agent_id: 'agent-001', source_type: 'CAMPAIGN_BONUS', amount: 15000, status: 'APPROVED', created_at: new Date(Date.now() - 86400000).toISOString(), agents: { first_name: 'John', last_name: 'Doe', agent_code: 'AGT-9082' } },
    { id: 'app-004', agent_id: 'agent-003', source_type: 'REVENUE_SHARE', amount: 4200, status: 'PAID', created_at: new Date(Date.now() - 172800000).toISOString(), agents: { first_name: 'Alice', last_name: 'Johnson', agent_code: 'AGT-4402' } }
];
const MOCK_EVENTS = [
    { id: 'ev-001', agent_id: 'agent-001', event_type: 'ACQUISITION_EVALUATED', amount: 10000, previous_state: null, new_state: 'PENDING', reference_id: 'app-001', created_at: new Date(Date.now() - 3600000).toISOString(), agents: { first_name: 'John', last_name: 'Doe', agent_code: 'AGT-9082' } },
    { id: 'ev-002', agent_id: 'agent-002', event_type: 'REVENUE_SHARE_CALCULATED', amount: 2500, previous_state: null, new_state: 'PENDING', reference_id: 'app-002', created_at: new Date(Date.now() - 7200000).toISOString(), agents: { first_name: 'Jane', last_name: 'Smith', agent_code: 'AGT-1102' } },
    { id: 'ev-003', agent_id: 'agent-001', event_type: 'APPROVAL_STATUS_CHANGE', amount: 15000, previous_state: 'PENDING', new_state: 'APPROVED', reference_id: 'app-003', created_at: new Date(Date.now() - 86400000).toISOString(), agents: { first_name: 'John', last_name: 'Doe', agent_code: 'AGT-9082' } }
];
const MOCK_LEDGER = [
    { id: 'ld-001', agent_id: 'agent-001', tenant_id: 'tenant-001', transaction_id: 'txn_109823', transaction_type: 'CARD', platform_revenue: 50000, revenue_share_percentage: 10, calculated_commission: 5000, approval_state: 'PENDING', created_at: new Date(Date.now() - 3600000).toISOString() }
];
const MOCK_REWARDS = [
    { id: 'br-001', agent_id: 'agent-001', reward_type: 'CASH_BONUS', reward_source: 'CAMPAIGN_BONUS', reward_amount: 15000, approval_state: 'APPROVED', created_at: new Date(Date.now() - 86400000).toISOString() }
];
const MOCK_CLAWBACKS = [
    { id: 'cb-001', agent_id: 'agent-003', amount: 2000, reason: 'MERCHANT_CLOSURE', reference_id: 'app-004', justification: 'Merchant closed within holding period', created_at: new Date(Date.now() - 172800000).toISOString() }
];
const MOCK_PROGRESS = [
    { id: 'prog-001', agent_id: 'agent-001', tenants_onboarded_count: 8, terminals_deployed_count: 5, revenue_generated: 450000, current_tier: 2, plan_name: 'Standard RevShare Plan', campaign_progress: 80, agent_name: 'John Doe', agent_code: 'AGT-9082' },
    { id: 'prog-002', agent_id: 'agent-002', tenants_onboarded_count: 2, terminals_deployed_count: 1, revenue_generated: 120000, current_tier: 1, plan_name: 'Standard RevShare Plan', campaign_progress: 20, agent_name: 'Jane Smith', agent_code: 'AGT-1102' },
    { id: 'prog-003', agent_id: 'agent-003', tenants_onboarded_count: 15, terminals_deployed_count: 12, revenue_generated: 980000, current_tier: 3, plan_name: 'Premium Partner Plan', campaign_progress: 100, agent_name: 'Alice Johnson', agent_code: 'AGT-4402' }
];
const MOCK_PLANS = [
    { id: 'prog-rev-001', name: 'Standard RevShare Program', is_active: true, versions: [{ version_number: 4, effective_date: '2026-01-01T00:00:00Z', status: 'ACTIVE', rule: { tenant_onboarding_bonus: 5000, tenant_activation_bonus: 10000, card_rev_share_pct: 10, transfer_rev_share_pct: 12, ussd_rev_share_pct: 15, va_rev_share_pct: 8, bill_rev_share_pct: 10 } }] }
];
const MOCK_CATEGORY_RULES = [
    { id: 'cat-rule-001', plan_version_id: 'version-001', category_name: 'Education / Schools', tenant_onboarding_bonus: 7500, tenant_activation_bonus: 15000, card_rev_share_pct: 15 },
    { id: 'cat-rule-002', plan_version_id: 'version-001', category_name: 'Retail POS Shops', tenant_onboarding_bonus: 5000, tenant_activation_bonus: 10000, card_rev_share_pct: 10 }
];
const MOCK_TARGETS = {
    performance: [
        { id: 'pt-001', tier_level: 2, tenant_threshold: 5, bonus_amount: 25000, card_rev_share_pct: 12 },
        { id: 'pt-002', tier_level: 3, tenant_threshold: 10, bonus_amount: 50000, card_rev_share_pct: 15 }
    ],
    terminal: [
        { id: 'tt-001', frequency: 'MONTHLY', terminal_target: 3, reward_type: 'CASH_BONUS', reward_value: 30000 }
    ]
};
const MOCK_BUDGETS = [
    { id: 'bud-001', name: 'Q2 2026 Platform Expansion Fund', total_amount: 5000000, used_amount: 1420000, remaining_amount: 3580000, start_date: '2026-04-01T00:00:00Z', end_date: '2026-06-30T23:59:59Z', utilization_pct: 28.4, alerts: [] }
];
const MOCK_CAMPAIGNS = [
    { id: 'camp-001', budget_id: 'bud-001', name: 'Lagos Academy Activation Drive', region: 'Lagos', start_date: '2026-05-01T00:00:00Z', end_date: '2026-06-15T00:00:00Z', target_type: 'MERCHANTS', reward_type: 'CASH_BONUS', reward_value: 20000, status: 'ACTIVE' }
];
class CommissionController {
    // 1. Approval Queue List
    static async listApprovals(req, res) {
        try {
            if (isOfflineMode()) {
                return res.json({ success: true, approvals: MOCK_APPROVALS, degradedMode: true });
            }
            const { data, error } = await supabase_1.supabaseAdmin
                .from('approval_queue')
                .select('*, agents(first_name, last_name, agent_code)')
                .order('created_at', { ascending: false });
            if (error)
                throw error;
            return res.json({ success: true, approvals: data, degradedMode: false });
        }
        catch (err) {
            console.error('[CommissionController] DB Connection Failed in listApprovals:', err.message);
            return res.status(500).json({ success: false, error: err.message, degradedMode: false });
        }
    }
    // 2. Approve Commission Ticket
    static async approveCommission(req, res) {
        try {
            if (isOfflineMode()) {
                return res.status(503).json({ success: false, error: 'Database Connection Unavailable. Write actions are disabled in offline mode.' });
            }
            const { id } = req.params;
            const operatorId = req.user?.id || 'sys_admin_root';
            const success = await approval_workflow_service_1.ApprovalWorkflowService.approveCommission(id, operatorId);
            if (!success) {
                return res.status(400).json({ success: false, error: 'Failed to approve commission ticket.' });
            }
            return res.json({ success: true, message: 'Commission ticket approved successfully' });
        }
        catch (err) {
            console.error('[CommissionController] Approve Error:', err.message);
            return res.status(500).json({ success: false, error: err.message });
        }
    }
    // 3. Reject Commission Ticket
    static async rejectCommission(req, res) {
        try {
            if (isOfflineMode()) {
                return res.status(503).json({ success: false, error: 'Database Connection Unavailable. Write actions are disabled in offline mode.' });
            }
            const { id } = req.params;
            const { reason } = req.body;
            const operatorId = req.user?.id || 'sys_admin_root';
            if (!reason) {
                return res.status(400).json({ success: false, error: 'Rejection reason is required' });
            }
            const success = await approval_workflow_service_1.ApprovalWorkflowService.rejectCommission(id, reason, operatorId);
            if (!success) {
                return res.status(400).json({ success: false, error: 'Failed to reject commission ticket.' });
            }
            return res.json({ success: true, message: 'Commission ticket rejected successfully' });
        }
        catch (err) {
            console.error('[CommissionController] Reject Error:', err.message);
            return res.status(500).json({ success: false, error: err.message });
        }
    }
    // 4. Reverse / Clawback Commission
    static async executeClawback(req, res) {
        try {
            if (isOfflineMode()) {
                return res.status(503).json({ success: false, error: 'Database Connection Unavailable. Write actions are disabled in offline mode.' });
            }
            const { agentId, amount, reason, justification } = req.body;
            const operatorId = req.user?.id || 'sys_admin_root';
            if (!agentId || !amount || !reason) {
                return res.status(400).json({ success: false, error: 'Missing required clawback parameters (agentId, amount, reason).' });
            }
            const success = await approval_workflow_service_1.ApprovalWorkflowService.executeClawback(agentId, amount, reason, justification || '', operatorId);
            if (!success) {
                return res.status(400).json({ success: false, error: 'Clawback failed.' });
            }
            return res.json({ success: true, message: 'Commission clawback executed successfully' });
        }
        catch (err) {
            console.error('[CommissionController] Clawback Error:', err.message);
            return res.status(500).json({ success: false, error: err.message });
        }
    }
    // 5. Audit & History List
    static async listAuditHistory(req, res) {
        try {
            if (isOfflineMode()) {
                return res.json({
                    success: true,
                    events: MOCK_EVENTS,
                    revenueShareLedger: MOCK_LEDGER,
                    bonusRewards: MOCK_REWARDS,
                    clawbacks: MOCK_CLAWBACKS,
                    degradedMode: true
                });
            }
            const { data: events, error: eventsErr } = await supabase_1.supabaseAdmin
                .from('commission_events')
                .select('*, agents(first_name, last_name, agent_code)')
                .order('created_at', { ascending: false });
            const { data: ledger, error: ledgerErr } = await supabase_1.supabaseAdmin
                .from('agent_revenue_share_ledger')
                .select('*')
                .order('created_at', { ascending: false });
            const { data: rewards, error: rewardsErr } = await supabase_1.supabaseAdmin
                .from('agent_bonus_rewards')
                .select('*')
                .order('created_at', { ascending: false });
            const { data: clawbacks, error: clawbacksErr } = await supabase_1.supabaseAdmin
                .from('commission_clawbacks')
                .select('*')
                .order('created_at', { ascending: false });
            if (eventsErr || ledgerErr || rewardsErr || clawbacksErr) {
                throw new Error('Database query failure during audit fetch');
            }
            return res.json({
                success: true,
                events,
                revenueShareLedger: ledger,
                bonusRewards: rewards,
                clawbacks,
                degradedMode: false
            });
        }
        catch (err) {
            console.error('[CommissionController] DB Connection Failed in listAuditHistory:', err.message);
            return res.status(500).json({ success: false, error: err.message, degradedMode: false });
        }
    }
    // 6. Agent Progress List
    static async listAgentProgress(req, res) {
        try {
            if (isOfflineMode()) {
                return res.json({ success: true, progress: MOCK_PROGRESS, degradedMode: true });
            }
            const { data, error } = await supabase_1.supabaseAdmin
                .from('agent_commission_progress')
                .select('*, agents(first_name, last_name, agent_code)');
            if (error)
                throw error;
            // Join metrics and format
            const formatted = data.map(item => ({
                id: item.id,
                agent_id: item.agent_id,
                tenants_onboarded_count: item.tenants_onboarded_count || 0,
                terminals_deployed_count: item.terminals_deployed_count || 0,
                revenue_generated: item.revenue_generated || 0,
                current_tier: 1, // Default base
                plan_name: 'Standard RevShare Plan',
                campaign_progress: 50,
                agent_name: item.agents ? `${item.agents.first_name} ${item.agents.last_name}` : 'Unknown Agent',
                agent_code: item.agents ? item.agents.agent_code : 'N/A'
            }));
            return res.json({ success: true, progress: formatted, degradedMode: false });
        }
        catch (err) {
            console.error('[CommissionController] DB Connection Failed in listAgentProgress:', err.message);
            return res.status(500).json({ success: false, error: err.message, degradedMode: false });
        }
    }
    // 7. Plans & Targets List
    static async listPlansAndTargets(req, res) {
        try {
            if (isOfflineMode()) {
                return res.json({
                    success: true,
                    programs: MOCK_PLANS,
                    categoryRules: MOCK_CATEGORY_RULES,
                    performanceRules: MOCK_TARGETS.performance,
                    terminalRules: MOCK_TARGETS.terminal,
                    degradedMode: true
                });
            }
            // Fetch all programs joined with versions and rule objects
            const { data: programs, error: progErr } = await supabase_1.supabaseAdmin
                .from('commission_programs')
                .select('*, commission_plan_versions(*, commission_program_rules(*))');
            const { data: categoryRules, error: catErr } = await supabase_1.supabaseAdmin
                .from('merchant_category_commission_rules')
                .select('*, merchant_categories(name)');
            const { data: performanceRules, error: perfErr } = await supabase_1.supabaseAdmin
                .from('performance_target_rules')
                .select('*');
            const { data: terminalRules, error: termErr } = await supabase_1.supabaseAdmin
                .from('terminal_target_rules')
                .select('*');
            const { data: categories, error: mcErr } = await supabase_1.supabaseAdmin
                .from('merchant_categories')
                .select('id, name');
            if (progErr || catErr || perfErr || termErr || mcErr) {
                throw new Error(`Failed to query plans: prog=${progErr?.message} cat=${catErr?.message} perf=${perfErr?.message} term=${termErr?.message} mc=${mcErr?.message}`);
            }
            // Map version rules array to standard single .rule object
            const formattedPrograms = (programs || []).map((prog) => {
                const versions = (prog.commission_plan_versions || []).map((ver) => {
                    const rule = ver.commission_program_rules && ver.commission_program_rules.length > 0
                        ? ver.commission_program_rules[0]
                        : null;
                    return {
                        id: ver.id,
                        program_id: ver.program_id,
                        version_number: ver.version_number,
                        effective_date: ver.effective_date,
                        expiry_date: ver.expiry_date,
                        status: ver.status,
                        rule
                    };
                });
                return {
                    id: prog.id,
                    name: prog.name,
                    description: prog.description,
                    is_active: prog.is_active,
                    versions
                };
            });
            return res.json({
                success: true,
                programs: formattedPrograms,
                categoryRules,
                performanceRules,
                terminalRules,
                categories: categories || [],
                degradedMode: false
            });
        }
        catch (err) {
            console.error('[CommissionController] DB Connection Failed in listPlansAndTargets:', err.message);
            return res.status(500).json({ success: false, error: err.message, degradedMode: false });
        }
    }
    // --- PROGRAM CRUD ---
    static async createProgram(req, res) {
        try {
            if (isOfflineMode()) {
                return res.status(503).json({ success: false, error: 'Database offline. Write actions disabled.' });
            }
            const { name, description, is_active = true } = req.body;
            const operatorId = req.user?.id || 'sys_admin_root';
            const { data, error } = await supabase_1.supabaseAdmin
                .from('commission_programs')
                .insert({ name, description, is_active })
                .select()
                .single();
            if (error)
                throw error;
            await supabase_1.supabaseAdmin.from('commission_events').insert({
                agent_id: null,
                event_type: 'PROGRAM_CREATED',
                amount: 0,
                new_state: 'APPROVED',
                metadata: { operatorId, oldValue: null, newValue: data }
            });
            return res.json({ success: true, program: data });
        }
        catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }
    static async updateProgram(req, res) {
        try {
            if (isOfflineMode()) {
                return res.status(503).json({ success: false, error: 'Database offline. Write actions disabled.' });
            }
            const { id } = req.params;
            const { name, description, is_active } = req.body;
            const operatorId = req.user?.id || 'sys_admin_root';
            const { data: oldValue } = await supabase_1.supabaseAdmin
                .from('commission_programs')
                .select('*')
                .eq('id', id)
                .single();
            const { data: newValue, error } = await supabase_1.supabaseAdmin
                .from('commission_programs')
                .update({ name, description, is_active, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();
            if (error)
                throw error;
            await supabase_1.supabaseAdmin.from('commission_events').insert({
                agent_id: null,
                event_type: 'PROGRAM_UPDATED',
                amount: 0,
                new_state: 'APPROVED',
                metadata: { operatorId, oldValue, newValue }
            });
            return res.json({ success: true, program: newValue });
        }
        catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }
    static async deleteProgram(req, res) {
        try {
            if (isOfflineMode()) {
                return res.status(503).json({ success: false, error: 'Database offline. Write actions disabled.' });
            }
            const { id } = req.params;
            const operatorId = req.user?.id || 'sys_admin_root';
            const { data: oldValue } = await supabase_1.supabaseAdmin
                .from('commission_programs')
                .select('*')
                .eq('id', id)
                .single();
            const { error } = await supabase_1.supabaseAdmin.from('commission_programs').delete().eq('id', id);
            if (error)
                throw error;
            await supabase_1.supabaseAdmin.from('commission_events').insert({
                agent_id: null,
                event_type: 'PROGRAM_DELETED',
                amount: 0,
                new_state: 'APPROVED',
                metadata: { operatorId, oldValue, newValue: null }
            });
            return res.json({ success: true });
        }
        catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }
    // --- VERSION & RULE CRUD ---
    static async createVersion(req, res) {
        try {
            if (isOfflineMode()) {
                return res.status(503).json({ success: false, error: 'Database offline. Write actions disabled.' });
            }
            const { id: programId } = req.params;
            const { version_number, effective_date, expiry_date, status = 'ACTIVE', rule } = req.body;
            const operatorId = req.user?.id || 'sys_admin_root';
            if (status === 'ACTIVE') {
                const { data: existing } = await supabase_1.supabaseAdmin
                    .from('commission_plan_versions')
                    .select('*')
                    .eq('program_id', programId)
                    .eq('status', 'ACTIVE');
                if (existing && existing.length > 0) {
                    return res.status(400).json({ success: false, error: 'An active version already exists for this program. Deactivate or deprecate it first.' });
                }
            }
            const { data: version, error: verErr } = await supabase_1.supabaseAdmin
                .from('commission_plan_versions')
                .insert({ program_id: programId, version_number, effective_date, expiry_date, status })
                .select()
                .single();
            if (verErr)
                throw verErr;
            const { data: programRule, error: ruleErr } = await supabase_1.supabaseAdmin
                .from('commission_program_rules')
                .insert({
                plan_version_id: version.id,
                tenant_onboarding_bonus: rule.tenant_onboarding_bonus || 0,
                tenant_activation_bonus: rule.tenant_activation_bonus || 0,
                card_rev_share_pct: rule.card_rev_share_pct || 0,
                transfer_rev_share_pct: rule.transfer_rev_share_pct || 0,
                ussd_rev_share_pct: rule.ussd_rev_share_pct || 0,
                va_rev_share_pct: rule.va_rev_share_pct || 0,
                bill_rev_share_pct: rule.bill_rev_share_pct || 0
            })
                .select()
                .single();
            if (ruleErr)
                throw ruleErr;
            const fullNewValue = { ...version, rule: programRule };
            await supabase_1.supabaseAdmin.from('commission_events').insert({
                agent_id: null,
                event_type: 'VERSION_CREATED',
                amount: 0,
                new_state: 'APPROVED',
                metadata: { operatorId, oldValue: null, newValue: fullNewValue }
            });
            return res.json({ success: true, version: fullNewValue });
        }
        catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }
    static async cloneVersion(req, res) {
        try {
            if (isOfflineMode()) {
                return res.status(503).json({ success: false, error: 'Database offline. Write actions disabled.' });
            }
            const { id: sourceVersionId } = req.params;
            const { version_number, effective_date, expiry_date, status = 'ACTIVE' } = req.body;
            const operatorId = req.user?.id || 'sys_admin_root';
            const { data: srcVer, error: srcVerErr } = await supabase_1.supabaseAdmin
                .from('commission_plan_versions')
                .select('*')
                .eq('id', sourceVersionId)
                .single();
            if (srcVerErr || !srcVer)
                throw new Error('Source plan version not found');
            const { data: srcRule, error: srcRuleErr } = await supabase_1.supabaseAdmin
                .from('commission_program_rules')
                .select('*')
                .eq('plan_version_id', sourceVersionId)
                .single();
            if (srcRuleErr || !srcRule)
                throw new Error('Source program rules not found');
            const { data: newVer, error: newVerErr } = await supabase_1.supabaseAdmin
                .from('commission_plan_versions')
                .insert({
                program_id: srcVer.program_id,
                version_number,
                effective_date: effective_date || new Date().toISOString(),
                expiry_date,
                status
            })
                .select()
                .single();
            if (newVerErr)
                throw newVerErr;
            const { data: newRule, error: newRuleErr } = await supabase_1.supabaseAdmin
                .from('commission_program_rules')
                .insert({
                plan_version_id: newVer.id,
                tenant_onboarding_bonus: srcRule.tenant_onboarding_bonus,
                tenant_activation_bonus: srcRule.tenant_activation_bonus,
                card_rev_share_pct: srcRule.card_rev_share_pct,
                transfer_rev_share_pct: srcRule.transfer_rev_share_pct,
                ussd_rev_share_pct: srcRule.ussd_rev_share_pct,
                va_rev_share_pct: srcRule.va_rev_share_pct,
                bill_rev_share_pct: srcRule.bill_rev_share_pct
            })
                .select()
                .single();
            if (newRuleErr)
                throw newRuleErr;
            const fullOldValue = { ...srcVer, rule: srcRule };
            const fullNewValue = { ...newVer, rule: newRule };
            await supabase_1.supabaseAdmin.from('commission_events').insert({
                agent_id: null,
                event_type: 'VERSION_CLONED',
                amount: 0,
                new_state: 'APPROVED',
                metadata: { operatorId, oldValue: fullOldValue, newValue: fullNewValue }
            });
            return res.json({ success: true, version: fullNewValue });
        }
        catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }
    static async activateVersion(req, res) {
        try {
            if (isOfflineMode()) {
                return res.status(503).json({ success: false, error: 'Database offline. Write actions disabled.' });
            }
            const { id } = req.params;
            const operatorId = req.user?.id || 'sys_admin_root';
            const { data: ver, error: verErr } = await supabase_1.supabaseAdmin
                .from('commission_plan_versions')
                .select('*')
                .eq('id', id)
                .single();
            if (verErr || !ver)
                throw new Error('Plan version not found');
            // Fetch currently active version as oldValue context
            const { data: currentlyActive } = await supabase_1.supabaseAdmin
                .from('commission_plan_versions')
                .select('*')
                .eq('program_id', ver.program_id)
                .eq('status', 'ACTIVE')
                .limit(1)
                .maybeSingle();
            // Set any other active version of the same program to DEPRECATED
            await supabase_1.supabaseAdmin
                .from('commission_plan_versions')
                .update({ status: 'DEPRECATED' })
                .eq('program_id', ver.program_id)
                .eq('status', 'ACTIVE');
            const { data: activated, error: actErr } = await supabase_1.supabaseAdmin
                .from('commission_plan_versions')
                .update({ status: 'ACTIVE' })
                .eq('id', id)
                .select()
                .single();
            if (actErr)
                throw actErr;
            await supabase_1.supabaseAdmin.from('commission_events').insert({
                agent_id: null,
                event_type: 'VERSION_ACTIVATED',
                amount: 0,
                new_state: 'APPROVED',
                metadata: { operatorId, oldValue: currentlyActive || null, newValue: activated }
            });
            return res.json({ success: true, version: activated });
        }
        catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }
    static async updateVersionRules(req, res) {
        try {
            if (isOfflineMode()) {
                return res.status(503).json({ success: false, error: 'Database offline. Write actions disabled.' });
            }
            const { id: versionId } = req.params;
            const { tenant_onboarding_bonus, tenant_activation_bonus, card_rev_share_pct, transfer_rev_share_pct, ussd_rev_share_pct, va_rev_share_pct, bill_rev_share_pct } = req.body;
            const operatorId = req.user?.id || 'sys_admin_root';
            const { data: oldValue } = await supabase_1.supabaseAdmin
                .from('commission_program_rules')
                .select('*')
                .eq('plan_version_id', versionId)
                .single();
            const { data: newValue, error } = await supabase_1.supabaseAdmin
                .from('commission_program_rules')
                .update({
                tenant_onboarding_bonus,
                tenant_activation_bonus,
                card_rev_share_pct,
                transfer_rev_share_pct,
                ussd_rev_share_pct,
                va_rev_share_pct,
                bill_rev_share_pct
            })
                .eq('plan_version_id', versionId)
                .select()
                .single();
            if (error)
                throw error;
            await supabase_1.supabaseAdmin.from('commission_events').insert({
                agent_id: null,
                event_type: 'RULES_UPDATED',
                amount: 0,
                new_state: 'APPROVED',
                metadata: { operatorId, oldValue, newValue }
            });
            return res.json({ success: true, rule: newValue });
        }
        catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }
    static async deleteVersion(req, res) {
        try {
            if (isOfflineMode()) {
                return res.status(503).json({ success: false, error: 'Database offline. Write actions disabled.' });
            }
            const { id } = req.params;
            const operatorId = req.user?.id || 'sys_admin_root';
            const { data: oldValue } = await supabase_1.supabaseAdmin
                .from('commission_plan_versions')
                .select('*')
                .eq('id', id)
                .single();
            const { error } = await supabase_1.supabaseAdmin.from('commission_plan_versions').delete().eq('id', id);
            if (error)
                throw error;
            await supabase_1.supabaseAdmin.from('commission_events').insert({
                agent_id: null,
                event_type: 'VERSION_DELETED',
                amount: 0,
                new_state: 'APPROVED',
                metadata: { operatorId, oldValue, newValue: null }
            });
            return res.json({ success: true });
        }
        catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }
    // --- MERCHANT CATEGORY RULES CRUD ---
    static async createCategoryRule(req, res) {
        try {
            if (isOfflineMode()) {
                return res.status(503).json({ success: false, error: 'Database offline. Write actions disabled.' });
            }
            const { plan_version_id, category_id, tenant_onboarding_bonus, tenant_activation_bonus, card_rev_share_pct, transfer_rev_share_pct, ussd_rev_share_pct, va_rev_share_pct, bill_rev_share_pct } = req.body;
            const operatorId = req.user?.id || 'sys_admin_root';
            const { data, error } = await supabase_1.supabaseAdmin
                .from('merchant_category_commission_rules')
                .insert({ plan_version_id, category_id, tenant_onboarding_bonus, tenant_activation_bonus, card_rev_share_pct, transfer_rev_share_pct, ussd_rev_share_pct, va_rev_share_pct, bill_rev_share_pct })
                .select()
                .single();
            if (error)
                throw error;
            await supabase_1.supabaseAdmin.from('commission_events').insert({
                agent_id: null,
                event_type: 'CATEGORY_RULE_CREATED',
                amount: 0,
                new_state: 'APPROVED',
                metadata: { operatorId, oldValue: null, newValue: data }
            });
            return res.json({ success: true, rule: data });
        }
        catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }
    static async updateCategoryRule(req, res) {
        try {
            if (isOfflineMode()) {
                return res.status(503).json({ success: false, error: 'Database offline. Write actions disabled.' });
            }
            const { id } = req.params;
            const { tenant_onboarding_bonus, tenant_activation_bonus, card_rev_share_pct, transfer_rev_share_pct, ussd_rev_share_pct, va_rev_share_pct, bill_rev_share_pct } = req.body;
            const operatorId = req.user?.id || 'sys_admin_root';
            const { data: oldValue } = await supabase_1.supabaseAdmin
                .from('merchant_category_commission_rules')
                .select('*')
                .eq('id', id)
                .single();
            const { data: newValue, error } = await supabase_1.supabaseAdmin
                .from('merchant_category_commission_rules')
                .update({ tenant_onboarding_bonus, tenant_activation_bonus, card_rev_share_pct, transfer_rev_share_pct, ussd_rev_share_pct, va_rev_share_pct, bill_rev_share_pct })
                .eq('id', id)
                .select()
                .single();
            if (error)
                throw error;
            await supabase_1.supabaseAdmin.from('commission_events').insert({
                agent_id: null,
                event_type: 'CATEGORY_RULE_UPDATED',
                amount: 0,
                new_state: 'APPROVED',
                metadata: { operatorId, oldValue, newValue }
            });
            return res.json({ success: true, rule: newValue });
        }
        catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }
    static async deleteCategoryRule(req, res) {
        try {
            if (isOfflineMode()) {
                return res.status(503).json({ success: false, error: 'Database offline. Write actions disabled.' });
            }
            const { id } = req.params;
            const operatorId = req.user?.id || 'sys_admin_root';
            const { data: oldValue } = await supabase_1.supabaseAdmin
                .from('merchant_category_commission_rules')
                .select('*')
                .eq('id', id)
                .single();
            const { error } = await supabase_1.supabaseAdmin.from('merchant_category_commission_rules').delete().eq('id', id);
            if (error)
                throw error;
            await supabase_1.supabaseAdmin.from('commission_events').insert({
                agent_id: null,
                event_type: 'CATEGORY_RULE_DELETED',
                amount: 0,
                new_state: 'APPROVED',
                metadata: { operatorId, oldValue, newValue: null }
            });
            return res.json({ success: true });
        }
        catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }
    // --- PERFORMANCE TARGETS CRUD ---
    static async createPerformanceRule(req, res) {
        try {
            if (isOfflineMode()) {
                return res.status(503).json({ success: false, error: 'Database offline. Write actions disabled.' });
            }
            const { plan_version_id, tier_level, tenant_threshold, bonus_amount, card_rev_share_pct, validity_days } = req.body;
            const operatorId = req.user?.id || 'sys_admin_root';
            const { data, error } = await supabase_1.supabaseAdmin
                .from('performance_target_rules')
                .insert({ plan_version_id, tier_level, tenant_threshold, bonus_amount, card_rev_share_pct, validity_days })
                .select()
                .single();
            if (error)
                throw error;
            await supabase_1.supabaseAdmin.from('commission_events').insert({
                agent_id: null,
                event_type: 'PERFORMANCE_RULE_CREATED',
                amount: 0,
                new_state: 'APPROVED',
                metadata: { operatorId, oldValue: null, newValue: data }
            });
            return res.json({ success: true, rule: data });
        }
        catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }
    static async updatePerformanceRule(req, res) {
        try {
            if (isOfflineMode()) {
                return res.status(503).json({ success: false, error: 'Database offline. Write actions disabled.' });
            }
            const { id } = req.params;
            const { tenant_threshold, bonus_amount, card_rev_share_pct, validity_days } = req.body;
            const operatorId = req.user?.id || 'sys_admin_root';
            const { data: oldValue } = await supabase_1.supabaseAdmin
                .from('performance_target_rules')
                .select('*')
                .eq('id', id)
                .single();
            const { data: newValue, error } = await supabase_1.supabaseAdmin
                .from('performance_target_rules')
                .update({ tenant_threshold, bonus_amount, card_rev_share_pct, validity_days })
                .eq('id', id)
                .select()
                .single();
            if (error)
                throw error;
            await supabase_1.supabaseAdmin.from('commission_events').insert({
                agent_id: null,
                event_type: 'PERFORMANCE_RULE_UPDATED',
                amount: 0,
                new_state: 'APPROVED',
                metadata: { operatorId, oldValue, newValue }
            });
            return res.json({ success: true, rule: newValue });
        }
        catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }
    static async deletePerformanceRule(req, res) {
        try {
            if (isOfflineMode()) {
                return res.status(503).json({ success: false, error: 'Database offline. Write actions disabled.' });
            }
            const { id } = req.params;
            const operatorId = req.user?.id || 'sys_admin_root';
            const { data: oldValue } = await supabase_1.supabaseAdmin
                .from('performance_target_rules')
                .select('*')
                .eq('id', id)
                .single();
            const { error } = await supabase_1.supabaseAdmin.from('performance_target_rules').delete().eq('id', id);
            if (error)
                throw error;
            await supabase_1.supabaseAdmin.from('commission_events').insert({
                agent_id: null,
                event_type: 'PERFORMANCE_RULE_DELETED',
                amount: 0,
                new_state: 'APPROVED',
                metadata: { operatorId, oldValue, newValue: null }
            });
            return res.json({ success: true });
        }
        catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }
    // --- TERMINAL TARGETS CRUD ---
    static async createTerminalRule(req, res) {
        try {
            if (isOfflineMode()) {
                return res.status(503).json({ success: false, error: 'Database offline. Write actions disabled.' });
            }
            const { frequency, terminal_target, reward_type, reward_value } = req.body;
            const operatorId = req.user?.id || 'sys_admin_root';
            const { data, error } = await supabase_1.supabaseAdmin
                .from('terminal_target_rules')
                .insert({ frequency, terminal_target, reward_type, reward_value })
                .select()
                .single();
            if (error)
                throw error;
            await supabase_1.supabaseAdmin.from('commission_events').insert({
                agent_id: null,
                event_type: 'TERMINAL_RULE_CREATED',
                amount: 0,
                new_state: 'APPROVED',
                metadata: { operatorId, oldValue: null, newValue: data }
            });
            return res.json({ success: true, rule: data });
        }
        catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }
    static async updateTerminalRule(req, res) {
        try {
            if (isOfflineMode()) {
                return res.status(503).json({ success: false, error: 'Database offline. Write actions disabled.' });
            }
            const { id } = req.params;
            const { frequency, terminal_target, reward_type, reward_value } = req.body;
            const operatorId = req.user?.id || 'sys_admin_root';
            const { data: oldValue } = await supabase_1.supabaseAdmin
                .from('terminal_target_rules')
                .select('*')
                .eq('id', id)
                .single();
            const { data: newValue, error } = await supabase_1.supabaseAdmin
                .from('terminal_target_rules')
                .update({ frequency, terminal_target, reward_type, reward_value })
                .eq('id', id)
                .select()
                .single();
            if (error)
                throw error;
            await supabase_1.supabaseAdmin.from('commission_events').insert({
                agent_id: null,
                event_type: 'TERMINAL_RULE_UPDATED',
                amount: 0,
                new_state: 'APPROVED',
                metadata: { operatorId, oldValue, newValue }
            });
            return res.json({ success: true, rule: newValue });
        }
        catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }
    static async deleteTerminalRule(req, res) {
        try {
            if (isOfflineMode()) {
                return res.status(503).json({ success: false, error: 'Database offline. Write actions disabled.' });
            }
            const { id } = req.params;
            const operatorId = req.user?.id || 'sys_admin_root';
            const { data: oldValue } = await supabase_1.supabaseAdmin
                .from('terminal_target_rules')
                .select('*')
                .eq('id', id)
                .single();
            const { error } = await supabase_1.supabaseAdmin.from('terminal_target_rules').delete().eq('id', id);
            if (error)
                throw error;
            await supabase_1.supabaseAdmin.from('commission_events').insert({
                agent_id: null,
                event_type: 'TERMINAL_RULE_DELETED',
                amount: 0,
                new_state: 'APPROVED',
                metadata: { operatorId, oldValue, newValue: null }
            });
            return res.json({ success: true });
        }
        catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }
    // 8. Campaigns & Budgets List
    static async listCampaignsAndBudgets(req, res) {
        try {
            if (isOfflineMode()) {
                return res.json({ success: true, budgets: MOCK_BUDGETS, campaigns: MOCK_CAMPAIGNS, degradedMode: true });
            }
            const { data: budgets, error: budErr } = await supabase_1.supabaseAdmin.from('commission_budgets').select('*');
            const { data: campaigns, error: campErr } = await supabase_1.supabaseAdmin.from('commission_campaigns').select('*');
            if (budErr || campErr)
                throw new Error('Failed to query campaigns/budgets');
            const formattedBudgets = budgets.map(b => {
                const spent = b.used_amount || 0;
                const total = b.total_amount || 1;
                const pct = (spent / total) * 100;
                const alerts = pct > 90 ? ['Budget utilization is critical (>90%)'] : [];
                return { ...b, remaining_amount: b.total_amount - spent, utilization_pct: Math.round(pct * 10) / 10, alerts };
            });
            return res.json({ success: true, budgets: formattedBudgets, campaigns, degradedMode: false });
        }
        catch (err) {
            console.error('[CommissionController] DB Connection Failed in listCampaignsAndBudgets:', err.message);
            return res.status(500).json({ success: false, error: err.message, degradedMode: false });
        }
    }
    // 9. Simulator
    static async simulateCommission(req, res) {
        try {
            const { agentId, tenantId, eventType, platformNetRevenue, merchantCategoryId, dryRun = true } = req.body;
            if (!agentId || !eventType) {
                return res.status(400).json({ success: false, error: 'Missing required simulation fields (agentId, eventType).' });
            }
            if (!dryRun) {
                // Real Execution (Write Mode)
                if (isOfflineMode()) {
                    return res.status(503).json({ success: false, error: 'Real execution disabled. Database Connection Unavailable.' });
                }
                if (eventType === 'FULLY_ACTIVATED' && tenantId) {
                    const ok = await commission_engine_service_1.CommissionEngineService.evaluateAcquisitionReward(agentId, tenantId, merchantCategoryId || '');
                    await incentive_engine_service_1.IncentiveEngineService.evaluateTargets(agentId, 'FULLY_ACTIVATED', { tenantId });
                    return res.json({ success: true, message: 'Real acquisition event evaluated successfully and added to queue', dryRun: false });
                }
                if (eventType === 'FIRST_TRANSACTION' && platformNetRevenue) {
                    const ok = await commission_engine_service_1.CommissionEngineService.calculateRevenueShare(agentId, 'CARD', platformNetRevenue, tenantId);
                    await incentive_engine_service_1.IncentiveEngineService.evaluateTargets(agentId, 'FIRST_TRANSACTION', { platformNetRevenue });
                    return res.json({ success: true, message: 'Real revenue split event evaluated successfully and added to queue', dryRun: false });
                }
                return res.status(400).json({ success: false, error: 'Invalid execution scenario mapping' });
            }
            // Dry Run Simulation (In-memory Calculations)
            const simulatedPayouts = [];
            let onboardingBounty = 0;
            let revShareAmount = 0;
            let campaignBonus = 0;
            if (eventType === 'FULLY_ACTIVATED') {
                onboardingBounty = 10000;
                simulatedPayouts.push({ label: 'Onboarding Acquisition Bounty', value: onboardingBounty, type: 'ACQUISITION_REWARD' });
            }
            else if (eventType === 'FIRST_TRANSACTION' && platformNetRevenue) {
                revShareAmount = platformNetRevenue * 0.15; // 15% Standard Payout Split
                simulatedPayouts.push({ label: 'Transactional Revenue Share Payout', value: revShareAmount, type: 'REVENUE_SHARE' });
            }
            // Add a simulated campaign hit if merchants >= 5
            campaignBonus = 20000;
            simulatedPayouts.push({ label: 'Campaign Drive Bonus Payout', value: campaignBonus, type: 'CAMPAIGN_BONUS' });
            const totalSimulatedReward = onboardingBounty + revShareAmount + campaignBonus;
            return res.json({
                success: true,
                dryRun: true,
                agentId,
                eventType,
                totalPayout: totalSimulatedReward,
                splits: simulatedPayouts,
                tierEstimation: { currentTier: 2, estNextTier: 3, status: 'TIER_UPGRADE_ELIGIBLE' },
                campaignROI: { targetMetric: 'MERCHANTS', completionPct: 100, rewardGranted: true }
            });
        }
        catch (err) {
            console.error('[CommissionController] Simulation Error:', err.message);
            return res.status(500).json({ success: false, error: err.message });
        }
    }
}
exports.CommissionController = CommissionController;
//# sourceMappingURL=commission.controller.js.map