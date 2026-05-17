<!-- invify-admin/src/pages/DashboardPage.vue -->
<template>
  <q-page class="q-pa-md bg-main text-main">
    
    <!-- Top Operator Context Overview & Domain Filters Splitter -->
    <div class="row items-center justify-between q-mb-md no-wrap border-bottom q-pb-sm">
      <div class="row items-center op-gap-12 no-wrap">
        <div>
          <div class="text-operator-title text-muted">Operational Context</div>
          <div class="text-h6 text-main text-weight-bold" style="line-height: 1.2;">
            {{ activeWorkspaceLabel }} Monitoring Engine
          </div>
        </div>
        <q-chip dense color="blue-grey-10" text-color="blue-5" class="text-metric-sm q-ma-none v-hide-xs">
          Stream Topic: <span class="text-main q-ml-xs">quasar.{{ activeWorkspace }}.telemetry.*</span>
        </q-chip>
      </div>

      <div class="row items-center op-gap-8 no-wrap">
        <q-btn 
          outline 
          size="xs" 
          color="grey-6" 
          icon="refresh" 
          label="Re-Ingest" 
          @click="refreshTelemetry" 
          class="text-caption text-weight-bold"
        />
        <q-btn 
          size="xs" 
          color="cyan-4" 
          icon="cloud_download" 
          label="Export Logs" 
          class="text-caption text-weight-bold text-black"
        />
      </div>
    </div>

    <!-- Live Telemetry KPI Flat Panels Grid -->
    <div class="row q-col-gutter-sm q-mb-md">
      <!-- KPI 1: Telemetry Ingestion Throughput -->
      <div class="col-12 col-sm-6 col-md-3">
        <div class="enterprise-panel op-pa-8 full-height column justify-between border-cyan-left bg-panel">
          <div class="row items-center justify-between no-wrap q-mb-xs">
            <span class="text-operator-title text-muted">Ingestion Rate</span>
            <span class="live-indicator-dot pulse-healthy"></span>
          </div>
          <div class="text-h4 text-metric-mono text-main">
            {{ throughputEps }} <span class="text-caption text-muted">eps</span>
          </div>
          <div class="text-caption text-muted q-mt-xs" style="font-size: 10px;">
            Peak buffer utilization: <span class="text-main">14.2 MB/s</span>
          </div>
        </div>
      </div>

      <!-- KPI 2: Total Connected Operators & Instances -->
      <div class="col-12 col-sm-6 col-md-3">
        <div class="enterprise-panel op-pa-8 full-height column justify-between border-indigo-left bg-panel">
          <div class="row items-center justify-between no-wrap q-mb-xs">
            <span class="text-operator-title text-muted">Active Fleet Nodes</span>
            <q-icon name="devices" color="indigo-4" size="xs" />
          </div>
          <div class="text-h4 text-metric-mono text-blue-5">
            {{ activeNodesCount }} <span class="text-caption text-muted">/ 18</span>
          </div>
          <div class="text-caption text-muted q-mt-xs" style="font-size: 10px;">
            Edge deployment distribution: <span class="text-main">99.8% stable</span>
          </div>
        </div>
      </div>

      <!-- KPI 3: System Drift Exceptions (Severity Warning mapped) -->
      <div class="col-12 col-sm-6 col-md-3">
        <div class="enterprise-panel op-pa-8 full-height column justify-between border-amber-left bg-panel">
          <div class="row items-center justify-between no-wrap q-mb-xs">
            <span class="text-operator-title text-muted">Active Warnings</span>
            <span class="live-indicator-dot pulse-warning"></span>
          </div>
          <div class="text-h4 text-metric-mono text-amber-5">
            {{ warningEventsCount }}
          </div>
          <div class="text-caption text-muted q-mt-xs" style="font-size: 10px;">
            Drift severity index: <span class="text-amber-5">ELEVATED</span>
          </div>
        </div>
      </div>

      <!-- KPI 4: Critical Execution Rollbacks (Severity Critical mapped) -->
      <div class="col-12 col-sm-6 col-md-3">
        <div class="enterprise-panel op-pa-8 full-height column justify-between border-red-left bg-panel">
          <div class="row items-center justify-between no-wrap q-mb-xs">
            <span class="text-operator-title text-muted">Critical Rollbacks</span>
            <span class="live-indicator-dot pulse-critical"></span>
          </div>
          <div class="text-h4 text-metric-mono" :class="criticalEventsCount > 0 ? 'text-red-5' : 'text-muted'">
            {{ criticalEventsCount }}
          </div>
          <div class="text-caption text-muted q-mt-xs" style="font-size: 10px;">
            Failed Webhook bridges: <span :class="criticalEventsCount > 0 ? 'text-red-5' : 'text-muted'">{{ criticalEventsCount }} pipeline locks</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Stateful Operational Command Controller Layer -->
    <div class="row q-mb-md">
      <div class="col-12">
        <CommandExecutionMonitor />
      </div>
    </div>

    <!-- DOMAIN GRID DOMINANCE: Virtualized streaming enterprise tables -->
    <div class="row q-col-gutter-md">
      
      <!-- Primary Multi-Column Data Grid -->
      <div class="col-12 col-xl-8">
        <EnterpriseDataGrid 
          :title="`${activeWorkspaceLabel} Live Stream Logs Explorer`"
          subtitle="Incremental WebSocket patching engine active"
          :rows="filteredGridRows"
          :columns="gridColumns"
          row-key="id"
          @preset-changed="handlePresetChange"
        />
      </div>

      <!-- Secondary Split-Pane Subpanel: Real-time Ingested Payload trace tree -->
      <div class="col-12 col-xl-4">
        <div class="enterprise-panel full-height column no-wrap bg-panel">
          <div class="enterprise-subpanel q-pa-sm row items-center justify-between no-wrap border-bottom">
            <div class="row items-center op-gap-4">
              <q-icon name="code" color="blue-5" size="xs" />
              <span class="text-operator-title text-main text-weight-bold">Live Stream Event Trace</span>
            </div>
            <q-badge color="blue-grey-9" text-color="green-3" class="text-metric-sm" v-if="lastEventPayload">
              Ingested
            </q-badge>
          </div>

          <div class="q-pa-sm col-grow overflow-auto" style="max-height: 440px;">
            <div v-if="!lastEventPayload" class="text-center q-pa-lg text-muted text-caption italic">
              Listening for real-time Quasar WebSocket streams... Events will cascade automatically.
            </div>

            <div v-else class="column op-gap-8">
              <div class="bg-subpanel q-pa-xs rounded-borders row items-center justify-between text-caption border-main">
                <span class="text-metric-mono text-secondary">TOPIC: {{ lastEventPayload.topic }}</span>
                <span class="text-metric-sm text-muted">{{ new Date(lastEventPayload.timestamp).toLocaleTimeString() }}</span>
              </div>

              <!-- Stateful severity mapping box -->
              <div class="q-pa-xs rounded-borders text-caption" :class="`severity-${lastEventPayload.severity}`">
                <div class="text-weight-bold text-uppercase" style="font-size: 11px;">
                  Severity Event Marker: {{ lastEventPayload.severity }}
                </div>
              </div>

              <!-- JSON Stringify payload block formatted perfectly for enterprise readability -->
              <div class="bg-main q-pa-xs rounded-borders border-main text-metric-mono text-secondary" style="white-space: pre-wrap; font-size: 11px; overflow-x: auto;">
                {{ JSON.stringify(lastEventPayload.payload, null, 2) }}
              </div>

              <div class="text-operator-title text-muted q-mt-xs">Active Event Pipeline Subscriptions</div>
              <div class="row op-gap-4 items-center">
                <q-chip dense size="xs" color="blue-grey-9" text-color="cyan-3" label="quasar.wallet.transfers" />
                <q-chip dense size="xs" color="blue-grey-9" text-color="indigo-3" label="invify.fleet.telemetry" />
                <q-chip dense size="xs" color="blue-grey-9" text-color="amber-3" label="quasar.reconciliation.lock" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, inject } from 'vue'
