<!-- invify-admin/src/components/contextual/ContextualIntelligenceSettingsPanel.vue -->
<template>
  <div class="context-settings-panel bg-panel border-main rounded-borders q-pa-lg column op-gap-16">
    <div class="row items-center op-gap-8 border-bottom q-pb-sm">
      <q-icon name="tune" size="md" color="cyan-4" />
      <div class="column">
        <span class="text-subtitle2 text-main text-weight-bold">Operator Workspace Tuning Console</span>
        <span class="text-caption text-muted">Configure inline contextual registries and telemetry presentation layers.</span>
      </div>
    </div>

    <!-- PRESET SELECTOR GRID -->
    <div class="column op-gap-8">
      <span class="text-operator-title text-metric-sm text-blue-5">Workstation Presets</span>
      <div class="row wrap op-gap-8">
        <div 
          v-for="(p, id) in CONTEXT_PRESETS" 
          :key="id"
          class="preset-card col bg-subpanel border-main rounded-borders q-pa-md cursor-pointer transition-all column op-gap-4 justify-between"
          :class="settings.activePreset === id ? 'active-preset' : ''"
          @click="selectPreset(id)"
          style="min-width: 170px;"
        >
          <div class="row items-center justify-between">
            <span class="text-caption text-weight-bold text-main">{{ p.label }}</span>
            <q-icon 
              :name="settings.activePreset === id ? 'radio_button_checked' : 'radio_button_unchecked'" 
              :color="settings.activePreset === id ? 'cyan-4' : 'muted'"
              size="xs"
            />
          </div>
          <span class="text-muted" style="font-size: 10px; line-height: 1.3;">{{ p.description }}</span>
        </div>
      </div>
    </div>

    <q-separator dark class="opacity-10 q-my-xs" />

    <!-- INDIVIDUAL PARAMETERS -->
    <div class="row wrap op-gap-16">
      
      <!-- COLUMN 1: Basic Switches -->
      <div class="col column op-gap-12" style="min-width: 200px;">
        <span class="text-operator-title text-metric-sm text-muted">Functional Overrides</span>
        
        <!-- Toggle Guidance -->
        <div class="row items-center justify-between bg-subpanel q-pa-sm border-main rounded-borders">
          <div class="column">
            <span class="text-caption text-main text-weight-bold">Context Guidance</span>
            <span class="text-muted" style="font-size: 9px;">Enable hints globally.</span>
          </div>
          <q-toggle 
            v-model="settings.enabled" 
            color="cyan-4" 
            dense
            @update:model-value="saveCustom"
          />
        </div>

        <!-- Density Setting -->
        <div class="column op-gap-4">
          <span class="text-metric-sm text-muted">Guidance Density:</span>
          <q-select
            v-model="settings.density"
            :options="['MINIMAL', 'STANDARD', 'ADVANCED', 'FULL_ENGINEERING']"
            dense
            filled
            dark
            class="bg-subpanel rounded-borders font-mono"
            @update:model-value="saveCustom"
          />
        </div>

        <!-- Trigger Trigger Mode -->
        <div class="column op-gap-4">
          <span class="text-metric-sm text-muted">Activation Trigger:</span>
          <q-select
            v-model="settings.triggerMode"
            :options="['hover', 'click', 'focus']"
            dense
            filled
            dark
            class="bg-subpanel rounded-borders font-mono"
            @update:model-value="saveCustom"
          />
        </div>
      </div>

      <!-- COLUMN 2: Accessibility & Safety -->
      <div class="col column op-gap-12" style="min-width: 200px;">
        <span class="text-operator-title text-metric-sm text-muted">Accessibility & Safety</span>

        <!-- Reduced Motion -->
        <div class="row items-center justify-between bg-subpanel q-pa-sm border-main rounded-borders">
          <div class="column">
            <span class="text-caption text-main text-weight-bold">Reduced Motion</span>
            <span class="text-muted" style="font-size: 9px;">Disables pulse and sweep animations.</span>
          </div>
          <q-toggle 
            v-model="settings.accessibility.reducedMotion" 
            color="cyan-4" 
            dense
            @update:model-value="saveCustom"
          />
        </div>

        <!-- Larger Fonts -->
        <div class="row items-center justify-between bg-subpanel q-pa-sm border-main rounded-borders">
          <div class="column">
            <span class="text-caption text-main text-weight-bold">Contrast Fonts</span>
            <span class="text-muted" style="font-size: 9px;">Enlarge popover typography scaling.</span>
          </div>
          <q-toggle 
            v-model="settings.accessibility.largerFonts" 
            color="cyan-4" 
            dense
            @update:model-value="saveCustom"
          />
        </div>

        <!-- Severity Pulse -->
        <div class="column op-gap-4">
          <span class="text-metric-sm text-muted">Severity Styling:</span>
          <q-select
            v-model="settings.severityRendering"
            :options="['restrained', 'enhanced', 'pulse_critical']"
            dense
            filled
            dark
            class="bg-subpanel rounded-borders font-mono"
            @update:model-value="saveCustom"
          />
        </div>
      </div>
      
    </div>

    <!-- PERFORMANCE METRIC MONITOR PANEL -->
    <div class="bg-panel-dark border-main rounded-borders q-pa-md column op-gap-8 border-left-blue">
      <div class="row items-center justify-between">
        <span class="text-operator-title text-metric-sm text-muted">Real-Time Circuit Monitor</span>
        <span 
          class="text-metric-mono q-px-xs rounded-borders text-uppercase"
          :class="breakerTripped ? 'bg-red-focus text-red-5 border-red' : 'bg-green-focus text-green-5 border-green'"
          style="font-size: 9px;"
        >
          {{ breakerTripped ? 'TRIPPED (SAFE-MODE)' : 'NOMINAL' }}
        </span>
      </div>

      <div class="row wrap op-gap-16 q-mt-xs">
        <div class="col column op-gap-2">
          <span class="text-muted" style="font-size: 10px;">Operator Frame Rate:</span>
          <div class="row items-center op-gap-4">
            <q-icon name="speed" :color="activeFps < 40 ? 'red-5' : 'green-5'" size="xs" />
            <span class="text-metric-mono text-weight-bold text-main" style="font-size: 16px;">{{ activeFps }} FPS</span>
          </div>
        </div>

        <div class="col column op-gap-2">
          <span class="text-muted" style="font-size: 10px;">Socket Stream Rate:</span>
          <div class="row items-center op-gap-4">
            <q-icon name="analytics" :color="activeEps > 500 ? 'red-5' : 'blue-5'" size="xs" />
            <span class="text-metric-mono text-weight-bold text-main" style="font-size: 16px;">{{ activeEps }} EPS</span>
          </div>
        </div>
      </div>

      <span class="text-muted q-mt-xs" style="font-size: 9px; line-height: 1.3;">
        * The safety circuit breaker automatically overrides guidance overlays if local browser frame rates drop below 40 FPS or telemetry streams surge above 500 events per second.
      </span>
    </div>
  </div>
