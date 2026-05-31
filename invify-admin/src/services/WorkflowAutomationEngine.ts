// invify-admin/src/services/WorkflowAutomationEngine.ts

import { ref } from 'vue'

export type WorkflowState = 'Draft' | 'Active' | 'Paused' | 'Disabled' | 'Testing' | 'Archived'

export interface WorkflowDefinition {
  workflowId: string
  name: string
  description: string
  state: WorkflowState
  triggerType: string
  conditions: string[]
  actions: string[]
  createdBy: string
  createdAt: string
  lastExecutedAt: string | null
  executionCount: number
}

class WorkflowAutomationService {
  private workflows = ref<WorkflowDefinition[]>([])

  constructor() {
    this.seedMockData()
  }

  private seedMockData() {
    this.workflows.value = [
      {
        workflowId: 'WF-2026-001',
        name: 'Auto-Freeze High Risk Wallets',
        description: 'Triggers a wallet freeze if fraud score > 90 and triggers a compliance review.',
        state: 'Active',
        triggerType: 'Fraud Event',
        conditions: ['Risk Score > 90', 'Wallet Balance > 50000'],
        actions: ['Freeze Wallet', 'Generate Notification', 'Create SLA'],
        createdBy: 'admin_risk@invify.app',
        createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
        lastExecutedAt: new Date(Date.now() - 3600000).toISOString(),
        executionCount: 142
      },
      {
        workflowId: 'WF-2026-002',
        name: 'Settlement Escalation Matrix',
        description: 'Escalates settlement delays over 30 mins to treasury leadership.',
        state: 'Active',
        triggerType: 'Settlement Event',
        conditions: ['Time Window > 30m', 'Settlement Value > 10M'],
        actions: ['Escalate SLA', 'Generate Notification', 'Open Incident'],
        createdBy: 'admin_treasury@invify.app',
        createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
        lastExecutedAt: new Date(Date.now() - 7200000).toISOString(),
        executionCount: 45
      },
      {
        workflowId: 'WF-2026-003',
        name: 'Dormant Tenant Reactivation',
        description: 'Sends email hooks when tenant is dormant for 90 days.',
        state: 'Paused',
        triggerType: 'Tenant Event',
        conditions: ['Time Window > 90d'],
        actions: ['Generate Notification', 'Create Case'],
        createdBy: 'admin_deploy@invify.app',
        createdAt: new Date().toISOString(),
        lastExecutedAt: null,
        executionCount: 0
      }
    ]
  }

  getWorkflows() {
    return this.workflows.value
  }

  toggleState(workflowId: string, newState: WorkflowState) {
    const wf = this.workflows.value.find(w => w.workflowId === workflowId)
    if (wf) {
      wf.state = newState
    }
  }

  createWorkflow(payload: Partial<WorkflowDefinition>) {
    const newWf: WorkflowDefinition = {
      workflowId: `WF-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      name: payload.name || 'Untitled Workflow',
      description: payload.description || '',
      state: 'Draft',
      triggerType: payload.triggerType || 'Transaction Event',
      conditions: payload.conditions || [],
      actions: payload.actions || [],
      createdBy: 'current_user@invify.app',
      createdAt: new Date().toISOString(),
      lastExecutedAt: null,
      executionCount: 0
    }
    this.workflows.value.unshift(newWf)
    return newWf
  }
}

export const WorkflowAutomationEngine = new WorkflowAutomationService()
