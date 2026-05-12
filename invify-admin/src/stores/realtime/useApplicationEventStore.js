// invify-admin/src/stores/realtime/useApplicationEventStore.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { operationalEventBusSingleton } from '../../services/realtime/OperationalEventBus'

/**
 * Reactive Application Intelligence & Runtime Governance Realtime Event Store.
 * Centralizes incoming package installation heartbeats, runtime permission audits,
 * accessibility interception stream alerts, and forensic lineage metrics.
 */
export const useApplicationEventStore = defineStore('realtime_application_events', () => {
  const installedApps = ref([])
  const forbiddenPolicies = ref([])
  const accessibilityAlerts = ref([])
  const sideloadLogs = ref([])

  const activeTenantScope = ref('global')
  const maxLimit = 200

  // Internal buffers handling throttled batch flush intervals to eliminate DOM reflow jitter
  const pendingAppUpdates = ref([])
  const pendingAccessibilityAlerts = ref([])
  const pendingSideloads = ref([])

  // Collect incoming normalized package stream messages
  operationalEventBusSingleton.on('PACKAGE_STATE_UPDATE', (envelope) => {
    if (activeTenantScope.value !== 'global' && envelope.tenantId !== activeTenantScope.value) return
    pendingAppUpdates.value.push(envelope)
  })

  operationalEventBusSingleton.on('ACCESSIBILITY_ABUSE_DETECTED', (envelope) => {
    if (activeTenantScope.value !== 'global' && envelope.tenantId !== activeTenantScope.value) return
    pendingAccessibilityAlerts.value.push(envelope)
  })

  operationalEventBusSingleton.on('SIDELOAD_INTEGRITY_DRIFT', (envelope) => {
    if (activeTenantScope.value !== 'global' && envelope.tenantId !== activeTenantScope.value) return
    pendingSideloads.value.push(envelope)
  })

  // Synchronous batch flusher running every 1000ms
  setInterval(() => {
    if (pendingAppUpdates.value.length > 0) {
      // Prepend updates
      installedApps.value.unshift(...pendingAppUpdates.value)
      pendingAppUpdates.value = []
      if (installedApps.value.length > maxLimit) installedApps.value.splice(maxLimit)
    }

    if (pendingAccessibilityAlerts.value.length > 0) {
      accessibilityAlerts.value.unshift(...pendingAccessibilityAlerts.value)
      pendingAccessibilityAlerts.value = []
      if (accessibilityAlerts.value.length > maxLimit) accessibilityAlerts.value.splice(maxLimit)
    }

    if (pendingSideloads.value.length > 0) {
      sideloadLogs.value.unshift(...pendingSideloads.value)
      pendingSideloads.value = []
      if (sideloadLogs.value.length > maxLimit) sideloadLogs.value.splice(maxLimit)
    }
  }, 1000)

  const setTenantFilter = (tenantId) => {
    activeTenantScope.value = tenantId || 'global'
  }

  // Reactive subfleet computed intelligence indicators
  const activeForbiddenViolationsCount = computed(() => {
    return installedApps.value.filter(a => a.trustState === 'BLOCKED' || a.trustState === 'RESTRICTED').length
  })

  const clearStore = () => {
    installedApps.value = []
    accessibilityAlerts.value = []
    sideloadLogs.value = []
    pendingAppUpdates.value = []
    pendingAccessibilityAlerts.value = []
    pendingSideloads.value = []
  }

  return {
    installedApps,
    forbiddenPolicies,
    accessibilityAlerts,
    sideloadLogs,
    activeTenantScope,
    activeForbiddenViolationsCount,
    setTenantFilter,
    clearStore
  }
})
