<template>
  <q-page class="q-pa-md bg-blue-grey-10 text-blue-grey-1">
    <!-- Main Header Panel -->
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="text-overline text-cyan-4">Orchestration Intelligence Stack</div>
        <div class="text-h5 text-weight-bold text-white row items-center">
          <q-icon name="account_tree" class="q-mr-sm text-cyan-3" />
          Workflow Execution & Audit Center
        </div>
      </div>
      
      <!-- Current State Summary Badge -->
      <div class="row items-center q-gutter-sm">
        <q-chip dense color="cyan-10" text-color="cyan-2" icon="alt_route">11 Core States Enabled</q-chip>
      </div>
    </div>

    <!-- Live Execution Grid View -->
    <div class="row q-col-gutter-md">
      <!-- Active Orchestration Jobs Panel -->
      <div class="col-12 col-md-7">
        <q-card flat bordered class="bg-blue-grey-9 q-mb-md">
          <q-card-section class="row items-center justify-between">
            <div class="text-subtitle1 text-white text-weight-bold row items-center">
              <q-icon name="linear_scale" class="q-mr-sm text-cyan-3" />
              Live Remediation Workflow Timelines
            </div>
            <q-badge color="amber-10" text-color="amber-3">Idempotency deduplicated</q-badge>
          </q-card-section>
          
          <q-separator dark />

          <q-list dark separator class="bg-transparent">
            <q-item v-for="job in simulatedWorkflows" :key="job.workflowId" clickable @click="selectWorkflow(job)" :class="selectedJob?.workflowId === job.workflowId ? 'bg-blue-grey-8' : ''">
              <q-item-section avatar>
                <q-icon 
                  :name="getWorkflowIcon(job.state)" 
                  :class="getWorkflowColor(job.state)" 
                />
              </q-item-section>

              <q-item-section>
                <q-item-label class="text-white text-weight-bold">{{ job.workflowId }}</q-item-label>
                <q-item-label caption class="text-grey-4">Target Tenant Partition: {{ job.targetTenant }}</q-item-label>
                <!-- Workflow Dependency Graph Indicators -->
                <div class="row items-center q-gutter-xs q-mt-xs">
                  <q-badge :color="job.dependencyGraphNodes.rolloutDependenciesConverged ? 'green-10' : 'red-10'" :text-color="job.dependencyGraphNodes.rolloutDependenciesConverged ? 'green-3' : 'red-2'" dense>Rollout Deps</q-badge>
                  <q-badge :color="job.dependencyGraphNodes.governanceLocksCleared ? 'green-10' : 'amber-10'" :text-color="job.dependencyGraphNodes.governanceLocksCleared ? 'green-3' : 'amber-3'" dense>Gov Locks</q-badge>
                </div>
              </q-item-section>

              <q-item-section side>
                <div class="text-right">
                  <q-chip dense :color="getStateBg(job.state)" :text-color="getStateTextColor(job.state)" class="text-weight-bold">
                    {{ job.state }}
                  </q-chip>
                  <div class="text-caption text-grey-5 q-mt-xs">{{ job.steps.length }} Execution Steps</div>
                </div>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </div>

      <!-- Detail & Human Override Controller Drawer Panel -->
      <div class="col-12 col-md-5">
        <q-card flat bordered class="bg-blue-grey-9 sticky-drawer" v-if="selectedJob">
          <q-card-section class="bg-blue-grey-8 row items-center justify-between">
            <div class="text-subtitle2 text-white">Execution Trace Inspector</div>
            <q-btn flat round dense icon="close" size="sm" @click="selectedJob = null" />
          </q-card-section>

          <q-card-section class="q-pa-md">
            <!-- Execution Metrics Summary -->
            <div class="q-mb-md">
              <div class="text-caption text-grey-4">Selected Job ID</div>
              <div class="text-h6 text-cyan-3 text-weight-bold">{{ selectedJob.workflowId }}</div>
            </div>

            <!-- Steps Progress Component -->
            <div class="q-mb-md">
              <div class="text-overline text-cyan-4 q-mb-xs">Staged Remediation Sequence</div>
              <q-timeline dark color="cyan-3">
                <q-timeline-entry 
                  v-for="(stp, idx) in selectedJob.steps" 
                  :key="stp.stepId"
                  :title="stp.action" 
                  :subtitle="`Step ${idx + 1}`" 
                  :color="stp.status === 'SUCCESS' ? 'green-4' : 'amber-4'"
                >
                  Status resolution boundary set to canonical {{ stp.status }} flag.
                </q-timeline-entry>
              </q-timeline>
            </div>

            <!-- Operator Takeover Attribution Block -->
            <q-card flat class="bg-blue-grey-10 q-pa-sm q-mb-md border-warning-glow" v-if="selectedJob.humanOverrideContext?.hasOperatorTakenOver">
              <div class="row items-center text-amber-4 text-weight-bold q-mb-xs">
                <q-icon name="warning" class="q-mr-xs" />
                Human Override Priority Active
              </div>
              <div class="text-caption text-grey-4">Overriding Operator: <span class="text-white">{{ selectedJob.humanOverrideContext.overridingOperatorSignature }}</span></div>
              <div class="text-caption text-grey-4">Takeover Reason: <span class="text-white">{{ selectedJob.humanOverrideContext.takeoverReasonString }}</span></div>
            </q-card>

            <q-separator dark class="q-my-md" />

            <!-- Refinement #2: Active Human Override Controls Panel -->
            <div class="text-overline text-amber-4 q-mb-sm">SOC Emergency Overrides</div>
            <div class="row q-col-gutter-sm">
              <div class="col-12">
                <q-input dark dense standout v-model="overrideOperatorSig" placeholder="Operator cryptographic signature..." />
              </div>
              <div class="col-12">
                <q-input dark dense standout v-model="overrideReasonStr" placeholder="Mandatory intervention justification..." />
              </div>
              <div class="col-6">
                <q-btn 
                  color="red-10" 
                  text-color="red-2" 
                  class="full-width text-weight-bold" 
                  label="Force Cancel" 
                  icon="cancel" 
                  size="sm" 
                  @click="triggerHumanOverride('FORCE_CANCEL')" 
                />
              </div>
              <div class="col-6">
                <q-btn 
                  color="amber-10" 
                  text-color="amber-2" 
                  class="full-width text-weight-bold" 
                  label="Manual Rollback" 
                  icon="restore" 
                  size="sm" 
                  @click="triggerHumanOverride('FORCE_ROLLBACK')" 
                />
              </div>
              <div class="col-12">
                <q-btn 
                  color="cyan-10" 
                  text-color="cyan-2" 
                  class="full-width text-weight-bold q-mt-xs" 
                  label="Approve Gate Execution" 
                  icon="check_circle" 
                  size="sm" 
                  v-if="selectedJob.state === 'PENDING_APPROVAL'"
                  @click="triggerHumanOverride('APPROVE_GATE')" 
                />
              </div>
            </div>
          </q-card-section>
        </q-card>

        <!-- Placeholder if no row is actively selected -->
        <q-card flat bordered class="bg-blue-grey-9 q-pa-lg text-center" v-else>
          <q-icon name="touch_app" size="xl" class="text-grey-6 q-mb-sm" />
          <div class="text-grey-4">Select an active orchestration job from the left view pane to review its dependency graph and access inline manual overrides.</div>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import { createOrchestrationJob, applyHumanOverrideCommand } from '../../services/workflows/WorkflowOrchestrator'

