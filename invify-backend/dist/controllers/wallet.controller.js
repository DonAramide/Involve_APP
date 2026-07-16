"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletController = void 0;
const wallet_service_1 = require("../services/wallet.service");
class WalletController {
    /**
     * GET /wallet
     * Returns current balance for the authenticated tenant.
     */
    static async getBalance(req, res) {
        try {
            // tenantId comes from Auth middleware context
            const tenantId = req.user?.tenantId;
            if (!tenantId) {
                return res.status(401).json({ error: "Unauthorized: Tenant context missing" });
            }
            const balanceInfo = await wallet_service_1.WalletService.getBalance(tenantId);
            return res.status(200).json(balanceInfo);
        }
        catch (error) {
            console.error('[WalletController] getBalance Error:', error.message);
            return res.status(500).json({ error: "Failed to retrieve wallet balance" });
        }
    }
    /**
     * GET /wallet/transactions
     * Returns transaction history for the authenticated tenant.
     */
    static async getTransactions(req, res) {
        try {
            const tenantId = req.user?.tenantId;
            if (!tenantId) {
                return res.status(401).json({ error: "Unauthorized: Tenant context missing" });
            }
            const { startDate, endDate, status } = req.query;
            const transactions = await wallet_service_1.WalletService.getTransactions(tenantId, { startDate, endDate, status });
            return res.status(200).json({
                tenantId,
                count: transactions.length,
                transactions
            });
        }
        catch (error) {
            console.error('[WalletController] getTransactions Error:', error.message);
            return res.status(500).json({ error: "Failed to retrieve transactions" });
        }
    }
}
exports.WalletController = WalletController;
//# sourceMappingURL=wallet.controller.js.map