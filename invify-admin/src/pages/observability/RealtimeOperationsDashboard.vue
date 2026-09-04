<template>
  <q-page class="q-pa-lg bg-main text-main font-mono command-center-page" style="min-height: 100vh;">
    <!-- HEADER -->
    <div class="row items-center justify-between q-mb-lg border-main q-pa-md rounded-borders bg-panel shadow-sm">
      <div class="column">
        <h1 class="text-h4 text-weight-bolder text-main q-ma-none font-sans">
          Realtime Operations
        </h1>
        <div class="text-caption text-secondary q-mt-xs">
          EnterpriseRealtimeKernel V1 Telemetry & Health
        </div>
      </div>
      
      <div class="row items-center q-gutter-md">
        <div class="column items-end text-right">
          <q-badge color="green-9" text-color="green-2" label="KERNEL HEALTHY" class="text-weight-bold" />
          <div class="text-caption text-secondary q-mt-xs" style="font-size: 11px;">
            Provider: <span :class="prefs.isDarkMode ? 'text-cyan-3' : 'text-primary'" class="text-weight-bold">SupabaseRealtimeProvider V1</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 5 OPERATIONAL PANELS -->
    <div class="row q-col-gutter-md q-mb-lg">
      
      <!-- 1. Connection Health -->
      <div class="col-12 col-md-4">
        <q-card class="bg-subpanel border-main fit q-pa-md hover-lift" :dark="prefs.isDarkMode" flat>
          <div class="text-subtitle2 q-mb-sm font-sans text-weight-bold" :class="prefs.isDarkMode ? 'text-cyan-3' : 'text-primary'">
            <q-icon name="wifi" /> Connection Health
          </div>
          <div class="row justify-between text-caption q-mt-md">
            <span class="text-secondary">Connected Channels:</span>
            <span class="text-weight-bold text-main">{{ metrics.connectedChannels }}</span>
          </div>
          <div class="row justify-between text-caption q-mt-sm">
            <span class="text-secondary">Reconnect Count:</span>
            <span class="text-weight-bold" :class="prefs.isDarkMode ? 'text-amber-3' : 'text-amber-9'">{{ metrics.reconnectCount }}</span>
          </div>
          <div class="row justify-between text-caption q-mt-sm">
            <span class="text-secondary">Heartbeat Latency:</span>
            <span :class="metrics.lastHeartbeatLatencyMs > 100 ? 'text-negative' : 'text-positive'" class="text-weight-bold">
              {{ metrics.lastHeartbeatLatencyMs }} ms
            </span>
          </div>
        </q-card>
      </div>

      <!-- 2. Event Pipeline -->
      <div class="col-12 col-md-4">
        <q-card class="bg-subpanel border-main fit q-pa-md hover-lift" :dark="prefs.isDarkMode" flat>
          <div class="text-subtitle2 q-mb-sm font-sans text-weight-bold" :class="prefs.isDarkMode ? 'text-purple-3' : 'text-purple-8'">
            <q-icon name="speed" /> Event Pipeline
          </div>
          <div class="row justify-between text-caption q-mt-md">
            <span class="text-secondary">Events Processed:</span>
            <span class="text-weight-bold text-main">{{ metrics.eventsProcessed }}</span>
          </div>
          <div class="row justify-between text-caption q-mt-sm">
            <span class="text-secondary">Duplicate Events Dropped:</span>
            <span class="text-weight-bold" :class="prefs.isDarkMode ? 'text-teal-3' : 'text-teal-8'">{{ metrics.duplicateEvents }}</span>
          </div>
          <div class="row justify-between text-caption q-mt-sm">
            <span class="text-secondary">Invalid Payloads:</span>
            <span class="text-weight-bold text-negative">{{ metrics.invalidPayloads }}</span>
          </div>
        </q-card>
      </div>

      <!-- 3. Cache & Invalidation -->
      <div class="col-12 col-md-4">
        <q-card class="bg-subpanel border-main fit q-pa-md hover-lift" :dark="prefs.isDarkMode" flat>
          <div class="text-subtitle2 q-mb-sm font-sans text-weight-bold" :class="prefs.isDarkMode ? 'text-amber-3' : 'text-amber-9'">
            <q-icon name="memory" /> Cache & Invalidation
          </div>
          <div class="row justify-between text-caption q-mt-md">
            <span class="text-secondary">Cache Invalidations:</span>
            <span class="text-weight-bold text-main">{{ metrics.cacheInvalidations }}</span>
          </div>
          <div class="row justify-between text-caption q-mt-sm">
            <span class="text-secondary">Queue Depth:</span>
            <span class="text-weight-bold" :class="metrics.queueDepth > 50 ? 'text-negative' : 'text-positive'">
              {{ metrics.queueDepth }}
            </span>
          </div>
          <div class="row justify-between text-caption q-mt-sm">
            <span class="text-secondary">QueryCache Status:</span>
            <span class="text-weight-bold text-positive">SYNCED</span>
          </div>
        </q-card>
      </div>

      <!-- 4. Replay & Recovery -->
      <div class="col-12 col-md-4">
        <q-card class="bg-subpanel border-main fit q-pa-md hover-lift" :dark="prefs.isDarkMode" flat>
          <div class="text-subtitle2 q-mb-sm font-sans text-weight-bold" :class="prefs.isDarkMode ? 'text-red-3' : 'text-red-8'">
            <q-icon name="replay" /> Replay & Recovery
          </div>
          <div class="row justify-between text-caption q-mt-md">
            <span class="text-secondary">Missed Events Detected:</span>
            <span class="text-weight-bold text-negative">{{ metrics.missedEvents }}</span>
          </div>
          <div class="row justify-between text-caption q-mt-sm">
            <span class="text-secondary">Replay Requests Sent:</span>
            <span class="text-weight-bold" :class="prefs.isDarkMode ? 'text-amber-3' : 'text-amber-9'">{{ metrics.replayRequests }}</span>
          </div>
        </q-card>
      </div>

      <!-- 5. Store Health -->
      <div class="col-12 col-md-4">
        <q-card class="bg-subpanel border-main fit q-pa-md hover-lift" :dark="prefs.isDarkMode" flat>
          <div class="text-subtitle2 q-mb-sm font-sans text-weight-bold" :class="prefs.isDarkMode ? 'text-green-3' : 'text-green-9'">
            <q-icon name="storefront" /> Store Health
          </div>
          <div class="row justify-between text-caption q-mt-md">
            <span class="text-secondary">FinanceStore:</span> <span class="text-positive text-weight-bold">SUBSCRIBED</span>
          </div>
          <div class="row justify-between text-caption q-mt-sm">
            <span class="text-secondary">InventoryStore:</span> <span class="text-positive text-weight-bold">SUBSCRIBED</span>
          </div>
          <div class="row justify-between text-caption q-mt-sm">
            <span class="text-secondary">OperationsStore:</span> <span class="text-positive text-weight-bold">SUBSCRIBED</span>
          </div>
        </q-card>
      </div>
      <!-- 6. Governance & Policy -->
      <div class="col-12 col-md-4">
        <q-card class="bg-subpanel border-main fit q-pa-md hover-lift" :dark="prefs.isDarkMode" flat>
          <div class="text-subtitle2 q-mb-sm font-sans text-weight-bold" :class="prefs.isDarkMode ? 'text-indigo-3' : 'text-indigo-8'">
            <q-icon name="security" /> Governance & Policy
          </div>
          <div class="row justify-between text-caption q-mt-md">
            <span class="text-secondary">Auth Failures:</span>
            <span class="text-weight-bold text-negative">{{ kernel.governance.metrics.authorizationFailures }}</span>
          </div>
          <div class="row justify-between text-caption q-mt-sm">
            <span class="text-secondary">Schema Violations:</span>
            <span class="text-weight-bold" :class="prefs.isDarkMode ? 'text-amber-3' : 'text-amber-9'">{{ kernel.governance.metrics.schemaViolations }}</span>
          </div>
          <div class="row justify-between text-caption q-mt-sm">
            <span class="text-secondary">Rate Limit Trips:</span>
            <span class="text-weight-bold" :class="prefs.isDarkMode ? 'text-amber-3' : 'text-amber-9'">{{ kernel.governance.metrics.rateLimitTrips }}</span>
          </div>
          <div class="row justify-between text-caption q-mt-sm">
            <span class="text-secondary">Policy Violations:</span>
            <span class="text-weight-bold text-negative">{{ kernel.governance.metrics.policyViolations }}</span>
          </div>
        </q-card>
      </div>

      <!-- 7. Chaos Engine & Resilience -->
      <div class="col-12 col-md-4">
        <q-card class="bg-subpanel border-main fit q-pa-md hover-lift position-relative" :dark="prefs.isDarkMode" flat>
          <div class="row justify-between items-center q-mb-sm">
            <div class="text-subtitle2 font-sans font-weight-bold" :class="prefs.isDarkMode ? 'text-orange-4' : 'text-orange-9'">
              <q-icon name="warning" class="q-mr-xs"/> Chaos Engine
            </div>
            <q-badge :color="kernel.chaos.isEnabled ? 'orange-9' : 'grey-8'" text-color="white">
              {{ kernel.chaos.isEnabled ? 'ARMED' : 'DISABLED' }}
            </q-badge>
          </div>
          
          <template v-if="kernel.chaos.getCurrentMetrics()">
            <div class="text-caption text-secondary q-mt-xs font-mono" style="font-size: 10px;">
              Run ID: {{ kernel.chaos.getCurrentMetrics()?.runId }}
            </div>
            <div class="row justify-between text-caption q-mt-sm">
              <span class="text-secondary">Scenario:</span>
              <span class="text-weight-bold" :class="prefs.isDarkMode ? 'text-orange-3' : 'text-orange-8'">{{ kernel.chaos.getCurrentMetrics()?.scenario }}</span>
            </div>
            <div class="row justify-between text-caption q-mt-sm">
              <span class="text-secondary">Status:</span>
              <q-badge :color="kernel.chaos.getCurrentMetrics()?.status === 'PASSED' ? 'green-9' : 'red-9'">
                {{ kernel.chaos.getCurrentMetrics()?.status }}
              </q-badge>
            </div>
            <div class="row justify-between text-caption q-mt-sm">
              <span class="text-secondary">Resilience Score:</span>
              <span class="text-weight-bold" :class="prefs.isDarkMode ? 'text-cyan-4' : 'text-primary'">{{ kernel.chaos.getCurrentMetrics()?.resilienceScore }}/100</span>
            </div>
            <div class="row justify-between text-caption q-mt-sm">
              <span class="text-secondary">MTTR (ms):</span>
              <span class="text-weight-bold text-main">{{ kernel.chaos.getCurrentMetrics()?.mttrMs }}</span>
            </div>
          </template>
          <template v-else>
            <div class="text-center q-pa-md q-mt-md text-secondary text-caption font-mono border-dashed">
              Awaiting Simulation
            </div>
          </template>
        </q-card>
      </div>
    </div>

    <!-- LOWER GRID -->
    <div class="row q-col-gutter-md">
      
      <!-- EVENT INSPECTOR -->
      <div class="col-12 col-md-6">
        <q-card class="bg-panel border-main fit q-pa-md column shadow-sm" :dark="prefs.isDarkMode" flat>
          <div class="text-subtitle2 q-mb-md font-sans text-weight-bold" :class="prefs.isDarkMode ? 'text-cyan-3' : 'text-primary'">
            <q-icon name="bug_report" /> Latest Processed Event (Inspector)
          </div>
          <div class="col bg-subpanel rounded-borders q-pa-sm text-caption border-main" style="overflow-x: auto; white-space: pre-wrap;">
            <template v-if="metrics.latestProcessedEvent">
              <span :class="prefs.isDarkMode ? 'text-purple-3' : 'text-purple-8'">Event:</span> <span class="text-main">{{ metrics.latestProcessedEvent.event }}</span>
              <br/>
              <span :class="prefs.isDarkMode ? 'text-purple-3' : 'text-purple-8'">Priority:</span> <q-badge color="purple-9" text-color="white">{{ metrics.latestProcessedEvent.priority || 'NORMAL' }}</q-badge>
              <br/>
              <span :class="prefs.isDarkMode ? 'text-purple-3' : 'text-purple-8'">ID:</span> <span class="text-main">{{ metrics.latestProcessedEvent.eventId }}</span>
              <br/>
              <span :class="prefs.isDarkMode ? 'text-purple-3' : 'text-purple-8'">Seq:</span> <span class="text-main">{{ metrics.latestProcessedEvent.sequenceNumber }}</span>
              <br/>
              <span :class="prefs.isDarkMode ? 'text-purple-3' : 'text-purple-8'">Correlation:</span> <span class="text-main">{{ metrics.latestProcessedEvent.correlationId }}</span>
              <br/>
              <span :class="prefs.isDarkMode ? 'text-purple-3' : 'text-purple-8'">Tenant:</span> <span class="text-main">{{ metrics.latestProcessedEvent.tenantId }}</span>
              <br/><br/>
              <span class="text-secondary">// Payload Snapshot</span><br/>
              <span :class="prefs.isDarkMode ? 'text-green-3' : 'text-green-9'">{{ JSON.stringify(metrics.latestProcessedEvent.payload, null, 2) }}</span>
            </template>
            <template v-else>
              <div class="text-secondary text-center q-mt-lg">Waiting for events...</div>
            </template>
          </div>
        </q-card>
      </div>

      <!-- LIVE KERNEL TIMELINE -->
      <div class="col-12 col-md-6">
        <q-card class="bg-panel border-main fit q-pa-md column shadow-sm" :dark="prefs.isDarkMode" flat>
          <div class="text-subtitle2 q-mb-md font-sans text-weight-bold" :class="prefs.isDarkMode ? 'text-amber-3' : 'text-amber-9'">
            <q-icon name="list_alt" /> Live Kernel Timeline
          </div>
          <q-scroll-area class="col bg-subpanel rounded-borders q-pa-sm border-main" :dark="prefs.isDarkMode" style="height: 250px;">
            <div v-for="(log, idx) in metrics.timeline" :key="idx" class="text-caption q-mb-xs">
              <span class="text-secondary">[{{ log.time }}]</span> 
              <span :class="{
                'text-cyan-3': log.type === 'info' && prefs.isDarkMode,
                'text-primary': log.type === 'info' && !prefs.isDarkMode,
                'text-amber-4': log.type === 'warn' && prefs.isDarkMode,
                'text-amber-9': log.type === 'warn' && !prefs.isDarkMode,
                'text-red-4': log.type === 'error' && prefs.isDarkMode,
                'text-red-8': log.type === 'error' && !prefs.isDarkMode
              }">{{ log.message }}</span>
            </div>
            <div v-if="metrics.timeline.length === 0" class="text-secondary text-center q-mt-lg">
              No timeline events recorded.
            </div>
          </q-scroll-area>
        </q-card>
      </div>
      
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRealtimeKernel } from '../../services/realtime';
import { useOperatorPreferences } from '../../composables/useOperatorPreferences';

const { prefs } = useOperatorPreferences();
const kernel = useRealtimeKernel();
const metrics = ref(kernel.metrics);

let refreshTimer: any;

onMounted(() => {
  // Sync UI reactivity with Kernel instance
  refreshTimer = setInterval(() => {
    metrics.value = { ...kernel.metrics };
  }, 1000);
});

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer);
});
</script>

<style scoped>
.hover-lift { transition: transform 0.2s; }
.hover-lift:hover { transform: translateY(-2px); }
</style>
