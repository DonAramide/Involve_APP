// invify-admin/src/stores/realtime/useIncidentEventStore.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { operationalEventBusSingleton } from '../../services/realtime/OperationalEventBus'

/**
 * Reactive Incident Response Realtime Event Store.
 * Buffers high-severity security notifications, unacknowledged operational thresholds,
 * and edge degradation events directly from normalizer fanout chains.
 */
export const useIncidentEventStore = defineStore('realtime_incident_events', () => {
  const incidents = ref([])
  const maxLimit = 150
  const pendingBuffer = ref([])
  const activeTenantScope = ref('global')

  // Collect incident state triggers
  operationalEventBusSingleton.on('INCIDENT_TRIGGERED', (envelope) => {
    pushToBuffer(envelope)
  })

  // Listen to wildcard critical/high fallbacks
  operationalEventBusSingleton.on('*', (envelope) => {
    if (['CRITICAL', 'HIGH'].includes(envelope.severity) && envelope.eventType !== 'INCIDENT_TRIGGERED') {
      pushToBuffer(envelope)
    }
  })

  const pushToBuffer = (envelope) => {
    if (activeTenantScope.value !== 'global' && envelope.tenantId !== activeTenantScope.value) {
      return
    }
    pendingBuffer.value.push(envelope)
  }

  // Decoupled batch buffer flushing loop
  setInterval(() => {
    if (pendingBuffer.value.length === 0) return

    incidents.value.unshift(...pendingBuffer.value)
    pendingBuffer.value = []

    if (incidents.value.length > maxLimit) {
      incidents.value.splice(maxLimit)
    }
  }, 1000)

  const setTenantFilter = (tenantId) => {
    activeTenantScope.value = tenantId || 'global'
  }

  const unacknowledgedCriticalsCount = computed(() => {
    return incidents.value.filter(i => i.severity === 'CRITICAL' && !i.payload?._acknowledged).length
  })

  const acknowledgeIncident = (eventId) => {
    const target = incidents.value.find(i => i.eventId === eventId)
    if (target) {
      if (!target.payload) target.payload = {}
      target.payload._acknowledged = true
      target.payload._acknowledgedAt = Date.now()
    }
  }

  const clearStore = () => {
    incidents.value = []
    pendingBuffer.value = []
  }

  return {
    incidents,
    activeTenantScope,
    unacknowledgedCriticalsCount,
    setTenantFilter,
    acknowledgeIncident,
    clearStore
  }
})
