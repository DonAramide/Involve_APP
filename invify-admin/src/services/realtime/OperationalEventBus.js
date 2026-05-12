// invify-admin/src/services/realtime/OperationalEventBus.js
import { connectionManagerSingleton } from './RealtimeConnectionManager'
import { eventNormalizerSingleton } from './EventNormalizer'

/**
 * Global Operational Event Bus Core Layer.
 * 
 * Centralized distribution engine responsible for real-time stream fanout. Receives raw ingress buffers
 * from Connection Managers, routes them through explicit Normalizer Schema checking pipelines,
 * dispatches decoupled UI component listeners, and triggers priority severity toast notices.
 */
class OperationalEventBus {
  constructor() {
    // Component-level subscribers grouped by Target Topic keys
    this.subscribers = new Map()
    this.$q = null
    this.lastAlertToastFiredAt = 0 // Cooldown tracker preventing alert waterfall pile-ups

    // Bind normalizer processing bridge directly to upstream raw connection streams
    connectionManagerSingleton.setMessageReceivedHandler((rawPayload) => {
      this.dispatchIncomingRawPayload(rawPayload)
    })
  }

  /**
   * Binds global Quasar notify shell references to enable custom UI alert toast rendering.
   */
  registerQuasarContext($qInstance) {
    this.$q = $qInstance
    console.log('[OperationalBus] Registered global UI toast rendering context successfully.')
  }

  /**
   * Subscribes arbitrary layout handlers to normalized topic distribution loops.
   * @param {string} eventType Target stream routing category
   * @param {Function} callback Handler processing verified versioned JSON envelopes
   */
  on(eventType, callback) {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set())
    }
    this.subscribers.get(eventType).add(callback)
  }

  off(eventType, callback) {
    if (this.subscribers.has(eventType)) {
      this.subscribers.get(eventType).delete(callback)
    }
  }

  /**
   * Internal ingestion dispatcher handling normalizer validation and cross-workspace fanout broadcasts.
   */
  dispatchIncomingRawPayload(rawPayload) {
    // 1. Route strictly through Event Normalizer checking pipeline
    const normalizedEnvelope = eventNormalizerSingleton.normalize(rawPayload)
    
    // Dropped duplicate network redelivery or out-of-order stale package
    if (!normalizedEnvelope) return

    // 2. Broadcast downwards to all decoupled workspace/store level subscribers
    this.fanoutEvent(normalizedEnvelope)

    // 3. Evaluate toast alert constraints based on global operational severity levels
    this.evaluateAlertPropagation(normalizedEnvelope)
  }

  fanoutEvent(envelope) {
    const targetType = envelope.eventType
    
    // Invoke dedicated type listeners
    if (this.subscribers.has(targetType)) {
      this.subscribers.get(targetType).forEach(fn => {
        try { fn(envelope) } catch (e) { console.error('[OperationalBus] Handler exception during fanout:', e) }
      })
    }

    // Invoke global universal listeners mapping wildcard logging blocks
    if (this.subscribers.has('*')) {
      this.subscribers.get('*').forEach(fn => {
        try { fn(envelope) } catch (e) { console.error('[OperationalBus] Wildcard Handler exception:', e) }
      })
    }
  }

  evaluateAlertPropagation(envelope) {
    // Trigger desktop overlay banners strictly for critical platform state interferences
    if (['CRITICAL', 'HIGH'].includes(envelope.severity)) {
      // Suppress alert waterfall pile-ups via an 8-second operational cooldown window
      if (Date.now() - this.lastAlertToastFiredAt < 8000) {
        return // Silently route to background stores without flooding user viewport
      }

      this.lastAlertToastFiredAt = Date.now()
      const isCritical = envelope.severity === 'CRITICAL'
      
      // Prevent console crashing if UI framework instance remains unlinked
      if (this.$q && this.$q.notify) {
        this.$q.notify({
          message: `[${envelope.severity}] Stream Incident Detected`,
          caption: `Source Node: ${envelope.sourceAttribution} | Event: ${envelope.eventType}`,
          color: isCritical ? 'red-10' : 'deep-orange-10',
          textColor: isCritical ? 'red-2' : 'amber-3',
          icon: isCritical ? 'error' : 'warning',
          position: 'top-right',
          timeout: isCritical ? 6000 : 4000,
          actions: [
            { label: 'View Trace', color: 'white', handler: () => { console.log('Drilling down trace:', envelope) } }
          ]
        })
      } else {
        console.warn(`[OperationalBus Alert] ${envelope.severity} stream event requires attention:`, envelope)
      }
    }
  }

  /**
   * Dispatches custom synthetic payloads back upstream to edge clusters.
   */
  emitUpstream(eventType, payload, tenantId = 'global') {
    const wrapper = {
      action: 'BROADCAST',
      eventType,
      tenantId,
      timestamp: new Date().toISOString(),
      payload
    }
    connectionManagerSingleton.sendSocketPayload(wrapper)
  }
}

// Export single global architectural fanout singleton instance
export const operationalEventBusSingleton = new OperationalEventBus()
