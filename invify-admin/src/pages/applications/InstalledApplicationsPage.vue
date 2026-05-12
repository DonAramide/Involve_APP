<!-- invify-admin/src/pages/applications/InstalledApplicationsPage.vue -->
<template>
  <q-page class="bg-[#0b0f12] text-[#e1e7ec] q-pa-md column op-gap-16">
    
    <!-- Title strip -->
    <div class="row items-center justify-between no-wrap border-bottom q-pb-sm">
      <div class="row items-center op-gap-8 no-wrap">
        <q-icon name="apps" size="sm" color="cyan-3" />
        <div>
          <div class="text-operator-title text-white text-weight-bold" style="font-size: 14px;">Installed Applications Inventory & Runtime Trust Control</div>
          <div class="text-metric-mono text-grey-5" style="font-size: 10px;">FORENSIC_LINEAGE // PERMISSION_DRIFT_INTELLIGENCE</div>
        </div>
      </div>
      
      <!-- Controls strip -->
      <div class="row items-center op-gap-8 no-wrap text-caption text-grey-5">
        <span class="v-hide-xs">Tenant Context:</span>
        <q-select
          v-model="activeTenantScope"
          :options="['global', 'tenant-alpha', 'tenant-omega', 'tenant-beta']"
          dense dark filled options-dense
          @update:model-value="onTenantScopeUpdated"
          class="bg-[#12161a] text-caption"
          style="width: 130px;"
        />
        <q-btn dense flat icon="refresh" size="xs" color="cyan-3" @click="triggerManualSync" class="bg-[#161b20]" />
      </div>
    </div>

    <!-- MAIN ROW: 12 Master Grid Columns with Inline Detail Drawer integration -->
    <div class="row items-stretch op-gap-16 fit">
      
      <!-- LEFT PORTION: Virtualized Table Container -->
      <div :class="selectedApp ? 'col-12 col-md-7' : 'col-12'" class="transition-all column op-gap-8">
        
        <!-- Table header controls -->
        <div class="row items-center justify-between bg-[#12161a] q-pa-sm rounded-borders border-muted text-caption">
          <div class="row items-center op-gap-8">
            <span class="text-white text-weight-bold">12 Master Application Parameters</span>
            <span class="text-metric-mono text-cyan-3" style="font-size: 10px;">{{ filteredAppsList.length }} Registered Bundles</span>
          </div>

          <div class="row items-center op-gap-8">
            <q-input v-model="searchQuery" dark dense filled placeholder="Search package or app name..." class="bg-[#161b20]" style="width: 200px;">
              <template v-slot:append>
                <q-icon name="search" size="xs" />
              </template>
            </q-input>
          </div>
        </div>

        <!-- Virtualized Table Layout Grid -->
        <div class="panel-card bg-[#12161a] border-muted rounded-borders column fit overflow-hidden">
          <div class="table-container overflow-auto" style="max-height: 480px;">
            <table class="enterprise-table fit text-left text-caption" style="border-collapse: collapse;">
              <thead class="bg-[#161b20] text-grey-5 border-bottom sticky-top" style="font-size: 10px; z-index: 10;">
                <tr>
                  <th class="q-pa-xs">Application Name</th>
                  <th class="q-pa-xs">Package Name</th>
                  <th class="q-pa-xs">Version</th>
                  <th class="q-pa-xs">Signature Status</th>
                  <th class="q-pa-xs">Tenant</th>
                  <th class="q-pa-xs text-right">Device Count</th>
                  <th class="q-pa-xs">Permission Risk</th>
                  <th class="q-pa-xs">Last Seen</th>
                  <th class="q-pa-xs">Integrity State</th>
                  <th class="q-pa-xs">Runtime State</th>
                  <th class="q-pa-xs">Rollout Channel</th>
                  <th class="q-pa-xs text-center">Crash Spike</th>
                </tr>
              </thead>
              <tbody class="text-grey-3" style="font-size: 11px;">
                <tr 
                  v-for="app in filteredAppsList" 
                  :key="app.packageName" 
                  @click="selectAppRecord(app)"
                  :class="selectedApp?.packageName === app.packageName ? 'bg-[#1e272c]' : 'hover-row'"
                  class="cursor-pointer border-bottom-subtle"
                >
                  <!-- 1. Application Name -->
                  <td class="q-pa-xs text-white text-weight-bold row items-center op-gap-4 no-wrap">
                    <q-icon name="android" size="xs" :color="getTrustIconColor(app.trustState)" />
                    <span class="ellipsis" style="max-width: 140px;">{{ app.appName }}</span>
                  </td>
                  <!-- 2. Package Name -->
                  <td class="q-pa-xs text-metric-mono text-grey-5 ellipsis" style="max-width: 160px; font-size: 10px;">{{ app.packageName }}</td>
                  <!-- 3. Version -->
                  <td class="q-pa-xs text-metric-mono text-cyan-2">{{ app.version }}</td>
                  <!-- 4. Signature Status -->
                  <td class="q-pa-xs">
                    <span :class="app.signatureStatus === 'VALID_V3' ? 'text-green-4' : 'text-amber-4'" class="text-metric-mono" style="font-size: 9px;">
                      {{ app.signatureStatus }}
                    </span>
                  </td>
                  <!-- 5. Tenant -->
                  <td class="q-pa-xs text-grey-5">{{ app.tenantId }}</td>
                  <!-- 6. Device Count -->
                  <td class="q-pa-xs text-right text-metric-mono text-white text-weight-bold">{{ app.deviceCount.toLocaleString() }}</td>
                  <!-- 7. Permission Risk -->
                  <td class="q-pa-xs">
                    <span :class="getRiskTextColor(app.permissionRisk)" class="text-weight-bold">{{ app.permissionRisk }}</span>
                  </td>
                  <!-- 8. Last Seen -->
                  <td class="q-pa-xs text-grey-6 text-metric-mono" style="font-size: 10px;">{{ app.lastSeen }}</td>
                  <!-- 9. Integrity State -->
                  <td class="q-pa-xs">
                    <q-chip dense size="xs" :color="app.integrityState === 'VERIFIED' ? 'green-10' : 'red-10'" :text-color="app.integrityState === 'VERIFIED' ? 'green-2' : 'red-2'" class="text-weight-bold">
                      {{ app.integrityState }}
                    </q-chip>
                  </td>
                  <!-- 10. Runtime State -->
                  <td class="q-pa-xs">
                    <span class="text-metric-mono text-white" style="font-size: 9px;">{{ app.runtimeState }}</span>
                  </td>
                  <!-- 11. Rollout Channel -->
                  <td class="q-pa-xs text-grey-4" style="font-size: 10px;">{{ app.rolloutChannel }}</td>
                  <!-- 12. Crash Spike Indicator complete with FINAL REFINEMENT #1 Trust State Chips -->
                  <td class="q-pa-xs text-center">
                    <div class="row items-center justify-center op-gap-4 no-wrap">
                      <span v-if="app.crashSpike" class="text-red-4 text-weight-bold text-metric-mono animate-pulse" style="font-size: 10px;">SPIKE</span>
                      <span v-else class="text-grey-6 text-metric-mono" style="font-size: 10px;">Nominal</span>
                      
                      <!-- FINAL REFINEMENT #1: Explicit Trust State Badge -->
                      <q-badge :color="getTrustBadgeColor(app.trustState)" :text-color="getTrustTextColor(app.trustState)" class="text-weight-bold">
                        {{ app.trustState }}
                      </q-badge>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <!-- RIGHT PORTION: APPLICATION DETAIL DRAWER -->
      <div v-if="selectedApp" class="col-12 col-md-5 column transition-all">
        
        <div class="panel-card bg-[#12161a] border-muted rounded-borders column fit justify-between">
          
          <!-- Drawer top navigation bar -->
          <div class="panel-header bg-[#161b20] q-px-sm q-py-xs border-bottom row items-center justify-between">
            <div class="row items-center op-gap-6 no-wrap">
              <q-icon name="info" size="xs" color="cyan-3" />
              <span class="text-white text-weight-bold text-caption ellipsis" style="max-width: 220px;">{{ selectedApp.appName }} Detail Profile</span>
            </div>
            
            <div class="row items-center op-gap-4">
              <q-badge :color="getTrustBadgeColor(selectedApp.trustState)" :text-color="getTrustTextColor(selectedApp.trustState)">
                {{ selectedApp.trustState }}
              </q-badge>
              <q-btn dense flat icon="close" size="xs" color="grey-5" @click="selectedApp = null" />
            </div>
          </div>

          <!-- Drawer scroll region -->
          <div class="panel-body col q-pa-sm overflow-y-auto column op-gap-12" style="max-height: 440px;">
            
            <!-- Metadata & Signature Certs Box -->
            <div class="bg-[#161b20] q-pa-sm rounded-borders border-muted column op-gap-4">
              <span class="text-metric-mono text-grey-5" style="font-size: 10px;">CRYPTOGRAPHIC PACKAGE CERTIFICATE:</span>
              <div class="row justify-between text-caption"><span class="text-grey-4">Package ID:</span> <span class="text-metric-mono text-white">{{ selectedApp.packageName }}</span></div>
              <div class="row justify-between text-caption"><span class="text-grey-4">SHA-256 Signature Hash:</span> <span class="text-metric-mono text-cyan-3 ellipsis" style="max-width: 180px;">{{ selectedApp.certHash }}</span></div>
              <div class="row justify-between text-caption"><span class="text-grey-4">Lineage Source Origin:</span> <span class="text-metric-mono text-amber-3">{{ selectedApp.sideloadOrigin }}</span></div>
            </div>

            <!-- FINAL REFINEMENT #2: Behavioral Permission Drift Intelligence Matrix -->
            <div class="bg-[#181412] q-pa-sm rounded-borders border-left-drift column op-gap-4">
              <div class="row items-center justify-between">
                <span class="text-metric-mono text-amber-4 text-weight-bold" style="font-size: 11px;">BEHAVIORAL PERMISSION DRIFT INTELLIGENCE</span>
                <q-icon name="warning" size="xs" color="amber-4" />
              </div>

              <div class="text-grey-4" style="font-size: 10px;">
                Runtime analysis tracks escalated dangerous capability parameters requested post-activation window:
              </div>

              <div class="column op-gap-2 bg-[#12161a] q-pa-xs rounded-borders text-metric-mono" style="font-size: 10px;">
                <div class="row justify-between text-grey-6"><span>Baseline Array:</span> <span>android.permission.INTERNET</span></div>
                <div class="row justify-between text-red-4 border-top q-pt-xs q-mt-xs">
                  <span>Escalated Request:</span> 
                  <span>android.permission.SYSTEM_ALERT_WINDOW</span>
                </div>
                <div class="row justify-between text-amber-3">
                  <span>Accessibility Extension:</span> 
                  <span>Active Window Interception</span>
                </div>
              </div>

              <div class="row justify-between text-grey-5 border-top q-pt-xs" style="font-size: 9px;">
                <span>Drift Status: <span class="text-red-4 text-weight-bold">ABUSE DETECTED</span></span>
                <span>Correlated Incidents: <span class="text-white">INC-8842</span></span>
              </div>
            </div>

            <!-- FINAL REFINEMENT #3: Forensic Package Lineage Modeling Trajectory Map -->
            <div class="bg-[#161b20] q-pa-sm rounded-borders border-muted column op-gap-4">
              <span class="text-metric-mono text-purple-3 text-weight-bold" style="font-size: 11px;">FORENSIC PACKAGE LINEAGE ANCESTRY MAP</span>
              
              <div class="text-grey-5" style="font-size: 10px;">
                Signing certificate transitions and version downgrade chains evaluated across active nodes:
              </div>

              <!-- Lineage Graph steps -->
              <div class="column op-gap-2 q-pa-xs bg-[#111417] rounded-borders text-metric-mono" style="font-size: 9px;">
                <div class="row items-center justify-between text-grey-6">
                  <span>Ancestor [v1.0.4]</span>
                  <span>Cert: Root_Oem_Verified</span>
                </div>
                <div class="text-center text-grey-7">↓ signing transition shift</div>
                <div class="row items-center justify-between text-cyan-3">
                  <span>Observed [{{ selectedApp.version }}]</span>
                  <span>Cert: {{ selectedApp.signatureStatus }}</span>
                </div>
                <div v-if="selectedApp.trustState === 'BLOCKED'" class="text-center text-red-4 border-top q-pt-xs q-mt-xs">
                  ⚠️ Lineage drift detected: Unknown signing intermediate proxy loaded via sideload vector
                </div>
              </div>
            </div>

            <!-- Audit execution controls -->
            <div class="column op-gap-6 border-top q-pt-sm">
              <span class="text-white text-weight-bold text-caption" style="font-size: 11px;">Audited Remediation Interventions</span>
              
              <div class="row op-gap-8">
                <q-btn 
                  dense size="xs" color="red-5" text-color="black" label="Force Sideload Uninstall" 
                  @click="dispatchAuditedAction('FORCE_UNINSTALL')" 
                  class="col q-px-xs text-weight-bold text-metric-sm" 
                />
                <q-btn 
                  dense size="xs" color="orange-4" text-color="black" label="Apply Isolation Lock" 
                  @click="dispatchAuditedAction('ISOLATE_APP')" 
                  class="col q-px-xs text-weight-bold text-metric-sm" 
                />
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>

    <!-- LOWER ROW: FINAL REFINEMENT #5: Embedded App Rollout Correlation Hooks Diagnostic Charts -->
    <div class="panel-card bg-[#12161a] border-muted rounded-borders column fit">
      <div class="panel-header bg-[#161b20] q-px-sm q-py-xs border-bottom row items-center justify-between">
        <div class="row items-center op-gap-4 no-wrap">
          <q-icon name="insights" size="xs" color="cyan-3" />
          <span class="text-operator-title text-white text-weight-bold">Application Rollout Observability Correlation Hooks</span>
        </div>
        <span class="text-metric-mono text-cyan-3" style="font-size: 10px;">MULTI-SERIES RUNTIME INTELLIGENCE</span>
      </div>

      <div class="panel-body q-pa-md column op-gap-16">
        <div class="text-caption text-grey-4" style="font-size: 11px;">
          Evaluating staging performance vectors linking application rollout convergence speeds directly against device environment health indicators:
        </div>

        <!-- Simulated correlation graphic array -->
        <div class="row items-stretch op-gap-16">
          
          <!-- Curve A: Rollout Speed vs Crash Spikes -->
          <div class="col-12 col-md-6 bg-[#161b20] q-pa-sm rounded-borders border-muted column justify-between">
            <div class="row justify-between text-metric-sm text-grey-4 q-mb-xs" style="font-size: 11px;">
              <span>Target Wave App Delivery Progress</span>
              <span class="text-green-4 text-metric-mono">84% Convergence</span>
            </div>
            <q-linear-progress dark value="0.84" color="green-4" track-color="grey-9" size="xs" />

            <div class="row justify-between text-metric-sm text-grey-4 q-mt-sm q-mb-xs" style="font-size: 11px;">
              <span>Correlated Application Crash Spike Horizon</span>
              <span class="text-amber-4 text-metric-mono">1.2% Breached</span>
            </div>
            <q-linear-progress dark value="0.012" color="amber-4" track-color="grey-9" size="xs" />

            <div class="text-grey-6 border-top q-pt-xs q-mt-sm" style="font-size: 9px;">
              Correlation hook metrics confirm runtime environment stable during initial edge sideload loops.
            </div>
          </div>

          <!-- Curve B: Rollout Speed vs Integrity Degradations -->
          <div class="col-12 col-md-6 bg-[#161b20] q-pa-sm rounded-borders border-muted column justify-between">
            <div class="row justify-between text-metric-sm text-grey-4 q-mb-xs" style="font-size: 11px;">
              <span>Package Checksum Assurance Trajectory</span>
              <span class="text-cyan-3 text-metric-mono">99.8% Certified</span>
            </div>
            <q-linear-progress dark value="0.998" color="cyan-3" track-color="grey-9" size="xs" />

            <div class="row justify-between text-metric-sm text-grey-4 q-mt-sm q-mb-xs" style="font-size: 11px;">
              <span>Detected Device Sideload Lineage Tampering</span>
              <span class="text-red-4 text-metric-mono">0.2% Dropped</span>
            </div>
            <q-linear-progress dark value="0.002" color="red-5" track-color="grey-9" size="xs" />

            <div class="text-grey-6 border-top q-pt-xs q-mt-sm" style="font-size: 9px;">
              Lineage drift rules automatically isolate nodes reporting unknown signature public key identifiers.
            </div>
          </div>

        </div>
      </div>
    </div>

  </q-page>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useApplicationEventStore } from '../../stores/realtime/useApplicationEventStore'
