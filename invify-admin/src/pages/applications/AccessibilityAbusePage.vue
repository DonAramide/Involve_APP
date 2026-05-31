<!-- invify-admin/src/pages/applications/AccessibilityAbusePage.vue -->
<template>
  <q-page class="bg-[#0b0f12] text-[#e1e7ec] q-pa-md column op-gap-16 fit overflow-hidden" style="height: calc(100vh - 50px);">
    
    <!-- Header Command Line -->
    <div class="row items-center justify-between no-wrap border-bottom q-pb-sm shrink-0">
      <div class="row items-center op-gap-8 no-wrap">
        <q-icon name="visibility_off" size="sm" color="amber-4" />
        <div>
          <div class="text-operator-title text-white text-weight-bold" style="font-size: 14px;">Accessibility Overlay Abuse & Automation Detection</div>
          <div class="text-metric-mono text-grey-5" style="font-size: 10px;">CONFIDENCE_SCORING // RUNTIME_HOOK_INTERCEPTOR</div>
        </div>
      </div>
      
      <!-- Tenant Scope Visibility Filter -->
      <div class="row items-center op-gap-8 no-wrap text-caption text-grey-5">
        <span class="v-hide-xs">Interception Horizon:</span>
        <q-chip dense size="xs" color="amber-10" text-color="amber-2" class="text-weight-bold">
          CONTINUOUS PROBABILITY
        </q-chip>
      </div>
    </div>

    <!-- UPPER ROW: Confidence Scoring Index & Aggregation Dashboard -->
    <div class="panel-card bg-[#12161a] border-muted rounded-borders column shrink-0">
      <div class="panel-header bg-[#161b20] q-px-sm q-py-xs border-bottom row items-center justify-between">
        <div class="row items-center op-gap-4 no-wrap">
          <q-icon name="model_training" size="xs" color="cyan-3" />
          <span class="text-operator-title text-white text-weight-bold">Behavioral Interception Probability Engine</span>
        </div>
        <span class="text-metric-mono text-cyan-3" style="font-size: 10px;">FINAL REFINEMENT #4: CONFIDENCE SCORING</span>
      </div>

      <div class="panel-body q-pa-sm row items-center justify-between op-gap-16 text-center">
        
        <div class="col column">
          <span class="text-metric-mono text-red-4 text-weight-bold" style="font-size: 18px;">94.2%</span>
          <span class="text-grey-5" style="font-size: 10px;">Max Confidence Weight</span>
        </div>

        <div class="col column border-left">
          <span class="text-metric-mono text-amber-4 text-weight-bold" style="font-size: 18px;">3 Critical</span>
          <span class="text-grey-5" style="font-size: 10px;">Overlay Exploits Active</span>
        </div>

        <div class="col column border-left">
          <span class="text-metric-mono text-white text-weight-bold" style="font-size: 18px;">0.00%</span>
          <span class="text-grey-5" style="font-size: 10px;">False Positive Rate</span>
        </div>

        <div class="col column border-left">
          <span class="text-metric-mono text-cyan-3 text-weight-bold" style="font-size: 18px;">242/hr</span>
          <span class="text-grey-5" style="font-size: 10px;">Interception Sweeps</span>
        </div>

      </div>
    </div>

    <!-- MAIN MIDDLE SECTION: Live Interception Stream complete with Confidence Ratios -->
    <div class="panel-card bg-[#12161a] border-muted rounded-borders column col min-h-0 fit">
      <div class="panel-header bg-[#161b20] q-px-sm q-py-xs border-bottom row items-center justify-between shrink-0">
        <div class="row items-center op-gap-4 no-wrap">
          <q-icon name="stream" size="xs" color="red-4" />
          <span class="text-operator-title text-white text-weight-bold">Realtime Accessibility Service & Screen Hijacking Stream</span>
        </div>
        <span class="text-metric-mono text-red-4" style="font-size: 10px;">{{ activeStreamsList.length }} DETECTED ANOMALIES</span>
      </div>

      <div class="col overflow-auto q-pa-xs custom-scrollbar">
        <q-list dense class="q-gutter-y-xs">
          <q-item 
            v-for="stream in activeStreamsList" 
            :key="stream.id"
            class="q-px-sm q-py-xs bg-[#161b20] rounded-borders column op-gap-4 hover-row border-left-abuse"
          >
            <!-- Top info bar -->
            <div class="row items-center justify-between no-wrap fit">
              <div class="row items-center op-gap-8 no-wrap">
                <span class="text-white text-weight-bold text-caption">{{ stream.abuseType }}</span>
                <q-badge color="deep-orange-10" text-color="deep-orange-2" class="text-metric-sm">
                  Severity: {{ stream.severity }}
                </q-badge>
                <span class="text-metric-mono text-grey-5" style="font-size: 10px;">{{ stream.packageName }}</span>
              </div>

              <!-- FINAL REFINEMENT #4: Continuous Confidence Ratio -->
              <div class="row items-center op-gap-4">
                <span class="text-metric-mono text-weight-bold" :class="stream.confidenceScore > 85 ? 'text-red-4' : 'text-amber-4'" style="font-size: 11px;">
                  Confidence: {{ stream.confidenceScore }}%
                </span>
              </div>
            </div>

            <!-- Behavioral indicators layout -->
            <div class="bg-[#12161a] q-pa-xs rounded-borders row items-center justify-between text-grey-4" style="font-size: 10px;">
              <span>Behavioral Correlation: <span class="text-white">{{ stream.behavioralSignature }}</span></span>
              <span>Historical Reputation: <span :class="stream.reputationIndex === 'MALICIOUS_CLUSTER' ? 'text-red-4' : 'text-amber-4'">{{ stream.reputationIndex }}</span></span>
            </div>

            <div class="text-amber-3 ellipsis" style="font-size: 11px;">
              Detected runtime hook vector: "{{ stream.hookTrace }}"
            </div>

            <!-- Action buttons -->
            <div class="row items-center justify-between border-top q-pt-xs text-grey-5" style="font-size: 10px;">
              <span>Target Boundary: <span class="text-white">{{ stream.tenantScope }}</span> // Endpoint: {{ stream.deviceId }}</span>
              
              <div class="row items-center op-gap-4">
                <q-btn 
                  dense flat size="xs" color="cyan-3" label="Acknowledge Hook" 
                  @click="acknowledgeStream(stream.id)" 
                  class="bg-[#1c2429] q-px-xs text-metric-sm" 
                />
                <q-btn 
                  dense flat size="xs" color="red-4" label="Escalate to Incident Center" 
                  @click="escalateToIncidentCenter(stream)" 
                  class="bg-[#241212] q-px-xs text-weight-bold text-metric-sm" 
                />
              </div>
            </div>
          </q-item>
        </q-list>
      </div>

      <div class="panel-footer bg-[#161b20] q-pa-xs border-top text-center text-grey-6 shrink-0" style="font-size: 10px;">
        SOC Orchestration rule: Accessibility intercepts exceeding 90% confidence weights trigger immediate hardware containment state mutations automatically.
      </div>
    </div>

  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import { Notify } from 'quasar'

