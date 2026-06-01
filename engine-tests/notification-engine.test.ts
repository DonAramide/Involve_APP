/**
 * INVIFY — Notification Engine Unit Test Suite
 * Task 5 / Phase 6.2 Automated Tests
 *
 * Maps to UAT scenarios: UAT-OPS-01, UAT-OPS-02, UAT-OPS-03
 */

jest.mock('vue', () => ({ ref: (v) => ({ value: v }) }))


import { NotificationEngine } from '../invify-admin/src/services/NotificationEngine'

function dispatchTestNotification(overrides = {}) {
  return NotificationEngine.dispatchNotification({
    category: 'Fraud',
    priority: 'Critical',
    title: 'Test Fraud Alert',
    message: 'Simulated fraud event.',
    entityType: 'Terminal',
    entityId: 'TRM-TEST-001',
    sourceModule: 'Fraud Monitoring',
    ...overrides,
  })
}

describe('NotificationEngine — Dispatch & Priority Routing', () => {

  test('UAT-OPS-01 | dispatchNotification creates Unread notification', () => {
    const n = dispatchTestNotification()
    expect(n.status).toBe('Unread')
    expect(n.notificationId).toMatch(/^NOT-\d{4}-\d{4}$/)
    expect(n.readAt).toBeNull()
    expect(n.acknowledgedAt).toBeNull()
    expect(n.resolvedAt).toBeNull()
  })

  test('UAT-OPS-01 | Critical priority is preserved', () => {
    expect(dispatchTestNotification({ priority: 'Critical' }).priority).toBe('Critical')
  })

  test('UAT-OPS-01 | High priority is preserved', () => {
    expect(dispatchTestNotification({ priority: 'High', category: 'Settlement' }).priority).toBe('High')
  })

  test('UAT-OPS-01 | Medium priority is preserved', () => {
    expect(dispatchTestNotification({ priority: 'Medium', category: 'Approvals' }).priority).toBe('Medium')
  })

  test('UAT-OPS-01 | Low priority is preserved', () => {
    expect(dispatchTestNotification({ priority: 'Low', category: 'System' }).priority).toBe('Low')
  })
})

describe('NotificationEngine — Status Lifecycle', () => {

  test('UAT-OPS-02 | transitions to "Read" and sets readAt', () => {
    const n = dispatchTestNotification()
    NotificationEngine.updateStatus(n.notificationId, 'Read')
    const updated = NotificationEngine.getNotifications().find(x => x.notificationId === n.notificationId)
    expect(updated!.status).toBe('Read')
    expect(updated!.readAt).not.toBeNull()
  })

  test('UAT-OPS-02 | transitions to "Acknowledged" and sets acknowledgedAt', () => {
    const n = dispatchTestNotification()
    NotificationEngine.updateStatus(n.notificationId, 'Acknowledged')
    const updated = NotificationEngine.getNotifications().find(x => x.notificationId === n.notificationId)
    expect(updated!.acknowledgedAt).not.toBeNull()
  })

  test('UAT-OPS-02 | transitions to "Resolved" and sets resolvedAt', () => {
    const n = dispatchTestNotification()
    NotificationEngine.updateStatus(n.notificationId, 'Resolved')
    const updated = NotificationEngine.getNotifications().find(x => x.notificationId === n.notificationId)
    expect(updated!.resolvedAt).not.toBeNull()
  })

  test('UAT-OPS-03 | transitions to "Escalated"', () => {
    const n = dispatchTestNotification({ priority: 'Critical' })
    NotificationEngine.updateStatus(n.notificationId, 'Escalated')
    const updated = NotificationEngine.getNotifications().find(x => x.notificationId === n.notificationId)
    expect(updated!.status).toBe('Escalated')
  })

  test('UAT-OPS-02 | assign() sets assignedTo correctly', () => {
    const n = dispatchTestNotification()
    NotificationEngine.assign(n.notificationId, 'fraud_analyst@invify.app')
    const updated = NotificationEngine.getNotifications().find(x => x.notificationId === n.notificationId)
    expect(updated!.assignedTo).toBe('fraud_analyst@invify.app')
  })

  test('UAT-OPS-02 | markAllAsRead sets all Unread → Read', () => {
    dispatchTestNotification()
    dispatchTestNotification({ title: 'Second' })
    NotificationEngine.markAllAsRead()
    const unread = NotificationEngine.getNotifications().filter(n => n.status === 'Unread')
    expect(unread.length).toBe(0)
  })

  test('getUnreadCount is accurate', () => {
    const before = NotificationEngine.getUnreadCount()
    const n1 = dispatchTestNotification()
    const n2 = dispatchTestNotification({ title: 'n2' })
    expect(NotificationEngine.getUnreadCount()).toBe(before + 2)
    NotificationEngine.updateStatus(n1.notificationId, 'Read')
    expect(NotificationEngine.getUnreadCount()).toBe(before + 1)
  })

  test('getCriticalCount tracks active Critical notifications', () => {
    const before = NotificationEngine.getCriticalCount()
    const n = dispatchTestNotification({ priority: 'Critical' })
    expect(NotificationEngine.getCriticalCount()).toBe(before + 1)
    NotificationEngine.updateStatus(n.notificationId, 'Resolved')
    expect(NotificationEngine.getCriticalCount()).toBe(before)
  })

  test('hasCriticalUnread() returns true when Critical Unread exists', () => {
    dispatchTestNotification({ priority: 'Critical' })
    expect(NotificationEngine.hasCriticalUnread()).toBe(true)
  })
})
