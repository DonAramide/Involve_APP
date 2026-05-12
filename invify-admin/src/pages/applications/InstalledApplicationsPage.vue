<!-- invify-admin/src/pages/applications/InstalledApplicationsPage.vue -->
<template>
  <q-page class="bg-[#0b0f12] text-[#e1e7ec] q-pa-md column op-gap-16 fit overflow-hidden" style="height: calc(100vh - 50px);">
    
    <!-- Top Configuration Header Strip -->
    <div class="row items-center justify-between no-wrap border-bottom q-pb-sm shrink-0">
      <div class="row items-center op-gap-8 no-wrap">
        <q-icon name="apps" size="sm" color="cyan-3" />
        <div>
          <div class="text-operator-title text-white text-weight-bold" style="font-size: 14px;">Endpoint Installed Applications Explorer</div>
          <div class="text-metric-mono text-grey-5" style="font-size: 10px;">EXPLICIT_TRUST_STATES // PERMISSION_DRIFT_INTELLIGENCE</div>
        </div>
      </div>
      
      <!-- Live Search & Filtering controllers -->
      <div class="row items-center op-gap-8 no-wrap text-caption text-grey-5">
        <q-input
          v-model="searchQuery"
          dense dark filled
          placeholder="Filter package / name..."
          class="bg-[#12161a] text-caption"
          style="width: 200px;"
        >
          <template v-slot:append>
            <q-icon name="search" size="xs" color="grey-6" />
          </template>
        </q-input>

        <q-select
          v-model="selectedTrustFilter"
          :options="['ALL_TRUST_STATES', 'TRUSTED', 'MONITORED', 'SUSPICIOUS', 'RESTRICTED', 'BLOCKED']"
          dense dark filled options-dense
          class="bg-[#12161a] text-caption v-hide-xs"
          style="width: 150px;"
        />
      </div>
    </div>

    <!-- MAIN SECTION: 12-Column Virtualized Application Grid & Deep Contextual Detail Drawer -->
    <div class="row items-stretch op-gap-16 col min-h-0 fit">
      
      <!-- LEFT PORTION: Virtualized Table layout implementing exactly 12 Master Grid Columns -->
      <div class="column fit border-muted rounded-borders bg-[#12161a] overflow-hidden" :class="selectedApp ? 'col-12 col-md-7' : 'col-12'">
        
        <div class="panel-header bg-[#161b20] q-px-sm q-py-xs border-bottom row items-center justify-between shrink-0">
          <div class="row items-center op-gap-4 no-wrap">
            <q-icon name="view_list" size="xs" color="cyan-3" />
            <span class="text-operator-title text-white text-weight-bold">Fleet wide Installed Package array</span>
          </div>
          <span class="text-metric-mono text-cyan-3" style="font-size: 10px;">{{ filteredPackages.length }} UNIQUE PACKAGES // 12 COLUMNS</span>
        </div>

        <!-- High-Density Custom Virtual Scroll Grid Area -->
        <div class="col overflow-auto custom-scrollbar">
          <table class="enterprise-table full-width text-left" style="border-collapse: collapse;">
            <thead class="bg-[#161b20] text-grey-5 text-metric-mono text-weight-bold border-bottom sticky-header" style="font-size: 10px;">
              <tr>
                <th class="q-pa-xs">App Name</th>
                <th class="q-pa-xs">Package Name</th>
                <th class="q-pa-xs">Version</th>
                <th class="q-pa-xs">Signature</th>
                <th class="q-pa-xs">Tenant</th>
                <th class="q-pa-xs text-right">Devices</th>
                <th class="q-pa-xs">Trust State</th>
                <th class="q-pa-xs">Last Seen</th>
                <th class="q-pa-xs">Integrity</th>
                <th class="q-pa-xs">Runtime</th>
                <th class="q-pa-xs">Rollout Ch</th>
                <th class="q-pa-xs text-center">Crash Spike</th>
              </tr>
            </thead>
            
            <tbody class="text-caption" style="font-size: 11px;">
              <tr 
                v-for="app in filteredPackages" 
                :key="app.packageName"
                @click="selectedApp = app"
                class="cursor-pointer hover-row border-bottom-light"
                :class="selectedApp?.packageName === app.packageName ? 'bg-[#1e272c]' : ''"
              >
                <!-- 1. Application Name -->
                <td class="q-pa-xs text-white text-weight-bold ellipsis" style="max-width: 110px;">{{ app.appName }}</td>
                <!-- 2. Package Name -->
                <td class="q-pa-xs text-metric-mono text-grey-4 ellipsis" style="max-width: 130px; font-size: 10px;">{{ app.packageName }}</td>
                <!-- 3. Version -->
                <td class="q-pa-xs text-metric-mono text-grey-5">{{ app.version }}</td>
                <!-- 4. Signature Status -->
                <td class="q-pa-xs">
                  <span :class="app.signatureStatus === 'VERIFIED' ? 'text-green-4' : 'text-red-4'" class="text-weight-bold text-metric-sm">
                    {{ app.signatureStatus }}
                  </span>
                </td>
                <!-- 5. Tenant -->
                <td class="q-pa-xs text-metric-mono text-grey-4" style="font-size: 10px;">{{ app.tenant }}</td>
                <!-- 6. Device Count -->
                <td class="q-pa-xs text-metric-mono text-white text-weight-bold text-right">{{ app.deviceCount.toLocaleString() }}</td>
                <!-- 7. FINAL REFINEMENT #1: Explicit Trust States -->
                <td class="q-pa-xs">
                  <q-chip dense size="xs" :color="getTrustChipColor(app.trustState)" :text-color="getTrustTextColor(app.trustState)" class="text-weight-bold">
                    {{ app.trustState }}
                  </q-chip>
                </td>
                <!-- 8. Last Seen -->
                <td class="q-pa-xs text-metric-mono text-grey-6" style="font-size: 10px;">{{ app.lastSeen }}</td>
                <!-- 9. Integrity State -->
                <td class="q-pa-xs">
                  <span :class="app.integrityState === 'NOMINAL' ? 'text-green-4' : 'text-amber-4'" style="font-size: 10px;">
                    {{ app.integrityState }}
                  </span>
                </td>
                <!-- 10. Runtime State -->
                <td class="q-pa-xs text-grey-4" style="font-size: 10px;">{{ app.runtimeState }}</td>
                <!-- 11. Rollout Channel -->
                <td class="q-pa-xs text-cyan-3 text-metric-sm">{{ app.rolloutChannel }}</td>
                <!-- 12. Crash Spike Indicator -->
                <td class="q-pa-xs text-center">
                  <q-chip dense size="xs" :color="app.crashSpike ? 'red-10' : 'grey-9'" :text-color="app.crashSpike ? 'red-2' : 'grey-5'" class="text-weight-bold">
                    {{ app.crashSpike ? 'SPIKE' : 'STABLE' }}
                  </q-chip>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="panel-footer bg-[#161b20] q-pa-xs border-top text-center text-grey-6 shrink-0" style="font-size: 10px;">
          Select any application package line entry to load raw cryptographic certificate metrics and Permission Drift Intelligence inside the Inspection Drawer.
        </div>
      </div>

      <!-- RIGHT PORTION: Deep Application Detail Drawer -->
      <div v-if="selectedApp" class="col-12 col-md-5 column fit border-muted rounded-borders bg-[#12161a] overflow-hidden animate-fade shrink-0">
        
        <!-- Drawer Header -->
        <div class="panel-header bg-[#1b1515] q-px-sm q-py-xs border-bottom row items-center justify-between shrink-0" :class="`border-left-${selectedApp.trustState.toLowerCase()}`">
          <div class="row items-center op-gap-8 no-wrap overflow-hidden">
            <q-icon name="security" size="xs" :color="getTrustIconColor(selectedApp.trustState)" />
            <div class="ellipsis">
              <span class="text-white text-weight-bold text-caption">{{ selectedApp.appName }}</span>
              <span class="text-grey-5 q-ml-xs text-metric-mono" style="font-size: 10px;">{{ selectedApp.version }}</span>
            </div>
          </div>
          
          <q-btn dense flat size="xs" icon="close" color="grey-5" @click="selectedApp = null" />
        </div>

        <!-- Drawer Content Body -->
        <div class="panel-body col q-pa-sm overflow-y-auto column op-gap-12">
          
          <!-- 1. Trust Intelligence & Certificate Details -->
          <div class="bg-[#161b20] q-pa-sm rounded-borders border-left column op-gap-2">
            <div class="row items-center justify-between">
              <span class="text-metric-mono text-cyan-3 text-weight-bold" style="font-size: 10px;">TRUST EVALUATION SIGNALS:</span>
              <q-chip dense size="xs" :color="getTrustChipColor(selectedApp.trustState)" :text-color="getTrustTextColor(selectedApp.trustState)" class="text-weight-bold">
                {{ selectedApp.trustState }}
              </q-chip>
            </div>
            <div class="row justify-between text-caption text-grey-4" style="font-size: 11px;">
              <span>Package ID:</span> <span class="text-metric-mono text-white">{{ selectedApp.packageName }}</span>
            </div>
            <div class="row justify-between text-caption text-grey-4" style="font-size: 11px;">
              <span>Cryptographic SHA-256:</span> 
              <span class="text-metric-mono text-grey-5 ellipsis" style="max-width: 160px;">{{ selectedApp.certHash }}</span>
            </div>
            <div class="row justify-between text-caption text-grey-4" style="font-size: 11px;">
              <span>Sideload Source Validation:</span> <span :class="selectedApp.sideloadSafe ? 'text-green-4' : 'text-red-4'">{{ selectedApp.sideloadSafe ? 'Certified Registry' : 'Untrusted Source' }}</span>
            </div>
          </div>

          <!-- 2. FINAL REFINEMENT #2: Permission Drift Intelligence -->
          <div class="bg-[#1b1916] q-pa-sm rounded-borders border-left-amber column op-gap-2">
            <span class="text-metric-mono text-amber-4 text-weight-bold" style="font-size: 10px;">PERMISSION DRIFT INTELLIGENCE:</span>
            <div class="text-caption text-grey-4" style="font-size: 11px;">
              Behavioral tracking logs monitoring runtime permission escalation across consecutive OTA signatures:
            </div>
            
            <div class="column op-gap-2 q-mt-xs text-grey-5" style="font-size: 10px;">
              <div class="row justify-between border-bottom-light q-pb-xs">
                <span>Base Baseline [v1.0]:</span>
                <span class="text-green-4">Standard IO network sockets</span>
              </div>
              <div class="row justify-between border-bottom-light q-pb-xs">
                <span>Escalated Request [v2.0]:</span>
                <span class="text-amber-4">android.permission.SYSTEM_ALERT_WINDOW</span>
              </div>
              <div class="row justify-between text-white text-weight-bold q-pt-xs">
                <span>Active Target [{{ selectedApp.version }}]:</span>
                <span :class="selectedApp.trustState === 'BLOCKED' ? 'text-red-4' : 'text-cyan-3'">{{ selectedApp.permissionSummary }}</span>
              </div>
            </div>
          </div>

          <!-- 3. FINAL REFINEMENT #5: App Rollout Observability Correlation Hooks -->
          <div class="bg-[#12161a] q-pa-sm rounded-borders border-muted column op-gap-2">
            <span class="text-metric-mono text-grey-5" style="font-size: 10px;">ROLLOUT CORRELATION HOOKS:</span>
            <div class="row justify-between text-caption text-grey-4" style="font-size: 11px;">
              <span>Target Delivery Stream:</span> <span class="text-white">{{ selectedApp.rolloutChannel }} Track</span>
            </div>
            <div class="row justify-between text-caption text-grey-4" style="font-size: 11px;">
              <span>Crash Cluster Spikes:</span> 
              <span class="text-metric-mono" :class="selectedApp.crashSpike ? 'text-red-4 text-weight-bold' : 'text-green-4'">
                {{ selectedApp.crashSpike ? 'Breached Limits' : '0.0% Nominal' }}
              </span>
            </div>
            <div class="row justify-between text-caption text-grey-4" style="font-size: 11px;">
              <span>Integrity Degradation Link:</span> <span :class="selectedApp.integrityState !== 'NOMINAL' ? 'text-amber-4' : 'text-green-4'">{{ selectedApp.integrityState }}</span>
            </div>
          </div>

          <!-- 4. Affected Tenants & Quarantine Associations -->
          <div class="column op-gap-2">
            <span class="text-metric-mono text-grey-5" style="font-size: 10px;">QUARANTINE LOCKS ASSOCIATED:</span>
            <div class="text-caption text-grey-4" style="font-size: 11px;">
              Hardware Isolation state: <span class="text-green-4 text-weight-bold">UNLOCKED</span> across partition [{{ selectedApp.tenant }}].
            </div>
          </div>

        </div>

        <!-- Drawer Footer Action controllers -->
        <div class="panel-footer bg-[#161b20] q-pa-xs border-top row items-center justify-between shrink-0">
          <span class="text-metric-mono text-grey-6 q-ml-xs" style="font-size: 9px;">Audit justification string: Verified</span>
          <q-btn 
            dense size="xs" color="red-5" text-color="white" 
            label="Trigger Dependency Downgrade" 
            @click="triggerAppDependencyRollback(selectedApp)" 
            class="q-px-sm text-weight-bold"
          />
        </div>
      </div>

    </div>

    <!-- LOWER SECTION: Embedded Application Rollout Intelligence Charts -->
    <div class="panel-card bg-[#12161a] border-muted rounded-borders column shrink-0 q-mt-md">
      <div class="panel-header bg-[#161b20] q-px-sm q-py-xs border-bottom row items-center justify-between">
        <div class="row items-center op-gap-4 no-wrap">
          <q-icon name="insights" size="xs" color="cyan-3" />
          <span class="text-operator-title text-white text-weight-bold">Application Rollout Convergence Intelligence & Crash Slicing</span>
        </div>
        <span class="text-metric-mono text-green-4" style="font-size: 10px;">STAGED APP DEPLOYMENT PIPELINE</span>
      </div>

      <div class="panel-body q-pa-sm row items-center justify-between op-gap-16">
        
        <div class="col-12 col-md-4 column op-gap-2">
          <div class="row justify-between text-caption text-white text-weight-medium" style="font-size: 11px;">
            <span>Staged App Deployments Status</span>
            <span class="text-metric-mono text-cyan-3">4 Active Loops</span>
          </div>
          <span class="text-grey-6" style="font-size: 9px;">Controls canary execution blocks targeting external software catalogs.</span>
          <q-linear-progress dark value="0.75" color="cyan-4" track-color="grey-9" size="xs" class="q-mt-xs" />
        </div>

        <div class="col-12 col-md-4 column op-gap-2 border-left q-pl-sm">
          <div class="row justify-between text-caption text-white text-weight-medium" style="font-size: 11px;">
            <span>Dependency-Aware Rollback Constraints</span>
            <span class="text-metric-mono text-green-4">ZERO Collisions</span>
          </div>
          <span class="text-grey-6" style="font-size: 9px;">Audits cross-package signature parameters to prevent circular upgrade deadlocks.</span>
          <q-linear-progress dark value="1.0" color="green-4" track-color="grey-9" size="xs" class="q-mt-xs" />
        </div>

        <div class="col-12 col-md-4 column op-gap-2 border-left q-pl-sm">
          <div class="row justify-between text-caption text-white text-weight-medium" style="font-size: 11px;">
            <span>Rollout Convergence Velocity</span>
            <span class="text-metric-mono text-amber-4">98.2% Nominal</span>
          </div>
          <span class="text-grey-6" style="font-size: 9px;">Tracks live software payload consistency validations per target tenant scope.</span>
          <q-linear-progress dark value="0.982" color="amber-4" track-color="grey-9" size="xs" class="q-mt-xs" />
        </div>

      </div>
    </div>

  </q-page>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Notify } from 'quasar'

