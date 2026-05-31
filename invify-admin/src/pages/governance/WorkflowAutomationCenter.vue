<!-- invify-admin/src/pages/governance/WorkflowAutomationCenter.vue -->
<template>
  <q-page class="q-pa-md bg-main text-main column full-height no-wrap">
    <!-- Header -->
    <div class="row items-center justify-between q-mb-md no-wrap border-bottom q-pb-sm">
      <div class="row items-center op-gap-12 no-wrap">
        <div>
          <div class="text-operator-title text-indigo-3 text-uppercase tracking-wider"><q-icon name="account_tree" class="q-mr-xs"/>Enterprise Orchestration</div>
          <div class="text-h4 text-main text-weight-bolder" style="line-height: 1.1;">
            Workflow Automation Center
          </div>
        </div>
      </div>

      <div class="row items-center op-gap-8 no-wrap">
        <q-btn outline size="sm" color="indigo-4" icon="library_books" label="Template Library" class="text-weight-bold" @click="showTemplates = true" />
        <q-btn unelevated size="sm" color="indigo-5" text-color="white" icon="add" label="Create Workflow" class="text-weight-bold" @click="createWorkflow" />
      </div>
    </div>

    <!-- Analytics Dashboard -->
    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-12 col-md-3">
        <q-card flat class="bg-panel border-muted rounded-borders q-pa-md h-full">
          <div class="text-subtitle2 text-muted font-mono q-mb-xs">Workflow Health Score</div>
          <div class="text-h3 text-metric-mono" :class="metrics.healthScore >= 90 ? 'text-green-4' : 'text-amber-4'">
            {{ metrics.healthScore }}%
          </div>
        </q-card>
      </div>
      <div class="col-12 col-md-3">
        <q-card flat class="bg-panel border-muted rounded-borders q-pa-md h-full">
          <div class="text-subtitle2 text-muted font-mono q-mb-xs">Automation Success Rate</div>
          <div class="text-h3 text-metric-mono text-cyan-4">{{ metrics.successRate }}%</div>
        </q-card>
      </div>
      <div class="col-12 col-md-3">
        <q-card flat class="bg-panel border-muted rounded-borders q-pa-md h-full text-center">
          <div class="text-subtitle2 text-muted font-mono q-mb-xs">Active Workflows</div>
          <div class="text-h4 text-metric-mono text-main">{{ activeWorkflowCount }}</div>
        </q-card>
      </div>
      <div class="col-12 col-md-3">
        <q-card flat class="bg-panel border-muted rounded-borders q-pa-md h-full text-center cursor-pointer hover-bg" @click="filter = 'Failed'">
          <div class="text-subtitle2 text-muted font-mono q-mb-xs">Execution Failures</div>
          <div class="text-h4 text-metric-mono" :class="metrics.totalFailures > 0 ? 'text-red-4' : 'text-main'">{{ metrics.totalFailures }}</div>
        </q-card>
      </div>
    </div>

    <!-- Main Grid Workspace -->
    <div class="enterprise-panel bg-panel col column no-wrap">
      <!-- Toolbar -->
      <div class="enterprise-subpanel border-bottom row items-center justify-between q-px-md">
        <q-tabs v-model="filter" dense class="text-grey-5 font-mono text-subtitle2" active-color="indigo-4" indicator-color="indigo-4" align="left" no-caps>
          <q-tab name="All" label="All Workflows" />
          <q-tab name="Active" label="Active" />
          <q-tab name="Paused" label="Paused" />
          <q-tab name="Draft" label="Drafts" />
        </q-tabs>
        <div class="row items-center op-gap-8">
          <q-input dense outlined bg-color="dark" v-model="search" placeholder="Search Workflows..." class="text-caption" style="width: 250px;">
            <template v-slot:append><q-icon name="search" color="grey-5" /></template>
          </q-input>
        </div>
      </div>

      <!-- Grid -->
      <div class="col scroll-y">
        <q-table
          flat
          square
          dark
          class="bg-transparent text-main font-mono text-caption wf-table"
          :rows="filteredWorkflows"
          :columns="columns"
          row-key="workflowId"
          :pagination="{ rowsPerPage: 50 }"
          hide-bottom
          @row-click="onRowClick"
        >
          <!-- Custom Status formatting -->
          <template v-slot:body-cell-state="props">
            <q-td :props="props">
              <q-badge :color="getStateColor(props.value)">{{ props.value }}</q-badge>
            </q-td>
          </template>
        </q-table>
      </div>
    </div>

    <!-- Drawer for Workflow Builder/Viewer -->
    <q-drawer v-model="drawerOpen" side="right" overlay bordered class="bg-panel border-left drawer-shadow" :width="650">
      <div class="column full-height no-wrap" v-if="selectedWorkflow">
        <div class="q-pa-md border-bottom bg-subpanel row items-center justify-between">
          <div class="row items-center op-gap-8">
            <q-icon name="account_tree" color="indigo-4" size="sm" />
            <div class="text-h6 font-mono text-main">{{ selectedWorkflow.name }}</div>
          </div>
          <div class="row items-center op-gap-8">
            <q-btn flat dense icon="play_arrow" color="green-4" v-if="selectedWorkflow.state === 'Paused'" @click="toggleState('Active')" />
            <q-btn flat dense icon="pause" color="amber-4" v-if="selectedWorkflow.state === 'Active'" @click="toggleState('Paused')" />
            <q-btn flat dense round icon="close" color="grey-5" v-close-popup />
          </div>
        </div>

        <!-- Workflow Builder Tabs -->
        <q-tabs v-model="tab" dense class="text-muted border-bottom bg-dark" active-color="indigo-4" indicator-color="indigo-4" align="left">
          <q-tab name="overview" label="Overview" />
          <q-tab name="triggers" label="Triggers" />
          <q-tab name="conditions" label="Conditions" />
          <q-tab name="actions" label="Actions" />
          <q-tab name="integration" label="Integrations" />
          <q-tab name="history" label="Execution History" />
        </q-tabs>

        <q-scroll-area class="col q-pa-md">
          <q-tab-panels v-model="tab" animated class="bg-transparent">
            
            <q-tab-panel name="overview" class="q-pa-none">
              <q-card flat class="bg-dark border-muted rounded-borders q-pa-md q-mb-md">
                <div class="text-caption text-muted font-mono q-mb-sm">Description</div>
                <div class="text-body2 text-main q-mb-lg">{{ selectedWorkflow.description || 'No description provided.' }}</div>
                
                <div class="row justify-between q-mb-sm">
                  <div class="text-caption text-muted font-mono">Workflow ID</div>
                  <div class="text-caption text-indigo-4 font-mono">{{ selectedWorkflow.workflowId }}</div>
                </div>
                <div class="row justify-between q-mb-sm">
                  <div class="text-caption text-muted font-mono">State</div>
                  <q-badge :color="getStateColor(selectedWorkflow.state)">{{ selectedWorkflow.state }}</q-badge>
                </div>
                <div class="row justify-between q-mb-sm">
                  <div class="text-caption text-muted font-mono">Created By</div>
                  <div class="text-caption text-main font-mono">{{ selectedWorkflow.createdBy }}</div>
                </div>
                <div class="row justify-between q-mb-sm">
                  <div class="text-caption text-muted font-mono">Executions</div>
                  <div class="text-caption text-main font-mono">{{ selectedWorkflow.executionCount }}</div>
                </div>
              </q-card>
            </q-tab-panel>

            <q-tab-panel name="triggers" class="q-pa-none">
              <div class="text-subtitle2 text-main font-mono q-mb-sm">Listening Events</div>
              <q-card flat class="bg-subpanel border-muted rounded-borders q-pa-md font-mono">
                <div class="row items-center op-gap-8">
                  <q-icon name="bolt" color="amber-4" size="md" />
                  <div class="text-h6 text-main">{{ selectedWorkflow.triggerType }}</div>
                </div>
              </q-card>
            </q-tab-panel>

            <q-tab-panel name="conditions" class="q-pa-none">
              <div class="text-subtitle2 text-main font-mono q-mb-sm">Execution Criteria</div>
              <div class="column op-gap-8">
                <q-card v-for="cond in selectedWorkflow.conditions" :key="cond" flat class="bg-dark border-muted rounded-borders q-pa-sm font-mono text-cyan-3">
                  <q-icon name="filter_alt" class="q-mr-xs"/> {{ cond }}
                </q-card>
                <div v-if="!selectedWorkflow.conditions.length" class="text-muted font-mono text-caption">No conditions set. Runs on all triggers.</div>
              </div>
            </q-tab-panel>

            <q-tab-panel name="actions" class="q-pa-none">
              <div class="text-subtitle2 text-main font-mono q-mb-sm">Automated Pipeline</div>
              <q-timeline color="indigo-4" dark>
                <q-timeline-entry v-for="(act, idx) in selectedWorkflow.actions" :key="idx" :title="`Step ${idx+1}`" :subtitle="act" icon="play_circle_filled" />
              </q-timeline>
              <div v-if="!selectedWorkflow.actions.length" class="text-muted font-mono text-caption">No actions defined.</div>
            </q-tab-panel>

            <q-tab-panel name="integration" class="q-pa-none">
              <div class="text-subtitle2 text-main font-mono q-mb-sm">System Hooks</div>
              <div class="column op-gap-12">
                <q-checkbox dark v-model="mockIntegration" label="Require Maker/Checker Approval" color="indigo-4" />
                <q-checkbox dark v-model="mockIntegration" label="Generate SLA Tracking Record" color="purple-4" />
                <q-checkbox dark v-model="mockIntegration" label="Generate Immutable Audit Event" color="cyan-4" />
                <q-checkbox dark v-model="mockIntegration" label="Dispatch Global Notification" color="amber-4" />
              </div>
            </q-tab-panel>

            <q-tab-panel name="history" class="q-pa-none">
              <div class="text-subtitle2 text-main font-mono q-mb-sm">Execution Log</div>
              <q-list dark separator class="border-muted rounded-borders bg-dark font-mono text-caption">
                <q-item v-for="exec in executionHistory" :key="exec.executionId">
                  <q-item-section>
                    <q-item-label class="text-main">{{ exec.executionId }}</q-item-label>
                    <q-item-label caption class="text-muted">{{ exec.triggeredBy }}</q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-badge :color="exec.executionStatus === 'Success' ? 'green-5' : 'red-5'">{{ exec.executionStatus }}</q-badge>
                    <div class="text-muted" style="font-size: 10px;">{{ new Date(exec.executedAt).toLocaleString() }}</div>
                  </q-item-section>
                </q-item>
                <q-item v-if="!executionHistory.length"><q-item-section class="text-muted">No execution history found for this workflow.</q-item-section></q-item>
              </q-list>
            </q-tab-panel>

          </q-tab-panels>
        </q-scroll-area>
      </div>
    </q-drawer>

    <!-- Template Library Dialog -->
    <q-dialog v-model="showTemplates">
      <q-card class="bg-panel border-muted" style="width: 700px; max-width: 90vw;">
        <div class="row justify-between items-center q-pa-md border-bottom bg-subpanel">
          <div class="text-h6 font-mono text-main">Workflow Template Library</div>
          <q-btn dense flat icon="close" color="grey-5" v-close-popup />
        </div>
        <div class="q-pa-md bg-dark">
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6" v-for="tpl in templates" :key="tpl.id">
              <q-card flat class="bg-subpanel border-muted rounded-borders q-pa-sm cursor-pointer hover-bg" @click="useTemplate(tpl)">
                <div class="text-subtitle2 text-main font-mono">{{ tpl.name }}</div>
                <div class="text-caption text-muted font-mono q-mt-xs">Trigger: {{ tpl.trigger }}</div>
              </q-card>
            </div>
          </div>
        </div>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup>
