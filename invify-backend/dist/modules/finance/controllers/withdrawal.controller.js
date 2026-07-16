"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WithdrawalController = void 0;
class WithdrawalController {
    static async request(req, res) {
        res.status(201).json({ success: true, message: 'Requested' });
    }
    static async patchStatus(req, res) {
        // Admin reviewing withdrawal
        res.status(200).json({ success: true, message: 'Status updated' });
    }
}
exports.WithdrawalController = WithdrawalController;
//# sourceMappingURL=withdrawal.controller.js.map