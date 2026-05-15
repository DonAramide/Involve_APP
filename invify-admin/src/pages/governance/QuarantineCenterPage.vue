<!-- invify-admin/src/pages/governance/QuarantineCenterPage.vue -->
<template>
  <q-page class="bg-[#0b0f12] text-[#e1e7ec] q-pa-md column op-gap-16">
    
    <!-- Top Telemetry & Control Strip -->
    <div class="row items-center justify-between no-wrap border-bottom q-pb-sm">
      <div class="row items-center op-gap-8 no-wrap">
        <q-icon name="gpp_maybe" size="sm" color="purple-4" />
        <div>
          <div class="text-operator-title text-white text-weight-bold" style="font-size: 14px;">SOC Quarantine Governance & Remediation Hub</div>
          <div class="text-metric-mono text-grey-5" style="font-size: 10px;">SECURE_CONFINEMENT // AUDITED_TRUST_RESTORATION</div>
        </div>
      </div>
      
      <!-- Quick Status Counter -->
      <div class="row items-center op-gap-8 no-wrap text-caption text-grey-5">
        <span>Confined Sector Target:</span>
        <q-chip dense size="xs" color="purple-10" text-color="purple-2" class="text-weight-bold">
          {{ quarantinedEndpointsList.length }} RESTRICTED VECTORS
        </q-chip>
      </div>
    </div>

    <!-- UPPER ROW: FINAL REFINEMENT #4: Autonomous Remediation Readiness Engine Toggles -->
    <div class="panel-card bg-[#12161a] border-muted rounded-borders column fit">
      <div class="panel-header bg-[#161b20] q-px-sm q-py-xs border-bottom row items-center justify-between">
        <div class="row items-center op-gap-4 no-wrap">
          <q-icon name="auto_mode" size="xs" color="cyan-3" />
          <span class="text-operator-title text-white text-weight-bold">Autonomous Remediation Readiness Control Pipelines</span>
        </div>
        <span class="text-metric-mono text-cyan-3" style="font-size: 10px;">ZERO-TOUCH RECOVERY PRE-WARMING</span>
      </div>

      <div class="panel-body q-pa-sm row items-center justify-between op-gap-16">
        <div class="col-12 col-md-3 column op-gap-2">
          <div class="row items-center justify-between text-caption text-white text-weight-medium">
            <span>Automated Fallback Rollback</span>
            <q-toggle v-model="autoRemediationConfig.rollback" dense dark color="cyan-4" size="xs" />
          </div>
          <span class="text-grey-6" style="font-size: 9px;">Forces previous certified stable firmware image instantly upon critical verification drops.</span>
        </div>

        <div class="col-12 col-md-3 column op-gap-2 border-left q-pl-sm">
          <div class="row items-center justify-between text-caption text-white text-weight-medium">
            <span>Policy Auto-Repair</span>
            <q-toggle v-model="autoRemediationConfig.policyRepair" dense dark color="cyan-4" size="xs" />
          </div>
          <span class="text-grey-6" style="font-size: 9px;">Re-evaluates local configuration overrides automatically against pristine parent baseline hashes.</span>
        </div>

        <div class="col-12 col-md-3 column op-gap-2 border-left q-pl-sm">
          <div class="row items-center justify-between text-caption text-white text-weight-medium">
            <span>Staged Self-Revalidation</span>
            <q-toggle v-model="autoRemediationConfig.stagedReval" dense dark color="cyan-4" size="xs" />
          </div>
          <span class="text-grey-6" style="font-size: 9px;">Performs phased canary attestation checks over sliding timing horizons before lifting restrictions.</span>
        </div>

        <div class="col-12 col-md-3 column op-gap-2 border-left q-pl-sm">
          <div class="row items-center justify-between text-caption text-white text-weight-medium">
            <span>Autonomous Release Engine</span>
            <q-toggle v-model="autoRemediationConfig.autoRelease" dense dark color="purple-4" size="xs" />
          </div>
          <span class="text-grey-6" style="font-size: 9px;">Evaluates recovered telemetry streams securely without hardcoded manual intervention blocks.</span>
        </div>
      </div>
    </div>

    <!-- MAIN GRID: Quarantined Endpoints Array complete with Duration Trackers -->
    <div class="panel-card bg-[#12161a] border-muted rounded-borders column col fit">
      <div class="panel-header bg-[#161b20] q-px-sm q-py-xs border-bottom row items-center justify-between">
        <div class="row items-center op-gap-4 no-wrap">
          <q-icon name="lock" size="xs" color="red-4" />
          <span class="text-operator-title text-white text-weight-bold">Active Isolated Hardware List</span>
        </div>
        <span class="text-metric-mono text-grey-5" style="font-size: 10px;">IMMUTABLE DURATION COUNTERS</span>
      </div>

      <!-- High-Density Virtual Table Structure -->
      <div class="panel-body col q-pa-xs overflow-y-auto" style="max-height: 380px;">
        <q-list dense class="q-gutter-y-xs">
          <q-item 
            v-for="q in quarantinedEndpointsList" 
            :key="q.targetId" 
            class="q-px-sm q-py-xs bg-[#1a1414] rounded-borders row items-center justify-between no-wrap border-left-critical hover-row"
          >
            <!-- Left Details: ID, Tenant, App Package Vector -->
            <div class="col-4 column op-gap-2 overflow-hidden">
              <div class="row items-center op-gap-8 no-wrap">
                <span class="text-white text-weight-bold text-caption ellipsis">{{ q.targetId }}</span>
                <q-badge color="red-10" text-color="red-2" class="text-metric-sm">
                  Trust: {{ q.trustScore }}%
                </q-badge>
              </div>
              <div class="text-grey-5" style="font-size: 10px;">
                Tenant Scope: <span class="text-metric-mono text-grey-3">{{ q.tenant }}</span>
              </div>
              <div class="text-grey-6 ellipsis" style="font-size: 9px;">
                Vector: {{ q.appPackage || 'com.iips.core' }}
              </div>
              <div class="text-cyan-6 text-metric-mono" style="font-size: 9px;" v-if="q.latitude">
                Loc: {{ q.latitude }}, {{ q.longitude }}
              </div>
            </div>

            <!-- Middle Portion: Attestation Failure Reason & Ingestion Timestamp -->
            <div class="col-5 q-px-sm column justify-center">
              <div class="text-red-3 text-weight-medium" style="font-size: 11px;">
                Violation Reason: {{ q.reason }}
              </div>
              <div class="row items-center op-gap-8 text-grey-6 q-mt-xs" style="font-size: 10px;">
                <span>Locked At: <span class="text-metric-mono text-grey-4">{{ q.lockedTimestamp }}</span></span>
                <span>•</span>
                <span>Active Duration: <span class="text-metric-mono text-amber-3 text-weight-bold">{{ q.durationStr }}</span></span>
              </div>
            </div>

            <!-- Right Actions: Review / Trust Restoration Release Flow -->
            <div class="col-3 row items-center justify-end op-gap-4">
              <q-btn 
                dense 
                flat 
                size="xs" 
                color="cyan-3" 
                label="Trace Logs" 
                @click="inspectQuarantineTraces(q)" 
                class="bg-[#24221d] q-px-xs text-metric-sm" 
              />
              <q-btn 
                dense 
                size="xs" 
                color="purple-10" 
                text-color="purple-2" 
                label="Authorize Release" 
                @click="promptReleaseAuthorizationGate(q)" 
                class="q-px-sm text-weight-bold" 
              />
            </div>
          </q-item>
        </q-list>
      </div>

      <!-- Footer Info Bar -->
      <div class="panel-footer bg-[#161b20] q-pa-xs border-top text-center text-caption text-grey-6" style="font-size: 10px;">
        Quarantine containment guarantees complete external layer termination. Restored bridges enforce strict cryptographic handshakes.
      </div>
    </div>

    <!-- REASON-GATED TRUST RESTORATION RELEASE DIALOG -->
    <q-dialog v-model="releaseGateOpen" persistent>
      <q-card class="bg-[#12161a] text-[#e1e7ec] border-muted" style="min-width: 420px;">
        <q-card-section class="bg-[#1b1515] border-bottom row items-center op-gap-8">
          <q-icon name="how_to_reg" color="purple-4" size="sm" />
          <div>
            <div class="text-white text-weight-bold text-caption">Trust Restoration Authorization Gate</div>
            <div class="text-metric-sm text-purple-3">Target Instance: {{ pendingReleaseTarget?.targetId }}</div>
          </div>
        </q-card-section>

        <q-card-section class="column op-gap-12 q-pt-md">
          <div class="text-caption text-grey-4" style="font-size: 11px;">
            Lifting containment profiles mandates validating absolute hardware configuration parity. Please review current cryptographic trust status and input an explicit operator attribution log before final commitment.
          </div>

          <div class="bg-[#161b20] q-pa-sm rounded-borders border-left text-caption text-grey-4" style="font-size: 10px;">
            <div>Original Violation: <span class="text-metric-mono text-red-4">{{ pendingReleaseTarget?.reason }}</span></div>
            <div>Containment Lock Duration: <span class="text-metric-mono text-amber-3">{{ pendingReleaseTarget?.durationStr }}</span></div>
            <div>Target Tenant: <span class="text-metric-mono text-white">{{ pendingReleaseTarget?.tenant }}</span></div>
          </div>

          <!-- Mandatory Reason Input -->
          <q-input
            v-model="releaseReasonText"
            dark
            dense
            filled
            label="Mandatory Operator Remediation Log *"
            placeholder="e.g. Attestation check validated nominal post automated configuration repair"
            class="bg-[#161b20]"
            autofocus
            :rules="[val => !!val || 'Remediation log annotation cannot be null']"
          />
        </q-card-section>

        <q-card-actions align="right" class="bg-[#161b20] border-top q-pa-sm">
          <q-btn flat dense size="sm" color="grey-5" label="Cancel Workflow" v-close-popup @click="resetReleaseGate" />
          <q-btn 
            dense 
            size="sm" 
            color="purple-5" 
            label="Authorize Restoration Release" 
            @click="dispatchTrustRestorationCommand" 
            :disable="!releaseReasonText" 
            class="q-px-sm text-weight-bold"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useGovernanceEventStore } from '../../stores/realtime/useGovernanceEventStore'