import { ref, computed } from 'vue'
import { WorkflowAutomationEngine } from 'src/services/WorkflowAutomationEngine'
import { WorkflowExecutionService } from 'src/services/WorkflowExecutionService'
import { WorkflowTemplateLibrary } from 'src/services/WorkflowTemplateLibrary'

const filter = ref('All')
const search = ref('')
const drawerOpen = ref(false)
const selectedWorkflow = ref(null)
const tab = ref('overview')
const showTemplates = ref(false)
const mockIntegration = ref(true)

const workflows = ref(WorkflowAutomationEngine.getWorkflows())
const metrics = ref(WorkflowExecutionService.getMetrics())
const templates = WorkflowTemplateLibrary.getTemplates()

const activeWorkflowCount = computed(() => workflows.value.filter(w => w.state === 'Active').length)

const filteredWorkflows = computed(() => {
  let list = workflows.value
  if (filter.value !== 'All') {
    list = list.filter(w => w.state === filter.value)
  }
  if (search.value) {
    list = list.filter(w => 
      w.name.toLowerCase().includes(search.value.toLowerCase()) || 
      w.workflowId.toLowerCase().includes(search.value.toLowerCase())
    )
  }
  return list
})

const executionHistory = computed(() => {
  if (!selectedWorkflow.value) return []
  return WorkflowExecutionService.getHistory().filter(h => h.workflowId === selectedWorkflow.value.workflowId)
})

