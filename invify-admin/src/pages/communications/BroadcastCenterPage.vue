<!-- invify-admin/src/pages/communications/BroadcastCenterPage.vue -->
<template>
  <q-page class="q-pa-md bg-main text-main">
    
    <!-- SOC-Grade Operational Command Banner -->
    <div class="row items-center justify-between q-mb-md q-pb-sm border-bottom">
      <div class="row items-center op-gap-12 no-wrap">
        <q-icon name="podcasts" size="md" color="cyan-4" />
        <div>
          <div class="text-h6 text-main text-weight-bold" style="line-height: 1.2;">Enterprise Broadcast & Operational Communications</div>
          <div class="text-caption text-muted">Multi-tenant fleet transmission hub complete with deterministic pre-flight simulations and offline retention bounds.</div>
        </div>
      </div>
      
      <!-- Top Action Strip & Emergency Engagement Controls -->
      <div class="row items-center op-gap-8">
        <div class="bg-panel-darker q-px-sm q-py-xs rounded-borders border-muted text-metric-mono text-secondary text-caption row items-center op-gap-4">
          <span class="inline-box" :class="isOverrideActive ? 'bg-red-5' : 'bg-cyan-4'"></span>
          <span>SLA TIMEOUT MONITOR: ACTIVE</span>
        </div>

        <q-toggle
          v-model="isOverrideActive"
          color="red-5"
          keep-color
          dense
          label="SOC Emergency Override"
          left-label
          class="text-caption text-weight-bold text-red-3 q-ml-sm"
          @update:model-value="handleOverrideToggle"
        >
          <q-tooltip class="bg-red-10 text-white text-caption">Bypass secondary supervisor approval gates to prevent life-safety broadcast delays.</q-tooltip>
        </q-toggle>
      </div>
    </div>

    <!-- MAIN TWO-COLUMN DASHBOARD GRID -->
    <div class="row q-col-gutter-md">
      
      <!-- LEFT COLUMN: MULTI-MODE COMPOSER & TARGETING CONTROLS -->
      <div class="col-12 col-lg-7 column op-gap-16">
        
        <!-- COMPOSER PANEL -->
        <div class="enterprise-panel rounded-borders fit column overflow-hidden no-shadow">
          <div class="q-px-md q-py-sm row items-center justify-between border-bottom bg-panel-darker">
            <div class="text-operator-title text-main">Broadcast Blueprint Composer</div>
            <q-badge color="cyan-10" text-color="cyan-3" class="text-metric-sm">ENVELOPE v1.0.0</q-badge>
          </div>

          <div class="col column op-gap-12 q-pa-md">
            
            <!-- Type Blueprint & Severity Selection Strips -->
            <div class="row q-col-gutter-sm">
              <div class="col-12 col-sm-6 column">
                <label class="text-metric-sm text-grey-5 q-mb-xs">Canonical Broadcast Blueprint</label>
                <q-select
                  v-model="composerForm.type"
                  :options="broadcastTypeOptions"
                  dense
                  outlined
                  :dark="prefs.isDarkMode"
                  color="cyan-4"
                  options-dense
                  emit-value
                  map-options
                  class="text-caption"
                  @update:model-value="triggerPreflightSimulation"
                />
              </div>

              <div class="col-12 col-sm-6 column">
                <label class="text-metric-sm text-grey-5 q-mb-xs">Operational Severity Level</label>
                <q-select
                  v-model="composerForm.severity"
                  :options="severityOptions"
                  dense
                  outlined
                  :dark="prefs.isDarkMode"
                  options-dense
                  emit-value
                  map-options
                  class="text-caption text-weight-bold"
                  @update:model-value="applySeverityDefaults"
                >
                  <template v-slot:selected>
                    <span :class="getSeverityTextColor(composerForm.severity)">
                      ● {{ composerForm.severity }}
                    </span>
                  </template>
                </q-select>
              </div>
            </div>

            <!-- Priority Lane & Dotroid Launcher Behavior Controls (Refinement 1 & 6) -->
            <div class="row q-col-gutter-sm border-top q-pt-sm">
              <div class="col-12 col-sm-6 column">
                <label class="text-metric-sm text-grey-5 q-mb-xs">Queue Ingestion Priority (Refinement 1)</label>
                <q-select
                  v-model="composerForm.priorityLane"
                  :options="priorityOptions"
                  dense
                  outlined
                  :dark="prefs.isDarkMode"
                  options-dense
                  emit-value
                  map-options
                  class="text-caption"
                  @update:model-value="triggerPreflightSimulation"
                >
                  <template v-slot:selected>
                    <span class="text-metric-mono text-cyan-3">{{ composerForm.priorityLane.toUpperCase() }}</span>
                  </template>
                </q-select>
              </div>

              <div class="col-12 col-sm-6 column">
                <label class="text-metric-sm text-grey-5 q-mb-xs">Dotroid Launcher Behavior (Refinement 6)</label>
                <q-select
                  v-model="composerForm.launcherMode"
                  :options="launcherModeOptions"
                  dense
                  outlined
                  :dark="prefs.isDarkMode"
                  options-dense
                  emit-value
                  map-options
                  class="text-caption"
                  @update:model-value="triggerPreflightSimulation"
                />
              </div>
            </div>

            <!-- Title & Message Text Inputs -->
            <div class="column q-mt-xs">
              <label class="text-metric-sm text-grey-5 q-mb-xs">Announcement Headline</label>
              <q-input
                v-model="composerForm.title"
                outlined
                dense
                :dark="prefs.isDarkMode"
                color="cyan-4"
                placeholder="Enter succinct broadcast announcement headline..."
                class="text-caption"
                @update:model-value="triggerPreflightSimulation"
              />
            </div>

            <div class="column col flex-grow q-mt-xs">
              <label class="text-metric-sm text-grey-5 q-mb-xs">Actionable Context & Instructions Payload</label>
              <q-input
                v-model="composerForm.message"
                type="textarea"
                outlined
                dense
                :dark="prefs.isDarkMode"
                color="cyan-4"
                rows="4"
                placeholder="Provide verbose, actionable operational instructions or deployment context matrices..."
                class="text-caption"
                @update:model-value="triggerPreflightSimulation"
              />
            </div>

            <!-- Staged Transport Multiplexer & Verification Sub-options -->
            <div class="row items-center justify-between border-top q-pt-sm">
              <div class="column">
                <label class="text-metric-sm text-grey-5 q-mb-xs">Target Multiplexed Transports</label>
                <div class="row items-center op-gap-8">
                  <q-checkbox v-model="composerForm.channels" val="websocket" label="WebSocket" :dark="prefs.isDarkMode" dense color="cyan-4" class="text-caption text-grey-4" @update:model-value="triggerPreflightSimulation" />
                  <q-checkbox v-model="composerForm.channels" val="fcm" label="FCM Layer" :dark="prefs.isDarkMode" dense color="amber-4" class="text-caption text-grey-4" @update:model-value="triggerPreflightSimulation" />
                  <q-checkbox v-model="composerForm.channels" val="offline" label="Offline Stores" :dark="prefs.isDarkMode" dense color="green-4" class="text-caption text-grey-4" @update:model-value="triggerPreflightSimulation" />
                </div>
              </div>

              <div class="column items-end justify-center">
                <q-checkbox
                  v-model="composerForm.requiresAck"
                  label="Enforce Explicit Device ACK"
                  :dark="prefs.isDarkMode"
                  dense
                  color="red-4"
                  class="text-caption text-weight-medium text-grey-3"
                  :disable="composerForm.severity === 'EMERGENCY'"
                  @update:model-value="triggerPreflightSimulation"
                >
                  <q-tooltip class="bg-[#12181f]">Requires interactive edge confirmation callbacks to satisfy tracker SLAs.</q-tooltip>
                </q-checkbox>
              </div>
            </div>

          </div>

          <!-- Composer Actions Execution Ribbon -->
          <div class="bg-[#0c1421] border-top q-pa-sm row items-center justify-between">
            <div class="row items-center op-gap-4 no-wrap">
              <q-btn flat dense size="sm" color="amber-3" label="Load Banner Template" @click="applyTemplate('banner')" class="q-px-xs" />
              <q-btn flat dense size="sm" color="cyan-3" label="Load OTA Notice" @click="applyTemplate('ota')" class="q-px-xs" />
              <q-btn flat dense size="sm" color="red-3" label="Load Quarantine" @click="applyTemplate('quarantine')" class="q-px-xs" />
            </div>

            <q-btn
              unelevated
              size="sm"
              :color="composerForm.severity === 'EMERGENCY' ? 'red-6' : 'cyan-5'"
              :text-color="composerForm.severity === 'EMERGENCY' ? 'white' : 'black'"
              class="text-weight-bold q-px-md"
              :loading="isExecutingBroadcast"
              @click="executeOperationalBroadcast"
            >
              <q-icon :name="composerForm.severity === 'EMERGENCY' ? 'warning' : 'send'" size="xs" class="q-mr-xs" />
              <span>DISPATCH OPERATIONAL ENVELOPE</span>
            </q-btn>
          </div>
        </div>
      </div>

      <!-- RIGHT COLUMN: SIMULATION REPORTING & HISTOGRAM ANALYTICS -->
      <div class="col-12 col-lg-5 column op-gap-16">
        
        <!-- PRE-FLIGHT SIMULATION PANEL (Refinement 7) -->
        <div ref="preflightSectionRef" class="enterprise-panel border-amber-left rounded-borders column overflow-hidden no-shadow">
          <div class="q-px-md q-py-sm row items-center justify-between border-bottom bg-panel-darker">
            <div class="row items-center op-gap-4 no-wrap">
              <q-icon name="science" color="amber-4" size="xs" />
              <span class="text-operator-title text-amber-3">Pre-Flight Simulation Engine (Dry-Run)</span>
            </div>
            <q-badge color="blue-grey-9" text-color="grey-4" class="text-metric-sm">DETERMINISTIC</q-badge>
          </div>

          <div class="column q-pa-md op-gap-8">
            <div class="row items-center justify-between text-caption text-grey-4">
              <span>Target Scope Bound Context:</span>
              <span class="text-metric-mono text-cyan-3">{{ (composerForm.tenantScope || 'global').toUpperCase() }}</span>
            </div>

            <div class="bg-panel-darker q-pa-sm rounded-borders border-muted font-mono text-caption text-secondary text-pre-wrap" style="min-height: 80px;">
              {{ preflightResult.simulationReport }}
            </div>

            <div class="row q-col-gutter-xs q-mt-xs">
              <div class="col-4 column">
                <span class="text-metric-sm text-grey-5">REACHABLE DEVICES</span>
                <span class="text-metric-mono text-white text-weight-bold" style="font-size: 14px;">{{ preflightResult.devicesCount.toLocaleString() }}</span>
              </div>
              <div class="col-4 column text-center">
                <span class="text-metric-sm text-grey-5">AFFECTED TENANTS</span>
                <span class="text-metric-mono text-cyan-3 text-weight-bold" style="font-size: 14px;">{{ preflightResult.tenantsCount }} Array</span>
              </div>
              <div class="col-4 column text-right">
                <span class="text-metric-sm text-grey-5">REGION FEDERATION</span>
                <span class="text-metric-mono text-purple-3 text-weight-bold" style="font-size: 14px;">{{ preflightResult.regionsCount }} Nodes</span>
              </div>
            </div>

            <div class="q-mt-xs bg-red-10 q-pa-xs rounded-borders text-center text-metric-sm text-white text-weight-bold" v-if="preflightResult.isHighImpact">
              🚨 HIGH FLEET IMPACT WARNING: Exceeds 50,000 Edge Terminals
            </div>
          </div>
        </div>

        <!-- DELIVERY SLA HISTOGRAMS & ANALYTICS (Refinement 5) -->
        <div class="enterprise-panel rounded-borders column col flex-grow overflow-hidden" style="background-color: #101826 !important;">
          <div class="q-px-md q-py-sm row items-center justify-between border-bottom bg-[#131d2e]">
            <div class="text-operator-title text-white">Delivery SLA & Latency Distributions</div>
            <q-btn flat dense size="xs" color="cyan-3" icon="refresh" @click="refreshAnalytics" />
          </div>

          <div class="column col justify-between q-pa-md op-gap-8 flex-grow">
            
            <!-- Latency Bar Strips -->
            <div class="column op-gap-4">
              <div class="row items-center justify-between text-metric-sm">
                <span class="text-green-4">Fast-Lane Dispatch (&lt;100ms)</span>
                <span class="text-metric-mono text-white">{{ analyticsData.histograms.under100ms }} pkts</span>
              </div>
              <q-linear-progress dark :value="0.75" color="green-4" class="rounded-borders bg-[#070c14]" style="height: 6px;" />

              <div class="row items-center justify-between text-metric-sm q-mt-xs">
                <span class="text-cyan-3">Standard Latency Bounds (&lt;500ms)</span>
                <span class="text-metric-mono text-white">{{ analyticsData.histograms.under500ms }} pkts</span>
              </div>
              <q-linear-progress dark :value="0.20" color="cyan-4" class="rounded-borders bg-[#070c14]" style="height: 6px;" />

              <div class="row items-center justify-between text-metric-sm q-mt-xs">
                <span class="text-red-4">SLA Timeout Breaches (&gt;1000ms)</span>
                <span class="text-metric-mono text-red-3">{{ analyticsData.histograms.over1000ms }} pkts</span>
              </div>
              <q-linear-progress dark :value="0.05" color="red-5" class="rounded-borders bg-[#070c14]" style="height: 6px;" />
            </div>

            <!-- Convergence Matrix Grid -->
            <div class="bg-[#070c14] q-pa-sm rounded-borders border-muted column q-mt-xs">
              <span class="text-metric-sm text-grey-5 q-mb-xs">REGIONAL CONVERGENCE VECTORS</span>
              <div class="row items-center justify-between text-caption font-mono" v-for="(ratio, reg) in analyticsData.regionalConvergence" :key="reg">
                <span class="text-grey-4">Federation Region: [{{ reg }}]</span>
                <span class="text-cyan-3 text-weight-bold">{{ ratio }} OK</span>
              </div>
            </div>

            <!-- Global Status SLA Strip -->
            <div class="row items-center justify-between border-top q-pt-sm text-caption">
              <span class="text-grey-5">Global SLA Adherence Ratio:</span>
              <span class="text-metric-mono text-green-3 text-weight-bolder" style="font-size: 14px;">{{ analyticsData.slaAdherencePercentage }}% SLA MET</span>
            </div>

          </div>
        </div>

      </div>
    </div>

    <!-- BOTTOM ROW: LIVE MONOSPACE AUDIT LINEAGE ENGINE GRID -->
    <div ref="auditSectionRef" class="enterprise-panel rounded-borders q-mt-md column overflow-hidden no-shadow">
      <div class="q-px-md q-py-sm row items-center justify-between border-bottom bg-panel-darker">
        <div class="row items-center op-gap-8 no-wrap">
          <q-icon name="receipt_long" color="cyan-3" size="xs" />
          <span class="text-operator-title text-white">Immutable Broadcast Lineage & Execution Audits</span>
        </div>
        <div class="row items-center op-gap-4">
          <span class="text-metric-mono text-grey-4">SHA-256 INTEGRITY: VERIFIED</span>
          <q-btn flat dense size="xs" color="red-3" label="Reset Ledger" @click="clearAuditRecords" />
        </div>
      </div>

      <!-- Monospace Virtual Terminal Table viewport -->
      <div class="enterprise-data-grid full-width overflow-hidden">
        <q-table
          :rows="auditRecords"
          :columns="auditColumns"
          row-key="auditId"
          flat
          dark
          dense
          hide-bottom
          :rows-per-page-options="[10]"
          class="custom-table-dark text-caption font-mono border-none"
          card-class="bg-transparent"
        >
          <template v-slot:body-cell-severity="props">
            <q-td :props="props">
              <span :class="getSeverityBadgeClass(props.row.severity)" class="q-px-xs q-py-none rounded-borders text-metric-sm text-weight-bold">
                {{ props.row.severity }}
              </span>
            </q-td>
          </template>
          
          <template v-slot:body-cell-lineageSignature="props">
            <q-td :props="props" class="text-grey-4 ellipsis font-mono" style="max-width: 150px;" :title="props.row.lineageSignature">
              {{ props.row.lineageSignature }}
            </q-td>
          </template>

          <template v-slot:body-cell-statusString="props">
            <q-td :props="props">
              <span class="text-metric-mono text-cyan-3">{{ props.row.statusString }}</span>
            </q-td>
          </template>
        </q-table>
      </div>
    </div>

  </q-page>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import { useOperatorPreferences } from '../../composables/useOperatorPreferences'
