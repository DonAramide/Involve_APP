<!-- invify-admin/src/components/common/EnterpriseManualTooltip.vue -->
<template>
  <q-tooltip 
    :delay="2000" 
    anchor="top middle" 
    self="bottom middle" 
    :offset="[0, 10]"
    class="bg-transparent"
    style="padding: 0; max-width: 320px;"
  >
    <div class="enterprise-manual-card bg-panel-darker border-blue-focus q-pa-md shadow-10">
      <div class="row items-center q-mb-sm">
        <q-icon :name="icon || 'info'" color="blue-5" size="sm" class="q-mr-sm" />
        <div class="text-subtitle2 text-main text-weight-bold">{{ title }}</div>
      </div>
      
      <div class="text-caption text-secondary q-mb-md" style="line-height: 1.5;">
        {{ description }}
      </div>

      <q-separator dark class="q-mb-sm opacity-20" />

      <div class="row items-center justify-between text-metric-mono text-blue-5" style="font-size: 9px;">
        <span>OPERATIONAL IMPACT: {{ impact || 'NOMINAL' }}</span>
        <span>RBAC: {{ rbac || 'SUPER_ADMIN' }}</span>
      </div>
    </div>
  </q-tooltip>
</template>

<script setup>
defineProps({
  title: String,
  description: String,
  icon: String,
  impact: String,
  rbac: String
})
</script>

<style scoped>
.enterprise-manual-card {
  border-radius: 8px;
  border-left: 4px solid #1A73E8;
  background: var(--enterprise-panel-bg);
  box-shadow: 0 4px 20px rgba(0,0,0,0.3);
}
.opacity-20 {
  opacity: 0.2;
}
</style>
