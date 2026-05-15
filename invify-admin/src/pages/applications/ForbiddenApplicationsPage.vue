<!-- invify-admin/src/pages/applications/ForbiddenApplicationsPage.vue -->
<template>
  <q-page class="bg-[#0b0f12] text-[#e1e7ec] q-pa-md column op-gap-16 fit overflow-hidden" style="height: calc(100vh - 50px);">
    
    <!-- Top Policy Command strip -->
    <div class="row items-center justify-between no-wrap border-bottom q-pb-sm shrink-0">
      <div class="row items-center op-gap-8 no-wrap">
        <q-icon name="block" size="sm" color="red-5" />
        <div>
          <div class="text-operator-title text-white text-weight-bold" style="font-size: 14px;">Forbidden Applications & Blacklist Governance</div>
          <div class="text-metric-mono text-grey-5" style="font-size: 10px;">FORCED_UNINSTALL_ORCHESTRATION // TRUST_STATE_BLOCKED</div>
        </div>
      </div>
      
      <!-- Tenant Scope selector -->
      <div class="row items-center op-gap-8 no-wrap text-caption text-grey-5">
        <span class="v-hide-xs">Policy Scope:</span>
        <q-select
          v-model="activePolicyScope"
          :options="['global', 'tenant-alpha', 'tenant-omega', 'tenant-beta']"
          dense dark filled options-dense
          class="bg-[#12161a] text-caption"
          style="width: 140px;"
        />
      </div>
    </div>

    <!-- UPPER SPLIT: Blacklisted Rules & Policy Overrides -->
    <div class="row items-stretch op-gap-16 col min-h-0 fit">
      
      <!-- LEFT LIST: Blocked Package Registry -->
      <div class="col-12 col-md-7 column fit border-muted rounded-borders bg-[#12161a] overflow-hidden">
        
        <div class="panel-header bg-[#161b20] q-px-sm q-py-xs border-bottom row items-center justify-between shrink-0">
          <div class="row items-center op-gap-4 no-wrap">
            <q-icon name="rule" size="xs" color="red-4" />
            <span class="text-operator-title text-white text-weight-bold">Blacklisted Package Execution Rules</span>
          </div>
          <q-btn dense flat size="xs" color="cyan-3" label="Register Blocked Pattern" @click="promptNewRule" class="bg-[#1b2227] q-px-xs" />
        </div>

        <div class="col overflow-auto q-pa-xs custom-scrollbar">
          <q-list dense class="q-gutter-y-xs">
            <q-item 
              v-for="rule in filteredRules" 
              :key="rule.ruleId"
              class="q-px-sm q-py-xs bg-[#161b20] rounded-borders column op-gap-2 hover-row border-left-blocked"
            >
              <div class="row items-center justify-between no-wrap fit">
                <div class="row items-center op-gap-8 no-wrap">
                  <span class="text-white text-weight-bold text-caption">{{ rule.ruleName }}</span>
                  <q-chip dense size="xs" color="red-10" text-color="red-2" class="text-weight-bold">
                    {{ rule.enforcedTrustState }}
                  </q-chip>
                  <span class="text-metric-mono text-grey-5" style="font-size: 10px;">{{ rule.targetPattern }}</span>
                </div>

                <div class="row items-center op-gap-4">
                  <span class="text-metric-mono text-amber-4 text-weight-bold" style="font-size: 11px;">Risk Score: {{ rule.riskScore }}/100</span>
                </div>
              </div>

              <!-- Rule properties & counts -->
              <div class="row items-center justify-between text-grey-4 q-mt-xs" style="font-size: 11px;">
                <span>Observed Violations: <span class="text-metric-mono text-red-4 text-weight-bold">{{ rule.observedViolations }}</span> instances</span>
                <span>Inheritance: <span class="text-metric-mono text-cyan-3">{{ rule.inheritanceType }}</span></span>
              </div>

              <!-- Actions line -->
              <div class="row items-center justify-between border-top q-pt-xs q-mt-xs">
                <span class="text-grey-6 ellipsis" style="font-size: 9px;">Drift Status: {{ rule.driftAlerts > 0 ? `${rule.driftAlerts} active alerts` : 'Conforming' }}</span>
                
                <div class="row items-center op-gap-4">
                  <q-btn 
                    dense flat size="xs" color="amber-3" label="Manage Exceptions" 
                    @click="manageExceptions(rule)" 
                    class="bg-[#241c12] q-px-xs text-metric-sm" 
                  />
                  <q-btn 
                    dense flat size="xs" color="red-3" label="Execute Forced Uninstall" 
                    @click="promptForcedUninstall(rule)" 
                    class="bg-[#241212] q-px-xs text-weight-bold text-metric-sm" 
                  />
                </div>
              </div>
            </q-item>
          </q-list>
        </div>

        <div class="panel-footer bg-[#161b20] q-pa-xs border-top text-center text-grey-6 shrink-0" style="font-size: 10px;">
          Runtime Engine constraint: Intercepted background execution paths matching target strings are immediately terminated via kernel-level hook layers.
        </div>
      </div>

      <!-- RIGHT SECTOR: Dynamic Exception Boundaries & Threat Metrics -->
      <div class="col-12 col-md-5 column fit op-gap-16">
        
        <!-- TOP CARD: Active Exception Filters -->
        <div class="panel-card bg-[#12161a] border-muted rounded-borders column col overflow-hidden">
          <div class="panel-header bg-[#161b20] q-px-sm q-py-xs border-bottom row items-center justify-between shrink-0">
            <span class="text-operator-title text-white text-weight-bold">Tenant-Scoped Policy Exceptions</span>
            <span class="text-metric-mono text-grey-5" style="font-size: 10px;">ISOLATED INHERITANCE</span>
          </div>

          <div class="panel-body col q-pa-sm overflow-y-auto column op-gap-8">
            <div class="text-caption text-grey-4" style="font-size: 11px;">
              Enterprise partitions maintaining verified local administrative approval to load specialized debugging toolkits bypassing global containment blocks:
            </div>

            <!-- Exception item A -->
            <div class="bg-[#1b1916] q-pa-sm rounded-borders border-left-amber column op-gap-2">
              <div class="row justify-between text-caption text-white">
                <span class="text-weight-bold" style="font-size: 11px;">Target Scope: [tenant-alpha]</span>
                <span class="text-metric-mono text-amber-3" style="font-size: 10px;">1 Exemption Flagged</span>
              </div>
              <div class="text-grey-5" style="font-size: 10px;">
                Permitted Package: <span class="text-white">com.invify.hw.serial.debug</span>
              </div>
              <div class="row justify-between text-grey-6 border-top q-pt-xs q-mt-xs" style="font-size: 9px;">
                <span>Authorized by: secops@IIPS.app</span>
                <span class="text-green-4">Audited Rule</span>
              </div>
            </div>

            <!-- Exception item B -->
            <div class="bg-[#1b1916] q-pa-sm rounded-borders border-left-amber column op-gap-2">
              <div class="row justify-between text-caption text-white">
                <span class="text-weight-bold" style="font-size: 11px;">Target Scope: [warehouse_beta]</span>
                <span class="text-metric-mono text-amber-3" style="font-size: 10px;">Temporary Exemption</span>
              </div>
              <div class="text-grey-5" style="font-size: 10px;">
                Permitted Package: <span class="text-white">com.thirdparty.scanner.compat</span>
              </div>
              <div class="row justify-between text-grey-6 border-top q-pt-xs q-mt-xs" style="font-size: 9px;">
                <span>Expires: 12h remaining</span>
                <span class="text-amber-4">Drift Observed</span>
              </div>
            </div>
          </div>
        </div>

        <!-- BOTTOM CARD: Real-time Forced Uninstall Telemetry Stats -->
        <div class="bg-[#161b20] q-pa-sm rounded-borders border-muted column justify-between shrink-0" style="min-height: 94px;">
          <div class="row items-center justify-between text-caption text-white">
            <span class="text-weight-bold">Automatic Quarantine Escalation Loops</span>
            <q-icon name="sync_problem" size="xs" color="red-4" />
          </div>
          
          <div class="row items-center justify-between text-center q-pt-xs">
            <div class="column">
              <span class="text-metric-mono text-red-4 text-weight-bold" style="font-size: 18px;">14</span>
              <span class="text-grey-5" style="font-size: 10px;">Pending Wipes</span>
            </div>
            <div class="column border-left q-pl-sm">
              <span class="text-metric-mono text-green-4 text-weight-bold" style="font-size: 18px;">2,410</span>
              <span class="text-grey-5" style="font-size: 10px;">Purged Successfully</span>
            </div>
            <div class="column border-left q-pl-sm">
              <span class="text-metric-mono text-amber-4 text-weight-bold" style="font-size: 18px;">0.02%</span>
              <span class="text-grey-5" style="font-size: 10px;">Drift Evasion Rate</span>
            </div>
          </div>
        </div>

      </div>

    </div>

    <!-- MANDATORY REASON-GATED UNINSTALL DIALOGUE -->
    <q-dialog v-model="uninstallGateOpen" persistent>
      <q-card class="bg-[#12161a] text-[#e1e7ec] border-muted" style="min-width: 440px;">
        <q-card-section class="bg-[#1b1515] border-bottom row items-center op-gap-8">
          <q-icon name="warning" color="red-4" size="sm" />
          <div>
            <div class="text-white text-weight-bold text-caption">Forced Remote Uninstall Authorization Gate</div>
            <div class="text-metric-sm text-red-3">Targeting Signature: {{ selectedRuleForUninstall?.targetPattern }}</div>
          </div>
        </q-card-section>

        <q-card-section class="column op-gap-12 q-pt-md">
          <div class="text-caption text-grey-4" style="font-size: 11px;">
            Initiating a fleet-wide remote package eviction broadcast commands low-level root subsystems to purge user cache profiles and drop network bridges instantly. Please review targeted instances and input your verified operator justification string.
          </div>

          <div class="bg-[#161b20] q-pa-sm rounded-borders border-left-critical column op-gap-2 text-caption text-grey-4" style="font-size: 10px;">
            <div class="text-white text-weight-bold text-metric-sm">Target Scope Snapshot:</div>
            <div class="row justify-between"><span>Observed Endpoints Active:</span> <span class="text-red-4 text-weight-bold">{{ selectedRuleForUninstall?.observedViolations }} Nodes</span></div>
            <div class="row justify-between"><span>Enforced Trust Layer:</span> <span class="text-red-4">BLOCKED</span></div>
            <div class="row justify-between"><span>Policy Scope Inherited:</span> <span class="text-cyan-3">{{ activePolicyScope }}</span></div>
          </div>

          <q-input
            v-model="uninstallReasonStr"
            dark dense filled autofocus
            label="Mandatory SOC Uninstall Traceability Log *"
            placeholder="e.g. Critical security mandate blocking malicious keylogger variant"
            class="bg-[#161b20]"
            :rules="[val => !!val || 'Attribution justification string cannot be empty']"
          />
        </q-card-section>

        <q-card-actions align="right" class="bg-[#161b20] border-top q-pa-sm">
          <q-btn flat dense size="sm" color="grey-5" label="Cancel" v-close-popup @click="resetUninstallGate" />
          <q-btn 
            dense size="sm" color="red-5" label="Commit Forced Uninstall Payload" 
            @click="commitForcedUninstall" 
            :disable="!uninstallReasonStr" 
            class="q-px-sm text-weight-bold"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Notify } from 'quasar'

