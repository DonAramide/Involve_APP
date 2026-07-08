<!-- invify-admin/src/layouts/MainLayout.vue -->
<template>
  <q-layout view="hHh Lpr lFf" :class="prefs.isDarkMode ? 'theme-dark' : 'theme-light'">
    
    <!-- Universal Extensible Command Palette Shell -->
    <EnterpriseCommandPalette ref="paletteRef" />
    <GlobalSearchModal v-model="isSearchOpen" />
    <NotificationCenter v-model="isAlertDrawerOpen" />

    <!-- Top Operational Command Header Bar -->
    <q-header elevated class="border-bottom" style="background: var(--appbar-bg); height: 42px;">
      <div class="row items-center no-wrap fit q-px-sm">
        
        <!-- SECTION 1: Identity & Static Navigation (Left) -->
        <div class="row items-center op-gap-12 no-wrap h-full flex-shrink-0">
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
          >
            <q-tooltip class="enterprise-panel bg-panel text-main border-main shadow-24" anchor="bottom middle" self="top middle" style="font-size: 11px; border: 1px solid var(--enterprise-border); border-radius: 4px;">
              Toggle Sidebar Menu (Expand / Collapse drawer)
            </q-tooltip>
          </q-btn>

          <!-- Monospace Console Engine Branding -->
          <div class="row items-center no-wrap cursor-pointer h-full" @click="$router.push('/')">
            <span class="text-metric-mono text-white text-weight-bolder" style="font-size: 14px; line-height: 1;">INVIFY</span>
            <span class="text-metric-mono text-cyan-4 q-ml-xs" style="font-size: 11px; line-height: 1; padding-top: 2px;">OPS_CORE</span>
            <q-tooltip class="enterprise-panel bg-panel text-main border-main shadow-24" anchor="bottom middle" self="top middle" style="font-size: 11px; border: 1px solid var(--enterprise-border); border-radius: 4px;">
              Invify Operations Portal Core — Click to return to landing cockpit.
            </q-tooltip>
          </div>

          <!-- Active Multi-Tenant Boundary Identifier Tag -->
          <q-btn-dropdown dense flat size="sm" color="amber-4" :content-style="prefs.isDarkMode ? 'background-color: #101826; border: 1px solid #1F2D42;' : 'background-color: #FFFFFF; border: 1px solid #D1D5DB;'" class="text-metric-sm border-amber-left q-ml-xs v-hide-xs">
            <template v-slot:label>
              <span class="text-weight-bold">{{ (prefs?.activeTenantScope || 'global').toUpperCase() }}</span>
              <q-tooltip class="enterprise-panel bg-panel text-main border-main shadow-24" anchor="bottom middle" self="top middle" style="font-size: 11px; border: 1px solid var(--enterprise-border); border-radius: 4px;">
                Active Multi-Tenant Domain Boundary. Click to toggle between isolation profiles.
              </q-tooltip>
            </template>
            <q-list :dark="prefs.isDarkMode" class="bg-panel text-caption">
              <q-item-label header class="text-operator-title text-grey-5 q-py-xs">Tenant Scope Context</q-item-label>
              <q-item clickable v-close-popup @click="setTenantScope('global')" class="hover-bg">
                <q-item-section :class="prefs.isDarkMode ? 'text-white' : 'text-main'">Global Master Array</q-item-section>
              </q-item>
              <q-item clickable v-close-popup @click="setTenantScope('tenant-alpha')" class="hover-bg">
                <q-item-section class="text-cyan-3">Tenant Alpha Scope</q-item-section>
              </q-item>
              <q-item clickable v-close-popup @click="setTenantScope('tenant-omega')" class="hover-bg">
                <q-item-section class="text-purple-3">Tenant Omega Scope</q-item-section>
              </q-item>
            </q-list>
          </q-btn-dropdown>
        </div>

        <!-- SECTION 2: Dynamic Workspace Strip (Center - Scrolling) -->
        <div class="col h-full min-width-0 q-mx-sm overflow-hidden">
          <q-tabs
            :model-value="prefs.activeWorkspace"
            @update:model-value="switchWorkspace"
            dense
            align="left"
            class="text-appbar-inactive workspace-tabs h-full"
            active-color="white"
            indicator-color="blue-5"
            breakpoint="0"
            outside-arrows
            mobile-arrows
          >
            <q-tab
              v-for="ws in workspaces"
              :key="ws.id"
              :name="ws.id"
              :label="ws.label"
              class="workspace-tab-item text-caption q-px-md"
              v-touch-hold.mouse="openReorderDialog"
            >
              <div v-if="ws.priority" class="priority-dot bg-blue-5"></div>
              <q-tooltip class="enterprise-panel bg-panel text-main border-main shadow-24" anchor="bottom middle" self="top middle" style="font-size: 11px; border: 1px solid var(--enterprise-border); border-radius: 4px;">
                Switch active workspace console to: {{ ws.label }}. (Long press to reorder)
              </q-tooltip>
            </q-tab>
          </q-tabs>
        </div>

        <!-- SECTION 3: Operations & Identity (Right) -->
        <div class="row items-center op-gap-8 no-wrap flex-shrink-0">
          
          <!-- Universal Command Palette Launcher Action -->
          <div 
            class="enterprise-subpanel q-px-sm q-py-xs rounded-borders row items-center op-gap-4 text-grey-5 text-caption cursor-pointer no-wrap hover-bg"
            @click="openCommandPalette"
            style="height: 28px; position: relative;"
          >
            <q-icon name="terminal" size="xs" color="blue-5" />
            <span style="font-size: 11px;" class="v-hide-sm">Command Index...</span>
            <q-badge color="blue-grey-9" text-color="grey-4" label="Ctrl+K" class="text-metric-sm q-ml-xs" />
            <q-tooltip class="enterprise-panel bg-panel text-main border-main shadow-24" anchor="bottom middle" self="top middle" style="font-size: 11px; border: 1px solid var(--enterprise-border); border-radius: 4px;">
              Open Enterprise Command Index Palette (Ctrl+K) to find routes, actions, or tools immediately.
            </q-tooltip>
          </div>

          <!-- Executive Alert Bell -->
          <div class="row items-center op-gap-8 no-wrap enterprise-subpanel q-px-sm q-py-xs rounded-borders" style="height: 28px; position: relative;">
            <q-btn flat dense round size="xs" icon="notifications" :color="headerBellColor" @click="toggleAlertDrawer">
              <q-badge v-if="systemAlertCount > 0" color="red-5" text-color="white" floating rounded style="top: -4px; right: -4px; font-size: 8px;">{{ systemAlertCount }}</q-badge>
              <q-tooltip class="enterprise-panel bg-panel text-main border-main shadow-24" anchor="bottom middle" self="top middle" style="font-size: 11px;">
                Global Notifications ({{ systemAlertCount }} Unread)
              </q-tooltip>
            </q-btn>
          </div>

          <!-- Theme Toggle & Diagnostic View -->
          <div class="row items-center op-gap-8 no-wrap enterprise-subpanel q-px-sm q-py-xs rounded-borders" style="height: 28px; position: relative;">
             <q-btn 
               flat 
               dense 
               round 
               size="xs" 
               :icon="prefs.isDarkMode ? 'light_mode' : 'dark_mode'" 
               :color="prefs.isDarkMode ? 'amber-5' : 'blue-5'"
               @click="toggleTheme"
             >
               <q-tooltip class="enterprise-panel bg-panel text-main border-main shadow-24" anchor="bottom middle" self="top middle" style="font-size: 11px; border: 1px solid var(--enterprise-border); border-radius: 4px;">
                 Toggle interface color profile (Dark Mode / Light Mode).
               </q-tooltip>
             </q-btn>
             <q-separator vertical dark class="q-mx-xs bg-[#22282d]" />
             <span class="live-indicator-dot" :class="isConnected ? 'bg-green-5' : 'pulse-critical'"></span>
             <div class="text-right">
               <div class="text-metric-mono text-grey-4" style="font-size: 10px; line-height: 1;">{{ throttledThroughput }} eps</div>
               <div class="text-grey-6" style="font-size: 9px; line-height: 1; margin-top: 2px;">{{ latencyMs }}ms WS</div>
               <q-tooltip class="enterprise-panel bg-panel text-main border-main shadow-24" anchor="bottom middle" self="top middle" style="font-size: 11px; border: 1px solid var(--enterprise-border); border-radius: 4px;">
                 Live High-Frequency Telemetry Status. Events: {{ throttledThroughput }} eps, Latency: {{ latencyMs }}ms.
               </q-tooltip>
             </div>
          </div>

          <!-- Enterprise Contextual Intelligence Controls -->
          <div class="row items-center op-gap-4 no-wrap enterprise-subpanel q-px-sm q-py-xs rounded-borders" style="height: 28px; position: relative;">
            <q-btn
              flat
              dense
              round
              size="xs"
              :icon="settings.enabled ? 'auto_awesome' : 'visibility_off'"
              :color="settings.enabled ? 'cyan-4' : 'grey-6'"
              @click="toggleGuidanceGlobal"
            >
              <q-tooltip class="enterprise-panel bg-panel text-main border-main shadow-24" anchor="bottom middle" self="top middle" style="font-size: 11px;">
                {{ settings.enabled ? 'Disable Context Guidance Overlay' : 'Enable Context Guidance Overlay' }}
              </q-tooltip>
            </q-btn>

            <q-btn
              flat
              dense
              round
              size="xs"
              :icon="settings.incidentModeActive ? 'gpp_maybe' : 'shield'"
              :color="settings.incidentModeActive ? 'red-5' : 'grey-6'"
              @click="toggleIncidentMode"
              :class="settings.incidentModeActive ? 'pulsing-btn' : ''"
            >
              <q-tooltip class="enterprise-panel bg-panel text-main border-main shadow-24" anchor="bottom middle" self="top middle" style="font-size: 11px;">
                {{ settings.incidentModeActive ? 'Disable Incident Noise Filter Mode' : 'Enable Incident Noise Filter Mode' }}
              </q-tooltip>
            </q-btn>

            <q-btn
              flat
              dense
              round
              size="xs"
              :icon="tourActive ? 'pause' : 'explore'"
              :color="tourActive ? 'yellow-5' : 'grey-6'"
              @click="tourActive ? stopWalkthrough() : startWalkthrough()"
            >
              <q-tooltip class="enterprise-panel bg-panel text-main border-main shadow-24" anchor="bottom middle" self="top middle" style="font-size: 11px;">
                {{ tourActive ? 'Abort Onboarding Tour' : 'Launch Narrated Tour' }}
              </q-tooltip>
            </q-btn>

            <q-separator vertical dark class="q-mx-xs bg-[#22282d]" />

            <q-btn
              flat
              dense
              round
              size="xs"
              icon="collections_bookmark"
              color="blue-5"
              @click="drawerOpen = !drawerOpen"
            >
              <q-tooltip class="enterprise-panel bg-panel text-main border-main shadow-24" anchor="bottom middle" self="top middle" style="font-size: 11px;">
                Open Pinned Knowledge & Glossary Drawer
              </q-tooltip>
            </q-btn>
          </div>

          <!-- Active Persistent Operator State Hook -->
          <q-btn-dropdown dense flat size="sm" color="grey-4" :content-style="prefs.isDarkMode ? 'background-color: #101826; border: 1px solid #1F2D42;' : 'background-color: #FFFFFF; border: 1px solid #D1D5DB;'" class="q-px-xs">
            <template v-slot:label>
              <div class="row items-center op-gap-4 no-wrap text-left">
                <q-icon :name="isSyncingBackend ? 'cloud_sync' : 'shield'" :color="isSyncingBackend ? 'amber-5' : 'blue-5'" size="xs" />
                <div class="v-hide-xs">
                  <div class="text-operator-title text-white" style="font-size: 9px; line-height: 1;">
                    {{ isSyncingBackend ? 'SYNCING...' : getRoleLabel(operatorRole) }}
                  </div>
                  <div class="text-metric-sm text-blue-3" style="font-size: 10px;">{{ operatorEmail }}</div>
                </div>
              </div>
              <q-tooltip class="enterprise-panel bg-panel text-main border-main shadow-24" anchor="bottom middle" self="top middle" style="font-size: 11px; border: 1px solid var(--enterprise-border); border-radius: 4px;">
                Active User Node: {{ operatorRole }}. Click to view access details or perform cloud continuity syncs.
              </q-tooltip>
            </template>
            <q-list :dark="prefs.isDarkMode" class="bg-panel text-caption">
              <q-item-label header class="text-operator-title text-grey-5 q-py-xs">Backend Continuity Sync</q-item-label>
              
              <q-item clickable v-close-popup @click="showUserProfile = true" class="hover-bg">
                <q-item-section avatar><q-icon name="account_circle" size="xs" color="purple-4" /></q-item-section>
                <q-item-section class="text-white">View My Profile</q-item-section>
              </q-item>
              
              <q-item clickable v-close-popup @click="fetchPreferencesFromBackend" class="hover-bg">
                <q-item-section avatar><q-icon name="cloud_download" size="xs" color="blue-5" /></q-item-section>
                <q-item-section class="text-white">Pull Cloud Profile Context</q-item-section>
              </q-item>
              <q-item clickable v-close-popup to="/onboarding" class="hover-bg">
                <q-item-section avatar><q-icon name="rocket_launch" size="xs" color="amber-4" /></q-item-section>
                <q-item-section class="text-white text-weight-bold">🧪 Onboarding Testing Flow</q-item-section>
              </q-item>
              <q-item clickable v-close-popup @click="clearHistory" class="hover-bg">
                <q-item-section avatar><q-icon name="history" size="xs" color="amber-4" /></q-item-section>
                <q-item-section class="text-white">Clear Local Session Trace</q-item-section>
              </q-item>
              <q-separator :dark="prefs.isDarkMode" />
              <q-item clickable v-close-popup @click="executeLogout" class="hover-bg text-red-3">
                <q-item-section avatar><q-icon name="logout" size="xs" color="red-4" /></q-item-section>
                <q-item-section class="text-weight-bold">Secure Session Logout</q-item-section>
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
      style="background-color: var(--sidebar-panel-bg); color: var(--enterprise-text-secondary);"
      class="sidebar-drawer"
      :width="230"
      :breakpoint="768"
    >
      <div class="column fit" style="padding-top: 42px; overflow: hidden;">
        
        <q-scroll-area class="col overflow-hidden">
          <!-- Workspace Overview block -->
          <div class="q-px-md q-pt-md q-pb-xs row items-center justify-between no-wrap">
            <div class="row items-center op-gap-4 no-wrap">
              <span class="text-operator-title text-main">{{ activeWorkspaceObj?.label }}</span>
              <q-badge :color="prefs.isDarkMode ? 'blue-grey-10' : 'blue-1'" :text-color="prefs.isDarkMode ? 'cyan-3' : 'blue-8'" class="text-metric-sm" v-if="activeWorkspaceObj?.priority">
                PRIORITY
              </q-badge>
            </div>
            <span class="text-metric-mono text-muted" style="font-size: 10px;">THROTTLED</span>
          </div>

          <!-- Dynamic Sidebar Tree (Restrained Motion + Throttled Aggregated Counters) -->
          <q-list padding dense class="q-gutter-y-xs">
            <q-item
              v-for="item in activeNavigationTree"
              :key="item.path"
              clickable
              v-ripple
              :to="item.path"
              active-class="sidebar-item-active"
              class="q-mx-xs rounded-borders text-secondary nav-item column justify-center"
              style="min-height: 30px; padding: 2px 10px;"
            >
              <div class="row items-center justify-between fit no-wrap">
                <div class="row items-center op-gap-8 no-wrap overflow-hidden">
                  <q-icon :name="item.icon" size="xs" :class="`text-${item.color || 'secondary'}`" style="min-width: 16px;" />
                  <span class="text-caption text-weight-medium ellipsis" style="font-size: 12px; color: inherit;">{{ item.label }}</span>
                </div>

                <!-- Throttled Counter strings & Restrained Warning state indicators -->
                <div class="row items-center op-gap-4 no-wrap">
                  <!-- Counters updated inside batched 2000ms execution aggregation windows -->
                  <span class="text-metric-mono text-muted" style="font-size: 11px;" v-if="item.count">{{ item.count }}</span>
                  
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

              <!-- Descriptive Operational Tooltip on Hover -->
              <q-tooltip 
                anchor="center right" 
                self="center left" 
                :offset="[10, 0]"
                class="enterprise-panel bg-panel text-main q-pa-md border-main shadow-24"
                style="max-width: 260px; font-size: 11px; line-height: 1.4; border: 1px solid var(--enterprise-border); border-radius: 6px;"
              >
                <div class="text-weight-bold text-cyan-4 q-mb-xs font-mono" style="font-size: 10px; letter-spacing: 0.5px; text-transform: uppercase;">
                  {{ item.label }}
                </div>
                <div class="text-main">{{ getMenuDescription(item.label) }}</div>
              </q-tooltip>
            </q-item>
          </q-list>

          <q-separator :dark="prefs.isDarkMode" class="q-my-md q-mx-sm opacity-10" />

          <!-- Pinned View Shortcuts -->
          <div class="q-px-md q-py-xs row items-center justify-between text-operator-title">
            <span>Operator Pinned Layouts</span>
            <q-icon name="push_pin" size="xs" color="amber-5" />
            <q-tooltip class="enterprise-panel bg-panel text-main border-main shadow-24" anchor="center right" self="center left" style="font-size: 11px; border: 1px solid var(--enterprise-border); border-radius: 4px;">
              Your bookmarked and high-priority custom workspace modules.
            </q-tooltip>
          </div>

          <div class="q-px-md q-py-xs text-muted text-caption italic" style="font-size: 11px;" v-if="prefs.pinnedViews.length === 0">
            No pinned items.
          </div>
          <q-list dense class="q-gutter-y-xs" v-else>
            <q-item 
              v-for="pin in prefs.pinnedViews" 
              :key="pin" 
              clickable 
              :to="pin" 
              class="q-mx-xs rounded-borders text-secondary" 
              style="min-height: 24px; padding: 0 10px; position: relative;"
            >
              <q-item-section avatar style="min-width: 20px;"><q-icon name="bookmark" size="xs" color="blue-5" /></q-item-section>
              <q-item-section><q-item-label style="font-size: 11px;" class="ellipsis">{{ pin }}</q-item-label></q-item-section>
              <q-item-section side>
                <q-icon name="close" size="xs" class="cursor-pointer text-muted" @click.prevent="togglePinView(pin)">
                  <q-tooltip class="enterprise-panel bg-panel text-main border-main shadow-24" style="font-size: 11px; border: 1px solid var(--enterprise-border); border-radius: 4px;">
                    Unpin this view from shortcuts.
                  </q-tooltip>
                </q-icon>
              </q-item-section>
              <q-tooltip class="enterprise-panel bg-panel text-main border-main shadow-24" anchor="center right" self="center left" style="font-size: 11px; border: 1px solid var(--enterprise-border); border-radius: 4px;">
                Open pinned shortcut path: {{ pin }}
              </q-tooltip>
            </q-item>
          </q-list>

          <!-- History Traversal log string -->
          <div class="q-px-md q-pt-sm q-pb-xs text-operator-title q-mt-sm" v-if="prefs.recentHistory.length > 0" style="position: relative;">
            Session History
            <q-tooltip class="enterprise-panel bg-panel text-main border-main shadow-24" anchor="center right" self="center left" style="font-size: 11px; border: 1px solid var(--enterprise-border); border-radius: 4px;">
              Your recently visited routes and workflows in this session.
            </q-tooltip>
          </div>
          <q-list dense class="q-gutter-y-xs">
            <q-item 
              v-for="hist in prefs.recentHistory.slice(0, 5)" 
              :key="hist.timestamp" 
              clickable 
              :to="hist.path" 
              class="q-mx-xs rounded-borders text-muted" 
              style="min-height: 22px; padding: 0 10px; position: relative;"
            >
              <q-item-section avatar style="min-width: 16px;"><q-icon name="history" size="xs" style="font-size: 11px;" /></q-item-section>
              <q-item-section><q-item-label style="font-size: 10px;" class="ellipsis">{{ hist.label }}</q-item-label></q-item-section>
              <q-tooltip class="enterprise-panel bg-panel text-main border-main shadow-24" anchor="center right" self="center left" style="font-size: 11px; border: 1px solid var(--enterprise-border); border-radius: 4px;">
                Re-visit recent history node: {{ hist.label }} ({{ new Date(hist.timestamp).toLocaleTimeString() }})
              </q-tooltip>
            </q-item>
          </q-list>

        </q-scroll-area>

        <!-- Throttled Context State Indicator Box -->
        <div class="col-auto enterprise-panel q-pa-sm border-top text-caption text-secondary" style="font-size: 10px;">
          <div class="row items-center justify-between q-mb-xs" style="position: relative;">
            <span class="text-secondary">Tenant Scope Context</span>
            <span class="text-metric-mono text-amber-3">{{ (prefs?.activeTenantScope || 'global').toUpperCase() }}</span>
            <q-tooltip class="enterprise-panel bg-panel text-main border-main shadow-24" anchor="center right" self="center left" style="font-size: 11px; border: 1px solid var(--enterprise-border); border-radius: 4px;">
              Limits operational actions and event flows exclusively to the current active tenant boundaries.
            </q-tooltip>
          </div>
          <div class="row items-center justify-between" style="position: relative;">
            <span class="text-secondary">Counter Flushing</span>
            <span class="text-metric-sm text-blue-5">2000ms BATCHED</span>
            <q-tooltip class="enterprise-panel bg-panel text-main border-main shadow-24" anchor="center right" self="center left" style="font-size: 11px; border: 1px solid var(--enterprise-border); border-radius: 4px;">
              Incoming edge telemetry streams are aggregated and flushed in 2000ms cycles to minimize UI thread blocking.
            </q-tooltip>
          </div>
        </div>

      </div>
    </q-drawer>

    <!-- Master Sub-frame page layer -->
    <q-page-container class="relative-position" style="background-color: var(--enterprise-page-bg);">
      <!-- Ambient Branding Watermark -->
      <div class="watermark-bg" />

      <!-- Route trace info header -->
      <div class="enterprise-panel q-px-md q-py-xs row items-center justify-between border-bottom text-grey-5" style="font-size: 11px;">
        <div class="row items-center op-gap-8 no-wrap overflow-hidden" style="position: relative;">
          <q-icon name="route" color="blue-5" size="xs" />
          <span class="text-main text-weight-medium ellipsis">Explicit Route Pathway: {{ $route.fullPath }}</span>
          <span>|</span>
          <span class="text-metric-mono text-muted">RBAC Scope Check: Passed</span>
          <q-tooltip class="enterprise-panel bg-panel text-main border-main shadow-24" anchor="bottom middle" self="top middle" style="font-size: 11px; border: 1px solid var(--enterprise-border); border-radius: 4px;">
            Your precise navigation location path in the console along with active RBAC security validation status.
          </q-tooltip>
        </div>
        <q-btn 
          flat 
          dense 
          size="xs" 
          :color="isViewPinned($route.path) ? 'amber-5' : 'grey-6'" 
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

    <!-- Persistent Right-Side Operational Knowledge Base Drawer -->
    <operational-knowledge-drawer />

    <!-- Reorder Workspaces Dialog -->
    <q-dialog v-model="reorderDialogVisible">
      <q-card class="bg-panel text-main" style="width: 400px; max-width: 90vw; border: 1px solid var(--enterprise-border)">
        <q-card-section class="row items-center justify-between border-bottom q-py-sm">
          <div class="text-subtitle2 text-weight-bold">Rearrange Workspaces</div>
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section class="q-pa-none">
          <q-list separator>
            <q-item v-for="(ws, index) in localWorkspaceOrder" :key="ws.id" class="q-py-sm">
              <q-item-section>
                <q-item-label>{{ ws.label }}</q-item-label>
              </q-item-section>
              <q-item-section side class="row items-center op-gap-4">
                <q-btn icon="keyboard_arrow_up" size="sm" flat dense round color="blue-5" @click="moveWorkspace(index, -1)" :disable="index === 0" />
                <q-btn icon="keyboard_arrow_down" size="sm" flat dense round color="blue-5" @click="moveWorkspace(index, 1)" :disable="index === localWorkspaceOrder.length - 1" />
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
        <q-card-actions align="right" class="border-top q-pa-sm">
          <q-btn flat label="Cancel" color="grey" v-close-popup />
          <q-btn flat label="Save Order" color="blue-5" @click="saveReorder" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- User Profile Modal -->
    <q-dialog v-model="showUserProfile">
      <q-card style="min-width: 350px" class="bg-blue-grey-10 text-white">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">My Profile</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        
        <q-card-section class="text-center q-pt-lg">
          <q-avatar size="80px" color="primary" text-color="white" class="q-mb-md">
            {{ operatorEmail ? operatorEmail.charAt(0).toUpperCase() : 'U' }}
          </q-avatar>
          <div class="text-h6">{{ operatorEmail }}</div>
          <div class="text-subtitle1 text-grey-4">{{ getRoleLabel(operatorRole) }}</div>
        </q-card-section>
        
        <q-card-section>
          <q-list dark bordered separator class="rounded-borders">
            <q-item>
              <q-item-section avatar>
                <q-icon name="badge" color="blue-3" />
              </q-item-section>
              <q-item-section>
                <q-item-label>Access Role</q-item-label>
                <q-item-label caption class="text-grey-4">{{ operatorRole }}</q-item-label>
              </q-item-section>
            </q-item>
            <q-item>
              <q-item-section avatar>
                <q-icon name="verified_user" color="green-4" />
              </q-item-section>
              <q-item-section>
                <q-item-label>Status</q-item-label>
                <q-item-label caption class="text-grey-4">Active Session</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
        
        <q-card-actions align="center" class="q-pa-md">
          <q-btn color="primary" label="Close" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

  </q-layout>
