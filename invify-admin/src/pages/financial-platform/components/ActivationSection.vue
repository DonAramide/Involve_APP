<template>
  <div>
    <ActivationWizard 
      v-if="state === 'UNPROVISIONED'" 
      @activate="handleActivate" 
    />
    <ActivationTimeline 
      v-else-if="state === 'PROVISIONING'" 
      :steps="timelineSteps" 
    />
  </div>
</template>

<script setup>
import { ref, watch, onUnmounted } from 'vue'
import ActivationWizard from './ActivationWizard.vue'
import ActivationTimeline from './ActivationTimeline.vue'
import financialPlatformApi from 'src/api/financialPlatformApi'
import pollingService from 'src/services/FinancialPlatformPollingService'
import { useQuasar } from 'quasar'

const $q = useQuasar()

const props = defineProps({
  state: {
    type: String,
    required: true
  },
  tenantId: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['activate', 'statusChange'])

const timelineSteps = ref([
  { title: 'Request Accepted', status: 'PENDING', timestamp: null, error: null },
  { title: 'Provisioning Quasar Tenant', status: 'PENDING', timestamp: null, error: null },
  { title: 'Credentials Stored', status: 'PENDING', timestamp: null, error: null },
  { title: 'ECS Configuration Created', status: 'PENDING', timestamp: null, error: null },
  { title: 'Health Check Passed', status: 'PENDING', timestamp: null, error: null },
  { title: 'Financial Platform Activated', status: 'PENDING', timestamp: null, error: null }
])

const handleActivate = async () => {
  try {
    const response = await financialPlatformApi.activate(props.tenantId)
    const token = response.data.provisioningToken
    
    // Update local state and emit to parent
    emit('statusChange', 'PROVISIONING')
    
    // Start Polling
    pollingService.start(token, 2500)
  } catch (error) {
    console.error('Activation failed', error)
    $q.notify({ type: 'negative', message: error.response?.data?.error || 'Failed to activate financial services' })
  }
}

// Setup polling listeners
pollingService.onStatusChanged((status, data) => {
  if (data && data.length) {
    timelineSteps.value = data
  }
  emit('statusChange', status)
})

pollingService.onCompleted(() => {
  $q.notify({ type: 'positive', message: 'Financial Platform Activated!' })
  emit('statusChange', 'ACTIVE')
})

pollingService.onFailed((errorMsg) => {
  $q.notify({ type: 'negative', message: errorMsg })
})

onUnmounted(() => {
  pollingService.stop()
})
</script>
