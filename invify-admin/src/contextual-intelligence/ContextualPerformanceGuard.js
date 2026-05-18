// invify-admin/src/contextual-intelligence/ContextualPerformanceGuard.js

/**
 * SOC-Grade Telemetry Safety Circuit Breaker
 * Ensures that guidance layers never block or degrade real-time metrics,
 * chart renders, or live websocket operations.
 */
class PerformanceGuard {
  constructor() {
    this.activeFps = 60
    this.messageRateEps = 0 // Events per second
    this.tripped = false
    this.listeners = new Set()
    
    this.frameCount = 0
    this.lastFpsCheck = performance.now()
    this.breakerTripThresholdFps = 40
    this.breakerTripThresholdEps = 500
    
    // Start FPS tracking in browser environment
    if (typeof window !== 'undefined') {
      this.initFpsTracker()
      this.initEpsAutodecay()
    }
  }

  initFpsTracker() {
    const tick = () => {
      this.frameCount++
      const now = performance.now()
      const elapsed = now - this.lastFpsCheck

      if (elapsed >= 1000) {
        this.activeFps = Math.round((this.frameCount * 1000) / elapsed)
        this.frameCount = 0
        this.lastFpsCheck = now
        this.evaluateBreakerStatus()
      }
      requestAnimationFrame(tick)
    }
    
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(tick)
    }
  }

  initEpsAutodecay() {
    // Gracefully decay event-per-second spike metrics on 2s intervals
    setInterval(() => {
      if (this.messageRateEps > 0) {
        this.messageRateEps = Math.max(0, Math.round(this.messageRateEps * 0.7))
        this.evaluateBreakerStatus()
      }
    }, 2000)
  }

  /**
   * Log an inbound websocket message or high-rate chart repaint event.
   */
  logTelemetryActivity(count = 1) {
    this.messageRateEps += count
    this.evaluateBreakerStatus()
  }

  evaluateBreakerStatus() {
    const shouldTrip = 
      this.activeFps < this.breakerTripThresholdFps || 
      this.messageRateEps > this.breakerTripThresholdEps

    if (shouldTrip !== this.tripped) {
      this.tripped = shouldTrip
      console.warn(
        `Contextual Intelligence Performance Breaker state shifted to: ${this.tripped ? 'ACTIVE (TRIPPED)' : 'NOMINAL'}. ` +
        `FPS: ${this.activeFps}, WS-Rate: ${this.messageRateEps} EPS`
      )
      this.notifyListeners()
    }
  }

  subscribe(callback) {
    this.listeners.add(callback)
    // Instant initial callback dispatch
    callback(this.tripped, this.activeFps, this.messageRateEps)
    return () => this.listeners.delete(callback)
  }

  notifyListeners() {
    this.listeners.forEach((callback) => {
      try {
        callback(this.tripped, this.activeFps, this.messageRateEps)
      } catch (e) {
        console.error('Error dispatching performance breaker status updates:', e)
      }
    })
  }
}

export const ContextualPerformanceGuard = new PerformanceGuard()
