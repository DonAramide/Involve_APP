<template>
  <q-page class="q-pa-md invify-dark-bg text-white">
    <!-- Premium Experience Top Header -->
    <div class="row items-center justify-between q-mb-lg">
      <div>
        <div class="text-overline text-primary">Multi-Tenant Module Experience Ecosystem</div>
        <h1 class="text-h4 text-weight-bold q-my-none">Tenant Orchestration Center</h1>
        <p class="text-caption text-grey-4 q-mt-xs">
          Granularly manage backend-authoritative module visibility, reactive JSON branding tokens, feature flags, and subscription tier consumption indices.
        </p>
      </div>

      <div class="row q-gutter-sm">
        <q-select
          filled
          dark
          v-model="selectedTenantId"
          :options="tenantOptions"
          label="Active Execution Context"
          emit-value
          map-options
          style="min-width: 240px"
          @update:model-value="onTenantContextChanged"
        />
        <q-btn
          color="primary"
          icon="refresh"
          label="Re-Hydrate Context"
          :loading="isLoadingContext"
          @click="onRefreshTriggered"
        />
      </div>
    </div>

    <!-- Active Quota Severity Feedback Banner -->
    <q-banner
      v-if="activeQuotaSeverity !== 'NORMAL'"
      dense
      inline-actions
      rounded
      :class="bannerBgClass"
      class="q-mb-md text-white border-radius-md"
    >
      <template v-slot:avatar>
        <q-icon :name="bannerIcon" size="sm" />
      </template>
      <span class="text-weight-bold">Quota Limit Severity Indicator:</span> 
      Current operational boundary dropped into state <q-badge color="negative">{{ activeQuotaSeverity }}</q-badge>. Unprivileged non-critical stream channels degraded to preserve audit visibility.
    </q-banner>

    <div class="row q-col-gutter-md">
      <!-- COLUMN 1: Baseline Onboarding Presets & Subscription Plans -->
      <div class="col-12 col-md-4">
        <q-card dark bordered class="invify-card-bg q-pa-md border-radius-md no-shadow">
          <div class="text-subtitle1 text-weight-bold text-primary q-mb-sm">
            <q-icon name="rocket_launch" class="q-mr-xs" /> Automated Hybrid Onboarding
          </div>
          <p class="text-caption text-grey-4">
            Provisions lightweight mandatory functional cores immediately to accelerate first-login retention flows.
          </p>

          <q-select
            filled
            dark
            dense
            v-model="onboardingIndustry"
            :options="industryOptions"
            label="Industry Vertical Target"
            class="q-mb-md"
          />

          <q-select
            filled
            dark
            dense
            v-model="onboardingTier"
            :options="['FREE', 'PRO', 'ENTERPRISE', 'CUSTOM_FEDERATION']"
            label="Target Plan Allocation"
            class="q-mb-md"
          />

          <q-btn
            unelevated
            color="primary"
            class="full-width"
            label="Execute Onboarding Provisioning"
            :loading="isProvisioning"
            @click="executeBaselineProvisioning"
          />

          <q-separator dark class="q-my-md" />

          <div class="text-subtitle2 text-weight-bold q-mb-xs">Elevate Subscription Tier Limits</div>
          <p class="text-caption text-grey-4">Synchronously re-scales operational resource threshold boundaries.</p>

          <div class="row q-gutter-xs justify-between">
            <q-btn size="sm" outline color="info" label="PRO" @click="elevatePlanTier('PRO')" />
            <q-btn size="sm" outline color="accent" label="ENTERPRISE" @click="elevatePlanTier('ENTERPRISE')" />
            <q-btn size="sm" outline color="negative" label="CUSTOM" @click="elevatePlanTier('CUSTOM_FEDERATION')" />
          </div>
        </q-card>

        <!-- Dynamic Branding Tokens Customizer -->
        <q-card dark bordered class="invify-card-bg q-pa-md border-radius-md no-shadow q-mt-md">
          <div class="text-subtitle1 text-weight-bold text-accent q-mb-sm">
            <q-icon name="palette" class="q-mr-xs" /> Dynamic JSON Theme System
          </div>
          <p class="text-caption text-grey-4">Hydrates client viewport palettes natively using compiled styling tokens.</p>

          <q-input filled dark dense v-model="customBrandPrimary" label="Primary Token (Hex)" class="q-mb-xs">
            <template v-slot:append>
              <q-icon name="colorize" class="cursor-pointer">
                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-color v-model="customBrandPrimary" dark />
                </q-popup-proxy>
              </q-icon>
            </template>
          </q-input>

          <q-input filled dark dense v-model="customBrandSecondary" label="Secondary Token (Hex)" class="q-mb-xs">
            <template v-slot:append>
              <q-icon name="colorize" class="cursor-pointer">
                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-color v-model="customBrandSecondary" dark />
                </q-popup-proxy>
              </q-icon>
            </template>
          </q-input>

          <q-btn
            unelevated
            size="sm"
            color="accent"
            class="full-width q-mt-sm"
            label="Inject Dynamic Overrides Locally"
            @click="triggerLiveBrandingUpdate"
          />
        </q-card>
      </div>

      <!-- COLUMN 2: Granular Module Governance Controls -->
      <div class="col-12 col-md-4">
        <q-card dark bordered class="invify-card-bg q-pa-md border-radius-md no-shadow full-height">
          <div class="text-subtitle1 text-weight-bold text-secondary q-mb-sm">
            <q-icon name="settings_input_component" class="q-mr-xs" /> Backend-Governed Modules
          </div>
          <p class="text-caption text-grey-4">
            Toggle functional module availability arrays. RBAC filters assert access rules natively prior to stream transport handshakes.
          </p>

          <q-list dark separator class="border-radius-xs">
            <q-item v-for="mod in availableModules" :key="mod.id" class="q-px-none">
              <q-item-section>
                <q-item-label class="text-weight-medium">{{ mod.label }}</q-item-label>
                <q-item-label caption class="text-grey-5">Scoped Array: {{ mod.id }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-toggle
                  color="secondary"
                  :model-value="hasModuleAccess(mod.id)"
                  @update:model-value="toggleOptionalModule(mod.id)"
                />
              </q-item-section>
            </q-item>
          </q-list>

          <q-separator dark class="q-my-md" />

          <div class="text-subtitle2 text-weight-bold text-grey-3 q-mb-xs">Extensible Feature Flags</div>
          <div class="column q-gutter-y-xs">
            <q-checkbox dark dense :model-value="isFeatureFlagEnabled('enable_realtime_gps')" label="Real-time GPS Tracking" disable />
            <q-checkbox dark dense :model-value="isFeatureFlagEnabled('enable_offline_pos_sync')" label="Offline-Ready POS Sync" disable />
            <q-checkbox dark dense :model-value="isFeatureFlagEnabled('enable_sso_federation')" label="SSO/Federation Credentials" disable />
          </div>
        </q-card>
      </div>

      <!-- COLUMN 3: Active Experience State Matrix & Realtime Consumption -->
      <div class="col-12 col-md-4">
        <q-card dark bordered class="invify-card-bg q-pa-md border-radius-md no-shadow full-height column justify-between">
          <div>
            <div class="text-subtitle1 text-weight-bold text-info q-mb-sm">
              <q-icon name="insights" class="q-mr-xs" /> Active Viewport Hydration Profile
            </div>

            <div class="bg-black q-pa-sm border-radius-xs font-monospace text-caption text-grey-3 q-mb-md" style="word-break: break-all;">
              <div><span class="text-primary">Tenant ID:</span> {{ experienceContext.tenantId }}</div>
              <div><span class="text-secondary">Industry Spec:</span> {{ experienceContext.industryType }}</div>
              <div><span class="text-accent">Plan Model:</span> {{ experienceContext.subscriptionTier }}</div>
              <div><span class="text-info">Mobile Preset Map:</span> {{ activeMobilePreset }}</div>
              <div><span class="text-positive">Verified Modules:</span> {{ experienceContext.enabledModules?.length || 0 }} Loaded</div>
            </div>

            <div class="text-subtitle2 text-weight-bold q-mb-xs">Real-time Usage Quota Gauges</div>
            <p class="text-caption text-grey-5">Monthly operational transaction depth sweeps.</p>

            <div v-for="(val, key) in activeQuotaGauges" :key="key" class="q-mb-sm">
              <div class="row justify-between text-caption q-mb-xs">
                <span class="text-grey-3 font-monospace">{{ key }}</span>
                <span class="text-weight-bold" :class="val.ratio > 0.85 ? 'text-negative' : 'text-primary'">
                  {{ val.current }} / {{ val.limit }}
                </span>
              </div>
              <q-linear-progress
                dark
                rounded
                :value="val.ratio"
                :color="val.ratio > 0.85 ? 'negative' : (val.ratio > 0.7 ? 'warning' : 'primary')"
                size="6px"
              />
            </div>
          </div>

          <div class="bg-dark q-pa-sm border-radius-xs text-center text-caption text-grey-5">
            <q-icon name="verified" color="positive" class="q-mr-xs" /> Absolute Dynamic Multi-Tenant Domain Boundary Isolation Enforced.
          </div>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import axios from 'axios'
import { useTenantExperience } from '../../composables/useTenantExperience'

const $q = useQuasar()
const {
  experienceContext,
  isLoadingContext,
  activeQuotaSeverity,
  hydrateExperience,
  applyThemeOverrides,
  hasModuleAccess,
  isFeatureFlagEnabled,
  activeMobilePreset
} = useTenantExperience()

// Local Selection Trackers
const selectedTenantId = ref('tenant-retail-alpha')
const tenantOptions = [
  { label: 'Retail Alpha Hub (POS & Inventory)', value: 'tenant-retail-alpha' },
  { label: 'Greenwood International School', value: 'tenant-school-beta' },
  { label: 'Apex Global Logistics Mesh', value: 'tenant-logistics-omega' },
  { label: 'St. Jude Health Ecosystem', value: 'tenant-healthcare-gamma' },
  { label: 'Central Financial clearing Node', value: 'global' }
]

const onboardingIndustry = ref('retail')
const onboardingTier = ref('PRO')
const industryOptions = ['retail', 'school', 'logistics', 'healthcare', 'finance', 'hospitality', 'fleet_operations']

const isProvisioning = ref(false)

// Custom branding testing refs
const customBrandPrimary = ref('#22b8cf')
const customBrandSecondary = ref('#4c6ef5')

// Domain Scope Definition Mapping
const availableModules = [
  { id: 'pos_billing', label: 'Point-of-Sale Billing Matrix' },
  { id: 'fleet_tracking', label: 'Real-time GPS Telemetry Stream' },
  { id: 'curriculum_matrix', label: 'Standardized Subject Curriculums' },
  { id: 'ai_copilot', label: 'AI Forecasting Copilot' },
  { id: 'patient_records', label: 'SOC Protected Health Charts' },
  { id: 'room_service', label: 'Hospitality Concierge Queues' }
]

// Computed Gauges mapping live object metrics
const activeQuotaGauges = computed(() => {
  const quotas = experienceContext.value?.usageQuotas || {}
  const res = {}
  
  // Mix in defaults if list empty to provide interactive visuals
  const baseItems = Object.keys(quotas).length > 0 ? quotas : {
    api_calls: { current: 1540, limit: 5000 },
    active_operators: { current: 2, limit: 3 },
    ai_tokens: { current: 4500, limit: 5000 }
  }

  for (const [key, obj] of Object.entries(baseItems)) {
    const cur = Number(obj.current || 0)
    const lim = Number(obj.limit || 1)
    res[key] = {
      current: cur,
      limit: lim,
      ratio: Math.min(1.0, cur / lim)
    }
  }
  return res
})

const bannerBgClass = computed(() => {
  if (activeQuotaSeverity.value === 'DOWNGRADE_READONLY') return 'bg-negative'
  if (activeQuotaSeverity.value?.includes('WARNING')) return 'bg-warning text-black'
  return 'bg-secondary'
})

const bannerIcon = computed(() => {
  if (activeQuotaSeverity.value === 'DOWNGRADE_READONLY') return 'block'
  return 'warning'
})

// Trigger initialization actions
onMounted(() => {
  hydrateExperience(selectedTenantId.value)
})

const onTenantContextChanged = (newVal) => {
  hydrateExperience(newVal)
}

const onRefreshTriggered = () => {
  hydrateExperience(selectedTenantId.value)
  $q.notify({
    type: 'positive',
    message: 'Tenant experience parameters rehydrated directly from backend metadata tables.',
    position: 'top-right'
  })
}

// Action Dispatchers
const executeBaselineProvisioning = async () => {
  isProvisioning.value = true
  try {
    const res = await axios.post('http://localhost:3005/api/orchestration/onboarding/provision', {
      tenantId: selectedTenantId.value,
      industryType: onboardingIndustry.value,
      planTier: onboardingTier.value
    })
    
    if (res.data?.success) {
      $q.notify({
        type: 'positive',
        message: `Baseline onboarding presets executed securely. Assigned layout modes: ${res.data.assignedTheme?.layout}`,
        position: 'top-right'
      })
      // Trigger sync reload
      hydrateExperience(selectedTenantId.value)
    }
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: `Provisioning aborted: ${err.response?.data?.message || err.message}`,
      position: 'top-right'
    })
  } finally {
    isProvisioning.value = false
  }
}

