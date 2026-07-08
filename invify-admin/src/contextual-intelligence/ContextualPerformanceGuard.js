// invify-admin/src/contextual-intelligence/ContextualPerformanceGuard.js

/**
 * SOC-Grade Telemetry Safety Circuit Breaker
 * Ensures that guidance layers never block or degrade real-time metrics,
 * chart renders, or live websocket operations.
 *
 * THRESHOLDS (updated):
 *   FPS trip:    < 22 fps  (was 40 — too aggressive for dev/low-end hardware)
 *   FPS recover: > 30 fps  (hysteresis band prevents flip-flopping)
 *   EPS trip:    > 2000 eps (was 500 — too low for normal activity)
 */
class PerformanceGuard {
  constructor() {
    this.activeFps = 60
    this.messageRateEps = 0 // Events per second
    this.tripped = false
    this.listeners = new Set()
    
    this.frameCount = 0
    this.lastFpsCheck = performance.now()
    
    // Trip thresholds with hysteresis to prevent rapid oscillation
    this.TRIP_FPS     = 22    // Trip  when FPS drops below this
    this.RECOVER_FPS  = 30    // Clear when FPS recovers above this
    this.TRIP_EPS     = 2000  // Trip  when event rate exceeds this
    this.RECOVER_EPS  = 1500  // Clear when event rate drops below this
    
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
    let shouldTrip

    if (this.tripped) {
      // Currently tripped: only clear when metrics recover past the RECOVERY threshold (hysteresis)
      const fpsRecovered = this.activeFps >= this.RECOVER_FPS
      const epsRecovered = this.messageRateEps <= this.RECOVER_EPS
      shouldTrip = !(fpsRecovered && epsRecovered)
    } else {
      // Currently clear: only trip when metrics exceed the TRIP threshold
      const fpsCritical  = this.activeFps < this.TRIP_FPS
      const epsCritical  = this.messageRateEps > this.TRIP_EPS
      shouldTrip = fpsCritical || epsCritical
    }

    if (shouldTrip !== this.tripped) {
      this.tripped = shouldTrip
      // Use debug-level logging — this should not appear in normal console output
      if (process.env.NODE_ENV !== 'production') {
        console.debug(
          `[PerfGuard] Breaker → ${this.tripped ? 'TRIPPED' : 'NOMINAL'} ` +
          `(FPS: ${this.activeFps}, EPS: ${this.messageRateEps})`
        )
      }
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