const activePolicyScope = ref('global')

// Master rules mapping complete with FINAL REFINEMENT #1: Explicit Trust State BLOCKED
const masterRulesList = ref([
  { ruleId: 'rule-01', ruleName: 'Generic Remote Keyloggers', targetPattern: 'com.malware.keylogger.*', enforcedTrustState: 'BLOCKED', riskScore: 98, observedViolations: 12, inheritanceType: 'STRICT_GLOBAL', driftAlerts: 2, policyScope: 'global' },
  { ruleId: 'rule-02', ruleName: 'Unauthorized Serial IO Proxies', targetPattern: 'com.unapproved.serial.proxy', enforcedTrustState: 'BLOCKED', riskScore: 85, observedViolations: 2, inheritanceType: 'CUSTOM_OVERRIDE', driftAlerts: 0, policyScope: 'tenant-omega' },
  { ruleId: 'rule-03', ruleName: 'Rooted Overlay Hijackers', targetPattern: 'org.overlay.hijack.malware', enforcedTrustState: 'BLOCKED', riskScore: 95, observedViolations: 0, inheritanceType: 'STRICT_GLOBAL', driftAlerts: 0, policyScope: 'global' },
  { ruleId: 'rule-04', ruleName: 'Legacy Insecure Barcode Scanners', targetPattern: 'com.old.scanner.unsupported', enforcedTrustState: 'RESTRICTED', riskScore: 65, observedViolations: 410, inheritanceType: 'STRICT_GLOBAL', driftAlerts: 1, policyScope: 'global' }
])

