"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancialPlatformController = void 0;
const activation_state_machine_1 = require("../activation/activation-state-machine");
// Mock DB client
const db = {
    getConnection: async (tenantId) => {
        // Simulated DB fetch
        return null;
    }
};
class FinancialPlatformController {
    async activate(req, res) {
        const tenantId = req.body.tenantId || req.user?.tenantId;
        if (!tenantId || tenantId === 'undefined' || tenantId === 'null') {
            res.status(400).json({ error: 'Valid tenantId is required' });
            return;
        }
        try {
            // Idempotency Check
            const existingConnection = await db.getConnection(tenantId);
            if (existingConnection) {
                switch (existingConnection.status) {
                    case activation_state_machine_1.ConnectionStatus.PROVISIONING:
                        res.status(202).json({
                            message: 'Activation already in progress',
                            provisioningToken: existingConnection.provisioning_token
                        });
                        return;
                    case activation_state_machine_1.ConnectionStatus.ACTIVE:
                        res.status(200).json({
                            message: 'Financial platform is already active',
                            status: activation_state_machine_1.ConnectionStatus.ACTIVE
                        });
                        return;
                    case activation_state_machine_1.ConnectionStatus.DEGRADED:
                        res.status(409).json({
                            error: 'Connection is degraded. Please use Test Connection or Rotate Credentials.'
                        });
                        return;
                    // For UNPROVISIONED, SUSPENDED, DEACTIVATED, we might proceed or have specific logic.
                    // For now, if UNPROVISIONED, we can proceed to enqueue.
                }
            }
            // Generate a provisioning token
            const provisioningToken = `FPA-${new Date().toISOString().replace(/\D/g, '').slice(0, 8)}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
            // Enqueue job (Simulated)
            // await queue.add('financial-platform-activation', { tenantId, provisioningToken });
            res.status(202).json({
                message: 'Activation accepted and queued',
                provisioningToken,
                jobId: 'simulated-job-id'
            });
        }
        catch (error) {
            res.status(500).json({ error: 'Internal server error during activation' });
        }
    }
}
exports.FinancialPlatformController = FinancialPlatformController;
//# sourceMappingURL=controller.js.map