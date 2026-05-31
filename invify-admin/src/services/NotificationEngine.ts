// invify-admin/src/services/NotificationEngine.ts

import { ref } from 'vue'

export type NotificationCategory = 'System' | 'Transactions' | 'Ledger' | 'Settlement' | 'Treasury' | 'Revenue' | 'Fraud' | 'Compliance' | 'Tenant' | 'Terminal' | 'Wallet' | 'Card' | 'Executive' | 'AI Insights' | 'Workflow' | 'Approvals'
export type NotificationPriority = 'Critical' | 'High' | 'Medium' | 'Low' | 'Informational'
export type NotificationState = 'Unread' | 'Read' | 'Acknowledged' | 'Escalated' | 'Resolved' | 'Archived'

export interface Notification {
  notificationId: string
  category: NotificationCategory
  priority: NotificationPriority
  title: string
  message: string
  entityType: string
  entityId: string
  sourceModule: string
  createdAt: string
  readAt: string | null
  acknowledgedAt: string | null
  resolvedAt: string | null
  assignedTo: string | null
  status: NotificationState
}

class NotificationEngineService {
  private notifications = ref<Notification[]>([])
  private subscribers: ((data: Notification[]) => void)[] = []

  constructor() {
    this.seedMockData()
  }

  private seedMockData() {
    this.notifications.value = [
      {
        notificationId: 'NOT-2026-001',
        category: 'Fraud',
        priority: 'Critical',
        title: 'Velocity Threshold Breached',
        message: 'Terminal TRM-SW-102 has processed 50 transactions in 2 minutes.',
        entityType: 'Terminal',
        entityId: 'TRM-SW-102',
        sourceModule: 'Fraud Monitoring',
        createdAt: new Date().toISOString(),
        readAt: null,
        acknowledgedAt: null,
        resolvedAt: null,
        assignedTo: null,
        status: 'Unread'
      },
      {
        notificationId: 'NOT-2026-002',
        category: 'Settlement',
        priority: 'High',
        title: 'Settlement Batch Stalled',
        message: 'Batch SET-GTB-411 pending bank acknowledgement for > 2 hours.',
        entityType: 'Settlement Batch',
        entityId: 'SET-GTB-411',
        sourceModule: 'Settlement Engine',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        readAt: null,
        acknowledgedAt: null,
        resolvedAt: null,
        assignedTo: null,
        status: 'Unread'
      },
      {
        notificationId: 'NOT-2026-003',
        category: 'Approvals',
        priority: 'Medium',
        title: 'Pending Wallet Freeze Approval',
        message: 'Action requires checker review.',
        entityType: 'Wallet',
        entityId: 'WAL-RET-091',
        sourceModule: 'Approval Engine',
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        readAt: new Date(Date.now() - 3600000).toISOString(),
        acknowledgedAt: null,
        resolvedAt: null,
        assignedTo: 'compliance_officer@invify.app',
        status: 'Read'
      }
    ]
  }

  private notify() {
    this.subscribers.forEach(sub => sub(this.notifications.value))
  }

  subscribe(callback: (data: Notification[]) => void) {
    this.subscribers.push(callback)
    callback(this.notifications.value)
  }

  unsubscribe(callback: (data: Notification[]) => void) {
    this.subscribers = this.subscribers.filter(sub => sub !== callback)
  }

  getNotifications() {
    return this.notifications.value
  }

  getUnreadCount() {
    return this.notifications.value.filter(n => n.status === 'Unread').length
  }
  
  getCriticalCount() {
    return this.notifications.value.filter(n => n.priority === 'Critical' && ['Unread', 'Read', 'Acknowledged'].includes(n.status)).length
  }

  hasCriticalUnread() {
    return this.notifications.value.some(n => n.status === 'Unread' && n.priority === 'Critical')
  }

  dispatchNotification(payload: Partial<Notification>) {
    const newNotif: Notification = {
      notificationId: `NOT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      category: payload.category || 'System',
      priority: payload.priority || 'Informational',
      title: payload.title || 'System Notification',
      message: payload.message || '',
      entityType: payload.entityType || 'Unknown',
      entityId: payload.entityId || 'UNK',
      sourceModule: payload.sourceModule || 'System',
      createdAt: new Date().toISOString(),
      readAt: null,
      acknowledgedAt: null,
      resolvedAt: null,
      assignedTo: null,
      status: 'Unread'
    }
    this.notifications.value.unshift(newNotif)
    this.notify()
    return newNotif
  }

  updateStatus(id: string, newStatus: NotificationState, actor: string = 'system') {
    const target = this.notifications.value.find(n => n.notificationId === id)
    if (target) {
      target.status = newStatus
      const now = new Date().toISOString()
      
      if (newStatus === 'Read') target.readAt = now
      if (newStatus === 'Acknowledged') target.acknowledgedAt = now
      if (newStatus === 'Resolved') target.resolvedAt = now
      
      this.notify()
      // In reality: Trigger AuditEngine.logEvent(...)
    }
  }

  markAllAsRead() {
    let changed = false
    this.notifications.value.forEach(n => {
      if (n.status === 'Unread') {
        n.status = 'Read'
        n.readAt = new Date().toISOString()
        changed = true
      }
    })
    if (changed) this.notify()
  }
  
  assign(id: string, user: string) {
    const target = this.notifications.value.find(n => n.notificationId === id)
    if (target) {
      target.assignedTo = user
      this.notify()
    }
  }
}

export const NotificationEngine = new NotificationEngineService()
