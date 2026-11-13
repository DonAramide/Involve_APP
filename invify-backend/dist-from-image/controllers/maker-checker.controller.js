"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MakerCheckerController = void 0;
const maker_checker_service_1 = require("../services/maker-checker.service");
const require_admin_mfa_middleware_1 = require("../middleware/require-admin-mfa.middleware");
function actorEmail(req) {
    return String(req.user?.email || '').trim().toLowerCase();
}
function isPlatform(req) {
    const role = String(req.user?.role || '').toLowerCase();
    return (role === 'super_admin' ||
        role === 'internal_staff' ||
        role === 'admin' ||
        role.startsWith('admin_'));
}
function runCheckerMfa(req, res) {
    return new Promise((resolve) => {
        let done = false;
        const finish = (ok) => {
            if (done)
                return;
            done = true;
            resolve(ok);
        };
        const fakeRes = {
            status(code) {
                res.status(code);
                return fakeRes;
            },
            json(body) {
                res.json(body);
                finish(false);
                return fakeRes;
            },
        };
        (0, require_admin_mfa_middleware_1.requireCheckerMfa)(req, fakeRes, () => finish(true));
    });
}
class MakerCheckerController {
    static async list(req, res) {
        try {
            const domain = String(req.query.domain || '').trim();
            const tenantId = req.user?.tenantId || req.user?.tenant_id || null;
            const userId = String(req.user?.id || '');
            const rows = maker_checker_service_1.MakerCheckerService.list(domain || undefined).filter((row) => {
                if (isPlatform(req))
                    return true;
                return row.maker.tenantId === tenantId || row.maker.id === userId;
            });
            return res.status(200).json(rows.map(maker_checker_service_1.makerCheckerPublicView));
        }
        catch (error) {
            return res.status(500).json({ error: error.message || 'Could not load approvals.' });
        }
    }
    static async approve(req, res) {
        try {
            const pending = maker_checker_service_1.MakerCheckerService.peek(String(req.params.id || ''));
            if (pending?.domain === 'tenant_billing') {
                const ok = await runCheckerMfa(req, res);
                if (!ok)
                    return;
            }
            const result = await maker_checker_service_1.MakerCheckerService.approve(String(req.params.id || ''), actorEmail(req));
            return res.status(200).json(result);
        }
        catch (error) {
            return res.status(error.status || 400).json({ error: error.message || 'Approval failed.' });
        }
    }
    static async reject(req, res) {
        try {
            const pending = maker_checker_service_1.MakerCheckerService.peek(String(req.params.id || ''));
            if (pending?.domain === 'tenant_billing') {
                const ok = await runCheckerMfa(req, res);
                if (!ok)
                    return;
            }
            const result = maker_checker_service_1.MakerCheckerService.reject(String(req.params.id || ''), actorEmail(req));
            return res.status(200).json(result);
        }
        catch (error) {
            return res.status(error.status || 400).json({ error: error.message || 'Rejection failed.' });
        }
    }
}
exports.MakerCheckerController = MakerCheckerController;
//# sourceMappingURL=maker-checker.controller.js.map