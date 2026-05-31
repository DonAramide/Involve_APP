<!-- invify-admin/src/pages/deployments/ReleaseChannelsPage.vue -->
<template>
  <q-page class="bg-main text-main q-pa-md column op-gap-16">
    
    <!-- Title Line -->
    <div class="row items-center justify-between no-wrap border-bottom q-pb-sm">
      <div class="row items-center op-gap-8 no-wrap">
        <q-icon name="alt_route" size="sm" color="cyan-3" />
        <div>
          <div class="row items-center op-gap-4">
            <div class="text-operator-title text-main text-weight-bold" style="font-size: 14px;">Mode-Based Release Channel Governance</div>
            <EnterpriseManualTooltip 
              title="Release Channel Governance" 
              description="Governance hub for software distribution. Manages bundle graduation from engineering labs through canary groups to the global stable fleet."
            />
          </div>
          <div class="text-metric-mono text-muted" style="font-size: 10px;">PROMOTION_WORKFLOWS // DRIFT_DETECTION_MATRIX</div>
        </div>
      </div>
      
      <!-- Mode Visibility Filter -->
      <div class="row items-center op-gap-8 no-wrap text-caption text-muted">
        <span class="v-hide-xs">Inheritance Filter:</span>
        <q-chip dense size="xs" color="cyan-10" text-color="cyan-2" class="text-weight-bold">
          MODE ISOLATED
        </q-chip>
      </div>
    </div>

    <!-- UPPER ROW: 5 Enterprise Release Channels -->
    <div class="grid-channels op-gap-8">
      
      <!-- 1. Stable -->
      <div class="channel-card bg-panel-darker border-muted rounded-borders q-pa-sm column justify-between border-top-stable">
        <div class="row items-center justify-between text-caption text-muted">
          <span class="text-weight-bold text-green-4">STABLE CHANNEL</span>
          <q-icon name="verified" size="xs" color="green-4" />
        </div>
        <div class="q-mt-xs">
          <div class="text-metric-mono text-main text-weight-bold" style="font-size: 16px;">v2.4.1-Cert</div>
          <div class="text-muted" style="font-size: 10px;">Assigned: <span class="text-main text-weight-bold">88.4%</span> Fleet</div>
        </div>
        <div class="row justify-between text-grey-6 border-top q-pt-xs q-mt-xs" style="font-size: 9px;">
          <span>SLA Hold: 0d</span>
          <span class="text-green-4">Certified Stable</span>
        </div>
      </div>

      <!-- 2. Beta -->
      <div class="channel-card bg-panel-darker border-muted rounded-borders q-pa-sm column justify-between border-top-beta">
        <div class="row items-center justify-between text-caption text-muted">
          <span class="text-weight-bold text-cyan-3">BETA CHANNEL</span>
          <q-icon name="science" size="xs" color="cyan-3" />
        </div>
        <div class="q-mt-xs">
          <div class="text-metric-mono text-main text-weight-bold" style="font-size: 16px;">v2.5.0-rc1</div>
          <div class="text-muted" style="font-size: 10px;">Assigned: <span class="text-main text-weight-bold">8.2%</span> Fleet</div>
        </div>
        <div class="row justify-between text-grey-6 border-top q-pt-xs q-mt-xs" style="font-size: 9px;">
          <span>SLA Hold: 3d</span>
          <span class="text-cyan-3">Inherit Active</span>
        </div>
      </div>

      <!-- 3. Canary -->
      <div class="channel-card bg-panel-darker border-muted rounded-borders q-pa-sm column justify-between border-top-canary">
        <div class="row items-center justify-between text-caption text-muted">
          <span class="text-weight-bold text-amber-4">CANARY CHANNEL</span>
          <q-icon name="pets" size="xs" color="amber-4" />
        </div>
        <div class="q-mt-xs">
          <div class="text-metric-mono text-main text-weight-bold" style="font-size: 16px;">v2.6.0-w1</div>
          <div class="text-muted" style="font-size: 10px;">Assigned: <span class="text-main text-weight-bold">2.1%</span> Fleet</div>
        </div>
        <div class="row justify-between text-grey-6 border-top q-pt-xs q-mt-xs" style="font-size: 9px;">
          <span>SLA Hold: 7d</span>
          <span class="text-amber-4">Pacing Canary</span>
        </div>
      </div>

      <!-- 4. Internal -->
      <div class="channel-card bg-panel-darker border-muted rounded-borders q-pa-sm column justify-between border-top-internal">
        <div class="row items-center justify-between text-caption text-muted">
          <span class="text-weight-bold text-purple-4">INTERNAL CHANNEL</span>
          <q-icon name="badge" size="xs" color="purple-4" />
        </div>
        <div class="q-mt-xs">
          <div class="text-metric-mono text-main text-weight-bold" style="font-size: 16px;">v3.0.0-dev</div>
          <div class="text-muted" style="font-size: 10px;">Assigned: <span class="text-main text-weight-bold">1.0%</span> Fleet</div>
        </div>
        <div class="row justify-between text-grey-6 border-top q-pt-xs q-mt-xs" style="font-size: 9px;">
          <span>SLA Hold: N/A</span>
          <span class="text-purple-3">Engineering Only</span>
        </div>
      </div>

      <!-- 5. Emergency -->
      <div class="channel-card bg-panel-darker border-muted rounded-borders q-pa-sm column justify-between border-top-emergency">
        <div class="row items-center justify-between text-caption text-muted">
          <span class="text-weight-bold text-red-5">EMERGENCY CHANNEL</span>
          <q-icon name="warning" size="xs" color="red-5" />
        </div>
        <div class="q-mt-xs">
          <div class="text-metric-mono text-main text-weight-bold" style="font-size: 16px;">v2.4.2-hotfix</div>
          <div class="text-muted" style="font-size: 10px;">Assigned: <span class="text-main text-weight-bold">0.3%</span> Fleet</div>
        </div>
        <div class="row justify-between text-grey-6 border-top q-pt-xs q-mt-xs" style="font-size: 9px;">
          <span>SLA Hold: 0d</span>
          <span class="text-red-4">Rollback Bypass</span>
        </div>
      </div>

    </div>

    <!-- MIDDLE ROW: Device Group Mapping Matrix AND Drift Detection Matrix -->
    <div class="row items-stretch q-col-gutter-md">
      
      <!-- Left Split: Device Group Channel Assignment Mapping -->
      <div class="col-12 col-lg-6 column">
        <div class="enterprise-panel bg-panel rounded-borders column fit no-shadow border-muted">
          <div class="panel-header bg-subpanel q-px-sm q-py-xs border-bottom row items-center justify-between">
            <div class="row items-center op-gap-4 no-wrap">
              <q-icon name="device_hub" size="xs" color="cyan-3" />
              <span class="text-operator-title text-main text-weight-bold">Mode Scope Channel Assignments</span>
            </div>
            <span class="text-metric-mono text-cyan-3" style="font-size: 10px;">{{ modeMappings.length }} GROUPS MAPPED</span>
          </div>

          <div class="panel-body q-pa-xs overflow-y-auto" style="max-height: 250px;">
            <q-list dense class="q-gutter-y-xs">
              <q-item 
                v-for="m in modeMappings" 
                :key="m.id" 
                class="q-px-sm q-py-xs bg-panel-darker rounded-borders row items-center justify-between no-wrap hover-row"
                style="border-left: 2px solid var(--enterprise-border);"
              >
                <!-- Left: Mode Group & Scope -->
                <div class="col-5 column op-gap-2">
                  <div class="row items-center op-gap-8 no-wrap">
                    <span class="text-main text-weight-bold text-caption">{{ m.modeName }}</span>
                    <q-badge color="blue-grey-9" text-color="cyan-3" class="text-metric-sm">
                      Nodes: {{ m.nodeCount }}
                    </q-badge>
                  </div>
                  <div class="text-muted ellipsis" style="font-size: 11px;">
                    Mode Scope: <span class="text-white">{{ m.modeScope }}</span>
                  </div>
                </div>

                <!-- Right: Channel Assignment Dropdown -->
                <div class="col-7 row items-center justify-end op-gap-8">
                  <div class="text-secondary text-caption v-hide-xs" style="font-size: 10px;">Enforced Track:</div>
                  <q-select
                    v-model="m.assignedChannel"
                    :options="['Stable', 'Beta', 'Canary', 'Internal']"
                    dense
                    :dark="prefs.isDarkMode"
                    filled
                    options-dense
                    class="bg-subpanel text-caption"
                    style="width: 120px;"
                    @update:model-value="notifyMappingChange(m)"
                  />
                </div>
              </q-item>
            </q-list>
          </div>
        </div>
      </div>

      <!-- Right Split: Release Channel Drift Detection Matrix -->
      <div class="col-12 col-lg-6 column">
        <div class="enterprise-panel bg-panel rounded-borders column fit no-shadow border-muted">
          <div class="panel-header bg-subpanel q-px-sm q-py-xs border-bottom row items-center justify-between">
            <div class="row items-center op-gap-4 no-wrap">
              <q-icon name="find_in_page" size="xs" color="amber-4" />
              <span class="text-operator-title text-main text-weight-bold">Drift Detection Intelligence Matrix</span>
            </div>
            <span class="text-metric-mono text-amber-3" style="font-size: 10px;">{{ driftViolationsList.length }} EXCEPTIONS</span>
          </div>

          <div class="panel-body q-pa-xs overflow-y-auto" style="max-height: 250px;">
            <q-list dense class="q-gutter-y-xs">
              <q-item 
                v-for="d in driftViolationsList" 
                :key="d.id" 
                class="q-px-sm q-py-xs bg-panel-darker rounded-borders row items-center justify-between no-wrap border-left-drift hover-row"
              >
                <!-- Left: Violation Class & Description -->
                <div class="col-6 column op-gap-2">
                  <div class="row items-center op-gap-8 no-wrap">
                    <span class="text-main text-weight-bold text-caption ellipsis">{{ d.exceptionType }}</span>
                  </div>
                  <div class="text-amber-3 ellipsis" style="font-size: 11px;">
                    {{ d.description }}
                  </div>
                  <div class="text-secondary text-caption q-mt-xs" style="font-size: 10px;">
                    Target: <span class="text-metric-mono text-main">{{ d.tenantScope }}</span>
                  </div>
                </div>

                <!-- Right Actions: Expected vs Observed -->
                <div class="col-6 column justify-center items-end">
                  <div class="row items-center justify-end op-gap-4 text-grey-6" style="font-size: 10px;">
                    <span>Found: <span class="text-metric-mono text-red-4">{{ d.observedState }}</span></span>
                    <span>|</span>
                    <span>Need: <span class="text-metric-mono text-green-4">{{ d.expectedState }}</span></span>
                  </div>
                  <q-btn 
                    dense 
                    size="xs" 
                    color="amber-5" 
                    text-color="black" 
                    label="Force Sync" 
                    @click="realignChannelDrift(d.id)" 
                    class="q-px-xs text-weight-bold q-mt-xs" 
                  />
                </div>
              </q-item>
            </q-list>
          </div>
        </div>
      </div>
    </div>

    <!-- LOWER ROW: Phase 3 — Embedded Deployment Health Intelligence -->
    <div class="enterprise-panel bg-panel rounded-borders column fit justify-between no-shadow">
      <div class="panel-header bg-subpanel q-px-sm q-py-xs border-bottom row items-center justify-between">
        <div class="row items-center op-gap-4 no-wrap">
          <q-icon name="monitor_heart" size="xs" color="cyan-3" />
          <span class="text-operator-title text-main text-weight-bold">Deployment Health Intelligence & Convergence Metrics</span>
          <EnterpriseManualTooltip 
            title="Deployment Health Intelligence" 
            description="Aggregated real-time health signals from active rollouts. Tracks crash spikes, checksum failures, and total fleet convergence success ratios."
          />
        </div>
        <div class="row items-center op-gap-8 no-wrap text-caption text-secondary">
          <span>Continuous store stream engine sync: <span class="text-green-5 text-weight-bold">ACTIVE</span></span>
        </div>
      </div>

      <div class="panel-body q-pa-md column op-gap-16">
        
        <!-- TOP NUMERIC INDICATOR ROW -->
        <div class="row items-center justify-between text-center bg-panel-darker q-pa-sm rounded-borders border-muted">
          
          <div class="col column">
            <span class="text-metric-mono text-green-4 text-weight-bold" style="font-size: 18px;">99.4%</span>
            <span class="text-caption text-muted" style="font-size: 10px;">Success Convergence</span>
          </div>

          <div class="col column border-left">
            <span class="text-metric-mono text-weight-bold" :class="crashSpikeDetected ? 'text-red-5' : 'text-main'" style="font-size: 18px;">
              {{ crashSpikeDetected ? '0.84% SPIKE' : '0.02% Nominal' }}
            </span>
            <span class="text-caption text-muted" style="font-size: 10px;">Crash Spike Index</span>
          </div>

          <div class="col column border-left">
            <span class="text-metric-mono text-cyan-3 text-weight-bold" style="font-size: 18px;">0.00%</span>
            <span class="text-caption text-muted" style="font-size: 10px;">Integrity Regressions</span>
          </div>

          <div class="col column border-left">
            <span class="text-metric-mono text-amber-4 text-weight-bold" style="font-size: 18px;">{{ rolloutStore.activeRollbacksCount }}</span>
            <span class="text-caption text-muted" style="font-size: 10px;">Degraded Subfleets</span>
          </div>

          <div class="col column border-left">
            <span class="text-metric-mono text-main text-weight-bold" style="font-size: 18px;">12.4 eps</span>
            <span class="text-caption text-muted" style="font-size: 10px;">OTA Feedback Loop</span>
          </div>

        </div>

        <!-- TWO VISUAL SECTOR PANELS -->
        <div class="row items-stretch op-gap-16">
          
          <!-- Sector 1: Package Promotion Workflows -->
          <div class="col-12 col-md-6 bg-subpanel q-pa-sm rounded-borders border-muted column justify-between">
            <div>
              <div class="text-main text-weight-bold text-caption q-mb-xs">Package Graduation Lifecycles</div>
              <div class="text-muted" style="font-size: 10px;">
                Staged progression pipelines mapping candidate bundles upwards across active stream tracks:
              </div>
            </div>

            <!-- Promotion Array Steps -->
            <div class="column op-gap-4 q-mt-sm">
              <div class="row items-center justify-between text-metric-sm bg-panel-darker q-pa-xs rounded-borders">
                <span class="text-purple-3">Internal [v2.6.0-dev]</span>
                <q-icon name="arrow_forward" size="xs" color="grey-6" />
                <span class="text-amber-4">Canary [v2.6.0-w1]</span>
                <q-btn dense flat size="xs" color="cyan-3" label="Promote" @click="triggerPromotion('Canary')" class="bg-[#1e2429] q-px-xs" />
              </div>

              <div class="row items-center justify-between text-metric-sm bg-panel-darker q-pa-xs rounded-borders">
                <span class="text-amber-4">Canary [v2.5.0-w4]</span>
                <q-icon name="arrow_forward" size="xs" color="grey-6" />
                <span class="text-cyan-3">Beta [v2.5.0-rc1]</span>
                <q-btn dense flat size="xs" color="cyan-3" label="Promote" @click="triggerPromotion('Beta')" class="bg-[#1e2429] q-px-xs" />
              </div>

              <div class="row items-center justify-between text-metric-sm bg-panel-darker q-pa-xs rounded-borders">
                <span class="text-cyan-3">Beta [v2.4.1-rc3]</span>
                <q-icon name="arrow_forward" size="xs" color="grey-6" />
                <span class="text-green-4">Stable [v2.4.1-Cert]</span>
                <q-chip dense size="xs" color="green-10" text-color="green-3" class="text-metric-sm">GRADUATED</q-chip>
              </div>
            </div>
          </div>

          <!-- Sector 2: Real-time Convergence Trajectory Maps -->
          <div class="col-12 col-md-6 bg-subpanel q-pa-sm rounded-borders border-muted column justify-between">
            <div>
              <div class="text-main text-weight-bold text-caption q-mb-xs">Continuous Convergence & Failure Analytics</div>
              <div class="text-muted" style="font-size: 10px;">
                Fleet wide OTA installation consistency distributions tracked over active lifecycle buffers:
              </div>
            </div>

            <!-- Simulated high-fidelity comparative convergence progress map -->
            <div class="column op-gap-6 q-mt-sm">
              <div>
                <div class="row justify-between text-metric-sm text-secondary q-mb-xs" style="font-size: 10px;">
                  <span>Installation Handshake Success Ratios</span>
                  <span class="text-metric-mono text-green-4 text-weight-bold">99.4% Converged</span>
                </div>
                <q-linear-progress :dark="prefs.isDarkMode" value="0.994" color="green-4" track-color="grey-9" size="xs" />
              </div>
 
              <div>
                <div class="row justify-between text-metric-sm text-secondary q-mb-xs" style="font-size: 10px;">
                  <span>Transient Package Checksum Re-attempts</span>
                  <span class="text-metric-mono text-amber-4">0.4% Retrying</span>
                </div>
                <q-linear-progress :dark="prefs.isDarkMode" value="0.004" color="amber-4" track-color="grey-9" size="xs" />
              </div>
 
              <div>
                <div class="row justify-between text-metric-sm text-secondary q-mb-xs" style="font-size: 10px;">
                  <span>Irrecoverable Rollback Executions</span>
                  <span class="text-metric-mono text-red-4">0.2% Terminated</span>
                </div>
                <q-linear-progress :dark="prefs.isDarkMode" value="0.002" color="red-5" track-color="grey-9" size="xs" />
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>

  </q-page>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRolloutEventStore } from '../../stores/realtime/useRolloutEventStore'