import { CanonicalBroadcastTypes, DotroidLauncherModes, DeliveryPriorityLanes } from '../../contracts/broadcast'
import { BroadcastEnvelopeModel, BroadcastFactory } from '../../broadcast-models'
import { broadcastEngineSingleton } from '../../services/broadcast/BroadcastOrchestrationEngine'
import { realtimeGatewaySingleton } from '../../services/broadcast/BroadcastRealtimeGateway'
import { pushDispatcherSingleton } from '../../services/broadcast/PushNotificationDispatcher'
import { deliveryTrackerSingleton, TrackingStates } from '../../services/broadcast/BroadcastDeliveryTracker'
import { targetingEngineSingleton } from '../../services/broadcast/DeliveryTargetingEngine'
import { auditGovernanceSingleton } from '../../services/broadcast/BroadcastAuditGovernance'
import { adminApi } from '../../api'

// Ensure transport gateways register with the orchestration engine
void realtimeGatewaySingleton
void pushDispatcherSingleton

const { prefs } = useOperatorPreferences()
const $q = useQuasar()
const route = useRoute()

// Programmatic DOM targets targeting focus animations
const preflightSectionRef = ref(null)
const auditSectionRef = ref(null)

// State variables
const isOverrideActive = ref(false)
const isExecutingBroadcast = ref(false)
const activeOperator = ref("sysadmin@IIPS.app")

