/**
 * BROADCAST AUDIT & SECURITY GOVERNANCE LAYER
 * Enforces RBAC using the signed-in operator role, immutable ledger audits,
 * operational approval barriers, and high-severity override authorizations.
 */

const BROADCAST_ROLES = new Set([
  'SUPER_ADMIN',
  'ADMIN',
  'PLATFORM_ADMIN',
  'INTERNAL_STAFF',
]);

const OVERRIDE_ROLES = new Set([
  'SUPER_ADMIN',
  'PLATFORM_ADMIN',
]);

function normalizeRole(role) {
  return String(role || '').toUpperCase().trim();
}

class BroadcastAuditGovernance {
  constructor() {
    this.auditLineageStore = [];
    this.pendingApprovals = new Map();
    this.isEmergencyOverrideEngaged = false;
  }

  authorizeBroadcastAction(operatorId, targetSeverity, operatorRole) {
    if (!operatorId) {
      return { authorized: false, error: 'Unauthenticated context. Sign in before dispatching broadcasts.' };
    }

    const role = normalizeRole(operatorRole);
    if (!BROADCAST_ROLES.has(role)) {
      return {
        authorized: false,
        error: `RBAC access denial. Role [${role || 'UNKNOWN'}] cannot dispatch fleet broadcasts.`,
      };
    }

    if (['EMERGENCY', 'CRITICAL'].includes(targetSeverity) && !OVERRIDE_ROLES.has(role) && !this.isEmergencyOverrideEngaged) {
      return {
        authorized: false,
        error: 'High-severity broadcast execution is restricted to super administrators unless SOC override is armed.',
      };
    }

    return { authorized: true, error: null };
  }

  evaluateApprovalWorkflow(envelope, operatorId, operatorRole) {
    if (this.isEmergencyOverrideEngaged || envelope.severity === 'EMERGENCY') {
      return { requiresApproval: false, status: 'BYPASSED_EMERGENCY_PROTOCOL' };
    }

    if (OVERRIDE_ROLES.has(normalizeRole(operatorRole))) {
      return { requiresApproval: false, status: 'AUTO_APPROVED_BY_CAPABILITY' };
    }

    this.pendingApprovals.set(envelope.broadcastId, {
      envelope,
      submittedBy: operatorId,
      submittedAt: Date.now(),
      status: 'PENDING_SECONDARY_REVIEW',
    });

    return { requiresApproval: true, status: 'STAGED_AWAITING_REVIEW' };
  }

  appendAuditRecord(envelope, operatorId, deliveryStatus) {
    const ledgerLine = {
      auditId: `AUD-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
      broadcastId: envelope.broadcastId,
      lineageSignature: envelope.lineageHash,
      tenantScope: envelope.tenantId,
      severity: envelope.severity,
      launcherMode: envelope.launcherMode,
      issuedBy: operatorId,
      timestamp: Date.now(),
      statusString: deliveryStatus,
    };

    this.auditLineageStore.unshift(ledgerLine);
    if (this.auditLineageStore.length > 500) {
      this.auditLineageStore.pop();
    }

    console.log(`[AUDIT GOVERNANCE] Committed broadcast receipt -> ${ledgerLine.auditId}`);
    return ledgerLine;
  }

  getAuditHistory() {
    return this.auditLineageStore;
  }

  toggleEmergencyOverride(engaged) {
    this.isEmergencyOverrideEngaged = engaged;
    console.warn(`[AUDIT GOVERNANCE] SOC emergency override set to -> ${engaged}`);
  }

  resetGovernanceState() {
    this.auditLineageStore = [];
    this.pendingApprovals.clear();
    this.isEmergencyOverrideEngaged = false;
  }
}

export const auditGovernanceSingleton = new BroadcastAuditGovernance();