import { operationalEventBusSingleton } from '../../services/realtime/OperationalEventBus'
import { useOperatorPreferences } from '../../composables/useOperatorPreferences'
import EnterpriseManualTooltip from '../../components/common/EnterpriseManualTooltip.vue'
import { Notify } from 'quasar'

const { prefs } = useOperatorPreferences()
const rolloutStore = useRolloutEventStore()

// Simulated crash spike parameters
const crashSpikeDetected = computed(() => rolloutStore.activeRollbacksCount > 0)

// Mode Scope Channel Assignment Data
const modeMappings = ref([
  { id: 'm-1', modeName: 'Alpha Retail Nodes', modeScope: 'retail', nodeCount: 150, assignedChannel: 'Canary' },
  { id: 'm-2', modeName: 'Standard POS Sector', modeScope: 'retail', nodeCount: 82000, assignedChannel: 'Stable' },
  { id: 'm-3', modeName: 'Logistics Scanners', modeScope: 'service', nodeCount: 4100, assignedChannel: 'Beta' },
  { id: 'm-4', modeName: 'Core Edu Tablets', modeScope: 'school', nodeCount: 12500, assignedChannel: 'Stable' },
  { id: 'm-5', modeName: 'Global IT Testing', modeScope: 'global', nodeCount: 50, assignedChannel: 'Internal' }
])

