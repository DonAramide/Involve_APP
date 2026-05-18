<!-- invify-admin/src/components/contextual/EnterpriseContextHint.vue -->
<template>
  <span 
    v-if="isVisible" 
    class="inline-context-hint-wrapper relative-position inline-block q-ml-xs"
  >
    <q-btn
      flat
      round
      dense
      :size="size || 'xs'"
      :icon="iconName"
      :class="btnClasses"
      @click="triggerPopover"
      @focus="onFocus"
      class="context-hint-btn transition-all focus-ring"
      aria-label="Toggle operational guidance popover"
    >
      <!-- Soft Pulsing Glow for High Severity / Active Incidents -->
      <span 
        v-if="shouldPulse" 
        class="pulse-ring absolute fit rounded-borders" 
      />
      
      <!-- Interactive popover menu -->
      <enterprise-context-popover 
        v-model="popoverOpen"
        :registry-key="registryKey" 
        @close="popoverOpen = false"
      />
    </q-btn>
  </span>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useContextualIntelligence } from '../../composables/useContextualIntelligence'
import EnterpriseContextPopover from './EnterpriseContextPopover.vue'

const props = defineProps({
  registryKey: {
    type: String,
    required: true
  },
  size: {
    type: String,
    default: 'xs'
  }
})

const popoverOpen = ref(false)
const { 
  settings, 
  breakerTripped, 
  tourActive, 
  activeHoverKey, 
  resolveKey, 
  logHistoryView 
} = useContextualIntelligence()

const data = computed(() => resolveKey(props.registryKey))

const isVisible = computed(() => {
  if (!settings.value.enabled) return false
  if (!data.value) return false
  
  // Under Minimal Focus Mode or density == MINIMAL, suppress everything except CRITICAL or active Incident-affected targets
  if (settings.value.density === 'MINIMAL' || settings.value.activePreset === 'minimal_focus') {
    return data.value.severity === 'CRITICAL' || settings.value.incidentModeActive
  }
  return true
})

const iconName = computed(() => {
  if (data.value?.severity === 'CRITICAL') return 'warning'
  if (props.registryKey.includes('ai') || props.registryKey.includes('rca')) return 'psychology'
  if (props.registryKey.includes('ledger') || props.registryKey.includes('account')) return 'payments'
  return 'help_outline'
})

const shouldPulse = computed(() => {
  // Never animate if the performance circuit breaker is tripped or reduced motion accessibility is active
  if (breakerTripped.value || settings.value.accessibility?.reducedMotion) {
    return false
  }
  
  // Pulse if CRITICAL, if active tour is pointing here, or if incident mode is on and key is affected
  if (tourActive.value && activeHoverKey.value === props.registryKey) return true
  if (settings.value.incidentModeActive && data.value?.severity === 'CRITICAL') return true
  return data.value?.severity === 'CRITICAL' && settings.value.severityRendering === 'enhanced'
})

const btnClasses = computed(() => {
  const classes = []
  
  // Highlight active tour pointer
  if (tourActive.value && activeHoverKey.value === props.registryKey) {
    classes.push('active-tour-pointer text-yellow-5')
  } else if (data.value?.severity === 'CRITICAL') {
    classes.push('text-red-5 border-red-glow')
  } else if (data.value?.severity === 'WARNING') {
    classes.push('text-amber-5')
  } else {
    classes.push('text-muted hover-cyan')
  }

  // Accessibility size adjustments
  if (settings.value.accessibility?.largerFonts) {
    classes.push('text-subtitle1')
  }

  return classes.join(' ')
})

const triggerPopover = (e) => {
  e.stopPropagation()
  popoverOpen.value = !popoverOpen.value
  if (popoverOpen.value) {
    logHistoryView(props.registryKey)
  }
}

const onFocus = () => {
  if (settings.value.triggerMode === 'focus') {
    popoverOpen.value = true
    logHistoryView(props.registryKey)
  }
}
</script>

<script>
// Prevent circular setup dependencies
export default {
  name: 'EnterpriseContextHint'
}
</script>

<style scoped>
.context-hint-btn {
  background: rgba(225, 231, 236, 0.03);
  border: 1px solid rgba(225, 231, 236, 0.08);
  width: 22px;
  height: 22px;
  min-height: 22px !important;
  min-width: 22px !important;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.context-hint-btn:hover {
  background: rgba(26, 115, 232, 0.1) !important;
  border-color: var(--enterprise-border-focus) !important;
}

.hover-cyan:hover {
  color: var(--enterprise-text-main) !important;
}

.border-red-glow {
  border-color: rgba(248, 81, 73, 0.4) !important;
  background: rgba(248, 81, 73, 0.05) !important;
}

.pulse-ring {
  border: 2px solid currentColor;
  left: 0;
  top: 0;
  opacity: 0.8;
  animation: hintPulseGlow 1.6s infinite ease-out;
}

.active-tour-pointer {
  background: rgba(252, 196, 25, 0.15) !important;
  border-color: #fcc419 !important;
  box-shadow: 0 0 12px rgba(252, 196, 25, 0.4);
}

@keyframes hintPulseGlow {
  0% {
    transform: scale(0.95);
    opacity: 0.8;
  }
  70% {
    transform: scale(1.6);
    opacity: 0;
  }
  100% {
    transform: scale(1.6);
    opacity: 0;
  }
}

.focus-ring:focus-visible {
  outline: 2px solid var(--enterprise-border-focus);
  outline-offset: 1px;
}
</style>