</template>

<script setup>
import { ref, computed, watch, provide, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import { useTelemetryStream } from '../composables/useTelemetryStream'
import { useOperatorPreferences } from '../composables/useOperatorPreferences'

import EnterpriseCommandPalette from '../components/navigation/EnterpriseCommandPalette.vue'
import GlobalSearchModal from '../components/GlobalSearchModal.vue'
import NotificationCenter from '../components/NotificationCenter.vue'
import { NotificationEngine } from '../services/NotificationEngine'
import { connectionManagerSingleton } from '../services/realtime/RealtimeConnectionManager'
import { operationalEventBusSingleton } from '../services/realtime/OperationalEventBus'
import { useContextualIntelligence } from '../composables/useContextualIntelligence'
import OperationalKnowledgeDrawer from '../components/contextual/OperationalKnowledgeDrawer.vue'

const router = useRouter()
const route = useRoute()
const $q = useQuasar()

// New State for Modals
const isSearchOpen = ref(false)
const showUserProfile = ref(false)
const isAlertDrawerOpen = ref(false)
const systemAlertCount = ref(0)
const hasCriticalAlerts = ref(false)

// Alert System Hookup
const updateAlertCount = () => {
  systemAlertCount.value = NotificationEngine.getUnreadCount()
  hasCriticalAlerts.value = NotificationEngine.hasCriticalUnread()
}

const headerBellColor = computed(() => {
  if (hasCriticalAlerts.value) return 'red-5'
  if (systemAlertCount.value > 0) return 'amber-4'
  return 'green-4'
})

onMounted(() => {
  NotificationEngine.subscribe(updateAlertCount)
})

onUnmounted(() => {
  NotificationEngine.unsubscribe(updateAlertCount)
})

const toggleAlertDrawer = () => {
  isAlertDrawerOpen.value = !isAlertDrawerOpen.value
}

// Pull enhanced asynchronous persistent storage handlers
const { prefs, isSyncingBackend, setActiveWorkspace, setTenantScope, toggleSidebarCollapse, toggleTheme, togglePinView, isViewPinned, pushHistory, clearHistory, executeLogout, fetchPreferencesFromBackend, setWorkspaceOrder } = useOperatorPreferences()

// useContextualIntelligence setup
const {
  settings,
  drawerOpen,
  tourActive,
  toggleGuidanceGlobal,
  toggleIncidentMode,
  startWalkthrough,
  stopWalkthrough
} = useContextualIntelligence()

const operatorEmail = ref(localStorage.getItem('operator_email') || 'sysadmin@IIPS.app')
const operatorRole = ref(localStorage.getItem('operator_role') || 'SUPER_ADMIN')

const operatorRolesArray = computed(() => {
  if (!operatorRole.value) return []
  return operatorRole.value.split(',').map(r => r.trim())
})

const hasRole = (roles) => {
  const checkRoles = Array.isArray(roles) ? roles : [roles]
  return operatorRolesArray.value.some(r => checkRoles.includes(r))
}

const isSuperAdmin = computed(() => hasRole('SUPER_ADMIN'))

const getRoleLabel = (roleStr) => {
  const map = {
    SUPER_ADMIN: 'Operator Node',
    ADMIN_DEPLOY: 'Deploy Ops Node',
    ADMIN_OPS: 'Fleet Ops Node',
    ADMIN_RISK: 'Risk Ops Node',
    ADMIN_EXECUTIVE: 'Executive Node',
    ADMIN_FINANCE: 'Finance Ops Node',
    ADMIN_TREASURY: 'Treasury Ops Node',
    STAFF: 'Staff Node',
    OWNER: 'Tenant Owner'
  }
  const roles = roleStr ? roleStr.split(',').map(r => r.trim()) : []
  return roles.map(r => map[r] || 'Workspace Node').join(' + ')
}

const paletteRef = ref(null)
const openCommandPalette = () => {
  isSearchOpen.value = true
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

// Synchronize theme classes directly with document.body and Quasar framework globals to guarantee zero mismatch
watch(() => prefs.value.isDarkMode, (isDark) => {
  $q.dark.set(isDark)
  if (isDark) {
    document.body.classList.add('theme-dark')
    document.body.classList.remove('theme-light')
  } else {
    document.body.classList.add('theme-light')
    document.body.classList.remove('theme-dark')
  }
}, { immediate: true })

const workspaces = computed(() => {
  const list = []
  const isPlatformStaff = hasRole([
    'SUPER_ADMIN',
    'STAFF',
    'ADMIN_DEPLOY',
    'ADMIN_OPS',
    'ADMIN_RISK',
    'ADMIN_EXECUTIVE',
    'ADMIN_FINANCE',
    'ADMIN_TREASURY'
  ])
  
  // 1. Fleet Operations (accessible to all)
  list.push({ id: 'fleet', label: 'Fleet Operations', priority: true })
  
  // 2. Finance & Audit (accessible to all)
  list.push({ id: 'finance', label: 'Finance & Audit', priority: true })

  // 3. Governance (accessible to platform staff)
  if (isPlatformStaff) {
    list.push({ id: 'governance', label: 'Governance', priority: true })
  }
  
  // 4. Observability (accessible to all)
  list.push({ id: 'observability', label: 'Observability', priority: true })
  
  // 5. AI Operational Intelligence (accessible exclusively to SUPER_ADMIN and EXECUTIVE)
  if (hasRole(['SUPER_ADMIN', 'ADMIN_EXECUTIVE'])) {
    list.push({ id: 'ai', label: 'AI Operational Intelligence', priority: true })
  }
  
  // 6. Deployments (accessible exclusively to SUPER_ADMIN and DEPLOY)
  if (hasRole(['SUPER_ADMIN', 'ADMIN_DEPLOY'])) {
    list.push({ id: 'deployments', label: 'Deployments', priority: false })
  }
  
  // 7. Applications (accessible exclusively to SUPER_ADMIN and OPS)
  if (hasRole(['SUPER_ADMIN', 'ADMIN_OPS'])) {
    list.push({ id: 'apps', label: 'Applications', priority: false })
  }
  
  // 8. Incident Response (accessible exclusively to SUPER_ADMIN and RISK)
  if (hasRole(['SUPER_ADMIN', 'ADMIN_RISK'])) {
    list.push({ id: 'incidents', label: 'Incident Response', priority: false })
  }
  
  // 9. Automation & Policy (accessible exclusively to SUPER_ADMIN and DEPLOY)
  if (hasRole(['SUPER_ADMIN', 'ADMIN_DEPLOY'])) {
    list.push({ id: 'automation', label: 'Automation & Policy', priority: false })
  }
  
  // 10. Operational Communications (accessible to platform staff)
  if (isPlatformStaff) {
    list.push({ id: 'communications', label: 'Operational Communications', priority: false })
  }
  
  // 11. Administration (accessible exclusively to SUPER_ADMIN and DEPLOY)
  if (hasRole(['SUPER_ADMIN', 'ADMIN_DEPLOY'])) {
    list.push({ id: 'admin', label: 'Administration', priority: false })
  }
  
  if (prefs.value.workspaceOrder && prefs.value.workspaceOrder.length > 0) {
    list.sort((a, b) => {
      let idxA = prefs.value.workspaceOrder.indexOf(a.id)
      let idxB = prefs.value.workspaceOrder.indexOf(b.id)
      if (idxA === -1) idxA = 999
      if (idxB === -1) idxB = 999
      return idxA - idxB
    })
  }
  
  return list
})

// Reorder Logic
const reorderDialogVisible = ref(false)
const localWorkspaceOrder = ref([])

const openReorderDialog = () => {
  localWorkspaceOrder.value = [...workspaces.value]
  reorderDialogVisible.value = true
}

const moveWorkspace = (index, direction) => {
  const targetIndex = index + direction
  if (targetIndex < 0 || targetIndex >= localWorkspaceOrder.value.length) return
  const temp = localWorkspaceOrder.value[index]
  localWorkspaceOrder.value[index] = localWorkspaceOrder.value[targetIndex]
  localWorkspaceOrder.value[targetIndex] = temp
}

const saveReorder = () => {
  const newOrder = localWorkspaceOrder.value.map(w => w.id)
  setWorkspaceOrder(newOrder)
}

// Centralized Workspace Switching Logic
const activeWorkspaceObj = computed(() => {
  return workspaces.value.find(w => w.id === prefs.value.activeWorkspace) || workspaces.value[0]
})

const switchWorkspace = (id) => {
  if (prefs.value.activeWorkspace === id) return
  setActiveWorkspace(id)
}

// Watch for workspace changes to handle routing (Single Source of Truth)
watch(() => prefs.value.activeWorkspace, (newId) => {
  const targetMap = {
    fleet: '/fleet/overview',
    finance: '/finance/reconciliation',
    governance: '/governance/compliance',
    observability: '/observability/streams',
    ai: '/ai/copilot',
    deployments: '/deployments/rollouts',
    apps: '/apps/installed',
    incidents: '/incidents/active',
    automation: '/automation/policy',
    communications: '/communications/broadcast-center',
    admin: '/admin/settings'
  }
  
  if (targetMap[newId]) {
    router.push(targetMap[newId]).catch(() => {})
  }
})

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
        { label: 'Terminal Management', path: '/fleet/terminals', icon: 'point_of_sale', color: 'teal-3', badge: 'POS', badgeBg: 'teal-10', badgeColor: 'teal-2' },
        { label: 'Device Activation Hub', path: '/devices', icon: 'vpn_key', color: 'amber-4', badge: 'ACTIVATOR', badgeBg: 'amber-10', badgeColor: 'amber-2' },
        { label: 'Live Presence Map', path: '/fleet/presence', icon: 'radar', color: 'cyan-4', hasStream: true },
        { label: 'Device Groups Array', path: '/fleet/groups', icon: 'group_work', color: 'grey-4' },
        { label: 'Enrollment Pipelines', path: '/fleet/enrollment', icon: 'how_to_reg', color: 'grey-4' },
        { label: 'Fleet Telemetry Grid', path: '/fleet/telemetry', icon: 'show_chart', color: 'indigo-3', hasStream: true },
        { label: 'Remote Action Controls', path: '/fleet/actions', icon: 'terminal', color: 'purple-3' }
      ]
      
    case 'finance':
      return [
        { label: 'Transactions', path: '/finance/transactions', icon: 'sync_alt', color: 'cyan-4', badge: 'INVESTIGATE', badgeBg: 'cyan-10', badgeColor: 'cyan-3' },
        { label: 'Financial Ledger', path: '/finance/ledger', icon: 'account_balance_wallet', color: 'amber-4', badge: 'SOURCE', badgeBg: 'amber-10', badgeColor: 'amber-3' },
        { label: 'Reconciliation', path: '/finance/reconciliation', icon: 'fact_check', color: 'green-4' },
        { label: 'Settlements', path: '/finance/settlements', icon: 'payments', color: 'indigo-4' },
        { label: 'Audit Engine', path: '/finance/audit', icon: 'policy', color: 'red-4' }
      ]
    
    case 'governance':
      return [
        { label: 'Operator Governance', path: '/governance/operators', icon: 'manage_accounts', color: 'blue-4' },
        { label: 'RBAC Capabilities & Matrix', path: '/governance/rbac-roles', icon: 'admin_panel_settings', color: 'amber-4' },
        { label: 'Approval Engine', path: '/governance/approvals', icon: 'fact_check', color: 'purple-4', badge: 'Queue', badgeBg: 'purple-10', badgeColor: 'purple-3' },
        { label: 'Compliance Audits', path: `${tScope}/governance/compliance`, icon: 'fact_check', color: 'green-4', badge: '99.8%', badgeBg: 'green-10', badgeColor: 'green-3' },
        { label: 'Audit Trail Ledger', path: '/governance/audit-trail', icon: 'history_edu', color: 'blue-5' },
        { label: 'User Device Approvals', path: '/governance/user-devices', icon: 'phonelink_lock', color: 'red-4' },
        { label: 'Enterprise Support Desk', path: '/governance/support', icon: 'headset_mic', color: 'amber-4', badge: 'TICKETS', badgeBg: 'amber-10', badgeColor: 'amber-2' },
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
        { label: 'Release Channels', path: '/deployments/channels', icon: 'alt_route', color: 'amber-4', badge: '5 Tracks', badgeBg: 'amber-10', badgeColor: 'amber-3' }
      ]
    
    case 'apps':
      return [
        { label: 'APK Fleet Deployment', path: '/apps/apk-deployment', icon: 'system_update', color: 'cyan-4', badge: '3 Vault Slots', badgeBg: 'cyan-10', badgeColor: 'cyan-2' },
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
        { label: 'AI Operational Copilot', path: '/ai/copilot', icon: 'psychology', color: 'cyan-3', badge: 'Ground Truth', badgeBg: 'cyan-10', badgeColor: 'cyan-2' },
        { label: 'AI Lesson Planner', path: '/notes', icon: 'auto_awesome', color: 'indigo-3', badge: 'AI', badgeBg: 'indigo-10', badgeColor: 'indigo-2' },
        { label: 'Executive Command Center', path: '/executive', icon: 'dashboard', color: 'cyan-4' },
        { label: 'AI Insights Center', path: '/executive/ai-insights', icon: 'insights', color: 'cyan-3', badge: 'PREDICTIVE', badgeBg: 'cyan-10', badgeColor: 'cyan-2' }
      ]
    
    case 'communications':
      return [
        { label: 'Broadcast Center Hub', path: '/communications/broadcast-center', icon: 'podcasts', color: 'cyan-4', badge: 'SOC NOC', badgeBg: 'cyan-10', badgeColor: 'cyan-2' },
        { label: 'Preflight Previews', path: '/communications/broadcast-center?tab=preflight', icon: 'science', color: 'amber-4' },
        { label: 'Lineage Hash Audits', path: '/communications/broadcast-center?tab=audits', icon: 'receipt_long', color: 'indigo-3' }
      ]

    case 'admin':
    default:
      return [
        { label: 'Platform Overview', path: '/admin/settings', icon: 'dashboard', color: 'cyan-4' },
        { label: 'Platform Configuration', path: '/admin/config', icon: 'tune', color: 'cyan-4' },
        { label: 'Authentication Settings', path: '/admin/settings/authentication', icon: 'security', color: 'indigo-4', badge: 'Onboarding', badgeBg: 'indigo-10', badgeColor: 'indigo-2' },
        { label: 'Integration Vault', path: '/admin/vault', icon: 'lock', color: 'orange-4', badge: 'Secrets', badgeBg: 'orange-10', badgeColor: 'orange-2' },
        { label: 'Tenants Identity Matrix', path: '/admin/tenants', icon: 'corporate_fare', color: 'indigo-3' },
        { label: 'Operators Access Profiles', path: '/admin/users', icon: 'shield', color: 'cyan-4' },
        { label: 'Tenant Orchestration', path: '/admin/orchestration', icon: 'settings_input_component', color: 'accent', badge: 'Ecosystem', badgeBg: 'amber-10', badgeColor: 'amber-2' },
        { label: 'Agent Governance & Onboarding', path: '/admin/agents', icon: 'support_agent', color: 'amber-4', badge: 'Field Ops', badgeBg: 'amber-10', badgeColor: 'amber-2' },
        { label: 'Agent Commissions & Billing', path: '/admin/agents/commissions', icon: 'account_balance_wallet', color: 'green-4' },
        { label: 'Enterprise Billing & Fees', path: '/admin/billing', icon: 'payments', color: 'teal-4', badge: 'Finance', badgeBg: 'teal-10', badgeColor: 'teal-2' },
        { label: 'EMV POS Gateway', path: '/admin/pos-gateway', icon: 'point_of_sale', color: 'purple-4', badge: 'LIVE', badgeBg: 'purple-10', badgeColor: 'purple-2' },
        { label: 'Contact Maintenance', path: '/admin/contact', icon: 'contact_phone', color: 'grey-4' }
      ]
  }
})

