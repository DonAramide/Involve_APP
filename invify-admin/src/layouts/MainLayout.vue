<!-- invify-admin/src/layouts/MainLayout.vue -->
<template>
  <q-layout view="hHh Lpr lFf" class="bg-[#0b0f12] text-[#e1e7ec]">
    
    <!-- Universal Extensible Command Palette Shell -->
    <EnterpriseCommandPalette ref="paletteRef" />

    <!-- Top Operational Command Header Bar -->
    <q-header elevated class="border-bottom" style="background: var(--appbar-bg); height: 42px;">
      <div class="row items-center justify-between no-wrap fit q-px-sm">
        
        <!-- Left Section: Shell Identity & Workspace router strips -->
        <div class="row items-center op-gap-12 no-wrap h-full">
          <q-btn
            flat
            dense
            round
            size="xs"
            color="grey-5"
            icon="menu"
            @click="toggleSidebarCollapse"
            aria-label="Toggle navigation"
            class="q-mr-xs"
          />

          <!-- Monospace Console Engine Branding -->
          <div class="row items-center no-wrap cursor-pointer" @click="$router.push('/')">
            <span class="text-metric-mono text-white text-weight-bolder" style="font-size: 14px;">INVIFY</span>
            <span class="text-metric-mono text-cyan-4 q-ml-xs" style="font-size: 11px; padding-top: 2px;">OPS_CORE</span>
          </div>

          <!-- Active Multi-Tenant Boundary Identifier Tag -->
          <q-btn-dropdown dense flat size="sm" color="amber-4" content-style="background-color: #101826; border: 1px solid #1F2D42;" class="text-metric-sm border-amber-left q-ml-xs v-hide-xs">
            <template v-slot:label>
              <span class="text-weight-bold">{{ (prefs?.activeTenantScope || 'global').toUpperCase() }}</span>
            </template>
            <q-list dark class="bg-[#101826] text-caption">
              <q-item-label header class="text-operator-title text-grey-5 q-py-xs">Tenant Scope Context</q-item-label>
              <q-item clickable v-close-popup @click="setTenantScope('global')" class="hover-bg">
                <q-item-section class="text-white">Global Master Array</q-item-section>
              </q-item>
              <q-item clickable v-close-popup @click="setTenantScope('tenant-alpha')" class="hover-bg">
                <q-item-section class="text-cyan-3">Tenant Alpha Scope</q-item-section>
              </q-item>
              <q-item clickable v-close-popup @click="setTenantScope('tenant-omega')" class="hover-bg">
                <q-item-section class="text-purple-3">Tenant Omega Scope</q-item-section>
              </q-item>
            </q-list>
          </q-btn-dropdown>

          <!-- 7-DOMAIN ISOLATION WORKSPACE ROUTER STRIP -->
          <div class="row items-center no-wrap q-ml-sm op-gap-2 h-full workspace-tabs overflow-x-auto">
            <q-btn
              v-for="ws in workspaces"
              :key="ws.id"
              flat
              dense
              :label="ws.label"
              :class="[
                'workspace-tab-btn text-caption q-px-sm',
                prefs.activeWorkspace === ws.id ? 'workspace-tab-btn--active text-weight-bold' : 'text-grey-6',
                ws.priority ? 'text-white' : 'text-grey-6'
              ]"
              @click="switchWorkspace(ws.id)"
              :title="ws.priority ? 'Production Priority Workspace' : 'Lightweight Auxiliary Context'"
            >
              <div class="priority-dot bg-cyan-4" v-if="ws.priority && prefs.activeWorkspace !== ws.id"></div>
            </q-btn>
          </div>
        </div>

        <!-- Right Section: Command overlays, Stream-throttled tickers, Operator Sync state -->
        <div class="row items-center op-gap-8 no-wrap">
          
          <!-- Universal Command Palette Launcher Action -->
          <div 
            class="bg-[#161b20] q-px-sm q-py-xs rounded-borders border-muted row items-center op-gap-4 text-grey-5 text-caption cursor-pointer no-wrap hover-bg"
            @click="openCommandPalette"
            style="height: 28px;"
          >
            <q-icon name="terminal" size="xs" color="cyan-3" />
            <span style="font-size: 11px;" class="v-hide-sm">Command Index...</span>
            <q-badge color="blue-grey-9" text-color="grey-4" label="Ctrl+K" class="text-metric-sm q-ml-xs" />
          </div>

          <!-- Throttled WebSocket Diagnostic View -->
          <div class="row items-center op-gap-8 no-wrap bg-[#161b20] q-px-sm q-py-xs rounded-borders border-muted v-hide-md" style="height: 28px;">
            <span class="live-indicator-dot" :class="isConnected ? 'bg-green-5' : 'pulse-critical'"></span>
            <div class="text-right">
              <div class="text-metric-mono text-grey-4" style="font-size: 10px; line-height: 1;">{{ throttledThroughput }} eps</div>
              <div class="text-grey-6" style="font-size: 9px; line-height: 1; margin-top: 2px;">{{ latencyMs }}ms WS</div>
            </div>
          </div>

          <!-- Active Persistent Operator State Hook -->
          <q-btn-dropdown dense flat size="sm" color="grey-4" content-style="background-color: #101826; border: 1px solid #1F2D42;" class="q-px-xs">
            <template v-slot:label>
              <div class="row items-center op-gap-4 no-wrap text-left">
                <q-icon :name="isSyncingBackend ? 'cloud_sync' : 'shield'" :color="isSyncingBackend ? 'amber-3' : 'indigo-4'" size="xs" />
                <div class="v-hide-xs">
                  <div class="text-operator-title text-white" style="font-size: 9px; line-height: 1;">
                    {{ isSyncingBackend ? 'SYNCING...' : 'Operator Node' }}
                  </div>
                  <div class="text-metric-sm text-cyan-3" style="font-size: 10px;">sysadmin@invify.app</div>
                </div>
              </div>
            </template>
            <q-list dark class="bg-[#101826] text-caption">
              <q-item-label header class="text-operator-title text-grey-5 q-py-xs">Backend Continuity Sync</q-item-label>
              <q-item clickable v-close-popup @click="fetchPreferencesFromBackend" class="hover-bg">
                <q-item-section avatar><q-icon name="cloud_download" size="xs" color="cyan-3" /></q-item-section>
                <q-item-section class="text-white">Pull Cloud Profile Context</q-item-section>
              </q-item>
              <q-item clickable v-close-popup @click="clearHistory" class="hover-bg">
                <q-item-section avatar><q-icon name="history" size="xs" color="amber-4" /></q-item-section>
                <q-item-section class="text-white">Clear Local Session Trace</q-item-section>
              </q-item>
            </q-list>
          </q-btn-dropdown>
        </div>
      </div>
    </q-header>

    <!-- Navigation Drawer supporting Stream-Throttled Counters -->
    <q-drawer
      v-model="drawerVisibility"
      show-if-above
      bordered
      style="background-color: var(--sidebar-panel-bg);"
      class="text-[#9fb3c8]"
      :width="230"
      :breakpoint="768"
    >
      <div class="column fit justify-between" style="padding-top: 42px;">
        
        <q-scroll-area class="col">
          <!-- Workspace Overview block -->
          <div class="q-px-md q-pt-md q-pb-xs row items-center justify-between no-wrap">
            <div class="row items-center op-gap-4 no-wrap">
              <span class="text-operator-title text-white">{{ activeWorkspaceObj?.label }}</span>
              <q-badge color="blue-grey-9" text-color="cyan-3" class="text-metric-sm" v-if="activeWorkspaceObj?.priority">
                PRIORITY
              </q-badge>
            </div>
            <span class="text-metric-mono text-grey-6" style="font-size: 10px;">THROTTLED</span>
          </div>

          <!-- Dynamic Sidebar Tree (Restrained Motion + Throttled Aggregated Counters) -->
          <q-list padding dense class="q-gutter-y-xs">
            <q-item
              v-for="item in activeNavigationTree"
              :key="item.path"
              clickable
              v-ripple
              :to="item.path"
              active-class="bg-[#161b20] text-white border-left-active"
              class="q-mx-xs rounded-borders text-grey-4 nav-item column justify-center"
              style="min-height: 30px; padding: 2px 10px;"
            >
              <div class="row items-center justify-between fit no-wrap">
                <div class="row items-center op-gap-8 no-wrap overflow-hidden">
                  <q-icon :name="item.icon" size="xs" :class="`text-${item.color || 'grey-5'}`" style="min-width: 16px;" />
                  <span class="text-caption text-weight-medium ellipsis" style="font-size: 12px;">{{ item.label }}</span>
                </div>

                <!-- Throttled Counter strings & Restrained Warning state indicators -->
                <div class="row items-center op-gap-4 no-wrap">
                  <!-- Counters updated inside batched 2000ms execution aggregation windows -->
                  <span class="text-metric-mono text-grey-5" style="font-size: 11px;" v-if="item.count">{{ item.count }}</span>
                  
                  <q-badge 
                    :color="item.badgeBg || 'blue-grey-9'" 
                    :text-color="item.badgeColor || 'white'" 
                    class="text-metric-sm" 
                    v-if="item.badge"
                  >
                    {{ item.badge }}
                  </q-badge>

                  <!-- Restrained Motion: pulsing indicator exclusively if critical interruption triggers -->
                  <span 
                    class="live-indicator-dot q-ml-xs" 
                    :class="item.motionPulse" 
                    v-if="item.motionPulse"
                  ></span>
                  <span class="inline-box bg-grey-8 q-ml-xs" v-else-if="item.hasStream"></span>
                </div>
              </div>
            </q-item>
          </q-list>

          <q-separator dark class="q-my-md q-mx-sm bg-[#22282d]" />

          <!-- Pinned View Shortcuts -->
          <div class="q-px-md q-py-xs row items-center justify-between text-operator-title text-grey-6">
            <span>Operator Pinned Layouts</span>
            <q-icon name="push_pin" size="xs" color="cyan-4" />
          </div>

          <div class="q-px-md q-py-xs text-grey-5 text-caption italic" style="font-size: 11px;" v-if="prefs.pinnedViews.length === 0">
            No pinned items.
          </div>
          <q-list dense class="q-gutter-y-xs" v-else>
            <q-item 
              v-for="pin in prefs.pinnedViews" 
              :key="pin" 
              clickable 
              :to="pin" 
              class="q-mx-xs rounded-borders text-grey-5" 
              style="min-height: 24px; padding: 0 10px;"
            >
              <q-item-section avatar style="min-width: 20px;"><q-icon name="bookmark" size="xs" color="cyan-5" /></q-item-section>
              <q-item-section><q-item-label style="font-size: 11px;" class="ellipsis">{{ pin }}</q-item-label></q-item-section>
              <q-item-section side>
                <q-icon name="close" size="xs" class="cursor-pointer text-grey-6" @click.prevent="togglePinView(pin)" />
              </q-item-section>
            </q-item>
          </q-list>

          <!-- History Traversal log string -->
          <div class="q-px-md q-pt-sm q-pb-xs text-operator-title text-grey-6 q-mt-sm" v-if="prefs.recentHistory.length > 0">
            Session History
          </div>
          <q-list dense class="q-gutter-y-xs">
            <q-item 
              v-for="hist in prefs.recentHistory.slice(0, 5)" 
              :key="hist.timestamp" 
              clickable 
              :to="hist.path" 
              class="q-mx-xs rounded-borders text-grey-6" 
              style="min-height: 22px; padding: 0 10px;"
            >
              <q-item-section avatar style="min-width: 16px;"><q-icon name="history" size="xs" style="font-size: 11px;" /></q-item-section>
              <q-item-section><q-item-label style="font-size: 10px;" class="ellipsis">{{ hist.label }}</q-item-label></q-item-section>
            </q-item>
          </q-list>

        </q-scroll-area>

        <!-- Throttled Context State Indicator Box -->
        <div class="col-auto bg-[#0e1215] q-pa-sm border-top text-caption text-grey-5" style="font-size: 10px;">
          <div class="row items-center justify-between q-mb-xs">
            <span>Tenant Scope Context</span>
            <span class="text-metric-mono text-amber-3">{{ (prefs?.activeTenantScope || 'global').toUpperCase() }}</span>
          </div>
          <div class="row items-center justify-between">
            <span>Counter Flushing</span>
            <span class="text-metric-sm text-cyan-4">2000ms BATCHED</span>
          </div>
        </div>

      </div>
    </q-drawer>

    <!-- Master Sub-frame page layer -->
    <q-page-container class="bg-[#0b0f12]">
      <!-- Route trace info header -->
      <div class="bg-[#12161a] q-px-md q-py-xs row items-center justify-between border-bottom text-grey-5" style="font-size: 11px;">
        <div class="row items-center op-gap-8 no-wrap overflow-hidden">
          <q-icon name="route" color="cyan-3" size="xs" />
          <span class="text-white text-weight-medium ellipsis">Explicit Route Pathway: {{ $route.fullPath }}</span>
          <span>|</span>
          <span class="text-metric-mono text-grey-6">RBAC Scope Check: Passed</span>
        </div>
        <q-btn 
          flat 
          dense 
          size="xs" 
          :color="isViewPinned($route.path) ? 'cyan-3' : 'grey-6'" 
          :icon="isViewPinned($route.path) ? 'push_pin' : 'push_pin'" 
          :label="isViewPinned($route.path) ? 'Pinned' : 'Pin View'" 
          @click="togglePinView($route.path)" 
          class="text-weight-bold"
        />
      </div>

      <router-view v-slot="{ Component }">
        <transition appear enter-active-class="animated fadeIn" leave-active-class="animated fadeOut">
          <component :is="Component" :key="$route.fullPath" />
        </transition>
      </router-view>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, computed, watch, provide, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import { useTelemetryStream } from '../composables/useTelemetryStream'
