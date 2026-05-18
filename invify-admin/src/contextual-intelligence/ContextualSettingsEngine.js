// invify-admin/src/contextual-intelligence/ContextualSettingsEngine.js

const STORAGE_KEY = 'invify_contextual_intelligence_settings'

export const CONTEXT_PRESETS = {
  soc: {
    label: 'SOC Operator Preset',
    description: 'Concise, high-fidelity operational descriptions of system statuses and workflows.',
    settings: {
      enabled: true,
      density: 'STANDARD',
      triggerMode: 'hover',
      severityRendering: 'restrained',
      drawerBehavior: { autoSuggest: true, routeAware: true, persistent: false },
      accessibility: { reducedMotion: false, largerFonts: false, keyboardOnly: false }
    }
  },
  engineering: {
    label: 'Advanced Engineering Preset',
    description: 'Deep technical layouts exposing telemetry pipelines, websocket connections, and API lineage.',
    settings: {
      enabled: true,
      density: 'FULL_ENGINEERING',
      triggerMode: 'hover',
      severityRendering: 'enhanced',
      drawerBehavior: { autoSuggest: true, routeAware: true, persistent: true },
      accessibility: { reducedMotion: false, largerFonts: false, keyboardOnly: false }
    }
  },
  executive: {
    label: 'Executive Oversight Preset',
    description: 'High-level business impacts, SLA metrics, and compliance-grade explanations.',
    settings: {
      enabled: true,
      density: 'MINIMAL',
      triggerMode: 'click',
      severityRendering: 'restrained',
      drawerBehavior: { autoSuggest: false, routeAware: true, persistent: false },
      accessibility: { reducedMotion: false, largerFonts: false, keyboardOnly: false }
    }
  },
  training: {
    label: 'Onboarding & Training Preset',
    description: 'Expanded explanations, narrated visual walkthroughs, and interactive concept checklists.',
    settings: {
      enabled: true,
      density: 'ADVANCED',
      triggerMode: 'hover',
      severityRendering: 'enhanced',
      drawerBehavior: { autoSuggest: true, routeAware: true, persistent: true },
      accessibility: { reducedMotion: false, largerFonts: true, keyboardOnly: false }
    }
  },
  minimal_focus: {
    label: 'Minimal Focus Preset',
    description: 'Mutes all standard hints. Displays overlays only for active high-severity incidents.',
    settings: {
      enabled: true,
      density: 'MINIMAL',
      triggerMode: 'click',
      severityRendering: 'pulse_critical',
      drawerBehavior: { autoSuggest: false, routeAware: false, persistent: false },
      accessibility: { reducedMotion: true, largerFonts: false, keyboardOnly: false }
    }
  }
}

const DEFAULT_SETTINGS = {
  enabled: true,
  density: 'STANDARD',
  triggerMode: 'hover',
  severityRendering: 'restrained',
  drawerBehavior: { autoSuggest: true, routeAware: true, persistent: false },
  accessibility: { reducedMotion: false, largerFonts: false, keyboardOnly: false },
  activePreset: 'soc',
  incidentModeActive: false,
  guidedWalkthroughActive: false,
  learningProgress: {
    conceptsMastered: [],
    exploredKeys: [],
    certificationLevel: 'Associate Operator I'
  }
}

export const ContextualSettingsEngine = {
  loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) {
        return { ...DEFAULT_SETTINGS }
      }
      const parsed = JSON.parse(raw)
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        drawerBehavior: { ...DEFAULT_SETTINGS.drawerBehavior, ...parsed.drawerBehavior },
        accessibility: { ...DEFAULT_SETTINGS.accessibility, ...parsed.accessibility },
        learningProgress: { ...DEFAULT_SETTINGS.learningProgress, ...parsed.learningProgress }
      }
    } catch (e) {
      console.warn('Failed to parse contextual intelligence settings from storage, loading defaults.')
      return { ...DEFAULT_SETTINGS }
    }
  },

  saveSettings(settings) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch (e) {
      console.error('Failed to write contextual intelligence settings to storage:', e)
    }
  },

  getPresetSettings(presetId) {
    const preset = CONTEXT_PRESETS[presetId]
    return preset ? preset.settings : null
  }
}
