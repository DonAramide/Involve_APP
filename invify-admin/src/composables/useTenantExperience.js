// invify-admin/src/composables/useTenantExperience.js
import { ref, computed } from 'vue'
import axios from 'axios'
import { joinApiUrl } from '../config/env'
import { setCssVar } from 'quasar'

const CACHE_KEY = 'invify_cached_experience_payload'

export function useTenantExperience() {
  // Try restoring initial state from local cached payload to guarantee instant offline initialization
  const loadCachedPayload = () => {
    const defaultState = {
      tenantId: 'global',
      industryType: 'retail',
      subscriptionTier: 'FREE',
      branding: {
        primary: '#22b8cf',
        secondary: '#4c6ef5',
        accent: '#fab005',
        darkBg: '#07090b',
        cardBg: '#0e1216',
        fontFamily: 'Inter, Roboto, sans-serif',
        logoUrl: '/assets/invify-logo-default.svg',
        companyName: 'Invify Enterprise Platform',
        layoutMode: 'standard_sidebar',
        versionHash: 'core-base-v1'
      },
      enabledModules: ['audit_trail', 'auth_core', 'operator_mgmt', 'base_analytics', 'notifications', 'billing_profile'],
      featureFlags: {
        enable_realtime_gps: false,
        enable_sso_federation: false,
        enable_offline_pos_sync: true,
        enable_canary_insights: false
      },
      usageQuotas: {},
      mobileNavigationPreset: 'retail_pos_lite'
    }

    try {
      const raw = localStorage.getItem(CACHE_KEY)
      if (raw) {
        return { ...defaultState, ...JSON.parse(raw) }
      }
    } catch (e) {}
    return defaultState
  }

  const experienceContext = ref(loadCachedPayload())
  const isLoadingContext = ref(false)
  const activeQuotaSeverity = ref('NORMAL')

  /**
   * Hydrate Complete Experience Map via Backend API API Gateway
   * Supports custom X-Headers reading to dynamically trigger enforcement degradation states.
   */
  const hydrateExperience = async (targetTenantId = 'global') => {
    isLoadingContext.value = true
    try {
      const operatorRole = localStorage.getItem('operator_role') || 'SUPER_ADMIN'
      const res = await axios.get(joinApiUrl('/api/orchestration/context'), {
        params: { tenantId: targetTenantId },
        headers: {
          'X-Tenant-ID': targetTenantId,
          'X-Operator-Role': operatorRole,
          'Authorization': `Bearer ${localStorage.getItem('invify_token') || ''}`
        }
      })

      // Extract enforcement states
      if (res.headers?.['x-quota-enforcement-state']) {
        activeQuotaSeverity.value = res.headers['x-quota-enforcement-state']
      }

      if (res.data?.success && res.data?.context) {
        experienceContext.value = res.data.context
        // Cache hydrated state locally with version hash mappings
        localStorage.setItem(CACHE_KEY, JSON.stringify(res.data.context))
        
        // Execute real-time dynamic CSS theme styling property updates
        applyThemeOverrides(res.data.context.branding)
      }
    } catch (err) {
      console.warn('[Experience Engine] Server context lookup failed. Relying on local persistent cache.')
      if (err.response?.status === 429) {
        activeQuotaSeverity.value = 'DOWNGRADE_READONLY'
      }
    } finally {
      isLoadingContext.value = false
    }
  }

  /**
   * Apply Native Dynamic CSS Token Attributes
   * Colorizes elements programmatically without injecting heavy global static rules.
   */
  const applyThemeOverrides = (brandObj) => {
    if (typeof window !== 'undefined' && document?.documentElement?.style) {
      if (brandObj?.primary) setCssVar('primary', brandObj.primary)
      if (brandObj?.secondary) setCssVar('secondary', brandObj.secondary)
      if (brandObj?.accent) setCssVar('accent', brandObj.accent)
      
      const root = document.documentElement
      if (brandObj?.darkBg) root.style.setProperty('--invify-dark-bg', brandObj.darkBg)
      if (brandObj?.cardBg) root.style.setProperty('--invify-card-bg', brandObj.cardBg)
      if (brandObj?.fontFamily) root.style.setProperty('--invify-font-family', brandObj.fontFamily)
    }
  }

  // Reactive Module Evaluator Helpers
  const hasModuleAccess = (moduleIdentifier) => {
    // Wildcards or central operation boundaries override checks
    if (experienceContext.value.enabledModules?.includes('*')) return true
    return experienceContext.value.enabledModules?.includes(moduleIdentifier) || false
  }

  const isFeatureFlagEnabled = (flagKey) => {
    return experienceContext.value.featureFlags?.[flagKey] === true
  }

  const activeMobilePreset = computed(() => experienceContext.value.mobileNavigationPreset || 'retail_pos_lite')
  const companyLogo = computed(() => experienceContext.value.branding?.logoUrl || '/assets/invify-logo-default.svg')
  const companyDisplayName = computed(() => experienceContext.value.branding?.companyName || 'Invify Enterprise')

  return {
    experienceContext,
    isLoadingContext,
    activeQuotaSeverity,
    hydrateExperience,
    applyThemeOverrides,
    hasModuleAccess,
    isFeatureFlagEnabled,
    activeMobilePreset,
    companyLogo,
    companyDisplayName
  }
}