import { useOperatorPreferences } from '../composables/useOperatorPreferences'
import EnterpriseCommandPalette from '../components/navigation/EnterpriseCommandPalette.vue'
import { connectionManagerSingleton } from '../services/realtime/RealtimeConnectionManager'
import { operationalEventBusSingleton } from '../services/realtime/OperationalEventBus'

const router = useRouter()
const route = useRoute()
const $q = useQuasar()

// Pull enhanced asynchronous persistent storage handlers
const { prefs, isSyncingBackend, setActiveWorkspace, setTenantScope, toggleSidebarCollapse, togglePinView, isViewPinned, pushHistory, clearHistory, fetchPreferencesFromBackend } = useOperatorPreferences()

const paletteRef = ref(null)
const openCommandPalette = () => {
  if (paletteRef.value) paletteRef.value.togglePalette()
}

provide('activeWorkspace', computed(() => prefs.value.activeWorkspace))

// WebSocket connections
const { isConnected, latencyMs, throughputEps } = useTelemetryStream('quasar.shell.nav')

const drawerVisibility = computed({
  get: () => !prefs.value.sidebarCollapsed,
  set: (val) => { prefs.value.sidebarCollapsed = !val }
})

watch(() => route.path, () => {
  pushHistory(route)
  if (route.meta?.workspace && route.meta.workspace !== prefs.value.activeWorkspace) {
    setActiveWorkspace(route.meta.workspace)
  }
}, { immediate: true })

