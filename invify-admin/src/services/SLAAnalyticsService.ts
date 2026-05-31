// invify-admin/src/services/SLAAnalyticsService.ts
import { SLAEngine } from './SLAEngine'

class SLAAnalyticsEngine {
  getComplianceMetrics() {
    const slas = SLAEngine.getSLAs()
    const total = slas.length
    if (total === 0) return { compliancePercent: 100, avgResolutionMinutes: 0 }

    const breached = slas.filter(s => s.status === 'Breached').length
    const resolved = slas.filter(s => s.status === 'Resolved')
    
    let totalMins = 0
    resolved.forEach(s => {
      if (s.resolvedAt && s.createdAt) {
        totalMins += (new Date(s.resolvedAt).getTime() - new Date(s.createdAt).getTime()) / 60000
      }
    })

    return {
      compliancePercent: Math.round(((total - breached) / total) * 100),
      avgResolutionMinutes: resolved.length ? Math.round(totalMins / resolved.length) : 0,
      totalOpen: slas.filter(s => !['Resolved', 'Cancelled', 'Breached'].includes(s.status)).length,
      totalBreached: breached,
      totalAtRisk: slas.filter(s => s.status === 'At Risk' || s.status === 'Approaching Deadline').length,
      totalEscalated: slas.filter(s => s.escalationLevel > 0).length
    }
  }

  getDepartmentScores() {
    return [
      { dept: 'Fraud', score: 98 },
      { dept: 'Compliance', score: 92 },
      { dept: 'Treasury', score: 99 },
      { dept: 'Settlement', score: 85 } // Mock score
    ]
  }
}

export const SLAAnalyticsService = new SLAAnalyticsEngine()