// Filter input states
const searchQuery = ref('')
const selectedTrustFilter = ref('ALL_TRUST_STATES')

// Selected application targeting detail inspection drawers
const selectedApp = ref(null)

// 1. Static base arrays complete with FINAL REFINEMENT #1: Explicit Trust States
const masterPackagesList = ref([
  { appName: 'Invify Kiosk Gateway', packageName: 'com.invify.kiosk.base', version: '2.4.1', signatureStatus: 'VERIFIED', tenant: 'tenant-alpha', deviceCount: 2450, trustState: 'TRUSTED', lastSeen: '14s ago', integrityState: 'NOMINAL', runtimeState: 'Foreground Active', rolloutChannel: 'Stable', crashSpike: false, certHash: 'a8f4b2c9e7d104250014200fe41a', sideloadSafe: true, permissionSummary: 'Standard Base APIs' },
  { appName: 'Invify Secure Display Engine', packageName: 'com.invify.display.engine', version: '1.2.0', signatureStatus: 'VERIFIED', tenant: 'tenant-alpha', deviceCount: 2400, trustState: 'MONITORED', lastSeen: '2m ago', integrityState: 'NOMINAL', runtimeState: 'Background Serviced', rolloutChannel: 'Beta', crashSpike: false, certHash: 'b9e4a1f8c2d304250014200cb84e', sideloadSafe: true, permissionSummary: 'Display Interception Hooks' },
  { appName: 'Invify Payment Bridge Subsystem', packageName: 'com.invify.pos.terminal', version: '3.0.4', signatureStatus: 'VERIFIED', tenant: 'tenant-omega', deviceCount: 14200, trustState: 'SUSPICIOUS', lastSeen: '1s ago', integrityState: 'NOMINAL', runtimeState: 'Foreground Active', rolloutChannel: 'Stable', crashSpike: false, certHash: 'c4d1e2f8b9a704250014200ea12b', sideloadSafe: true, permissionSummary: 'Overlay + Accessibility APIs' },
  { appName: 'Invify Hardware IO Service', packageName: 'com.invify.hw.serial', version: '2.1.0', signatureStatus: 'BROKEN', tenant: 'tenant-omega', deviceCount: 42, trustState: 'BLOCKED', lastSeen: '12m ago', integrityState: 'TAMPERED', runtimeState: 'Confined Lock', rolloutChannel: 'Emergency', crashSpike: true, certHash: 'INVALID_SIGNATURE_KEY_EXP', sideloadSafe: false, permissionSummary: 'Unauthorized Kernel Sockets' },
  { appName: 'Invify Scanner Driver Interface', packageName: 'com.invify.warehouse.scanner', version: '4.0.0', signatureStatus: 'VERIFIED', tenant: 'tenant-beta', deviceCount: 3100, trustState: 'TRUSTED', lastSeen: '4m ago', integrityState: 'NOMINAL', runtimeState: 'Background Cached', rolloutChannel: 'Canary', crashSpike: false, certHash: 'd3f2e1a8b9c404250014200f8901', sideloadSafe: true, permissionSummary: 'USB Peripheral Bridge' },
  { appName: 'Dotroid Kernel Assist Package', packageName: 'com.dotroid.kernel.assist', version: '1.0.1', signatureStatus: 'VERIFIED', tenant: 'global', deviceCount: 104250, trustState: 'RESTRICTED', lastSeen: 'just now', integrityState: 'NOMINAL', runtimeState: 'Kernel Daemon', rolloutChannel: 'Internal', crashSpike: false, certHash: 'e7d1a8f4b2c904250014200da41c', sideloadSafe: true, permissionSummary: 'Root Daemon Privileges' }
])

