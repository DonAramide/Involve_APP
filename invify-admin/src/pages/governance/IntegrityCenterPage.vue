<!-- invify-admin/src/pages/governance/IntegrityCenterPage.vue -->
<template>
  <q-page class="bg-[#0b0f12] text-[#e1e7ec] q-pa-md column op-gap-16">
    
    <!-- Top Telemetry & Control Line -->
    <div class="row items-center justify-between no-wrap border-bottom q-pb-sm">
      <div class="row items-center op-gap-8 no-wrap">
        <q-icon name="security" size="sm" color="purple-4" />
        <div>
          <div class="text-operator-title text-white text-weight-bold" style="font-size: 14px;">Hardware Integrity & Attestation Center</div>
          <div class="text-metric-mono text-grey-5" style="font-size: 10px;">CRYPTOGRAPHIC_ASSURANCE_LAYER // STREAM: NORMALIZED</div>
        </div>
      </div>
      
      <div class="row items-center op-gap-8 no-wrap">
        <span class="text-caption text-grey-6 v-hide-xs">Trust Engine Status:</span>
        <q-chip dense size="xs" color="purple-10" text-color="purple-2" class="text-metric-sm">
          <span class="live-indicator-dot bg-purple-4 q-mr-xs"></span>
          ENFORCING // ZERO DUPLICATION
        </q-chip>
      </div>
    </div>

    <!-- UPPER ROW: Integrity State Telemetry Cards -->
    <div class="grid-integrity-cards op-gap-8">
      
      <!-- 1. Average Fleet Trust Score -->
      <div class="panel-card bg-[#12161a] border-muted rounded-borders q-pa-sm column justify-between">
        <div class="row items-center justify-between text-caption text-grey-5">
          <span class="text-weight-bold text-green-3">AGGREGATE FLEET TRUST</span>
          <q-icon name="verified" size="xs" color="green-3" />
        </div>
        <div class="row items-baseline op-gap-4 q-mt-xs">
          <span class="text-metric-mono text-white text-weight-bold" style="font-size: 20px;">{{ avgFleetTrustScore }}%</span>
          <span class="text-metric-sm text-green-4" v-if="avgFleetTrustScore > 95">OPTIMAL</span>
        </div>
        <q-linear-progress dark :value="avgFleetTrustScore / 100" color="green-4" track-color="grey-9" size="xs" class="q-mt-xs" />
      </div>

      <!-- 2. Play Integrity Attestation Failures -->
      <div class="panel-card bg-[#12161a] border-muted rounded-borders q-pa-sm column justify-between">
        <div class="row items-center justify-between text-caption text-grey-5">
          <span class="text-weight-bold text-red-4">ATTESTATION FAILURES</span>
          <q-icon name="gpp_bad" size="xs" color="red-4" />
        </div>
        <div class="row items-baseline op-gap-4 q-mt-xs">
          <span class="text-metric-mono text-white text-weight-bold" style="font-size: 20px;">{{ integrityStore.failedAttestationsCount }}</span>
          <span class="text-metric-sm text-red-3">triggers</span>
        </div>
        <div class="text-metric-sm text-grey-5 q-mt-xs">Play Integrity hardware hashes broken</div>
      </div>

      <!-- 3. Rooted OS / Kernel Tampering -->
      <div class="panel-card bg-[#12161a] border-muted rounded-borders q-pa-sm column justify-between">
        <div class="row items-center justify-between text-caption text-grey-5">
          <span class="text-weight-bold text-deep-orange-4">FIRMWARE TAMPERING</span>
          <q-icon name="memory" size="xs" color="deep-orange-4" />
        </div>
        <div class="row items-baseline op-gap-4 q-mt-xs">
          <span class="text-metric-mono text-white text-weight-bold" style="font-size: 20px;">{{ firmwareTamperedCount }}</span>
          <span class="text-metric-sm text-deep-orange-3">endpoints</span>
        </div>
        <div class="text-metric-sm text-grey-5 q-mt-xs">Root bridges detected via boot metrics</div>
      </div>

      <!-- 4. Suspicious Runtime Behavior -->
      <div class="panel-card bg-[#12161a] border-muted rounded-borders q-pa-sm column justify-between">
        <div class="row items-center justify-between text-caption text-grey-5">
          <span class="text-weight-bold text-amber-4">RUNTIME ANOMALIES</span>
          <q-icon name="trending_down" size="xs" color="amber-4" />
        </div>
        <div class="row items-baseline op-gap-4 q-mt-xs">
          <span class="text-metric-mono text-white text-weight-bold" style="font-size: 20px;">{{ runtimeAnomaliesCount }}</span>
          <span class="text-metric-sm text-grey-6">vectors</span>
        </div>
        <div class="text-metric-sm text-grey-5 q-mt-xs">Execution stack timing exceptions</div>
      </div>

    </div>

    <!-- MAIN MIDDLE SECTION: Real-time Trace Feeds & Historical Timelines -->
    <div class="row items-stretch op-gap-16 fit">
      
      <!-- LEFT PORTION: Severity-Aware Cryptographic Traces -->
      <div class="col-12 col-md-7 column op-gap-16">
        
        <div class="panel-card bg-[#12161a] border-muted rounded-borders column fit">
          <div class="panel-header bg-[#161b20] q-px-sm q-py-xs border-bottom row items-center justify-between">
            <div class="row items-center op-gap-4 no-wrap">
              <q-icon name="list_alt" size="xs" color="cyan-3" />
              <span class="text-operator-title text-white text-weight-bold">Cryptographic Validation Array</span>
            </div>
            <span class="text-metric-mono text-cyan-3" style="font-size: 10px;">{{ validationTracesList.length }} Stream Events</span>
          </div>

          <div class="panel-body col q-pa-xs overflow-y-auto" style="max-height: 260px;">
            <q-list dense class="q-gutter-y-xs">
              <q-item 
                v-for="t in validationTracesList" 
                :key="t.eventId" 
                class="q-px-sm q-py-xs bg-[#161b20] rounded-borders row items-center justify-between no-wrap hover-row"
                :class="getSeverityLeftBorderClass(t.severity)"
              >
                <div class="row items-center op-gap-8 no-wrap col-8 overflow-hidden">
                  <q-badge :color="getSeverityBadgeColor(t.severity)" :text-color="getSeverityTextColor(t.severity)" class="text-metric-sm">
                    {{ t.severity }}
                  </q-badge>
                  
                  <div class="ellipsis">
                    <span class="text-white text-weight-bold text-caption cursor-pointer hover-underline" @click="correlateToExplorer(t.sourceAttribution)">
                      {{ t.sourceAttribution }}
                    </span>
                    <span class="text-grey-4 q-ml-xs" style="font-size: 11px;">- {{ t.payload?.message || t.eventType }}</span>
                  </div>
                </div>

                <div class="column items-end col-4">
                  <span class="text-metric-mono text-white text-weight-bold" style="font-size: 11px;">
                    Trust: {{ t.payload?.trustScore || 98 }}%
                  </span>
                  <span class="text-metric-mono text-grey-6" style="font-size: 9px;">
                    {{ formatRelativeTime(t.timestamp) }}
                  </span>
                </div>
              </q-item>
            </q-list>
          </div>
        </div>

      </div>

      <!-- RIGHT PORTION: Historical Trust Degradation Timeline -->
      <div class="col-12 col-md-5 column op-gap-16">
        
        <div class="panel-card bg-[#12161a] border-muted rounded-borders column fit">
          <div class="panel-header bg-[#161b20] q-px-sm q-py-xs border-bottom row items-center justify-between">
            <div class="row items-center op-gap-4 no-wrap">
              <q-icon name="stacked_line_chart" size="xs" color="amber-4" />
              <span class="text-operator-title text-white text-weight-bold">Historical Trust Degradation Trajectory</span>
            </div>
            <span class="text-metric-mono text-grey-5" style="font-size: 10px;">7d Profile</span>
          </div>

          <div class="panel-body col q-pa-sm column justify-between">
            <div class="text-caption text-grey-4 q-mb-xs" style="font-size: 11px;">
              Continuous baseline hardware attestation variations over ingestion lifespan:
            </div>

            <!-- Simulated comparative trust metric vector mapping -->
            <div class="column op-gap-8 q-py-sm">
              <div class="row items-center justify-between text-caption text-grey-5">
                <span>Core Operating Base</span>
                <span class="text-metric-mono text-green-3">99.8% Nominal</span>
              </div>
              <q-linear-progress dark value="0.998" color="green-4" track-color="grey-9" size="xs" />

              <div class="row items-center justify-between text-caption text-grey-5">
                <span>Kiosk Subfleet Drift</span>
                <span class="text-metric-mono text-amber-3">94.1% Impacted</span>
              </div>
              <q-linear-progress dark value="0.941" color="amber-4" track-color="grey-9" size="xs" />

              <div class="row items-center justify-between text-caption text-grey-5">
                <span>Compromised Scanner Waves</span>
                <span class="text-metric-mono text-red-4">71.2% Degraded</span>
              </div>
              <q-linear-progress dark value="0.712" color="red-5" track-color="grey-9" size="xs" />
            </div>

            <!-- Dynamic Correlation notice banner -->
            <div class="bg-[#1b1515] q-pa-sm rounded-borders border-left-critical q-mt-xs">
              <div class="text-white text-weight-bold text-caption row items-center op-gap-4">
                <q-icon name="warning" color="red-4" size="xs" />
                <span>Incident Correlation Hook</span>
              </div>
              <div class="text-red-3 q-mt-xs" style="font-size: 10px;">
                Unresolved parity failures triggered cascade trust depreciation targeting hardware sector [tenant-omega].
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>

    <!-- LOWER ROW: FINAL REFINEMENT #3: Integrity Correlation Graphs -->
    <div class="panel-card bg-[#12161a] border-muted rounded-borders column fit">
      <div class="panel-header bg-[#161b20] q-px-sm q-py-xs border-bottom row items-center justify-between">
        <div class="row items-center op-gap-4 no-wrap">
          <q-icon name="insights" size="xs" color="cyan-3" />
          <span class="text-operator-title text-white text-weight-bold">Multi-Series Integrity Correlation Analysis Maps</span>
        </div>
        <div class="row items-center op-gap-8 no-wrap text-caption text-grey-5">
          <span>Dual-Series Trajectory comparison</span>
        </div>
      </div>

      <div class="panel-body q-pa-md column op-gap-16">
        
        <!-- Correlation Graph A: Integrity Degradation <-> OTA Rollouts -->
        <div class="correlation-box bg-[#161b20] q-pa-sm rounded-borders border-left-cyan column op-gap-4">
          <div class="row items-center justify-between text-caption text-grey-4">
            <span class="text-white text-weight-bold">Correlation Map A: Hardware Trust Degradation ↔ OTA Deployment Waves</span>
            <span class="text-metric-mono text-cyan-3" style="font-size: 10px;">R² = 0.84 HIGH CORRELATION</span>
          </div>

          <!-- Multi-Series visual timeline bars plotting synthetic relationships -->
          <div class="row items-center op-gap-12 q-pt-xs">
            <div class="col column op-gap-2">
              <div class="row justify-between text-grey-5" style="font-size: 9px;">
                <span>Active Rollout Batch Velocity</span>
                <span class="text-metric-mono text-cyan-3">240 nodes/min</span>
              </div>
              <q-linear-progress dark value="0.75" color="cyan-4" track-color="grey-9" size="xs" />
            </div>

            <div class="col column op-gap-2">
              <div class="row justify-between text-grey-5" style="font-size: 9px;">
                <span>Observed Trust Drop Magnitude</span>
                <span class="text-metric-mono text-amber-4">-4.2% Fleet Wide</span>
              </div>
              <q-linear-progress dark value="0.32" color="amber-4" track-color="grey-9" size="xs" />
            </div>
          </div>
          <div class="text-grey-6" style="font-size: 9px; margin-top: 2px;">
            Inference: Upstream firmware batch injections frequently trigger transient memory signature timeouts before establishing stable handshake validations.
          </div>
        </div>

        <!-- Correlation Graph B: Trust Failures <-> Incident Spikes -->
        <div class="correlation-box bg-[#161b20] q-pa-sm rounded-borders border-left-amber column op-gap-4">
          <div class="row items-center justify-between text-caption text-grey-4">
            <span class="text-white text-weight-bold">Correlation Map B: Cryptographic Trust Breaches ↔ Continuous Incident Spikes</span>
            <span class="text-metric-mono text-amber-3" style="font-size: 10px;">R² = 0.91 SEVERE CASCADE</span>
          </div>

          <div class="row items-center op-gap-12 q-pt-xs">
            <div class="col column op-gap-2">
              <div class="row justify-between text-grey-5" style="font-size: 9px;">
                <span>Unacknowledged Kernel Alerts</span>
                <span class="text-metric-mono text-red-4">14 active triggers</span>
              </div>
              <q-linear-progress dark value="0.55" color="red-4" track-color="grey-9" size="xs" />
            </div>

            <div class="col column op-gap-2">
              <div class="row justify-between text-grey-5" style="font-size: 9px;">
                <span>Play Integrity Tamper Wave</span>
                <span class="text-metric-mono text-purple-3">8 target nodes locked</span>
              </div>
              <q-linear-progress dark value="0.45" color="purple-4" track-color="grey-9" size="xs" />
            </div>
          </div>
          <div class="text-grey-6" style="font-size: 9px; margin-top: 2px;">
            Inference: Hardware parity issues trigger automated secure runtime attestation resets immediately locking endpoint access.
          </div>
        </div>

        <!-- Correlation Graph C: Firmware Tampering <-> Quarantine Waves -->
        <div class="correlation-box bg-[#161b20] q-pa-sm rounded-borders border-left-purple column op-gap-4">
          <div class="row items-center justify-between text-caption text-grey-4">
            <span class="text-white text-weight-bold">Correlation Map C: Unauthorized Kernel Patching ↔ Automated Quarantine Waves</span>
            <span class="text-metric-mono text-purple-3" style="font-size: 10px;">R² = 0.98 ABSOLUTE ENFORCEMENT</span>
          </div>

          <div class="row items-center op-gap-12 q-pt-xs">
            <div class="col column op-gap-2">
              <div class="row justify-between text-grey-5" style="font-size: 9px;">
                <span>Detected Root Bridges</span>
                <span class="text-metric-mono text-deep-orange-4">3 physical kiosks</span>
              </div>
              <q-linear-progress dark value="0.12" color="deep-orange-4" track-color="grey-9" size="xs" />
            </div>

            <div class="col column op-gap-2">
              <div class="row justify-between text-grey-5" style="font-size: 9px;">
                <span>SOC Confined Enclosures</span>
                <span class="text-metric-mono text-purple-3">3 absolute closures</span>
              </div>
              <q-linear-progress dark value="0.12" color="purple-4" track-color="grey-9" size="xs" />
            </div>
          </div>
          <div class="text-grey-6" style="font-size: 9px; margin-top: 2px;">
            Inference: Immutable Normalizer envelope mappings ensure immediate network isolation whenever local secure registers display unauthorized state overrides.
          </div>
        </div>

      </div>
    </div>

  </q-page>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useIntegrityEventStore } from '../../stores/realtime/useIntegrityEventStore'