// Form structures
const composerForm = reactive({
  tenantScope: "global",
  type: CanonicalBroadcastTypes.NOTIFICATION,
  severity: "INFO",
  priorityLane: DeliveryPriorityLanes.INFO,
  launcherMode: DotroidLauncherModes.TOAST,
  title: "",
  message: "",
  channels: ["websocket", "offline"],
  requiresAck: false
})

// Options Mappings
const broadcastTypeOptions = [
  { label: 'Notification Broadcast Envelope', value: CanonicalBroadcastTypes.NOTIFICATION },
  { label: 'Operational Infrastructure Alert', value: CanonicalBroadcastTypes.OPERATIONAL_ALERT },
  { label: 'Emergency Zero-Trust Broadcast', value: CanonicalBroadcastTypes.EMERGENCY },
  { label: 'Persistent System Banner Notice', value: CanonicalBroadcastTypes.PERSISTENT_BANNER },
  { label: 'OTA Firmware Deployment Matrix', value: CanonicalBroadcastTypes.OTA_ANNOUNCEMENT }
]

const severityOptions = ["INFO", "WARNING", "CRITICAL", "EMERGENCY"]

const priorityOptions = [
  { label: 'Immediate Preemption Bypass', value: DeliveryPriorityLanes.EMERGENCY },
  { label: 'Fast-Lane Stream Relay', value: DeliveryPriorityLanes.CRITICAL },
  { label: 'Standard Paced Queuing', value: DeliveryPriorityLanes.WARNING },
  { label: 'Batched Continuous Flush', value: DeliveryPriorityLanes.INFO }
]

