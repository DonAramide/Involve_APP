"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const controller_1 = require("../api/controller");
describe('FinancialPlatformController', () => {
    let controller;
    let req;
    let res;
    beforeEach(() => {
        controller = new controller_1.FinancialPlatformController();
        req = {
            body: { tenantId: 'tenant-123' },
            user: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });
    // Note: These tests assume we mock the db client inside controller or inject it.
    // For brevity, we simulate the logic here as pseudo-tests based on the controller's implementation.
    it('should reject if tenantId is missing or undefined', async () => {
        req.body.tenantId = 'undefined';
        await controller.activate(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Valid tenantId is required' });
    });
    // Idempotency tests would mock the db.getConnection()
    // if (existing.status === PROVISIONING) -> expect(res.status).toHaveBeenCalledWith(202)
    // if (existing.status === ACTIVE) -> expect(res.status).toHaveBeenCalledWith(200)
    // if (existing.status === DEGRADED) -> expect(res.status).toHaveBeenCalledWith(409)
});
//# sourceMappingURL=controller.spec.js.map