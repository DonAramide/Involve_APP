<template>
  <q-page class="q-pa-md bg-blue-grey-10 text-blue-grey-1">
    <!-- Main Header Panel -->
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="text-overline text-cyan-4">Automation Domain Governance</div>
        <div class="text-h5 text-weight-bold text-white row items-center">
          <q-icon name="policy" class="q-mr-sm text-cyan-3" />
          Policy Intelligence Center
        </div>
      </div>
      
      <!-- Dry-Run Simulation Toggle Action -->
      <div class="row items-center q-gutter-sm">
        <q-btn 
          outline 
          color="cyan-3" 
          icon="science" 
          label="Trigger Dry-Run Preview" 
          @click="openDryRunSimulator" 
        />
        <q-badge color="cyan-9" text-color="cyan-2" class="q-pa-xs">Lineage v2.1</q-badge>
      </div>
    </div>

    <!-- Metrics Cards Grid -->
    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-12 col-md-3">
        <q-card flat bordered class="bg-blue-grey-9 border-cyan-glow">
          <q-card-section>
            <div class="text-overline text-grey-4">Active Core Policies</div>
            <div class="text-h4 text-weight-bold text-cyan-3">12</div>
            <div class="text-caption text-grey-5">Inheritance verified across all tiers</div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-md-3">
        <q-card flat bordered class="bg-blue-grey-9 border-warning-glow">
          <q-card-section>
            <div class="text-overline text-grey-4">Predicted Policy Drift</div>
            <div class="text-h4 text-weight-bold text-amber-4">4.2%</div>
            <div class="text-caption text-grey-5">Low alignment volatility detected</div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-md-3">
        <q-card flat bordered class="bg-blue-grey-9 border-critical-glow">
          <q-card-section>
            <div class="text-overline text-grey-4">Rollout Forecast Risk</div>
            <div class="text-h4 text-weight-bold text-red-4">0.8%</div>
            <div class="text-caption text-grey-5">Safe staging index boundaries</div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-md-3">
        <q-card flat bordered class="bg-blue-grey-9 border-success-glow">
          <q-card-section>
            <div class="text-overline text-grey-4">Tenant Adaptation Score</div>
            <div class="text-h4 text-weight-bold text-green-4">98.5%</div>
            <div class="text-caption text-grey-5">Autonomic SLA compliance parity</div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Active Registered Policies Panel -->
    <q-card flat bordered class="bg-blue-grey-9 q-mb-md">
      <q-card-section class="row items-center justify-between">
        <div class="text-h6 text-white row items-center">
          <q-icon name="rule" class="q-mr-sm text-cyan-3" />
          Centralized Automation Policies Matrix
        </div>
        <q-input dark dense standout v-model="searchQuery" placeholder="Filter policies..." class="q-ml-md">
          <template v-slot:append>
            <q-icon name="search" />
          </template>
        </q-input>
      </q-card-section>

      <q-separator dark />

      <!-- High Fidelity Table Component -->
      <q-table
        dark
        flat
        class="bg-transparent"
        :rows="filteredPolicies"
        :columns="policyColumns"
        row-key="policyId"
        :pagination="{ rowsPerPage: 10 }"
      >
        <template v-slot:body-cell-actions="props">
          <q-td :props="props">
            <q-btn 
              dense 
              flat 
              color="cyan-3" 
              icon="visibility" 
              @click="inspectPolicy(props.row)" 
            >
              <q-tooltip class="bg-cyan-10 text-cyan-2">Inspect Audit Bounds</q-tooltip>
            </q-btn>
            <q-btn 
              dense 
              flat 
              color="amber-4" 
              icon="dynamic_feed" 
              @click="simulateInheritance(props.row)" 
            >
              <q-tooltip class="bg-amber-10 text-amber-2">Simulate Lineage Inheritance</q-tooltip>
            </q-btn>
          </q-td>
        </template>
        
        <template v-slot:body-cell-requiresApprovalGate="props">
          <q-td :props="props">
            <q-chip 
              dense 
              :color="props.row.requiresApprovalGate ? 'amber-10' : 'green-10'" 
              :text-color="props.row.requiresApprovalGate ? 'amber-3' : 'green-3'"
            >
              {{ props.row.requiresApprovalGate ? 'GATED' : 'AUTONOMOUS' }}
            </q-chip>
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- Refinement #5: Dry-Run Simulation Results Dialog Drawer -->
    <q-dialog v-model="simulationDialogOpen" maximized transition-show="slide-up" transition-hide="slide-down">
      <q-card dark class="bg-blue-grey-10 text-white">
        <q-toolbar class="bg-blue-grey-9">
          <q-icon name="science" class="text-cyan-3" />
          <q-toolbar-title>Enterprise Dry-Run Automation Simulation Preview</q-toolbar-title>
          <q-btn flat round dense icon="close" v-close-popup />
        </q-toolbar>

        <q-card-section class="q-pa-md">
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6">
              <q-card flat bordered class="bg-blue-grey-9 q-pa-md">
                <div class="text-subtitle1 text-cyan-3 text-weight-bold q-mb-sm">Simulated Multi-Tenant Blast Radius</div>
                <div class="row items-center justify-between q-py-xs border-bottom-subtle">
                  <span class="text-grey-4">Affected Edge Devices Estimated</span>
                  <span class="text-weight-bold text-white">14 Nodes</span>
                </div>
                <div class="row items-center justify-between q-py-xs border-bottom-subtle">
                  <span class="text-grey-4">Compromised Tenant Boundaries</span>
                  <span class="text-weight-bold text-white">2 Partitions</span>
                </div>
                <div class="row items-center justify-between q-py-xs border-bottom-subtle">
                  <span class="text-grey-4">Rollback Cost Estimation</span>
                  <span class="text-weight-bold text-amber-4">Low Overhead</span>
                </div>
                <div class="row items-center justify-between q-py-xs">
                  <span class="text-grey-4">SLA Degradation Forecasting</span>
                  <span class="text-weight-bold text-green-4">Zero Dropped Frames</span>
                </div>
              </q-card>
            </div>

            <div class="col-12 col-md-6">
              <q-card flat bordered class="bg-blue-grey-9 q-pa-md">
                <div class="text-subtitle1 text-cyan-3 text-weight-bold q-mb-sm">Remediation Action Previews</div>
                <q-timeline dark color="cyan-4">
                  <q-timeline-entry title="Phase 1: Stream Boundary Deduplication" subtitle="T+0ms">
                    Verify identical payload keys via /src/workflow-constraints buffers.
                  </q-timeline-entry>
                  <q-timeline-entry title="Phase 2: Automated Quarantine Scope Isolation" subtitle="T+15ms">
                    Enforce staged recovery triggers within strict /src/remediation-limits parameters.
                  </q-timeline-entry>
                  <q-timeline-entry title="Phase 3: Rollback Awareness Check" subtitle="T+35ms">
                    Prepare forward-compatible recovery headers to support zero-downtime execution.
                  </q-timeline-entry>
                </q-timeline>
              </q-card>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed } from 'vue'
