// invify-admin/src/services/ApprovalEngine.ts

import { ref } from 'vue'
import { SLAEngine } from './SLAEngine'

export interface AuditEvent {
  timestamp: string
  action: string
  actor: string
  ipAddress: string
  location: string
  integrityHash: string
}

export interface ApprovalRequest {
  approvalId: string
  approvalType: string
  entityType: string
  entityId: string
  maker: string
  checker: string | null
  approver: string | null
  status: 'Draft' | 'Submitted' | 'Under Review' | 'Approved' | 'Rejected' | 'Cancelled' | 'Escalated'
  riskScore: number
  createdAt: string
  approvedAt: string | null
  slaDeadline: string
  priority?: string
  auditTrail: AuditEvent[]
}

class ApprovalEngineService {
  private approvals = ref<ApprovalRequest[]>([])
  private subscribers: ((data: ApprovalRequest[]) => void)[] = []

  constructor() {
    this.seedMockData()
  }

  private generateMockHash(): string {
    return '0x' + Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
  }

  private getClientContext(actorEmail: string): { ip: string, loc: string } {
    const defaultIPs: Record<string, { ip: string, loc: string }> = {
      'operations_team@invify.app': { ip: '197.210.64.88', loc: 'Lagos, Nigeria' },
      'risk_agent@invify.app': { ip: '102.89.23.14', loc: 'Abuja, Nigeria' },
      'compliance_officer@invify.app': { ip: '105.112.34.56', loc: 'Ibadan, Nigeria' },
      'fleet_manager@invify.app': { ip: '197.210.85.120', loc: 'Port Harcourt, Nigeria' },
      'ciso@invify.app': { ip: '102.91.4.15', loc: 'Kano, Nigeria' },
      'superadmin@iips.app': { ip: '197.210.99.12', loc: 'Lagos Island, Nigeria' },
      'superadmin@IIPS.app': { ip: '197.210.99.12', loc: 'Lagos Island, Nigeria' }
    }
    return defaultIPs[actorEmail] || { ip: '102.89.40.210', loc: 'Lekki, Nigeria' }
  }

  private seedMockData() {
    const created1 = new Date(Date.now() - 3600000).toISOString()
    const ctx1 = this.getClientContext('operations_team@invify.app')
    
    const created2 = new Date(Date.now() - 86400000).toISOString()
    const assigned2 = new Date(Date.now() - 72000000).toISOString()
    const ctx2Maker = this.getClientContext('risk_agent@invify.app')
    const ctx2Checker = this.getClientContext('compliance_officer@invify.app')

    const created3 = new Date(Date.now() - 172800000).toISOString()
    const assigned3 = new Date(Date.now() - 120000000).toISOString()
    const approved3 = new Date(Date.now() - 86400000).toISOString()
    const ctx3Maker = this.getClientContext('fleet_manager@invify.app')
    const ctx3Checker = this.getClientContext('risk_agent@invify.app')
    const ctx3Approver = this.getClientContext('ciso@invify.app')

    this.approvals.value = [
      {
        approvalId: 'APP-2026-001',
        approvalType: 'Settlement Release',
        entityType: 'Settlement Batch',
        entityId: 'SET-GTB-411',
        maker: 'operations_team@invify.app',
        checker: null,
        approver: null,
        status: 'Submitted',
        riskScore: 85,
        createdAt: created1,
        approvedAt: null,
        slaDeadline: new Date(Date.now() + 7200000).toISOString(),
        auditTrail: [
          {
            timestamp: created1,
            action: 'Request Created',
            actor: 'operations_team@invify.app',
            ipAddress: ctx1.ip,
            location: ctx1.loc,
            integrityHash: this.generateMockHash()
          }
        ]
      },
      {
        approvalId: 'APP-2026-002',
        approvalType: 'Wallet Freeze',
        entityType: 'Wallet',
        entityId: 'WAL-RET-091',
        maker: 'risk_agent@invify.app',
        checker: 'compliance_officer@invify.app',
        approver: null,
        status: 'Under Review',
        riskScore: 92,
        createdAt: created2,
        approvedAt: null,
        slaDeadline: new Date(Date.now() - 3600000).toISOString(), // Breached SLA
        auditTrail: [
          {
            timestamp: assigned2,
            action: 'Assigned / Review Started',
            actor: 'compliance_officer@invify.app',
            ipAddress: ctx2Checker.ip,
            location: ctx2Checker.loc,
            integrityHash: this.generateMockHash()
          },
          {
            timestamp: created2,
            action: 'Request Created',
            actor: 'risk_agent@invify.app',
            ipAddress: ctx2Maker.ip,
            location: ctx2Maker.loc,
            integrityHash: this.generateMockHash()
          }
        ]
      },
      {
        approvalId: 'APP-2026-003',
        approvalType: 'Terminal Suspension',
        entityType: 'Terminal',
        entityId: 'TRM-SW-102',
        maker: 'fleet_manager@invify.app',
        checker: 'risk_agent@invify.app',
        approver: 'ciso@invify.app',
        status: 'Approved',
        riskScore: 45,
        createdAt: created3,
        approvedAt: approved3,
        slaDeadline: new Date(Date.now() - 100000000).toISOString(),
        auditTrail: [
          {
            timestamp: approved3,
            action: 'Approved / Committed',
            actor: 'ciso@invify.app',
            ipAddress: ctx3Approver.ip,
            location: ctx3Approver.loc,
            integrityHash: this.generateMockHash()
          },
          {
            timestamp: assigned3,
            action: 'Assigned / Review Started',
            actor: 'risk_agent@invify.app',
            ipAddress: ctx3Checker.ip,
            location: ctx3Checker.loc,
            integrityHash: this.generateMockHash()
          },
          {
            timestamp: created3,
            action: 'Request Created',
            actor: 'fleet_manager@invify.app',
            ipAddress: ctx3Maker.ip,
            location: ctx3Maker.loc,
            integrityHash: this.generateMockHash()
          }
        ]
      }
    ]
  }