import { operationalEventBusSingleton } from '../../services/realtime/OperationalEventBus'
import { Notify } from 'quasar'

const appStore = useApplicationEventStore()

// Tenant scoping controls
const activeTenantScope = ref('global')
const searchQuery = ref('')
const selectedApp = ref(null)

const onTenantScopeUpdated = (val) => {
  appStore.setTenantFilter(val)
  selectedApp.value = null
}

// 1. Core Installed Apps base array complete with the 12 master columns and FINAL REFINEMENT #1 Trust States
const rawAppsInventory = ref([
  { packageName: 'com.invify.kiosk.base', appName: 'Invify Secure Kiosk Core', version: 'v2.4.1', signatureStatus: 'VALID_V3', tenantId: 'tenant-alpha', deviceCount: 14200, permissionRisk: 'LOW', lastSeen: '12s ago', integrityState: 'VERIFIED', runtimeState: 'ACTIVE_FOREGROUND', rolloutChannel: 'Stable', crashSpike: false, trustState: 'TRUSTED', certHash: 'a2f4c918b82e...7d', sideloadOrigin: 'Play_Store_Enterprise' },
  { packageName: 'com.scanner.warehouse.app', appName: 'Warehouse Scanner Client', version: 'v1.2.0', signatureStatus: 'VALID_V2', tenantId: 'tenant-beta', deviceCount: 4100, permissionRisk: 'MEDIUM', lastSeen: '1m ago', integrityState: 'VERIFIED', runtimeState: 'BACKGROUND_SERVICE', rolloutChannel: 'Beta', crashSpike: true, trustState: 'MONITORED', certHash: 'b490d1f44a1c...2a', sideloadOrigin: 'Private_Mdm_Link' },
  { packageName: 'com.overlay.tools.widget', appName: 'Floating Screen Assist Widget', version: 'v3.0.4', signatureStatus: 'UNKNOWN_PROXY', tenantId: 'tenant-alpha', deviceCount: 120, permissionRisk: 'HIGH', lastSeen: '5m ago', integrityState: 'TAMPERED', runtimeState: 'SUSPENDED', rolloutChannel: 'Sideloaded', crashSpike: true, trustState: 'SUSPICIOUS', certHash: 'deadbeef1029...4c', sideloadOrigin: 'Unknown_Browser_Apk' },
  { packageName: 'com.retail.checkout.pos', appName: 'Retail Base Register Controller', version: 'v4.1.2', signatureStatus: 'VALID_V3', tenantId: 'tenant-omega', deviceCount: 82000, permissionRisk: 'LOW', lastSeen: '2s ago', integrityState: 'VERIFIED', runtimeState: 'ACTIVE_FOREGROUND', rolloutChannel: 'Stable', crashSpike: false, trustState: 'TRUSTED', certHash: '99e2f41b2c4d...8e', sideloadOrigin: 'Play_Store_Enterprise' },
  { packageName: 'com.malicious.keylogger.sys', appName: 'System Diagnostic Proxy (Unsafe)', version: 'v1.0.0', signatureStatus: 'BROKEN_SIGNATURE', tenantId: 'tenant-beta', deviceCount: 14, permissionRisk: 'CRITICAL', lastSeen: '1h ago', integrityState: 'TAMPERED', runtimeState: 'TERMINATED', rolloutChannel: 'Sideloaded', crashSpike: false, trustState: 'BLOCKED', certHash: '00f120aa44bb...cc', sideloadOrigin: 'Malicious_Dropper_Agent' }
])

