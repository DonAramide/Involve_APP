<!-- invify-admin/src/pages/applications/AccessibilityAbusePage.vue -->
<template>
  <q-page class="bg-[#0b0f12] text-[#e1e7ec] q-pa-md column op-gap-16">
    
    <!-- Top banner bar -->
    <div class="row items-center justify-between no-wrap border-bottom q-pb-sm">
      <div class="row items-center op-gap-8 no-wrap">
        <q-icon name="touch_app" size="sm" color="amber-4" />
        <div>
          <div class="text-operator-title text-white text-weight-bold" style="font-size: 14px;">Accessibility Service Abuse & Runtime Overlay Interception</div>
          <div class="text-metric-mono text-grey-5" style="font-size: 10px;">CONFIDENCE_SCORING_MATRIX // BEHAVIORAL_CORRELATION</div>
        </div>
      </div>
      
      <!-- Tenant parameter selector -->
      <div class="row items-center op-gap-8 no-wrap text-caption text-grey-5">
        <span class="v-hide-xs">Tenant Scope:</span>
        <q-select
          v-model="activeTenantScope"
          :options="['global', 'tenant-alpha', 'tenant-omega', 'tenant-beta']"
          dense dark filled options-dense
          @update:model-value="onTenantScopeUpdated"
          class="bg-[#12161a] text-caption"
          style="width: 130px;"
        />
      </div>
    </div>

    <!-- UPPER ROW: FINAL REFINEMENT #4: Confidence Scoring Diagnostics Preview -->
    <div class="panel-card bg-[#12161a] border-muted rounded-borders column fit">
      <div class="panel-header bg-[#161b20] q-px-sm q-py-xs border-bottom row items-center justify-between">
        <div class="row items-center op-gap-4 no-wrap">
          <q-icon name="model_training" size="xs" color="cyan-3" />
          <span class="text-operator-title text-white text-weight-bold">Behavioral Anomaly Confidence Engine Architecture</span>
        </div>
        <span class="text-metric-mono text-cyan-3" style="font-size: 10px;">NON-BINARY WEIGHTED MODELING</span>
      </div>

      <div class="panel-body q-pa-sm row items-center justify-between text-caption text-grey-4 op-gap-16">
        <div class="col-12 col-md-4 column">
          <span class="text-weight-bold text-white" style="font-size: 11px;">False-Positive Reduction Strategy</span>
          <span class="text-grey-5" style="font-size: 10px;">
            Intercept loops bypass simple binary checks by merging multiple telemetry inputs to calculate absolute threat probabilities.
          </span>
        </div>

        <div class="col-12 col-md-8 row items-stretch justify-between text-center bg-[#161b20] q-pa-xs rounded-borders">
          <div class="col column justify-center q-pa-xs">
            <span class="text-metric-mono text-amber-4 text-weight-bold" style="font-size: 16px;">94.2%</span>
            <span class="text-grey-5" style="font-size: 9px;">Max Confidence</span>
          </div>
          <div class="col column justify-center q-pa-xs border-left">
            <span class="text-metric-mono text-white text-weight-bold" style="font-size: 16px;">3.4x</span>
            <span class="text-grey-5" style="font-size: 9px;">Correlation Multiplier</span>
          </div>
          <div class="col column justify-center q-pa-xs border-left">
            <span class="text-metric-mono text-cyan-3 text-weight-bold" style="font-size: 16px;">Nominal</span>
            <span class="text-grey-5" style="font-size: 9px;">Historical Reputation</span>
          </div>
          <div class="col column justify-center q-pa-xs border-left">
            <span class="text-metric-mono text-green-4 text-weight-bold" style="font-size: 16px;">&lt; 0.1%</span>
            <span class="text-grey-5" style="font-size: 9px;">False Alarm SLA</span>
          </div>
        </div>
      </div>
    </div>

    <!-- MAIN MIDDLE GRID: Active Interception Stream Matrix -->
    <div class="panel-card bg-[#12161a] border-muted rounded-borders column fit">
      <div class="panel-header bg-[#161b20] q-px-sm q-py-xs border-bottom row items-center justify-between">
        <div class="row items-center op-gap-4 no-wrap">
          <q-icon name="bug_report" size="xs" color="amber-4" />
          <span class="text-operator-title text-white text-weight-bold">Live Accessibility Overlay Interception Streams</span>
        </div>
        <span class="text-metric-mono text-amber-3" style="font-size: 10px;">{{ activeAbuseStreamsList.length }} TARGET EVENTS DETECTED</span>
      </div>

      <div class="panel-body q-pa-xs overflow-y-auto" style="max-height: 380px;">
        <q-list dense class="q-gutter-y-xs">
          <q-item 
            v-for="a in activeAbuseStreamsList" 
            :key="a.eventId" 
            class="q-px-sm q-py-xs bg-[#181412] rounded-borders column op-gap-4 border-left-abuse hover-row"
          >
            <!-- Header bar: signature info + Confidence percentage -->
            <div class="row items-center justify-between fit no-wrap">
              <div class="row items-center op-gap-8 no-wrap">
                <span class="text-white text-weight-bold text-caption">{{ a.abusePattern }}</span>
                <span class="text-metric-mono text-grey-5" style="font-size: 10px;">Target App: {{ a.targetPackage }}</span>
              </div>

              <!-- FINAL REFINEMENT #4: Confidence Scoring Meter -->
              <div class="row items-center op-gap-6">
                <div class="text-right">
                  <div class="text-metric-mono text-amber-4 text-weight-bold" style="font-size: 12px;">Confidence: {{ a.confidenceScore }}%</div>
                  <div class="text-grey-6" style="font-size: 8px;">Reputation: {{ a.reputationWeight }}</div>
                </div>
                <q-circular-progress
                  show-value
                  font-size="9px"
                  :value="a.confidenceScore"
                  size="26px"
                  :thickness="0.25"
                  color="amber-4"
                  track-color="grey-9"
                  class="text-white text-weight-bold text-metric-mono"
                >
                  {{ a.confidenceScore }}
                </q-circular-progress>
              </div>
            </div>

            <!-- Context metrics: Hooks & privilege tracking -->
            <div class="bg-[#12161a] q-pa-xs rounded-borders row items-center justify-between text-grey-4" style="font-size: 10px;">
              <div class="row items-center op-gap-6">
                <span class="text-white text-weight-bold">Runtime Hook:</span>
                <span class="text-metric-mono text-cyan-3">{{ a.runtimeHookType }}</span>
              </div>
              <div class="row items-center op-gap-4 text-grey-5">
                <span>Node: <span class="text-white">{{ a.deviceNode }}</span></span>
                <span>•</span>
                <span>Tenant: <span class="text-white">{{ a.tenantScope }}</span></span>
              </div>
            </div>

            <!-- Description string -->
            <div class="text-grey-4 ellipsis" style="font-size: 11px;">
              Behavioral trigger: {{ a.behavioralTrigger }}
            </div>

            <!-- Footer control actions -->
            <div class="row items-center justify-between border-top q-pt-xs q-mt-xs text-caption text-grey-5" style="font-size: 10px;">
              <span class="text-metric-mono text-grey-6" style="font-size: 9px;">Severity Matrix: {{ a.anomalySeverity }}</span>
              
              <div class="row items-center op-gap-4">
                <q-btn 
                  dense flat size="xs" color="cyan-3" label="Escalate to SOC Incident" 
                  @click="escalateToIncident(a)" 
                  class="bg-[#182227] q-px-xs text-metric-sm" 
                />
                <q-btn 
                  dense flat size="xs" color="red-4" label="Enforce Process Termination" 
                  @click="enforceRuntimeRemediation(a)" 
                  class="bg-[#241212] q-px-xs text-metric-sm" 
                />
              </div>
            </div>
          </q-item>
        </q-list>
      </div>
    </div>

  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import { useApplicationEventStore } from '../../stores/realtime/useApplicationEventStore'
