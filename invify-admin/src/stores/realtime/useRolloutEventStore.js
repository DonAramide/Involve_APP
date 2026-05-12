// invify-admin/src/stores/realtime/useRolloutEventStore.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { operationalEventBusSingleton } from '../../services/realtime/OperationalEventBus'

/**
 * Reactive Deployment Rollouts Realtime Event Store.
 * Centralizes incoming OTA batch execution pipelines, step progress calculations,
 * and high-severity edge rollback metrics directly from middleware message channels.
 */
export const useRolloutEventStore = defineStore('realtime_rollout_events', () => {
  const rollouts = ref([])
  const maxLimit = 150
  const pendingBuffer = ref([])
  const activeTenantScope = ref('global')

  // Collect deployment batch events
  operationalEventBusSingleton.on('ROLLOUT_STEP_UPDATE', (envelope) => {
    pushToBuffer(envelope)
  })

  operationalEventBusSingleton.on('ROLLBACK_TRIGGERED', (envelope) => {
    pushToBuffer(envelope)
  })

  const pushToBuffer = (envelope) => {
    if (activeTenantScope.value !== 'global' && envelope.tenantId !== activeTenantScope.value) {
      return
    }
    pendingBuffer.value.push(envelope)
  }

  // Decoupled flushing aggregation window
  setInterval(() => {
    if (pendingBuffer.value.length === 0) return

    rollouts.value.unshift(...pendingBuffer.value)
    pendingBuffer.value = []

    if (rollouts.value.length > maxLimit) {
      rollouts.value.splice(maxLimit)
    }
  }, 1000)

  const setTenantFilter = (tenantId) => {
    activeTenantScope.value = tenantId || 'global'
  }

  // Reactive counters tracking continuous fleet software status metrics
  const activeRollbacksCount = computed(() => {
    return rollouts.value.filter(r => r.eventType === 'ROLLBACK_TRIGGERED' || r.severity === 'CRITICAL').length
  })

  const clearStore = () => {
    rollouts.value = []
    pendingBuffer.value = []
  }

  return {
    rollouts,
    activeTenantScope,
    activeRollbacksCount,
    setTenantFilter,
    clearStore
  }
})
