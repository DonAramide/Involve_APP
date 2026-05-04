// src/composables/useUsage.js
import { ref, computed, onMounted } from 'vue'
import { billingApi } from '../api'

// Global singleton state to avoid redundant API calls
const usageData = ref({
  usage: 0,
  limit: 20,
  percentage: 0,
  plan: 'free'
})

const loading = ref(false)
const initialized = ref(false)

export function useUsage() {
  const fetchUsage = async () => {
    if (loading.value) return
    loading.value = true
    try {
      const { data } = await billingApi.getStatus()
      usageData.value = {
        usage: data.usage,
        limit: data.limit,
        percentage: data.percentage,
        plan: data.plan
      }
      initialized.value = true
    } catch (error) {
      console.error('[useUsage] Failed to fetch usage stats:', error)
    } finally {
      loading.value = false
    }
  }

  // Reactive Indicators
  const usagePercent = computed(() => usageData.value.percentage)
  const isNearLimit = computed(() => usageData.value.percentage >= 70 && usageData.value.percentage < 100)
  const isHardLimit = computed(() => usageData.value.percentage >= 100)
  
  // A "Critical Block" means user has used their grace period or we just want to block at 100%
  // We'll treat >= 100% as the trigger for the Upgrade Modal
  const needsUpgrade = computed(() => usageData.value.percentage >= 100)

  onMounted(() => {
    if (!initialized.value) {
      fetchUsage()
    }
  })

  return {
    usageData,
    usagePercent,
    isNearLimit,
    isHardLimit,
    needsUpgrade,
    fetchUsage,
    loading
  }
}