// Initializing mock trace simulation buffers representing core multi-state workflows
const initialJobs = [
  createOrchestrationJob({ workflowId: 'WF-7701-A', tenantScope: 'TENANT_ROOT_ALPHA', requiresSignOff: true }),
  createOrchestrationJob({ workflowId: 'WF-7702-B', tenantScope: 'TENANT_ROOT_BETA', requiresSignOff: false, steps: [{ stepId: 'STP-1', action: 'QUARANTINE_DEVICE_TRIGGER', status: 'SUCCESS' }] }),
  createOrchestrationJob({ workflowId: 'WF-7703-C', tenantScope: 'GLOBAL_ADMIN_PARTITION', requiresSignOff: false })
]

// Overwrite states deterministically to represent dynamic live view iterations
initialJobs[1].state = 'EXECUTING'
initialJobs[2].state = 'SUCCEEDED'

const simulatedWorkflows = ref([...initialJobs])
const selectedJob = ref(null)

const overrideOperatorSig = ref('op_signature_root_admin')
const overrideReasonStr = ref('Preventing active cascading rollout locks.')

const selectWorkflow = (job) => {
  selectedJob.value = job
}

const triggerHumanOverride = (actionCmd) => {
  if (!selectedJob.value) return
  
  try {
    const updated = applyHumanOverrideCommand(
      selectedJob.value, 
      overrideOperatorSig.value, 
      actionCmd, 
      overrideReasonStr.value
    )
    
    // Sync array bounds cleanly
    const idx = simulatedWorkflows.value.findIndex(w => w.workflowId === updated.workflowId)
    if (idx !== -1) {
      simulatedWorkflows.value[idx] = { ...updated }
      selectedJob.value = { ...updated }
    }
  } catch (err) {
    // Console error out silently to protect desktop rendering state integrity
    console.error('[HUMAN_OVERRIDE_ERROR]', err.message)
  }
}

// Visual dynamic styling helpers resolution
const getWorkflowIcon = (state) => {
  switch (state) {
    case 'SUCCEEDED': return 'check_circle'
    case 'FAILED': return 'error'
    case 'CANCELLED': return 'cancel'
    case 'ROLLING_BACK': return 'restore'
    case 'PENDING_APPROVAL': return 'verified_user'
    default: return 'cached'
  }
}

const getWorkflowColor = (state) => {
  switch (state) {
    case 'SUCCEEDED': return 'text-green-4'
    case 'FAILED': return 'text-red-4'
    case 'CANCELLED': return 'text-grey-5'
    case 'ROLLING_BACK': return 'text-amber-4'
    case 'PENDING_APPROVAL': return 'text-cyan-3'
    default: return 'text-cyan-4'
  }
}

const getStateBg = (state) => {
  switch (state) {
    case 'SUCCEEDED': return 'green-10'
    case 'FAILED': return 'red-10'
    case 'CANCELLED': return 'grey-9'
    case 'ROLLING_BACK': return 'amber-10'
    case 'PENDING_APPROVAL': return 'cyan-10'
    default: return 'blue-grey-8'
  }
}

const getStateTextColor = (state) => {
  switch (state) {
    case 'SUCCEEDED': return 'green-2'
    case 'FAILED': return 'red-2'
    case 'CANCELLED': return 'grey-3'
    case 'ROLLING_BACK': return 'amber-2'
    case 'PENDING_APPROVAL': return 'cyan-2'
    default: return 'white'
  }
}
</script>

<style scoped>
.sticky-drawer {
  position: sticky;
  top: 16px;
}
.border-warning-glow {
  border-left: 3px solid #ffca28;
}
</style>
