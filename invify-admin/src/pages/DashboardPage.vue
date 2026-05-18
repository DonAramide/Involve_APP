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
          Stream Topic: <span class="text-main q-ml-xs">quasar.{{ activeWorkspace }}.{{ fleetSubMode !== 'default' ? fleetSubMode : 'telemetry' }}.*</span>
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
      <!-- KPI 1 -->
      <div class="col-12 col-sm-6 col-md-3">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel" :class="kpiCards.kpi1.border">
          <div class="row items-center justify-between no-wrap q-mb-xs">
            <span class="text-operator-title text-muted">{{ kpiCards.kpi1.label }}</span>
            <span class="live-indicator-dot" :class="kpiCards.kpi1.dot"></span>
          </div>
          <div class="text-h4 text-metric-mono text-main">
            {{ kpiCards.kpi1.value }} <span class="text-caption text-muted">{{ kpiCards.kpi1.unit }}</span>
          </div>
          <div class="text-caption text-muted q-mt-xs" style="font-size: 10px;">
            {{ kpiCards.kpi1.sub }}
          </div>
        </div>
      </div>

      <!-- KPI 2 -->
      <div class="col-12 col-sm-6 col-md-3">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel" :class="kpiCards.kpi2.border">
          <div class="row items-center justify-between no-wrap q-mb-xs">
            <span class="text-operator-title text-muted">{{ kpiCards.kpi2.label }}</span>
            <q-icon v-if="kpiCards.kpi2.icon" :name="kpiCards.kpi2.icon" color="indigo-4" size="xs" />
          </div>
          <div class="text-h4 text-metric-mono text-blue-5">
            {{ kpiCards.kpi2.value }} <span class="text-caption text-muted">{{ kpiCards.kpi2.unit }}</span>
          </div>
          <div class="text-caption text-muted q-mt-xs" style="font-size: 10px;">
            {{ kpiCards.kpi2.sub }}
          </div>
        </div>
      </div>

      <!-- KPI 3 -->
      <div class="col-12 col-sm-6 col-md-3">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel" :class="kpiCards.kpi3.border">
          <div class="row items-center justify-between no-wrap q-mb-xs">
            <span class="text-operator-title text-muted">{{ kpiCards.kpi3.label }}</span>
            <span class="live-indicator-dot" :class="kpiCards.kpi3.dot || 'pulse-warning'"></span>
          </div>
          <div class="text-h4 text-metric-mono text-amber-5">
            {{ kpiCards.kpi3.value }} <span class="text-caption text-muted">{{ kpiCards.kpi3.unit }}</span>
          </div>
          <div class="text-caption text-muted q-mt-xs" style="font-size: 10px;">
            {{ kpiCards.kpi3.sub }}
          </div>
        </div>
      </div>

      <!-- KPI 4 -->
      <div class="col-12 col-sm-6 col-md-3">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel" :class="kpiCards.kpi4.border">
          <div class="row items-center justify-between no-wrap q-mb-xs">
            <span class="text-operator-title text-muted">{{ kpiCards.kpi4.label }}</span>
            <span class="live-indicator-dot" :class="kpiCards.kpi4.dot || 'pulse-critical'"></span>
          </div>
          <div class="text-h4 text-metric-mono text-main">
            {{ kpiCards.kpi4.value }} <span class="text-caption text-muted">{{ kpiCards.kpi4.unit }}</span>
          </div>
          <div class="text-caption text-muted q-mt-xs" style="font-size: 10px;">
            {{ kpiCards.kpi4.sub }}
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
import { useRoute } from 'vue-router'
import EnterpriseDataGrid from '../components/grid/EnterpriseDataGrid.vue'
import CommandExecutionMonitor from '../components/commands/CommandExecutionMonitor.vue'
import { useTelemetryStream } from '../composables/useTelemetryStream'

// Inject active Workspace context parameter cleanly
const activeWorkspace = inject('activeWorkspace', ref('observability'))
const route = useRoute()

