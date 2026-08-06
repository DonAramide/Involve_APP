<template>
  <q-page padding class="financial-platform-page q-pa-md">
    <!-- Operations hero + KPIs -->
    <ConnectionStatusCard
      v-if="state !== 'UNPROVISIONED'"
      :status="state"
      :details="details"
      :loading="statusLoading"
      :latency-ms="lastLatencyMs"
      :latency-history="latencyHistory"
      :session-checks="sessionChecks"
    >
      <template #actions>
        <q-btn
          flat
          dense
          color="grey-5"
          icon="refresh"
          :loading="statusLoading || busy === 'refresh'"
          aria-label="Refresh platform health"
          @click="refreshHealth"
        >
          <q-tooltip>Refresh health</q-tooltip>
        </q-btn>
      </template>
    </ConnectionStatusCard>

    <div v-else class="q-mb-lg">
      <h1 class="text-h4 text-weight-bold q-my-none text-white">Financial Platform</h1>
      <p class="text-subtitle1 text-grey-6 q-mt-sm q-mb-none">
        Enterprise orchestration for ledgers, virtual accounts, and reconciliation via Quasar Sandbox.
      </p>
    </div>

    <!-- Activation flow -->
    <div v-if="state === 'UNPROVISIONED' || state === 'PROVISIONING'" class="q-mt-lg">
      <ActivationSection :state="state" :tenantId="tenantId" @statusChange="handleStatusChange" />
    </div>

    <template v-slot:default v-if="state === 'ACTIVE' || state === 'DEGRADED' || state === 'ERROR'">
      <!-- Live telemetry strip -->
      <q-card flat bordered class="telemetry-strip q-mb-md" role="region" aria-label="Live telemetry">
        <q-card-section class="q-py-md">
          <div class="row q-col-gutter-md items-stretch">
            <div class="col-12 col-sm-6 col-md-3">
              <div class="tele-label">Health trend</div>
              <PlatformSparkline :values="latencyHistory.length ? latencyHistory : [40, 42, 38, 45]" stroke="#34d399" aria-label="Health trend" />
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <div class="tele-label">Latency trend</div>
              <div class="row items-end justify-between">
                <div class="tele-value text-cyan-3">{{ lastLatencyMs != null ? `${lastLatencyMs} ms` : '—' }}</div>
                <div style="width: 55%;"><PlatformSparkline :values="latencyHistory" stroke="#22d3ee" /></div>
              </div>
            </div>
            <div class="col-6 col-md-2">
              <div class="tele-label">Successful checks</div>
              <div class="tele-value text-green-4">{{ sessionChecks.ok }}</div>
            </div>
            <div class="col-6 col-md-2">
              <div class="tele-label">Failed checks</div>
              <div class="tele-value text-red-3">{{ sessionChecks.failed }}</div>
            </div>
            <div class="col-12 col-md-2">
              <div class="tele-label">Reconciliation</div>
              <PlatformStatusBadge
                class="q-mt-xs"
                :status="details.healthStatus === 'HEALTHY' ? 'HEALTHY' : 'WARNING'"
                :label="details.healthStatus === 'HEALTHY' ? 'Healthy' : 'Watch'"
              />
            </div>
          </div>
        </q-card-section>
      </q-card>

      <div class="row q-col-gutter-md">
        <div class="col-12 col-lg-8">
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6">
              <HealthSection
                :details="details"
                :latency-ms="lastLatencyMs"
                :latency-history="latencyHistory"
                :retry-count="sessionChecks.failed"
                :testing="busy === 'test'"
                @testConnection="testConnection"
              />
            </div>
            <div class="col-12 col-md-6">
              <CredentialSection
                :details="details"
                :rotating="busy === 'rotate'"
                @rotate="rotateCredentials"
              />
            </div>
            <div class="col-12">
              <PlatformDetailsPanel :status="state" :details="details" />
            </div>
          </div>
        </div>
        <div class="col-12 col-lg-4">
          <PlatformQuickActions
            :busy="busy"
            @testConnection="testConnection"
            @rotate="requestRotateCredentials"
            @refresh="refreshHealth"
            @viewLogs="scrollToAudit"
            @downloadAudit="downloadAudit"
            @reconnect="reconnectPlatform"
          />
        </div>
      </div>
    </template>

    <div v-if="state !== 'UNPROVISIONED'" ref="auditAnchor" class="q-mt-lg">
      <AuditHistory ref="auditRef" :tenantId="tenantId" />
    </div>

    <div v-if="state === 'ACTIVE' || state === 'DEGRADED' || state === 'ERROR'" class="q-mt-lg">
      <DangerZone ref="dangerRef" :deactivating="busy === 'deactivate'" @deactivate="deactivatePlatform" />
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
import PlatformQuickActions from './components/PlatformQuickActions.vue'
import PlatformDetailsPanel from './components/PlatformDetailsPanel.vue'
import PlatformSparkline from './components/PlatformSparkline.vue'
import PlatformStatusBadge from './components/PlatformStatusBadge.vue'
import financialPlatformApi from 'src/api/financialPlatformApi'
import { useRuntimeStore } from 'src/stores/runtime.store'

