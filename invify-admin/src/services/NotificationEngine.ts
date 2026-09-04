import { ref } from 'vue';
import { logger } from './logger';
import { readAccessToken } from '../auth/session';

class NotificationEngineService {
  private notifications = ref<any[]>([]);

  constructor() {
    this.fetchNotifications();
  }

  private async fetchNotifications() {
    try {
      const response = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${readAccessToken() || ''}` }
      });
      if (response.ok) {
        const payload = await response.json();
        const rows = Array.isArray(payload) ? payload : (payload?.data || []);
        this.notifications.value = (Array.isArray(rows) ? rows : []).map((n: any) => ({
          ...n,
          // Normalize backend fields for UI helpers
          status: n.is_read === true || n.status === 'Read' ? 'Read' : 'Unread',
          priority: n.priority || 'MEDIUM',
        }));
        this.notifySubscribers();
      }
    } catch (error) {
      logger.error('Failed to fetch notifications from API', error);
    }
  }

  async send(payload: any) {
    try {
      // Backend does not expose a generic /send endpoint; keep best-effort no-op path.
      const response = await fetch('/api/notifications', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${readAccessToken() || ''}`
        },
      });
      if (response.ok) {
        logger.info('Notification refresh after send request');
        await this.fetchNotifications();
      } else {
        logger.error('Failed to send notification via API', payload);
      }
    } catch (error) {
      logger.error('Failed to send notification via API', error);
    }
  }
  private subscribers: Set<Function> = new Set();

  subscribe(callback: Function) {
    this.subscribers.add(callback);
    callback(this.notifications.value);
  }

  unsubscribe(callback: Function) {
    this.subscribers.delete(callback);
  }

  private notifySubscribers() {
    for (const callback of this.subscribers) {
      callback(this.notifications.value);
    }
  }

  getUnreadCount(): number {
    return this.notifications.value.filter(n => n.status === 'Unread').length;
  }

  hasCriticalUnread(): boolean {
    return this.notifications.value.some(n => n.status === 'Unread' && n.priority === 'CRITICAL');
  }
}

export const NotificationEngine = new NotificationEngineService();
