import { ref } from 'vue';
import { logger } from './logger';

class WorkflowAutomationEngineService {
  private workflows = ref<any[]>([]);

  constructor() {
    this.fetchWorkflows();
  }

  private async fetchWorkflows() {
    try {
      const response = await fetch('/api/v1/workflows', {
        headers: { Authorization: `Bearer ${localStorage.getItem('supabase_token')}` }
      });
      if (response.ok) {
        this.workflows.value = await response.json();
      }
    } catch (error) {
      logger.error('Failed to fetch workflows from API', error);
    }
  }
}

export const WorkflowAutomationEngine = new WorkflowAutomationEngineService();
