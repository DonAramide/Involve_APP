<template>
  <q-drawer
    v-model="isOpen"
    side="right"
    overlay
    behavior="mobile"
    elevated
    :width="560"
    class="bg-panel-darker text-main border-left custom-drawer"
  >
    <div class="column full-height">
      <div class="row items-center justify-between q-pa-md border-bottom bg-panel shrink-0">
        <div class="row items-center op-gap-8">
          <q-btn flat dense icon="close" color="grey-5" @click="close" />
          <div>
            <div class="text-weight-bold" style="font-size: 15px;">TENANT METRICS</div>
            <div class="text-caption text-muted">School / employer linked to your HMO</div>
          </div>
        </div>
        <q-badge :color="statusColor" text-color="white">{{ String(detail?.status || '—').toUpperCase() }}</q-badge>
      </div>

      <div v-if="loading" class="col flex flex-center">
        <q-spinner color="teal-3" size="2.5em" />
      </div>

      <div v-else-if="error" class="col column flex-center q-pa-lg text-center op-gap-8">
        <q-icon name="error_outline" color="red-4" size="2rem" />
        <div class="text-caption text-red-3">{{ error }}</div>
        <q-btn dense outline color="teal-3" label="Retry" no-caps @click="reload" />
      </div>

      <div v-else-if="detail" class="col custom-scrollbar overflow-auto q-pa-md column op-gap-14">
        <div class="bg-panel border-muted rounded-borders q-pa-md">
          <div class="text-h6 text-weight-bold text-teal-2 q-mb-xs">{{ detail.name }}</div>
          <div class="text-caption text-muted">
            {{ detail.type || 'organization' }}
            <span class="q-mx-xs">·</span>
            ID: <span class="text-metric-mono">{{ detail.tenantId }}</span>
          </div>
          <div class="text-caption text-muted q-mt-xs">
            Location: <b class="text-main">{{ detail.location || '—' }}</b>
          </div>
          <div class="text-caption text-muted">
            Contact:
            <b class="text-main">{{ detail.phone || '—' }}</b>
            <span class="q-mx-xs">·</span>
            <b class="text-main">{{ detail.ownerEmail || '—' }}</b>
          </div>
          <div class="text-caption text-muted">
            Owner: <b class="text-main">{{ detail.ownerName || '—' }}</b>
            <span v-if="detail.agentCode" class="q-ml-sm">· Agent: <b class="text-main">{{ detail.agentCode }}</b></span>
          </div>
        </div>

        <div class="row q-col-gutter-sm">
          <div class="col-6" v-for="card in metricCards" :key="card.label">
            <div class="bg-panel border-muted rounded-borders q-pa-sm">
              <div class="text-caption text-muted">{{ card.label }}</div>
              <div class="text-h6 text-weight-bold" :class="card.color">{{ card.value }}</div>
            </div>
          </div>
        </div>

        <div class="bg-panel border-muted rounded-borders q-pa-md">
          <div class="text-subtitle2 text-weight-bold text-teal-3 q-mb-sm">Organization</div>
          <div class="text-caption text-muted">Onboarding: <b class="text-main">{{ detail.onboardingStatus || '—' }}</b></div>
          <div class="text-caption text-muted">Plan: <b class="text-main">{{ detail.plan || '—' }}</b></div>
          <div class="text-caption text-muted">
            Registered:
            <b class="text-main">{{ detail.createdAt ? new Date(detail.createdAt).toLocaleString() : '—' }}</b>
          </div>
          <div class="text-caption text-muted">
            Allowed plans: <b class="text-main">{{ (detail.allowedPlanIds || []).length }}</b>
          </div>
        </div>

        <div class="bg-panel border-muted rounded-borders q-pa-md">
          <div class="row items-center justify-between q-mb-sm">
            <div class="text-subtitle2 text-weight-bold text-teal-3">Registered devices</div>
            <q-badge color="teal-9" text-color="teal-2">{{ detail.devices?.length || 0 }}</q-badge>
          </div>
          <div v-if="!(detail.devices || []).length" class="text-caption text-muted">No devices registered for this tenant yet.</div>
          <div v-else class="column op-gap-8">
            <div
              v-for="dev in detail.devices"
              :key="dev.id || dev.deviceId"
              class="bg-panel-darker border-muted rounded-borders q-pa-sm"
            >
              <div class="text-caption text-weight-bold text-main text-metric-mono">{{ dev.deviceId }}</div>
              <div class="text-caption text-muted">
                Status: {{ dev.status || '—' }}
                <span v-if="dev.deviceNumber"> · #{{ dev.deviceNumber }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </q-drawer>
