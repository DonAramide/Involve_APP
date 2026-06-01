/**
 * INVIFY — SLA Engine Unit Test Suite
 * Task 6 / Phase 6.2 Automated Tests
 *
 * Maps to UAT scenarios: UAT-SLA-01 through UAT-SLA-04
 */

jest.mock('vue', () => ({ ref: (v) => ({ value: v }) }))


jest.mock('../invify-admin/src/services/NotificationEngine', () => ({
  NotificationEngine: { dispatchNotification: jest.fn(() => ({ notificationId: 'NOT-TEST', status: 'Unread' })) },
}))

jest.mock('../invify-admin/src/services/SLAEscalationService', () => ({
  SLAEscalationService: { monitor: jest.fn() },
}))

import { SLAEngine } from '../invify-admin/src/services/SLAEngine'
import { NotificationEngine } from '../invify-admin/src/services/NotificationEngine'
import { SLAEscalationService } from '../invify-admin/src/services/SLAEscalationService'

function trackTestSLA(overrides = {}) {
  return SLAEngine.track({
    entityId: 'TEST-SLA-001',
    entityType: 'Settlement Batch',
    entityReference: 'GTB-TEST',
    module: 'Settlement Engine',
    category: 'Settlement',
    priority: 'Critical',
    assignedTo: 'treasury@invify.app',
    riskScore: 95,
    ...overrides,
  })
}

describe('SLAEngine — Tracking', () => {

  test('UAT-SLA-01 | track() creates a Healthy SLA', () => {
    const sla = trackTestSLA()
    expect(sla.status).toBe('Healthy')
    expect(sla.escalationLevel).toBe(0)
    expect(sla.breachedAt).toBeNull()
    expect(sla.resolvedAt).toBeNull()
    expect(sla.slaId).toMatch(/^SLA-\d{4}-\d{4}$/)
  })

  test('UAT-SLA-01 | track() calls SLAEscalationService.monitor', () => {
    trackTestSLA()
    expect(SLAEscalationService.monitor).toHaveBeenCalled()
  })

  test('UAT-SLA-01 | tracked SLA appears in getSLAs()', () => {
    const sla = trackTestSLA({ entityId: 'VERIFY-001' })
    expect(SLAEngine.getSLAs().find(s => s.slaId === sla.slaId)).toBeDefined()
  })
})

describe('SLAEngine — Status Transitions', () => {

  test('UAT-SLA-02 | Healthy → At Risk', () => {
    const sla = trackTestSLA()
    SLAEngine.updateStatus(sla.slaId, 'At Risk')
    const updated = SLAEngine.getSLAs().find(s => s.slaId === sla.slaId)
    expect(updated!.status).toBe('At Risk')
    expect(updated!.breachedAt).toBeNull()
  })

  test('UAT-SLA-03 | → Breached sets breachedAt', () => {
    const sla = trackTestSLA()
    SLAEngine.updateStatus(sla.slaId, 'Breached')
    const updated = SLAEngine.getSLAs().find(s => s.slaId === sla.slaId)
    expect(updated!.status).toBe('Breached')
    expect(updated!.breachedAt).not.toBeNull()
  })

  test('UAT-SLA-03 | Breach triggers NotificationEngine with Critical priority', () => {
    const mockDispatch = NotificationEngine.dispatchNotification as jest.Mock
    mockDispatch.mockClear()
    const sla = trackTestSLA()
    SLAEngine.updateStatus(sla.slaId, 'Breached')
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ priority: 'Critical', entityType: 'SLA', entityId: sla.slaId })
    )
  })

  test('UAT-SLA-04 | → Resolved sets resolvedAt', () => {
    const sla = trackTestSLA()
    SLAEngine.updateStatus(sla.slaId, 'Resolved')
    const updated = SLAEngine.getSLAs().find(s => s.slaId === sla.slaId)
    expect(updated!.status).toBe('Resolved')
    expect(updated!.resolvedAt).not.toBeNull()
  })

  test('UAT-SLA-04 | Resolved does NOT trigger breach notification', () => {
    const mockDispatch = NotificationEngine.dispatchNotification as jest.Mock
    mockDispatch.mockClear()
    const sla = trackTestSLA()
    SLAEngine.updateStatus(sla.slaId, 'Resolved')
    expect(mockDispatch).not.toHaveBeenCalled()
  })
})