const $q = useQuasar()
const runtimeStore = useRuntimeStore()

const state = ref('UNPROVISIONED')
const details = ref({})
const statusLoading = ref(false)
const busy = ref('')
const lastLatencyMs = ref(null)
const latencyHistory = ref([])
const sessionChecks = ref({ ok: 0, failed: 0, total: 0 })
const auditRef = ref(null)
const auditAnchor = ref(null)
const dangerRef = ref(null)

function resolveTenantId() {
  const fromRuntime = runtimeStore.config?.tenant?.id
  if (fromRuntime) return fromRuntime

  const fromStorage = localStorage.getItem('tenant_id')
  if (fromStorage) return fromStorage

  const token = localStorage.getItem('invify_token') || localStorage.getItem('token')
  if (!token) return ''
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.tenantId || payload.user_metadata?.tenant_id || payload.app_metadata?.tenant_id || ''
  } catch {
    return ''
  }
}

const tenantId = computed(() => resolveTenantId())

onMounted(async () => {
  if (!runtimeStore.isReady) {
    await runtimeStore.hydrate()
  }
  await fetchStatus()
})

const recordLatency = (ms, ok) => {
  if (typeof ms === 'number' && Number.isFinite(ms)) {
    lastLatencyMs.value = ms
    latencyHistory.value = [...latencyHistory.value.slice(-19), ms]
  }
  sessionChecks.value = {
    ok: sessionChecks.value.ok + (ok ? 1 : 0),
    failed: sessionChecks.value.failed + (ok ? 0 : 1),
    total: sessionChecks.value.total + 1
  }
}

const fetchStatus = async () => {
  const id = resolveTenantId()
  if (!id) {
    console.warn('[FinancialPlatform] No tenant id available yet')
    return
  }
  statusLoading.value = true
  const started = performance.now()
  try {
    const response = await financialPlatformApi.getStatus(id)
    const elapsed = Math.round(performance.now() - started)
    const data = response.data || {}
    const platformStatus = data.platformStatus || data.status || 'UNPROVISIONED'
    state.value = platformStatus
    details.value = {
      ...data,
      tenantId: data.tenantId || id,
      quasarTenantId: data.quasarTenantId || data.quasar_tenant_id || null,
      environment: data.environment || 'test',
      healthStatus: data.healthStatus || (platformStatus === 'ACTIVE' ? 'HEALTHY' : platformStatus),
      lastHealthCheckAt: data.lastHealthCheckAt || data.lastSuccessfulHealthCheck || new Date().toISOString(),
      vaultStatus: data.vaultStatus || data.vault_status || 'HEALTHY',
      lastRotationAt: data.lastRotationAt || data.last_rotation_at || null
    }
    recordLatency(elapsed, true)
  } catch (err) {
    recordLatency(Math.round(performance.now() - started), false)
    console.error('Status fetch failed', err)
  } finally {
    statusLoading.value = false
  }
}

const handleStatusChange = async (newStatus) => {
  state.value = newStatus
  if (newStatus === 'ACTIVE' || newStatus === 'DEGRADED') {
    await fetchStatus()
  }
}

