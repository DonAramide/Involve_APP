/**
 * INVIFY — Workflow Automation Engine Unit Test Suite
 * Task 4 / Phase 6.2 Automated Tests
 *
 * Maps to UAT scenarios: UAT-WF-01, UAT-WF-02
 */

jest.mock('vue', () => ({ ref: (v) => ({ value: v }) }))


import { WorkflowAutomationEngine } from '../invify-admin/src/services/WorkflowAutomationEngine'

function createTestWorkflow(overrides = {}) {
  return WorkflowAutomationEngine.createWorkflow({
    name: 'Test Workflow — Fraud Event',
    description: 'Triggers when fraud score > 80',
    triggerType: 'Fraud Event',
    conditions: ['Risk Score > 80'],
    actions: ['Freeze Wallet', 'Generate Notification'],
    ...overrides,
  })
}

describe('WorkflowAutomationEngine — Creation', () => {

  test('UAT-WF-01 | createWorkflow returns Draft with executionCount 0', () => {
    const wf = createTestWorkflow()
    expect(wf.state).toBe('Draft')
    expect(wf.executionCount).toBe(0)
    expect(wf.lastExecutedAt).toBeNull()
    expect(wf.workflowId).toMatch(/^WF-\d{4}-\d{4}$/)
  })

  test('UAT-WF-01 | conditions and actions are stored', () => {
    const wf = createTestWorkflow()
    expect(wf.conditions).toContain('Risk Score > 80')
    expect(wf.actions).toContain('Freeze Wallet')
    expect(wf.actions).toContain('Generate Notification')
  })

  test('UAT-WF-01 | created workflow appears in getWorkflows()', () => {
    const wf = createTestWorkflow({ name: 'Verify-Appear' })
    const found = WorkflowAutomationEngine.getWorkflows().find(w => w.workflowId === wf.workflowId)
    expect(found).toBeDefined()
  })

  test('UAT-WF-01 | triggerType: Transaction Event', () => {
    expect(createTestWorkflow({ triggerType: 'Transaction Event' }).triggerType).toBe('Transaction Event')
  })

  test('UAT-WF-01 | triggerType: Settlement Event', () => {
    expect(createTestWorkflow({ triggerType: 'Settlement Event' }).triggerType).toBe('Settlement Event')
  })

  test('UAT-WF-01 | triggerType: Compliance Event', () => {
    expect(createTestWorkflow({ triggerType: 'Compliance Event' }).triggerType).toBe('Compliance Event')
  })

  test('UAT-WF-01 | triggerType: Fraud Event', () => {
    expect(createTestWorkflow({ triggerType: 'Fraud Event' }).triggerType).toBe('Fraud Event')
  })
})

describe('WorkflowAutomationEngine — State Transitions', () => {

  test('UAT-WF-02 | Draft → Active', () => {
    const wf = createTestWorkflow()
    WorkflowAutomationEngine.toggleState(wf.workflowId, 'Active')
    const updated = WorkflowAutomationEngine.getWorkflows().find(w => w.workflowId === wf.workflowId)
    expect(updated!.state).toBe('Active')
  })

  test('UAT-WF-02 | Active → Paused', () => {
    const wf = createTestWorkflow()
    WorkflowAutomationEngine.toggleState(wf.workflowId, 'Active')
    WorkflowAutomationEngine.toggleState(wf.workflowId, 'Paused')
    const updated = WorkflowAutomationEngine.getWorkflows().find(w => w.workflowId === wf.workflowId)
    expect(updated!.state).toBe('Paused')
  })

  test('UAT-WF-02 | → Disabled', () => {
    const wf = createTestWorkflow()
    WorkflowAutomationEngine.toggleState(wf.workflowId, 'Disabled')
    const updated = WorkflowAutomationEngine.getWorkflows().find(w => w.workflowId === wf.workflowId)
    expect(updated!.state).toBe('Disabled')
  })

  test('UAT-WF-02 | → Archived', () => {
    const wf = createTestWorkflow()
    WorkflowAutomationEngine.toggleState(wf.workflowId, 'Archived')
    const updated = WorkflowAutomationEngine.getWorkflows().find(w => w.workflowId === wf.workflowId)
    expect(updated!.state).toBe('Archived')
  })

  test('UAT-WF-02 | → Testing', () => {
    const wf = createTestWorkflow()
    WorkflowAutomationEngine.toggleState(wf.workflowId, 'Testing')
    const updated = WorkflowAutomationEngine.getWorkflows().find(w => w.workflowId === wf.workflowId)
    expect(updated!.state).toBe('Testing')
  })
})
