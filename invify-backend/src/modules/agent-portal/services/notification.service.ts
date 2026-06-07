import { notificationRepository } from '../repositories/notification.repository';
export class NotificationService {
  async list(agentId: string, unreadOnly: boolean) { return notificationRepository.list(agentId, unreadOnly); }
  async markRead(id: string) { return notificationRepository.markRead(id); }
}
export const notificationService = new NotificationService();
