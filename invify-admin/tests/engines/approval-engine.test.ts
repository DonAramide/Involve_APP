/**
 * INVIFY — Approval Engine Unit Test Suite
 * Task 3 / Phase 6.2 Automated Tests
 *
 * Validates:
 *  - State transitions: Draft → Submitted → Under Review → Approved / Rejected / Escalated
 *  - Maker cannot approve their own request
 *  - Audit trail is appended on every state transition
 *  - submitApproval generates a valid ApprovalRequest object
 *  - updateStatus correctly assigns checker / approver fields
 */

// ── Lightweight Jest-compatible shim for `ref` so the Vue reactive primitive
//    works in a Node/Jest environment without a full Vue runtime.
jest.mock('vue', () => ({
  ref: (v: unknown) => ({ value: v }),
}))

// ── SLAEngine is a dependency; mock it to isolate ApprovalEngine
jest.mock('../src/services/SLAEngine', () => ({
  SLAEngine: {
    track: jest.fn(),
    getSLAs: jest.fn(() => []),
  },
}))

import { ApprovalEngine } from '../src/services/ApprovalEngine'
import { SLAEngine } from '../src/services/SLAEngine'

// ─────────────────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────────────────
const makerEmail = 'operations_team@invify.app'
const checkerEmail = 'compliance_officer@invify.app'
const approverEmail = 'ciso@invify.app'

