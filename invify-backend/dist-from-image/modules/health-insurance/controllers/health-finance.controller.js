"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthFinanceController = void 0;
const health_finance_service_1 = require("../services/health-finance.service");
function handleFinanceMutationError(res, defaultCode, err) {
    if (err.message && err.message.startsWith('RELATIONAL_SCHEMA_PENDING')) {
        return res.status(503).json({
            error: {
                code: 'RELATIONAL_SCHEMA_PENDING',
                message: err.message,
                migrationDependency: '20261018000000_hw_50_profit_sharing.sql'
            }
        });
    }
    return res.status(400).json({
        error: { code: defaultCode, message: err.message }
    });
}
class HealthFinanceController {
    static async getConsolidatedOverview(req, res) {
        try {
            const ctx = req.healthContext;
            const filters = {
                period: req.query.period,
                providerId: req.query.providerId,
                planId: req.query.planId,
                tenantId: req.query.tenantId,
                environment: req.query.environment
            };
            const result = await health_finance_service_1.HealthFinanceService.getConsolidatedOverview(ctx, filters);
            return res.status(200).json({ success: true, data: result });
        }
        catch (err) {
            return res.status(500).json({
                error: { code: 'FINANCE_OVERVIEW_ERROR', message: err.message }
            });
        }
    }
    static async getFinanceDrilldown(req, res) {
        try {
            const ctx = req.healthContext;
            const metric = req.params.metric;
            const result = await health_finance_service_1.HealthFinanceService.getFinanceDrilldown(ctx, metric, req.query);
            return res.status(200).json({ success: true, data: result });
        }
        catch (err) {
            return res.status(400).json({
                error: { code: 'DRILLDOWN_ERROR', message: err.message }
            });
        }
    }
    static async getHmoPerformance(req, res) {
        try {
            const ctx = req.healthContext;
            const filters = {
                period: req.query.period,
                environment: req.query.environment
            };
            const result = await health_finance_service_1.HealthFinanceService.getHmoPerformance(ctx, filters);
            return res.status(200).json({ success: true, data: result });
        }
        catch (err) {
            return res.status(500).json({
                error: { code: 'HMO_PERFORMANCE_ERROR', message: err.message }
            });
        }
    }
    static async getPlanProfitability(req, res) {
        try {
            const ctx = req.healthContext;
            const filters = {
                providerId: req.query.providerId
            };
            const result = await health_finance_service_1.HealthFinanceService.getPlanProfitability(ctx, filters);
            return res.status(200).json({ success: true, data: result });
        }
        catch (err) {
            return res.status(500).json({
                error: { code: 'PLAN_PROFITABILITY_ERROR', message: err.message }
            });
        }
    }
    static async getFinancialTrends(req, res) {
        try {
            const ctx = req.healthContext;
            const result = await health_finance_service_1.HealthFinanceService.getFinancialTrends(ctx, req.query);
            return res.status(200).json({ success: true, data: result });
        }
        catch (err) {
            return res.status(500).json({
                error: { code: 'FINANCIAL_TRENDS_ERROR', message: err.message }
            });
        }
    }
    static async listAgreements(req, res) {
        try {
            const ctx = req.healthContext;
            const status = req.query.status;
            const result = await health_finance_service_1.HealthFinanceService.listAgreements(ctx, status);
            return res.status(200).json({ success: true, data: { agreements: result, total: result.length } });
        }
        catch (err) {
            return res.status(500).json({
                error: { code: 'AGREEMENTS_FETCH_ERROR', message: err.message }
            });
        }
    }
    static async createAgreement(req, res) {
        try {
            const user = req.user;
            const result = await health_finance_service_1.HealthFinanceService.createAgreement({ id: user.id, email: user.email }, req.body);
            return res.status(201).json({ success: true, data: result });
        }
        catch (err) {
            return handleFinanceMutationError(res, 'AGREEMENT_CREATION_ERROR', err);
        }
    }
    static async approveAgreement(req, res) {
        try {
            const user = req.user;
            const { id } = req.params;
            const { checkerNotes } = req.body || {};
            const result = await health_finance_service_1.HealthFinanceService.approveAgreement({ id: user.id, email: user.email }, id, checkerNotes);
            return res.status(200).json({ success: true, data: result });
        }
        catch (err) {
            return handleFinanceMutationError(res, 'AGREEMENT_APPROVAL_ERROR', err);
        }
    }
    static async previewCalculation(req, res) {
        try {
            const ctx = req.healthContext;
            const agreementId = req.query.agreementId;
            const periodKey = req.query.periodKey || '2026-M10';
            if (!agreementId) {
                return res.status(400).json({ error: { code: 'MISSING_PARAM', message: 'agreementId is required' } });
            }
            const result = await health_finance_service_1.HealthFinanceService.previewCalculation(ctx, agreementId, periodKey);
            return res.status(200).json({ success: true, data: result });
        }
        catch (err) {
            return res.status(400).json({
                error: { code: 'CALCULATION_PREVIEW_ERROR', message: err.message }
            });
        }
    }
    static async generateStatement(req, res) {
        try {
            const user = req.user;
            const { agreementId, periodKey } = req.body;
            if (!agreementId || !periodKey) {
                return res.status(400).json({ error: { code: 'MISSING_PARAMS', message: 'agreementId and periodKey are required' } });
            }
            const result = await health_finance_service_1.HealthFinanceService.generateStatement({ id: user.id, email: user.email }, agreementId, periodKey);
            return res.status(201).json({ success: true, data: result });
        }
        catch (err) {
            return handleFinanceMutationError(res, 'STATEMENT_GENERATION_ERROR', err);
        }
    }
    static async listStatements(req, res) {
        try {
            const ctx = req.healthContext;
            const result = await health_finance_service_1.HealthFinanceService.listStatements(ctx, req.query);
            return res.status(200).json({ success: true, data: { statements: result, total: result.length } });
        }
        catch (err) {
            return res.status(500).json({
                error: { code: 'STATEMENTS_FETCH_ERROR', message: err.message }
            });
        }
    }
    static async approveStatement(req, res) {
        try {
            const user = req.user;
            const { id } = req.params;
            const { checkerNotes } = req.body || {};
            const result = await health_finance_service_1.HealthFinanceService.approveStatement({ id: user.id, email: user.email }, id, checkerNotes);
            return res.status(200).json({ success: true, data: result });
        }
        catch (err) {
            return handleFinanceMutationError(res, 'STATEMENT_APPROVAL_ERROR', err);
        }
    }
    static async listSettlements(req, res) {
        try {
            const ctx = req.healthContext;
            const result = await health_finance_service_1.HealthFinanceService.listSettlements(ctx, req.query);
            return res.status(200).json({ success: true, data: { settlements: result, total: result.length } });
        }
        catch (err) {
            return res.status(500).json({
                error: { code: 'SETTLEMENTS_FETCH_ERROR', message: err.message }
            });
        }
    }
    static async reconcileSettlement(req, res) {
        try {
            const user = req.user;
            const { id } = req.params;
            const { externalReference, reconciliationNotes } = req.body;
            const result = await health_finance_service_1.HealthFinanceService.reconcileSettlement({ id: user.id, email: user.email }, id, { externalReference, reconciliationNotes });
            return res.status(200).json({ success: true, data: result });
        }
        catch (err) {
            return handleFinanceMutationError(res, 'SETTLEMENT_RECONCILIATION_ERROR', err);
        }
    }
}
exports.HealthFinanceController = HealthFinanceController;
//# sourceMappingURL=health-finance.controller.js.map