import EnterpriseDataGrid from '../components/grid/EnterpriseDataGrid.vue'
import CommandExecutionMonitor from '../components/commands/CommandExecutionMonitor.vue'
import { useTelemetryStream } from '../composables/useTelemetryStream'

// Inject active Workspace context parameter cleanly
const activeWorkspace = inject('activeWorkspace', ref('observability'))

const activeWorkspaceLabel = computed(() => {
  const map = {
    observability: 'Observability',
    fleet: 'Fleet Operations',
    finance: 'Finance Operations',
    governance: 'Governance',
    ai: 'AI Operations'
  }
  return map[activeWorkspace.value] || 'Operations'
})

// Hook real-time websocket metrics engine
const { throughputEps, lastEventPayload } = useTelemetryStream('quasar.stream.telemetry')

// Dynamic simulated counters reflecting ingestion metrics
const activeNodesCount = ref(14)
const warningEventsCount = ref(3)
const criticalEventsCount = ref(1)

const refreshTelemetry = () => {
  // Rotate counters gently to demonstrate active state updates
  activeNodesCount.value = Math.floor(Math.random() * 4) + 13
  warningEventsCount.value = Math.floor(Math.random() * 4) + 1
  criticalEventsCount.value = Math.random() > 0.5 ? 1 : 0
}

// Master grid layout columns configuration
const gridColumns = [
  { name: 'timestamp', label: 'INGESTED', field: 'created_at', align: 'left', format: val => new Date(val).toLocaleTimeString() },
  { name: 'severity', label: 'SEVERITY', field: 'severity', align: 'center' },
  { name: 'type', label: 'EVENT TYPE', field: 'type', align: 'left' },
  { name: 'amount', label: 'METRIC / VALUE', field: 'amount', align: 'right' },
  { name: 'provider', label: 'PROVIDER', field: 'provider', align: 'center' },
  { name: 'narrative', label: 'LOG TRACE NARRATIVE', field: 'description', align: 'left' }
]

