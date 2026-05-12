// invify-admin/src/composables/useOperatorPreferences.js
import { ref, watch } from 'vue'

const STORAGE_KEY = 'invify_enterprise_operator_prefs'

/**
 * Stateful operator persistence logic to preserve operational preferences, sidebar layout states,
 * and contextual session routing history across repeated workflow visits.
 */
export function useOperatorPreferences() {
  // Load preferences from persistence layer
  const loadStoredPrefs = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) return JSON.parse(raw)
    } catch (e) {
      console.warn('Unable to load stored operator preferences, loading absolute defaults.')
    }
    return {
      activeWorkspace: 'fleet',
      sidebarCollapsed: false,
      pinnedViews: ['/fleet/overview', '/governance/compliance', '/observability/streams'],
      recentHistory: []
    }
  }

  const prefs = ref(loadStoredPrefs())

  // Save changes automatically
  const savePreferences = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs.value))
    } catch (e) {
      console.error('Failed to serialize operator preferences to storage cache:', e)
    }
  }

  // Deep watcher synchronizing state mutations
  watch(() => prefs.value, () => {
    savePreferences()
  }, { deep: true })

  const setActiveWorkspace = (workspaceId) => {
    prefs.value.activeWorkspace = workspaceId
  }

  const toggleSidebarCollapse = () => {
    prefs.value.sidebarCollapsed = !prefs.value.sidebarCollapsed
  }

  const togglePinView = (path) => {
    const index = prefs.value.pinnedViews.indexOf(path)
    if (index === -1) {
      prefs.value.pinnedViews.push(path)
    } else {
      prefs.value.pinnedViews.splice(index, 1)
    }
  }

  const isViewPinned = (path) => {
    return prefs.value.pinnedViews.includes(path)
  }

  // Record visited operational routes
  const pushHistory = (routeObj) => {
    if (!routeObj || !routeObj.path) return
    // Ignore master error templates
    if (routeObj.path.includes('catchAll')) return

    const item = {
      path: routeObj.path,
      label: routeObj.meta?.title || routeObj.path.split('/').pop() || 'Overview',
      timestamp: Date.now()
    }

    // Remove duplicates
    prefs.value.recentHistory = prefs.value.recentHistory.filter(h => h.path !== routeObj.path)
    
    // Add to top of execution stack
    prefs.value.recentHistory.unshift(item)

    // Keep bounded to recent 12 items to prevent JSON bloat
    if (prefs.value.recentHistory.length > 12) {
      prefs.value.recentHistory.pop()
    }
  }

  const clearHistory = () => {
    prefs.value.recentHistory = []
  }

  return {
    prefs,
    setActiveWorkspace,
    toggleSidebarCollapse,
    togglePinView,
    isViewPinned,
    pushHistory,
    clearHistory
  }
}
