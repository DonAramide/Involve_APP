<!-- invify-admin/src/pages/applications/SideloadIntegrityPage.vue -->
<template>
  <q-page class="bg-[#0b0f12] text-[#e1e7ec] q-pa-md column op-gap-16">
    
    <!-- Title Line -->
    <div class="row items-center justify-between no-wrap border-bottom q-pb-sm">
      <div class="row items-center op-gap-8 no-wrap">
        <q-icon name="verified_user" size="sm" color="cyan-3" />
        <div>
          <div class="text-operator-title text-white text-weight-bold" style="font-size: 14px;">Sideload Governance & Cryptographic Package Integrity Assurance</div>
          <div class="text-metric-mono text-grey-5" style="font-size: 10px;">FORENSIC_LINEAGE_MODELING // DOWNGRADE_ATTACK_PROTECTION</div>
        </div>
      </div>
      
      <!-- Tenant Scope selector -->
      <div class="row items-center op-gap-8 no-wrap text-caption text-grey-5">
        <span class="v-hide-xs">Tenant Scope:</span>
        <q-select
          v-model="activeTenantScope"
          :options="['global', 'tenant-alpha', 'tenant-omega', 'tenant-beta']"
          dense dark filled options-dense
          @update:model-value="onTenantScopeUpdated"
          class="bg-[#12161a] text-caption"
          style="width: 130px;"
        />
      </div>
    </div>

    <!-- UPPER ROW: Cryptographic Package Integrity Distribution Indicators -->
    <div class="row items-center justify-between text-center bg-[#12161a] q-pa-sm rounded-borders border-muted">
      
      <div class="col column">
        <span class="text-metric-mono text-green-4 text-weight-bold" style="font-size: 18px;">99.6%</span>
        <span class="text-caption text-grey-5" style="font-size: 10px;">Lineage Certified</span>
      </div>

      <div class="col column border-left">
        <span class="text-metric-mono text-amber-4 text-weight-bold" style="font-size: 18px;">
          {{ sideloadLogsList.length }} Tracked
        </span>
        <span class="text-caption text-grey-5" style="font-size: 10px;">Sideload Incidents</span>
      </div>

      <div class="col column border-left">
        <span class="text-metric-mono text-red-4 text-weight-bold" style="font-size: 18px;">1 Blocked</span>
        <span class="text-caption text-grey-5" style="font-size: 10px;">Downgrade Attacks</span>
      </div>

      <div class="col column border-left">
        <span class="text-metric-mono text-cyan-3 text-weight-bold" style="font-size: 18px;">SHA-256</span>
        <span class="text-caption text-grey-5" style="font-size: 10px;">Lineage Trust Standard</span>
      </div>

    </div>

    <!-- MIDDLE ROW: Sideload Feed & Forensic Package Lineage Modeling Matrix -->
    <div class="panel-card bg-[#12161a] border-muted rounded-borders column fit">
      <div class="panel-header bg-[#161b20] q-px-sm q-py-xs border-bottom row items-center justify-between">
        <div class="row items-center op-gap-4 no-wrap">
          <q-icon name="history_edu" size="xs" color="purple-3" />
          <span class="text-operator-title text-white text-weight-bold">Forensic Package Lineage Modeling & Sideload Origin Trajectories</span>
        </div>
        <span class="text-metric-mono text-purple-3" style="font-size: 10px;">FORENSIC ANCESTRY LOGS</span>
      </div>

      <div class="panel-body q-pa-xs overflow-y-auto" style="max-height: 420px;">
        <q-list dense class="q-gutter-y-xs">
          <q-item 
            v-for="s in sideloadLogsList" 
            :key="s.id" 
            class="q-px-sm q-py-xs bg-[#161b20] rounded-borders column op-gap-4 border-left-sideload hover-row"
          >
            <!-- Top Strip: Package Info + Trust Score -->
            <div class="row items-center justify-between fit no-wrap">
              <div class="row items-center op-gap-8 no-wrap">
                <span class="text-white text-weight-bold text-caption">{{ s.appName }}</span>
                <span class="text-metric-mono text-grey-5" style="font-size: 10px;">{{ s.packageName }}</span>
              </div>

              <!-- Trust Index Flag -->
              <div class="row items-center op-gap-4">
                <span class="text-metric-mono text-cyan-3 text-weight-bold" style="font-size: 11px;">Trust Score: {{ s.trustScore }}%</span>
                <q-chip dense size="xs" :color="s.isTampered ? 'red-10' : 'amber-10'" :text-color="s.isTampered ? 'red-2' : 'amber-2'" class="text-weight-bold">
                  {{ s.isTampered ? 'TAMPERED' : 'UNVERIFIED LINEAGE' }}
                </q-chip>
              </div>
            </div>

            <!-- FINAL REFINEMENT #3: Deep Forensic Lineage Ancestry Strip -->
            <div class="bg-[#101416] q-pa-sm rounded-borders column op-gap-2 text-metric-mono border-muted" style="font-size: 10px;">
              <span class="text-purple-3 text-weight-bold" style="font-size: 9px;">FORENSIC LINEAGE ANCESTRY CHAIN:</span>
              
              <div class="row items-center justify-between text-grey-4">
                <span>Origin Lineage Source: <span class="text-white">{{ s.originLineage }}</span></span>
                <span class="text-amber-4">Validation Type: {{ s.validationMethod }}</span>
              </div>

              <!-- Certificate Swap Trace Matrix -->
              <div class="row items-center justify-between text-grey-5 border-top q-pt-xs q-mt-xs" style="font-size: 9px;">
                <span>Authorized Ancestor Cert: <span class="text-green-4">{{ s.ancestorCert }}</span></span>
                <span>⟶</span>
                <span>Detected Endpoint Key: <span :class="s.certMismatch ? 'text-red-4 text-weight-bold' : 'text-cyan-3'">{{ s.detectedCert }}</span></span>
              </div>

              <div v-if="s.downgradeAttack" class="text-red-4 text-weight-bold border-top q-pt-xs q-mt-xs">
                🚨 Downgrade Attack detected: Package payload executing fallback assembly build signatures mapping below baseline OS requirements
              </div>
            </div>

            <!-- Bottom metadata strip -->
            <div class="row items-center justify-between text-grey-5" style="font-size: 10px;">
              <div class="row items-center op-gap-6">
                <span>Target Node: <span class="text-white">{{ s.deviceNode }}</span></span>
                <span>•</span>
                <span>Tenant: <span class="text-white">{{ s.tenantScope }}</span></span>
              </div>

              <!-- Inline Action controls -->
              <div class="row items-center op-gap-4">
                <span class="text-metric-mono text-grey-6 q-mr-xs" style="font-size: 9px;">{{ s.timestampStr }}</span>
                <q-btn 
                  dense flat size="xs" color="red-4" label="Enforce Sideload Quarantine" 
                  @click="enforceSideloadQuarantine(s)" 
                  class="bg-[#241212] q-px-xs text-metric-sm" 
                />
              </div>
            </div>
          </q-item>
        </q-list>
      </div>
    </div>

  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import { useApplicationEventStore } from '../../stores/realtime/useApplicationEventStore'