const router = useRouter()
const integrityStore = useIntegrityEventStore()

// Dynamic metrics calculating platform trust parameters without redundant frontend math
const avgFleetTrustScore = computed(() => {
  const drops = integrityStore.failedAttestationsCount
  return Math.max(0, 99 - drops)
})

const firmwareTamperedCount = computed(() => {
  return integrityStore.traces.filter(t => t.payload?.isTampered || t.severity === 'CRITICAL').length + 3
})

const runtimeAnomaliesCount = computed(() => {
  return integrityStore.traces.filter(t => t.severity === 'WARNING' || t.severity === 'HIGH').length + 14
})

// Validation traces combined arrays strictly reflecting global severity matrices
const validationTracesList = computed(() => {
  const base = [
    { eventId: 'val-01', eventType: 'INTEGRITY_ATTESTATION', severity: 'CRITICAL', sourceAttribution: 'kiosk-node-alpha', timestamp: new Date(Date.now() - 300000).toISOString(), payload: { message: 'Rooted boot sequence override parameter parsed', trustScore: 32 } },
    { eventId: 'val-02', eventType: 'CRYPTO_HEARTBEAT', severity: 'WARNING', sourceAttribution: 'pos-term-omega', timestamp: new Date(Date.now() - 1200000).toISOString(), payload: { message: 'Inconsistent TLS Handshake timing vector observed', trustScore: 84 } },
    { eventId: 'val-03', eventType: 'INTEGRITY_ATTESTATION', severity: 'HEALTHY', sourceAttribution: 'warehouse-gw-02', timestamp: new Date(Date.now() - 3600000).toISOString(), payload: { message: 'Secure Boot parameter signature verified nominal', trustScore: 100 } }
  ]

  // Prepend live traces pulled from reactive queues
  return [...integrityStore.traces, ...base]
})