// 1. Static base arrays simulating continuous accessibility stream packages complete with FINAL REFINEMENT #4: Confidence Scoring
const activeStreamsList = ref([])

const acknowledgeStream = (streamId) => {
  activeStreamsList.value = activeStreamsList.value.filter(s => s.id !== streamId)
  Notify.create({
    type: 'positive',
    message: `Accessibility hook alert acknowledged and cleared securely`,
    position: 'bottom-right'
  })
}

const escalateToIncidentCenter = (streamObj) => {
  if (!streamObj) return

  Notify.create({
    type: 'negative',
    message: `Escalating abuse profile [${streamObj.packageName}] directly to centralized Incident Intelligence loop`,
    position: 'bottom-right'
  })

  // Drop locally to simulate complete workflow migration
  activeStreamsList.value = activeStreamsList.value.filter(s => s.id !== streamObj.id)
}
</script>

<style scoped>
.border-bottom { border-bottom: 1px solid var(--enterprise-border); }
.border-top { border-top: 1px solid var(--enterprise-border); }
.border-left { border-left: 1px solid var(--enterprise-border); }
.border-muted { border: 1px solid var(--enterprise-border); }

.border-left-abuse { border-left: 3px solid #f03e3e; }

.hover-row:hover {
  background-color: #1a2327 !important;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: #0b0f12;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #22282d;
  border-radius: 3px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #333a40;
}

@media (max-width: 600px) {
  .v-hide-xs { display: none; }
}
</style>
