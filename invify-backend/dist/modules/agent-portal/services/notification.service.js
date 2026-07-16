"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationService = exports.NotificationService = void 0;
const notification_repository_1 = require("../repositories/notification.repository");
class NotificationService {
    async list(agentId, unreadOnly) { return notification_repository_1.notificationRepository.list(agentId, unreadOnly); }
    async markRead(id) { return notification_repository_1.notificationRepository.markRead(id); }
}
exports.NotificationService = NotificationService;
exports.notificationService = new NotificationService();
//# sourceMappingURL=notification.service.js.map