  private notify() {
    this.subscribers.forEach(sub => sub(this.approvals.value))
  }

  subscribe(callback: (data: ApprovalRequest[]) => void) {
    this.subscribers.push(callback)
    callback(this.approvals.value)
  }

  unsubscribe(callback: (data: ApprovalRequest[]) => void) {
    this.subscribers = this.subscribers.filter(sub => sub !== callback)
  }

  getApprovals() {
    return this.approvals.value
  }

  getPendingCount() {
    return this.approvals.value.filter(a => ['Submitted', 'Under Review'].includes(a.status)).length
  }

  submitApproval(request: Partial<ApprovalRequest>) {
    const timestamp = new Date().toISOString()
    const makerEmail = request.maker || 'system_auto'
    const ctx = this.getClientContext(makerEmail)

    const newApproval: ApprovalRequest = {
      approvalId: `APP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      approvalType: request.approvalType || 'General Request',
      entityType: request.entityType || 'Unknown',
      entityId: request.entityId || 'UNK-000',
      maker: makerEmail,
      checker: null,
      approver: null,
      status: 'Submitted',
      riskScore: request.riskScore || 0,
      createdAt: timestamp,
      approvedAt: null,
      slaDeadline: new Date(Date.now() + 86400000).toISOString(), // 24 hours
      priority: request.priority || 'Medium',
      auditTrail: [
        {
          timestamp: timestamp,
          action: 'Request Created',
          actor: makerEmail,
          ipAddress: ctx.ip,
          location: ctx.loc,
          integrityHash: this.generateMockHash()
        }
      ]
    }
    this.approvals.value.unshift(newApproval)
    this.notify()

    // Phase 5: Automatically create SLA Tracking
    SLAEngine.track({
      entityId: newApproval.approvalId,
      entityType: 'Approval Request',
      entityReference: newApproval.entityId,
      module: 'Approval Engine',
      category: 'Approvals',
      priority: newApproval.priority || 'Medium',
      assignedTo: newApproval.checker || 'system'
    })

    return newApproval
  }

  updateStatus(approvalId: string, status: ApprovalRequest['status'], actor: string) {
    const target = this.approvals.value.find(a => a.approvalId === approvalId)
    if (target) {
      target.status = status
      const timestamp = new Date().toISOString()
      const ctx = this.getClientContext(actor)
      
      let actionLabel = `Workflow Status Updated to: ${status}`
      if (status === 'Approved' || status === 'Rejected') {
        target.approver = actor
        target.approvedAt = timestamp
        actionLabel = status === 'Approved' ? 'Approved / Committed' : 'Rejected / Cancelled'
      } else if (status === 'Under Review') {
        target.checker = actor
        actionLabel = 'Assigned / Review Started'
      }

      // Log execution to immutable audit logs
      target.auditTrail.unshift({
        timestamp: timestamp,
        action: actionLabel,
        actor: actor,
        ipAddress: ctx.ip,
        location: ctx.loc,
        integrityHash: this.generateMockHash()
      })

      this.notify()
    }
  }
}

export const ApprovalEngine = new ApprovalEngineService()