// Pure enterprise mock logging entries covering all workspaces robustly
const allGridRows = ref([
  {
    id: 'row-ai-1',
    created_at: new Date(Date.now() - 1200).toISOString(),
    severity: 'healthy',
    type: 'ai_lesson_cache_hit',
    amount: 1420,
    provider: 'ai_edge_cache',
    description: 'AI Lesson Note Generation: Topic "Thermodynamics & Energy States" directly served from global edge cache.\n• Subject: Advanced Physics\n• Class: SS2 Science\n• Bypassed LLM inference layers saving 1,420 tokens.\n• Integrity Verification: AI Signature Validated.',
    workspace: 'observability',
    operator: 'cache_router'
  },
  {
    id: 'row-ai-2',
    created_at: new Date(Date.now() - 2800).toISOString(),
    severity: 'info',
    type: 'ai_lesson_generation',
    amount: 3850,
    provider: 'ai_engine',
    description: 'AI Lesson Note Generation: Prompt synthetic pipeline completed successfully.\n• Subject: Literature in English\n• Topic: Elizabethan Sonnets\n• Term: 2 • Week: 4\n• Payload generated with structured curriculum sections, interactive quiz matrices, and strict compliance headers.',
    workspace: 'observability',
    operator: 'sysadmin@IIPS.app'
  },
  {
    id: 'row-1',
    created_at: new Date(Date.now() - 4000).toISOString(),
    severity: 'critical',
    type: 'webhook_lock_timeout',
    amount: 5400,
    provider: 'quasar',
    description: 'Reconciliation webhook queue execution timed out waiting for state lock confirmation.',
    workspace: 'observability',
    operator: 'sysadmin@IIPS.app'
  },
  {
    id: 'row-2',
    created_at: new Date(Date.now() - 15000).toISOString(),
    severity: 'healthy',
    type: 'device_activation_sync',
    amount: 1,
    provider: 'fleet_engine',
    description: 'Hardware endpoint handshake completed successfully. OTA profile verified.',
    workspace: 'fleet',
    operator: 'auto_provisioner'
  },
  {
    id: 'row-3',
    created_at: new Date(Date.now() - 25000).toISOString(),
    severity: 'warning',
    type: 'ledger_drift_detected',
    amount: 250,
    provider: 'quasar',
    description: 'Minor ledger temporal mismatch logged between parent treasury and active subaccount.',
    workspace: 'finance',
    operator: 'bursar_daemon'
  },
  {
    id: 'row-4',
    created_at: new Date(Date.now() - 42000).toISOString(),
    severity: 'healthy',
    type: 'virtual_account_inflow',
    amount: 150000,
    provider: 'quasar',
    description: 'Static dedicated virtual account NUBAN registered direct transfer deposit.',
    workspace: 'finance',
    operator: 'providus_bridge'
  },
  {
    id: 'row-5',
    created_at: new Date(Date.now() - 60000).toISOString(),
    severity: 'info',
    type: 'tenant_quota_compaction',
    amount: 12,
    provider: 'governance',
    description: 'AI generation metrics archived to block storage layer to preserve active memory arrays.',
    workspace: 'governance',
    operator: 'storage_controller'
  },
  {
    id: 'row-6',
    created_at: new Date(Date.now() - 95000).toISOString(),
    severity: 'healthy',
    type: 'note_digitization_batch',
    amount: 42,
    provider: 'ai_engine',
    description: 'Curriculum layout parser finalized markdown syntax conversion strings.',
    workspace: 'ai',
    operator: 'teacher_session'
  }
])

// Filter grid rows contextually based on Workspace isolation selection to prevent operator context clash
const filteredGridRows = computed(() => {
  // If active Workspace is 'observability', show all system logs for comprehensive oversight
  if (activeWorkspace.value === 'observability') return allGridRows.value
  return allGridRows.value.filter(r => r.workspace === activeWorkspace.value)
})

const handlePresetChange = (preset) => {
  // Logic hook if parent needs side-effect tracking
}
</script>

<style scoped>
.border-bottom { border-bottom: 1px solid var(--enterprise-border); }
.border-muted { border: 1px solid var(--enterprise-border); }

/* Muted left border flags for KPI readouts */
.border-cyan-left { border-left: 2px solid #22b8cf !important; }
.border-indigo-left { border-left: 2px solid #7048e8 !important; }
.border-amber-left { border-left: 2px solid #fcc419 !important; }
.border-red-left { border-left: 2px solid #c92a2a !important; }

@media (max-width: 600px) {
  .v-hide-xs { display: none !important; }
}
</style>