import { operationalEventBusSingleton } from '../../services/realtime/OperationalEventBus'
import { Notify } from 'quasar'

const appStore = useApplicationEventStore()
const activeTenantScope = ref('global')

const onTenantScopeUpdated = (val) => {
  appStore.setTenantFilter(val)
}

// 1. Accessibility Abuse stream list incorporating FINAL REFINEMENT #4 Confidence Scoring parameters
const activeAbuseStreamsList = ref([
  { eventId: 'evt-acc-01', abusePattern: 'UNAUTHORIZED_OVERLAY_INJECTION', targetPackage: 'com.overlay.tools.widget', confidenceScore: 94, reputationWeight: 'UNKNOWN_NEW', runtimeHookType: 'onAccessibilityEvent_WindowChange', deviceNode: 'pos-reg-omega-01', tenantScope: 'tenant-alpha', behavioralTrigger: 'Intercepted foreground package touch boundaries without verified system application signing keys', anomalySeverity: 'CRITICAL' },
  { eventId: 'evt-acc-02', abusePattern: 'SCREEN_INTERCEPTION_ATTEMPT', targetPackage: 'com.malicious.keylogger.sys', confidenceScore: 88, reputationWeight: 'POOR_RATING', runtimeHookType: 'MediaProjection_CaptureFrame', deviceNode: 'kiosk-subfleet-84', tenantScope: 'tenant-beta', behavioralTrigger: 'Continuous silent capture loop triggered targeting pin code rendering input frames', anomalySeverity: 'HIGH' },
  { eventId: 'evt-acc-03', abusePattern: 'AUTOMATION_MALWARE_HOOK', targetPackage: 'com.auto.clicker.script', confidenceScore: 72, reputationWeight: 'MODERATE_SUSPICIOUS', runtimeHookType: 'dispatchGesture_Coordinates', deviceNode: 'retail-base-012', tenantScope: 'tenant-omega', behavioralTrigger: 'High frequency automated touch coordinates injected outside normal human interval speeds', anomalySeverity: 'WARNING' }
])

