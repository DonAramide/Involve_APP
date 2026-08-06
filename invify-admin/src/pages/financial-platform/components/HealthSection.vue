<template>
  <q-card flat bordered class="health-section ops-card" role="region" aria-labelledby="fp-health-title">
    <q-card-section>
      <div class="row items-center justify-between q-mb-md">
        <div class="row items-center">
          <div class="icon-orb cyan q-mr-sm" aria-hidden="true">
            <q-icon name="monitor_heart" size="18px" color="cyan-3" />
          </div>
          <div>
            <div id="fp-health-title" class="text-subtitle1 text-weight-bold text-white">Connection Health</div>
            <div class="text-caption text-grey-5">Operational diagnostics for Quasar connectivity</div>
          </div>
        </div>
        <PlatformStatusBadge
          :status="healthStatus"
          :label="healthStatus"
          :pulse="healthStatus === 'HEALTHY'"
        />
      </div>

      <div class="diag-grid">
        <div class="diag-cell">
          <div class="diag-label">Current Status</div>
          <div class="diag-value row items-center q-gutter-xs">
            <span :class="['heartbeat', { on: healthStatus === 'HEALTHY' }]" aria-hidden="true" />
            <span>{{ healthStatus }}</span>
          </div>
        </div>
        <div class="diag-cell">
          <div class="diag-label">API Latency</div>
          <div class="diag-value text-cyan-3">{{ latencyDisplay }}</div>
        </div>
        <div class="diag-cell">
          <div class="diag-label">Last Ping</div>
          <div class="diag-value">{{ lastPingLabel }}</div>
        </div>
        <div class="diag-cell">
          <div class="diag-label">Connection Quality</div>
          <div class="diag-value">{{ qualityLabel }}</div>
        </div>
        <div class="diag-cell">
          <div class="diag-label">Session retries</div>
          <div class="diag-value">{{ retryCount }}</div>
        </div>
        <div class="diag-cell">
          <div class="diag-label">Circuit breaker</div>
          <div class="diag-value">
            <PlatformStatusBadge
              :status="healthStatus === 'HEALTHY' ? 'HEALTHY' : (healthStatus === 'DEGRADED' ? 'WARNING' : 'CRITICAL')"
              :label="healthStatus === 'HEALTHY' ? 'Closed' : (healthStatus === 'DEGRADED' ? 'Half-open' : 'Open')"
            />
          </div>
        </div>
      </div>

      <div class="q-mt-md">
        <div class="row items-center justify-between q-mb-xs">
          <div class="text-caption text-grey-5 text-weight-bold letter-spacing-1">HEALTH HISTORY (SESSION)</div>
          <div class="text-caption text-grey-6">{{ latencyHistory.length }} samples</div>
        </div>
        <div class="spark-wrap">
          <PlatformSparkline
            v-if="latencyHistory.length"
            :values="latencyHistory"
            :height="36"
            stroke="#22d3ee"
            aria-label="Session health latency history"
          />
          <div v-else class="empty-mini text-caption text-grey-6">
            Run a connection test to populate live latency history.
          </div>
        </div>
      </div>
    </q-card-section>

    <q-separator dark />

    <q-card-actions align="right" class="q-pa-md">
      <q-btn
        outline
        color="cyan-4"
        icon="sync"
        label="Test Connection"
        :loading="testing"
        :aria-label="'Test Quasar connection'"
        @click="runTest"
      />
    </q-card-actions>
  </q-card>
</template>

<script setup>
import { computed } from 'vue'
import PlatformStatusBadge from './PlatformStatusBadge.vue'
import PlatformSparkline from './PlatformSparkline.vue'

const props = defineProps({
  details: { type: Object, default: () => ({}) },
  latencyMs: { type: [Number, String], default: null },
  latencyHistory: { type: Array, default: () => [] },
  retryCount: { type: Number, default: 0 },
  testing: { type: Boolean, default: false }
})

const emit = defineEmits(['testConnection'])

const healthStatus = computed(() => String(props.details?.healthStatus || 'UNKNOWN').toUpperCase())

const latencyDisplay = computed(() => {
  if (props.latencyMs == null || props.latencyMs === '') return '—'
  return typeof props.latencyMs === 'number' ? `${props.latencyMs} ms` : String(props.latencyMs)
})

const lastPingLabel = computed(() => {
  const ts = props.details?.lastHealthCheckAt
  return ts ? new Date(ts).toLocaleString() : 'Not checked'
})

const qualityLabel = computed(() => {
  const ms = typeof props.latencyMs === 'number' ? props.latencyMs : null
  if (healthStatus.value !== 'HEALTHY') return 'Degraded'
  if (ms == null) return 'Nominal'
  if (ms < 80) return 'Excellent'
  if (ms < 200) return 'Good'
  if (ms < 500) return 'Fair'
  return 'Slow'
})

const runTest = () => emit('testConnection')
</script>

<style scoped>
.ops-card {
  background: linear-gradient(165deg, rgba(30, 41, 59, 0.92) 0%, rgba(15, 23, 42, 0.98) 100%);
  border-color: rgba(148, 163, 184, 0.18) !important;
  border-radius: 12px;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}
.ops-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
}
.icon-orb {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: rgba(34, 211, 238, 0.12);
  border: 1px solid rgba(34, 211, 238, 0.25);
}
.diag-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
@media (min-width: 900px) {
  .diag-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
.diag-cell {
  background: rgba(2, 6, 23, 0.45);
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 10px;
  padding: 10px 12px;
}
.diag-label {
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #94a3b8;
  margin-bottom: 4px;
}
.diag-value {
  font-size: 13px;
  font-weight: 700;
  color: #e2e8f0;
  font-variant-numeric: tabular-nums;
}
.spark-wrap {
  background: rgba(2, 6, 23, 0.45);
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 10px;
  padding: 10px 12px;
  min-height: 56px;
}
.empty-mini { padding: 8px 0; }
.heartbeat {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #64748b;
  display: inline-block;
}
.heartbeat.on {
  background: #34d399;
  animation: fp-heartbeat 1.8s ease-out infinite;
}
@keyframes fp-heartbeat {
  0% { box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.55); }
  70% { box-shadow: 0 0 0 8px rgba(52, 211, 153, 0); }
  100% { box-shadow: 0 0 0 0 rgba(52, 211, 153, 0); }
}
.letter-spacing-1 { letter-spacing: 0.06em; }
</style>
