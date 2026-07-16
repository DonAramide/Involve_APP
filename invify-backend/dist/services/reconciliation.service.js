"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReconciliationService = void 0;
// src/services/reconciliation.service.ts
const supabase_1 = require("../db/supabase");
const gov_audit_service_1 = require("./gov-audit.service");
const crypto_1 = __importDefault(require("crypto"));
const EventDispatcher_1 = require("./observability/EventDispatcher");
class ReconciliationService {
    static async getReport(params) {
        const { tenantId, status, cursor, limit = 50 } = params;
        try {
            // Fetch cases from DB (which will be populated by the migration/triggers eventually)
            // Since we just ran a migration but there is no data in `reconciliation_cases` yet,
            // we'll fetch from `reconciliation_cases`. If the table is empty, we return empty stats.
            // We will also return a clean unified model.
            const query = supabase_1.supabase
                .from('reconciliation_cases')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false });
            if (tenantId && tenantId !== 'global') {
                query.eq('tenant_id', tenantId);
            }
            if (status && status !== 'all') {
                query.eq('status', status.toUpperCase());
            }
            // Cursor pagination
            if (cursor) {
                // Parse cursor (format: timestamp_id)
                const [cursorTime, cursorId] = cursor.split('_');
                if (cursorTime && cursorId) {
                    // Equivalent to: WHERE (created_at, id) < (cursorTime, cursorId)
                    // In Supabase/PostgREST: created_at.lt.time OR (created_at.eq.time AND id.lt.id)
                    query.or(`created_at.lt.${cursorTime},and(created_at.eq.${cursorTime},id.lt.${cursorId})`);
                }
            }
            const { data, count, error } = await query.limit(limit);
            if (error && error.code !== '42P01') { // Ignore table not found if migration hasn't run
                throw error;
            }
            const cases = data || [];
            // Calculate summary stats dynamically
            let statsQuery = supabase_1.supabase
                .from('reconciliation_cases')
                .select('status, expected_amount, difference_amount');
            if (tenantId && tenantId !== 'global') {
                statsQuery = statsQuery.eq('tenant_id', tenantId);
            }
            const { data: allStats, error: statsError } = await statsQuery;
            let summary = {
                totalPayments: 0,
                matched: 0,
                unmatched: 0,
                issues: 0,
                mismatchAmount: 0,
                reconciliationRate: 100.0
            };
            if (!statsError && allStats) {
                summary.totalPayments = allStats.length;
                summary.matched = allStats.filter(c => c.status === 'MATCHED').length;
                summary.unmatched = allStats.filter(c => c.status === 'PENDING').length;
                summary.issues = allStats.filter(c => ['MISMATCH', 'FAILED', 'ESCALATED', 'INVESTIGATING'].includes(c.status)).length;
                allStats.filter(c => c.status === 'MISMATCH').forEach(c => {
                    summary.mismatchAmount += Math.abs(Number(c.difference_amount) || 0);
                });
                if (summary.totalPayments > 0) {
                    summary.reconciliationRate = Number(((summary.matched / summary.totalPayments) * 100).toFixed(1));
                }
            }
            return {
                summary,
                data: cases.map(c => ({
                    id: c.case_number,
                    txnId: c.transaction_reference,
                    ledgerBatchId: c.ledger_batch_id,
                    expectedAmount: c.expected_amount,
                    actualAmount: c.actual_amount,
                    difference: c.difference_amount,
                    status: c.status,
                    riskScore: c.risk_score,
                    createdDate: c.created_at
                })),
                pagination: {
                    total: count || 0,
                    limit,
                    nextCursor: cases.length === limit ? `${cases[cases.length - 1].created_at}_${cases[cases.length - 1].id}` : null
                }
            };
        }
        catch (error) {
            console.error('[ReconciliationService] getReport error:', error);
            throw error;
        }
    }
    // ==== Detail Subtabs ====
    static async getDetails(caseNumber, tenantId) {
        const { data, error } = await supabase_1.supabase
            .from('reconciliation_cases')
            .select('*')
            .eq('case_number', caseNumber)
            .eq('tenant_id', tenantId)
            .single();
        if (error || !data)
            throw new Error('Reconciliation case not found');
        return { status: 'OK', data };
    }
    static async getLedger(caseNumber, tenantId) {
        const { data: recon } = await supabase_1.supabase.from('reconciliation_cases').select('transaction_reference').eq('case_number', caseNumber).eq('tenant_id', tenantId).single();
        if (!recon)
            throw new Error('Case not found');
        const { data: ledgers } = await supabase_1.supabase.from('ledgers').select('*').eq('reference', recon.transaction_reference).eq('tenant_id', tenantId);
        if (!ledgers || ledgers.length === 0) {
            return { status: 'NO_DATA', message: 'No associated ledger entries found.' };
        }
        return { status: 'OK', data: ledgers };
    }
    static async getSettlement(caseNumber, tenantId) {
        const { data: recon } = await supabase_1.supabase.from('reconciliation_cases').select('settlement_batch_id').eq('case_number', caseNumber).eq('tenant_id', tenantId).single();
        if (!recon?.settlement_batch_id) {
            return { status: 'NOT_CONFIGURED', message: 'Settlement matching not yet configured for this flow.' };
        }
        return { status: 'OK', data: { batchId: recon.settlement_batch_id } };
    }
    static async getWallet(caseNumber, tenantId) {
        return { status: 'NOT_CONFIGURED', message: 'Wallet telemetry subtab not yet configured.' };
    }
    static async getCard(caseNumber, tenantId) {
        return { status: 'NOT_CONFIGURED', message: 'Card Network integration not yet configured.' };
    }
    static async getBank(caseNumber, tenantId) {
        return { status: 'NOT_CONFIGURED', message: 'Direct bank node integration not yet configured.' };
    }
    static async getAudit(caseNumber, tenantId) {
        const { data } = await supabase_1.supabase
            .from('audit_logs')
            .select('*')
            .eq('target', caseNumber)
            .eq('tenant_id', tenantId)
            .order('timestamp', { ascending: false });
        return { status: 'OK', data: data || [] };
    }
    static async getTimeline(caseNumber, tenantId) {
        const { data: recon } = await supabase_1.supabase.from('reconciliation_cases').select('id').eq('case_number', caseNumber).eq('tenant_id', tenantId).single();
        if (!recon)
            throw new Error('Case not found');
        const { data: timeline } = await supabase_1.supabase
            .from('reconciliation_timeline')
            .select('*')
            .eq('case_id', recon.id)
            .order('timestamp', { ascending: true });
        if (!timeline || timeline.length === 0) {
            return { status: 'NO_DATA', message: 'No timeline events found.' };
        }
        return { status: 'OK', data: timeline };
    }
    // ==== Commands ====
    static async executeCommand(caseNumber, command, payload, user, tenantId) {
        const { data: recon } = await supabase_1.supabase.from('reconciliation_cases').select('*').eq('case_number', caseNumber).eq('tenant_id', tenantId).single();
        if (!recon)
            throw new Error('Reconciliation case not found or unauthorized');
        const expectedVersion = payload.version || recon.version || 1;
        const previousStatus = recon.status;
        let newStatus = previousStatus;
        let updateData = {
            updated_at: new Date().toISOString(),
            version: expectedVersion + 1
        };
        switch (command) {
            case 'ASSIGN':
                updateData.assigned_to = payload.assigneeId;
                updateData.status = 'INVESTIGATING';
                newStatus = 'INVESTIGATING';
                break;
            case 'ESCALATE':
                updateData.status = 'ESCALATED';
                updateData.severity = 'CRITICAL';
                newStatus = 'ESCALATED';
                break;
            case 'RESOLVE':
            case 'FORCE_MATCH':
                updateData.status = 'MATCHED';
                updateData.resolved_by = user.id || null;
                updateData.resolved_at = new Date().toISOString();
                newStatus = 'MATCHED';
                break;
            case 'RETRY':
                updateData.status = 'PENDING';
                newStatus = 'PENDING';
                break;
            case 'LOCK':
                updateData.fraud_flags = [...(recon.fraud_flags || []), 'ADMIN_LOCKED'];
                break;
            case 'UNLOCK':
                updateData.fraud_flags = (recon.fraud_flags || []).filter((f) => f !== 'ADMIN_LOCKED');
                break;
            default:
                throw new Error('Unknown command');
        }
        // Optimistic Concurrency DB Update
        const { data: updatedRows, error } = await supabase_1.supabase
            .from('reconciliation_cases')
            .update(updateData)
            .eq('case_number', caseNumber)
            .eq('tenant_id', tenantId)
            .eq('version', expectedVersion)
            .select();
        if (error)
            throw error;
        if (!updatedRows || updatedRows.length === 0) {
            throw new Error('Concurrency Error: The case was modified by another transaction. Please refresh and try again.');
        }
        const correlationId = crypto_1.default.randomUUID();
        // Append to Timeline
        await supabase_1.supabase.from('reconciliation_timeline').insert({
            case_id: recon.id,
            stage: newStatus,
            description: `Command ${command} executed by operator.`,
            source_system: 'QUASAR',
            metadata: { correlationId, operator: user.email }
        });
        // Log to Audit
        await gov_audit_service_1.GovAuditService.logAction({
            id: crypto_1.default.randomUUID(),
            timestamp: new Date().toISOString(),
            module: 'FINANCIAL',
            action: `RECONCILIATION_${command}`,
            user_email: user.email || 'system@invify.app',
            user_name: user.name || 'System',
            ip_address: payload.ip || '0.0.0.0',
            location: 'System',
            target: caseNumber,
            status: 'success',
            metadata: {
                correlationId,
                previousStatus,
                newStatus,
                reason: payload.reason || 'Admin Command Execution',
                permissionUsed: `reconciliation.${command.toLowerCase()}`
            }
        });
        // Publish Domain Event (Transport-Agnostic)
        EventDispatcher_1.EventDispatcher.publish('ReconciliationStatusChanged', {
            tenantId,
            caseNumber,
            command,
            previousStatus,
            newStatus,
            operator: user.email,
            correlationId
        });
        // Emit Operational Metric
        console.log(`[Metrics] count#reconciliation.commands=${command} tenant=${tenantId}`);
        return { success: true, caseNumber, newStatus, correlationId };
    }
}
exports.ReconciliationService = ReconciliationService;
//# sourceMappingURL=reconciliation.service.js.map