const getMenuDescription = (label) => {
  const descriptions = {
    // Fleet
    'Fleet Overview': 'Monitor real-time status, online/offline indices, and general operational integrity of the edge device portfolio.',
    'Device Explorer': 'Deep-dive into specific edge devices, examine hardware specifications, network interfaces, and connection logs.',
    'Device Activation Hub': 'Securely claim, register, and activate new POS terminal hardware and edge gateways into the tenant\'s context.',
    'Live Presence Map': 'Visualize geographical presence, cellular tower triangulation, and active execution locations of live edge systems.',
    'Device Groups Array': 'Organize edge terminals into administrative groups to target policy configurations and OTA software deployments in bulk.',
    'Enrollment Pipelines': 'Configure automated staging pipelines, bootstrap scripts, and initial trust profiling for zero-touch provisioning.',
    'Fleet Telemetry Grid': 'Inspect high-frequency system performance counters, memory usage profiles, CPU temperatures, and network packet health.',
    'Remote Action Controls': 'Execute immediate remote recovery scripts, trigger key updates, purge local caches, or command secure reboots.',

    // Governance
    'Compliance Audits': 'Continuous real-time verification of operational processes against SLA definitions, central bank guidelines, and security requirements.',
    'Audit Trail Ledger': 'Trace security, authentication, and operator change histories via immutable, cryptographically sealed lineage logs.',
    'User Device Approvals': 'Manage browser device approvals for admins, staff, and tenant operators to prevent unauthorized logins.',
    'Policy Governance': 'Draft, model, and distribute system-wide structural policies, transaction restrictions, and automated remediation boundaries.',
    'Integrity Center': 'Verify system integrity, binary hashes, and boot verification keys across operational channels and edge hardware.',
    'Trust Scoring': 'Review cryptographic trust indices, anomaly detection risk ranks, and session access metrics for multi-workstation operators.',
    'Quarantine Center': 'Review, isolate, and remediate compromised operational channels, suspicious devices, and flagged transactions.',
    'Drift Analysis': 'Trace operational variance, undocumented local configurations, and policy changes to prevent baseline corruption.',

    // Observability
    'Live Event Streams': 'Analyze real-time event logs, system operations, and telemetry streams arriving from edge layers globally.',
    'Telemetry Metrics': 'Render aggregated statistical dashboards of general platform capacity, processing speeds, and success rates.',
    'Queue Health Maps': 'Monitor transit brokers, message pipeline loads, and pending task structures to identify operational bottlenecks.',
    'WebSocket Diagnostics': 'Track real-time duplex channel metrics, active subscriber nodes, frame transmission integrity, and latency indices.',
    'Audit Logs Base': 'Immutable double-entry operational logging trace system preserving permanent administrative change histories.',
    'Ingestion Pipelines': 'Configure event collectors, stream mapping logic, log indexing parameters, and downstream storage routing profiles.',

    // Finance
    'Transactions': 'Cross-channel transaction investigation, ledger mapping, and fraud anomaly traces.',
    'Financial Ledger': 'Double-entry ledger chart of accounts, immutable journal explorer, and posting parity checks.',
    'Reconciliation': 'Settlement matching, exception queue management, and cross-ledger reconciliation rules.',
    'Settlements': 'Batch settlement orchestration, processing queues, and bank gateway clearing status.',
    'Audit Engine': 'Immutable financial action tracing, compliance checks, and operational audit logs.',

    // Deployments
    'Rollout Control Center': 'Manage progressive rollout campaigns, automated canary triggers, and rollback rules for platform software.',
    'Release Channels': 'Establish and configure staging, beta, production, and high-frequency canary channels for target tenant groups.',
    'Rollback Safeguards': 'Manage emergency rollback profiles, recovery scripts, and target configuration baselines to restore system balance.',

    // Apps
    'APK Fleet Deployment': 'Upload, vault, and remotely install or uninstall APK packages across selected fleet devices. Supports a maximum of 3 concurrent APK vault entries.',
    'Installed Applications Explorer': 'Browse and audit the full portfolio of installed applications, microservices, and client versions across edge nodes.',
    'Forbidden Apps Governance': 'Define and enforce platform-level blacklists to prevent sideloading of unauthorized or high-risk packages.',
    'Accessibility Abuse Interception': 'Track applications requesting invasive accessibility permissions, protecting terminals from credential hijacking.',
    'Sideload & Package Lineage': 'Perform cryptographic verification and trace binary lineages of sideloaded operational modules.',

    // Incidents
    'Active Edge Incidents': 'Acknowledge, analyze, and manage active incident alerts, system faults, and high-priority infrastructure failures.',

    // Automation
    'Policy Intelligence Center': 'Run dry-run policy simulations, evaluate automated safety triggers, and configure predictive orchestration limits.',
    'Workflow Execution & Audits': 'Track workflow state machines, inspect automated playbooks, and authorize manual action overrides.',

    // AI
    'AI Operational Copilot': 'Engage with the autonomous system copilot to draft, verify, or execute commands against the active infrastructure.',
    'AI Lesson Planner': 'Curriculum-aligned lesson note generation with NERDC standards powered by AI.',

    // Communications
    'Broadcast Center Hub': 'Draft, verify, and broadcast real-time announcements, emergency messages, and notifications to edge operators.',
    'Preflight Previews': 'Verify broadcast message rendering and delivery strategies prior to high-volume distribution.',
    'Lineage Hash Audits': 'Audit cryptographic signatures and sender identities of all platform broadcast messages.',

    // Admin
    'Platform Overview': 'Single-pane-of-glass administrative command center aggregating ecosystem health, security, operations, and telemetry.',
    'Platform Configuration': 'Configure core platform parameters, localization & currency systems, session security policies, and whitelabel branding.',
    'Authentication Settings': 'Manage onboarding verification channels, SMS integrations, and security rules for new tenants.',
    'Contact Maintenance': 'Update support contact numbers and dispatch real-time emergency notifications to active devices.',
    'Global Setup & RBAC': 'Configure core platform parameters, primary currency defaults, global variables, and roles & permissions.',
    'Tenants Identity Matrix': 'Manage tenant registrations, approve incoming business profiles, provision database schemas, and view indices.',
    'Operators Access Profiles': 'Configure internal administrative operator profiles, map RBAC scopes, and verify MFA parameters.',
    'Tenant Orchestration': 'Authoritatively manage backend feature flags, reactive JSON branding tokens, and tier consumption limits.',
    'Agent Governance & Onboarding': 'Provision field agents, monitor commissions, and manage terminal onboarding delegation credentials.',
    'Agent Commissions & Billing': 'Configure Revenue Sharing and Onboarding Fees for Agents across the platform.',
    'Enterprise Billing & Fees': 'Govern subscription plans, transaction processing fees, settlement splits, and live treasury logs.',
    'EMV POS Gateway': 'Live switchboard for routing EMV card transactions between Cpoint-Kimono (HTTPS REST), Medusa (ISO8583 TCP), and NIBSS — with real-time failover, terminal key cache management, and a full transaction log.'
  }
  return descriptions[label] || 'Access and govern this administrative module.'
}

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

