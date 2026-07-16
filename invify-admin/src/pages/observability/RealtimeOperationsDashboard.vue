<template>
  <q-page class="q-pa-lg bg-dark text-white font-mono command-center-page" style="min-height: 100vh;">
    <!-- HEADER -->
    <div class="row items-center justify-between q-mb-lg border-main q-pa-md rounded-borders bg-panel">
      <div class="column">
        <h1 class="text-h4 text-weight-bolder text-white q-ma-none font-sans">
          Realtime Operations
        </h1>
        <div class="text-caption text-grey-5 q-mt-xs">
          EnterpriseRealtimeKernel V1 Telemetry & Health
        </div>
      </div>
      
      <div class="row items-center q-gutter-md">
        <div class="column items-end text-right">
          <q-badge color="green-9" text-color="green-2" label="KERNEL HEALTHY" class="text-weight-bold" />
          <div class="text-caption text-grey-5 q-mt-xs" style="font-size: 11px;">
            Provider: <span class="text-cyan-3">SupabaseRealtimeProvider V1</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 5 OPERATIONAL PANELS -->
    <div class="row q-col-gutter-md q-mb-lg">
      
      <!-- 1. Connection Health -->
      <div class="col-12 col-md-4">
        <q-card class="bg-subpanel border-main fit q-pa-md hover-lift">
          <div class="text-subtitle2 text-cyan-3 q-mb-sm font-sans font-weight-bold">
            <q-icon name="wifi" /> Connection Health
          </div>
          <div class="row justify-between text-caption q-mt-md">
            <span>Connected Channels:</span>
            <span class="text-weight-bold text-white">{{ metrics.connectedChannels }}</span>
          </div>
          <div class="row justify-between text-caption q-mt-sm">
            <span>Reconnect Count:</span>
            <span class="text-weight-bold text-amber-3">{{ metrics.reconnectCount }}</span>
          </div>
          <div class="row justify-between text-caption q-mt-sm">
            <span>Heartbeat Latency:</span>
            <span :class="metrics.lastHeartbeatLatencyMs > 100 ? 'text-red-4' : 'text-green-4'" class="text-weight-bold">
              {{ metrics.lastHeartbeatLatencyMs }} ms
            </span>
          </div>
        </q-card>
      </div>

      <!-- 2. Event Pipeline -->
      <div class="col-12 col-md-4">
        <q-card class="bg-subpanel border-main fit q-pa-md hover-lift">
          <div class="text-subtitle2 text-purple-3 q-mb-sm font-sans font-weight-bold">
            <q-icon name="speed" /> Event Pipeline
          </div>
          <div class="row justify-between text-caption q-mt-md">
            <span>Events Processed:</span>
            <span class="text-weight-bold text-white">{{ metrics.eventsProcessed }}</span>
          </div>
          <div class="row justify-between text-caption q-mt-sm">
            <span>Duplicate Events Dropped:</span>
            <span class="text-weight-bold text-teal-3">{{ metrics.duplicateEvents }}</span>
          </div>
          <div class="row justify-between text-caption q-mt-sm">
            <span>Invalid Payloads:</span>
            <span class="text-weight-bold text-red-4">{{ metrics.invalidPayloads }}</span>
          </div>
        </q-card>
      </div>

      <!-- 3. Cache & Invalidation -->
      <div class="col-12 col-md-4">
        <q-card class="bg-subpanel border-main fit q-pa-md hover-lift">
          <div class="text-subtitle2 text-amber-3 q-mb-sm font-sans font-weight-bold">
            <q-icon name="memory" /> Cache & Invalidation
          </div>
          <div class="row justify-between text-caption q-mt-md">
            <span>Cache Invalidations:</span>
            <span class="text-weight-bold text-white">{{ metrics.cacheInvalidations }}</span>
          </div>
          <div class="row justify-between text-caption q-mt-sm">
            <span>Queue Depth:</span>
            <span class="text-weight-bold" :class="metrics.queueDepth > 50 ? 'text-red-4' : 'text-green-4'">
              {{ metrics.queueDepth }}
            </span>
          </div>
          <div class="row justify-between text-caption q-mt-sm">
            <span>QueryCache Status:</span>
            <span class="text-weight-bold text-green-4">SYNCED</span>
          </div>
        </q-card>
      </div>

      <!-- 4. Replay & Recovery -->
      <div class="col-12 col-md-4">
        <q-card class="bg-subpanel border-main fit q-pa-md hover-lift">
          <div class="text-subtitle2 text-red-3 q-mb-sm font-sans font-weight-bold">
            <q-icon name="replay" /> Replay & Recovery
          </div>
          <div class="row justify-between text-caption q-mt-md">
            <span>Missed Events Detected:</span>
            <span class="text-weight-bold text-red-4">{{ metrics.missedEvents }}</span>
          </div>
          <div class="row justify-between text-caption q-mt-sm">
            <span>Replay Requests Sent:</span>
            <span class="text-weight-bold text-amber-3">{{ metrics.replayRequests }}</span>
          </div>
        </q-card>
      </div>

      <!-- 5. Store Health -->
      <div class="col-12 col-md-4">
        <q-card class="bg-subpanel border-main fit q-pa-md hover-lift">
          <div class="text-subtitle2 text-green-3 q-mb-sm font-sans font-weight-bold">
            <q-icon name="storefront" /> Store Health
          </div>
          <div class="row justify-between text-caption q-mt-md text-grey-4">
            <span>FinanceStore:</span> <span class="text-green-4">SUBSCRIBED</span>
          </div>
          <div class="row justify-between text-caption q-mt-sm text-grey-4">
            <span>InventoryStore:</span> <span class="text-green-4">SUBSCRIBED</span>
          </div>
          <div class="row justify-between text-caption q-mt-sm text-grey-4">
            <span>OperationsStore:</span> <span class="text-green-4">SUBSCRIBED</span>
          </div>
        </q-card>
      </div>
      <!-- 6. Governance & Policy -->
      <div class="col-12 col-md-4">
        <q-card class="bg-subpanel border-main fit q-pa-md hover-lift">
          <div class="text-subtitle2 text-indigo-3 q-mb-sm font-sans font-weight-bold">
            <q-icon name="security" /> Governance & Policy
          </div>
          <div class="row justify-between text-caption q-mt-md">
            <span>Auth Failures:</span>
            <span class="text-weight-bold text-red-4">{{ kernel.governance.metrics.authorizationFailures }}</span>
          </div>
          <div class="row justify-between text-caption q-mt-sm">
            <span>Schema Violations:</span>
            <span class="text-weight-bold text-amber-3">{{ kernel.governance.metrics.schemaViolations }}</span>
          </div>
          <div class="row justify-between text-caption q-mt-sm">
            <span>Rate Limit Trips:</span>
            <span class="text-weight-bold text-amber-3">{{ kernel.governance.metrics.rateLimitTrips }}</span>
          </div>
          <div class="row justify-between text-caption q-mt-sm">
            <span>Policy Violations:</span>
            <span class="text-weight-bold text-red-4">{{ kernel.governance.metrics.policyViolations }}</span>
          </div>
        </q-card>
      </div>

      <!-- 7. Chaos Engine & Resilience -->
      <div class="col-12 col-md-4">
        <q-card class="bg-subpanel border-main fit q-pa-md hover-lift position-relative">
          <div class="row justify-between items-center q-mb-sm">
            <div class="text-subtitle2 text-orange-4 font-sans font-weight-bold">
              <q-icon name="warning" class="q-mr-xs"/> Chaos Engine
            </div>
            <q-badge :color="kernel.chaos.isEnabled ? 'orange-9' : 'grey-8'" text-color="white">
              {{ kernel.chaos.isEnabled ? 'ARMED' : 'DISABLED' }}
            </q-badge>
          </div>
          
          <template v-if="kernel.chaos.getCurrentMetrics()">
            <div class="text-caption text-grey-4 q-mt-xs font-mono" style="font-size: 10px;">
              Run ID: {{ kernel.chaos.getCurrentMetrics()?.runId }}
            </div>
            <div class="row justify-between text-caption q-mt-sm">
              <span>Scenario:</span>
              <span class="text-weight-bold text-orange-3">{{ kernel.chaos.getCurrentMetrics()?.scenario }}</span>
            </div>
            <div class="row justify-between text-caption q-mt-sm">
              <span>Status:</span>
              <q-badge :color="kernel.chaos.getCurrentMetrics()?.status === 'PASSED' ? 'green-9' : 'red-9'">
                {{ kernel.chaos.getCurrentMetrics()?.status }}
              </q-badge>
            </div>
            <div class="row justify-between text-caption q-mt-sm">
              <span>Resilience Score:</span>
              <span class="text-weight-bold text-cyan-4">{{ kernel.chaos.getCurrentMetrics()?.resilienceScore }}/100</span>
            </div>
            <div class="row justify-between text-caption q-mt-sm">
              <span>MTTR (ms):</span>
              <span class="text-weight-bold text-white">{{ kernel.chaos.getCurrentMetrics()?.mttrMs }}</span>
            </div>
          </template>
          <template v-else>
            <div class="text-center q-pa-md q-mt-md text-grey-6 text-caption font-mono border-dashed">
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
        <q-card class="bg-panel border-main fit q-pa-md column">
          <div class="text-subtitle2 text-cyan-3 q-mb-md font-sans">
            <q-icon name="bug_report" /> Latest Processed Event (Inspector)
          </div>
          <div class="col bg-subpanel rounded-borders q-pa-sm text-caption" style="overflow-x: auto; white-space: pre-wrap;">
            <template v-if="metrics.latestProcessedEvent">
              <span class="text-purple-3">Event:</span> {{ metrics.latestProcessedEvent.event }}
              <br/>
              <span class="text-purple-3">Priority:</span> <q-badge color="purple-9" text-color="white">{{ metrics.latestProcessedEvent.priority || 'NORMAL' }}</q-badge>
              <br/>
              <span class="text-purple-3">ID:</span> {{ metrics.latestProcessedEvent.eventId }}
              <br/>
              <span class="text-purple-3">Seq:</span> {{ metrics.latestProcessedEvent.sequenceNumber }}
              <br/>
              <span class="text-purple-3">Correlation:</span> {{ metrics.latestProcessedEvent.correlationId }}
              <br/>
              <span class="text-purple-3">Tenant:</span> {{ metrics.latestProcessedEvent.tenantId }}
              <br/><br/>
              <span class="text-grey-5">// Payload Snapshot</span><br/>
              <span class="text-green-3">{{ JSON.stringify(metrics.latestProcessedEvent.payload, null, 2) }}</span>
            </template>
            <template v-else>
              <div class="text-grey-6 text-center q-mt-lg">Waiting for events...</div>
            </template>
          </div>
        </q-card>
      </div>

      <!-- LIVE KERNEL TIMELINE -->
      <div class="col-12 col-md-6">
        <q-card class="bg-panel border-main fit q-pa-md column">
          <div class="text-subtitle2 text-amber-3 q-mb-md font-sans">
            <q-icon name="list_alt" /> Live Kernel Timeline
          </div>
          <q-scroll-area class="col bg-subpanel rounded-borders q-pa-sm" style="height: 250px;">
            <div v-for="(log, idx) in metrics.timeline" :key="idx" class="text-caption q-mb-xs">
              <span class="text-grey-5">[{{ log.time }}]</span> 
              <span :class="{
                'text-cyan-3': log.type === 'info',
                'text-amber-4': log.type === 'warn',
                'text-red-4': log.type === 'error'
              }">{{ log.message }}</span>
            </div>
            <div v-if="metrics.timeline.length === 0" class="text-grey-6 text-center q-mt-lg">
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
.bg-panel { background: #0d1b2a; }
.bg-subpanel { background: #091320; }
.border-main { border: 1px solid #16324a; }
.hover-lift { transition: transform 0.2s; }
.hover-lift:hover { transform: translateY(-2px); border-color: #00b8ff; }
</style>
