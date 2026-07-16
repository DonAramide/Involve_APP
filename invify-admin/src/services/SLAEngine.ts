import { ref } from 'vue';
import { logger } from './logger';

export interface SLAEvent {
  entityId: string;
  entityType: string;
  entityReference: string;
  module: string;
  category: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  assignedTo: string;
}

class SLAEngineService {
  private slas = ref<any[]>([]);

  constructor() {
    this.fetchSLAs();
  }

  private async fetchSLAs() {
    try {
      const response = await fetch('/api/v1/slas', {
        headers: { Authorization: `Bearer ${localStorage.getItem('supabase_token')}` }
      });
      if (response.ok) {
        this.slas.value = await response.json();
      }
    } catch (error) {
      logger.error('Failed to fetch SLAs from API', error);
    }
  }

  async track(event: SLAEvent) {
    try {
      const response = await fetch('/api/v1/slas/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('supabase_token')}`
        },
        body: JSON.stringify(event)
      });
      if (response.ok) {
        logger.info(`SLA Tracked for ${event.entityId}`);
        await this.fetchSLAs();
      }
    } catch (error) {
      logger.error('Failed to track SLA via API', error);
    }
  }
}

export const SLAEngine = new SLAEngineService();