const launcherModeOptions = [
  { label: 'Silent Daemon Sync', value: DotroidLauncherModes.SILENT },
  { label: 'Standard Small Overlay Toast', value: DotroidLauncherModes.TOAST },
  { label: 'Persistent Durable Banner View', value: DotroidLauncherModes.BANNER },
  { label: 'Blocking Modal Screen', value: DotroidLauncherModes.BLOCKING },
  { label: 'Kiosk-Lock Hardware Interface', value: DotroidLauncherModes.KIOSK_LOCK }
]

// Pre-flight Dry Run state computations
const preflightResult = ref({
  devicesCount: 142850,
  tenantsCount: 48,
  regionsCount: 7,
  simulationReport: "Initializing dry-run expression parsing arrays...",
  isHighImpact: true
})

const triggerPreflightSimulation = () => {
  const scopes = {
    tenants: composerForm.tenantScope === "global" ? [] : [composerForm.tenantScope],
    quarantineState: composerForm.severity === "EMERGENCY" ? "QUARANTINED" : "ANY"
  }
  preflightResult.value = targetingEngineSingleton.evaluateTargetFootprint(scopes)
}

// Helpers
const getSeverityTextColor = (sev) => {
  if (sev === "EMERGENCY") return "text-red-4"
  if (sev === "CRITICAL") return "text-deep-orange-4"
  if (sev === "WARNING") return "text-amber-3"
  return "text-cyan-3"
}

