/**
 * WorkflowAutomationEngine — local catalog + create/toggle contract.
 */

jest.mock('vue', () => ({
  ref: (v: unknown) => ({ value: v }),
}))

jest.mock('../../src/services/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}))

const fetchMock = jest.fn(() =>
  Promise.resolve({ ok: false, status: 404, json: async () => ({}) }),
)
;(global as any).fetch = fetchMock
;(global as any).localStorage = {
  getItem: jest.fn(() => ''),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}

import { WorkflowAutomationEngine } from '../../src/services/WorkflowAutomationEngine'

function createTestWorkflow(overrides: Record<string, unknown> = {}) {
  return WorkflowAutomationEngine.createWorkflow({
    name: 'Test Workflow — Fraud Event',
    description: 'Triggers when fraud score > 80',
    triggerType: 'Fraud Event',
    actions: ['Freeze Wallet', 'Generate Notification'],
    ...overrides,
  })
}

describe('WorkflowAutomationEngine — Creation', () => {
  test('createWorkflow returns a WorkflowDefinition in Draft state', () => {
    const wf = createTestWorkflow()
    expect(wf).toBeDefined()
    expect(wf.workflowId).toMatch(/^WF-2026-\d{3}$/)
    expect(wf.state).toBe('Draft')
    expect(wf.executionCount).toBe(0)
    expect(wf.lastExecutedAt).toBeNull()
  })

  test('createWorkflow attaches actions', () => {
    const wf = createTestWorkflow()
    expect(wf.actions).toContain('Freeze Wallet')
    expect(wf.actions).toContain('Generate Notification')
  })

  test('created workflow appears in getWorkflows()', () => {
    const wf = createTestWorkflow({ name: 'Unique-Verify-Workflow' })
    const found = WorkflowAutomationEngine.getWorkflows().find((w) => w.workflowId === wf.workflowId)
    expect(found).toBeDefined()
    expect(found!.name).toBe('Unique-Verify-Workflow')
  })

  test('triggerType is correctly assigned', () => {
    expect(createTestWorkflow({ triggerType: 'Transaction Event' }).triggerType).toBe('Transaction Event')
    expect(createTestWorkflow({ triggerType: 'Settlement Event' }).triggerType).toBe('Settlement Event')
    expect(createTestWorkflow({ triggerType: 'Compliance Event' }).triggerType).toBe('Compliance Event')
  })
})

describe('WorkflowAutomationEngine — State transitions', () => {
  test('toggleState updates state and updatedAt', () => {
    const wf = createTestWorkflow({ name: 'Toggle Target' })
    const updated = WorkflowAutomationEngine.toggleState(wf.workflowId, 'Active')
    expect(updated).not.toBeNull()
    expect(updated!.state).toBe('Active')
    expect(updated!.updatedAt).toBeTruthy()
  })

  test('toggleState returns null for unknown id', () => {
    expect(WorkflowAutomationEngine.toggleState('WF-MISSING', 'Paused')).toBeNull()
  })

  test('seeded catalog remains available when workflows API is down', () => {
    const all = WorkflowAutomationEngine.getWorkflows()
    expect(all.length).toBeGreaterThanOrEqual(3)
    expect(all.some((w) => w.workflowId.startsWith('WF-2026-'))).toBe(true)
  })
})
