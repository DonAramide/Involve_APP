import { ref } from 'vue';
import { logger } from './logger';

class ExecutiveAlertEngineService {
  private alerts = ref<any[]>([]);

  constructor() {
    this.fetchAlerts();
  }

  private async fetchAlerts() {
    try {
      const response = await fetch('/api/v1/executive/alerts', {
        headers: { Authorization: `Bearer ${localStorage.getItem('supabase_token')}` }
      });
      if (response.ok) {
        this.alerts.value = await response.json();
      }
    } catch (error) {
      logger.error('Failed to fetch executive alerts from API', error);
    }
  }
}

export const ExecutiveAlertEngine = new ExecutiveAlertEngineService();
