<!-- invify-admin/src/layouts/MainLayout.vue -->
<template>
  <q-layout view="hHh Lpr lFf" class="bg-[#0b0f12] text-[#e1e7ec]">
    
    <!-- Universal Command Execution Overlay Cache -->
    <EnterpriseCommandPalette ref="paletteRef" />

    <!-- Top Operational Command Bar -->
    <q-header elevated class="bg-[#12161a] border-bottom" style="height: 42px;">
      <div class="row items-center justify-between no-wrap fit q-px-sm">
        
        <!-- Left Section: Console Identity & Pinned Nav triggers -->
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

          <!-- Monospace Console Identity -->
          <div class="row items-center no-wrap cursor-pointer" @click="$router.push('/')">
            <span class="text-metric-mono text-white text-weight-bolder" style="font-size: 14px;">INVIFY</span>
            <span class="text-metric-mono text-cyan-4 q-ml-xs" style="font-size: 11px; padding-top: 2px;">OPS_CORE</span>
          </div>

          <!-- Environment Target Scope -->
          <q-badge color="blue-grey-9" text-color="amber-4" class="text-metric-sm q-py-xs q-px-sm border-amber-left v-hide-xs">
            PROD-US-EAST
          </q-badge>

          <!-- 7-DOMAIN ISOLATION WORKSPACE ROUTER STRIP -->
          <div class="row items-center no-wrap q-ml-md op-gap-2 h-full workspace-tabs overflow-x-auto">
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
              :title="ws.priority ? 'Production-Ready Priority Workspace' : 'Lightweight Configuration Context'"
            >
              <!-- Priority subtle bar indicator flag -->
              <div class="priority-dot bg-cyan-4" v-if="ws.priority && prefs.activeWorkspace !== ws.id"></div>
            </q-btn>
          </div>
        </div>

        <!-- Right Section: Command shortcuts, Ingest Tickers, Active Operator context -->
        <div class="row items-center op-gap-8 no-wrap">
          
          <!-- Command Execution Launcher Top Trigger Box -->
          <div 
            class="bg-[#161b20] q-px-sm q-py-xs rounded-borders border-muted row items-center op-gap-4 text-grey-5 text-caption cursor-pointer no-wrap hover-bg"
            @click="openCommandPalette"
            style="height: 28px;"
          >
            <q-icon name="terminal" size="xs" color="cyan-3" />
            <span style="font-size: 11px;" class="v-hide-sm">Launcher / Search...</span>
            <q-badge color="blue-grey-9" text-color="grey-4" label="Ctrl+K" class="text-metric-sm q-ml-xs" />
          </div>

          <!-- Live Telemetry WS Latency Tracker Hook -->
          <div class="row items-center op-gap-8 no-wrap bg-[#161b20] q-px-sm q-py-xs rounded-borders border-muted v-hide-md" style="height: 28px;">
            <!-- Motion strictly restrained: pulse indicator only active if degraded -->
            <span class="live-indicator-dot" :class="isConnected ? 'bg-green-5' : 'pulse-critical'"></span>
            <div class="text-right">
              <div class="text-metric-mono text-grey-4" style="font-size: 10px; line-height: 1;">{{ throughputEps }} eps</div>
              <div class="text-grey-6" style="font-size: 9px; line-height: 1; margin-top: 2px;">{{ latencyMs }}ms WS</div>
            </div>
          </div>

          <!-- Operator Account Context Switcher -->
          <q-btn-dropdown dense flat size="sm" color="grey-4" class="q-px-xs">
            <template v-slot:label>
              <div class="row items-center op-gap-4 no-wrap text-left">
                <q-icon name="shield" color="indigo-4" size="xs" />
                <div class="v-hide-xs">
                  <div class="text-operator-title text-white" style="font-size: 9px; line-height: 1;">Active Session</div>
                  <div class="text-metric-sm text-cyan-3" style="font-size: 10px;">sysadmin@invify.app</div>
                </div>
              </div>
            </template>
            <q-list dark class="bg-[#161b20] text-caption">
              <q-item-label header class="text-operator-title text-grey-5 q-py-xs">Operator State Preferences</q-item-label>
              <q-item clickable v-close-popup @click="clearHistory">
                <q-item-section avatar><q-icon name="history" size="xs" color="amber-4" /></q-item-section>
                <q-item-section>Clear Session History</q-item-section>
              </q-item>
              <q-separator dark />
              <q-item clickable v-close-popup to="/admin/settings">
                <q-item-section class="text-grey-4">Global Security Settings</q-item-section>
              </q-item>
            </q-list>
          </q-btn-dropdown>
        </div>
      </div>
    </q-header>

    <!-- Contextual High-Density Left Navigation Sidebar tree -->
    <q-drawer
      v-model="drawerVisibility"
      show-if-above
      bordered
      class="bg-[#12161a] text-[#8c9ba5]"
      :width="230"
      :breakpoint="768"
    >
      <div class="column fit justify-between">
        
        <q-scroll-area class="col">
          <!-- Active Workspace Header Group -->
          <div class="q-px-md q-pt-md q-pb-xs row items-center justify-between no-wrap">
            <div class="row items-center op-gap-4 no-wrap">
              <span class="text-operator-title text-white">{{ activeWorkspaceObj?.label }}</span>
              <q-badge color="blue-grey-9" text-color="cyan-3" class="text-metric-sm" v-if="activeWorkspaceObj?.priority">
                PRIORITY
              </q-badge>
            </div>
            <span class="text-metric-mono text-grey-6" style="font-size: 10px;">CTX_ROOT</span>
          </div>

          <!-- Master Workspace Navigation Groups (Max 2 Levels Deep) -->
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
                <!-- Icon and Label string -->
                <div class="row items-center op-gap-8 no-wrap overflow-hidden">
                  <q-icon :name="item.icon" size="xs" :class="`text-${item.color || 'grey-5'}`" style="min-width: 16px;" />
                  <span class="text-caption text-weight-medium ellipsis" style="font-size: 12px;">{{ item.label }}</span>
                </div>

                <!-- Right Indicators: Static flat badges & Restrained Motion indicators -->
                <div class="row items-center op-gap-4 no-wrap">
                  <!-- Counter strings -->
                  <span class="text-metric-mono text-grey-5" style="font-size: 11px;" v-if="item.count">{{ item.count }}</span>
                  
                  <!-- Granular Severity state tags -->
                  <q-badge 
                    :color="item.badgeBg || 'blue-grey-9'" 
                    :text-color="item.badgeColor || 'white'" 
                    class="text-metric-sm" 
                    v-if="item.badge"
                  >
                    {{ item.badge }}
                  </q-badge>

                  <!-- Restrained Motion Indicator Dot: Pulsing ONLY if explicitly requested by active warnings -->
                  <span 
                    class="live-indicator-dot q-ml-xs" 
                    :class="item.motionPulse" 
                    v-if="item.motionPulse"
                    :title="item.motionDesc || 'Active system state motion'"
                  ></span>
                  <!-- Normal states use flat inline boxes -->
                  <span class="inline-box bg-grey-8 q-ml-xs" v-else-if="item.hasStream" title="Static stream active"></span>
                </div>
              </div>
            </q-item>
          </q-list>

          <q-separator dark class="q-my-md q-mx-sm bg-[#22282d]" />

          <!-- Persistent Pinned Parameters & Operator Session History Cache -->
          <div class="q-px-md q-py-xs row items-center justify-between text-operator-title text-grey-6">
            <span>Operator Persistence</span>
            <q-icon name="push_pin" size="xs" color="cyan-4" />
          </div>

          <!-- Pinned View links -->
          <div class="q-px-md q-py-xs text-grey-5 text-caption italic" style="font-size: 11px;" v-if="prefs.pinnedViews.length === 0">
            No pinned operational paths. Toggle pin buttons inside details views.
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

          <!-- Dynamic Session Telemetry History stack -->
          <div class="q-px-md q-pt-sm q-pb-xs text-operator-title text-grey-6 q-mt-sm" v-if="prefs.recentHistory.length > 0">
            Recent Navigation History
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

        <!-- Sidebar Persistent Telemetry Buffer Footer Status -->
        <div class="col-auto bg-[#0e1215] q-pa-sm border-top text-caption text-grey-5" style="font-size: 10px;">
          <div class="row items-center justify-between q-mb-xs">
            <span>WS Context Hub</span>
            <span class="text-metric-mono text-cyan-3">{{ prefs.activeWorkspace.toUpperCase() }}</span>
          </div>
          <div class="row items-center justify-between">
            <span>Shell Mode</span>
            <span class="text-metric-sm text-green-4">RESTRAINED</span>
          </div>
        </div>

      </div>
    </q-drawer>

    <!-- Main Central Telemetry Router View Engine Container -->
    <q-page-container class="bg-[#0b0f12]">
      <!-- Workspace Active Banner tracking route metrics -->
      <div class="bg-[#12161a] q-px-md q-py-xs row items-center justify-between border-bottom text-grey-5" style="font-size: 11px;">
        <div class="row items-center op-gap-8 no-wrap overflow-hidden">
          <q-icon name="route" color="cyan-3" size="xs" />
          <span class="text-white text-weight-medium ellipsis">Active Scoped Route: {{ $route.fullPath }}</span>
          <span>|</span>
          <span class="text-metric-mono text-grey-6">RBAC Check Passed</span>
        </div>
        <!-- Toggle Pinned Route Action Handler -->
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

      <!-- Live Page Frame Render chunks -->
      <router-view v-slot="{ Component }">
        <transition appear enter-active-class="animated fadeIn" leave-active-class="animated fadeOut">
          <component :is="Component" :key="$route.fullPath" />
        </transition>
      </router-view>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, computed, watch, provide } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import { useTelemetryStream } from '../composables/useTelemetryStream'