</template>

<script setup>
import { CONTEXT_PRESETS } from '../../contextual-intelligence/ContextualSettingsEngine'
import { useContextualIntelligence } from '../../composables/useContextualIntelligence'

const { 
  settings, 
  breakerTripped, 
  activeFps, 
  activeEps,
  applyPreset 
} = useContextualIntelligence()

const selectPreset = (presetId) => {
  applyPreset(presetId)
}

const saveCustom = () => {
  // Override active preset tag since user modified parameters manually
  settings.value.activePreset = 'custom'
  localStorage.setItem('invify_contextual_intelligence_settings', JSON.stringify(settings.value))
}
</script>

<style scoped>
.preset-card {
  transition: all 0.2s ease;
  background: var(--enterprise-subpanel-bg);
}
.preset-card:hover {
  border-color: var(--enterprise-border-focus);
}

.active-preset {
  border-color: var(--enterprise-border-focus) !important;
  background: rgba(26, 115, 232, 0.05) !important;
  box-shadow: 0 0 10px rgba(26, 115, 232, 0.1);
}

.bg-panel-dark {
  background-color: var(--enterprise-page-bg);
}

.border-left-blue {
  border-left: 3px solid var(--enterprise-border-focus) !important;
}

.border-red { border: 1px solid rgba(248, 81, 73, 0.3); }
.border-green { border: 1px solid rgba(63, 185, 80, 0.3); }
.bg-red-focus { background: rgba(248, 81, 73, 0.08); }
.bg-green-focus { background: rgba(63, 185, 80, 0.08); }
</style>
