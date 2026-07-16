"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationController = void 0;
const notification_service_1 = require("../services/notification.service");
class NotificationController {
    static async list(req, res) {
        try {
            const agentId = req.user?.id;
            res.status(200).json({ success: true, data: await notification_service_1.notificationService.list(agentId, req.query.unreadOnly === 'true') });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }
    static async markRead(req, res) {
        try {
            res.status(200).json({ success: true, data: await notification_service_1.notificationService.markRead(req.params.id) });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }
}
exports.NotificationController = NotificationController;
//# sourceMappingURL=notification.controller.js.map