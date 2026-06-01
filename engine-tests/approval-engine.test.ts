/**
 * INVIFY — Approval Engine Unit Test Suite
 * Task 3 / Phase 6.2 Automated Tests
 *
 * Maps to UAT scenarios: UAT-GOV-01, UAT-GOV-02, UAT-GOV-03
 */

jest.mock('vue', () => ({ ref: (v) => ({ value: v }) }))


jest.mock('../invify-admin/src/services/SLAEngine', () => ({
  SLAEngine: {
    track: jest.fn(),
    getSLAs: jest.fn(() => []),
  },
}))

import { ApprovalEngine } from '../invify-admin/src/services/ApprovalEngine'
import { SLAEngine } from '../invify-admin/src/services/SLAEngine'

const makerEmail    = 'operations_team@invify.app'
const checkerEmail  = 'compliance_officer@invify.app'
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

describe('ApprovalEngine — Core State Machine', () => {

  test('UAT-GOV-01 | submitApproval creates a request with status "Submitted"', () => {
    const request = submitTestApproval()
    expect(request.status).toBe('Submitted')
    expect(request.maker).toBe(makerEmail)
    expect(request.checker).toBeNull()
    expect(request.approver).toBeNull()
    expect(request.approvedAt).toBeNull()
    expect(request.approvalId).toMatch(/^APP-\d{4}-\d{4}$/)
  })

  test('UAT-GOV-01 | submitApproval triggers SLAEngine.track', () => {
    submitTestApproval()
    expect(SLAEngine.track).toHaveBeenCalled()
  })

  test('UAT-GOV-01 | auditTrail has "Request Created" entry with correct actor', () => {
    const request = submitTestApproval()
    expect(request.auditTrail.length).toBeGreaterThanOrEqual(1)
    expect(request.auditTrail[0].action).toBe('Request Created')
    expect(request.auditTrail[0].actor).toBe(makerEmail)
    expect(request.auditTrail[0].integrityHash).toMatch(/^0x[0-9a-f]{32}$/)
  })

  test('UAT-GOV-02 | transitions to "Under Review" and assigns checker', () => {
    const request = submitTestApproval()
    ApprovalEngine.updateStatus(request.approvalId, 'Under Review', checkerEmail)
    const updated = ApprovalEngine.getApprovals().find(a => a.approvalId === request.approvalId)
    expect(updated!.status).toBe('Under Review')
    expect(updated!.checker).toBe(checkerEmail)
    expect(updated!.approver).toBeNull()
  })

  test('UAT-GOV-02 | auditTrail records "Assigned / Review Started"', () => {
    const request = submitTestApproval()
    ApprovalEngine.updateStatus(request.approvalId, 'Under Review', checkerEmail)
    const updated = ApprovalEngine.getApprovals().find(a => a.approvalId === request.approvalId)
    const entry = updated!.auditTrail.find(e => e.action === 'Assigned / Review Started')
    expect(entry).toBeDefined()
    expect(entry!.actor).toBe(checkerEmail)
  })

  test('UAT-GOV-02 | transitions to "Approved" and sets approvedAt + approver', () => {
    const request = submitTestApproval()
    ApprovalEngine.updateStatus(request.approvalId, 'Under Review', checkerEmail)
    ApprovalEngine.updateStatus(request.approvalId, 'Approved', approverEmail)
    const updated = ApprovalEngine.getApprovals().find(a => a.approvalId === request.approvalId)
    expect(updated!.status).toBe('Approved')
    expect(updated!.approver).toBe(approverEmail)
    expect(updated!.approvedAt).not.toBeNull()
  })

  test('UAT-GOV-02 | transitions to "Rejected"', () => {
    const request = submitTestApproval()
    ApprovalEngine.updateStatus(request.approvalId, 'Rejected', approverEmail)
    const updated = ApprovalEngine.getApprovals().find(a => a.approvalId === request.approvalId)
    expect(updated!.status).toBe('Rejected')
  })

  test('UAT-GOV-02 | transitions to "Escalated"', () => {
    const request = submitTestApproval()
    ApprovalEngine.updateStatus(request.approvalId, 'Escalated', checkerEmail)
    const updated = ApprovalEngine.getApprovals().find(a => a.approvalId === request.approvalId)
    expect(updated!.status).toBe('Escalated')
  })

  test('UAT-GOV-03 | [GATE] Self-approval guard — maker cannot approve own request', () => {
    const request = submitTestApproval({ maker: makerEmail })
    ApprovalEngine.updateStatus(request.approvalId, 'Under Review', checkerEmail)
    const result = ApprovalEngine.updateStatus(request.approvalId, 'Approved', makerEmail) // Maker as approver

    // Guard is now implemented at service layer — returns error object and does NOT approve
    const updated = ApprovalEngine.getApprovals().find(a => a.approvalId === request.approvalId)
    expect(result).toMatchObject({ error: 'SELF_APPROVAL_FORBIDDEN' })
    // Status must remain 'Under Review', not 'Approved'
    expect(updated!.status).toBe('Under Review')
    expect(updated!.approver).toBeNull()
  })

  test('Audit trail is ordered newest-first', () => {
    const request = submitTestApproval()
    ApprovalEngine.updateStatus(request.approvalId, 'Under Review', checkerEmail)
    ApprovalEngine.updateStatus(request.approvalId, 'Approved', approverEmail)
    const trail = ApprovalEngine.getApprovals().find(a => a.approvalId === request.approvalId)!.auditTrail
    expect(trail[0].action).toBe('Approved / Committed')
    expect(trail[1].action).toBe('Assigned / Review Started')
    expect(trail[2].action).toBe('Request Created')
  })

  test('getPendingCount increments after submissions', () => {
    const before = ApprovalEngine.getPendingCount()
    submitTestApproval()
    submitTestApproval()
    expect(ApprovalEngine.getPendingCount()).toBeGreaterThanOrEqual(before + 2)
  })
})
