import financialPlatformApi from '../api/financialPlatformApi'

export class FinancialPlatformPollingService {
  constructor() {
    this.intervalId = null
    this.statusListeners = []
    this.completionListeners = []
    this.failureListeners = []
  }

  start(provisioningToken, intervalMs = 2500) {
    if (this.intervalId) {
      this.stop()
    }

    console.log(`[PollingService] Started polling for token: ${provisioningToken}`)

    this.intervalId = setInterval(async () => {
      try {
        const response = await financialPlatformApi.getStatus(provisioningToken)
        const currentStatus = response.data.status
        const timelineData = response.data.timeline // e.g. [{ title, status, timestamp, error }]

        // Notify listeners
        this.statusListeners.forEach(cb => cb(currentStatus, timelineData))

        if (currentStatus === 'ACTIVE') {
          this.completionListeners.forEach(cb => cb())
          this.stop()
        } else if (currentStatus === 'DEGRADED' || currentStatus === 'SUSPENDED') {
          // or if the timeline explicitly has a FAILED step
          const hasFailure = timelineData?.some(step => step.status === 'FAILED')
          if (hasFailure) {
            this.failureListeners.forEach(cb => cb('Provisioning failed at one of the steps'))
            this.stop()
          }
        }
      } catch (error) {
        console.error('[PollingService] Polling failed', error)
        // Decide whether to keep polling or stop on network errors
        // For RC1, maybe we just log and continue to retry
      }
    }, intervalMs)
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
      console.log('[PollingService] Stopped polling')
    }
  }

  onStatusChanged(callback) {
    this.statusListeners.push(callback)
  }

  onCompleted(callback) {
    this.completionListeners.push(callback)
  }

  onFailed(callback) {
    this.failureListeners.push(callback)
  }
}

// Export as singleton
export default new FinancialPlatformPollingService()
