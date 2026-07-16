import { ref } from 'vue';
import { logger } from './logger';

class NotificationEngineService {
  private notifications = ref<any[]>([]);

  constructor() {
    this.fetchNotifications();
  }

  private async fetchNotifications() {
    try {
      const response = await fetch('/api/v1/notifications', {
        headers: { Authorization: `Bearer ${localStorage.getItem('supabase_token')}` }
      });
      if (response.ok) {
        this.notifications.value = await response.json();
        this.notifySubscribers();
      }
    } catch (error) {
      logger.error('Failed to fetch notifications from API', error);
    }
  }

  async send(payload: any) {
    try {
      const response = await fetch('/api/v1/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('supabase_token')}`
        },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        logger.info('Notification sent successfully');
        await this.fetchNotifications();
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
