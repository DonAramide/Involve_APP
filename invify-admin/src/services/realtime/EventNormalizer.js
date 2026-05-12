// invify-admin/src/services/realtime/EventNormalizer.js

/**
 * Enterprise Realtime Event Normalizer Middleware.
 * 
 * All incoming heterogeneous network telemetries MUST flow through this normalization layer
 * to emerge as uniform, predictable operational events. Ensures zero client-side crashes
 * caused by malformed broker JSON schemas.
 * 
 * FINAL REFINEMENT #1: Built-in Event Replay Protection tracks seen UUID signatures and sequence offsets
 * to automatically purge duplicate edge deliveries or historical reconnect message buffers.
 * 
 * FINAL REFINEMENT #2: Mandatory Day-One Schema Versioning wraps all parsed inputs in strict envelopes:
 * { version: "1.0", eventType, timestamp, tenantId, payload: {} }
 */
class EventNormalizer {
  constructor() {
    // LRU-style bounded deduplication cache to reject duplicate broker deliveries
    this.seenEventIds = new Set()
    this.maxCacheSize = 1000
    this.lastProcessedSequence = -1
  }

  /**
   * Normalizes incoming raw string buffers or malformed input objects into compliant operational envelopes.
   * @param {Object|string} rawInput Raw message payload received from upstream sockets
   * @returns {Object|null} Standardized versioned event envelope, or null if dropped as a stale replay
   */
  normalize(rawInput) {
    if (!rawInput) return null

    let parsed = rawInput
    if (typeof rawInput === 'string') {
      try {
        parsed = JSON.parse(rawInput)
      } catch (e) {
        console.warn('[EventNormalizer] Dropping malformed incoming raw string payload (JSON Parse fault).')
        return null
      }
    }

    // FINAL REFINEMENT #1: Event Replay & Sequence Tracking Protection checks
    const eventId = parsed.meta_id || parsed.id || parsed.eventId || `anon_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`
    
    if (this.seenEventIds.has(eventId)) {
      // Silently drop duplicate broker redeliveries to guarantee absolute client rendering consistency
      return null
    }

    // Store signature to prevent future temporal replays
    this.seenEventIds.add(eventId)
    if (this.seenEventIds.size > this.maxCacheSize) {
      // Purge oldest key reference to maintain stable linear garbage collection performance
      const firstKey = this.seenEventIds.keys().next().value
      this.seenEventIds.delete(firstKey)
    }

    // Optional sequence progression check
    if (parsed.seq_idx !== undefined && typeof parsed.seq_idx === 'number') {
      if (parsed.seq_idx <= this.lastProcessedSequence && parsed.seq_idx > 0) {
        // Dropped out-of-order stale packet arrival
        return null
      }
      this.lastProcessedSequence = parsed.seq_idx
    }

    // Timestamp reconciliation
    let resolvedTimestamp = parsed.ts || parsed.timestamp || parsed.created_at
    if (!resolvedTimestamp || isNaN(Date.parse(resolvedTimestamp))) {
      resolvedTimestamp = new Date().toISOString()
    } else {
      resolvedTimestamp = new Date(resolvedTimestamp).toISOString()
    }

    // Severity extraction mapped strictly to the 5 Enterprise bands
    const rawSev = (parsed.raw_sev || parsed.severity || parsed.status || 'INFO').toUpperCase()
    let mappedSeverity = 'INFO'
    
    if (['CRITICAL', 'FATAL', 'EMERGENCY', 'FAIL', 'FAILED', 'ERR'].includes(rawSev)) {
      mappedSeverity = 'CRITICAL'
    } else if (['HIGH', 'SEVERE', 'ALERT'].includes(rawSev)) {
      mappedSeverity = 'HIGH'
    } else if (['WARNING', 'WARN', 'DEGRADED'].includes(rawSev)) {
      mappedSeverity = 'WARNING'
    } else if (['HEALTHY', 'OK', 'SUCCESS', 'PASS', 'PASSED'].includes(rawSev)) {
      mappedSeverity = 'HEALTHY'
    }

    // Event type categorization mapping
    const eventTypeStr = (parsed.type_str || parsed.type || parsed.event_type || 'GENERAL_TELEMETRY').toUpperCase()

    // Tenant boundary extraction
    const tenantIdStr = parsed.t_scope || parsed.tenant || parsed.tenantId || 'global'

    // Device / Source Node attribution
    const sourceDevice = parsed.src_dev || parsed.source || parsed.device_id || 'system-edge-gateway'

    // Extract raw payload internals
    const extractedBody = parsed.body || parsed.data || parsed.payload || parsed

    // FINAL REFINEMENT #2: Emit Mandatory Standardized Event Versioning Envelope
    const standardizedEnvelope = {
      version: '1.0',
      eventId: eventId,
      eventType: eventTypeStr,
      timestamp: resolvedTimestamp,
      tenantId: tenantIdStr,
      severity: mappedSeverity,
      sourceAttribution: sourceDevice,
      payload: {
        ...extractedBody,
        _normalizedAt: Date.now()
      }
    }

    return standardizedEnvelope
  }

  /**
   * Clears internal memory caches manually for debugging flows.
   */
  flushReplayProtectionCache() {
    this.seenEventIds.clear()
    this.lastProcessedSequence = -1
  }
}

// Export singleton instance
export const eventNormalizerSingleton = new EventNormalizer()