// Computed filter pipeline
const filteredPackages = computed(() => {
  return masterPackagesList.value.filter(app => {
    // Text search matching
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      const match = app.appName.toLowerCase().includes(q) || app.packageName.toLowerCase().includes(q)
      if (!match) return false
    }

    // Explicit Trust Filter evaluation
    if (selectedTrustFilter.value !== 'ALL_TRUST_STATES' && app.trustState !== selectedTrustFilter.value) {
      return false
    }

    return true
  })
})

// Trust State color mappings
const getTrustChipColor = (state) => {
  if (state === 'TRUSTED') return 'green-10'
  if (state === 'MONITORED') return 'blue-10'
  if (state === 'SUSPICIOUS') return 'amber-10'
  if (state === 'RESTRICTED') return 'deep-orange-10'
  if (state === 'BLOCKED') return 'red-10'
  return 'grey-9'
}

const getTrustTextColor = (state) => {
  if (state === 'TRUSTED') return 'green-2'
  if (state === 'MONITORED') return 'blue-2'
  if (state === 'SUSPICIOUS') return 'amber-2'
  if (state === 'RESTRICTED') return 'deep-orange-2'
  if (state === 'BLOCKED') return 'red-2'
  return 'grey-4'
}

const getTrustIconColor = (state) => {
  if (state === 'TRUSTED') return 'green-4'
  if (state === 'MONITORED') return 'blue-4'
  if (state === 'SUSPICIOUS') return 'amber-4'
  if (state === 'RESTRICTED') return 'deep-orange-4'
  if (state === 'BLOCKED') return 'red-5'
  return 'grey-5'
}