</template>

<script setup>
import { computed, ref } from 'vue'
import axios from 'axios'
import { useQuasar } from 'quasar'

const $q = useQuasar()
const isOpen = ref(false)
const loading = ref(false)
const error = ref('')
const detail = ref(null)
const activeTenantId = ref('')

function authHeaders() {
  const token = localStorage.getItem('invify_agent_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const statusColor = computed(() => {
  const s = String(detail.value?.status || '').toLowerCase()
  if (s === 'active') return 'green-9'
  if (s === 'rejected' || s === 'suspended') return 'red-9'
  return 'amber-9'
})

const metricCards = computed(() => {
  const m = detail.value?.metrics || {}
  const currency = m.walletCurrency === 'NGN' || !m.walletCurrency ? '₦' : `${m.walletCurrency} `
  return [
    { label: 'Total enrolled', value: m.enrolledMembers ?? 0, color: 'text-teal-2' },
    { label: 'Active coverage', value: m.activeMembers ?? 0, color: 'text-green-4' },
    { label: 'Pending confirmation', value: m.pendingMembers ?? 0, color: 'text-amber-4' },
    { label: 'Rejected / closed', value: m.rejectedMembers ?? 0, color: 'text-red-4' },
    { label: 'Devices', value: m.deviceCount ?? 0, color: 'text-cyan-3' },
    { label: 'Wallet balance', value: `${currency}${Number(m.walletBalance || 0).toLocaleString()}`, color: 'text-indigo-3' },
    { label: 'Claims total', value: m.claimsTotal ?? 0, color: 'text-main' },
    { label: 'Claims pending', value: m.claimsPending ?? 0, color: 'text-amber-4' },
  ]
})

async function reload() {
  if (!activeTenantId.value) return
  loading.value = true
  error.value = ''
  try {
    const res = await axios.get(`/api/agent/hmo/schools/${activeTenantId.value}`, {
      headers: authHeaders(),
    })
    detail.value = res.data?.data || null
    if (!detail.value) error.value = 'No metrics returned for this tenant'
  } catch (err) {
    error.value = err.response?.data?.message || err.message || 'Failed to load tenant metrics'
    detail.value = null
  } finally {
    loading.value = false
  }
}

async function open(tenantOrId) {
  const tenantId =
    typeof tenantOrId === 'string'
      ? tenantOrId
      : tenantOrId?.tenantId || tenantOrId?.tenant_id || tenantOrId?.id
  if (!tenantId) {
    $q.notify({ type: 'warning', message: 'Tenant id is missing' })
    return
  }
  activeTenantId.value = String(tenantId)
  isOpen.value = true
  await reload()
}

function close() {
  isOpen.value = false
}

defineExpose({ open, close })
</script>

<style scoped>
.bg-main { background-color: #0b0f12; }
.bg-panel { background-color: #12181c; }
.bg-panel-darker { background-color: #0e1216; }
.text-main { color: #f8f9fa; }
.text-muted { color: #868e96; }
.border-muted { border: 1px solid #2a3339; }
.border-bottom { border-bottom: 1px solid #1a2024; }
.border-left { border-left: 1px solid #1a2024; }
.text-metric-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
.op-gap-8 { gap: 8px; }
.op-gap-14 { gap: 14px; }
.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #22282d; border-radius: 3px; }
</style>
