// invify-admin/src/composables/useContextualIntelligence.js
import { ref, reactive, watch, onUnmounted } from 'vue'
import { ContextualIntelligenceRegistry } from '../contextual-intelligence/ContextualIntelligenceRegistry'
import { ContextualSettingsEngine, CONTEXT_PRESETS } from '../contextual-intelligence/ContextualSettingsEngine'
import { ContextualSearchIndexEngine } from '../contextual-intelligence/ContextualSearchIndexEngine'
import { ContextualPerformanceGuard } from '../contextual-intelligence/ContextualPerformanceGuard'

// Keep state global across all composable instances to act like a lightweight Pinia store
const settings = ref(ContextualSettingsEngine.loadSettings())
const breakerTripped = ref(false)
const activeFps = ref(60)
const activeEps = ref(0)
const drawerOpen = ref(false)
const activeHoverKey = ref(null)

// History & progression metrics
const exploredKeys = ref(settings.value.learningProgress?.exploredKeys || [])
const conceptsMastered = ref(settings.value.learningProgress?.conceptsMastered || [])
const certificationLevel = ref(settings.value.learningProgress?.certificationLevel || 'Associate Operator I')

// Narrated Guided Tour steps
const tourActive = ref(false)
const tourStep = ref(0)
const tourSteps = ['fleet-presence', 'compliance-drift', 'anomaly-rca', 'soc-quarantine']

// Frequency counter of accessed critical views to trigger incident recommendations
const criticalAccessCounts = reactive({})

// Subscribe composable state to the Performance Circuit Breaker
const unsubscribeBreaker = ContextualPerformanceGuard.subscribe((tripped, fps, eps) => {
  breakerTripped.value = tripped
  activeFps.value = fps
  activeEps.value = eps
})

export function useContextualIntelligence() {
  
  const savePreferences = () => {
    settings.value.learningProgress = {
      exploredKeys: exploredKeys.value,
      conceptsMastered: conceptsMastered.value,
      certificationLevel: certificationLevel.value
    }
    ContextualSettingsEngine.saveSettings(settings.value)
  }

  const applyPreset = (presetId) => {
    const presetSettings = ContextualSettingsEngine.getPresetSettings(presetId)
    if (presetSettings) {
      settings.value = {
        ...settings.value,
        ...presetSettings,
        activePreset: presetId
      }
      savePreferences()
    }
  }

  const toggleGuidanceGlobal = () => {
    settings.value.enabled = !settings.value.enabled
    savePreferences()
  }

  const toggleIncidentMode = () => {
    settings.value.incidentModeActive = !settings.value.incidentModeActive
    if (settings.value.incidentModeActive) {
      // Force enhanced alerts rendering during active incidents
      settings.value.severityRendering = 'enhanced'
    } else {
      // Restore standard operator settings
      const preset = CONTEXT_PRESETS[settings.value.activePreset]
      if (preset) {
        settings.value.severityRendering = preset.settings.severityRendering
      }
    }
    savePreferences()
  }

  const togglePinKey = (key) => {
    if (!conceptsMastered.value.includes(key)) {
      conceptsMastered.value.push(key)
    } else {
      conceptsMastered.value = conceptsMastered.value.filter(k => k !== key)
    }
    savePreferences()
  }

  const isPinned = (key) => {
    return conceptsMastered.value.includes(key)
  }

  const logHistoryView = (key) => {
    if (!key) return
    
    // 1. Record viewed hint history
    if (!exploredKeys.value.includes(key)) {
      exploredKeys.value.unshift(key)
      if (exploredKeys.value.length > 20) {
        exploredKeys.value.pop()
      }
    }

    // 2. Training Progression: Advance Certification Tier based on explored items
    const uniqueExploredCount = exploredKeys.value.length
    if (uniqueExploredCount >= 7) {
      certificationLevel.value = 'Executive SOC Administrator V (Master)'
    } else if (uniqueExploredCount >= 5) {
      certificationLevel.value = 'Senior Security Analyst III'
    } else if (uniqueExploredCount >= 3) {
      certificationLevel.value = 'Console Operator II'
    }

    // 3. Track frequency of viewing critical items to suggest escalation helpers
    const item = ContextualIntelligenceRegistry[key]
    if (item && item.severity === 'CRITICAL') {
      criticalAccessCounts[key] = (criticalAccessCounts[key] || 0) + 1
    }

    savePreferences()
  }

  // Suggest operational escalation helpers if an operator views a critical component repeatedly
  const getEscalationAdvice = (key) => {
    const views = criticalAccessCounts[key] || 0
    if (views >= 3) {
      return {
        thresholdTripped: true,
        message: `Operator has viewed the ${ContextualIntelligenceRegistry[key]?.title} dashboard warning ${views} times within this session.`,
        actionLabel: 'Launch Root Cause Analysis',
        route: '/ai/copilot'
      }
    }
    return { thresholdTripped: false }
  }

  // Walkthrough Playback Engine
  const startWalkthrough = () => {
    tourActive.value = true
    tourStep.value = 0
    settings.value.guidedWalkthroughActive = true
    activeHoverKey.value = tourSteps[0]
    logHistoryView(tourSteps[0])
    savePreferences()
  }

  const advanceWalkthrough = () => {
    if (!tourActive.value) return
    if (tourStep.value < tourSteps.length - 1) {
      tourStep.value++
      activeHoverKey.value = tourSteps[tourStep.value]
      logHistoryView(tourSteps[tourStep.value])
    } else {
      stopWalkthrough()
    }
  }

  const stopWalkthrough = () => {
    tourActive.value = false
    tourStep.value = 0
    settings.value.guidedWalkthroughActive = false
    activeHoverKey.value = null
    savePreferences()
  }

  const searchRegistry = (query) => {
    return ContextualSearchIndexEngine.search(query)
  }

  const resolveKey = (key) => {
    // Check offline status. If navigator reports offline, return a customized precompiled cache index
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const offlineItem = ContextualIntelligenceRegistry[key]
      if (offlineItem) {
        return {
          ...offlineItem,
          operator: offlineItem.offlineCache || offlineItem.operator,
          isOfflineHydrated: true
        }
      }
    }
    return ContextualIntelligenceRegistry[key] || null
  }

  const logWebsocketPacket = (count = 1) => {
    ContextualPerformanceGuard.logTelemetryActivity(count)
  }

  return {
    settings,
    breakerTripped,
    activeFps,
    activeEps,
    drawerOpen,
    activeHoverKey,
    tourActive,
    tourStep,
    tourSteps,
    exploredKeys,
    conceptsMastered,
    certificationLevel,
    criticalAccessCounts,
    
    applyPreset,
    toggleGuidanceGlobal,
    toggleIncidentMode,
    togglePinKey,
    isPinned,
    logHistoryView,
    getEscalationAdvice,
    startWalkthrough,
    advanceWalkthrough,
    stopWalkthrough,
    searchRegistry,
    resolveKey,
    logWebsocketPacket
  }
}