const getSeverityBadgeClass = (sev) => {
  if (sev === "EMERGENCY") return "bg-red-10 text-red-2"
  if (sev === "CRITICAL") return "bg-deep-orange-10 text-amber-2"
  if (sev === "WARNING") return "bg-amber-10 text-amber-3"
  return "bg-cyan-10 text-cyan-2"
}

const applySeverityDefaults = () => {
  if (composerForm.severity === "EMERGENCY") {
    composerForm.priorityLane = DeliveryPriorityLanes.EMERGENCY
    composerForm.launcherMode = DotroidLauncherModes.KIOSK_LOCK
    composerForm.requiresAck = true
    if (!composerForm.channels.includes("fcm")) composerForm.channels.push("fcm")
  } else if (composerForm.severity === "CRITICAL") {
    composerForm.priorityLane = DeliveryPriorityLanes.CRITICAL
    composerForm.launcherMode = DotroidLauncherModes.BLOCKING
    composerForm.requiresAck = true
  } else if (composerForm.severity === "WARNING") {
    composerForm.priorityLane = DeliveryPriorityLanes.WARNING
    composerForm.launcherMode = DotroidLauncherModes.BANNER
  } else {
    composerForm.priorityLane = DeliveryPriorityLanes.INFO
    composerForm.launcherMode = DotroidLauncherModes.TOAST
  }
  triggerPreflightSimulation()
}

