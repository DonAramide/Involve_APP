// invify-admin/src/services/WorkflowRuleRegistry.ts

export const TriggerTypes = [
  'Transaction Event', 'Settlement Event', 'Fraud Event', 'Compliance Event',
  'Wallet Event', 'Card Event', 'Terminal Event', 'Revenue Event',
  'Tenant Event', 'Executive Event', 'AI Insight Event', 'Approval Event', 'SLA Event'
]

export const ConditionTypes = [
  'Amount Threshold', 'Risk Score', 'Tenant Type', 'Transaction Volume',
  'Wallet Balance', 'Settlement Value', 'Compliance Status', 'Fraud Flags',
  'Region', 'Device State', 'Terminal State', 'Time Window'
]

export const ActionTypes = [
  'Create Case', 'Freeze Wallet', 'Unfreeze Wallet', 'Suspend Terminal',
  'Block Card', 'Create Approval Request', 'Generate Notification', 'Assign User',
  'Create SLA', 'Escalate', 'Generate Audit Event', 'Generate Report', 'Open Incident'
]

class RuleRegistry {
  getAvailableTriggers() {
    return TriggerTypes
  }
  
  getAvailableConditions() {
    return ConditionTypes
  }
  
  getAvailableActions() {
    return ActionTypes
  }
}

export const WorkflowRuleRegistry = new RuleRegistry()
