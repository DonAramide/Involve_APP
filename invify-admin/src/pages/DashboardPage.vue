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
          Stream Topic: <span class="text-main q-ml-xs">quasar.{{ activeWorkspace }}.{{ activeSubModeName }}.*</span>
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
import { ref, computed, inject, watch } from 'vue'
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

const observabilitySubMode = computed(() => {
  if (route.path.endsWith('/streams')) return 'streams'
  if (route.path.endsWith('/metrics')) return 'metrics'
  if (route.path.endsWith('/queues')) return 'queues'
  if (route.path.endsWith('/websocket-health')) return 'websocket-health'
  if (route.path.endsWith('/pipelines')) return 'pipelines'
  return 'default'
})

const financeSubMode = computed(() => {
  if (route.path.endsWith('/payouts')) return 'payouts'
  if (route.path.endsWith('/card-telemetry')) return 'card-telemetry'
  if (route.path.endsWith('/cross-tenant')) return 'cross-tenant'
  return 'default'
})

const activeSubModeName = computed(() => {
  if (activeWorkspace.value === 'fleet') {
    return fleetSubMode.value !== 'default' ? fleetSubMode.value : 'telemetry'
  }
  if (activeWorkspace.value === 'observability') {
    return observabilitySubMode.value !== 'default' ? observabilitySubMode.value : 'streams'
  }
  if (activeWorkspace.value === 'finance') {
    return financeSubMode.value !== 'default' ? financeSubMode.value : 'payouts'
  }
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

  if (activeWorkspace.value === 'observability') {
    const subModeMap = {
      streams: 'Live Event Streams',
      metrics: 'Telemetry Metrics',
      queues: 'Queue Health Maps',
      'websocket-health': 'WebSocket Diagnostics',
      pipelines: 'Ingestion Pipelines'
    }
    return subModeMap[observabilitySubMode.value] || 'Observability'
  }

  if (activeWorkspace.value === 'finance') {
    const subModeMap = {
      payouts: 'Global Payout Escrow',
      'card-telemetry': 'Card Telemetry Matrix',
      'cross-tenant': 'Cross-Tenant Audits'
    }
    return subModeMap[financeSubMode.value] || 'Finance Operations'
  }

  if (activeWorkspace.value === 'incidents') {
    return 'Incident Response'
  }

  const map = {
    observability: 'Observability',
    fleet: 'Fleet Operations',
    finance: 'Finance Operations',
    governance: 'Governance',
    ai: 'AI Operations',
    incidents: 'Incident Response'
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

  if (activeWorkspace.value === 'observability') {
    if (observabilitySubMode.value === 'streams') {
      return {
        kpi1: { label: 'Stream Influx', value: throughputEps.value || '4.8', unit: 'eps', sub: 'Peak buffer: 14.2 MB/s', border: 'border-cyan-left', dot: 'pulse-healthy' },
        kpi2: { label: 'Active Topics', value: '3', unit: 'streams', sub: 'Topics: wallet, fleet, reconciliation', border: 'border-indigo-left', icon: 'rss_feed' },
        kpi3: { label: 'Stream Warnings', value: String(warningEventsCount.value), unit: '', sub: 'Stale packets in window', border: 'border-amber-left', dot: 'pulse-warning' },
        kpi4: { label: 'Corrupt Packets Rejected', value: String(criticalEventsCount.value), unit: 'drops', sub: 'Schema verification check failed', border: 'border-red-left', dot: 'pulse-critical' }
      }
    }
    if (observabilitySubMode.value === 'metrics') {
      return {
        kpi1: { label: 'Ingested Telemetry Packets', value: '254k', unit: 'packets', sub: 'Aggregated historical rollup', border: 'border-cyan-left', dot: 'pulse-healthy' },
        kpi2: { label: 'Polled Datapoints', value: '142', unit: 'metrics', sub: 'CPU, RAM, Signal Strength, etc.', border: 'border-indigo-left', icon: 'query_stats' },
        kpi3: { label: 'Drift Alerts', value: '2', unit: 'anomalies', sub: 'Active baseline deviations', border: 'border-amber-left', dot: 'pulse-warning' },
        kpi4: { label: 'Out of Bounds Violations', value: '0', unit: 'critical', sub: 'Absolute threshold violations', border: 'border-red-left', dot: 'pulse-healthy' }
      }
    }
    if (observabilitySubMode.value === 'queues') {
      return {
        kpi1: { label: 'Queue Load', value: '12%', unit: 'capacity', sub: 'Processing capacity: 10k/sec', border: 'border-cyan-left', dot: 'pulse-healthy' },
        kpi2: { label: 'Active Workers', value: '8', unit: 'threads', sub: 'Consumer partitions: 16 total', border: 'border-indigo-left', icon: 'dns' },
        kpi3: { label: 'Pending Message Lag', value: '14', unit: 'messages', sub: 'Average lag duration: 18ms', border: 'border-amber-left', dot: 'pulse-warning' },
        kpi4: { label: 'Dead Letter locks', value: '1', unit: 'DLQ', sub: 'Traceability exception envelope locked', border: 'border-red-left', dot: 'pulse-critical' }
      }
    }
    if (observabilitySubMode.value === 'websocket-health') {
      return {
        kpi1: { label: 'Duplex Socket Latency', value: '12', unit: 'ms', sub: 'Round-trip ping verification', border: 'border-cyan-left', dot: 'pulse-healthy' },
        kpi2: { label: 'Active Socket Clients', value: String(activeNodesCount.value), unit: 'clients', sub: 'Persistent channel tunnels active', border: 'border-indigo-left', icon: 'swap_calls' },
        kpi3: { label: 'Transient Disconnects', value: '0', unit: 'warnings', sub: 'Keepalive heartbeat stable', border: 'border-amber-left', dot: 'pulse-healthy' },
        kpi4: { label: 'Hard Socket Resets', value: '1', unit: 'resets', sub: 'Forceful recovery reconnect executed', border: 'border-red-left', dot: 'pulse-critical' }
      }
    }
    if (observabilitySubMode.value === 'pipelines') {
      return {
        kpi1: { label: 'Pipeline Convergence', value: '100%', unit: 'uptime', sub: 'Ingestion channels nominal', border: 'border-cyan-left', dot: 'pulse-healthy' },
        kpi2: { label: 'Active Transforms', value: '6', unit: 'filters', sub: 'Zero-touch payload verification', border: 'border-indigo-left', icon: 'filter_alt' },
        kpi3: { label: 'Schema Drift Warnings', value: '3', unit: 'warnings', sub: 'Coerced type assertions in pipeline', border: 'border-amber-left', dot: 'pulse-warning' },
        kpi4: { label: 'Dropped Ingestion Frames', value: '1', unit: 'drops', sub: 'Corrupted telemetry records', border: 'border-red-left', dot: 'pulse-critical' }
      }
    }
  }

  if (activeWorkspace.value === 'incidents') {
    return {
      kpi1: { label: 'SLA Status', value: '99.2%', unit: 'ratio', sub: 'Target operational SLA: 99.9%', border: 'border-cyan-left', dot: 'pulse-healthy' },
      kpi2: { label: 'Active Alerts', value: '1', unit: 'active', sub: 'Reconciliation queue lockout', border: 'border-indigo-left', icon: 'warning' },
      kpi3: { label: 'Acknowledged Incidents', value: '0', unit: 'resolved', sub: 'Awaiting operator review', border: 'border-amber-left', dot: 'pulse-healthy' },
      kpi4: { label: 'Unresolved Critical Alerts', value: '1', unit: 'locks', sub: 'Temporal state drift failure', border: 'border-red-left', dot: 'pulse-critical' }
    }
  }

  if (activeWorkspace.value === 'finance') {
    if (financeSubMode.value === 'payouts') {
      return {
        kpi1: { label: 'Pending Settlement', value: '₦ 89.2M', unit: 'Escrow', sub: 'T+0 & T+1 Processing', border: 'border-cyan-left', dot: 'pulse-healthy' },
        kpi2: { label: 'Cleared Today', value: '₦ 412M', unit: 'Paid', sub: 'Successful disbursements', border: 'border-indigo-left', icon: 'payments' },
        kpi3: { label: 'Held Funds', value: '₦ 1.2M', unit: 'Locked', sub: 'Awaiting manual clearing', border: 'border-amber-left', dot: 'pulse-warning' },
        kpi4: { label: 'Failed Transfers', value: '2', unit: 'Drops', sub: 'Bank network API timeouts', border: 'border-red-left', dot: 'pulse-critical' }
      }
    }
    if (financeSubMode.value === 'card-telemetry') {
      return {
        kpi1: { label: 'Auth Success Rate', value: '98.4%', unit: 'Rate', sub: 'Network average: 97.2%', border: 'border-cyan-left', dot: 'pulse-healthy' },
        kpi2: { label: 'Live Transactions', value: '142', unit: 'TPS', sub: 'Peak volume threshold', border: 'border-indigo-left', icon: 'credit_card' },
        kpi3: { label: 'High-Risk Flags', value: '14', unit: 'Holds', sub: 'Fraud engine interceptions', border: 'border-amber-left', dot: 'pulse-warning' },
        kpi4: { label: 'Gateway Declines', value: '3', unit: 'Fails', sub: 'Hard network rejections', border: 'border-red-left', dot: 'pulse-critical' }
      }
    }
    if (financeSubMode.value === 'cross-tenant') {
      return {
        kpi1: { label: 'Analyzed Transfers', value: '14.2k', unit: 'Scans', sub: 'Cross-boundary validation', border: 'border-cyan-left', dot: 'pulse-healthy' },
        kpi2: { label: 'Ledger Parity', value: '100%', unit: 'Match', sub: 'Double-entry books balanced', border: 'border-indigo-left', icon: 'fact_check' },
        kpi3: { label: 'Orphaned Records', value: '4', unit: 'Anomalies', sub: 'Pending trace investigation', border: 'border-amber-left', dot: 'pulse-warning' },
        kpi4: { label: 'Double Spend Risks', value: '0', unit: 'Blocks', sub: 'Cryptographic lock intact', border: 'border-red-left', dot: 'pulse-healthy' }
      }
    }
  }

  // Default (Fallback)
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

// Dynamic enterprise logging entries pushed from the live WebSocket layer
const allGridRows = ref([])

// Map raw incoming WebSocket payloads to the unified grid schema dynamically
watch(lastEventPayload, (newPayload) => {
  if (newPayload) {
    allGridRows.value.unshift({
      id: newPayload.id || `evt_${Date.now()}_${Math.random()}`,
      created_at: newPayload.timestamp || new Date().toISOString(),
      severity: newPayload.severity || 'info',
      type: newPayload.topic || 'unknown_event',
      amount: newPayload.payload?.throughput_metric || newPayload.payload?.amount || 0,
      provider: 'quasar_live_stream',
      description: JSON.stringify(newPayload.payload) || 'Raw event stream ingested',
      workspace: activeWorkspace.value,
      subMode: activeSubModeName.value
    })
    
    // Prune old logs to prevent memory leaks in the browser tab
    if (allGridRows.value.length > 500) {
      allGridRows.value.pop()
    }
  }
})

// Filter grid rows contextually based on Workspace isolation selection to prevent operator context clash
const filteredGridRows = computed(() => {
  if (activeWorkspace.value === 'observability') {
    if (observabilitySubMode.value !== 'default') {
      return allGridRows.value.filter(r => r.workspace === 'observability' && r.subMode === observabilitySubMode.value)
    }
    return allGridRows.value.filter(r => r.workspace === 'observability')
  }

  if (activeWorkspace.value === 'fleet') {
    if (fleetSubMode.value !== 'default') {
      return allGridRows.value.filter(r => r.workspace === 'fleet' && r.subMode === fleetSubMode.value)
    }
    return allGridRows.value.filter(r => r.workspace === 'fleet')
  }

  if (activeWorkspace.value === 'incidents') {
    return allGridRows.value.filter(r => r.workspace === 'incidents')
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