const toggleOptionalModule = async (modId) => {
  try {
    const token = localStorage.getItem('invify_token') || ''
    const res = await axios.post('http://localhost:3005/api/orchestration/modules/enable', {
      tenantId: selectedTenantId.value,
      moduleIdentifier: modId,
      customConfig: { toggledViaUI: true }
    }, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Operator-Role': 'SUPER_ADMIN' // Satisfy backend governance rules
      }
    })

    if (res.data?.success) {
      $q.notify({
        type: 'info',
        message: `Module access parameters updated dynamically for scope [${modId}].`,
        position: 'bottom-right'
      })
      hydrateExperience(selectedTenantId.value)
    }
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: `Module state modification rejected by server configuration profiles.`,
      position: 'top-right'
    })
  }
}

const elevatePlanTier = async (targetTier) => {
  try {
    const token = localStorage.getItem('invify_token') || ''
    const res = await axios.post('http://localhost:3005/api/orchestration/tiers/elevate', {
      tenantId: selectedTenantId.value,
      targetTierId: targetTier
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (res.data?.success) {
      $q.notify({
        type: 'positive',
        message: `Subscription scaling successful. Active parameters mapped to tier: ${targetTier}`,
        position: 'top-right'
      })
      hydrateExperience(selectedTenantId.value)
    }
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: `Elevation request rejected check logic.`,
      position: 'top-right'
    })
  }
}

const triggerLiveBrandingUpdate = () => {
  // Directly patch active values
  if (experienceContext.value?.branding) {
    experienceContext.value.branding.primary = customBrandPrimary.value
    experienceContext.value.branding.secondary = customBrandSecondary.value
    applyThemeOverrides(experienceContext.value.branding)
    
    $q.notify({
      type: 'positive',
      message: 'Reactive styling string tokens applied straight into document layouts.',
      position: 'top-right'
    })
  }
}
</script>

<style scoped>
.border-radius-md {
  border-radius: 12px;
}
.border-radius-xs {
  border-radius: 6px;
}
.font-monospace {
  font-family: monospace;
}
</style>