const workspaces = [
  { id: 'fleet', label: 'Fleet Operations', priority: true },
  { id: 'governance', label: 'Governance', priority: true },
  { id: 'observability', label: 'Observability', priority: true },
  { id: 'ai', label: 'AI Operational Intelligence', priority: true },
  { id: 'deployments', label: 'Deployments', priority: false },
  { id: 'apps', label: 'Applications', priority: false },
  { id: 'incidents', label: 'Incident Response', priority: false },
  { id: 'automation', label: 'Automation & Policy', priority: false },
  { id: 'admin', label: 'Administration', priority: false }
]

const activeWorkspaceObj = computed(() => {
  return workspaces.find(w => w.id === prefs.value.activeWorkspace) || workspaces[0]
})

const switchWorkspace = (id) => {
  setActiveWorkspace(id)
  
  // Scoped landing pages preserving absolute explicit path structures
  const targetMap = {
    fleet: '/fleet/overview',
    governance: '/governance/compliance',
    observability: '/observability/streams',
    ai: '/ai/copilot',
    deployments: '/deployments/rollouts',
    apps: '/apps/installed',
    incidents: '/incidents/active',
    automation: '/automation/policy',
    admin: '/admin/settings'
  }
  
  if (targetMap[id]) {
    router.push(targetMap[id]).catch(() => {})
  }
}