// SOC Integration actions
const escalateToIncident = (abuseObj) => {
  console.log(`[AccessibilityEngine] Escalate Accessibility Abuse event to incident intelligence queues:`, abuseObj)
  
  operationalEventBusSingleton.emitUpstream('ESCALATE_ACCESSIBILITY_ABUSE', {
    targetEventId: abuseObj.eventId,
    abusePattern: abuseObj.abusePattern,
    targetPackage: abuseObj.targetPackage,
    confidenceScore: abuseObj.confidenceScore,
    timestamp: new Date().toISOString()
  })

  Notify.create({
    type: 'positive',
    message: `Accessibility abuse pattern escalated securely to SOC incident correlation channels`,
    position: 'bottom-right'
  })
}

const enforceRuntimeRemediation = (abuseObj) => {
  console.log(`[AccessibilityEngine] Enforce immediate runtime process termination:`, abuseObj.targetPackage)
  
  operationalEventBusSingleton.emitUpstream('ENFORCE_RUNTIME_TERMINATION', {
    targetPackageName: abuseObj.targetPackage,
    deviceNode: abuseObj.deviceNode,
    timestamp: new Date().toISOString()
  })

  Notify.create({
    type: 'negative',
    message: `Runtime process termination signal broadcast targeting package [${abuseObj.targetPackage}]`,
    position: 'bottom-right'
  })

  // Mutate local stream feed optimistically
  activeAbuseStreamsList.value = activeAbuseStreamsList.value.filter(a => a.eventId !== abuseObj.eventId)
}
</script>

<style scoped>
.border-bottom { border-bottom: 1px solid var(--enterprise-border); }
.border-top { border-top: 1px solid var(--enterprise-border); }
.border-left { border-left: 1px solid var(--enterprise-border); }
.border-muted { border: 1px solid var(--enterprise-border); }

.border-left-abuse { border-left: 3px solid #fcc419; }

.hover-row:hover {
  background-color: #241d16 !important;
}

@media (max-width: 600px) {
  .v-hide-xs { display: none; }
}
</style>
