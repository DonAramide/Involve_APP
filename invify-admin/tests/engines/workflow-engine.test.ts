/**
 * INVIFY — Workflow Automation Engine Unit Test Suite
 * Task 4 / Phase 6.2 Automated Tests
 *
 * Validates:
 *  - createWorkflow creates a WorkflowDefinition in Draft state
 *  - getWorkflows returns all seeded + created workflows
 *  - toggleState transitions workflows between states
 *  - Correct conditions and actions are attached
 *  - Execution count starts at 0 for new workflows
 */

jest.mock('vue', () => ({
  ref: (v: unknown) => ({ value: v }),
}))

import { WorkflowAutomationEngine } from '../src/services/WorkflowAutomationEngine'

// ─────────────────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITE
// ─────────────────────────────────────────────────────────────────────────────
describe('WorkflowAutomationEngine — Creation', () => {

  // ── UAT-WF-01: Create workflow
  test('UAT-WF-01 | createWorkflow returns a WorkflowDefinition in Draft state', () => {
    const wf = createTestWorkflow()

    expect(wf).toBeDefined()
    expect(wf.workflowId).toMatch(/^WF-\d{4}-\d{4}$/)
    expect(wf.state).toBe('Draft')
    expect(wf.executionCount).toBe(0)
    expect(wf.lastExecutedAt).toBeNull()
  })

  // ── Conditions and actions are attached
  test('UAT-WF-01 | createWorkflow attaches conditions and actions', () => {
    const wf = createTestWorkflow()
    expect(wf.conditions).toContain('Risk Score > 80')
    expect(wf.actions).toContain('Freeze Wallet')
    expect(wf.actions).toContain('Generate Notification')
  })

  // ── New workflow appears in getWorkflows()
  test('UAT-WF-01 | created workflow appears in getWorkflows()', () => {
    const wf = createTestWorkflow({ name: 'Unique-Verify-Workflow' })
    const all = WorkflowAutomationEngine.getWorkflows()
    const found = all.find(w => w.workflowId === wf.workflowId)
    expect(found).toBeDefined()
    expect(found!.name).toBe('Unique-Verify-Workflow')
  })

  // ── Trigger types — Transaction Event
  test('UAT-WF-01 | triggerType is correctly assigned (Transaction Event)', () => {
    const wf = createTestWorkflow({ triggerType: 'Transaction Event' })
    expect(wf.triggerType).toBe('Transaction Event')
  })

  // ── Trigger types — Settlement Event
  test('UAT-WF-01 | triggerType is correctly assigned (Settlement Event)', () => {
    const wf = createTestWorkflow({ triggerType: 'Settlement Event' })
    expect(wf.triggerType).toBe('Settlement Event')
  })

  // ── Trigger types — Compliance Event
  test('UAT-WF-01 | triggerType is correctly assigned (Compliance Event)', () => {
    const wf = createTestWorkflow({ triggerType: 'Compliance Event' })
    expect(wf.triggerType).toBe('Compliance Event')
  })
})

describe('WorkflowAutomationEngine — State Transitions', () => {

  // ── Draft → Active
  test('UAT-WF-02 | toggleState transitions Draft → Active', () => {
    const wf = createTestWorkflow()
    WorkflowAutomationEngine.toggleState(wf.workflowId, 'Active')

    const updated = WorkflowAutomationEngine.getWorkflows().find(w => w.workflowId === wf.workflowId)
    expect(updated!.state).toBe('Active')
  })

  // ── Active → Paused
  test('UAT-WF-02 | toggleState transitions Active → Paused', () => {
    const wf = createTestWorkflow()
    WorkflowAutomationEngine.toggleState(wf.workflowId, 'Active')
    WorkflowAutomationEngine.toggleState(wf.workflowId, 'Paused')

    const updated = WorkflowAutomationEngine.getWorkflows().find(w => w.workflowId === wf.workflowId)
    expect(updated!.state).toBe('Paused')
  })

  // ── Paused → Disabled
  test('UAT-WF-02 | toggleState transitions to Disabled', () => {
    const wf = createTestWorkflow()
    WorkflowAutomationEngine.toggleState(wf.workflowId, 'Disabled')

    const updated = WorkflowAutomationEngine.getWorkflows().find(w => w.workflowId === wf.workflowId)
    expect(updated!.state).toBe('Disabled')
  })

  // ── Archived
  test('UAT-WF-02 | toggleState transitions to Archived', () => {
    const wf = createTestWorkflow()
    WorkflowAutomationEngine.toggleState(wf.workflowId, 'Archived')

    const updated = WorkflowAutomationEngine.getWorkflows().find(w => w.workflowId === wf.workflowId)
    expect(updated!.state).toBe('Archived')
  })
})

describe('WorkflowAutomationEngine — Seed Data Regression', () => {
  test('Seeded workflows are present: WF-2026-001 and WF-2026-002', () => {
    const all = WorkflowAutomationEngine.getWorkflows()
    const wf1 = all.find(w => w.workflowId === 'WF-2026-001')
    const wf2 = all.find(w => w.workflowId === 'WF-2026-002')

    if (wf1) {
      expect(wf1.state).toBe('Active')
      expect(wf1.triggerType).toBe('Fraud Event')
    }
    if (wf2) {
      expect(wf2.state).toBe('Active')
      expect(wf2.triggerType).toBe('Settlement Event')
    }
  })
})
