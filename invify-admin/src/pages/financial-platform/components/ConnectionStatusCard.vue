<template>
  <div class="fp-ops-hero q-mb-md" role="region" aria-label="Financial platform operations overview">
    <!-- Title strip -->
    <div class="hero-head row items-start justify-between q-col-gutter-md q-mb-md">
      <div class="col">
        <div class="row items-center q-gutter-sm q-mb-xs">
          <h1 class="text-h4 text-weight-bold q-my-none text-white">Financial Platform</h1>
          <PlatformStatusBadge :status="status" :pulse="isHealthy" />
          <PlatformStatusBadge
            :status="healthTone"
            :label="healthLabel"
            :pulse="isHealthy"
          />
          <q-badge
            outline
            color="cyan-4"
            class="text-caption text-weight-bold letter-spacing-1"
          >
            {{ envLabel }}
          </q-badge>
        </div>
        <p class="text-subtitle2 text-grey-5 q-mb-none q-mt-xs">
          Enterprise orchestration for ledgers, virtual accounts, and reconciliation via Quasar.
        </p>
        <div class="text-caption text-grey-6 q-mt-sm row items-center q-gutter-x-md">
          <span class="row items-center">
            <q-icon name="schedule" size="14px" class="q-mr-xs" />
            Last sync {{ lastSyncLabel }}
          </span>
          <span v-if="details?.quasarTenantId" class="row items-center text-mono">
            <q-icon name="link" size="14px" class="q-mr-xs" />
            Quasar {{ shortId(details.quasarTenantId) }}
          </span>
        </div>
      </div>
      <div class="col-auto row q-gutter-sm items-center">
        <slot name="actions" />
      </div>
    </div>

    <!-- Skeleton -->
    <div v-if="loading" class="row q-col-gutter-md" aria-busy="true" aria-label="Loading platform metrics">
      <div v-for="n in 4" :key="n" class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="kpi-card skeleton-card">
          <q-skeleton dark type="text" width="40%" class="q-mb-sm" />
          <q-skeleton dark type="text" width="70%" class="q-mb-xs" />
          <q-skeleton dark type="text" width="55%" />
        </q-card>
      </div>
    </div>

    <!-- KPI strip -->
    <div v-else class="row q-col-gutter-md">
      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="kpi-card hover-lift border-cyan" tabindex="0">
          <div class="kpi-overline text-cyan-3">Connection Health</div>
          <div class="row items-center justify-between q-mt-sm">
            <PlatformStatusBadge :status="healthTone" :label="healthLabel" :pulse="isHealthy" />
            <PlatformSparkline :values="latencyHistory" stroke="#22d3ee" aria-label="Latency trend" />
          </div>
          <div class="kpi-metrics q-mt-md">
            <div>
              <div class="metric-label">Latency</div>
              <div class="metric-value text-cyan-3">{{ latencyLabel }}</div>
            </div>
            <div>
              <div class="metric-label">Session success</div>
              <div class="metric-value text-green-4">{{ successRateLabel }}</div>
            </div>
          </div>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="kpi-card hover-lift border-amber" tabindex="0">
          <div class="kpi-overline text-amber-3">Credential Status</div>
          <div class="q-mt-sm">
            <PlatformStatusBadge
              :status="vaultHealthy ? 'PROTECTED' : 'WARNING'"
              :label="vaultHealthy ? 'Vault Protected' : 'Vault Attention'"
            />
          </div>
          <div class="kpi-metrics q-mt-md">
            <div>
              <div class="metric-label">Last rotation</div>
              <div class="metric-value">{{ lastRotationLabel }}</div>
            </div>
            <div>
              <div class="metric-label">Vault state</div>
              <div class="metric-value text-amber-3">{{ details?.vaultStatus || 'N/A' }}</div>
            </div>
          </div>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="kpi-card hover-lift border-indigo" tabindex="0">
          <div class="kpi-overline text-indigo-3">Platform</div>
          <div class="kpi-metrics q-mt-md single-col">
            <div class="row justify-between items-center">
              <span class="metric-label">Environment</span>
              <span class="metric-value text-capitalize">{{ envLabel }}</span>
            </div>
            <div class="row justify-between items-center">
              <span class="metric-label">Provider</span>
              <span class="metric-value">Quasar</span>
            </div>
            <div class="row justify-between items-center">
              <span class="metric-label">API</span>
              <span class="metric-value text-indigo-3">v1</span>
            </div>
          </div>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="kpi-card hover-lift border-green" tabindex="0">
          <div class="kpi-overline text-green-4">Financial Activity</div>
          <div class="kpi-metrics q-mt-md single-col">
            <div class="row justify-between items-center">
              <span class="metric-label">Virtual Accounts</span>
              <PlatformStatusBadge :status="activityTone" :label="isActive ? 'Active' : 'Idle'" />
            </div>
            <div class="row justify-between items-center">
              <span class="metric-label">Ledger</span>
              <PlatformStatusBadge :status="activityTone" :label="isActive ? 'Connected' : 'Offline'" />
            </div>
            <div class="row justify-between items-center">
              <span class="metric-label">Reconciliation</span>
              <PlatformStatusBadge :status="healthTone" :label="isHealthy ? 'Healthy' : healthLabel" />
            </div>
          </div>
        </q-card>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import PlatformStatusBadge from './PlatformStatusBadge.vue'