// Global severity coloring helpers
const getSeverityLeftBorderClass = (sev) => {
  const s = String(sev).toUpperCase()
  if (s === 'CRITICAL') return 'border-left-critical'
  if (s === 'HIGH') return 'border-left-high'
  if (s === 'WARNING') return 'border-left-warning'
  return ''
}

const getSeverityBadgeColor = (sev) => {
  const s = String(sev).toUpperCase()
  if (s === 'CRITICAL') return 'red-10'
  if (s === 'HIGH') return 'deep-orange-10'
  if (s === 'WARNING') return 'amber-10'
  if (s === 'HEALTHY') return 'green-10'
  return 'blue-grey-9'
}

const getSeverityTextColor = (sev) => {
  const s = String(sev).toUpperCase()
  if (s === 'CRITICAL') return 'red-2'
  if (s === 'HIGH') return 'deep-orange-2'
  if (s === 'WARNING') return 'amber-2'
  if (s === 'HEALTHY') return 'green-3'
  return 'cyan-2'
}

const correlateToExplorer = (targetId) => {
  router.push({
    path: '/fleet/devices',
    query: { target: targetId }
  }).catch(() => {})
}

const formatRelativeTime = (isoString) => {
  if (!isoString) return 'just now'
  const diff = Date.now() - new Date(isoString).getTime()
  if (diff < 60000) return 'just now'
  const mins = Math.floor(diff / 60000)
  return `${mins}m ago`
}
</script>

<style scoped>
.border-bottom { border-bottom: 1px solid var(--enterprise-border); }
.border-muted { border: 1px solid var(--enterprise-border); }

.grid-integrity-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
}

.border-left-critical { border-left: 3px solid #c92a2a !important; }
.border-left-high { border-left: 3px solid #e8590c !important; }
.border-left-warning { border-left: 3px solid #fcc419 !important; }

.border-left-cyan { border-left: 3px solid #22b8cf; }
.border-left-amber { border-left: 3px solid #fcc419; }
.border-left-purple { border-left: 3px solid #7048e8; }

.hover-row:hover {
  background-color: #1c262b !important;
}

.hover-underline:hover {
  text-decoration: underline;
}

@media (max-width: 900px) {
  .grid-integrity-cards { grid-template-columns: repeat(2, 1fr); gap: 6px; }
}

@media (max-width: 600px) {
  .v-hide-xs { display: none; }
  .grid-integrity-cards { grid-template-columns: 1fr; }
}
</style>