const notifyMappingChange = (mapping) => {
  console.log(`[ChannelManager] Updated enforced track for ${mapping.modeName} to ${mapping.assignedChannel}`)
  Notify.create({
    type: 'positive',
    message: `Updated Enforced Track for ${mapping.modeName} to [${mapping.assignedChannel}]`,
    position: 'bottom-right'
  })
}

// 1. FINAL REFINEMENT #3: Release Channel Drift Detection Violations array
const driftViolationsList = ref([
  { id: 'drift-ch-01', exceptionType: 'EMERGENCY_CHANNEL_LEAKAGE', severity: 'CRITICAL', description: 'Standard consumer kiosk bridge loaded unauthorized emergency channel debug signature', tenantScope: 'tenant-alpha', observedState: 'v2.4.2-hotfix', expectedState: 'v2.4.1-Cert', durationStr: '14m ago' },
  { id: 'drift-ch-02', exceptionType: 'STALE_ROLLOUT_COHORT', severity: 'HIGH', description: 'Stale target hardware identifiers persisting on legacy canary testing instructions', tenantScope: 'retail_sector_omega', observedState: 'v2.3.0-legacy', expectedState: 'v2.4.1-Cert', durationStr: '2d ago' },
  { id: 'drift-ch-03', exceptionType: 'UNAUTHORIZED_DOWNGRADE', severity: 'CRITICAL', description: 'Local user permission bypass executed absolute software image fallback profile', tenantScope: 'tenant-beta', observedState: 'v2.2.4-Old', expectedState: 'v2.5.0-rc1', durationStr: '4h ago' },
  { id: 'drift-ch-04', exceptionType: 'INHERITANCE_INCONSISTENCY', severity: 'WARNING', description: 'Downstream tenant partition scope missing active beta promotion registry synchronization', tenantScope: 'tenant-gamma', observedState: 'v2.4.1-Cert', expectedState: 'v2.5.0-rc1', durationStr: '1d ago' }
])

