<!-- invify-admin/src/components/contextual/EnterpriseContextPopover.vue -->
<template>
  <q-menu 
    v-model="isOpen" 
    anchor="bottom left" 
    self="top left" 
    :offset="[0, 8]"
    class="bg-transparent shadow-24"
    style="padding: 0; border: none; max-width: 480px; width: 100%;"
  >
    <div 
      class="enterprise-popover-card bg-panel border-main column shadow-12 q-pa-lg"
      :class="popoverClasses"
    >
      <!-- HEADER: Title, Severity, Pins -->
      <div class="row items-center justify-between q-mb-md">
        <div class="column">
          <div class="row items-center op-gap-8">
            <span class="text-subtitle1 text-main text-weight-bold tracking-wide">{{ data.title }}</span>
            <span :class="severityClasses" class="text-metric-sm q-px-xs rounded-borders text-uppercase">
              {{ data.severity }}
            </span>
          </div>
          <span class="text-metric-sm text-muted">ID: {{ registryKey }}</span>
        </div>

        <div class="row items-center op-gap-4">
          <!-- Pin/Unpin Action -->
          <q-btn
            flat
            round
            dense
            :color="isPinnedKey ? 'yellow-5' : 'muted'"
            :icon="isPinnedKey ? 'star' : 'star_border'"
            @click="togglePin"
            size="sm"
          >
            <q-tooltip class="bg-panel border-main text-main text-caption">
              {{ isPinnedKey ? 'Unpin from Knowledge Deck' : 'Pin to Knowledge Deck' }}
            </q-tooltip>
          </q-btn>
          
          <q-btn
            flat
            round
            dense
            icon="close"
            color="muted"
            @click="closePopover"
            size="sm"
          />
        </div>
      </div>

      <!-- TABS SELECTOR (Concise, Monospace Tab Strip) -->
      <div class="popover-tabs-header row items-center q-mb-md border-main bg-subpanel rounded-borders q-pa-xs">
        <q-btn 
          v-for="mode in availableModes" 
          :key="mode.id"
          flat
          dense
          :label="mode.label"
          class="col text-metric-sm rounded-borders font-weight-bold"
          :class="settings.density.toLowerCase() === mode.id ? 'bg-emerald text-emerald-4' : 'text-muted'"
          @click="changeMode(mode.id)"
          size="xs"
          style="padding: 4px 0;"
        />
      </div>

      <!-- MAIN CONTENT PANEL -->
      <div class="popover-main-content col scroll q-mb-md" style="max-height: 280px;">
        
        <!-- MODE 1: OPERATOR (Concise Overview) -->
        <div v-if="activeTab === 'standard'" class="column op-gap-12">
          <p class="text-body2 text-secondary" style="line-height: 1.5; margin: 0;">
            {{ data.operator }}
          </p>

          <!-- Escalation Advice Indicator -->
          <div v-if="escalationAdvice.thresholdTripped" class="severity-critical rounded-borders q-pa-sm row items-center justify-between">
            <div class="row items-center op-gap-8 col">
              <q-icon name="report" size="sm" />
              <span class="text-metric-sm text-weight-bold">{{ escalationAdvice.message }}</span>
            </div>
            <q-btn 
              dense 
              flat 
              label="Escalate" 
              class="text-weight-bold text-caption text-red-5 q-ml-sm" 
              icon-right="arrow_forward"
              :to="escalationAdvice.route"
            />
          </div>
        </div>

        <!-- MODE 2: FULL_ENGINEERING (Deep Technical Telemetry) -->
        <div v-if="activeTab === 'full_engineering'" class="column op-gap-12">
          <div v-if="hasEngineeringRbac" class="column op-gap-8">
            <div class="bg-subpanel rounded-borders border-main q-pa-sm column op-gap-4">
              <span class="text-operator-title text-metric-sm text-blue-5">Lineage Source</span>
              <span class="text-metric-mono select-all text-secondary" style="font-size: 11px;">
                {{ data.actionExplainability?.lineage || 'Source Pipeline: Internal System Engine' }}
              </span>
            </div>

            <p class="text-body2 text-secondary" style="line-height: 1.5; margin: 0;">
              {{ data.engineering }}
            </p>

            <div class="row items-center justify-between text-metric-sm border-top q-pt-xs text-muted">
              <span>ACTIVE FPS: <span class="text-green-5">{{ activeFps }}</span></span>
              <span>WS VOLUMETRIC: <span class="text-blue-5">{{ activeEps }} EPS</span></span>
            </div>
          </div>
          <!-- Fallback if user doesn't have RBAC clearance to see system lineages -->
          <div v-else class="column items-center text-center q-py-md text-red-5 op-gap-4 bg-red-focus border-red rounded-borders">
            <q-icon name="lock" size="md" />
            <div class="text-weight-bold text-caption text-uppercase">RBAC Boundary Restriction</div>
            <div class="text-metric-sm text-muted">High-level telemetry lineage limited to SUPER_ADMIN/STAFF keys.</div>
          </div>
        </div>

        <!-- MODE 3: ADVANCED (AI Prediction & Reasonings) -->
        <div v-if="activeTab === 'advanced'" class="column op-gap-12">
          <div class="row items-center justify-between bg-subpanel rounded-borders q-pa-sm border-main">
            <span class="text-metric-sm text-muted">AI Diagnostic Certainty:</span>
            <span class="text-metric-mono text-cyan-4 text-weight-bold">{{ data.confidence }}%</span>
          </div>

          <p class="text-body2 text-secondary" style="line-height: 1.5; margin: 0;">
            {{ data.ai }}
          </p>

          <div class="text-metric-sm text-muted border-top q-pt-xs row items-center op-gap-4">
            <q-icon name="psychology" size="xs" color="cyan-4" />
            <span>AI Predicts: 78% incident correlation to recent OTA version mismatches.</span>
          </div>
        </div>

        <!-- MODE 4: GOVERNANCE (SOC & Regulatory Auditing) -->
        <div v-if="activeTab === 'governance'" class="column op-gap-12">
          <div class="bg-subpanel border-main rounded-borders q-pa-sm row items-center justify-between text-metric-sm">
            <span class="text-muted">Regulatory Compliance:</span>
            <span class="text-metric-mono text-green-5 text-weight-bold">SOC2 / ISO-27001</span>
          </div>

          <p class="text-body2 text-secondary" style="line-height: 1.5; margin: 0;">
            {{ data.governance }}
          </p>
        </div>

        <!-- HISTORICAL TIMELINE FEED (Temporal Explainability) -->
        <div class="column border-top q-mt-md q-pt-md op-gap-8">
          <div class="text-operator-title text-metric-sm text-muted">Temporal Degradation Log</div>
          <div class="timeline-feed column op-gap-8">
            <div 
              v-for="(t, idx) in data.timeline" 
              :key="idx" 
              class="timeline-item bg-subpanel rounded-borders q-pa-sm border-main column op-gap-2"
            >
              <div class="row items-center justify-between text-metric-mono" style="font-size: 9px;">
                <span class="text-cyan-4">{{ t.event }}</span>
                <span class="text-muted">{{ formatTime(t.timestamp) }}</span>
              </div>
              <span class="text-caption text-secondary" style="font-size: 11px;">{{ t.details }}</span>
            </div>
          </div>
        </div>

        <!-- DEPENDENCY TOPOLOGY (Causality Mapping) -->
        <div class="column border-top q-mt-md q-pt-md op-gap-8">
          <div class="text-operator-title text-metric-sm text-muted">Dependency Causality Map</div>
          <div class="row items-center op-gap-8 scroll-x q-py-xs no-wrap">
            <div class="badge-node bg-panel-dark border-main rounded-borders q-px-sm q-py-xs text-metric-mono text-caption text-main">
              {{ data.title }}
            </div>
            <q-icon name="arrow_forward" color="muted" size="xs" />
            <div 
              v-for="d in data.dependencies" 
              :key="d" 
              class="badge-node bg-subpanel border-main rounded-borders q-px-sm q-py-xs text-metric-mono text-caption text-muted hover-cyan cursor-pointer"
              @click="changeTargetKey(d)"
            >
              {{ d }}
            </div>
          </div>
        </div>

        <!-- COMMAND CONSEQUENCE EXPLAINABILITY -->
        <div v-if="data.actionExplainability" class="column border-top q-mt-md q-pt-md op-gap-8">
          <div class="text-operator-title text-metric-sm text-red-4">Action Consequence Impact</div>
          <div class="bg-subpanel rounded-borders border-main q-pa-sm column op-gap-6 text-metric-sm">
            <div class="row justify-between">
              <span class="text-muted">Target Trigger:</span>
              <span class="text-metric-mono text-main">{{ data.actionExplainability.command }}</span>
            </div>
            <div class="row justify-between">
              <span class="text-muted">Direct Result:</span>
              <span class="text-secondary text-right" style="max-width: 260px;">{{ data.actionExplainability.consequence }}</span>
            </div>
            <div class="row justify-between">
              <span class="text-muted">Telemetry Delta:</span>
              <span class="text-amber-5 text-right" style="max-width: 260px;">{{ data.actionExplainability.telemetryImpact }}</span>
            </div>
          </div>
        </div>

      </div>

      <!-- FOOTER: Workstation quick control settings -->
      <div class="row items-center justify-between border-top q-pt-md text-metric-sm text-muted">
        <div class="row items-center op-gap-4">
          <q-icon name="speed" :color="breakerTripped ? 'red-5' : 'green-5'" size="xs" />
          <span>Console status: 
            <span :class="breakerTripped ? 'text-red-5' : 'text-green-5'">
              {{ breakerTripped ? 'CIRCUIT TRIPPED (SAFE-MODE)' : 'NOMINAL' }}
            </span>
          </span>
        </div>
        
        <a 
          href="#" 
          class="text-secondary hover-cyan no-decoration text-weight-bold" 
          @click.prevent="openMainDrawer"
        >
          Explore Glossary →
        </a>
      </div>

    </div>
  </q-menu>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useContextualIntelligence } from '../../composables/useContextualIntelligence'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  registryKey: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['update:modelValue', 'close'])

