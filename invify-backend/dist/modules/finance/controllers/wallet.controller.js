"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletController = void 0;
const wallet_service_1 = require("../services/wallet.service");
const supabase_1 = require("../../../db/supabase");
class WalletController {
    static async getWallet(req, res) {
        try {
            const authUserId = req.user?.id;
            if (!authUserId)
                return res.status(401).json({ success: false, message: 'Unauthorized' });
            const data = await wallet_service_1.walletService.getWalletKPIs(authUserId);
            res.status(200).json({ success: true, data });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }
    static async getLedger(req, res) {
        try {
            const authUserId = req.user?.id;
            if (!authUserId)
                return res.status(401).json({ success: false, message: 'Unauthorized' });
            const data = await wallet_service_1.walletService.getLedger(authUserId);
            res.status(200).json({ success: true, data });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }
    static async getCommissions(req, res) {
        try {
            const authUserId = req.user?.id;
            if (!authUserId)
                return res.status(401).json({ success: false, message: 'Unauthorized' });
            const data = await wallet_service_1.walletService.getCommissions(authUserId);
            res.status(200).json({ success: true, data });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }
    static async requestWithdrawal(req, res) {
        try {
            const authUserId = req.user?.id;
            if (!authUserId)
                return res.status(401).json({ success: false, message: 'Unauthorized' });
            // Simulate MFA confirmation
            const { password } = req.body;
            if (!password) {
                return res.status(400).json({ success: false, message: 'Password confirmation required' });
            }
            // Verify password via Supabase Auth
            const { error } = await supabase_1.supabase.auth.signInWithPassword({
                email: req.user.email,
                password: password
            });
            if (error) {
                return res.status(401).json({ success: false, message: 'Invalid password' });
            }
            const data = await wallet_service_1.walletService.requestWithdrawal(authUserId, req.body);
            res.status(200).json({ success: true, data });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }
    static async listWithdrawals(req, res) {
        try {
            const authUserId = req.user?.id;
            if (!authUserId)
                return res.status(401).json({ success: false, message: 'Unauthorized' });
            const data = await wallet_service_1.walletService.getWithdrawals(authUserId);
            res.status(200).json({ success: true, data });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }
    static async addBankAccount(req, res) {
        try {
            const authUserId = req.user?.id;
            if (!authUserId)
                return res.status(401).json({ success: false, message: 'Unauthorized' });
            // Simulate MFA confirmation
            const { password } = req.body;
            if (!password) {
                return res.status(400).json({ success: false, message: 'Password confirmation required' });
            }
            const { error } = await supabase_1.supabase.auth.signInWithPassword({
                email: req.user.email,
                password: password
            });
            if (error) {
                return res.status(401).json({ success: false, message: 'Invalid password' });
            }
            const data = await wallet_service_1.walletService.addBankAccount(authUserId, req.body);
            res.status(200).json({ success: true, data });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }
    static async getBankAccounts(req, res) {
        try {
            const authUserId = req.user?.id;
            if (!authUserId)
                return res.status(401).json({ success: false, message: 'Unauthorized' });
            const data = await wallet_service_1.walletService.getBankAccounts(authUserId);
            res.status(200).json({ success: true, data });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }
}
exports.WalletController = WalletController;
//# sourceMappingURL=wallet.controller.js.map