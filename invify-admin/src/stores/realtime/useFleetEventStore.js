// invify-admin/src/stores/realtime/useFleetEventStore.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { operationalEventBusSingleton } from '../../services/realtime/OperationalEventBus'

/**
 * Reactive Fleet Operations Realtime Event Store.
 * Decouples raw UI grid rendering from immediate continuous network socket writes.
 * Supports batched update flushes, optimistic localized patchings, and tenant filtering.
 */
export const useFleetEventStore = defineStore('realtime_fleet_events', () => {
  const events = ref([])
  const maxEventsLimit = 150
  const unbatchedBuffer = ref([])
  const activeTenantScope = ref('global')

  // Listen directly to Operational Event Bus streams
  operationalEventBusSingleton.on('FLEET_HEARTBEAT', (envelope) => {
    bufferIncomingEnvelope(envelope)
  })

  operationalEventBusSingleton.on('GENERAL_TELEMETRY', (envelope) => {
    // Only buffer telemetry matching active namespace or general global pools
    bufferIncomingEnvelope(envelope)
  })

  const bufferIncomingEnvelope = (envelope) => {
    // Enforce Tenant Isolation scoping
    if (activeTenantScope.value !== 'global' && envelope.tenantId !== activeTenantScope.value) {
      return // Strip isolated external organizational packets cleanly
    }

    unbatchedBuffer.value.push(envelope)
  }

  // Throttled Batching Pipeline: Flush memory queue buffers exactly once every 1000ms
  // Prevents UI grid thrashing and browser layout freezing under large edge scale
  setInterval(() => {
    if (unbatchedBuffer.value.length === 0) return

    // Prepend batched entries directly to active reactive lists
    events.value.unshift(...unbatchedBuffer.value)
    unbatchedBuffer.value = [] // Reset buffer pool

    // Maintain stable linear space complexity
    if (events.value.length > maxEventsLimit) {
      events.value.splice(maxEventsLimit)
    }
  }, 1000)

  const setTenantFilter = (tenantId) => {
    activeTenantScope.value = tenantId || 'global'
    // Optional: filter down existing static buffers
  }

  // Optimistic rendering action simulator
  const optimisticPatchDeviceState = (deviceId, mutatedProps) => {
    const syntheticEnvelope = {
      version: '1.0',
      eventId: `opt_${Date.now()}`,
      eventType: 'DEVICE_PATCHED_OPTIMISTIC',
      timestamp: new Date().toISOString(),
      tenantId: activeTenantScope.value,
      severity: 'INFO',
      sourceAttribution: deviceId,
      payload: { ...mutatedProps, _optimistic: true }
    }
    events.value.unshift(syntheticEnvelope)
  }

  const clearStore = () => {
    events.value = []
    unbatchedBuffer.value = []
  }

  const latestEvents = computed(() => events.value)
  const totalBufferedCount = computed(() => events.value.length)

  return {
    events,
    activeTenantScope,
    latestEvents,
    totalBufferedCount,
    setTenantFilter,
    optimisticPatchDeviceState,
    clearStore
  }
})