import { useOperatorPreferences } from '../composables/useOperatorPreferences'
import EnterpriseCommandPalette from '../components/navigation/EnterpriseCommandPalette.vue'

const router = useRouter()
const route = useRoute()
const $q = useQuasar()

// Hook stateful operator preferences and cache models
const { prefs, setActiveWorkspace, toggleSidebarCollapse, togglePinView, isViewPinned, pushHistory, clearHistory } = useOperatorPreferences()

const paletteRef = ref(null)
const openCommandPalette = () => {
  if (paletteRef.value) paletteRef.value.togglePalette()
}

// Map reactive workspace selector variable globally
provide('activeWorkspace', computed(() => prefs.value.activeWorkspace))

// Live WebSocket indicators
const { isConnected, latencyMs, throughputEps } = useTelemetryStream('quasar.shell.nav')

// Sync drawer open state to persistent storage preferences
const drawerVisibility = computed({
  get: () => !prefs.value.sidebarCollapsed,
  set: (val) => { prefs.value.sidebarCollapsed = !val }
})

// Track route traversals automatically to build historical memory logs
watch(() => route.path, () => {
  pushHistory(route)
  
  // Attempt to match active workspace from route metadata segments
  if (route.meta?.workspace && route.meta.workspace !== prefs.value.activeWorkspace) {
    setActiveWorkspace(route.meta.workspace)
  }
}, { immediate: true })