// Filter computation mapping search inputs seamlessly
const filteredAppsList = computed(() => {
  return rawAppsInventory.value.filter(a => {
    const matchesTenant = activeTenantScope.value === 'global' || a.tenantId === activeTenantScope.value
    const matchesSearch = !searchQuery.value || 
      a.appName.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      a.packageName.toLowerCase().includes(searchQuery.value.toLowerCase())
    return matchesTenant && matchesSearch
  })
})

const selectAppRecord = (appObj) => {
  selectedApp.value = appObj
}

const triggerManualSync = () => {
  Notify.create({
    type: 'info',
    message: `Triggering explicit application repository telemetry refresh loop`,
    position: 'bottom-right'
  })
}

// Visual state helper mapping functions
const getTrustIconColor = (trust) => {
  if (trust === 'TRUSTED') return 'green-4'
  if (trust === 'MONITORED') return 'cyan-3'
  if (trust === 'SUSPICIOUS') return 'amber-4'
  if (trust === 'RESTRICTED') return 'orange-4'
  return 'red-5'
}

const getTrustBadgeColor = (trust) => {
  if (trust === 'TRUSTED') return 'green-10'
  if (trust === 'MONITORED') return 'cyan-10'
  if (trust === 'SUSPICIOUS') return 'amber-10'
  if (trust === 'RESTRICTED') return 'deep-orange-10'
  return 'red-10'
}