const activeKey = ref(props.registryKey)
watch(() => props.registryKey, (val) => { activeKey.value = val })

const { 
  settings, 
  breakerTripped, 
  activeFps, 
  activeEps, 
  drawerOpen, 
  applyPreset, 
  togglePinKey, 
  isPinned, 
  resolveKey, 
  getEscalationAdvice 
} = useContextualIntelligence()

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const data = computed(() => resolveKey(activeKey.value))

const escalationAdvice = computed(() => getEscalationAdvice(activeKey.value))

const isPinnedKey = computed(() => isPinned(activeKey.value))

const activeTab = computed(() => settings.value.density.toLowerCase())

const availableModes = [
  { id: 'standard', label: 'Operator' },
  { id: 'full_engineering', label: 'Engineering' },
  { id: 'advanced', label: 'AI Predictive' },
  { id: 'governance', label: 'Compliance' }
]

const hasEngineeringRbac = computed(() => {
  const role = localStorage.getItem('operator_role') || 'SUPER_ADMIN'
  return ['SUPER_ADMIN', 'STAFF'].includes(role)
})

const popoverClasses = computed(() => {
  const classes = []
  if (settings.value.accessibility?.reducedMotion) classes.push('reduced-motion')
  if (settings.value.accessibility?.largerFonts) classes.push('large-font-rendering')
  return classes.join(' ')
})

