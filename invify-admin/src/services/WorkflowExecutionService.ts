// invify-admin/src/services/WorkflowExecutionService.ts

export interface ExecutionRecord {
  executionId: string
  workflowId: string
  workflowName: string
  triggeredBy: string
  executionStatus: 'Success' | 'Failed' | 'Running' | 'Retrying'
  executionTimeMs: number
  actionsCompleted: number
  totalActions: number
  executedAt: string
}

class ExecutionService {
  private history: ExecutionRecord[] = []

  constructor() {
    this.seedMockData()
  }

  private seedMockData() {
    this.history = [
      {
        executionId: 'EXEC-99120',
        workflowId: 'WF-2026-001',
        workflowName: 'Auto-Freeze High Risk Wallets',
        triggeredBy: 'Fraud Event (CAS-8812)',
        executionStatus: 'Success',
        executionTimeMs: 142,
        actionsCompleted: 3,
        totalActions: 3,
        executedAt: new Date(Date.now() - 3600000).toISOString()
      },
      {
        executionId: 'EXEC-99119',
        workflowId: 'WF-2026-002',
        workflowName: 'Settlement Escalation Matrix',
        triggeredBy: 'SLA Breached (SET-GTB-411)',
        executionStatus: 'Failed',
        executionTimeMs: 1800,
        actionsCompleted: 1,
        totalActions: 3,
        executedAt: new Date(Date.now() - 7200000).toISOString()
      }
    ]
  }

  getHistory() {
    return this.history
  }
  
  getMetrics() {
    const total = this.history.length
    const success = this.history.filter(h => h.executionStatus === 'Success').length
    const failed = this.history.filter(h => h.executionStatus === 'Failed').length
    
    return {
      successRate: total > 0 ? Math.round((success / total) * 100) : 100,
      totalFailures: failed,
      healthScore: total > 0 ? Math.round((success / total) * 100) : 100
    }
  }

  // Future: executeWorkflow(workflowId, payload)
}

export const WorkflowExecutionService = new ExecutionService()
