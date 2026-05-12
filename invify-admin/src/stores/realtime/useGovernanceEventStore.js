// invify-admin/src/stores/realtime/useGovernanceEventStore.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { operationalEventBusSingleton } from '../../services/realtime/OperationalEventBus'

/**
 * Reactive Governance Operations Realtime Event Store.
 * Centralizes incoming policy drift calculations, real-time trust scoring updates,
 * and quarantine audit footprints directly from normalized event ingestion layers.
 */
export const useGovernanceEventStore = defineStore('realtime_governance_events', () => {
  const policies = ref([])
  const maxLimit = 150
  const pendingBuffer = ref([])
  const activeTenantScope = ref('global')

  // Collect policy state events from shared Operational Event Bus
  operationalEventBusSingleton.on('POLICY_EVALUATION', (envelope) => {
    pushToBuffer(envelope)
  })

  operationalEventBusSingleton.on('QUARANTINE_AUDIT', (envelope) => {
    pushToBuffer(envelope)
  })

  const pushToBuffer = (envelope) => {
    if (activeTenantScope.value !== 'global' && envelope.tenantId !== activeTenantScope.value) {
      return
    }
    pendingBuffer.value.push(envelope)
  }

  // Decoupled flushing aggregation cycle
  setInterval(() => {
    if (pendingBuffer.value.length === 0) return

    policies.value.unshift(...pendingBuffer.value)
    pendingBuffer.value = []

    if (policies.value.length > maxLimit) {
      policies.value.splice(maxLimit)
    }
  }, 1000)

  const setTenantFilter = (tenantId) => {
    activeTenantScope.value = tenantId || 'global'
  }

  // Reactive analytics metrics
  const activeQuarantineCount = computed(() => {
    return policies.value.filter(p => p.eventType === 'QUARANTINE_AUDIT' || p.severity === 'CRITICAL').length
  })

  const clearStore = () => {
    policies.value = []
    pendingBuffer.value = []
  }

  return {
    policies,
    activeTenantScope,
    activeQuarantineCount,
    setTenantFilter,
    clearStore
  }
})
