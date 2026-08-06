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
import { ref, onUnmounted } from 'vue'
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
  if (!props.tenantId) {
    $q.notify({ type: 'negative', message: 'Missing tenant id — reload and try again.' })
    return
  }

  try {
    emit('statusChange', 'PROVISIONING')
    const response = await financialPlatformApi.activate(props.tenantId)
    const data = response.data || {}
    const token = data.provisioningToken

    // Sync activate already returns ACTIVE — skip async polling when present
    if (data.status === 'ACTIVE' || data.quasar_tenant_id) {
      timelineSteps.value = timelineSteps.value.map((s) => ({
        ...s,
        status: 'DONE',
        timestamp: new Date().toISOString()
      }))
      $q.notify({ type: 'positive', message: 'Financial Platform Activated!' })
      emit('statusChange', 'ACTIVE')
      return
    }

    if (token) {
      pollingService.start(token, 2500)
      return
    }

    // Fallback: treat 200 as success
    $q.notify({ type: 'positive', message: 'Financial Platform Activated!' })
    emit('statusChange', 'ACTIVE')
  } catch (error) {
    console.error('Activation failed', error)
    emit('statusChange', 'UNPROVISIONED')
    $q.notify({
      type: 'negative',
      message: error.response?.data?.error || error.response?.data?.details || 'Failed to activate financial services'
    })
  }
}

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
  emit('statusChange', 'UNPROVISIONED')
})

onUnmounted(() => {
  pollingService.stop()
})
</script>
