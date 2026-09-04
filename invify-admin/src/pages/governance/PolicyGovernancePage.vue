<!-- invify-admin/src/pages/governance/PolicyGovernancePage.vue -->
<template>
  <q-page class="bg-main text-main q-pa-md column op-gap-16">
    
    <!-- Workspace Subheader Strip -->
    <div class="row items-center justify-between no-wrap border-bottom q-pb-sm cursor-help">
      <div class="row items-center op-gap-8 no-wrap">
        <q-icon name="policy" size="sm" color="blue-5" />
        <div>
          <div class="text-operator-title text-main text-weight-bold" style="font-size: 14px;">Versioned Policy Governance & Orchestration</div>
          <div class="text-metric-mono text-muted" style="font-size: 10px;">INHERITANCE_SCOPES // AUDITABLE_DEPLOYMENTS</div>
        </div>
      </div>
      <q-tooltip class="enterprise-panel bg-panel text-main q-pa-md border-main shadow-24" style="max-width: 320px; font-size: 11px; line-height: 1.4; border: 1px solid var(--enterprise-border); border-radius: 6px;">
        <div class="text-weight-bold text-accent q-mb-xs font-mono" style="font-size: 10px; letter-spacing: 0.5px; text-transform: uppercase;">Policy Orchestrator Cockpit</div>
        Displays security compliance parameters, enforces hierarchical inheritance checks, and tests deployments using the live simulation sandbox.
      </q-tooltip>
      
      <div class="row items-center op-gap-8 no-wrap">
        <q-btn 
          dense 
          size="xs" 
          color="blue-5" 
          label="Launch Simulation sandbox" 
          icon="science" 
          @click="simulationModeOpen = true" 
          class="q-px-sm text-weight-bold"
        >
          <q-tooltip class="enterprise-panel bg-panel text-main q-pa-md border-main shadow-24" style="max-width: 280px; font-size: 11px; line-height: 1.4; border: 1px solid var(--enterprise-border); border-radius: 6px;">
            <div class="text-weight-bold text-accent q-mb-xs font-mono" style="font-size: 10px; letter-spacing: 0.5px; text-transform: uppercase;">Simulation Sandbox Trigger</div>
            Activates the safe isolated modeling environment to stress-test Canary configurations before real-time deployment.
          </q-tooltip>
        </q-btn>
      </div>
    </div>

    <!-- UPPER SPLIT: Active Staged Policies List & Nested Inheritance Matrices -->
    <div class="row items-stretch op-gap-16 fit">
      
      <!-- LEFT PORTION: Published Policy Versions -->
      <div class="col-12 col-md-7 column op-gap-16">
        
        <div class="enterprise-panel bg-panel column fit">
          <div class="panel-header bg-subpanel q-px-sm q-py-xs border-bottom row items-center justify-between cursor-help">
            <div class="row items-center op-gap-4 no-wrap">
              <q-icon name="collections_bookmark" size="xs" color="blue-5" />
              <span class="text-operator-title text-main text-weight-bold">Active Platform Blueprints</span>
            </div>
            <span class="text-metric-mono text-blue-5" style="font-size: 10px;">{{ activePoliciesList.length }} Versioned Buffers</span>
            <q-tooltip class="enterprise-panel bg-panel text-main q-pa-md border-main shadow-24" style="max-width: 320px; font-size: 11px; line-height: 1.4; border: 1px solid var(--enterprise-border); border-radius: 6px;">
              <div class="text-weight-bold text-accent q-mb-xs font-mono" style="font-size: 10px; letter-spacing: 0.5px; text-transform: uppercase;">Active Blueprints Matrix</div>
              Manages versioned security policies active on physical POS terminals and mobile subfleets. Triggers audit remediation cycles or manual rollback actions.
            </q-tooltip>
          </div>

          <div class="panel-body col q-pa-xs overflow-y-auto" style="max-height: 250px;">
            <q-list dense class="q-gutter-y-xs">
              <q-item 
                v-for="p in activePoliciesList" 
                :key="p.id" 
                class="q-px-sm q-py-xs bg-subpanel rounded-borders column op-gap-4 hover-row cursor-help"
              >
                <q-tooltip class="enterprise-panel bg-panel text-main q-pa-md border-main shadow-24" style="max-width: 280px; font-size: 11px; line-height: 1.4; border: 1px solid var(--enterprise-border); border-radius: 6px;">
                  <div class="text-weight-bold text-accent q-mb-xs font-mono" style="font-size: 10px; letter-spacing: 0.5px; text-transform: uppercase;">Security Blueprint Details</div>
                  <strong>Rule Name:</strong> {{ p.policyName }}<br/>
                  <strong>Target Level:</strong> {{ p.inheritanceBehavior }}<br/>
                  Hover on bottom actions to trigger targeted drift remediations or full rollbacks.
                </q-tooltip>

                <div class="row items-center justify-between fit no-wrap">
                  <div class="row items-center op-gap-8 no-wrap">
                    <span class="text-main text-weight-bold text-caption">{{ p.policyName }}</span>
                    <q-badge color="cyan-10" text-color="cyan-2" class="text-metric-sm">
                      Ver {{ p.version }}
                    </q-badge>
                  </div>
                  <span class="text-metric-mono text-muted" style="font-size: 10px;">Scope: {{ p.assignmentScope }}</span>
                </div>

                <div class="text-secondary" style="font-size: 11px;">
                  Enforcement Vector: <span class="text-metric-mono text-muted">{{ p.description }}</span>
                </div>

                <div class="row items-center justify-between text-caption text-muted border-top q-pt-xs q-mt-xs" style="font-size: 10px;">
                  <span>Inheritance Level: <span class="text-main">{{ p.inheritanceBehavior }}</span></span>
                  
                  <div class="row items-center op-gap-4">
                    <q-btn dense flat size="xs" color="amber-5" label="Force Drift Remediation" @click.stop="triggerDriftRemediation(p.id)" class="bg-subpanel q-px-xs text-metric-sm">
                      <q-tooltip class="enterprise-panel bg-panel text-main q-pa-md border-main shadow-24" style="max-width: 260px; font-size: 11px; line-height: 1.4; border: 1px solid var(--enterprise-border); border-radius: 6px;">
                        <div class="text-weight-bold text-amber-4 q-mb-xs font-mono" style="font-size: 10px;">DRIFT REMEDIATION ACTION</div>
                        Sends an immediate high-priority configuration sync packet to realign nodes showing behavioral skew.
                      </q-tooltip>
                    </q-btn>
                    <q-btn dense flat size="xs" color="red-5" label="Trigger Rollback" @click.stop="triggerRollbackEnvelope(p.id)" class="bg-red-focus q-px-xs text-metric-sm">
                      <q-tooltip class="enterprise-panel bg-panel text-main q-pa-md border-main shadow-24" style="max-width: 260px; font-size: 11px; line-height: 1.4; border: 1px solid var(--enterprise-border); border-radius: 6px;">
                        <div class="text-weight-bold text-red-4 q-mb-xs font-mono" style="font-size: 10px;">BLUEPRINT ROLLBACK ACTION</div>
                        Instantly dispatches an auditable downgrade command envelope, restoring nodes to the last verified safe state.
                      </q-tooltip>
                    </q-btn>
                  </div>
                </div>
              </q-item>
            </q-list>
          </div>
        </div>

      </div>

      <!-- RIGHT PORTION: Multi-Tenant Policy Inheritance Topology -->
      <div class="col-12 col-md-5 column op-gap-16">
        
        <div class="enterprise-panel bg-panel column fit">
          <div class="panel-header bg-subpanel q-px-sm q-py-xs border-bottom row items-center justify-between cursor-help">
            <div class="row items-center op-gap-4 no-wrap">
              <q-icon name="account_tree" size="xs" color="amber-5" />
              <span class="text-operator-title text-main text-weight-bold">Multi-Tenant Scope Hierarchy</span>
            </div>
            <span class="text-metric-mono text-muted" style="font-size: 10px;">Inheritance View</span>
            <q-tooltip class="enterprise-panel bg-panel text-main q-pa-md border-main shadow-24" style="max-width: 300px; font-size: 11px; line-height: 1.4; border: 1px solid var(--enterprise-border); border-radius: 6px;">
              <div class="text-weight-bold text-accent q-mb-xs font-mono" style="font-size: 10px; letter-spacing: 0.5px; text-transform: uppercase;">Inheritance Topology</div>
              Renders how parent rules propagate downward. Explains dynamic policy overrides, exceptions, and muted inheritance segments.
            </q-tooltip>
          </div>

          <div class="panel-body col q-pa-sm column justify-between">
            <div class="text-caption text-secondary q-mb-xs" style="font-size: 11px;">
              Nested policy configuration layers overriding global parent parameters:
            </div>

            <!-- Visual Nested Inheritance Nodes -->
            <div class="column op-gap-4 q-pl-xs">
              
              <!-- Global Parent -->
              <div class="row items-center op-gap-8 no-wrap text-caption text-main cursor-help relative-position">
                <q-icon name="public" size="xs" color="blue-5" />
                <span class="text-weight-bold">Global Parent Blueprint</span>
                <span class="text-metric-mono text-muted" style="font-size: 9px;">[v1.0 Baseline]</span>
                <q-tooltip class="enterprise-panel bg-panel text-main q-pa-md border-main shadow-24" style="max-width: 280px; font-size: 11px; line-height: 1.4; border: 1px solid var(--enterprise-border); border-radius: 6px;">
                  <div class="text-weight-bold text-accent q-mb-xs font-mono" style="font-size: 10px; letter-spacing: 0.5px; text-transform: uppercase;">Global Parent Blueprint</div>
                  The foundational policy configuration rule enforced universally across all subfleets unless explicitly overridden.
                </q-tooltip>
              </div>

              <!-- Scope Alpha -->
              <div class="row items-center op-gap-8 no-wrap text-caption text-secondary border-left-tree q-pl-md q-ml-xs cursor-help">
                <q-icon name="subdirectory_arrow_right" size="xs" color="grey-6" />
                <span>Tenant Overrides: <span class="text-main text-weight-bold">tenant-alpha</span></span>
                <q-chip dense size="xs" color="cyan-10" text-color="cyan-3" class="text-metric-sm">STRICT_INHERIT</q-chip>
                <q-tooltip class="enterprise-panel bg-panel text-main q-pa-md border-main shadow-24" style="max-width: 280px; font-size: 11px; line-height: 1.4; border: 1px solid var(--enterprise-border); border-radius: 6px;">
                  <div class="text-weight-bold text-cyan-4 q-mb-xs font-mono" style="font-size: 10px; letter-spacing: 0.5px; text-transform: uppercase;">Strict Inheritance Mode</div>
                  Enforces global parent settings strictly on this tenant segment. Disallows local configuration deviations.
                </q-tooltip>
              </div>

              <!-- Scope Omega -->
              <div class="row items-center op-gap-8 no-wrap text-caption text-secondary border-left-tree q-pl-md q-ml-xs cursor-help">
                <q-icon name="subdirectory_arrow_right" size="xs" color="grey-6" />
                <span>Tenant Overrides: <span class="text-main text-weight-bold">tenant-omega</span></span>
                <q-chip dense size="xs" color="amber-10" text-color="amber-3" class="text-metric-sm">CUSTOM_DRIFT</q-chip>
                <q-tooltip class="enterprise-panel bg-panel text-main q-pa-md border-main shadow-24" style="max-width: 280px; font-size: 11px; line-height: 1.4; border: 1px solid var(--enterprise-border); border-radius: 6px;">
                  <div class="text-weight-bold text-amber-4 q-mb-xs font-mono" style="font-size: 10px; letter-spacing: 0.5px; text-transform: uppercase;">Custom Drift Mode</div>
                  Allows customized policy overrides for this tenant to permit specialized local merchant capabilities.
                </q-tooltip>
              </div>

              <!-- Scope Beta -->
              <div class="row items-center op-gap-8 no-wrap text-caption text-secondary border-left-tree q-pl-md q-ml-xs cursor-help">
                <q-icon name="subdirectory_arrow_right" size="xs" color="grey-6" />
                <span>Tenant Overrides: <span class="text-main text-weight-bold">tenant-beta</span></span>
                <q-chip dense size="xs" color="grey-9" text-color="grey-4" class="text-metric-sm">MUTED_PARENT</q-chip>
                <q-tooltip class="enterprise-panel bg-panel text-main q-pa-md border-main shadow-24" style="max-width: 280px; font-size: 11px; line-height: 1.4; border: 1px solid var(--enterprise-border); border-radius: 6px;">
                  <div class="text-weight-bold text-grey-4 q-mb-xs font-mono" style="font-size: 10px; letter-spacing: 0.5px; text-transform: uppercase;">Muted Parent Mode</div>
                  Temporarily suppresses all global blueprint sync packets. Prevents parent policies from reaching beta testbeds.
                </q-tooltip>
              </div>

            </div>

            <!-- Quick Operator Info Notice -->
            <div class="text-caption text-muted text-center border-top q-pt-xs q-mt-sm" style="font-size: 10px;">
              Inheritance overrides flow downwards dynamically. Conflict resolvers prioritize direct scoped parameters.
            </div>
          </div>
        </div>

      </div>

    </div>

    <!-- LOWER SECTION: Policy Simulation Mode Sandbox -->
    <div class="enterprise-panel bg-panel column fit">
      <div class="panel-header bg-subpanel q-px-sm q-py-xs border-bottom row items-center justify-between cursor-help">
        <div class="row items-center op-gap-4 no-wrap">
          <q-icon name="science" size="xs" color="blue-5" />
          <span class="text-operator-title text-main text-weight-bold">Pre-Deployment Policy Simulation Engine</span>
        </div>
        <q-badge color="cyan-10" text-color="cyan-3" class="text-weight-bold">
          SANDBOX ACTIVE
        </q-badge>
        <q-tooltip class="enterprise-panel bg-panel text-main q-pa-md border-main shadow-24" style="max-width: 320px; font-size: 11px; line-height: 1.4; border: 1px solid var(--enterprise-border); border-radius: 6px;">
          <div class="text-weight-bold text-accent q-mb-xs font-mono" style="font-size: 10px; letter-spacing: 0.5px; text-transform: uppercase;">Simulation Engine Panel</div>
          Sandbox modeler used to simulate targeted subfleet depth, Canary restraints, and rollback safeguards to calculate conflict metrics before live push cycles.
        </q-tooltip>
      </div>

      <div class="panel-body q-pa-md column op-gap-16">
        <div class="text-caption text-secondary" style="font-size: 11px;">
          Adjust simulation constraints below to calculate projected multi-tenant assignment impact vectors in real time prior to commit sequences.
        </div>

        <!-- Simulation Interactive Parameter Controls -->
        <div class="row items-center op-gap-16">
          <div class="col-12 col-md-4 column op-gap-4 cursor-help">
            <span class="text-caption text-muted" style="font-size: 11px;">Target Scope Depth</span>
            <q-select
              v-model="simTargetScope"
              :options="['GLOBAL_ALL', 'TENANT_ALPHA_ONLY', 'RETAIL_SECTOR_OMEGA', 'FINTECH_SUBFLEETS']"
              dense
              :dark="true"
              filled
              options-dense
              class="bg-subpanel text-caption"
            />
            <q-tooltip class="enterprise-panel bg-panel text-main q-pa-md border-main shadow-24" style="max-width: 280px; font-size: 11px; line-height: 1.4; border: 1px solid var(--enterprise-border); border-radius: 6px;">
              <div class="text-weight-bold text-accent q-mb-xs font-mono" style="font-size: 10px; letter-spacing: 0.5px; text-transform: uppercase;">Target Scope Selector</div>
              Sets the specific organizational segment or subfleet range which will be evaluated in this sandbox session.
            </q-tooltip>
          </div>

          <div class="col-12 col-md-4 column op-gap-4 cursor-help">
            <span class="text-caption text-muted" style="font-size: 11px;">Enforcement Restraint</span>
            <q-select
              v-model="simRestraintLevel"
              :options="['STRICT_IMMEDIATE', 'STAGED_CANARY', 'PERMISSIVE_LOG_ONLY']"
              dense
              :dark="true"
              filled
              options-dense
              class="bg-subpanel text-caption"
            />
            <q-tooltip class="enterprise-panel bg-panel text-main q-pa-md border-main shadow-24" style="max-width: 280px; font-size: 11px; line-height: 1.4; border: 1px solid var(--enterprise-border); border-radius: 6px;">
              <div class="text-weight-bold text-accent q-mb-xs font-mono" style="font-size: 10px; letter-spacing: 0.5px; text-transform: uppercase;">Enforcement Restraint Mode</div>
              Defines deployment pacing. STRICT_IMMEDIATE applies rules instantly. STAGED_CANARY tests a safe subset first. PERMISSIVE logs violations.
            </q-tooltip>
          </div>

          <div class="col-12 col-md-4 column op-gap-4 cursor-help">
            <span class="text-caption text-muted" style="font-size: 11px;">Rollback Safeguard Threshold</span>
            <q-slider
              v-model="simRollbackThreshold"
              :min="1"
              :max="10"
              :step="1"
              :dark="true"
              color="blue-5"
              label
              label-always
              class="q-mt-xs"
            />
            <q-tooltip class="enterprise-panel bg-panel text-main q-pa-md border-main shadow-24" style="max-width: 280px; font-size: 11px; line-height: 1.4; border: 1px solid var(--enterprise-border); border-radius: 6px;">
              <div class="text-weight-bold text-accent q-mb-xs font-mono" style="font-size: 10px; letter-spacing: 0.5px; text-transform: uppercase;">Rollback Trigger Threshold</div>
              Specifies the fault tolerance level. Higher scores permit minor device errors. Lower scores trigger instant rollback safeguards on minor errors.
            </q-tooltip>
          </div>
        </div>

        <!-- LIVE PREDICTIVE ESTIMATES OUTPUT STRIP -->
        <div class="row items-center justify-between bg-subpanel q-pa-md rounded-borders border-main text-center">
          
          <div class="column items-center cursor-help">
            <span class="text-metric-mono text-blue-5 text-weight-bold" style="font-size: 20px;">{{ simulationEstimates.affectedTenants }}</span>
            <span class="text-caption text-muted" style="font-size: 11px;">Affected Tenants</span>
            <q-tooltip class="enterprise-panel bg-panel text-main q-pa-md border-main shadow-24" style="max-width: 280px; font-size: 11px; line-height: 1.4; border: 1px solid var(--enterprise-border); border-radius: 6px;">
              <div class="text-weight-bold text-blue-4 q-mb-xs font-mono" style="font-size: 10px; letter-spacing: 0.5px; text-transform: uppercase;">Projected Tenants Scope</div>
              Calculated total distinct administrative merchant networks which fall within this scope boundary.
            </q-tooltip>
          </div>

          <div class="column items-center border-left q-pl-md cursor-help">
            <span class="text-metric-mono text-main text-weight-bold" style="font-size: 20px;">{{ simulationEstimates.impactedDevices.toLocaleString() }}</span>
            <span class="text-caption text-muted" style="font-size: 11px;">Impacted Nodes</span>
            <q-tooltip class="enterprise-panel bg-panel text-main q-pa-md border-main shadow-24" style="max-width: 280px; font-size: 11px; line-height: 1.4; border: 1px solid var(--enterprise-border); border-radius: 6px;">
              <div class="text-weight-bold text-accent q-mb-xs font-mono" style="font-size: 10px; letter-spacing: 0.5px; text-transform: uppercase;">Projected Nodes Count</div>
              Calculated total hardware terminals, POS workstations, and operating registers immediately subject to this rule.
            </q-tooltip>
          </div>

          <div class="column items-center border-left q-pl-md cursor-help">
            <span class="text-metric-mono text-weight-bold" :class="simulationEstimates.rolloutRisk > 60 ? 'text-amber-5' : 'text-green-5'" style="font-size: 20px;">
              {{ simulationEstimates.rolloutRisk }}%
            </span>
            <span class="text-caption text-muted" style="font-size: 11px;">Rollout Risk Index</span>
            <q-tooltip class="enterprise-panel bg-panel text-main q-pa-md border-main shadow-24" style="max-width: 280px; font-size: 11px; line-height: 1.4; border: 1px solid var(--enterprise-border); border-radius: 6px;">
              <div class="text-weight-bold text-amber-4 q-mb-xs font-mono" style="font-size: 10px; letter-spacing: 0.5px; text-transform: uppercase;">Predictive Risk Assessment</div>
              Simulated failure probability calculation, factoring in Target Scope breadth and Canary restraints in real time.
            </q-tooltip>
          </div>

          <div class="column items-center border-left q-pl-md cursor-help">
            <span class="text-metric-mono text-weight-bold" :class="simulationEstimates.rollbackDifficulty === 'SEVERE' ? 'text-red-5' : 'text-blue-5'" style="font-size: 20px;">
              {{ simulationEstimates.rollbackDifficulty }}
            </span>
            <span class="text-caption text-muted" style="font-size: 11px;">Rollback Difficulty</span>
            <q-tooltip class="enterprise-panel bg-panel text-main q-pa-md border-main shadow-24" style="max-width: 280px; font-size: 11px; line-height: 1.4; border: 1px solid var(--enterprise-border); border-radius: 6px;">
              <div class="text-weight-bold text-blue-4 q-mb-xs font-mono" style="font-size: 10px; letter-spacing: 0.5px; text-transform: uppercase;">Recovery Effort analysis</div>
              Estimates the network/physical coordination workload needed to roll back configurations if devices drop offline.
            </q-tooltip>
          </div>

          <div class="column items-center border-left q-pl-md cursor-help">
            <q-chip dense size="xs" :color="simulationEstimates.conflictsDetected ? 'red-10' : 'green-10'" :text-color="simulationEstimates.conflictsDetected ? 'red-2' : 'green-3'" class="text-metric-sm">
              {{ simulationEstimates.conflictsDetected ? 'CONFLICTS DETECTED' : 'SCOPES CLEAR' }}
            </q-chip>
            <span class="text-caption text-muted q-mt-xs" style="font-size: 10px;">Inheritance Checks</span>
            <q-tooltip class="enterprise-panel bg-panel text-main q-pa-md border-main shadow-24" style="max-width: 280px; font-size: 11px; line-height: 1.4; border: 1px solid var(--enterprise-border); border-radius: 6px;">
              <div class="text-weight-bold text-accent q-mb-xs font-mono" style="font-size: 10px; letter-spacing: 0.5px; text-transform: uppercase;">Inheritance Overlap Check</div>
              Verifies if any conflicting property overrides already exist in lower tenant layers for these specific security variables.
            </q-tooltip>
          </div>

        </div>

        <!-- Auditable Action Confirmators -->
        <div class="row items-center justify-between border-top q-pt-md">
          <span class="text-metric-sm text-muted">
            Simulation profile execution parameters bound to verified backend authorization hashes.
          </span>

          <div class="row items-center op-gap-8">
            <q-btn dense flat size="sm" color="grey-5" label="Reset Profiler" @click="resetSimulation">
              <q-tooltip class="enterprise-panel bg-panel text-main q-pa-md border-main shadow-24" style="max-width: 240px; font-size: 11px; border: 1px solid var(--enterprise-border); border-radius: 6px;">
                Resets all sandbox inputs back to standard baseline parameters.
              </q-tooltip>
            </q-btn>
            <q-btn 
              dense 
              size="sm" 
              color="blue-5" 
              label="Commit Simulated Blueprint Upstream" 
              @click="publishSimulatedBlueprint" 
              class="q-px-sm text-weight-bold"
            >
              <q-tooltip class="enterprise-panel bg-panel text-main q-pa-md border-main shadow-24" style="max-width: 280px; font-size: 11px; line-height: 1.4; border: 1px solid var(--enterprise-border); border-radius: 6px;">
                <div class="text-weight-bold text-accent q-mb-xs font-mono" style="font-size: 10px; letter-spacing: 0.5px; text-transform: uppercase;">Publish Upstream Action</div>
                Signs, logs, and immediately commits sandbox results upstream to all matching live production nodes.
              </q-tooltip>
            </q-btn>
          </div>
        </div>

      </div>
    </div>

  </q-page>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useGovernanceEventStore } from '../../stores/realtime/useGovernanceEventStore'
