// invify-admin/src/services/NotificationTemplateRegistry.ts

export interface NotificationTemplate {
  templateId: string
  category: string
  priority: string
  titleTemplate: string
  messageTemplate: string
}

class TemplateRegistry {
  private templates: Record<string, NotificationTemplate> = {
    'FRAUD_VELOCITY': {
      templateId: 'FRAUD_VELOCITY',
      category: 'Fraud',
      priority: 'Critical',
      titleTemplate: 'Velocity Threshold Breached: {entityId}',
      messageTemplate: 'Entity {entityId} has processed {count} transactions in {window} minutes.'
    },
    'SETTLEMENT_STALL': {
      templateId: 'SETTLEMENT_STALL',
      category: 'Settlement',
      priority: 'High',
      titleTemplate: 'Settlement Batch Stalled: {entityId}',
      messageTemplate: 'Batch {entityId} has been pending bank acknowledgement for > {hours} hours.'
    },
    'APPROVAL_REQUIRED': {
      templateId: 'APPROVAL_REQUIRED',
      category: 'Approvals',
      priority: 'Medium',
      titleTemplate: 'Pending {action} Approval',
      messageTemplate: 'Action on {entityType} {entityId} requires checker review.'
    }
  }

  getTemplate(templateId: string): NotificationTemplate | undefined {
    return this.templates[templateId]
  }

  compile(templateId: string, variables: Record<string, string>) {
    const tmpl = this.getTemplate(templateId)
    if (!tmpl) return null

    let compiledTitle = tmpl.titleTemplate
    let compiledMessage = tmpl.messageTemplate

    for (const [key, value] of Object.entries(variables)) {
      compiledTitle = compiledTitle.replace(new RegExp(`{${key}}`, 'g'), value)
      compiledMessage = compiledMessage.replace(new RegExp(`{${key}}`, 'g'), value)
    }

    return {
      title: compiledTitle,
      message: compiledMessage,
      category: tmpl.category,
      priority: tmpl.priority
    }
  }
}

export const NotificationTemplateRegistry = new TemplateRegistry()
