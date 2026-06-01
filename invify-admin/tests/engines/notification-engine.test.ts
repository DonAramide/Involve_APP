/**
 * INVIFY — Notification Engine Unit Test Suite
 * Task 5 / Phase 6.2 Automated Tests
 *
 * Validates:
 *  - dispatchNotification creates a valid Notification in Unread state
 *  - In-App Notification priority routing (Critical, High, Medium, Low)
 *  - updateStatus transitions (Unread → Read → Acknowledged → Resolved)
 *  - Escalation state transition
 *  - markAllAsRead operates correctly
 *  - getUnreadCount and getCriticalCount are accurate
 *  - assign(id, user) correctly sets assignedTo field
 */

jest.mock('vue', () => ({
  ref: (v: unknown) => ({ value: v }),
}))

import { NotificationEngine } from '../src/services/NotificationEngine'

// ─────────────────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────────────────
function dispatchTestNotification(overrides = {}) {
  return NotificationEngine.dispatchNotification({
    category: 'Fraud',
    priority: 'Critical',
    title: 'Test Fraud Alert',
    message: 'Simulated fraud event for UAT.',
    entityType: 'Terminal',
    entityId: 'TRM-TEST-001',
    sourceModule: 'Fraud Monitoring',
    ...overrides,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITE
// ─────────────────────────────────────────────────────────────────────────────
describe('NotificationEngine — Dispatch & Routing', () => {

  // ── UAT-OPS-01: Dispatching a notification
  test('UAT-OPS-01 | dispatchNotification creates notification with status "Unread"', () => {
    const notif = dispatchTestNotification()

    expect(notif).toBeDefined()
    expect(notif.notificationId).toMatch(/^NOT-\d{4}-\d{4}$/)
    expect(notif.status).toBe('Unread')
    expect(notif.readAt).toBeNull()
    expect(notif.acknowledgedAt).toBeNull()
    expect(notif.resolvedAt).toBeNull()
  })

  // ── Priority routing: Critical dispatched correctly
  test('UAT-OPS-01 | Critical priority notifications are routed with correct priority', () => {
    const notif = dispatchTestNotification({ priority: 'Critical' })
    expect(notif.priority).toBe('Critical')
  })

  test('UAT-OPS-01 | High priority notifications are routed correctly', () => {
    const notif = dispatchTestNotification({ priority: 'High', category: 'Settlement' })
    expect(notif.priority).toBe('High')
    expect(notif.category).toBe('Settlement')
  })

  test('UAT-OPS-01 | Medium priority notifications are routed correctly', () => {
    const notif = dispatchTestNotification({ priority: 'Medium', category: 'Approvals' })
    expect(notif.priority).toBe('Medium')
  })

  test('UAT-OPS-01 | Low priority notifications are routed correctly', () => {
    const notif = dispatchTestNotification({ priority: 'Low', category: 'System' })
    expect(notif.priority).toBe('Low')
  })
})

describe('NotificationEngine — Status Transitions & Lifecycle', () => {

  // ── Unread → Read
  test('UAT-OPS-02 | updateStatus transitions to "Read" and sets readAt', () => {
    const notif = dispatchTestNotification()
    NotificationEngine.updateStatus(notif.notificationId, 'Read')

    const updated = NotificationEngine.getNotifications().find(n => n.notificationId === notif.notificationId)

    expect(updated!.status).toBe('Read')
    expect(updated!.readAt).not.toBeNull()
  })

  // ── Read → Acknowledged
  test('UAT-OPS-02 | updateStatus transitions to "Acknowledged" and sets acknowledgedAt', () => {
    const notif = dispatchTestNotification()
    NotificationEngine.updateStatus(notif.notificationId, 'Read')
    NotificationEngine.updateStatus(notif.notificationId, 'Acknowledged')

    const updated = NotificationEngine.getNotifications().find(n => n.notificationId === notif.notificationId)

    expect(updated!.status).toBe('Acknowledged')
    expect(updated!.acknowledgedAt).not.toBeNull()
  })

  // ── Acknowledged → Resolved
  test('UAT-OPS-02 | updateStatus transitions to "Resolved" and sets resolvedAt', () => {
    const notif = dispatchTestNotification()
    NotificationEngine.updateStatus(notif.notificationId, 'Resolved')

    const updated = NotificationEngine.getNotifications().find(n => n.notificationId === notif.notificationId)

    expect(updated!.status).toBe('Resolved')
    expect(updated!.resolvedAt).not.toBeNull()
  })

  // ── Escalation
  test('UAT-OPS-03 | updateStatus transitions to "Escalated"', () => {
    const notif = dispatchTestNotification({ priority: 'Critical' })
    NotificationEngine.updateStatus(notif.notificationId, 'Escalated')

    const updated = NotificationEngine.getNotifications().find(n => n.notificationId === notif.notificationId)
    expect(updated!.status).toBe('Escalated')
  })

  // ── Assign
  test('UAT-OPS-02 | assign correctly sets assignedTo field', () => {
    const notif = dispatchTestNotification()
    NotificationEngine.assign(notif.notificationId, 'fraud_analyst@invify.app')

    const updated = NotificationEngine.getNotifications().find(n => n.notificationId === notif.notificationId)
    expect(updated!.assignedTo).toBe('fraud_analyst@invify.app')
  })

  // ── markAllAsRead
  test('UAT-OPS-02 | markAllAsRead sets all Unread notifications to Read', () => {
    dispatchTestNotification()
    dispatchTestNotification({ title: 'Second alert' })

    NotificationEngine.markAllAsRead()

    const unread = NotificationEngine.getNotifications().filter(n => n.status === 'Unread')
    expect(unread.length).toBe(0)
  })

  // ── Unread count accuracy
  test('getUnreadCount accurately reflects Unread notifications', () => {
    const before = NotificationEngine.getUnreadCount()
    const n1 = dispatchTestNotification()
    const n2 = dispatchTestNotification({ title: 'n2' })
    expect(NotificationEngine.getUnreadCount()).toBe(before + 2)

    NotificationEngine.updateStatus(n1.notificationId, 'Read')
    expect(NotificationEngine.getUnreadCount()).toBe(before + 1)
  })

  // ── Critical count accuracy
  test('getCriticalCount accurately reflects active Critical notifications', () => {
    const before = NotificationEngine.getCriticalCount()
    const notif = dispatchTestNotification({ priority: 'Critical' })
    expect(NotificationEngine.getCriticalCount()).toBe(before + 1)

    NotificationEngine.updateStatus(notif.notificationId, 'Resolved')
    expect(NotificationEngine.getCriticalCount()).toBe(before)
  })

  // ── hasCriticalUnread
  test('hasCriticalUnread returns true when a Critical Unread notification exists', () => {
    dispatchTestNotification({ priority: 'Critical' })
    expect(NotificationEngine.hasCriticalUnread()).toBe(true)
  })
})