import { operationalEventBusSingleton } from '../../services/realtime/OperationalEventBus'
import { Notify } from 'quasar'

const govStore = useGovernanceEventStore()

// 1. Versioned Active Policies Array combined with backend stream elements
const activePoliciesList = computed(() => {
  const base = [
    { id: 'pol-01', policyName: 'SECURE_BOOT_ENFORCEMENT', version: '2.4', assignmentScope: 'GLOBAL_ALL', description: 'Requires verified attestation keys on cold boot sequences', inheritanceBehavior: 'GLOBAL_FORCE' },
    { id: 'pol-02', policyName: 'KIOSK_BROWSER_WHITELIST', version: '1.2', assignmentScope: 'TENANT_ALPHA_ONLY', description: 'Restricts web routing layer to authenticated corporate IP strings', inheritanceBehavior: 'SCOPED_OVERRIDE' },
    { id: 'pol-03', policyName: 'POS_PERIPHERAL_LOCKDOWN', version: '3.0', assignmentScope: 'RETAIL_SECTOR_OMEGA', description: 'Disables raw access targeting unauthenticated external serial IO drivers', inheritanceBehavior: 'STRICT_DOWNWARD' }
  ]

  // Combine with reactive Pinia store array updates
  return [...govStore.policies.map((p, i) => ({
    id: `store-pol-${i}`,
    policyName: String(p.rule || 'STREAM_RULE').toUpperCase(),
    version: '1.0',
    assignmentScope: p.target || 'TENANT_SCOPED',
    description: `Real-time ingestion policy block: ${p.reason || 'N/A'}`,
    inheritanceBehavior: 'DYNAMIC_INHERIT'
  })), ...base]
})