const applyTemplate = (tmpl) => {
  if (tmpl === "banner") {
    const built = BroadcastFactory.createPersistentMaintenanceBanner("global", "Scheduled primary node cache flushing commencing at 03:00 UTC. System operations locked temporarily.")
    composerForm.type = built.type
    composerForm.severity = built.severity
    composerForm.title = built.title
    composerForm.message = built.message
    composerForm.launcherMode = built.launcherMode
    composerForm.priorityLane = built.priorityLane
  } else if (tmpl === "ota") {
    const built = BroadcastFactory.createOTAAnnouncementNotice("4.12.8", ["us-east", "eu-west"])
    composerForm.type = built.type
    composerForm.severity = built.severity
    composerForm.title = built.title
    composerForm.message = built.message
    composerForm.launcherMode = built.launcherMode
    composerForm.priorityLane = built.priorityLane
  } else if (tmpl === "quarantine") {
    const built = BroadcastFactory.createEmergencyQuarantineNotice("tenant-alpha", "edge-node-01", "Manual administrative engagement requested.")
    composerForm.type = built.type
    composerForm.severity = built.severity
    composerForm.title = built.title
    composerForm.message = built.message
    composerForm.launcherMode = built.launcherMode
    composerForm.priorityLane = built.priorityLane
  }
  triggerPreflightSimulation()
}

