<!-- invify-admin/src/pages/applications/ForbiddenApplicationsPage.vue -->
<template>
  <q-page class="bg-[#0b0f12] text-[#e1e7ec] q-pa-md column op-gap-16">
    
    <!-- Title Line -->
    <div class="row items-center justify-between no-wrap border-bottom q-pb-sm">
      <div class="row items-center op-gap-8 no-wrap">
        <q-icon name="block" size="sm" color="red-5" />
        <div>
          <div class="text-operator-title text-white text-weight-bold" style="font-size: 14px;">Forbidden Applications Governance & Blacklist Orchestration</div>
          <div class="text-metric-mono text-grey-5" style="font-size: 10px;">FORCED_UNINSTALL_ORCHESTRATOR // TENANT_SCOPED_EXCEPTIONS</div>
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

    <!-- UPPER ROW: Forbidden Policy Configuration Metrics -->
    <div class="row items-stretch op-gap-16">
      
      <!-- Box 1: Total Blacklist Constraints -->
      <div class="col bg-[#12161a] q-pa-sm rounded-borders border-muted column justify-between border-top-red">
        <span class="text-caption text-grey-5 text-weight-bold">BLOCKED PACKAGES</span>
        <div class="text-metric-mono text-white text-weight-bold q-mt-xs" style="font-size: 18px;">{{ forbiddenPoliciesList.length }}</div>
        <div class="row justify-between text-grey-6 border-top q-pt-xs q-mt-xs" style="font-size: 9px;">
          <span>Strict Intercept</span>
          <span class="text-red-4">Auto-Terminate</span>
        </div>
      </div>

      <!-- Box 2: Composite Risk Base -->
      <div class="col bg-[#12161a] q-pa-sm rounded-borders border-muted column justify-between border-top-orange">
        <span class="text-caption text-grey-5 text-weight-bold">AVERAGE APP RISK</span>
        <div class="text-metric-mono text-amber-4 text-weight-bold q-mt-xs" style="font-size: 18px;">84.2%</div>
        <div class="row justify-between text-grey-6 border-top q-pt-xs q-mt-xs" style="font-size: 9px;">
          <span>Weighted Abuse</span>
          <span class="text-amber-4">High Risk Pool</span>
        </div>
      </div>

      <!-- Box 3: Forced Uninstall Logs -->
      <div class="col bg-[#12161a] q-pa-sm rounded-borders border-muted column justify-between border-top-cyan">
        <span class="text-caption text-grey-5 text-weight-bold">FORCED UNINSTALLS</span>
        <div class="text-metric-mono text-cyan-3 text-weight-bold q-mt-xs" style="font-size: 18px;">142 Executed</div>
        <div class="row justify-between text-grey-6 border-top q-pt-xs q-mt-xs" style="font-size: 9px;">
          <span>SLA Hold: 0d</span>
          <span class="text-cyan-3">Zero-Touch Cleaned</span>
        </div>
      </div>

      <!-- Box 4: Active Isolation Triggers -->
      <div class="col bg-[#12161a] q-pa-sm rounded-borders border-muted column justify-between border-top-red">
        <span class="text-caption text-grey-5 text-weight-bold">QUARANTINE LOCKS</span>
        <div class="text-metric-mono text-red-4 text-weight-bold q-mt-xs" style="font-size: 18px;">
          {{ appStore.activeForbiddenViolationsCount }} Active
        </div>
        <div class="row justify-between text-grey-6 border-top q-pt-xs q-mt-xs" style="font-size: 9px;">
          <span>Network Blocked</span>
          <span class="text-red-4">Containment Enforced</span>
        </div>
      </div>

    </div>

    <!-- MIDDLE ROW: Forbidden Applications & Policy Drift Management Array -->
    <div class="panel-card bg-[#12161a] border-muted rounded-borders column fit">
      <div class="panel-header bg-[#161b20] q-px-sm q-py-xs border-bottom row items-center justify-between">
        <div class="row items-center op-gap-4 no-wrap">
          <q-icon name="security" size="xs" color="red-4" />
          <span class="text-operator-title text-white text-weight-bold">Active Blacklist Policy Matrix & Forced Uninstall Orchestration</span>
        </div>
        <q-btn dense flat size="xs" color="cyan-3" label="Register Custom Forbidden Policy" @click="promptNewPolicy" class="bg-[#1e272c] q-px-xs" />
      </div>

      <div class="panel-body q-pa-xs overflow-y-auto" style="max-height: 280px;">
        <q-list dense class="q-gutter-y-xs">
          <q-item 
            v-for="p in forbiddenPoliciesList" 
            :key="p.id" 
            class="q-px-sm q-py-xs bg-[#161b20] rounded-borders column op-gap-2 border-left-policy hover-row"
          >
            <div class="row items-center justify-between fit no-wrap">
              <div class="row items-center op-gap-8 no-wrap">
                <span class="text-white text-weight-bold text-caption">{{ p.appName }}</span>
                <span class="text-metric-mono text-grey-5" style="font-size: 10px;">{{ p.packageName }}</span>
              </div>

              <!-- Risk Factor and Trust State flag -->
              <div class="row items-center op-gap-4">
                <span class="text-metric-mono text-red-4 text-weight-bold" style="font-size: 11px;">Risk Score: {{ p.riskScore }}%</span>
                <q-chip dense size="xs" color="red-10" text-color="red-2" class="text-weight-bold">BLOCKED</q-chip>
              </div>
            </div>

            <!-- Description & Inheritance metadata -->
            <div class="text-grey-4 ellipsis" style="font-size: 10px;">
              Policy rationale: {{ p.rationale }}
            </div>

            <div class="row items-center justify-between text-grey-5 q-mt-xs border-top q-pt-xs" style="font-size: 10px;">
              <div class="row items-center op-gap-6">
                <span>Scope: <span class="text-white">{{ p.tenantScope }}</span></span>
                <span>•</span>
                <span :class="p.inheritance === 'STRICT_GLOBAL' ? 'text-cyan-3' : 'text-amber-4'">Inheritance: {{ p.inheritance }}</span>
                <span v-if="p.exceptionsCount > 0" class="text-amber-4 text-weight-bold">[{{ p.exceptionsCount }} Exceptions Active]</span>
              </div>

              <!-- Inline Action Controls -->
              <div class="row items-center op-gap-4">
                <q-btn 
                  dense flat size="xs" color="amber-4" label="Map Exceptions" 
                  @click="promptExceptionMapping(p)" 
                  class="bg-[#241d16] q-px-xs text-metric-sm" 
                />
                <q-btn 
                  dense flat size="xs" color="red-4" label="Force Uninstall Broadcast" 
                  @click="promptForcedUninstall(p)" 
                  class="bg-[#241212] q-px-xs text-metric-sm" 
                />
              </div>
            </div>
          </q-item>
        </q-list>
      </div>
    </div>

    <!-- LOWER ROW: Package Drift Alerts & SOC Integration Trajectories -->
    <div class="panel-card bg-[#12161a] border-muted rounded-borders column fit justify-between">
      <div class="panel-header bg-[#161b20] q-px-sm q-py-xs border-bottom row items-center justify-between">
        <div class="row items-center op-gap-4 no-wrap">
          <q-icon name="notifications_active" size="xs" color="orange-4" />
          <span class="text-operator-title text-white text-weight-bold">Forbidden Package Drift Exceptions Feed</span>
        </div>
        <span class="text-metric-mono text-grey-5" style="font-size: 10px;">LIVE CONTINUOUS TELEMETRY SCANNING</span>
      </div>

      <div class="panel-body q-pa-sm column op-gap-8">
        <div class="text-caption text-grey-4" style="font-size: 11px;">
          Nodes executing local privilege elevation patterns to run blacklisted signatures trigger immediate network quarantine locks automatically:
        </div>

        <div class="column op-gap-4">
          <div class="bg-[#1b1515] q-pa-xs rounded-borders row items-center justify-between text-metric-mono" style="font-size: 10px;">
            <div class="row items-center op-gap-6">
              <span class="text-red-4 text-weight-bold">[DRIFT_ALARM]</span>
              <span class="text-white">Device node <span class="text-cyan-3">pos-reg-omega-01</span> loaded target signature: <span class="text-amber-3">com.overlay.tools.widget</span></span>
            </div>
            <span class="text-grey-6">14s ago</span>
          </div>

          <div class="bg-[#1b1515] q-pa-xs rounded-borders row items-center justify-between text-metric-mono" style="font-size: 10px;">
            <div class="row items-center op-gap-6">
              <span class="text-red-4 text-weight-bold">[DRIFT_ALARM]</span>
              <span class="text-white">Device node <span class="text-cyan-3">kiosk-subfleet-84</span> loaded target signature: <span class="text-amber-3">com.malicious.keylogger.sys</span></span>
            </div>
            <span class="text-grey-6">3m ago</span>
          </div>
        </div>
      </div>
    </div>

    <!-- REASON-GATED FORCED UNINSTALL EXECUTION GATE -->
    <q-dialog v-model="uninstallGateOpen" persistent>
      <q-card class="bg-[#12161a] text-[#e1e7ec] border-muted" style="min-width: 440px;">
        <q-card-section class="bg-[#1b1515] border-bottom row items-center op-gap-8">
          <q-icon name="delete_forever" color="red-4" size="sm" />
          <div>
            <div class="text-white text-weight-bold text-caption">Forced Remote Uninstall & Quarantine Gate</div>
            <div class="text-metric-sm text-red-3">Target: {{ pendingPolicy?.packageName }}</div>
          </div>
        </q-card-section>

        <q-card-section class="column op-gap-12 q-pt-md">
          <div class="text-caption text-grey-4" style="font-size: 11px;">
            Dispatching an absolute forced removal envelope overrides end-user execution permissions and schedules immediate deletion loops on matching device hardware endpoints. Please input your verified operator traceability signature.
          </div>

          <q-input
            v-model="uninstallTraceabilityStr"
            dark dense filled autofocus
            label="Mandatory SOC Intervention Traceability Log *"
            placeholder="e.g. Critical security risk rating breached 80% containment limit"
            class="bg-[#161b20]"
            :rules="[val => !!val || 'Traceability verification string cannot be empty']"
          />
        </q-card-section>

        <q-card-actions align="right" class="bg-[#161b20] border-top q-pa-sm">
          <q-btn flat dense size="sm" color="grey-5" label="Abort Action" v-close-popup @click="resetUninstallGate" />
          <q-btn 
            dense size="sm" color="red-5" label="Commit Forced Removal Broadcast" 
            @click="commitForcedUninstall" 
            :disable="!uninstallTraceabilityStr" 
            class="q-px-sm text-weight-bold"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

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