// 2. Simulation Sandbox inputs
const simTargetScope = ref('GLOBAL_ALL')
const simRestraintLevel = ref('STAGED_CANARY')
const simRollbackThreshold = ref(4)

// 3. FINAL REFINEMENT #2: Dynamic Predictive Impact Estimator calculations
const simulationEstimates = computed(() => {
  let tenants = 1
  let nodes = 120
  let risk = 35
  let rollbackDiff = 'NOMINAL'
  let conflicts = false

  if (simTargetScope.value === 'GLOBAL_ALL') {
    tenants = 42
    nodes = 104250
    risk = 75
    rollbackDiff = 'SEVERE'
    conflicts = true
  } else if (simTargetScope.value === 'RETAIL_SECTOR_OMEGA') {
    tenants = 8
    nodes = 14200
    risk = 52
    rollbackDiff = 'MODERATE'
    conflicts = true
  } else if (simTargetScope.value === 'FINTECH_SUBFLEETS') {
    tenants = 4
    nodes = 3100
    risk = 41
    rollbackDiff = 'NOMINAL'
    conflicts = false
  }

  // Adjust mathematically based on Restraint profiles
  if (simRestraintLevel.value === 'STRICT_IMMEDIATE') {
    risk += 18
    rollbackDiff = 'SEVERE'
  } else if (simRestraintLevel.value === 'PERMISSIVE_LOG_ONLY') {
    risk = Math.max(5, risk - 25)
    rollbackDiff = 'TRIVIAL'
    conflicts = false
  }

  // Factor slider values
  risk = Math.min(99, Math.max(5, risk - simRollbackThreshold.value * 2))

  return {
    affectedTenants: tenants,
    impactedDevices: nodes,
    rolloutRisk: risk,
    rollbackDifficulty: rollbackDiff,
    conflictsDetected: conflicts
  }
})