import { operationalEventBusSingleton } from '../../services/realtime/OperationalEventBus'
import { Notify } from 'quasar'

const govStore = useGovernanceEventStore()

// 1. FINAL REFINEMENT #4: Autonomous Remediation Readiness Variables
const autoRemediationConfig = ref({
  rollback: true,
  policyRepair: true,
  stagedReval: false,
  autoRelease: false
})

// 2. Active Isolated Endpoints Array combining store entries seamlessly
const quarantinedEndpointsList = computed(() => {
  const base = [
    { targetId: 'dev-node-delta', tenant: 'tenant-alpha', appPackage: 'com.iips.display', reason: 'Attestation trust vectors breached. Secure signature failed.', durationStr: '12m 42s', lockedTimestamp: '10:04:12 AM', trustScore: 32, latitude: '6.6012', longitude: '3.3514' },
    { targetId: 'pos-term-omega-04', tenant: 'tenant-omega', appPackage: 'com.iips.pos', reason: 'Kernel module tampering parameter identified', durationStr: '1h 14m', lockedTimestamp: '08:52:01 AM', trustScore: 12, latitude: '6.4531', longitude: '3.3958' },
    { targetId: 'scanner-gamma-12', tenant: 'tenant-gamma', appPackage: 'com.iips.warehouse', reason: 'Play Integrity secure bridge response sequence expired', durationStr: '4h 02m', lockedTimestamp: '06:05:44 AM', trustScore: 45, latitude: '6.5567', longitude: '3.3421' }
  ]

  // Combine dynamically with Pinia incoming buffers
  const incoming = govStore.quarantineList.map((q, idx) => ({
    targetId: q.targetId || `stream-node-${idx}`,
    tenant: q.tenantId || 'global-subfleet',
    appPackage: 'com.iips.core',
    reason: q.reason || 'Anomalous operational stream violation detected',
    durationStr: 'Just Now',
    lockedTimestamp: new Date().toLocaleTimeString(),
    trustScore: Math.round(Math.random() * 20) + 10
  }))

  return [...incoming, ...base]
})

