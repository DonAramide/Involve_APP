<!-- invify-admin/src/layouts/MainLayout.vue -->
<template>
  <q-layout view="hHh Lpr lFf" class="bg-[#0b0f12] text-[#e1e7ec]">
    <!-- Top Operational Command Bar -->
    <q-header elevated class="bg-[#12161a] border-bottom" style="height: 42px;">
      <div class="row items-center justify-between no-wrap fit q-px-sm">
        
        <!-- Left Section: Shell Identity, Navigation drawer trigger, and Top Workspaces -->
        <div class="row items-center op-gap-12 no-wrap h-full">
          <q-btn
            flat
            dense
            round
            size="xs"
            color="grey-5"
            icon="menu"
            @click="toggleLeftDrawer"
            aria-label="Toggle navigation"
            class="q-mr-xs"
          />

          <!-- Monospace Console Brand -->
          <div class="row items-center no-wrap cursor-pointer" @click="$router.push('/')">
            <span class="text-metric-mono text-white text-weight-bolder" style="font-size: 14px;">INVIFY</span>
            <span class="text-metric-mono text-cyan-4 q-ml-xs" style="font-size: 11px; padding-top: 2px;">OPS_CORE</span>
          </div>

          <!-- Environment Badge -->
          <q-badge color="blue-grey-9" text-color="amber-4" class="text-metric-sm q-py-xs q-px-sm border-amber-left v-hide-xs">
            PROD-US-EAST
          </q-badge>

          <!-- DOMAIN ISOLATION WORKSPACE SWITCHER -->
          <div class="row items-center no-wrap q-ml-md op-gap-4 h-full workspace-tabs">
            <q-btn
              v-for="ws in workspaces"
              :key="ws.id"
              flat
              dense
              :label="ws.label"
              :class="['workspace-tab-btn text-caption text-weight-medium q-px-sm', activeWorkspace === ws.id ? 'workspace-tab-btn--active' : 'text-grey-6']"
              @click="switchWorkspace(ws.id)"
            />
          </div>
        </div>

        <!-- Right Section: Ingestion Stream Tickers, Active Operator context, Command shortcut -->
        <div class="row items-center op-gap-12 no-wrap">
          
          <!-- Live Telemetry Connection/Ingestion status hook -->
          <div class="row items-center op-gap-8 no-wrap bg-[#161b20] q-px-sm q-py-xs rounded-borders border-muted v-hide-sm">
            <span class="live-indicator-dot" :class="isConnected ? 'pulse-healthy' : 'pulse-critical'"></span>
            <div class="text-right">
              <div class="text-metric-sm text-grey-4" style="line-height: 1;">WS: {{ connectionState.toUpperCase() }}</div>
              <div class="text-grey-6" style="font-size: 9px; line-height: 1; margin-top: 2px;">
                {{ latencyMs }}ms latency • {{ throughputEps }} eps
              </div>
            </div>
          </div>

          <!-- Global Command Palette text indicator shortcut -->
          <div class="bg-[#161b20] q-px-sm q-py-xs rounded-borders border-muted row items-center op-gap-4 text-grey-6 text-caption cursor-pointer v-hide-xs" @click="triggerCommandPalette">
            <q-icon name="search" size="xs" />
            <span style="font-size: 11px;">Search telemetry...</span>
            <q-badge color="blue-grey-9" text-color="grey-4" label="Ctrl+K" class="text-metric-sm q-ml-xs" />
          </div>

          <!-- Active Operator Attribution Session Indicator -->
          <q-btn-dropdown dense flat size="sm" color="grey-4" class="q-px-xs">
            <template v-slot:label>
              <div class="row items-center op-gap-4 no-wrap text-left">
                <q-icon name="shield" color="indigo-4" size="xs" />
                <div class="v-hide-xs">
                  <div class="text-operator-title text-white" style="font-size: 10px; line-height: 1;">Active Operator</div>
                  <div class="text-metric-sm text-cyan-3" style="font-size: 10px;">sysadmin@invify.app</div>
                </div>
              </div>
            </template>
            <q-list dark class="bg-[#161b20] text-caption">
              <q-item-label header class="text-operator-title text-grey-5 q-py-xs">Operator Attribution Roles</q-item-label>
              <q-item clickable v-close-popup>
                <q-item-section>Security Operations (SOC)</q-item-section>
                <q-item-section side><q-icon name="check" color="cyan-3" size="xs" /></q-item-section>
              </q-item>
              <q-item clickable v-close-popup>
                <q-item-section>Fintech Ledger Bursar</q-item-section>
              </q-item>
              <q-item clickable v-close-popup>
                <q-item-section>Fleet Automation Architect</q-item-section>
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

    <!-- Contextual Left Navigation Sidebar scoped to active Workspace -->
    <q-drawer
      v-model="leftDrawerOpen"
      show-if-above
      bordered
      class="bg-[#12161a] text-[#8c9ba5]"
      :width="220"
      :breakpoint="768"
    >
      <div class="column fit justify-between">
        <q-scroll-area class="col">
          <!-- Navigation Taxonomy Header mapped to active domain -->
          <div class="q-px-md q-pt-md q-pb-xs row items-center justify-between no-wrap">
            <span class="text-operator-title text-white">{{ activeWorkspaceLabel }} Domain</span>
            <q-badge color="blue-grey-9" text-color="cyan-3" class="text-metric-sm">{{ navigationItems.length }}</q-badge>
          </div>

          <!-- Dynamic Icon-First List Navigation items -->
          <q-list padding dense class="q-gutter-y-xs">
            <q-item
              v-for="item in navigationItems"
              :key="item.path"
              clickable
              v-ripple
              :to="item.path"
              active-class="bg-[#161b20] text-white border-left-active"
              class="q-mx-xs rounded-borders text-grey-5 nav-item"
              style="min-height: 28px; padding: 2px 10px;"
            >
              <q-item-section avatar style="min-width: 28px; padding-right: 4px;">
                <q-icon :name="item.icon" size="xs" :class="`text-${item.color || 'grey-5'}`" />
              </q-item-section>

              <q-item-section>
                <q-item-label class="text-caption text-weight-medium" style="font-size: 12px;">{{ item.label }}</q-item-label>
              </q-item-section>

              <q-item-section side v-if="item.badge">
                <q-badge :color="item.badgeColor || 'blue-grey-9'" text-color="white" class="text-metric-sm">
                  {{ item.badge }}
                </q-badge>
              </q-item-section>
            </q-item>
          </q-list>

          <q-separator dark class="q-my-md q-mx-sm bg-[#22282d]" />

          <!-- Platform Governance Quick Context Links -->
          <div class="q-px-md q-py-xs text-operator-title text-grey-6">Global Platforms</div>
          <q-list dense class="q-gutter-y-xs">
            <q-item clickable to="/admin/tenants" class="q-mx-xs rounded-borders text-grey-6" style="min-height: 24px; padding: 0 10px;">
              <q-item-section avatar style="min-width: 24px;"><q-icon name="corporate_fare" size="xs" /></q-item-section>
              <q-item-section><q-item-label style="font-size: 11px;">Tenants Operations</q-item-label></q-item-section>
            </q-item>
            <q-item clickable to="/admin/settings" class="q-mx-xs rounded-borders text-grey-6" style="min-height: 24px; padding: 0 10px;">
              <q-item-section avatar style="min-width: 24px;"><q-icon name="settings_applications" size="xs" /></q-item-section>
              <q-item-section><q-item-label style="font-size: 11px;">Infrastructure Setup</q-item-label></q-item-section>
            </q-item>
          </q-list>
        </q-scroll-area>

        <!-- Persistent Telemetry Footer Status Ticker inside drawer -->
        <div class="col-auto bg-[#0e1215] q-pa-sm border-top text-caption text-grey-6" style="font-size: 10px;">
          <div class="row items-center justify-between q-mb-xs">
            <span>Ingestion Engine</span>
            <span class="text-metric-sm text-green-4">ONLINE</span>
          </div>
          <div class="row items-center justify-between q-mb-xs">
            <span>DB Connection Pool</span>
            <span class="text-metric-mono text-grey-4">18/20</span>
          </div>
          <div class="row items-center justify-between">
            <span>Telemetry Buffer</span>
            <span class="text-metric-mono text-cyan-4">0.02%</span>
          </div>
        </div>
      </div>
    </q-drawer>

    <!-- Main Workspace Page Engine Container -->
    <q-page-container class="bg-[#0b0f12]">
      <!-- Workspace Sub-bar alert banner if stream buffers drift -->
      <div class="bg-[#1e1912] text-amber-3 q-px-md q-py-xs row items-center justify-between border-bottom" style="font-size: 11px;" v-if="latencyMs > 25">
        <div class="row items-center op-gap-8">
          <q-icon name="warning" color="amber-4" size="xs" />
          <span>Ingestion stream latency degrading ({{ latencyMs }}ms). Background batch compaction cycles activated.</span>
        </div>
        <q-btn flat dense size="xs" color="amber-3" label="Force Flush" class="text-weight-bold" />
      </div>

      <!-- Core Router Execution Frame -->
      <router-view v-slot="{ Component }">
        <transition appear enter-active-class="animated fadeIn" leave-active-class="animated fadeOut">
          <component :is="Component" :key="$route.fullPath" />
        </transition>
      </router-view>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, computed, provide } from 'vue'