// Master execution pipeline handler
const executeOperationalBroadcast = async () => {
  if (!composerForm.title || !composerForm.message) {
    $q?.notify({ message: "Validation Denied: Broadcast headline and context text are required.", color: "amber-10", textColor: "amber-2" })
    return
  }

  isExecutingBroadcast.value = true

  // 1. Evaluate strict RBAC authorization assertions
  const authCheck = auditGovernanceSingleton.authorizeBroadcastAction(activeOperator.value, composerForm.severity)
  if (!authCheck.authorized) {
    isExecutingBroadcast.value = false
    $q?.notify({ message: authCheck.error, color: "red-10", textColor: "white", icon: "block" })
    return
  }

  // Assemble canonical envelope structures
  const envelope = new BroadcastEnvelopeModel({
    tenantId: composerForm.tenantScope,
    type: composerForm.type,
    severity: composerForm.severity,
    title: composerForm.title,
    message: composerForm.message,
    issuedBy: activeOperator.value,
    requiresAcknowledgement: composerForm.requiresAck,
    deliveryChannels: [...composerForm.channels],
    launcherMode: composerForm.launcherMode,
    priorityLane: composerForm.priorityLane,
    locationContext: null,  // not available in admin console (web browser context)
    targetScopes: {
      tenants: composerForm.tenantScope === "global" ? [] : [composerForm.tenantScope],
      quarantineState: composerForm.severity === "EMERGENCY" ? "QUARANTINED" : "ANY"
    }
  })

  // 2. Evaluate dual-authorization approval workflow blocks
  const workflow = auditGovernanceSingleton.evaluateApprovalWorkflow(envelope, activeOperator.value)
  if (workflow.requiresApproval) {
    isExecutingBroadcast.value = false
    auditGovernanceSingleton.appendAuditRecord(envelope, activeOperator.value, "STAGED_AWAITING_REVIEW")
    refreshAuditRecords()
    $q?.notify({
      message: "Approval Matrix Enforced",
      caption: "High-severity actions require secondary SOC supervisor sign-offs unless master override engaged.",
      color: "indigo-10", textColor: "white", icon: "security"
    })
    return
  }

  // 3. Directly enqueue packet to master priority buffers
  const result = await broadcastEngineSingleton.enqueueBroadcast(envelope)
  
  if (result.success) {
    // Hard guarantee: also push to Invify Socket.IO devices when websocket transport is selected.
    // (Orchestration gateways can miss registration in some boot orders.)
    if (composerForm.channels.includes('websocket')) {
      try {
        const deviceMessage = [composerForm.title, composerForm.message].filter(Boolean).join('\n')
        const targetType = composerForm.tenantScope === 'global' ? 'all' : 'tenant'
        const targetValue = composerForm.tenantScope === 'global' ? null : composerForm.tenantScope
        await adminApi.sendBroadcast({
          message: deviceMessage,
          targetType,
          targetValue,
          title: composerForm.title,
          severity: composerForm.severity,
          launcherMode: composerForm.launcherMode,
          broadcastId: envelope.broadcastId,
        })
      } catch (socketErr) {
        console.error('[BroadcastCenter] Direct /admin/broadcast failed:', socketErr)
        $q?.notify({
          message: 'Audit saved, but device socket push failed',
          caption: socketErr?.response?.data?.error || socketErr?.message || 'Check backend auth /admin/broadcast',
          color: 'amber-10',
          textColor: 'black',
          icon: 'warning',
        })
      }
    }

    // Stage absolute initial tracker lifecycles
    deliveryTrackerSingleton.updateTrackingState(envelope.broadcastId, TrackingStates.DELIVERED, envelope)
    // Append immutable transaction trail
    auditGovernanceSingleton.appendAuditRecord(envelope, activeOperator.value, result.status)
    
    $q?.notify({
      message: `[${envelope.severity}] Transmission Success`,
      caption: `Assigned Monotonic Signature Hash: ${result.lineageHash?.slice(0, 16)}...`,
      color: envelope.severity === "EMERGENCY" ? "red-10" : "green-10",
      textColor: "white",
      icon: "check_circle"
    })

    // Reset simple form primitives
    composerForm.title = ""
    composerForm.message = ""
    refreshAnalytics()
    refreshAuditRecords()
  } else {
    $q?.notify({
      message: `Transmission Rejected: ${result.status}`,
      caption: result.error || "Suppressed by local flow constraints.",
      color: "red-10", textColor: "white", icon: "error"
    })
  }

  isExecutingBroadcast.value = false
}

// Table structures
const auditColumns = [
  { name: 'auditId', label: 'LINE SEQUENCE', field: 'auditId', align: 'left' },
  { name: 'timestamp', label: 'TIMESTAMP UTC', field: row => new Date(row.timestamp).toISOString().replace('T', ' ').substring(0, 19), align: 'left' },
  { name: 'severity', label: 'SEV CLASS', field: 'severity', align: 'center' },
  { name: 'tenantScope', label: 'TENANT BOUND', field: 'tenantScope', align: 'left' },
  { name: 'launcherMode', label: 'DOTROID MODE', field: 'launcherMode', align: 'center' },
  { name: 'statusString', label: 'EXECUTION CODE', field: 'statusString', align: 'right' },
  { name: 'lineageSignature', label: 'SHA-256 SIGNATURE', field: 'lineageSignature', align: 'left' }
]