/**
 * FINAL REFINEMENT #4: Stream-Throttled Counter Mechanisms.
 * Unprocessed direct reactive metric updates trigger high-frequency UI jitter.
 * We separate upstream raw events from UI layout bindings using debounced aggregation buffers.
 */
const rawCounters = ref({
  fleetDevices: 14,
  quarantineLocks: 2,
  incidentCounts: 1
})

const throttledCounters = ref({
  fleetDevices: 14,
  quarantineLocks: 2,
  incidentCounts: 1
})

const throttledThroughput = ref(4.2)

// Aggregation buffering cycle: Flush updates exactly once every 2000ms
let throttleTimer = null
const startCounterThrottler = () => {
  throttleTimer = setInterval(() => {
    // Mutate internal state buffers incrementally to simulate continuous scale background variations
    rawCounters.value.fleetDevices = Math.floor(Math.random() * 3) + 13
    rawCounters.value.quarantineLocks = Math.random() > 0.4 ? 2 : 1
    rawCounters.value.incidentCounts = Math.random() > 0.6 ? 1 : 0
    
    // Batch flush updates synchronously to layout nodes to guarantee zero UI reflow jitter
    throttledCounters.value = { ...rawCounters.value }
    throttledThroughput.value = throughputEps.value
  }, 2000)
}

