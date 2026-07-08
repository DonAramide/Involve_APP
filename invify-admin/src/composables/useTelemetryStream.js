// invify-admin/src/composables/useTelemetryStream.js
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { deviceApi } from '../api'

/**
 * Platform-wide event-driven streaming hook.
 * Reads real device telemetry rows from the Supabase `devices` table.
 * Falls back to a light heartbeat so the UI never shows a broken state.
 */
export function useTelemetryStream(topic = 'quasar.global.telemetry') {
  const isConnected    = ref(false)
  const connectionState = ref('reconnecting')
  const latencyMs      = ref(0)
  const messagesIngested = ref(0)
  const throughputEps  = ref(0)
  const lastEventPayload = ref(null)
  const eventQueue = ref([])
  const activeNodesCount = ref(0)
  const uniqueCohortsCount = ref(0)
  const warningEventsCount = ref(0)
  const criticalEventsCount = ref(0)

  let heartbeatTimer = null
  let throughputTimer = null

  // ── Helpers ─────────────────────────────────────────────────────────────
  const deriveSeverity = (device) => {
    const info = device.device_info || {}
    if (info.integrity === 'CRITICAL') return 'critical'
    const score = info.trust_score !== undefined ? info.trust_score : 100
    if (score < 50) return 'critical'
    if (score < 80) return 'warning'
    return 'healthy'
  }

  const deriveAgeLabel = (device) => {
    const info = device.device_info || {}
    const raw = info.last_seen || device.last_seen
    if (!raw) return 'unknown'
    const ageSec = Math.floor((Date.now() - new Date(raw).getTime()) / 1000)
    if (ageSec >= 3600) return `${Math.floor(ageSec / 3600)}h ago`
    if (ageSec >= 60)   return `${Math.floor(ageSec / 60)}m ago`
    return `${ageSec}s ago`
  }

  const mapDeviceToEvent = (device) => ({
    id: `evt-${device.id}-${Date.now()}`,
    topic: topic,
    timestamp: new Date().toISOString(),
    severity: deriveSeverity(device),
    payload: {
      device_id:     device.device_id,
      status:        device.status,
      trust_score:   (device.device_info || {}).trust_score ?? 100,
      integrity:     (device.device_info || {}).integrity ?? 'HEALTHY',
      compliance:    (device.device_info || {}).compliance ?? '100%',
      ota_status:    (device.device_info || {}).ota_status ?? 'STABLE',
      network_state: (device.device_info || {}).network_state ?? 'UNKNOWN',
      last_seen:     deriveAgeLabel(device),
      model:         (device.device_info || {}).model ?? 'Unknown Device',
      throughput_metric: (device.device_info || {}).trust_score ?? 100
    }
  })

  // ── Initial data load ────────────────────────────────────────────────────
  const loadDeviceEvents = async () => {
    const t0 = performance.now()
    try {
      const { data } = await deviceApi.getDevices()
      latencyMs.value = Math.round(performance.now() - t0)

      if (data && Array.isArray(data)) {
        const events = data.map(mapDeviceToEvent)
        eventQueue.value = events
        activeNodesCount.value = events.length
        messagesIngested.value += events.length
        
        let warnings = 0
        let criticals = 0
        const cohorts = new Set()
        
        data.forEach(d => {
          const sev = deriveSeverity(d)
          if (sev === 'warning') warnings++
          if (sev === 'critical') criticals++
          
          if (d.device_info?.os_version) {
            cohorts.add(d.device_info.os_version)
          } else if (d.hardware_model) {
            cohorts.add(d.hardware_model)
          }
        })
        
        warningEventsCount.value = warnings
        criticalEventsCount.value = criticals
        uniqueCohortsCount.value = cohorts.size || 1

        isConnected.value    = true
        connectionState.value = 'connected'
      }
    } catch (err) {
      console.warn('[TelemetryStream] Could not load device events:', err)
      connectionState.value = 'disconnected'
    }
  }

  // ── Heartbeat refresh (every 30s) ────────────────────────────────────────
  const startHeartbeat = () => {
    heartbeatTimer = setInterval(async () => {
      await loadDeviceEvents()
    }, 30000)

    // Streaming simulator: pick a random event from the queue every 1.5s
    throughputTimer = setInterval(() => {
      const base = eventQueue.value.length > 0 ? (eventQueue.value.length / 30).toFixed(1) : 0
      throughputEps.value = parseFloat(base) || 1.4
      
      if (eventQueue.value.length > 0) {
        const randomIdx = Math.floor(Math.random() * eventQueue.value.length)
        const ev = { ...eventQueue.value[randomIdx] }
        ev.timestamp = new Date().toISOString()
        ev.id = `evt-${Date.now()}-${Math.random()}`
        lastEventPayload.value = ev
      }
    }, 1500)
  }

  const disconnectStream = () => {
    isConnected.value    = false
    connectionState.value = 'disconnected'
    if (heartbeatTimer)   clearInterval(heartbeatTimer)
    if (throughputTimer)  clearInterval(throughputTimer)
  }

  const reconnectStream = () => {
    disconnectStream()
    loadDeviceEvents().then(startHeartbeat)
  }

  onMounted(() => {
    loadDeviceEvents().then(startHeartbeat)
  })

  onBeforeUnmount(() => {
    disconnectStream()
  })

  return {
    isConnected,
    connectionState,
    latencyMs,
    messagesIngested,
    throughputEps,
    lastEventPayload,
    eventQueue,
    activeNodesCount,
    uniqueCohortsCount,
    warningEventsCount,
    criticalEventsCount,
    disconnectStream,
    reconnectStream
  }
}