// 3. Inspect Traces helper
const inspectQuarantineTraces = (target) => {
  Notify.create({
    type: 'info',
    message: `Viewing raw normalizer attestation traces targeting instance [${target.targetId}]`,
    position: 'bottom-right'
  })
}

// 4. Auditable Release Authorization Gate complete with reason logging
const releaseGateOpen = ref(false)
const pendingReleaseTarget = ref(null)
const releaseReasonText = ref('')

const promptReleaseAuthorizationGate = (targetObj) => {
  pendingReleaseTarget.value = targetObj
  releaseReasonText.value = ''
  releaseGateOpen.value = true
}

const resetReleaseGate = () => {
  pendingReleaseTarget.value = null
  releaseReasonText.value = ''
  releaseGateOpen.value = false
}

const dispatchTrustRestorationCommand = () => {
  if (!pendingReleaseTarget.value || !releaseReasonText.value) return

  const targetId = pendingReleaseTarget.value.targetId
  const annotation = releaseReasonText.value

  console.log(`[QuarantineManager] Authorizing Trust Restoration Release payload:`, {
    targetId,
    annotation,
    operator: 'sysadmin@IIPS.app'
  })

  // Broadcast upward via Unified Event Bus
  operationalEventBusSingleton.emitUpstream('QUARANTINE_RELEASE_AUTHORIZATION', {
    targetDeviceId: targetId,
    remediationLog: annotation,
    timestamp: new Date().toISOString(),
    authorizedBy: 'sysadmin@IIPS.app'
  })

  Notify.create({
    type: 'positive',
    message: `Trust restoration sequence emitted targeting endpoint [${targetId}]`,
    position: 'bottom-right'
  })

  // Mutate local storage backplanes gracefully to reflect release action
  govStore.releaseFromQuarantine(targetId)
  
  resetReleaseGate()
}
</script>

<style scoped>
.border-bottom { border-bottom: 1px solid var(--enterprise-border); }
.border-top { border-top: 1px solid var(--enterprise-border); }
.border-left { border-left: 1px solid var(--enterprise-border); }
.border-muted { border: 1px solid var(--enterprise-border); }

.border-left-critical { border-left: 3px solid #c92a2a !important; }

.hover-row:hover {
  background-color: #241c1c !important;
}
</style>
