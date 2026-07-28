<template>
  <q-card class="activation-timeline q-pa-lg shadow-2">
    <q-card-section>
      <div class="text-h6 q-mb-md">Provisioning Status</div>
      
      <q-timeline color="secondary">
        <q-timeline-entry
          v-for="(step, index) in steps"
          :key="index"
          :title="step.title"
          :subtitle="step.timestamp"
          :icon="getIcon(step.status)"
          :color="getColor(step.status)"
        >
          <div v-if="step.error" class="text-negative text-body2 q-mt-xs">
            {{ step.error }}
          </div>
        </q-timeline-entry>
      </q-timeline>
      
      <div v-if="hasFailed" class="q-mt-md text-warning">
        <q-icon name="warning" class="q-mr-xs" /> Retry in progress...
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  steps: {
    type: Array,
    required: true,
    // Expected structure: { title: 'Request Accepted', status: 'COMPLETED', timestamp: '09:43:12', error: null }
  }
})

const hasFailed = computed(() => {
  return props.steps.some(step => step.status === 'FAILED')
})

const getIcon = (status) => {
  switch (status) {
    case 'COMPLETED': return 'check'
    case 'PENDING': return 'schedule'
    case 'FAILED': return 'close'
    default: return 'radio_button_unchecked'
  }
}

const getColor = (status) => {
  switch (status) {
    case 'COMPLETED': return 'positive'
    case 'PENDING': return 'grey-5'
    case 'FAILED': return 'negative'
    default: return 'grey-3'
  }
}
</script>

<style scoped>
.activation-timeline {
  border-radius: 12px;
}
</style>
