// invify-admin/src/stores/realtime/useIntegrityEventStore.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { operationalEventBusSingleton } from '../../services/realtime/OperationalEventBus'

/**
 * Reactive Security Integrity Realtime Event Store.
 * Centralizes parsed cryptographic handshakes, secure boot attestation status checks,
 * and ongoing hardware integrity signatures directly from unified normalizer feeds.
 */
export const useIntegrityEventStore = defineStore('realtime_integrity_events', () => {
  const traces = ref([])
  const maxLimit = 150
  const pendingBuffer = ref([])
  const activeTenantScope = ref('global')

  // Collect integrity verification event strings
  operationalEventBusSingleton.on('INTEGRITY_ATTESTATION', (envelope) => {
    pushToBuffer(envelope)
  })

  operationalEventBusSingleton.on('CRYPTO_HEARTBEAT', (envelope) => {
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

    traces.value.unshift(...pendingBuffer.value)
    pendingBuffer.value = []

    if (traces.value.length > maxLimit) {
      traces.value.splice(maxLimit)
    }
  }, 1000)

  const setTenantFilter = (tenantId) => {
    activeTenantScope.value = tenantId || 'global'
  }

  const failedAttestationsCount = computed(() => {
    return traces.value.filter(t => t.severity === 'CRITICAL' || t.payload?.attestationPassed === false).length
  })

  const clearStore = () => {
    traces.value = []
    pendingBuffer.value = []
  }

  return {
    traces,
    activeTenantScope,
    failedAttestationsCount,
    setTenantFilter,
    clearStore
  }
})
