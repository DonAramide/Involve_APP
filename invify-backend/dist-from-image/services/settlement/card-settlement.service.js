"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CardSettlementService = void 0;
const crypto_1 = require("crypto");
const supabase_1 = require("../../db/supabase");
const settlement_file_parser_1 = require("./settlement-file.parser");
const settlement_template_registry_1 = require("./settlement-template.registry");
const settlement_matcher_1 = require("./settlement-matcher");
class CardSettlementService {
    static listTemplates() {
        return settlement_template_registry_1.SETTLEMENT_TEMPLATES;
    }
    static async listBatches(params) {
        let query = supabase_1.supabaseAdmin
            .from('card_settlement_batches')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(params.limit ?? 50);
        if (params.tenantId) {
            query = query.eq('tenant_id', params.tenantId);
        }
        const { data, error } = await query;
        if (error)
            throw new Error(error.message);
        return data ?? [];
    }
    static async getBatchDetails(batchId) {
        const [{ data: batch, error: batchErr }, { data: matches, error: matchErr }] = await Promise.all([
            supabase_1.supabaseAdmin.from('card_settlement_batches').select('*').eq('id', batchId).maybeSingle(),
            supabase_1.supabaseAdmin
                .from('card_settlement_matches')
                .select('*')
                .eq('batch_id', batchId)
                .order('row_index', { ascending: true }),
        ]);
        if (batchErr)
            throw new Error(batchErr.message);
        if (matchErr)
            throw new Error(matchErr.message);
        if (!batch)
            throw new Error('Settlement batch not found');
        return { batch, matches: matches ?? [] };
    }
    static async processUpload(params) {
        const rows = settlement_file_parser_1.SettlementFileParser.parseBuffer(params.buffer, params.templateType);
        if (!rows.length) {
            throw new Error('No settlement rows found in file. Check template type and file format.');
        }
        const fileSha256 = (0, crypto_1.createHash)('sha256').update(params.buffer).digest('hex');
        const { data: priorUpload } = await supabase_1.supabaseAdmin
            .from('card_settlement_batches')
            .select('id, created_at')
            .eq('file_sha256', fileSha256)
            .eq('dry_run', false)
            .maybeSingle();
        if (priorUpload && !params.dryRun) {
            throw new Error(`This settlement file was already uploaded on ${priorUpload.created_at}. Batch: ${priorUpload.id}`);
        }
        const attempts = await this.loadApprovedAttempts(params.tenantId ?? null);
        const matchResults = rows.map((row) => this.matchRow(row, attempts, params.tenantId ?? null));
        const matchedCount = matchResults.filter((m) => m.matchStatus === 'matched').length;
        const unmatchedFileRows = matchResults.filter((m) => m.matchStatus === 'unmatched').length;
        const alreadySettledCount = matchResults.filter((m) => m.matchStatus === 'already_settled').length;
        let batchId = `dry-run-${Date.now()}`;
        if (!params.dryRun) {
            const { data: batch, error: batchError } = await supabase_1.supabaseAdmin
                .from('card_settlement_batches')
                .insert({
                tenant_id: params.tenantId || null,
                template_type: params.templateType,
                file_name: params.fileName,
                file_sha256: fileSha256,
                uploaded_by: params.uploadedBy.id,
                uploaded_by_email: params.uploadedBy.email || null,
                mfa_verified: true,
                status: 'completed',
                total_rows: rows.length,
                matched_count: matchedCount,
                unmatched_file_rows: unmatchedFileRows,
                already_settled_count: alreadySettledCount,
                dry_run: false,
                summary: {
                    templateType: params.templateType,
                    matchedCount,
                    unmatchedFileRows,
                    alreadySettledCount,
                },
            })
                .select('id')
                .single();
            if (batchError || !batch) {
                throw new Error(batchError?.message || 'Failed to create settlement batch');
            }
            batchId = batch.id;
            const matchRows = matchResults.map((m) => ({
                batch_id: batchId,
                pos_attempt_id: m.posAttemptId,
                match_status: m.matchStatus,
                template_type: params.templateType,
                row_index: m.row.rowIndex,
                rrn: m.row.rrn,
                stan: m.row.stan,
                terminal_id: m.row.terminalId,
                amount: m.row.amount,
                auth_code: m.row.authCode,
                settlement_date: m.row.settlementDate,
                raw_row: m.row.rawRow,
                match_reason: m.matchReason,
            }));
            const { error: matchesError } = await supabase_1.supabaseAdmin
                .from('card_settlement_matches')
                .insert(matchRows);
            if (matchesError)
                throw new Error(matchesError.message);
            const toSettle = matchResults.filter((m) => m.matchStatus === 'matched' && m.posAttemptId);
            for (const match of toSettle) {
                const settledAt = match.row.settlementDate
                    ? new Date(match.row.settlementDate).toISOString()
                    : new Date().toISOString();
                const { error: updateError } = await supabase_1.supabaseAdmin
                    .from('pos_transaction_attempts')
                    .update({
                    settlement_status: 'settled',
                    settled_at: settledAt,
                    settlement_batch_id: batchId,
                    settlement_processor: params.templateType,
                    updated_at: new Date().toISOString(),
                })
                    .eq('id', match.posAttemptId)
                    .eq('status', 'Approved');
                if (updateError) {
                    console.error('[CardSettlement] Failed to mark settled:', updateError.message);
                }
            }
            await supabase_1.supabaseAdmin.from('audit_logs').insert({
                module: 'card_settlement',
                action: 'settlement_file_uploaded',
                tenant_id: params.tenantId || null,
                user_email: params.uploadedBy.email || 'admin',
                status: 'SUCCESS',
                metadata: {
                    batchId,
                    fileName: params.fileName,
                    templateType: params.templateType,
                    matchedCount,
                    unmatchedFileRows,
                    alreadySettledCount,
                },
            });
        }
        return {
            batchId,
            dryRun: params.dryRun,
            templateType: params.templateType,
            fileName: params.fileName,
            totalRows: rows.length,
            matchedCount,
            unmatchedFileRows,
            alreadySettledCount,
            matches: matchResults,
        };
    }
    static async loadApprovedAttempts(tenantId) {
        let query = supabase_1.supabaseAdmin
            .from('pos_transaction_attempts')
            .select('id, tenant_id, terminal_id, amount, status, settlement_status, rrn, stan, auth_code')
            .eq('status', 'Approved')
            .order('created_at', { ascending: false })
            .limit(5000);
        if (tenantId) {
            query = query.eq('tenant_id', tenantId);
        }
        const { data, error } = await query;
        if (error)
            throw new Error(error.message);
        return (data ?? []);
    }
    static matchRow(row, attempts, tenantFilter) {
        const candidates = attempts.filter((a) => {
            if (tenantFilter && a.tenant_id !== tenantFilter)
                return false;
            return true;
        });
        const scored = candidates
            .map((attempt) => ({
            attempt,
            score: (0, settlement_matcher_1.scoreSettlementMatch)(row, attempt),
            reason: (0, settlement_matcher_1.buildSettlementMatchReason)(row, attempt),
        }))
            .filter((s) => s.score > 0)
            .sort((a, b) => b.score - a.score);
        if (!scored.length) {
            return {
                row,
                posAttemptId: null,
                matchStatus: 'unmatched',
                matchReason: 'No approved POS attempt matched RRN/STAN/terminal/amount',
            };
        }
        const best = scored[0];
        if (best.attempt.settlement_status === 'settled') {
            return {
                row,
                posAttemptId: best.attempt.id,
                matchStatus: 'already_settled',
                matchReason: best.reason,
            };
        }
        return {
            row,
            posAttemptId: best.attempt.id,
            matchStatus: 'matched',
            matchReason: best.reason,
        };
    }
}
exports.CardSettlementService = CardSettlementService;
//# sourceMappingURL=card-settlement.service.js.map