const fleetSubMode = computed(() => {
  if (route.path.endsWith('/presence')) return 'presence'
  if (route.path.endsWith('/groups')) return 'groups'
  if (route.path.endsWith('/enrollment')) return 'enrollment'
  if (route.path.endsWith('/telemetry')) return 'telemetry'
  if (route.path.endsWith('/actions')) return 'actions'
  return 'default'
})

const activeWorkspaceLabel = computed(() => {
  if (activeWorkspace.value === 'fleet') {
    const subModeMap = {
      presence: 'Live Presence Map',
      groups: 'Device Groups Array',
      enrollment: 'Enrollment Pipelines',
      telemetry: 'Fleet Telemetry Grid',
      actions: 'Remote Action Controls'
    }
    return subModeMap[fleetSubMode.value] || 'Fleet Operations'
  }

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

const kpiCards = computed(() => {
  if (activeWorkspace.value === 'fleet') {
    if (fleetSubMode.value === 'presence') {
      return {
        kpi1: { label: 'Triangulation Influx', value: '8.4', unit: 'pps', sub: 'Signal latency: 12ms', border: 'border-cyan-left', dot: 'pulse-healthy' },
        kpi2: { label: 'Active Edge Nodes', value: '14', unit: '/ 18', sub: 'Locations: Lagos, Abuja, London', border: 'border-indigo-left', icon: 'radar' },
        kpi3: { label: 'Presence Warnings', value: '0', unit: '', sub: 'Triangulation anomalies: None', border: 'border-amber-left', dot: 'pulse-healthy' },
        kpi4: { label: 'Signal Degradations', value: '0', unit: 'drops', sub: 'Cellular tower handshakes stable', border: 'border-red-left', dot: 'pulse-healthy' }
      }
    }
    if (fleetSubMode.value === 'groups') {
      return {
        kpi1: { label: 'Active Cohorts', value: '4', unit: 'groups', sub: 'Canary, Beta, Staging, Stable', border: 'border-cyan-left', dot: 'pulse-healthy' },
        kpi2: { label: 'Nodes Configured', value: '14', unit: '/ 14', sub: 'Group membership: 100% mapped', border: 'border-indigo-left', icon: 'group_work' },
        kpi3: { label: 'Pending Migrations', value: '0', unit: '', sub: 'Dynamic balance updates: Stable', border: 'border-amber-left', dot: 'pulse-healthy' },
        kpi4: { label: 'Policy Drift Mismatches', value: '0', unit: 'errors', sub: 'Security configurations compliant', border: 'border-red-left', dot: 'pulse-healthy' }
      }
    }
    if (fleetSubMode.value === 'enrollment') {
      return {
        kpi1: { label: 'Enrolled Devices', value: '18', unit: 'nodes', sub: 'Zero-touch provisioning active', border: 'border-cyan-left', dot: 'pulse-healthy' },
        kpi2: { label: 'Active Setup Pipelines', value: '2', unit: 'pipelines', sub: 'Android POS & IoT Gateway templates', border: 'border-indigo-left', icon: 'how_to_reg' },
        kpi3: { label: 'Failed Bootstraps', value: '0', unit: '', sub: 'Key injection pipeline: Compliant', border: 'border-amber-left', dot: 'pulse-healthy' },
        kpi4: { label: 'Staged Cancellations', value: '0', unit: 'cancels', sub: 'Awaiting operator authorization: None', border: 'border-red-left', dot: 'pulse-healthy' }
      }
    }
    if (fleetSubMode.value === 'telemetry') {
      return {
        kpi1: { label: 'Packet Ingest Rate', value: '248k', unit: 'pps', sub: 'High-frequency telemetry stream', border: 'border-cyan-left', dot: 'pulse-healthy' },
        kpi2: { label: 'Signals Checked', value: '12', unit: 'signals', sub: 'CPU Temp, RAM, Signal Strength, etc.', border: 'border-indigo-left', icon: 'show_chart' },
        kpi3: { label: 'Thermal Drift Warnings', value: '3', unit: 'warnings', sub: 'Thermal throttling warning threshold', border: 'border-amber-left', dot: 'pulse-warning' },
        kpi4: { label: 'Critical Packet Drops', value: '1', unit: 'drops', sub: 'Buffer packet overflows: Minimal', border: 'border-red-left', dot: 'pulse-critical' }
      }
    }
    if (fleetSubMode.value === 'actions') {
      return {
        kpi1: { label: 'Executed Commands', value: '42', unit: 'actions', sub: 'Diagnostics, reboots, token resets', border: 'border-cyan-left', dot: 'pulse-healthy' },
        kpi2: { label: 'Operator Approvals', value: '100%', unit: 'RBAC', sub: 'Elevation authorizations cleared', border: 'border-indigo-left', icon: 'terminal' },
        kpi3: { label: 'Queued Actions', value: '0', unit: 'pending', sub: 'Awaiting execution window: None', border: 'border-amber-left', dot: 'pulse-healthy' },
        kpi4: { label: 'Action Exceptions', value: '0', unit: 'errors', sub: 'Zero-touch script execution perfect', border: 'border-red-left', dot: 'pulse-healthy' }
      }
    }
  }

  // Default (Observability)
  return {
    kpi1: { label: 'Ingestion Rate', value: throughputEps.value || '4.2', unit: 'eps', sub: 'Peak buffer utilization: 14.2 MB/s', border: 'border-cyan-left', dot: 'pulse-healthy' },
    kpi2: { label: 'Active Fleet Nodes', value: activeNodesCount.value, unit: '/ 18', sub: 'Edge deployment distribution: 99.8% stable', border: 'border-indigo-left', icon: 'devices' },
    kpi3: { label: 'Active Warnings', value: warningEventsCount.value, unit: '', sub: 'Drift severity index: ELEVATED', border: 'border-amber-left', dot: 'pulse-warning' },
    kpi4: { label: 'Critical Rollbacks', value: criticalEventsCount.value, unit: 'locks', sub: `${criticalEventsCount.value} pipeline locks`, border: 'border-red-left', dot: 'pulse-critical' }
  }
})

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
  // --- PRESENCE SUB-MODE ROWS ---
  {
    id: 'row-presence-1',
    created_at: new Date(Date.now() - 1000).toISOString(),
    severity: 'healthy',
    type: 'triangulation_success',
    amount: 3,
    provider: 'gps_triangulator',
    description: 'Triangulated edge terminal coordinates across 3 cellular base station signal vectors.\n• Triangulated Margin of Error: ±4.2 meters\n• Triangulation Integrity check: Verified',
    workspace: 'fleet',
    subMode: 'presence',
    operator: 'gps_daemon'
  },
  {
    id: 'row-presence-2',
    created_at: new Date(Date.now() - 5000).toISOString(),
    severity: 'info',
    type: 'presence_ping',
    amount: 142,
    provider: 'presence_broker',
    description: 'Edge node presence ping received. Session active.\n• Terminal ID: DSPREAD-POS-80MM-0091\n• Latency: 12ms over HTTPS Websocket.',
    workspace: 'fleet',
    subMode: 'presence',
    operator: 'presence_daemon'
  },

  // --- GROUPS SUB-MODE ROWS ---
  {
    id: 'row-groups-1',
    created_at: new Date(Date.now() - 2000).toISOString(),
    severity: 'healthy',
    type: 'cohort_sync_complete',
    amount: 14,
    provider: 'cohort_manager',
    description: 'Cohort deployment synchronization complete. Target rules confirmed.\n• Cohort Name: Lagos-POS-Terminals-Stable\n• Edges Verified: 14 / 14 nodes.',
    workspace: 'fleet',
    subMode: 'groups',
    operator: 'group_sync_service'
  },
  {
    id: 'row-groups-2',
    created_at: new Date(Date.now() - 8000).toISOString(),
    severity: 'info',
    type: 'group_membership_bind',
    amount: 1,
    provider: 'cohort_manager',
    description: 'Bound edge device to target group dynamically.\n• Device: DSPREAD-POS-XM1AJQUMM-1339\n• Target Group: Abuja-Beds-Retail-Beta.',
    workspace: 'fleet',
    subMode: 'groups',
    operator: 'sysadmin@IIPS.app'
  },

  // --- ENROLLMENT SUB-MODE ROWS ---
  {
    id: 'row-enroll-1',
    created_at: new Date(Date.now() - 1500).toISOString(),
    severity: 'healthy',
    type: 'bootstrap_complete',
    amount: 200,
    provider: 'enrollment_pipeline',
    description: 'Zero-touch provisioning bootstrap complete.\n• Injected RSA Public Keys successfully.\n• Local state container deployed. Status: Active.',
    workspace: 'fleet',
    subMode: 'enrollment',
    operator: 'auto_provisioner'
  },
  {
    id: 'row-enroll-2',
    created_at: new Date(Date.now() - 6000).toISOString(),
    severity: 'info',
    type: 'handshake_initiate',
    amount: 1,
    provider: 'enrollment_pipeline',
    description: 'Initial device hardware handshake received. Verifying OEM signature.\n• Device ID: DSPREAD-POS-610011MM-8315\n• Handshake Status: Cleared.',
    workspace: 'fleet',
    subMode: 'enrollment',
    operator: 'auto_provisioner'
  },

  // --- TELEMETRY SUB-MODE ROWS ---
  {
    id: 'row-telem-1',
    created_at: new Date(Date.now() - 500).toISOString(),
    severity: 'warning',
    type: 'thermal_throttling_near',
    amount: 72,
    provider: 'fleet_telemetry',
    description: 'Hardware thermal sensor reports elevated CPU temperature (72°C).\n• Device ID: DSPREAD-POS-XM1AJQUMM-1339\n• Throttling State: Approaching threshold.',
    workspace: 'fleet',
    subMode: 'telemetry',
    operator: 'telemetry_daemon'
  },
  {
    id: 'row-telem-2',
    created_at: new Date(Date.now() - 4000).toISOString(),
    severity: 'healthy',
    type: 'telemetry_packet_flush',
    amount: 128,
    provider: 'fleet_telemetry',
    description: 'Aggregated packet buffers flushed successfully to centralized influx ingestion pipeline.',
    workspace: 'fleet',
    subMode: 'telemetry',
    operator: 'telemetry_daemon'
  },

  // --- ACTIONS SUB-MODE ROWS ---
  {
    id: 'row-actions-1',
    created_at: new Date(Date.now() - 1000).toISOString(),
    severity: 'healthy',
    type: 'command_execution_success',
    amount: 1,
    provider: 'action_orchestrator',
    description: 'Remote command reboot dispatched and completed successfully on target edge.\n• Reboot Context: Routine memory purge sweep.\n• Response Status: OK (0).',
    workspace: 'fleet',
    subMode: 'actions',
    operator: 'sysadmin@IIPS.app'
  },
  {
    id: 'row-actions-2',
    created_at: new Date(Date.now() - 7000).toISOString(),
    severity: 'info',
    type: 'cache_purge_force',
    amount: 1,
    provider: 'action_orchestrator',
    description: 'Dispatched direct WebSocket payload to force local cache purge on terminal.',
    workspace: 'fleet',
    subMode: 'actions',
    operator: 'sysadmin@IIPS.app'
  },

  // --- STANDARD WORKSPACE ROWS ---
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

  if (activeWorkspace.value === 'fleet') {
    if (fleetSubMode.value !== 'default') {
      return allGridRows.value.filter(r => r.workspace === 'fleet' && r.subMode === fleetSubMode.value)
    }
  }

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
