// invify-admin/src/services/SLAPolicyRegistry.ts

export interface SLAPolicy {
  policyId: string
  name: string
  module: string
  durationMinutes: number
}

class SLAPolicyRegistryService {
  private policies: Record<string, SLAPolicy> = {
    'FRAUD_CRITICAL': { policyId: 'FRAUD_CRITICAL', name: 'Critical Fraud Case', module: 'Fraud Monitoring', durationMinutes: 120 },
    'FRAUD_HIGH': { policyId: 'FRAUD_HIGH', name: 'High Fraud Case', module: 'Fraud Monitoring', durationMinutes: 480 },
    'COMPLIANCE_REVIEW': { policyId: 'COMPLIANCE_REVIEW', name: 'Compliance Review', module: 'Compliance Center', durationMinutes: 1440 },
    'PEP_REVIEW': { policyId: 'PEP_REVIEW', name: 'PEP Review', module: 'Compliance Center', durationMinutes: 720 },
    'SETTLEMENT_FAIL': { policyId: 'SETTLEMENT_FAIL', name: 'Settlement Failure', module: 'Settlement Engine', durationMinutes: 30 },
    'SETTLEMENT_APP': { policyId: 'SETTLEMENT_APP', name: 'Settlement Approval', module: 'Approval Engine', durationMinutes: 120 },
    'TREASURY_APP': { policyId: 'TREASURY_APP', name: 'Treasury Approval', module: 'Approval Engine', durationMinutes: 60 },
    'WALLET_FREEZE': { policyId: 'WALLET_FREEZE', name: 'Wallet Freeze Review', module: 'Wallet Operations', durationMinutes: 240 },
    'CARD_REPLACE': { policyId: 'CARD_REPLACE', name: 'Card Replacement', module: 'Card Operations', durationMinutes: 1440 },
    'TERM_TAMPER': { policyId: 'TERM_TAMPER', name: 'Terminal Tampering', module: 'Terminal Operations', durationMinutes: 60 },
    'COMPLIANCE_ESC': { policyId: 'COMPLIANCE_ESC', name: 'Compliance Escalation', module: 'Compliance Center', durationMinutes: 240 },
    'EXEC_APP': { policyId: 'EXEC_APP', name: 'Executive Approval', module: 'Approval Engine', durationMinutes: 1440 }
  }

  getPolicy(policyId: string): SLAPolicy | undefined {
    return this.policies[policyId]
  }

  calculateDueDate(policyId: string, startDate: Date = new Date()): Date {
    const policy = this.getPolicy(policyId)
    if (!policy) return new Date(startDate.getTime() + 86400000) // Default 24h
    return new Date(startDate.getTime() + policy.durationMinutes * 60000)
  }
}

export const SLAPolicyRegistry = new SLAPolicyRegistryService()