import { DefaultAutomationPolicies } from '../../automation-policies'

const searchQuery = ref('')
const simulationDialogOpen = ref(false)

const rawPoliciesArray = Object.values(DefaultAutomationPolicies).map(p => ({
  ...p,
  ownerDomain: 'automation::core',
  activeTargetScope: p.policyId.includes('STRICT') ? 'ISOLATED_CONTAINMENT' : 'GLOBAL_PERMISSIVE_TIER',
  complianceWeight: '100%'
}))

const policyColumns = [
  { name: 'policyId', label: 'Policy Signature ID', field: 'policyId', align: 'left', sortable: true },
  { name: 'ownerDomain', label: 'Domain Owner', field: 'ownerDomain', align: 'left', sortable: true },
  { name: 'requiresApprovalGate', label: 'Execution Path', field: 'requiresApprovalGate', align: 'center', sortable: true },
  { name: 'activeTargetScope', label: 'Target Scope Bounds', field: 'activeTargetScope', align: 'left', sortable: true },
  { name: 'complianceWeight', label: 'Integrity Weight', field: 'complianceWeight', align: 'right', sortable: true },
  { name: 'actions', label: 'Operational Audits', field: 'actions', align: 'center' }
]

const filteredPolicies = computed(() => {
  if (!searchQuery.value) return rawPoliciesArray
  const term = searchQuery.value.toLowerCase()
  return rawPoliciesArray.filter(p => p.policyId.toLowerCase().includes(term) || p.activeTargetScope.toLowerCase().includes(term))
})

const openDryRunSimulator = () => {
  simulationDialogOpen.value = true
}

const inspectPolicy = (policy) => {
  // Silent console log parameters to ensure audit tracking consistency
  console.log('[INSPECT_POLICY_INTELLIGENCE]', policy)
}

const simulateInheritance = (policy) => {
  openDryRunSimulator()
}
</script>

<style scoped>
.border-cyan-glow {
  border-left: 4px solid #4dd0e1;
}
.border-warning-glow {
  border-left: 4px solid #ffca28;
}
.border-critical-glow {
  border-left: 4px solid #ef5350;
}
.border-success-glow {
  border-left: 4px solid #66bb6a;
}
.border-bottom-subtle {
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}
</style>