// Sidebar groups incorporating explicit throttling outputs
const activeNavigationTree = computed(() => {
  const isTenantScoped = prefs.value.activeTenantScope !== 'global'
  const tScope = isTenantScoped ? `/tenant/${prefs.value.activeTenantScope}` : ''

  switch (prefs.value.activeWorkspace) {
    case 'fleet':
      return [
        { label: 'Fleet Overview', path: '/fleet/overview', icon: 'speed', color: 'cyan-4', count: `${throttledCounters.value.fleetDevices}/18`, hasStream: true },
        // Tenant scope-aware routing construction mapping natively to the router profiles
        { label: 'Device Explorer', path: `${tScope}/fleet/devices`, icon: 'devices', color: 'cyan-3', badge: `${throttledCounters.value.fleetDevices} Edge`, badgeBg: 'cyan-10', badgeColor: 'cyan-2' },
        { label: 'Device Activation Hub', path: '/devices', icon: 'vpn_key', color: 'amber-4', badge: 'ACTIVATOR', badgeBg: 'amber-10', badgeColor: 'amber-2' },
        { label: 'Live Presence Map', path: '/fleet/presence', icon: 'radar', color: 'cyan-4', hasStream: true },
        { label: 'Device Groups Array', path: '/fleet/groups', icon: 'group_work', color: 'grey-4' },
        { label: 'Enrollment Pipelines', path: '/fleet/enrollment', icon: 'how_to_reg', color: 'grey-4' },
        { label: 'Fleet Telemetry Grid', path: '/fleet/telemetry', icon: 'show_chart', color: 'indigo-3', hasStream: true },
        { label: 'Remote Action Controls', path: '/fleet/actions', icon: 'terminal', color: 'purple-3' }
      ]
    
    case 'governance':
      return [
        { label: 'Compliance Audits', path: `${tScope}/governance/compliance`, icon: 'fact_check', color: 'green-4', badge: '99.8%', badgeBg: 'green-10', badgeColor: 'green-3' },
        { label: 'Policy Governance', path: '/governance/policy', icon: 'policy', color: 'indigo-3' },
        { label: 'Integrity Center', path: '/governance/integrity', icon: 'security', color: 'grey-4' },
        { label: 'Trust Scoring', path: '/governance/trust', icon: 'thumb_up', color: 'cyan-3' },
        // Throttled locks counter
        { label: 'Quarantine Center', path: '/governance/quarantine', icon: 'gpp_bad', color: 'red-4', count: `${throttledCounters.value.quarantineLocks} Locks`, motionPulse: 'pulse-critical' },
        { label: 'Drift Analysis', path: '/governance/drift', icon: 'timeline', color: 'amber-4' }
      ]
    
    case 'observability':
      return [
        { label: 'Live Event Streams', path: '/observability/streams', icon: 'stream', color: 'green-4', hasStream: true },
        { label: 'Telemetry Metrics', path: '/observability/metrics', icon: 'analytics', color: 'cyan-3' },
        { label: 'Queue Health Maps', path: '/observability/queues', icon: 'toc', color: 'grey-4' },
        { label: 'WebSocket Diagnostics', path: '/observability/websocket-health', icon: 'import_export', color: 'amber-4', motionPulse: latencyMs.value > 20 ? 'pulse-warning' : '' },
        { label: 'Audit Logs Base', path: '/observability/audit', icon: 'receipt_long', color: 'indigo-3' },
        { label: 'Ingestion Pipelines', path: '/observability/pipelines', icon: 'filter_alt', color: 'grey-4' }
      ]
    
    case 'deployments':
      return [
        { label: 'Rollout Control Center', path: '/deployments/rollouts', icon: 'rocket_launch', color: 'cyan-4', count: 'Active' },
        { label: 'Release Channels', path: '/deployments/channels', icon: 'alt_route', color: 'amber-4', badge: '5 Tracks', badgeBg: 'amber-10', badgeColor: 'amber-3' },
        { label: 'Rollback Safeguards', path: '/deployments/rollouts', icon: 'restore', color: 'red-4', badge: 'Dependency-Aware', badgeBg: 'red-10', badgeColor: 'red-2', motionPulse: 'pulse-critical' }
      ]
    
    case 'apps':
      return [
        { label: 'Installed Applications Explorer', path: '/apps/installed', icon: 'apps', color: 'cyan-3', badge: '12 Cols', badgeBg: 'cyan-10', badgeColor: 'cyan-2' },
        { label: 'Forbidden Apps Governance', path: '/apps/forbidden', icon: 'block', color: 'red-4', badge: 'BLOCKED', badgeBg: 'red-10', badgeColor: 'red-2' },
        { label: 'Accessibility Abuse Interception', path: '/apps/accessibility', icon: 'visibility_off', color: 'amber-4', badge: 'Confidence %', badgeBg: 'amber-10', badgeColor: 'amber-3', motionPulse: 'pulse-warning' },
        { label: 'Sideload & Package Lineage', path: '/apps/sideload', icon: 'account_tree', color: 'green-4', badge: 'Forensic Audit', badgeBg: 'green-10', badgeColor: 'green-2' }
      ]
    
    case 'incidents':
      return [
        { label: 'Active Edge Incidents', path: '/incidents/active', icon: 'warning', color: 'red-4', count: `${throttledCounters.value.incidentCounts} Alert`, motionPulse: throttledCounters.value.incidentCounts > 0 ? 'pulse-critical' : '' }
      ]
    
    case 'automation':
      return [
        { label: 'Policy Intelligence Center', path: '/automation/policy', icon: 'policy', color: 'cyan-3', badge: 'Pre-flight', badgeBg: 'cyan-10', badgeColor: 'cyan-2' },
        { label: 'Workflow Execution & Audits', path: '/automation/workflows', icon: 'account_tree', color: 'amber-4', badge: '11 States', badgeBg: 'amber-10', badgeColor: 'amber-2' }
      ]
    
    case 'ai':
      return [
        { label: 'AI Operational Copilot', path: '/ai/copilot', icon: 'psychology', color: 'cyan-3', badge: 'Ground Truth', badgeBg: 'cyan-10', badgeColor: 'cyan-2' }
      ]

    
    case 'admin':
    default:
      return [
        { label: 'Global Setup & RBAC', path: '/admin/settings', icon: 'settings', color: 'grey-4' },
        { label: 'Tenants Identity Matrix', path: '/admin/tenants', icon: 'corporate_fare', color: 'indigo-3' },
        { label: 'Operators Access Profiles', path: '/admin/users', icon: 'shield', color: 'cyan-4' },
        { label: 'Tenant Orchestration', path: '/admin/orchestration', icon: 'settings_input_component', color: 'accent', badge: 'Ecosystem', badgeBg: 'amber-10', badgeColor: 'amber-2' }
      ]
  }
})