// Action controllers
const triggerAppDependencyRollback = (appObj) => {
  if (!appObj) return

  Notify.create({
    type: 'warning',
    message: `Auditable dependency-aware rollback payload emitted targeting package [${appObj.packageName}]`,
    position: 'bottom-right'
  })

  // Optimistically toggle parameters
  appObj.rolloutChannel = 'Downgrading'
  appObj.crashSpike = false
}
</script>

<style scoped>
.border-bottom { border-bottom: 1px solid var(--enterprise-border); }
.border-bottom-light { border-bottom: 1px solid #1a2024; }
.border-top { border-top: 1px solid var(--enterprise-border); }
.border-left { border-left: 1px solid var(--enterprise-border); }
.border-muted { border: 1px solid var(--enterprise-border); }

/* Trust border mappings */
.border-left-trusted { border-left: 3px solid #2b8a3e; }
.border-left-monitored { border-left: 3px solid #339af0; }
.border-left-suspicious { border-left: 3px solid #fcc419; }
.border-left-restricted { border-left: 3px solid #e8590c; }
.border-left-blocked { border-left: 3px solid #c92a2a; }

.border-left-amber { border-left: 3px solid #fcc419; }

.sticky-header {
  position: sticky;
  top: 0;
  z-index: 2;
}

.hover-row:hover {
  background-color: #1a2327 !important;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: #0b0f12;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #22282d;
  border-radius: 3px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #333a40;
}

@media (max-width: 600px) {
  .v-hide-xs { display: none; }
}
</style>
