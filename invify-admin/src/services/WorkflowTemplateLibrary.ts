// invify-admin/src/services/WorkflowTemplateLibrary.ts

export const PrebuiltTemplates = [
  { id: 'TPL-FRAUD', name: 'Fraud Response', trigger: 'Fraud Event', actions: ['Freeze Wallet', 'Suspend Terminal'] },
  { id: 'TPL-SETTLE', name: 'Settlement Failure', trigger: 'Settlement Event', actions: ['Escalate SLA', 'Open Incident'] },
  { id: 'TPL-LIQ', name: 'Liquidity Risk', trigger: 'AI Insight Event', actions: ['Generate Report', 'Generate Notification'] },
  { id: 'TPL-KYC', name: 'KYC Expiration', trigger: 'Compliance Event', actions: ['Create Case', 'Create SLA'] },
  { id: 'TPL-TERM', name: 'Terminal Tampering', trigger: 'Terminal Event', actions: ['Suspend Terminal', 'Generate Notification'] },
  { id: 'TPL-CB', name: 'Chargeback Escalation', trigger: 'Transaction Event', actions: ['Create Approval Request'] },
  { id: 'TPL-HIGH_VAL', name: 'High Value Transaction', trigger: 'Transaction Event', actions: ['Create Case', 'Assign User'] },
  { id: 'TPL-DORMANT', name: 'Dormant Wallet Reactivation', trigger: 'Wallet Event', actions: ['Create Approval Request'] },
  { id: 'TPL-EXEC', name: 'Executive Risk Escalation', trigger: 'SLA Event', actions: ['Generate Notification', 'Escalate'] }
]

class TemplateLibrary {
  getTemplates() {
    return PrebuiltTemplates
  }
}

export const WorkflowTemplateLibrary = new TemplateLibrary()