const realignChannelDrift = (driftId) => {
  const target = driftViolationsList.value.find(d => d.id === driftId)
  if (target) {
    console.log(`[ChannelManager] Dispatching Force Realignment synchronization command targeting exception: ${driftId}`)
    
    // Broadcast auditable message upward
    operationalEventBusSingleton.emitUpstream('FORCE_CHANNEL_REALIGNMENT', {
      targetDriftId: driftId,
      targetScope: target.tenantScope,
      enforcedChannelImage: target.expectedState,
      timestamp: new Date().toISOString()
    })

    Notify.create({
      type: 'positive',
      message: `Realignment sync payload broadcast successfully targeting exception matrix`,
      position: 'bottom-right'
    })

    // Filter out optimistically
    driftViolationsList.value = driftViolationsList.value.filter(d => d.id !== driftId)
  }
}

// Promotion action triggers
const triggerPromotion = (channelTarget) => {
  console.log(`[ChannelManager] Emitting package graduation update targeting channel: ${channelTarget}`)
  
  operationalEventBusSingleton.emitUpstream('PROMOTE_RELEASE_CHANNEL_BUNDLE', {
    targetChannel: channelTarget,
    timestamp: new Date().toISOString(),
    operatorStr: 'sysadmin@IIPS.app'
  })

  Notify.create({
    type: 'info',
    message: `Package graduation requested targeting track [${channelTarget}]`,
    position: 'bottom-right'
  })
}
</script>

<style scoped>
.border-bottom { border-bottom: 1px solid var(--enterprise-border); }
.border-top { border-top: 1px solid var(--enterprise-border); }
.border-left { border-left: 1px solid var(--enterprise-border); }
.border-muted { border: 1px solid var(--enterprise-border); }

.grid-channels {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
}

.channel-card {
  min-height: 104px;
}

.border-top-stable { border-top: 2px solid #2b8a3e; }
.border-top-beta { border-top: 2px solid #22b8cf; }
.border-top-canary { border-top: 2px solid #fab005; }
.border-top-internal { border-top: 2px solid #862e9c; }
.border-top-emergency { border-top: 2px solid #f03e3e; }

.border-left-drift { border-left: 3px solid #e8590c; }

.hover-row:hover {
  background-color: var(--enterprise-subpanel-bg) !important;
}

@media (max-width: 900px) {
  .grid-channels { grid-template-columns: repeat(3, 1fr); gap: 6px; }
}

@media (max-width: 600px) {
  .v-hide-xs { display: none; }
  .grid-channels { grid-template-columns: repeat(2, 1fr); }
}
</style>