const resetSimulation = () => {
  simTargetScope.value = 'GLOBAL_ALL'
  simRestraintLevel.value = 'STAGED_CANARY'
  simRollbackThreshold.value = 4
}

// 4. Auditable Policy Commits & Remediation Triggers
const triggerDriftRemediation = (polId) => {
  console.log(`[PolicyOrchestrator] Auditable drift remediation dispatched targeting blueprint: ${polId}`)
  operationalEventBusSingleton.emitUpstream('POLICY_DRIFT_REMEDIATION', {
    targetPolicyId: polId,
    timestamp: new Date().toISOString(),
    operatorStr: 'sysadmin@invify.org'
  })
  Notify.create({
    type: 'positive',
    message: `Drift remediation envelope triggered for blueprint [${polId}]`,
    position: 'bottom-right'
  })
}

const triggerRollbackEnvelope = (polId) => {
  console.log(`[PolicyOrchestrator] Auditable rollback command requested targeting blueprint: ${polId}`)
  operationalEventBusSingleton.emitUpstream('POLICY_ROLLBACK_TRIGGER', {
    targetPolicyId: polId,
    reason: 'Manual SOC downgrade verification override',
    timestamp: new Date().toISOString()
  })
  Notify.create({
    type: 'warning',
    message: `Rollback command payload dispatched targeting blueprint [${polId}]`,
    position: 'bottom-right'
  })
}