const filteredRules = computed(() => {
  return masterRulesList.value.filter(r => {
    if (activePolicyScope.value !== 'global' && r.policyScope !== 'global' && r.policyScope !== activePolicyScope.value) {
      return false
    }
    return true
  })
})

const promptNewRule = () => {
  Notify.create({
    type: 'info',
    message: `Mounting dynamic block pattern registry form layer...`,
    position: 'bottom-right'
  })
}

const manageExceptions = (ruleObj) => {
  Notify.create({
    type: 'info',
    message: `Loading exception boundaries configuration targeting rule [${ruleObj.ruleName}]`,
    position: 'bottom-right'
  })
}

// Reason-gated forced uninstalls
const uninstallGateOpen = ref(false)
const selectedRuleForUninstall = ref(null)
const uninstallReasonStr = ref('')

const promptForcedUninstall = (ruleObj) => {
  selectedRuleForUninstall.value = ruleObj
  uninstallReasonStr.value = ''
  uninstallGateOpen.value = true
}

const resetUninstallGate = () => {
  selectedRuleForUninstall.value = null
  uninstallReasonStr.value = ''
  uninstallGateOpen.value = false
}

const commitForcedUninstall = () => {
  if (!selectedRuleForUninstall.value || !uninstallReasonStr.value) return

  const targetPatternStr = selectedRuleForUninstall.value.targetPattern
  const reason = uninstallReasonStr.value

  console.log(`[RuntimeGovernance] Dispatched forced remote uninstall broadcast:`, {
    targetSignature: targetPatternStr,
    reasonString: reason,
    operator: 'secops@IIPS.app'
  })

  Notify.create({
    type: 'negative',
    message: `Forced eviction string broadcast successfully targeting [${targetPatternStr}]`,
    position: 'bottom-right'
  })

  // Optimistically drop observed instances to simulate complete zero-touch removal
  selectedRuleForUninstall.value.observedViolations = 0
  selectedRuleForUninstall.value.driftAlerts = 0

  resetUninstallGate()
}
</script>

<style scoped>
.border-bottom { border-bottom: 1px solid var(--enterprise-border); }
.border-top { border-top: 1px solid var(--enterprise-border); }
.border-left { border-left: 1px solid var(--enterprise-border); }
.border-muted { border: 1px solid var(--enterprise-border); }

.border-left-blocked { border-left: 3px solid #c92a2a; }
.border-left-critical { border-left: 3px solid #c92a2a; }
.border-left-amber { border-left: 3px solid #fcc419; }

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
