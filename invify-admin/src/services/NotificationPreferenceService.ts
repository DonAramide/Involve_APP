// invify-admin/src/services/NotificationPreferenceService.ts
import { ref } from 'vue'

export interface ChannelPreferences {
  inApp: boolean
  email: boolean
  sms: boolean
  push: boolean
  webhook: boolean
}

export type CategoryPreferences = Record<string, ChannelPreferences>

class NotificationPreferenceEngine {
  private prefs = ref<CategoryPreferences>({})

  constructor() {
    this.seedDefaults()
  }

  private seedDefaults() {
    this.prefs.value = {
      'System': { inApp: true, email: false, sms: false, push: false, webhook: false },
      'Transactions': { inApp: true, email: false, sms: false, push: false, webhook: false },
      'Ledger': { inApp: true, email: false, sms: false, push: false, webhook: false },
      'Settlement': { inApp: true, email: true, sms: true, push: false, webhook: false },
      'Treasury': { inApp: true, email: true, sms: false, push: false, webhook: false },
      'Revenue': { inApp: true, email: false, sms: false, push: false, webhook: false },
      'Fraud': { inApp: true, email: true, sms: true, push: true, webhook: true },
      'Compliance': { inApp: true, email: true, sms: false, push: false, webhook: false },
      'Tenant': { inApp: true, email: false, sms: false, push: false, webhook: false },
      'Terminal': { inApp: true, email: false, sms: false, push: false, webhook: false },
      'Wallet': { inApp: true, email: false, sms: false, push: false, webhook: false },
      'Card': { inApp: true, email: false, sms: false, push: false, webhook: false },
      'Executive': { inApp: true, email: true, sms: true, push: true, webhook: false },
      'AI Insights': { inApp: true, email: true, sms: false, push: false, webhook: false },
      'Workflow': { inApp: true, email: false, sms: false, push: false, webhook: false },
      'Approvals': { inApp: true, email: true, sms: false, push: false, webhook: false }
    }
  }

  getPreferences() {
    return this.prefs.value
  }

  updateCategoryPreference(category: string, channels: Partial<ChannelPreferences>) {
    if (this.prefs.value[category]) {
      this.prefs.value[category] = { ...this.prefs.value[category], ...channels }
    }
  }
}

export const NotificationPreferenceService = new NotificationPreferenceEngine()