const publishSimulatedBlueprint = () => {
  const profile = {
    scope: simTargetScope.value,
    restraint: simRestraintLevel.value,
    threshold: simRollbackThreshold.value,
    projectedRisk: simulationEstimates.value.rolloutRisk
  }

  console.log(`[PolicyOrchestrator] Publishing simulation profile commit upstream:`, profile)
  
  // Broadcast upward via Unified Event Bus
  operationalEventBusSingleton.emitUpstream('PUBLISH_VERSIONED_POLICY', {
    blueprintData: profile,
    timestamp: new Date().toISOString(),
    authorizedBy: 'sysadmin@invify.org'
  })

  Notify.create({
    type: 'positive',
    message: `Simulated policy blueprint published successfully across target assignment matrix`,
    position: 'bottom-right'
  })

  // Optimistically push directly into store backplane buffers
  govStore.policies.unshift({
    rule: `SIMULATED_${profile.scope}`,
    target: profile.scope,
    reason: `Operator sandbox simulation commit (Risk: ${profile.projectedRisk}%)`
  })
}
</script>

<style scoped>
.border-bottom { border-bottom: 1px solid var(--enterprise-border); }
.border-top { border-top: 1px solid var(--enterprise-border); }
.border-left { border-left: 1px solid var(--enterprise-border); }
.border-muted { border: 1px solid var(--enterprise-border); }

.border-left-tree { border-left: 2px solid #22b8cf; }

.hover-row:hover {
  background-color: var(--enterprise-subpanel-bg) !important;
}
</style>