// Simulated Forbidden Policies List
const forbiddenPoliciesList = ref([
  { id: 'pol-fb-01', packageName: 'com.malicious.keylogger.sys', appName: 'System Diagnostic Proxy (Unsafe)', riskScore: 94, rationale: 'Known background keyboard memory dump payload hijacking user text buffer pools', tenantScope: 'global', inheritance: 'STRICT_GLOBAL', exceptionsCount: 0 },
  { id: 'pol-fb-02', packageName: 'com.overlay.tools.widget', appName: 'Floating Screen Assist Widget', riskScore: 82, rationale: 'Unsigned overlay hook intercepting sensitive password capture coordinates', tenantScope: 'tenant-alpha', inheritance: 'CUSTOM_SCOPED', exceptionsCount: 2 },
  { id: 'pol-fb-03', packageName: 'com.crypto.miner.agent', appName: 'Silent Background Ledger Proxy', riskScore: 98, rationale: 'Unauthorized compute thread abuse draining kiosk battery matrices continuously', tenantScope: 'global', inheritance: 'STRICT_GLOBAL', exceptionsCount: 0 }
])

const promptNewPolicy = () => {
  Notify.create({
    type: 'info',
    message: `Mounting custom forbidden package policy constructor dialog`,
    position: 'bottom-right'
  })
}

