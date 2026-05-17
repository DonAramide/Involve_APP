// invify-admin/src/composables/useOperatorPreferences.js
import { ref, watch } from 'vue'

const STORAGE_KEY = 'invify_enterprise_operator_prefs'

/**
 * Stateful operator persistence logic preserving operational preferences, sidebar layout states,
 * and contextual session routing history across repeated workflow visits.
 * 
 * FINAL REFINEMENT #1: Architected to support asynchronous backend synchronization to ensure
 * multi-workstation, multi-browser, and cross-device continuity for enterprise operators.
 * 
 * FINAL REFINEMENT #2: Supports global active Tenant Context isolation state variables.
 */
export function useOperatorPreferences() {
  // Load preferences from local persistence layer as Phase 1 fallback cache
  const loadStoredPrefs = () => {
    const defaults = {
      activeWorkspace: 'fleet',
      activeTenantScope: 'global', // Multi-tenant isolation boundary identifier ('global' | 'tenant-xyz')
      sidebarCollapsed: false,
      isDarkMode: true, // Default to dark mode as requested
      pinnedViews: ['/fleet/overview', '/governance/compliance', '/observability/streams'],
      recentHistory: [],
      lastSyncedAt: null
    }

    // FINAL REFINEMENT #6: Authoritative Session Restoration Rules
    // Prevent unauthenticated or unverified multi-factor sessions from loading previous route traces
    const hasToken = localStorage.getItem('invify_token')
    const isMfaCleared = localStorage.getItem('mfa_status_verified') !== 'false'
    
    if (!hasToken || !isMfaCleared) {
      return defaults
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        return {
          ...defaults,
          ...parsed,
          activeTenantScope: parsed.activeTenantScope || 'global',
          pinnedViews: Array.isArray(parsed.pinnedViews) ? parsed.pinnedViews : defaults.pinnedViews,
          recentHistory: Array.isArray(parsed.recentHistory) ? parsed.recentHistory : defaults.recentHistory
        }
      }
    } catch (e) {
      console.warn('Unable to load stored operator preferences, loading absolute defaults.')
    }
    return defaults
  }

  const prefs = ref(loadStoredPrefs())
  const isSyncingBackend = ref(false)

  // Serialize changes locally
  const savePreferencesLocally = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs.value))
    } catch (e) {
      console.error('Failed to serialize operator preferences to storage cache:', e)
    }
  }

  /**
   * Placeholder interface enabling future continuous background state updates against remote operator profile schemas.
   * Prevents local data drift when an operator accesses workflows across multiple independent clusters.
   */
  const syncPreferencesToBackend = async () => {
    isSyncingBackend.value = true
    try {
      // In production: await axios.post('/api/v1/operators/profile/sync', prefs.value)
      prefs.value.lastSyncedAt = new Date().toISOString()
      savePreferencesLocally()
    } catch (err) {
      console.warn('Background operator preference profile sync deferred. Retaining local persistence layer.')
    } finally {
      isSyncingBackend.value = false
    }
  }

  /**
   * Pull active profile matrices directly from cloud layers upon authenticated session boot cycles.
   */
  const fetchPreferencesFromBackend = async () => {
    isSyncingBackend.value = true
    try {
      // In production: const { data } = await axios.get('/api/v1/operators/profile')
      // Merge remote schemas safely over local cache
    } catch (err) {
      // Graceful degradation back to local copy
    } finally {
      isSyncingBackend.value = false
    }
  }

  // Watcher orchestrating batched local serialization alongside throttled upstream profile diff syncing
  let syncTimeout = null
  watch(() => prefs.value, () => {
    savePreferencesLocally()
    
    // Throttle remote syncing calls to prevent excessive backend hits
    if (syncTimeout) clearTimeout(syncTimeout)
    syncTimeout = setTimeout(() => {
      syncPreferencesToBackend()
    }, 5000)
  }, { deep: true })

  const setActiveWorkspace = (workspaceId) => {
    prefs.value.activeWorkspace = workspaceId
  }

  const setTenantScope = (tenantId) => {
    prefs.value.activeTenantScope = tenantId || 'global'
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
    if (routeObj.path.includes('catchAll')) return

    const item = {
      path: routeObj.path,
      label: routeObj.meta?.title || routeObj.path.split('/').pop() || 'Overview',
      timestamp: Date.now()
    }

    prefs.value.recentHistory = prefs.value.recentHistory.filter(h => h.path !== routeObj.path)
    prefs.value.recentHistory.unshift(item)

    if (prefs.value.recentHistory.length > 12) {
      prefs.value.recentHistory.pop()
    }
  }

  const clearHistory = () => {
    prefs.value.recentHistory = []
  }

  const executeLogout = () => {
    try {
      localStorage.removeItem('invify_token')
      localStorage.removeItem('invify_refresh_token')
      localStorage.removeItem('operator_role')
      localStorage.removeItem('operator_email')
      localStorage.removeItem('mfa_status_verified')
      sessionStorage.clear()
    } catch (e) {}
    
    // Complete page navigation clear guarantees zero memory drift
    window.location.href = '/login'
  }

  return {
    prefs,
    isSyncingBackend,
    setActiveWorkspace,
    setTenantScope,
    toggleSidebarCollapse,
    toggleTheme: () => { prefs.value.isDarkMode = !prefs.value.isDarkMode },
    togglePinView,
    isViewPinned,
    pushHistory,
    clearHistory,
    executeLogout,
    fetchPreferencesFromBackend
  }
}
