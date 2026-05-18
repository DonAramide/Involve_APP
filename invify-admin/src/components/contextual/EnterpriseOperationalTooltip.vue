<!-- invify-admin/src/components/contextual/EnterpriseOperationalTooltip.vue -->
<template>
  <q-tooltip 
    v-if="settings.enabled && settings.density !== 'MINIMAL'"
    :delay="500" 
    anchor="top middle" 
    self="bottom middle" 
    :offset="[0, 6]"
    class="bg-transparent"
    style="padding: 0; max-width: 280px; pointer-events: none;"
  >
    <div class="enterprise-tooltip-card bg-panel border-main q-pa-sm shadow-16 text-metric-sm">
      <div class="row items-center q-mb-xs">
        <q-icon :name="iconName" :class="textColor" size="xs" class="q-mr-xs" />
        <span class="text-main text-weight-bold">{{ resolvedData?.title || title }}</span>
      </div>
      <div class="text-secondary" style="line-height: 1.4; font-size: 10px;">
        {{ resolvedData?.operator || description }}
      </div>
    </div>
  </q-tooltip>
</template>

<script setup>
import { computed } from 'vue'
import { useContextualIntelligence } from '../../composables/useContextualIntelligence'

const props = defineProps({
  registryKey: String,
  title: String,
  description: String,
  icon: String,
  severity: {
    type: String,
    default: 'NOMINAL'
  }
})

const { settings, resolveKey } = useContextualIntelligence()

const resolvedData = computed(() => {
  if (props.registryKey) {
    return resolveKey(props.registryKey)
  }
  return null
})

const activeSeverity = computed(() => {
  return resolvedData.value?.severity || props.severity
})

const iconName = computed(() => {
  if (props.icon) return props.icon
  if (activeSeverity.value === 'CRITICAL') return 'warning'
  return 'info'
})

const textColor = computed(() => {
  if (activeSeverity.value === 'CRITICAL') return 'text-red-5'
  if (activeSeverity.value === 'WARNING') return 'text-amber-5'
  return 'text-blue-5'
})
</script>

<style scoped>
.enterprise-tooltip-card {
  border-radius: 4px;
  background: var(--enterprise-panel-bg);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  border-top: 3px solid var(--enterprise-border-focus);
}
</style>