const promptExceptionMapping = (policyObj) => {
  Notify.create({
    type: 'warning',
    message: `Exception whitelist filter map open targeting policy [${policyObj.packageName}]`,
    position: 'bottom-right'
  })
}

// Forced Uninstall dialogue logic
const uninstallGateOpen = ref(false)
const pendingPolicy = ref(null)
const uninstallTraceabilityStr = ref('')

const promptForcedUninstall = (policyObj) => {
  pendingPolicy.value = policyObj
  uninstallTraceabilityStr.value = ''
  uninstallGateOpen.value = true
}

const resetUninstallGate = () => {
  pendingPolicy.value = null
  uninstallTraceabilityStr.value = ''
  uninstallGateOpen.value = false
}

const commitForcedUninstall = () => {
  if (!pendingPolicy.value || !uninstallTraceabilityStr.value) return

  const targetPkg = pendingPolicy.value.packageName
  const traceStr = uninstallTraceabilityStr.value

  console.log(`[ForbiddenGovernance] Committing Forced Uninstall stream directive:`, {
    targetPackage: targetPkg,
    traceabilityLog: traceStr,
    operator: 'sysadmin@invify.app'
  })

  // Broadcast securely
  operationalEventBusSingleton.emitUpstream('COMMIT_FORCED_REMOTE_UNINSTALL', {
    targetPackageName: targetPkg,
    auditTraceabilityLog: traceStr,
    timestamp: new Date().toISOString()
  })

  Notify.create({
    type: 'negative',
    message: `Forced uninstall command envelope broadcast targeting package [${targetPkg}]`,
    position: 'bottom-right'
  })

  // Append entry straight to app stores
  appStore.installedApps.unshift({
    trustState: 'BLOCKED',
    packageName: targetPkg,
    appName: pendingPolicy.value.appName,
    version: 'Terminated',
    signatureStatus: 'REVOKED',
    tenantId: pendingPolicy.value.tenantScope,
    deviceCount: 0,
    permissionRisk: 'CRITICAL',
    lastSeen: 'Just now',
    integrityState: 'TAMPERED',
    runtimeState: 'REMOVED',
    rolloutChannel: 'Blacklist',
    crashSpike: false
  })

  resetUninstallGate()
}
</script>

<style scoped>
.border-bottom { border-bottom: 1px solid var(--enterprise-border); }
.border-top { border-top: 1px solid var(--enterprise-border); }
.border-muted { border: 1px solid var(--enterprise-border); }

.border-top-red { border-top: 2px solid #c92a2a; }
.border-top-orange { border-top: 2px solid #e8590c; }
.border-top-cyan { border-top: 2px solid #22b8cf; }

.border-left-policy { border-left: 3px solid #c92a2a; }

.hover-row:hover {
  background-color: #1a2327 !important;
}

@media (max-width: 600px) {
  .v-hide-xs { display: none; }
}
</style>
