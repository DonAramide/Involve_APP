"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const rbac_middleware_1 = require("../middleware/rbac.middleware");
(0, vitest_1.describe)('Backend API Permission Validation', () => {
    (0, vitest_1.it)('allows access when user has required permission', () => {
        const req = {
            user: {
                permissions: ['tenant.wallet.view']
            }
        };
        const res = {
            status: vitest_1.vi.fn().mockReturnThis(),
            json: vitest_1.vi.fn()
        };
        const next = vitest_1.vi.fn();
        const middleware = (0, rbac_middleware_1.checkTenantPermission)('tenant.wallet.view');
        middleware(req, res, next);
        (0, vitest_1.expect)(next).toHaveBeenCalled();
        (0, vitest_1.expect)(res.status).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)('blocks access when user lacks required permission', () => {
        const req = {
            user: {
                permissions: ['tenant.reports.view']
            }
        };
        const res = {
            status: vitest_1.vi.fn().mockReturnThis(),
            json: vitest_1.vi.fn()
        };
        const next = vitest_1.vi.fn();
        const middleware = (0, rbac_middleware_1.checkTenantPermission)('tenant.wallet.view');
        middleware(req, res, next);
        (0, vitest_1.expect)(next).not.toHaveBeenCalled();
        (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(403);
        (0, vitest_1.expect)(res.json).toHaveBeenCalledWith({ error: 'Forbidden: Missing required tenant permission.' });
    });
});
//# sourceMappingURL=api-permission.spec.js.map