"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantBillingController = void 0;
const supabase_1 = require("../db/supabase");
const tenant_billing_engine_1 = require("../modules/tenant-billing/tenant-billing.engine");
const tenant_billing_runtime_1 = require("../modules/tenant-billing/tenant-billing.runtime");
const gov_audit_service_1 = require("../services/gov-audit.service");
const maker_checker_service_1 = require("../services/maker-checker.service");
const notify_1 = require("../modules/tenant-billing/notify");
async function tenantNameById(ids) {
    const unique = [...new Set(ids.map((id) => String(id || '').trim()).filter(Boolean))];
    const names = new Map();
    if (!unique.length)
        return names;
    try {
        let rows = null;
        const first = await supabase_1.supabaseAdmin.from('tenants').select('id, name, business_name').in('id', unique);
        if (first.error && /business_name/i.test(first.error.message)) {
            const retry = await supabase_1.supabaseAdmin.from('tenants').select('id, name').in('id', unique);
            rows = (retry.data || []);
        }
        else {
            rows = (first.data || []);
        }
        for (const row of rows || []) {
            const label = String(row.business_name || row.name || '').trim();
            if (label)
                names.set(String(row.id), label);
        }
    }
    catch {
        // Memory/local tests still return billing rows without a name lookup.
    }
    return names;
}
function withTenantName(row, names) {
    const tenantId = String(row?.tenantId || '');
    return { ...row, tenantName: names.get(tenantId) || tenantId };
}
function actor(req) {
    const user = req.user || {};
    return {
        id: user.id || 'unknown',
        email: user.email || 'unknown',
        role: String(user.role || ''),
        ip: String(req.headers?.['x-forwarded-for'] || '').split(',')[0]?.trim()
            || req.socket?.remoteAddress
            || req.ip
            || 'maker-checker',
    };
}
function kobo(body, field = 'amountKobo') {
    if (body?.[field] != null)
        return Number(body[field]);
    if (body?.amountNaira != null)
        return (0, tenant_billing_engine_1.nairaStringToKobo)(String(body.amountNaira));
    throw new tenant_billing_engine_1.BillingInvariantError('amountKobo or amountNaira is required');
}
function nairaLabel(body) {
    try {
        const amount = kobo(body);
        const [whole, frac = '00'] = (0, tenant_billing_engine_1.koboToNairaString)(amount).split('.');
        const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return `₦${grouped}.${frac}`;
    }
    catch {
        return String(body?.amountNaira || body?.amountKobo || '');
    }
}
function fail(res, err) {
    const status = err?.code === 'TENANT_ISOLATION' ? 403 : err?.code === 'ONGOING_PLAN' ? 409 : 400;
    return res.status(status).json({ success: false, error: err?.message || 'Billing error', code: err?.code });
}
class TenantBillingController {
    static service() {
        return (0, tenant_billing_runtime_1.getTenantBillingService)();
    }
    static async ready() {
        const svc = (0, tenant_billing_runtime_1.getTenantBillingService)();
        await svc.store.hydrate();
        return svc;
    }
    static async overview(_req, res) {
        const svc = await TenantBillingController.ready();
        return res.json({ success: true, data: svc.overview() });
    }
    static async accounts(_req, res) {
        const svc = await TenantBillingController.ready();
        const rows = [...svc.store.accounts.values()];
        const names = await tenantNameById(rows.map((r) => r.tenantId));
        return res.json({ success: true, data: rows.map((r) => withTenantName(r, names)) });
    }
    static async ensureAccount(req, res) {
        try {
            const tenantId = String(req.body.tenantId || '');
            if (!tenantId)
                return res.status(400).json({ error: 'tenantId required' });
            const svc = await TenantBillingController.ready();
            const account = svc.ensureAccount(tenantId, req.body.currency || 'NGN');
            await svc.store.persistEntities();
            return res.json({ success: true, data: account });
        }
        catch (e) {
            return fail(res, e);
        }
    }
    static async obligations(req, res) {
        const tenantId = req.query.tenantId ? String(req.query.tenantId) : null;
        const svc = await TenantBillingController.ready();
        const rows = [...svc.store.obligations.values()].filter((o) => !tenantId || o.tenantId === tenantId);
        const names = await tenantNameById(rows.map((r) => r.tenantId));
        return res.json({ success: true, data: rows.map((r) => withTenantName(r, names)) });
    }
    static async createObligation(req, res) {
        try {
            const svc = await TenantBillingController.ready();
            const data = svc.createObligation({
                tenantId: req.body.tenantId,
                type: req.body.type,
                description: req.body.description,
                grossAmountKobo: kobo(req.body, 'grossAmountKobo'),
                dueDate: req.body.dueDate,
                deviceId: req.body.deviceId,
                actor: actor(req),
            });
            await svc.store.persistEntities();
            await gov_audit_service_1.GovAuditService.logAction({
                module: 'FINANCIAL',
                action: 'CREATE_OBLIGATION',
                user_email: actor(req).email,
                ip_address: actor(req).ip || '',
                target: data.id,
                tenant_id: data.tenantId,
                metadata: { type: data.type, grossAmountKobo: data.grossAmountKobo },
            });
            return res.status(201).json({ success: true, data });
        }
        catch (e) {
            return fail(res, e);
        }
    }
    static async createPlan(req, res) {
        try {
            const svc = await TenantBillingController.ready();
            svc.assertCanCreateDevicePlan(req.body.tenantId);
            const held = await (0, maker_checker_service_1.holdForSupportApproval)(req, res, {
                domain: 'tenant_billing',
                action: 'create_plan',
                target: `plan:${req.body.tenantId}`,
                summary: `Create installment plan for tenant ${req.body.tenantId}`,
                body: req.body || {},
            });
            if (held)
                return;
            const data = svc.createDeviceInstallmentPlan({
                tenantId: req.body.tenantId,
                deviceId: req.body.deviceId,
                description: req.body.description || 'Invify Box installment',
                purchasePriceKobo: kobo(req.body, 'purchasePriceKobo'),
                downPaymentKobo: Number(req.body.downPaymentKobo || 0),
                installmentKobo: kobo(req.body, 'installmentKobo'),
                firstDueDate: req.body.firstDueDate,
                serialNumber: req.body.serialNumber,
                actor: actor(req),
            });
            await svc.store.persistEntities();
            return res.status(201).json({ success: true, data });
        }
        catch (e) {
            return fail(res, e);
        }
    }
    static async createSubscription(req, res) {
        try {
            const svc = await TenantBillingController.ready();
            const data = svc.createSubscription({
                tenantId: req.body.tenantId,
                planName: req.body.planName,
                amountKobo: kobo(req.body),
                nextDue: req.body.nextDue,
                actor: actor(req),
            });
            await svc.store.persistEntities();
            return res.status(201).json({ success: true, data });
        }
        catch (e) {
            return fail(res, e);
        }
    }
    static async previewPayment(req, res) {
        try {
            const svc = await TenantBillingController.ready();
            const data = svc.previewPayment({
                tenantId: req.body.tenantId,
                obligationId: req.body.obligationId,
                installmentId: req.body.installmentId,
                amountKobo: kobo(req.body),
                allowFutureWhileOverdue: !!req.body.allowFutureWhileOverdue,
            });
            return res.json({ success: true, data });
        }
        catch (e) {
            return fail(res, e);
        }
    }
    static async postPayment(req, res) {
        try {
            const svc = await TenantBillingController.ready();
            if (!req.body.tenantId)
                throw new tenant_billing_engine_1.BillingInvariantError('tenantId is required');
            kobo(req.body);
            const names = await tenantNameById([req.body.tenantId]);
            const tenantLabel = names.get(String(req.body.tenantId)) || req.body.tenantId;
            const held = await (0, maker_checker_service_1.holdForSupportApproval)(req, res, {
                domain: 'tenant_billing',
                action: 'post_payment',
                target: `payment:${req.body.tenantId}:${req.body.reference || req.body.idempotencyKey || 'new'}`,
                summary: `Post ${nairaLabel(req.body)} payment for ${tenantLabel}`,
                body: req.body || {},
            });
            if (held) {
                void (0, notify_1.notifyTenantBillingPayment)({
                    tenantId: req.body.tenantId,
                    stage: 'submitted',
                    amountLabel: nairaLabel(req.body),
                    reference: req.body.reference,
                });
                return;
            }
            const result = await svc.postPayment({
                tenantId: req.body.tenantId,
                amountKobo: kobo(req.body),
                method: req.body.method,
                reference: req.body.reference,
                paymentDate: req.body.paymentDate,
                notes: req.body.notes,
                obligationId: req.body.obligationId,
                installmentId: req.body.installmentId,
                idempotencyKey: req.body.idempotencyKey,
                confirm: req.body.confirm !== false,
                actor: actor(req),
                allowFutureWhileOverdue: !!req.body.allowFutureWhileOverdue,
            });
            await gov_audit_service_1.GovAuditService.logAction({
                module: 'FINANCIAL',
                action: result.duplicate ? 'POST_PAYMENT_IDEMPOTENT' : 'POST_PAYMENT',
                user_email: actor(req).email,
                ip_address: actor(req).ip || '',
                target: result.payment.id,
                tenant_id: result.payment.tenantId,
                metadata: {
                    reference: result.payment.reference,
                    amountKobo: result.payment.amountKobo,
                    method: result.payment.method,
                },
            });
            void (0, notify_1.notifyTenantBillingPayment)({
                tenantId: result.payment.tenantId,
                stage: 'posted',
                amountKobo: result.payment.amountKobo,
                reference: result.payment.reference,
            });
            return res.status(result.duplicate ? 200 : 201).json({ success: true, data: result });
        }
        catch (e) {
            return fail(res, e);
        }
    }
    static async reversePayment(req, res) {
        try {
            const svc = await TenantBillingController.ready();
            const data = await svc.reversePaymentRemote({
                paymentId: req.params.id,
                tenantId: req.body.tenantId,
                reason: req.body.reason || 'reversal',
                actor: actor(req),
            });
            await gov_audit_service_1.GovAuditService.logAction({
                module: 'FINANCIAL',
                action: 'REVERSE_PAYMENT',
                user_email: actor(req).email,
                ip_address: actor(req).ip || '',
                target: req.params.id,
                tenant_id: req.body.tenantId,
                metadata: { reason: req.body.reason },
            });
            return res.json({ success: true, data });
        }
        catch (e) {
            return fail(res, e);
        }
    }
    static async tenantProfile(req, res) {
        const svc = await TenantBillingController.ready();
        const data = svc.tenantProfile(req.params.tenantId);
        const names = await tenantNameById([req.params.tenantId]);
        return res.json({
            success: true,
            data: { ...data, tenantName: names.get(String(req.params.tenantId)) || req.params.tenantId },
        });
    }
    static async reports(req, res) {
        const kind = String(req.query.kind || 'outstanding');
        const tenantId = req.query.tenantId ? String(req.query.tenantId) : undefined;
        const svc = await TenantBillingController.ready();
        return res.json({ success: true, data: svc.reports(kind, { tenantId }) });
    }
    static async overdue(_req, res) {
        const svc = await TenantBillingController.ready();
        const rows = svc.reports('overdue');
        const names = await tenantNameById(rows.map((r) => r.tenantId));
        return res.json({ success: true, data: rows.map((r) => withTenantName(r, names)) });
    }
    static async payments(req, res) {
        const tenantId = req.query.tenantId ? String(req.query.tenantId) : undefined;
        const svc = await TenantBillingController.ready();
        const rows = svc.reports('payments', { tenantId });
        const names = await tenantNameById(rows.map((r) => r.tenantId));
        return res.json({ success: true, data: rows.map((r) => withTenantName(r, names)) });
    }
    static async installments(req, res) {
        const tenantId = req.query.tenantId ? String(req.query.tenantId) : undefined;
        const svc = await TenantBillingController.ready();
        const rows = svc.reports('installments', { tenantId });
        const names = await tenantNameById(rows.map((r) => r.tenantId));
        return res.json({ success: true, data: rows.map((r) => withTenantName(r, names)) });
    }
}
exports.TenantBillingController = TenantBillingController;
//# sourceMappingURL=tenant-billing.controller.js.map