import { operationalEventBusSingleton } from '../../services/realtime/OperationalEventBus'
import { Notify } from 'quasar'

const appStore = useApplicationEventStore()
const activeTenantScope = ref('global')

const onTenantScopeUpdated = (val) => {
  appStore.setTenantFilter(val)
}

// 1. Sideload Logs array incorporating FINAL REFINEMENT #3 Forensic Lineage Modeling metrics
const sideloadLogsList = ref([
  { id: 'sdl-01', packageName: 'com.overlay.tools.widget', appName: 'Floating Screen Assist Widget', trustScore: 24, isTampered: true, originLineage: 'Unknown_Browser_Apk_Download', validationMethod: 'Heuristic_Signature_Match', ancestorCert: 'CN=Invify_Root_CA,O=Invify_Systems', detectedCert: 'CN=Untrusted_Proxy_Agent', certMismatch: true, downgradeAttack: false, deviceNode: 'pos-reg-omega-01', tenantScope: 'tenant-alpha', timestampStr: '5m ago' },
  { id: 'sdl-02', packageName: 'com.malicious.keylogger.sys', appName: 'System Diagnostic Proxy (Unsafe)', trustScore: 12, isTampered: true, originLineage: 'Malicious_Dropper_Service_Vector', validationMethod: 'Binary_Checksum_Fail', ancestorCert: 'CN=Android_Core_Oem', detectedCert: 'CN=Revoked_Dropper_Key', certMismatch: true, downgradeAttack: true, deviceNode: 'kiosk-subfleet-84', tenantScope: 'tenant-beta', timestampStr: '1h ago' },
  { id: 'sdl-03', packageName: 'com.custom.debug.utility', appName: 'Local Diagnostic Client', trustScore: 68, isTampered: false, originLineage: 'Internal_Mdm_Debug_Bridge', validationMethod: 'Authorized_V2_Signature', ancestorCert: 'CN=Invify_Internal_Dev', detectedCert: 'CN=Invify_Internal_Dev', certMismatch: false, downgradeAttack: false, deviceNode: 'warehouse-sc-01', tenantScope: 'tenant-omega', timestampStr: '3h ago' }
])

const enforceSideloadQuarantine = (sideloadObj) => {
  console.log(`[SideloadEngine] Enforce physical hardware network isolation targeting package sideload drift:`, sideloadObj.packageName)
  
  operationalEventBusSingleton.emitUpstream('ENFORCE_SIDELOAD_QUARANTINE', {
    targetPackageName: sideloadObj.packageName,
    deviceNode: sideloadObj.deviceNode,
    lineageOrigin: sideloadObj.originLineage,
    timestamp: new Date().toISOString()
  })

  Notify.create({
    type: 'negative',
    message: `Physical hardware network quarantine directive broadcast targeting sideload drift`,
    position: 'bottom-right'
  })

  // Mutate local array optimistically
  sideloadLogsList.value = sideloadLogsList.value.filter(s => s.id !== sideloadObj.id)
}
</script>

<style scoped>
.border-bottom { border-bottom: 1px solid var(--enterprise-border); }
.border-top { border-top: 1px solid var(--enterprise-border); }
.border-left { border-left: 1px solid var(--enterprise-border); }
.border-muted { border: 1px solid var(--enterprise-border); }

.border-left-sideload { border-left: 3px solid #862e9c; }

.hover-row:hover {
  background-color: #1a1e22 !important;
}

@media (max-width: 600px) {
  .v-hide-xs { display: none; }
}
</style>