import PlatformSparkline from './PlatformSparkline.vue'

const props = defineProps({
  status: { type: String, required: true },
  details: { type: Object, default: () => ({}) },
  loading: { type: Boolean, default: false },
  latencyMs: { type: [Number, String], default: null },
  latencyHistory: { type: Array, default: () => [] },
  sessionChecks: {
    type: Object,
    default: () => ({ ok: 0, total: 0 })
  }
})

const isActive = computed(() => ['ACTIVE', 'DEGRADED'].includes(props.status))
const isHealthy = computed(() => String(props.details?.healthStatus || '').toUpperCase() === 'HEALTHY' && props.status === 'ACTIVE')

const healthTone = computed(() => {
  const h = String(props.details?.healthStatus || '').toUpperCase()
  if (h === 'HEALTHY') return 'HEALTHY'
  if (h === 'DEGRADED' || props.status === 'DEGRADED') return 'WARNING'
  if (['OFFLINE', 'FAILED', 'CRITICAL'].includes(h)) return 'CRITICAL'
  if (props.status === 'PROVISIONING') return 'SYNCING'
  return h || props.status || 'UNKNOWN'
})

const healthLabel = computed(() => {
  const h = String(props.details?.healthStatus || '').toUpperCase()
  if (h) return h.charAt(0) + h.slice(1).toLowerCase()
  return 'Unknown'
})

const activityTone = computed(() => (isActive.value && isHealthy.value ? 'HEALTHY' : (isActive.value ? 'WARNING' : 'DISABLED')))

const envLabel = computed(() => {
  const env = String(props.details?.environment || 'test')
  return env.toLowerCase() === 'test' || env.toLowerCase() === 'sandbox' ? 'Sandbox' : env
})

const vaultHealthy = computed(() => {
  const v = String(props.details?.vaultStatus || '').toUpperCase()
  return !v || v === 'HEALTHY' || v === 'ACTIVE' || v === 'OK'
})

const latencyLabel = computed(() => {
  if (props.latencyMs == null || props.latencyMs === '') return '—'
  if (typeof props.latencyMs === 'string') return props.latencyMs
  return `${props.latencyMs} ms`
})

const successRateLabel = computed(() => {
  const { ok, total } = props.sessionChecks || {}
  if (!total) return '—'
  return `${((ok / total) * 100).toFixed(2)}%`
})

const lastSyncLabel = computed(() => {
  const ts = props.details?.lastHealthCheckAt
  if (!ts) return 'not yet'
  const diff = Date.now() - new Date(ts).getTime()
  if (!Number.isFinite(diff) || diff < 0) return new Date(ts).toLocaleString()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins === 1) return '1 min ago'
  if (mins < 60) return `${mins} mins ago`
  const hrs = Math.floor(mins / 60)
  return hrs === 1 ? '1 hour ago' : `${hrs} hours ago`
})

const lastRotationLabel = computed(() => {
  if (!props.details?.lastRotationAt) return 'Never'
  return new Date(props.details.lastRotationAt).toLocaleString()
})

function shortId(id) {
  if (!id || id.length < 12) return id
  return `${id.slice(0, 8)}…`
}
</script>

<style scoped>
.fp-ops-hero {
  max-width: 100%;
}
.kpi-card {
  background: linear-gradient(165deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%);
  border-color: rgba(148, 163, 184, 0.18) !important;
  border-radius: 12px;
  padding: 14px 16px;
  min-height: 148px;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}
.kpi-card:focus-visible {
  outline: 2px solid #818cf8;
  outline-offset: 2px;
}
.hover-lift:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
}
.border-cyan { border-left: 3px solid #22d3ee !important; }
.border-amber { border-left: 3px solid #fbbf24 !important; }
.border-indigo { border-left: 3px solid #818cf8 !important; }
.border-green { border-left: 3px solid #34d399 !important; }
.kpi-overline {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.kpi-metrics {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px 12px;
}
.kpi-metrics.single-col {
  grid-template-columns: 1fr;
  gap: 8px;
}
.metric-label {
  font-size: 11px;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.metric-value {
  font-size: 14px;
  font-weight: 700;
  color: #f1f5f9;
  margin-top: 2px;
  font-variant-numeric: tabular-nums;
}
.text-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
}
.skeleton-card {
  min-height: 148px;
  padding: 16px;
  background: #0f172a;
}
.letter-spacing-1 { letter-spacing: 0.06em; }
</style>
