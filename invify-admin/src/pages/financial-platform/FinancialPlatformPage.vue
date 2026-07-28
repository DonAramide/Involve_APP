<template>
  <q-page padding class="financial-platform-page q-pa-md">
    <div class="row items-center q-mb-lg">
      <div class="col">
        <h1 class="text-h4 text-weight-bold q-my-none">Financial Platform</h1>
        <p class="text-subtitle1 text-grey-7 q-mt-sm">
          Enterprise orchestration for ledgers, virtual accounts, and reconciliation via Quasar Sandbox.
        </p>
      </div>
    </div>

    <!-- Connection Summary Card -->
    <ConnectionStatusCard v-if="state !== 'UNPROVISIONED'" :status="state" :details="details" />

    <!-- Activation Section -->
    <div v-if="state === 'UNPROVISIONED' || state === 'PROVISIONING'" class="q-mt-xl">
      <ActivationSection :state="state" :tenantId="tenantId" @statusChange="handleStatusChange" />
    </div>

    <!-- Active Dashboard -->
    <div v-if="state === 'ACTIVE' || state === 'DEGRADED'" class="q-mt-lg row q-col-gutter-md">
      <div class="col-12 col-md-6">
        <HealthSection :details="details" @testConnection="testConnection" />
      </div>
      <div class="col-12 col-md-6">
        <CredentialSection @rotate="rotateCredentials" />
      </div>
    </div>

    <!-- Audit History -->
    <div v-if="state !== 'UNPROVISIONED'" class="q-mt-xl">
      <AuditHistory />
    </div>

    <!-- Danger Zone -->
    <div v-if="state === 'ACTIVE' || state === 'DEGRADED'" class="q-mt-xl">
      <DangerZone @deactivate="deactivatePlatform" />
    </div>

  </q-page>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useQuasar } from 'quasar'
import ConnectionStatusCard from './components/ConnectionStatusCard.vue'
import ActivationSection from './components/ActivationSection.vue'
import HealthSection from './components/HealthSection.vue'
import CredentialSection from './components/CredentialSection.vue'
import AuditHistory from './components/AuditHistory.vue'
import DangerZone from './components/DangerZone.vue'
import financialPlatformApi from 'src/api/financialPlatformApi'
import { useRuntimeStore } from 'src/stores/runtime.store'

const $q = useQuasar()
const runtimeStore = useRuntimeStore()

// State Machine Variables
const state = ref('UNPROVISIONED') // UNPROVISIONED, PROVISIONING, ACTIVE, DEGRADED, SUSPENDED
const details = ref({})

const tenantId = computed(() => runtimeStore.config?.tenant?.id || '')

onMounted(async () => {
  if (!runtimeStore.isReady) {
    await runtimeStore.hydrate()
  }
  await fetchStatus()
})

const fetchStatus = async () => {
  if (!tenantId.value) return
  try {
    const response = await financialPlatformApi.getStatus(tenantId.value)
    state.value = response.data.platformStatus || response.data.status || 'UNPROVISIONED'
    details.value = {
      ...response.data,
      healthStatus: response.data.platformStatus === 'ACTIVE' ? 'HEALTHY' : response.data.platformStatus
    }
  } catch (err) {
    console.error('Status fetch failed', err)
    state.value = 'UNPROVISIONED' 
  }
}

const handleStatusChange = async (newStatus) => {
  state.value = newStatus
  if (newStatus === 'ACTIVE') {
    // Refresh details after activation is complete
    await fetchStatus()
  }
}

const testConnection = async () => {
  if (!tenantId.value) return
  try {
    $q.loading.show({ message: 'Testing QFS Connection...' })
    const response = await financialPlatformApi.testConnection(tenantId.value)
    details.value = response.data
    $q.notify({ type: 'positive', message: 'Connection check successful!' })
  } catch (err) {
    $q.notify({ type: 'negative', message: 'Connection test failed.' })
  } finally {
    $q.loading.hide()
  }
}

const rotateCredentials = async () => {
  if (!tenantId.value) return
  try {
    $q.loading.show({ message: 'Rotating Credentials...' })
    await financialPlatformApi.rotateCredentials(tenantId.value)
    await fetchStatus()
    $q.notify({ type: 'positive', message: 'Credentials rotated successfully.' })
  } catch (err) {
    $q.notify({ type: 'negative', message: 'Credentials rotation failed.' })
  } finally {
    $q.loading.hide()
  }
}

const deactivatePlatform = async () => {
  if (!tenantId.value) return
  $q.dialog({
    title: 'Confirm Deactivation',
    message: 'Are you sure you want to deactivate the Financial Platform? This will disable Quasar routing.',
    prompt: {
      model: '',
      label: 'Reason for deactivation',
      type: 'text',
      isValid: val => val.trim().length > 0
    },
    cancel: true,
    persistent: true
  }).onOk(async (reason) => {
    try {
      $q.loading.show({ message: 'Suspending Financial Platform Routing...' })
      await financialPlatformApi.deactivate(tenantId.value, reason)
      await fetchStatus()
      $q.notify({ type: 'positive', message: 'Financial Platform successfully deactivated.' })
    } catch (err) {
      $q.notify({ type: 'negative', message: err.response?.data?.error || 'Failed to deactivate platform.' })
    } finally {
      $q.loading.hide()
    }
  })
}
</script>

<style scoped>
.financial-platform-page {
  max-width: 1200px;
  margin: 0 auto;
}
</style>
