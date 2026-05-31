// invify-admin/src/services/SLAEngine.ts

import { ref } from 'vue'
import { NotificationEngine } from './NotificationEngine'
import { SLAEscalationService } from './SLAEscalationService'

export type SLAStatus = 'Healthy' | 'Approaching Deadline' | 'At Risk' | 'Breached' | 'Resolved' | 'Cancelled'
export type SLACategory = 'Fraud' | 'Compliance' | 'Treasury' | 'Settlement' | 'Approvals' | 'Notifications' | 'Operations' | 'Executive' | 'Workflow'

export interface SLA {
  slaId: string
  entityId: string
  entityType: string
  entityReference: string
  module: string
  category: SLACategory
  priority: 'Critical' | 'High' | 'Medium' | 'Low'
  assignedTo: string
  assignedRole: string
  createdAt: string
  dueAt: string
  breachedAt: string | null
  resolvedAt: string | null
  status: SLAStatus
  escalationLevel: number
  riskScore: number
}

class SLAEngineService {
  private slas = ref<SLA[]>([])
  private subscribers: ((data: SLA[]) => void)[] = []

  constructor() {
    this.seedMockData()
  }

  private seedMockData() {
    this.slas.value = [
      {
        slaId: 'SLA-2026-001',
        entityId: 'CAS-8812',
        entityType: 'Fraud Case',
        entityReference: 'TRM-SW-102',
        module: 'Fraud Monitoring',
        category: 'Fraud',
        priority: 'Critical',
        assignedTo: 'fraud_analyst@invify.app',
        assignedRole: 'Fraud Analyst',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        dueAt: new Date(Date.now() + 3600000).toISOString(), // Due in 1 hr
        breachedAt: null,
        resolvedAt: null,
        status: 'Healthy',
        escalationLevel: 0,
        riskScore: 85
      },
      {
        slaId: 'SLA-2026-002',
        entityId: 'SET-GTB-411',
        entityType: 'Settlement Batch',
        entityReference: 'GTB-PRIMARY',
        module: 'Settlement Engine',
        category: 'Settlement',
        priority: 'Critical',
        assignedTo: 'treasury@invify.app',
        assignedRole: 'Treasury Officer',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        dueAt: new Date(Date.now() - 1800000).toISOString(), // Breached 30m ago
        breachedAt: new Date(Date.now() - 1800000).toISOString(),
        resolvedAt: null,
        status: 'Breached',
        escalationLevel: 2,
        riskScore: 99
      },
      {
        slaId: 'SLA-2026-003',
        entityId: 'APP-2026-002',
        entityType: 'Approval Request',
        entityReference: 'WAL-RET-091',
        module: 'Approval Engine',
        category: 'Approvals',
        priority: 'High',
        assignedTo: 'compliance_officer@invify.app',
        assignedRole: 'Compliance Officer',
        createdAt: new Date(Date.now() - 14400000).toISOString(),
        dueAt: new Date(Date.now() + 600000).toISOString(), // Due in 10m
        breachedAt: null,
        resolvedAt: null,
        status: 'At Risk',
        escalationLevel: 1,
        riskScore: 92
      }
    ]
  }

  private notify() {
    this.subscribers.forEach(sub => sub(this.slas.value))
  }

  subscribe(callback: (data: SLA[]) => void) {
    this.subscribers.push(callback)
    callback(this.slas.value)
  }

  unsubscribe(callback: (data: SLA[]) => void) {
    this.subscribers = this.subscribers.filter(sub => sub !== callback)
  }

  getSLAs() {
    return this.slas.value
  }

  track(sla: Partial<SLA>) {
    const newSLA: SLA = {
      slaId: `SLA-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      entityId: sla.entityId || 'UNK',
      entityType: sla.entityType || 'Unknown',
      entityReference: sla.entityReference || '',
      module: sla.module || 'System',
      category: sla.category || 'Operations',
      priority: sla.priority || 'Medium',
      assignedTo: sla.assignedTo || 'system',
      assignedRole: sla.assignedRole || 'System',
      createdAt: new Date().toISOString(),
      dueAt: sla.dueAt || new Date(Date.now() + 86400000).toISOString(),
      breachedAt: null,
      resolvedAt: null,
      status: 'Healthy',
      escalationLevel: 0,
      riskScore: sla.riskScore || 50
    }
    this.slas.value.unshift(newSLA)
    this.notify()
    
    // Future: Start countdown timer for SLAEscalationService to monitor
    SLAEscalationService.monitor(newSLA)
    return newSLA
  }

  updateStatus(id: string, status: SLAStatus) {
    const target = this.slas.value.find(s => s.slaId === id)
    if (target) {
      target.status = status
      if (status === 'Resolved') target.resolvedAt = new Date().toISOString()
      if (status === 'Breached') target.breachedAt = new Date().toISOString()
      this.notify()
      
      if (status === 'Breached') {
        NotificationEngine.dispatchNotification({
          category: 'System',
          priority: 'Critical',
          title: `SLA Breached: ${target.entityType}`,
          message: `SLA ${target.slaId} has breached its resolution deadline.`,
          entityType: 'SLA',
          entityId: target.slaId,
          sourceModule: 'SLA Engine'
        })
      }
    }
  }
}

export const SLAEngine = new SLAEngineService()