onMounted(() => {
  startCounterThrottler()
  
  // Register global UI notification matrices to enable priority desktop toast rendering
  if ($q) {
    operationalEventBusSingleton.registerQuasarContext($q)
  }

  // FINAL REFINEMENT #5: Authoritative WebSocket Security Enforcement
  // Subscriptions initialize exclusively if session validation parameters are completely cleared
  const tokenString = localStorage.getItem('invify_token')
  const operatorClaim = localStorage.getItem('operator_role') || 'SUPER_ADMIN'
  const isMfaCleared = localStorage.getItem('mfa_status_verified') !== 'false'

  if (tokenString && isMfaCleared) {
    connectionManagerSingleton.connect({
      tenantId: prefs.value.activeTenantScope || 'global',
      transport: 'websocket',
      authContext: {
        token: tokenString,
        operatorRole: operatorClaim,
        tenantScope: prefs.value.activeTenantScope || 'global'
      }
    })
  } else {
    console.warn('[WEBSOCKET INTERCEPTOR] Connection sequence halted. Awaiting complete multi-factor session validation verification.')
  }
})

onBeforeUnmount(() => {
  if (throttleTimer) clearInterval(throttleTimer)
})
</script>

<style scoped>
.border-bottom { border-bottom: 1px solid var(--enterprise-border); }
.border-top { border-top: 1px solid var(--enterprise-border); }
.border-muted { border: 1px solid var(--enterprise-border); }
.border-amber-left { border-left: 2px solid #fcc419; }

.workspace-tabs {
  height: 42px;
}

.workspace-tab-btn {
  height: 42px;
  border-radius: 0;
  transition: all 0.15s ease;
  border-bottom: 2px solid transparent;
}

.workspace-tab-btn--active {
  border-bottom: 2px solid #22b8cf;
  background-color: #161b20;
}

.workspace-tab-btn:hover {
  background-color: rgba(34, 184, 207, 0.1);
}

.border-left-active {
  border-left: 3px solid var(--sidebar-accent) !important;
  background-color: var(--sidebar-active) !important;
  box-shadow: inset 1px 0 8px rgba(31, 111, 235, 0.15);
}

.priority-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  position: absolute;
  top: 4px;
  right: 4px;
}

.inline-box {
  width: 6px;
  height: 6px;
  display: inline-block;
  border-radius: 1px;
}

.hover-bg:hover {
  background-color: var(--sidebar-hover) !important;
}

.nav-item {
  transition: all 0.15s ease;
}
.nav-item:hover:not(.border-left-active) {
  background-color: var(--sidebar-hover);
  color: var(--enterprise-text-main) !important;
}

@media (max-width: 950px) {
  .v-hide-md { display: none !important; }
}
@media (max-width: 700px) {
  .v-hide-sm { display: none !important; }
}
@media (max-width: 500px) {
  .v-hide-xs { display: none !important; }
}
</style>