import { useQuasar } from 'quasar'
import { useTelemetryStream } from '../composables/useTelemetryStream'

const $q = useQuasar()
const leftDrawerOpen = ref(true)

const toggleLeftDrawer = () => {
  leftDrawerOpen.value = !leftDrawerOpen.value
}

// 1. Workspace Isolation Definition Switcher
const workspaces = [
  { id: 'observability', label: 'Observability' },
  { id: 'fleet', label: 'Fleet Operations' },
  { id: 'finance', label: 'Finance Operations' },
  { id: 'governance', label: 'Governance' },
  { id: 'ai', label: 'AI Operations' }
]

const activeWorkspace = ref('observability')
provide('activeWorkspace', activeWorkspace)

const switchWorkspace = (id) => {
  activeWorkspace.value = id
}

const activeWorkspaceLabel = computed(() => {
  const f = workspaces.find(w => w.id === activeWorkspace.value)
  return f ? f.label : 'Operations'
})

// 2. Real-time Telemetry Pipeline connection stream Hook
const { isConnected, connectionState, latencyMs, throughputEps } = useTelemetryStream('quasar.core.ingestion')

// 3. Navigation Taxonomy Mapping strictly to active Workspace to prevent operator overload
const navigationItems = computed(() => {
  switch (activeWorkspace.value) {
    case 'fleet':
      return [
        { label: 'Fleet Command Center', path: '/admin/dashboard', icon: 'speed', color: 'cyan-4' },
        { label: 'Device Telemetry Grid', path: '/admin/devices', icon: 'devices', color: 'cyan-3', badge: '14 Live', badgeColor: 'cyan-9' },
        { label: 'OTA Deployments', path: '/admin/deployments', icon: 'system_update_alt', color: 'indigo-3' }
      ]
    case 'finance':
      return [
        { label: 'Fintech Hub Overview', path: '/admin/wallet', icon: 'account_balance', color: 'amber-4' },
        { label: 'Consolidated Ledger', path: '/admin/ledger', icon: 'receipt_long', color: 'amber-4' },
        { label: 'Payments Stream', path: '/admin/payments', icon: 'payments', color: 'amber-4', badge: 'Active', badgeColor: 'green-9' },
        { label: 'Reconciliation Engine', path: '/admin/reconciliation', icon: 'sync_alt', color: 'amber-5' },
        { label: 'Billing Context', path: '/admin/billing', icon: 'credit_card', color: 'deep-orange-4' }
      ]
    case 'governance':
      return [
        { label: 'Tenant Details Matrix', path: '/admin/tenants', icon: 'corporate_fare', color: 'indigo-3' },
        { label: 'Virtual Account Inventory', path: '/admin/wallet', icon: 'account_tree', color: 'cyan-3' },
        { label: 'Operator Sessions', path: '/admin/users', icon: 'shield', color: 'purple-4' }
      ]
    case 'ai':
      return [
        { label: 'AI Consumption Map', path: '/admin/dashboard', icon: 'psychology', color: 'purple-4' },
        { label: 'Digitized Lesson Streams', path: '/admin/notes', icon: 'description', color: 'green-4', badge: '4.2k', badgeColor: 'blue-grey-9' },
        { label: 'Curriculum Inventory', path: '/admin/curriculum', icon: 'auto_stories', color: 'green-4' }
      ]
    case 'observability':
    default:
      return [
        { label: 'SOC Core Dashboard', path: '/admin/dashboard', icon: 'dashboard', color: 'cyan-4' },
        { label: 'Ingestion Logs Grid', path: '/admin/ledger', icon: 'table_view', color: 'indigo-3', badge: 'Stream', badgeColor: 'indigo-9' },
        { label: 'Active Webhook Pipelines', path: '/admin/reconciliation', icon: 'webhook', color: 'amber-4' },
        { label: 'Global Configurations', path: '/admin/settings', icon: 'settings', color: 'grey-5' }
      ]
  }
})

const triggerCommandPalette = () => {
  // Simple Notify or dispatch dialog invocation shortcut
  $q.notify({
    message: 'Global Command Palette shortcut triggered (Ctrl+K). Telemetry lookup ready.',
    color: 'blue-grey-10',
    textColor: 'cyan-3',
    icon: 'search',
    position: 'top',
    timeout: 2000
  })
}
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
  color: #fff !important;
  border-bottom: 2px solid #1864ab;
  background-color: #161b20;
}

.workspace-tab-btn:hover {
  background-color: rgba(25, 100, 171, 0.1);
}

.border-left-active {
  border-left: 3px solid #1864ab !important;
}

.nav-item {
  transition: background-color 0.1s ease;
}
.nav-item:hover {
  background-color: #161b20;
}

@media (max-width: 850px) {
  .v-hide-sm { display: none !important; }
}
@media (max-width: 600px) {
  .v-hide-xs { display: none !important; }
}
</style>
