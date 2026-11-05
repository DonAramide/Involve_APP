"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HmoPortalController = void 0;
const hmo_portal_service_1 = require("../services/hmo-portal.service");
const hmo_excel_exchange_service_1 = require("../services/hmo-excel-exchange.service");
class HmoPortalController {
    static getCtx(req) {
        return req.hmoContext;
    }
    static async getOverview(req, res) {
        try {
            const ctx = HmoPortalController.getCtx(req);
            const data = await hmo_portal_service_1.hmoPortalService.getDashboardOverview(ctx);
            return res.status(200).json({ success: true, data });
        }
        catch (err) {
            return res.status(500).json({ success: false, message: err?.message || 'Failed to load HMO overview' });
        }
    }
    static async getProfile(req, res) {
        try {
            const ctx = HmoPortalController.getCtx(req);
            const data = await hmo_portal_service_1.hmoPortalService.getOrganizationProfile(ctx);
            return res.status(200).json({ success: true, data });
        }
        catch (err) {
            return res.status(500).json({ success: false, message: err?.message || 'Failed to load HMO profile' });
        }
    }
    static async updateProfile(req, res) {
        try {
            const ctx = HmoPortalController.getCtx(req);
            const data = await hmo_portal_service_1.hmoPortalService.updateOrganizationProfile(ctx, req.body || {});
            return res.status(200).json({ success: true, data, message: 'HMO organization profile updated' });
        }
        catch (err) {
            return res.status(400).json({ success: false, message: err?.message || 'Failed to update HMO profile' });
        }
    }
    static async listSchools(req, res) {
        try {
            const ctx = HmoPortalController.getCtx(req);
            const data = await hmo_portal_service_1.hmoPortalService.listSchoolNetwork(ctx);
            return res.status(200).json({ success: true, data });
        }
        catch (err) {
            return res.status(500).json({ success: false, message: err?.message || 'Failed to load school network' });
        }
    }
    static async updateSchoolOnboarding(req, res) {
        try {
            const ctx = HmoPortalController.getCtx(req);
            const { tenantId } = req.params;
            const data = await hmo_portal_service_1.hmoPortalService.updateSchoolOnboarding(ctx, tenantId, req.body || {});
            return res.status(200).json({ success: true, data, message: 'School relationship updated' });
        }
        catch (err) {
            return res.status(400).json({ success: false, message: err?.message || 'Failed to update school relationship' });
        }
    }
    static async listPlans(req, res) {
        try {
            const ctx = HmoPortalController.getCtx(req);
            const data = await hmo_portal_service_1.hmoPortalService.listPlansAndVersions(ctx);
            return res.status(200).json({ success: true, data });
        }
        catch (err) {
            return res.status(500).json({ success: false, message: err?.message || 'Failed to load HMO plans' });
        }
    }
    static async createOrVersionPlan(req, res) {
        try {
            const ctx = HmoPortalController.getCtx(req);
            const data = await hmo_portal_service_1.hmoPortalService.createOrVersionPlan(ctx, req.body || {});
            return res.status(201).json({ success: true, data, message: 'HMO plan version saved' });
        }
        catch (err) {
            return res.status(400).json({ success: false, message: err?.message || 'Failed to save HMO plan' });
        }
    }
    static async updatePlanStatus(req, res) {
        try {
            const ctx = HmoPortalController.getCtx(req);
            const { planId } = req.params;
            const { status } = req.body || {};
            const data = await hmo_portal_service_1.hmoPortalService.updatePlanStatus(ctx, planId, status);
            return res.status(200).json({ success: true, data, message: 'Plan status updated' });
        }
        catch (err) {
            return res.status(400).json({ success: false, message: err?.message || 'Failed to update plan status' });
        }
    }
    static async listEnrollments(req, res) {
        try {
            const ctx = HmoPortalController.getCtx(req);
            const data = await hmo_portal_service_1.hmoPortalService.listEnrollments(ctx, {
                status: req.query.status,
                tenantId: req.query.tenantId,
                planId: req.query.planId,
                search: req.query.search,
            });
            return res.status(200).json({ success: true, data });
        }
        catch (err) {
            return res.status(500).json({ success: false, message: err?.message || 'Failed to load enrollments' });
        }
    }
    static async adjudicateEnrollment(req, res) {
        try {
            const ctx = HmoPortalController.getCtx(req);
            const { id } = req.params;
            const data = await hmo_portal_service_1.hmoPortalService.adjudicateEnrollment(ctx, id, req.body || {});
            return res.status(200).json({ success: true, data, message: `Enrollment ${data.status}` });
        }
        catch (err) {
            return res.status(400).json({ success: false, message: err?.message || 'Failed to adjudicate enrollment' });
        }
    }
    // ─── Excel/CSV Integration Centre ───────────────────────────────────
    static async listExportMappings(req, res) {
        try {
            const ctx = HmoPortalController.getCtx(req);
            const data = await hmo_excel_exchange_service_1.hmoExcelExchangeService.listMappings(ctx.hmoProviderId);
            return res.status(200).json({ success: true, data });
        }
        catch (err) {
            return res.status(500).json({ success: false, message: err?.message || 'Failed to load export mappings' });
        }
    }
    static async saveExportMapping(req, res) {
        try {
            const ctx = HmoPortalController.getCtx(req);
            const data = await hmo_excel_exchange_service_1.hmoExcelExchangeService.saveMapping(ctx.hmoProviderId, ctx.authUserId, req.body || {});
            return res.status(200).json({ success: true, data, message: 'Export mapping template saved' });
        }
        catch (err) {
            return res.status(400).json({ success: false, message: err?.message || 'Failed to save export mapping' });
        }
    }
    static async listBatches(req, res) {
        try {
            const ctx = HmoPortalController.getCtx(req);
            const data = await hmo_portal_service_1.hmoPortalService.listBatches(ctx);
            return res.status(200).json({ success: true, data });
        }
        catch (err) {
            return res.status(500).json({ success: false, message: err?.message || 'Failed to load enrollment batches' });
        }
    }
    static async createBatch(req, res) {
        try {
            const ctx = HmoPortalController.getCtx(req);
            const data = await hmo_portal_service_1.hmoPortalService.createEnrollmentBatch(ctx, req.body || {});
            return res.status(201).json({ success: true, data, message: `Batch ${data.batch_reference} created` });
        }
        catch (err) {
            return res.status(400).json({ success: false, message: err?.message || 'Failed to create enrollment batch' });
        }
    }
    static async exportBatchCsv(req, res) {
        try {
            const ctx = HmoPortalController.getCtx(req);
            const { batchId } = req.params;
            const data = await hmo_portal_service_1.hmoPortalService.exportBatchToCsv(ctx, batchId);
            if (req.query.download === 'true') {
                res.setHeader('Content-Type', 'text/csv; charset=utf-8');
                res.setHeader('Content-Disposition', `attachment; filename="${data.filename}"`);
                return res.status(200).send(data.csv);
            }
            return res.status(200).json({ success: true, data });
        }
        catch (err) {
            return res.status(400).json({ success: false, message: err?.message || 'Failed to export batch CSV' });
        }
    }
    static async reconcileResponseSheet(req, res) {
        try {
            const ctx = HmoPortalController.getCtx(req);
            const { batchId, fileName, csvContent, commit, idempotencyKey } = req.body || {};
            if (!csvContent || typeof csvContent !== 'string') {
                return res.status(400).json({ success: false, message: 'csvContent is required' });
            }
            const data = await hmo_portal_service_1.hmoPortalService.reconcileResponseSheet(ctx, {
                batchId,
                fileName: fileName || 'hmo_response.csv',
                csvContent,
                commit: Boolean(commit),
                idempotencyKey,
            });
            return res.status(200).json({ success: true, data });
        }
        catch (err) {
            return res.status(400).json({ success: false, message: err?.message || 'Failed to reconcile HMO response sheet' });
        }
    }
    // ─── Provider Network ───────────────────────────────────────────────
    static async listFacilities(req, res) {
        try {
            const ctx = HmoPortalController.getCtx(req);
            const data = await hmo_portal_service_1.hmoPortalService.listFacilities(ctx, {
                state: req.query.state,
                search: req.query.search,
            });
            return res.status(200).json({ success: true, data });
        }
        catch (err) {
            return res.status(500).json({ success: false, message: err?.message || 'Failed to load facilities' });
        }
    }
    static async saveFacility(req, res) {
        try {
            const ctx = HmoPortalController.getCtx(req);
            const data = await hmo_portal_service_1.hmoPortalService.saveFacility(ctx, req.body || {});
            return res.status(201).json({ success: true, data, message: 'Facility saved to HMO network' });
        }
        catch (err) {
            return res.status(400).json({ success: false, message: err?.message || 'Failed to save facility' });
        }
    }
    // ─── Pre-Authorization & Claims ─────────────────────────────────────
    static async listClaimsAndPreAuths(req, res) {
        try {
            const ctx = HmoPortalController.getCtx(req);
            const data = await hmo_portal_service_1.hmoPortalService.listClaimsAndPreAuths(ctx, {
                recordType: req.query.recordType,
                status: req.query.status,
            });
            return res.status(200).json({ success: true, data });
        }
        catch (err) {
            return res.status(500).json({ success: false, message: err?.message || 'Failed to load claims/pre-authorizations' });
        }
    }
    static async adjudicateClaimOrPreAuth(req, res) {
        try {
            const ctx = HmoPortalController.getCtx(req);
            const { id } = req.params;
            const data = await hmo_portal_service_1.hmoPortalService.adjudicateClaimOrPreAuth(ctx, id, req.body || {});
            return res.status(200).json({ success: true, data, message: `Record updated to ${data.status}` });
        }
        catch (err) {
            return res.status(400).json({ success: false, message: err?.message || 'Failed to adjudicate record' });
        }
    }
    // ─── Billing & Users/Audit ──────────────────────────────────────────
    static async getBillingSummary(req, res) {
        try {
            const ctx = HmoPortalController.getCtx(req);
            const data = await hmo_portal_service_1.hmoPortalService.getBillingSummary(ctx);
            return res.status(200).json({ success: true, data });
        }
        catch (err) {
            return res.status(500).json({ success: false, message: err?.message || 'Failed to load billing summary' });
        }
    }
    static async listUsersAndAudit(req, res) {
        try {
            const ctx = HmoPortalController.getCtx(req);
            const data = await hmo_portal_service_1.hmoPortalService.listUsersAndAudit(ctx);
            return res.status(200).json({ success: true, data });
        }
        catch (err) {
            return res.status(500).json({ success: false, message: err?.message || 'Failed to load HMO users and audit' });
        }
    }
}
exports.HmoPortalController = HmoPortalController;
//# sourceMappingURL=hmo-portal.controller.js.map