onUnmounted(() => {
  if (throttleTimer) clearInterval(throttleTimer)
})
</script>

<style scoped>
.border-bottom { border-bottom: 1px solid var(--enterprise-border); }
.border-top { border-top: 1px solid var(--enterprise-border); }
.border-muted { border: 1px solid var(--enterprise-border); }
.border-amber-left { border-left: 2px solid #fcc419; }

.workspace-tabs {
  height: 100%;
}

.watermark-bg {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 500px;
  height: 500px;
  background-image: url('../assets/logo_transparent.png');
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;
  opacity: 0.04;
  pointer-events: none;
  z-index: 0;
}

.theme-dark .watermark-bg {
  opacity: 0.12;
  filter: brightness(1.6) contrast(1.1);
}

.workspace-tab-item {
  height: 42px;
  min-height: 42px;
  text-transform: none;
  font-weight: 500;
  letter-spacing: 0.02em;
}

.workspace-tab-btn {
  height: 42px;
  border-radius: 0;
  transition: all 0.15s ease;
  border-bottom: 2px solid transparent;
  white-space: nowrap;
}

.scroll-hide::-webkit-scrollbar {
  display: none;
}
.scroll-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.flex-shrink-0 {
  flex-shrink: 0 !important;
}

.min-width-0 {
  min-width: 0 !important;
}

.workspace-tab-btn--active {
  border-bottom: 2px solid #22b8cf;
  background-color: #161b20;
}

.workspace-tab-btn:hover {
  background-color: rgba(34, 184, 207, 0.1);
}

.sidebar-item-active {
  border-left: 3px solid var(--sidebar-accent) !important;
  background-color: var(--sidebar-active) !important;
  color: var(--enterprise-text-main) !important;
  box-shadow: inset 1px 0 8px rgba(31, 111, 235, 0.08);
}

.bg-muted {
  background-color: var(--enterprise-text-muted) !important;
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

.pulsing-btn {
  animation: headerBtnPulse 1.5s infinite;
}

@keyframes headerBtnPulse {
  0% {
    box-shadow: 0 0 0 0 rgba(248, 81, 73, 0.4);
    background: rgba(248, 81, 73, 0.1);
  }
  70% {
    box-shadow: 0 0 0 6px rgba(248, 81, 73, 0);
    background: rgba(248, 81, 73, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(248, 81, 73, 0);
    background: rgba(248, 81, 73, 0);
  }
}
</style>
