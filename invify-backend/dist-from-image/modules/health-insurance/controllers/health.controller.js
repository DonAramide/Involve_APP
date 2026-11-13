"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthController = void 0;
const health_report_service_1 = require("../services/health-report.service");
const health_settings_service_1 = require("../services/health-settings.service");
const health_plan_service_1 = require("../services/health-plan.service");
const health_member_service_1 = require("../services/health-member.service");
const health_guardian_service_1 = require("../services/health-guardian.service");
const health_enrolment_service_1 = require("../services/health-enrolment.service");
const health_billing_service_1 = require("../services/health-billing.service");
const health_claim_service_1 = require("../services/health-claim.service");
const sandbox_adapter_1 = require("../adapters/sandbox.adapter");
class HealthController {
    // ─── Dashboard Overview ───────────────────────────────────────────
    static async getOverview(req, res) {
        try {
            const data = await health_report_service_1.HealthReportService.getOverviewMetrics(req.healthContext);
            return res.status(200).json(data);
        }
        catch (err) {
            return res.status(500).json({ error: { message: err?.message || 'Failed to load metrics' } });
        }
    }
    // ─── Settings ─────────────────────────────────────────────────────
    static async getSettings(req, res) {
        try {
            const data = await health_settings_service_1.HealthSettingsService.getSettings(req.healthContext);
            return res.status(200).json(data);
        }
        catch (err) {
            return res.status(500).json({ error: { message: err?.message } });
        }
    }
    static async updateSettings(req, res) {
        try {
            const data = await health_settings_service_1.HealthSettingsService.updateSettings(req.healthContext, req.body);
            return res.status(200).json(data);
        }
        catch (err) {
            return res.status(400).json({ error: { message: err?.message } });
        }
    }
    // ─── Providers & Plans ───────────────────────────────────────────
    static async listProviders(req, res) {
        try {
            const data = await health_plan_service_1.HealthPlanService.listProviders();
            return res.status(200).json({ data });
        }
        catch (err) {
            return res.status(500).json({ error: { message: err?.message } });
        }
    }
    static async listPlans(req, res) {
        try {
            const data = await health_plan_service_1.HealthPlanService.listPlans(req.query.providerId);
            return res.status(200).json({ data });
        }
        catch (err) {
            return res.status(500).json({ error: { message: err?.message } });
        }
    }
    static async listTenantOffers(req, res) {
        try {
            const data = await health_plan_service_1.HealthPlanService.listTenantOffers(req.healthContext);
            return res.status(200).json({ data });
        }
        catch (err) {
            return res.status(500).json({ error: { message: err?.message } });
        }
    }
    static async configureTenantOffer(req, res) {
        try {
            const data = await health_plan_service_1.HealthPlanService.configureTenantOffer(req.healthContext, req.body);
            return res.status(201).json(data);
        }
        catch (err) {
            return res.status(400).json({ error: { message: err?.message } });
        }
    }
    static async listFacilities(req, res) {
        try {
            const data = await health_plan_service_1.HealthPlanService.listFacilities({
                state: req.query.state,
                planId: req.query.planId
            });
            return res.status(200).json({ data });
        }
        catch (err) {
            return res.status(500).json({ error: { message: err?.message } });
        }
    }
    // ─── Members ──────────────────────────────────────────────────────
    static async listMembers(req, res) {
        try {
            const result = await health_member_service_1.HealthMemberService.listMembers(req.healthContext, {
                category: req.query.category,
                search: req.query.search,
                page: req.query.page ? parseInt(req.query.page, 10) : 1,
                limit: req.query.limit ? parseInt(req.query.limit, 10) : 20
            });
            return res.status(200).json(result);
        }
        catch (err) {
            return res.status(500).json({ error: { message: err?.message } });
        }
    }
    static async enrolStudent(req, res) {
        try {
            const { studentId, cohortLabel } = req.body;
            if (!studentId)
                return res.status(400).json({ error: { message: 'studentId is required' } });
            const data = await health_member_service_1.HealthMemberService.enrolStudentMember(req.healthContext, studentId, cohortLabel);
            return res.status(201).json(data);
        }
        catch (err) {
            return res.status(400).json({ error: { message: err?.message } });
        }
    }
    static async enrolStaff(req, res) {
        try {
            const data = await health_member_service_1.HealthMemberService.enrolStaffMember(req.healthContext, req.body);
            return res.status(201).json(data);
        }
        catch (err) {
            return res.status(400).json({ error: { message: err?.message } });
        }
    }
    // ─── Guardians ────────────────────────────────────────────────────
    static async inviteGuardian(req, res) {
        try {
            const data = await health_guardian_service_1.HealthGuardianService.inviteGuardian(req.healthContext, req.body);
            return res.status(201).json(data);
        }
        catch (err) {
            return res.status(400).json({ error: { message: err?.message } });
        }
    }
    static async acceptGuardianInvitation(req, res) {
        try {
            const user = req.user;
            const { token } = req.body;
            if (!token)
                return res.status(400).json({ error: { message: 'Invitation token is required' } });
            const data = await health_guardian_service_1.HealthGuardianService.acceptInvitation(user.id, token);
            return res.status(200).json(data);
        }
        catch (err) {
            return res.status(400).json({ error: { message: err?.message } });
        }
    }
    static async verifyGuardianRelationship(req, res) {
        try {
            const data = await health_guardian_service_1.HealthGuardianService.verifyRelationship(req.healthContext, req.params.linkId, req.body);
            return res.status(200).json(data);
        }
        catch (err) {
            return res.status(400).json({ error: { message: err?.message } });
        }
    }
    static async listGuardianChildren(req, res) {
        try {
            const user = req.user;
            const data = await health_guardian_service_1.HealthGuardianService.listGuardianChildren(user.id);
            return res.status(200).json({ children: data });
        }
        catch (err) {
            return res.status(500).json({ error: { message: err?.message } });
        }
    }
    // ─── Enrolments & Policies ────────────────────────────────────────
    static async listEnrolments(req, res) {
        try {
            const result = await health_enrolment_service_1.HealthEnrolmentService.listEnrolments(req.healthContext, {
                status: req.query.status,
                memberId: req.query.memberId,
                page: req.query.page ? parseInt(req.query.page, 10) : 1,
                limit: req.query.limit ? parseInt(req.query.limit, 10) : 20
            });
            return res.status(200).json(result);
        }
        catch (err) {
            return res.status(500).json({ error: { message: err?.message } });
        }
    }
    static async createEnrolment(req, res) {
        try {
            const data = await health_enrolment_service_1.HealthEnrolmentService.createEnrolment(req.healthContext, req.body);
            return res.status(201).json(data);
        }
        catch (err) {
            return res.status(400).json({ error: { message: err?.message } });
        }
    }
    static async verifyEnrolment(req, res) {
        try {
            const data = await health_enrolment_service_1.HealthEnrolmentService.verifyEnrolment(req.healthContext, req.params.id, req.body);
            return res.status(200).json(data);
        }
        catch (err) {
            return res.status(400).json({ error: { message: err?.message } });
        }
    }
    static async simulateSandboxActivation(req, res) {
        try {
            const data = await health_enrolment_service_1.HealthEnrolmentService.simulateSandboxActivation(req.healthContext, req.params.id);
            return res.status(200).json(data);
        }
        catch (err) {
            return res.status(400).json({ error: { message: err?.message } });
        }
    }
    // ─── Billing & Payments ───────────────────────────────────────────
    static async issueInvoice(req, res) {
        try {
            const data = await health_billing_service_1.HealthBillingService.issuePremiumInvoice(req.healthContext, req.body);
            return res.status(201).json(data);
        }
        catch (err) {
            return res.status(400).json({ error: { message: err?.message } });
        }
    }
    static async initiatePayment(req, res) {
        try {
            const data = await health_billing_service_1.HealthBillingService.initiatePayment(req.healthContext, req.params.invoiceId, req.body);
            return res.status(200).json(data);
        }
        catch (err) {
            return res.status(400).json({ error: { message: err?.message } });
        }
    }
    static async confirmPayment(req, res) {
        try {
            const { paymentId, invoiceId, quasarReference } = req.body;
            const data = await health_billing_service_1.HealthBillingService.processPaymentConfirmation(req.healthContext.tenantId, paymentId, invoiceId, quasarReference);
            return res.status(200).json(data);
        }
        catch (err) {
            return res.status(400).json({ error: { message: err?.message } });
        }
    }
    // ─── Claims ───────────────────────────────────────────────────────
    static async listClaims(req, res) {
        try {
            const data = await health_claim_service_1.HealthClaimService.listClaims(req.healthContext, req.query.policyId);
            return res.status(200).json({ data });
        }
        catch (err) {
            return res.status(500).json({ error: { message: err?.message } });
        }
    }
    static async lookupClaim(req, res) {
        try {
            const data = await health_claim_service_1.HealthClaimService.lookupClaimStatus(req.healthContext, req.params.reference);
            return res.status(200).json(data);
        }
        catch (err) {
            return res.status(500).json({ error: { message: err?.message } });
        }
    }
    // ─── Provider Webhook Ingress ─────────────────────────────────────
    static async handleProviderWebhook(req, res) {
        try {
            const sandbox = new sandbox_adapter_1.SandboxHealthProviderAdapter();
            const rawBody = JSON.stringify(req.body);
            const isSigValid = sandbox.verifyWebhookSignature(rawBody, req.headers);
            if (!isSigValid) {
                return res.status(401).json({ error: 'Invalid provider signature' });
            }
            return res.status(200).json({ received: true, status: 'processed' });
        }
        catch (err) {
            return res.status(400).json({ error: err?.message || 'Webhook processing failed' });
        }
    }
}
exports.HealthController = HealthController;
//# sourceMappingURL=health.controller.js.map