const onRowClick = (evt, row) => {
  selectedWorkflow.value = row
  drawerOpen.value = true
}

const toggleState = (newState) => {
  if (selectedWorkflow.value) {
    WorkflowAutomationEngine.toggleState(selectedWorkflow.value.workflowId, newState)
    // Refresh ref
    workflows.value = [...WorkflowAutomationEngine.getWorkflows()]
  }
}

const createWorkflow = () => {
  const newWf = WorkflowAutomationEngine.createWorkflow({
    name: 'New Custom Workflow',
    triggerType: 'System Event'
  })
  workflows.value = [...WorkflowAutomationEngine.getWorkflows()]
  selectedWorkflow.value = newWf
  drawerOpen.value = true
  tab.value = 'overview'
}

const useTemplate = (tpl) => {
  showTemplates.value = false
  const newWf = WorkflowAutomationEngine.createWorkflow({
    name: tpl.name,
    triggerType: tpl.trigger,
    actions: tpl.actions,
    description: `Created from template: ${tpl.name}`
  })
  workflows.value = [...WorkflowAutomationEngine.getWorkflows()]
  selectedWorkflow.value = newWf
  drawerOpen.value = true
  tab.value = 'overview'
}

const formatDate = (isoString) => {
  if (!isoString) return '-'
  const d = new Date(isoString)
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`
}

const getStateColor = (state) => {
  switch (state) {
    case 'Active': return 'green-5'
    case 'Draft': return 'grey-5'
    case 'Paused': return 'amber-5'
    case 'Disabled': return 'red-5'
    case 'Testing': return 'cyan-5'
    default: return 'grey-5'
  }
}

const columns = [
  { name: 'workflowId', label: 'ID', field: 'workflowId', align: 'left', sortable: true },
  { name: 'name', label: 'Workflow Name', field: 'name', align: 'left', sortable: true },
  { name: 'triggerType', label: 'Trigger', field: 'triggerType', align: 'left' },
  { name: 'state', label: 'State', field: 'state', align: 'center', sortable: true },
  { name: 'executionCount', label: 'Executions', field: 'executionCount', align: 'right', sortable: true },
  { name: 'lastExecutedAt', label: 'Last Run', field: 'lastExecutedAt', align: 'right', sortable: true, format: val => formatDate(val) }
]
</script>

<style scoped>
.bg-panel { background: var(--sidebar-panel-bg); }
.bg-subpanel { background: rgba(0, 0, 0, 0.2); }
.bg-dark { background: rgba(0, 0, 0, 0.4); }
.border-bottom { border-bottom: 1px solid var(--enterprise-border); }
.border-left { border-left: 1px solid var(--enterprise-border); }
.border-muted { border: 1px solid var(--enterprise-border); }
.text-main { color: var(--enterprise-text-main); }
.text-muted { color: var(--enterprise-text-muted); }
.drawer-shadow { box-shadow: -4px 0 24px rgba(0,0,0,0.5); }
.op-gap-8 { gap: 8px; }
.op-gap-12 { gap: 12px; }
.hover-bg:hover { background: rgba(255,255,255,0.05); }

.wf-table :deep(th) {
  font-weight: bold;
  color: var(--enterprise-text-muted);
  border-bottom: 1px solid var(--enterprise-border);
}
.wf-table :deep(td) {
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}
</style>
