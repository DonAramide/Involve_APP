import { ref } from 'vue';
import { logger } from './logger';

export type WorkflowState = 'Active' | 'Draft' | 'Paused' | 'Disabled' | 'Testing';

export interface WorkflowDefinition {
  workflowId: string;
  name: string;
  description?: string;
  triggerType: string;
  state: WorkflowState;
  actions: string[];
  executionCount: number;
  lastExecutedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

class WorkflowAutomationEngineService {
  private workflows = ref<WorkflowDefinition[]>([]);
  private seq = 3;

  constructor() {
    this.seedLocalCatalog();
    void this.fetchWorkflows();
  }

  private seedLocalCatalog() {
    const now = new Date().toISOString();
    this.workflows.value = [
      {
        workflowId: 'WF-2026-001',
        name: 'Auto-Freeze High Risk Wallets',
        description: 'Freeze wallet and notify risk when fraud score breaches threshold.',
        triggerType: 'Fraud Event',
        state: 'Active',
        actions: ['Freeze Wallet', 'Generate Notification', 'Create Case'],
        executionCount: 18,
        lastExecutedAt: new Date(Date.now() - 3600000).toISOString(),
        createdAt: now,
        updatedAt: now,
      },
      {
        workflowId: 'WF-2026-002',
        name: 'Settlement Escalation Matrix',
        description: 'Escalate settlement SLA breaches to treasury and open an incident.',
        triggerType: 'Settlement Event',
        state: 'Paused',
        actions: ['Escalate SLA', 'Open Incident'],
        executionCount: 7,
        lastExecutedAt: new Date(Date.now() - 7200000).toISOString(),
        createdAt: now,
        updatedAt: now,
      },
      {
        workflowId: 'WF-2026-003',
        name: 'KYC Expiration Reminder',
        description: 'Create compliance case when tenant KYC window expires.',
        triggerType: 'Compliance Event',
        state: 'Draft',
        actions: ['Create Case', 'Create SLA'],
        executionCount: 0,
        lastExecutedAt: null,
        createdAt: now,
        updatedAt: now,
      },
    ];
  }

  private async fetchWorkflows() {
    try {
      const token =
        localStorage.getItem('invify_token') ||
        localStorage.getItem('supabase_token') ||
        '';
      const response = await fetch('/api/v1/workflows', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) return;
      const payload = await response.json();
      const rows = Array.isArray(payload) ? payload : payload?.workflows || payload?.data;
      if (Array.isArray(rows) && rows.length > 0) {
        this.workflows.value = rows;
      }
    } catch (error) {
      // Local catalog remains available when the workflows API is not deployed yet.
      logger.error('Failed to fetch workflows from API', error);
    }
  }

  getWorkflows(): WorkflowDefinition[] {
    return this.workflows.value;
  }

  createWorkflow(input: {
    name: string;
    triggerType?: string;
    actions?: string[];
    description?: string;
    state?: WorkflowState;
  }): WorkflowDefinition {
    const now = new Date().toISOString();
    this.seq += 1;
    const workflow: WorkflowDefinition = {
      workflowId: `WF-2026-${String(this.seq).padStart(3, '0')}`,
      name: input.name || 'Untitled Workflow',
      description: input.description || '',
      triggerType: input.triggerType || 'System Event',
      state: input.state || 'Draft',
      actions: Array.isArray(input.actions) ? [...input.actions] : [],
      executionCount: 0,
      lastExecutedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.workflows.value = [workflow, ...this.workflows.value];
    return workflow;
  }

  toggleState(workflowId: string, newState: WorkflowState): WorkflowDefinition | null {
    const target = this.workflows.value.find((w) => w.workflowId === workflowId);
    if (!target) return null;
    target.state = newState;
    target.updatedAt = new Date().toISOString();
    this.workflows.value = [...this.workflows.value];
    return target;
  }
}

export const WorkflowAutomationEngine = new WorkflowAutomationEngineService();