const refreshHealth = async () => {
  busy.value = 'refresh'
  try {
    await fetchStatus()
    $q.notify({ type: 'positive', message: 'Health refreshed.' })
  } finally {
    busy.value = ''
  }
}

const testConnection = async () => {
  const id = resolveTenantId()
  if (!id) return
  busy.value = 'test'
  const started = performance.now()
  try {
    const response = await financialPlatformApi.testConnection(id)
    const elapsed = Math.round(performance.now() - started)
    details.value = {
      ...details.value,
      ...response.data,
      healthStatus: response.data?.healthStatus || response.data?.platformStatus || details.value.healthStatus,
      lastHealthCheckAt: new Date().toISOString()
    }
    state.value = response.data?.platformStatus || state.value
    recordLatency(elapsed, true)
    $q.notify({ type: 'positive', message: 'Connection check successful!' })
    auditRef.value?.refresh?.()
  } catch (err) {
    recordLatency(Math.round(performance.now() - started), false)
    $q.notify({ type: 'negative', message: 'Connection test failed.' })
  } finally {
    busy.value = ''
  }
}

const reconnectPlatform = async () => {
  const id = resolveTenantId()
  if (!id) return
  busy.value = 'reconnect'
  try {
    const response = await financialPlatformApi.activate(id)
    const data = response.data || {}
    $q.notify({ type: 'positive', message: 'Financial Platform Reconnected and Activated!' })
    await fetchStatus()
  } catch (err) {
    console.error('Reconnect failed:', err)
    $q.notify({
      type: 'negative',
      message: err.response?.data?.error || err.response?.data?.details || 'Failed to reconnect and activate platform.'
    })
  } finally {
    busy.value = ''
  }
}

const rotateCredentials = async () => {
  const id = resolveTenantId()
  if (!id) return
  busy.value = 'rotate'
  try {
    await financialPlatformApi.rotateCredentials(id)
    await fetchStatus()
    details.value = {
      ...details.value,
      lastRotationAt: new Date().toISOString()
    }
    $q.notify({ type: 'positive', message: 'Credentials rotated successfully.' })
    auditRef.value?.refresh?.()
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.response?.data?.error || 'Credentials rotation failed.'
    })
  } finally {
    busy.value = ''
  }
}

const requestRotateCredentials = () => {
  $q.dialog({
    title: 'Confirm credential rotation',
    message: 'This will revoke existing Quasar sandbox credentials and generate a new set. Active financial operations might experience momentary disruption.',
    cancel: true,
    persistent: true,
    ok: { label: 'Confirm Rotation', color: 'warning' }
  }).onOk(() => {
    rotateCredentials()
  })
}

const deactivatePlatform = async (reason) => {
  const id = resolveTenantId()
  if (!id) return
  const deactivationReason = typeof reason === 'string' && reason.trim()
    ? reason.trim()
    : 'Operator requested deactivation'
  busy.value = 'deactivate'
  try {
    await financialPlatformApi.deactivate(id, deactivationReason)
    await fetchStatus()
    dangerRef.value?.showSuccess?.()
    $q.notify({ type: 'positive', message: 'Financial Platform successfully deactivated.' })
    auditRef.value?.refresh?.()
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.error || 'Failed to deactivate platform.' })
  } finally {
    busy.value = ''
  }
}

const scrollToAudit = () => {
  auditAnchor.value?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
}

const downloadAudit = () => {
  scrollToAudit()
  if (auditRef.value?.exportCsv) {
    auditRef.value.exportCsv()
    return
  }
  $q.notify({
    type: 'info',
    message: 'Use Export on the Audit History panel to download CSV.'
  })
}
</script>

<style scoped>
.financial-platform-page {
  max-width: 1280px;
  margin: 0 auto;
}
.telemetry-strip {
  background: linear-gradient(165deg, rgba(30, 41, 59, 0.92) 0%, rgba(15, 23, 42, 0.98) 100%);
  border-color: rgba(148, 163, 184, 0.18) !important;
  border-radius: 12px;
}
.tele-label {
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #94a3b8;
  margin-bottom: 6px;
  font-weight: 700;
}
.tele-value {
  font-size: 22px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #f1f5f9;
}
</style>