const getTrustTextColor = (trust) => {
  if (trust === 'TRUSTED') return 'green-2'
  if (trust === 'MONITORED') return 'cyan-2'
  if (trust === 'SUSPICIOUS') return 'amber-2'
  if (trust === 'RESTRICTED') return 'deep-orange-2'
  return 'red-2'
}

const getRiskTextColor = (risk) => {
  if (risk === 'LOW') return 'text-green-4'
  if (risk === 'MEDIUM') return 'text-cyan-3'
  if (risk === 'HIGH') return 'text-amber-4'
  return 'text-red-4'
}

// Audited execution trigger
const dispatchAuditedAction = (actionType) => {
  if (!selectedApp.value) return

  const targetPkg = selectedApp.value.packageName
  console.log(`[RuntimeOrchestrator] Audited package command payload emitted:`, {
    actionType,
    targetPackage: targetPkg,
    operator: 'sysadmin@invify.app'
  })

  operationalEventBusSingleton.emitUpstream('EXECUTE_AUDITED_PACKAGE_ACTION', {
    actionType,
    targetPackageName: targetPkg,
    auditTimestamp: new Date().toISOString()
  })

  Notify.create({
    type: actionType === 'FORCE_UNINSTALL' ? 'negative' : 'warning',
    message: `Audited runtime directive [${actionType}] dispatched targeting package bundle`,
    position: 'bottom-right'
  })

  // Optimistically flag trust states
  if (actionType === 'FORCE_UNINSTALL') {
    selectedApp.value.trustState = 'BLOCKED'
    selectedApp.value.runtimeState = 'TERMINATED'
  }
}
</script>

<style scoped>
.border-bottom { border-bottom: 1px solid var(--enterprise-border); }
.border-bottom-subtle { border-bottom: 1px solid #1a2024; }
.border-top { border-top: 1px solid var(--enterprise-border); }
.border-muted { border: 1px solid var(--enterprise-border); }

.border-left-drift { border-left: 3px solid #e8590c; }

.hover-row:hover {
  background-color: #161e22 !important;
}

.sticky-top {
  position: sticky;
  top: 0;
}

@media (max-width: 600px) {
  .v-hide-xs { display: none; }
}
</style>