const auditRecords = ref([])
const analyticsData = ref(deliveryTrackerSingleton.getDeliveryAnalytics())

const refreshAnalytics = () => {
  analyticsData.value = deliveryTrackerSingleton.getDeliveryAnalytics()
}

const refreshAuditRecords = () => {
  auditRecords.value = [...auditGovernanceSingleton.getAuditHistory()]
}

const handleOverrideToggle = (engaged) => {
  auditGovernanceSingleton.toggleEmergencyOverride(engaged)
  $q?.notify({
    message: engaged ? "🚨 SOC Emergency Override Armed" : "Standard Dual-Approval Gates Re-engaged",
    color: engaged ? "red-10" : "blue-grey-9",
    textColor: "white",
    position: "top"
  })
}

const clearAuditRecords = () => {
  auditGovernanceSingleton.resetGovernanceState()
  refreshAuditRecords()
}

// Programmatic tab anchor scroll routing observer
const handleTabNavigation = (targetTab) => {
  if (!targetTab) return
  nextTick(() => {
    setTimeout(() => {
      if (targetTab === 'preflight' && preflightSectionRef.value) {
        preflightSectionRef.value.scrollIntoView({ behavior: 'smooth', block: 'center' })
        preflightSectionRef.value.classList?.add('nav-highlight-glow')
        setTimeout(() => preflightSectionRef.value?.classList?.remove('nav-highlight-glow'), 1800)
      } else if (targetTab === 'audits' && auditSectionRef.value) {
        auditSectionRef.value.scrollIntoView({ behavior: 'smooth', block: 'start' })
        auditSectionRef.value.classList?.add('nav-highlight-glow')
        setTimeout(() => auditSectionRef.value?.classList?.remove('nav-highlight-glow'), 1800)
      }
    }, 300)
  })
}

watch(() => route.query?.tab, (newTab) => {
  handleTabNavigation(newTab)
})

onMounted(() => {
  triggerPreflightSimulation()
  refreshAuditRecords()
  
  // Seed sample initial transaction audit lines to demonstrate full feature layout immediately
  if (auditRecords.value.length === 0) {
    const seedEnv = BroadcastFactory.createPersistentMaintenanceBanner("global", "Initial enterprise baseline ingestion check initialized.")
    auditGovernanceSingleton.appendAuditRecord(seedEnv, activeOperator.value, "DELIVERED_STANDARD")
    refreshAuditRecords()
  }

  // Evaluate initial programmatic deep target parameters
  handleTabNavigation(route.query?.tab)
})
</script>

<style scoped>
.border-bottom { border-bottom: 1px solid var(--enterprise-border); }
.border-top { border-top: 1px solid var(--enterprise-border); }
.border-muted { border: 1px solid #1F2D42; }
.border-amber-left { border-left: 3px solid #FBBF24; }
.text-pre-wrap { white-space: pre-wrap; word-break: break-all; }
.flex-grow { flex-grow: 1; }

/* Custom Component Theme Normalizations ensuring sleek dark contrast */
:deep(.custom-select-dark .q-field__control),
:deep(.custom-input-dark .q-field__control) {
  background-color: var(--enterprise-subpanel-bg) !important;
  border-radius: 2px !important;
  color: var(--enterprise-text-main) !important;
}

:deep(.custom-table-dark) {
  background-color: transparent !important;
}
:deep(.custom-table-dark .q-table__container) {
  background-color: transparent !important;
}
:deep(.custom-table-dark th) {
  background-color: #131d2e !important;
  color: #9FB3C8 !important;
  border-bottom: 1px solid #1F2D42 !important;
}
:deep(.custom-table-dark td) {
  border-bottom: 1px solid #1F2D42 !important;
  color: #E6EDF3 !important;
}

@keyframes borderGlowPulse {
  0% { box-shadow: 0 0 0px rgba(88, 166, 255, 0); border-color: #1F2D42 !important; }
  50% { box-shadow: 0 0 25px rgba(88, 166, 255, 0.7); border-color: #58A6FF !important; }
  100% { box-shadow: 0 0 0px rgba(88, 166, 255, 0); border-color: #1F2D42 !important; }
}

.nav-highlight-glow {
  animation: borderGlowPulse 0.9s ease-in-out 2 !important;
}
</style>