// 7-DOMAIN MASTER WORKSPACE ARRAY (Enforcing Gradual Activation Weighting)
const workspaces = [
  // Primary Production Priority Domains
  { id: 'fleet', label: 'Fleet Operations', priority: true },
  { id: 'governance', label: 'Governance', priority: true },
  { id: 'observability', label: 'Observability', priority: true },
  
  // Secondary Auxiliary Contexts
  { id: 'deployments', label: 'Deployments', priority: false },
  { id: 'apps', label: 'Applications', priority: false },
  { id: 'incidents', label: 'Incident Response', priority: false },
  { id: 'admin', label: 'Administration', priority: false }
]

const activeWorkspaceObj = computed(() => {
  return workspaces.find(w => w.id === prefs.value.activeWorkspace) || workspaces[0]
})

const switchWorkspace = (id) => {
  setActiveWorkspace(id)
  
  // Gracefully transition default route path to match new workspace ownership domain
  const targetMap = {
    fleet: '/fleet/overview',
    governance: '/governance/compliance',
    observability: '/observability/streams',
    deployments: '/deployments/rollouts',
    apps: '/apps/installed',
    incidents: '/incidents/active',
    admin: '/admin/settings'
  }
  
  if (targetMap[id]) {
    router.push(targetMap[id]).catch(() => {})
  }
}