const severityClasses = computed(() => {
  if (data.value?.severity === 'CRITICAL') return 'bg-red-focus text-red-5 border-red'
  if (data.value?.severity === 'WARNING') return 'bg-amber-focus text-amber-5 border-amber'
  return 'bg-green-focus text-green-5 border-green'
})

const togglePin = () => {
  togglePinKey(activeKey.value)
}

const changeMode = (modeId) => {
  // Translate simplified UI tab IDs to standard global density presets
  let densityMapping = 'STANDARD'
  if (modeId === 'full_engineering') densityMapping = 'FULL_ENGINEERING'
  else if (modeId === 'advanced') densityMapping = 'ADVANCED'
  else if (modeId === 'governance') densityMapping = 'STANDARD' // Uses standard registry details but updates view filters
  
  settings.value.density = densityMapping
}

const changeTargetKey = (newKey) => {
  activeKey.value = newKey
}

const openMainDrawer = () => {
  drawerOpen.value = true
  isOpen.value = false
}

const closePopover = () => {
  isOpen.value = false
  emit('close')
}

const formatTime = (isoString) => {
  try {
    const d = new Date(isoString)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch (e) {
    return '00:00:00'
  }
}
</script>

<style scoped>
.enterprise-popover-card {
  border-radius: 4px;
  width: 440px;
  max-height: 520px;
  background: var(--enterprise-panel-bg);
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05);
  border-top: 4px solid var(--enterprise-border-focus);
}

.reduced-motion * {
  animation: none !important;
  transition: none !important;
}

.large-font-rendering {
  font-size: 15px !important;
}
.large-font-rendering .text-body2 {
  font-size: 14px !important;
}

.border-red { border: 1px solid rgba(248, 81, 73, 0.3); }
.border-amber { border: 1px solid rgba(210, 153, 34, 0.3); }
.border-green { border: 1px solid rgba(63, 185, 80, 0.3); }

.bg-panel-dark {
  background-color: var(--enterprise-page-bg) !important;
}

.popover-tabs-header {
  border: 1px solid var(--enterprise-border);
}

.badge-node {
  transition: all 0.2s ease;
}
.badge-node:hover {
  border-color: var(--enterprise-border-focus);
  color: var(--enterprise-text-main) !important;
}

.hover-cyan:hover {
  color: var(--enterprise-text-main) !important;
}

.bg-red-focus { background: rgba(248, 81, 73, 0.08); }
.bg-amber-focus { background: rgba(210, 153, 34, 0.08); }
.bg-green-focus { background: rgba(63, 185, 80, 0.08); }
</style>