function submitTestApproval(overrides = {}) {
  return ApprovalEngine.submitApproval({
    approvalType: 'Settlement Release',
    entityType: 'Settlement Batch',
    entityId: 'SET-TEST-001',
    maker: makerEmail,
    riskScore: 80,
    priority: 'High',
    ...overrides,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITE
// ─────────────────────────────────────────────────────────────────────────────
describe('ApprovalEngine — Core State Machine', () => {

  // ── UAT-GOV-01: Submit creates a valid approval in Submitted state
  test('UAT-GOV-01 | submitApproval creates a request with status "Submitted"', () => {
    const request = submitTestApproval()

    expect(request).toBeDefined()
    expect(request.approvalId).toMatch(/^APP-\d{4}-\d{4}$/)
    expect(request.status).toBe('Submitted')
    expect(request.maker).toBe(makerEmail)
    expect(request.checker).toBeNull()
    expect(request.approver).toBeNull()
    expect(request.approvedAt).toBeNull()
  })

  // ── UAT-GOV-01: SLA must be registered on submission
  test('UAT-GOV-01 | submitApproval triggers SLAEngine.track', () => {
    submitTestApproval()
    expect(SLAEngine.track).toHaveBeenCalled()
  })

  // ── Audit trail starts with one "Request Created" entry
  test('UAT-GOV-01 | auditTrail has at least one entry on creation', () => {
    const request = submitTestApproval()
    expect(request.auditTrail.length).toBeGreaterThanOrEqual(1)
    expect(request.auditTrail[0].action).toBe('Request Created')
    expect(request.auditTrail[0].actor).toBe(makerEmail)
    expect(request.auditTrail[0].integrityHash).toMatch(/^0x[0-9a-f]{32}$/)
  })

  // ── UAT-GOV-02: Checker transition — Submitted → Under Review
  test('UAT-GOV-02 | updateStatus transitions to "Under Review" and assigns checker', () => {
    const request = submitTestApproval()
    ApprovalEngine.updateStatus(request.approvalId, 'Under Review', checkerEmail)

    const approvals = ApprovalEngine.getApprovals()
    const updated = approvals.find(a => a.approvalId === request.approvalId)

    expect(updated!.status).toBe('Under Review')
    expect(updated!.checker).toBe(checkerEmail)
    expect(updated!.approver).toBeNull()
  })

  // ── Audit trail grows after checker assignment
  test('UAT-GOV-02 | auditTrail records "Assigned / Review Started" entry', () => {
    const request = submitTestApproval()
    ApprovalEngine.updateStatus(request.approvalId, 'Under Review', checkerEmail)

    const updated = ApprovalEngine.getApprovals().find(a => a.approvalId === request.approvalId)
    const assignedEntry = updated!.auditTrail.find(e => e.action === 'Assigned / Review Started')

    expect(assignedEntry).toBeDefined()
    expect(assignedEntry!.actor).toBe(checkerEmail)
  })

  // ── UAT-GOV-02: Approver transition — Under Review → Approved
  test('UAT-GOV-02 | updateStatus transitions to "Approved" and sets approvedAt + approver', () => {
    const request = submitTestApproval()
    ApprovalEngine.updateStatus(request.approvalId, 'Under Review', checkerEmail)
    ApprovalEngine.updateStatus(request.approvalId, 'Approved', approverEmail)

    const updated = ApprovalEngine.getApprovals().find(a => a.approvalId === request.approvalId)

    expect(updated!.status).toBe('Approved')
    expect(updated!.approver).toBe(approverEmail)
    expect(updated!.approvedAt).not.toBeNull()
  })

  // ── Rejection path
  test('UAT-GOV-02 | updateStatus transitions to "Rejected" and sets approver', () => {
    const request = submitTestApproval()
    ApprovalEngine.updateStatus(request.approvalId, 'Under Review', checkerEmail)
    ApprovalEngine.updateStatus(request.approvalId, 'Rejected', approverEmail)

    const updated = ApprovalEngine.getApprovals().find(a => a.approvalId === request.approvalId)

    expect(updated!.status).toBe('Rejected')
    expect(updated!.approver).toBe(approverEmail)
  })

  // ── Escalation path
  test('UAT-GOV-02 | updateStatus transitions to "Escalated"', () => {
    const request = submitTestApproval()
    ApprovalEngine.updateStatus(request.approvalId, 'Escalated', checkerEmail)

    const updated = ApprovalEngine.getApprovals().find(a => a.approvalId === request.approvalId)
    expect(updated!.status).toBe('Escalated')
  })

  // ── SELF-APPROVAL GUARD: Maker must not be the same as approver
  //    NOTE: The engine does not enforce this at the service level currently
  //    (it is a UI-layer RBAC concern). This test documents the expected
  //    business rule and will FAIL until the guard is implemented in the service.
  test('UAT-GOV-03 | Self-approval guard — maker cannot approve own request [GATE]', () => {
    const request = submitTestApproval({ maker: makerEmail })
    ApprovalEngine.updateStatus(request.approvalId, 'Under Review', checkerEmail)
    ApprovalEngine.updateStatus(request.approvalId, 'Approved', makerEmail) // maker = approver!

    const updated = ApprovalEngine.getApprovals().find(a => a.approvalId === request.approvalId)

    // EXPECTED BEHAVIOUR: Status should NOT be Approved when maker == approver
    // Current behaviour: The service does not block this → test documents the gap
    expect(updated!.approver).not.toBe(updated!.maker)
  })

  // ── Audit trail is always newest-first (unshift behaviour)
  test('Audit trail entries are ordered newest-first', () => {
    const request = submitTestApproval()
    ApprovalEngine.updateStatus(request.approvalId, 'Under Review', checkerEmail)
    ApprovalEngine.updateStatus(request.approvalId, 'Approved', approverEmail)

    const updated = ApprovalEngine.getApprovals().find(a => a.approvalId === request.approvalId)
    const trail = updated!.auditTrail

    expect(trail[0].action).toBe('Approved / Committed')
    expect(trail[1].action).toBe('Assigned / Review Started')
    expect(trail[2].action).toBe('Request Created')
  })

  // ── getPendingCount
  test('getPendingCount returns count of Submitted + Under Review items', () => {
    const before = ApprovalEngine.getPendingCount()
    submitTestApproval()
    submitTestApproval()
    const after = ApprovalEngine.getPendingCount()
    expect(after).toBeGreaterThanOrEqual(before + 2)
  })
})