// HIGH-DENSITY SIDEBAR TREES MAPPED TO THE 7 ISOLATED WORKSPACE CONTEXTS
// Restrained Motion System: standard paths are static. Motions trigger ONLY for specific degradation contexts.
const activeNavigationTree = computed(() => {
  switch (prefs.value.activeWorkspace) {
    case 'fleet':
      return [
        { label: 'Fleet Overview', path: '/fleet/overview', icon: 'speed', color: 'cyan-4', count: '14/18', hasStream: true },
        { label: 'Device Explorer', path: '/fleet/devices', icon: 'devices', color: 'cyan-3', badge: '14 Active', badgeBg: 'cyan-10', badgeColor: 'cyan-2' },
        { label: 'Live Presence', path: '/fleet/presence', icon: 'radar', color: 'cyan-4', hasStream: true },
        { label: 'Device Groups', path: '/fleet/groups', icon: 'group_work', color: 'grey-4' },
        { label: 'Enrollment Pipelines', path: '/fleet/enrollment', icon: 'how_to_reg', color: 'grey-4' },
        { label: 'Fleet Telemetry', path: '/fleet/telemetry', icon: 'show_chart', color: 'indigo-3', hasStream: true },
        { label: 'Remote Actions', path: '/fleet/actions', icon: 'terminal', color: 'purple-3' }
      ]
    
    case 'governance':
      return [
        { label: 'Compliance Center', path: '/governance/compliance', icon: 'fact_check', color: 'green-4', badge: '99.8%', badgeBg: 'green-10', badgeColor: 'green-3' },
        { label: 'Policy Governance', path: '/governance/policy', icon: 'policy', color: 'indigo-3' },
        { label: 'Integrity Center', path: '/governance/integrity', icon: 'security', color: 'grey-4' },
        { label: 'Trust Scoring', path: '/governance/trust', icon: 'thumb_up', color: 'cyan-3' },
        // Motion explicitly permitted for quarantine spikes
        { label: 'Quarantine Center', path: '/governance/quarantine', icon: 'gpp_bad', color: 'red-4', count: '2 Locks', motionPulse: 'pulse-critical', motionDesc: 'Active quarantine isolation block triggers' },
        { label: 'Drift Analysis', path: '/governance/drift', icon: 'timeline', color: 'amber-4' }
      ]
    
    case 'observability':
      return [
        { label: 'Event Streams', path: '/observability/streams', icon: 'stream', color: 'green-4', hasStream: true },
        { label: 'Telemetry Metrics', path: '/observability/metrics', icon: 'analytics', color: 'cyan-3' },
        { label: 'Queue Health', path: '/observability/queues', icon: 'toc', color: 'grey-4' },
        // Motion permitted if WS degrades
        { label: 'WebSocket Health', path: '/observability/websocket-health', icon: 'import_export', color: 'amber-4', motionPulse: latencyMs.value > 20 ? 'pulse-warning' : '', motionDesc: 'Websocket pipeline diagnostic metrics' },
        { label: 'Audit Logs', path: '/observability/audit', icon: 'receipt_long', color: 'indigo-3' },
        { label: 'Ingestion Pipelines', path: '/observability/pipelines', icon: 'filter_alt', color: 'grey-4' }
      ]
    
    case 'deployments':
      return [
        { label: 'Rollouts Array', path: '/deployments/rollouts', icon: 'system_update_alt', color: 'amber-4', count: 'Active' },
        // Motion permitted for Rollback Events
        { label: 'Rollback Events', path: '/admin/ledger', icon: 'history', color: 'red-4', badge: '1 Alert', badgeBg: 'red-10', badgeColor: 'red-2', motionPulse: 'pulse-critical' }
      ]
    
    case 'apps':
      return [
        { label: 'Installed Apps', path: '/apps/installed', icon: 'apps', color: 'grey-4', count: '142 apps' },
        { label: 'Forbidden Apps', path: '/admin/dashboard', icon: 'block', color: 'red-4' }
      ]
    
    case 'incidents':
      return [
        { label: 'Active Incidents', path: '/incidents/active', icon: 'warning', color: 'red-4', count: '1 High', motionPulse: 'pulse-critical' },
        { label: 'Failed Operations', path: '/admin/ledger', icon: 'error_outline', color: 'amber-4' }
      ]
    
    case 'admin':
    default:
      return [
        { label: 'Global Setup', path: '/admin/settings', icon: 'settings', color: 'grey-4' },
        { label: 'Tenants Inventory', path: '/admin/tenants', icon: 'corporate_fare', color: 'indigo-3' },
        { label: 'Operators Access', path: '/admin/users', icon: 'shield', color: 'cyan-4' }
      ]
  }
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
  border-left: 3px solid #22b8cf !important;
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
  background-color: #1c262b !important;
}

.nav-item {
  transition: background-color 0.1s ease;
}
.nav-item:hover {
  background-color: #161b20;
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
