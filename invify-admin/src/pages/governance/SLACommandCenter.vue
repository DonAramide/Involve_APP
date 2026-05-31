<!-- invify-admin/src/pages/governance/SLACommandCenter.vue -->
<template>
  <q-page class="q-pa-md bg-main text-main column full-height no-wrap">
    <!-- Header -->
    <div class="row items-center justify-between q-mb-md no-wrap border-bottom q-pb-sm">
      <div class="row items-center op-gap-12 no-wrap">
        <div>
          <div class="text-operator-title text-cyan-3 text-uppercase tracking-wider"><q-icon name="schedule" class="q-mr-xs"/>Service Governance Layer</div>
          <div class="text-h4 text-main text-weight-bolder" style="line-height: 1.1;">
            SLA Command Center
          </div>
        </div>
      </div>

      <div class="row items-center op-gap-8 no-wrap">
        <q-btn outline size="sm" color="cyan-4" icon="insights" label="SLA Analytics" class="text-weight-bold" />
        <q-btn outline size="sm" color="purple-4" icon="settings" label="Policy Registry" class="text-weight-bold text-white" />
      </div>
    </div>

    <!-- Analytics Dashboard -->
    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-12 col-md-3">
        <q-card flat class="bg-panel border-muted rounded-borders q-pa-md h-full">
          <div class="text-subtitle2 text-muted font-mono q-mb-xs">SLA Compliance</div>
          <div class="text-h3 text-metric-mono" :class="metrics.compliancePercent >= 95 ? 'text-green-4' : 'text-amber-4'">
            {{ metrics.compliancePercent }}%
          </div>
        </q-card>
      </div>
      <div class="col-12 col-md-3">
        <q-card flat class="bg-panel border-muted rounded-borders q-pa-md h-full">
          <div class="text-subtitle2 text-muted font-mono q-mb-xs">Average Resolution Time</div>
          <div class="text-h3 text-metric-mono text-cyan-4">{{ metrics.avgResolutionMinutes }}m</div>
        </q-card>
      </div>
      <div class="col-12 col-md-2">
        <q-card flat class="bg-panel border-muted rounded-borders q-pa-md h-full text-center">
          <div class="text-subtitle2 text-muted font-mono q-mb-xs">Open Cases</div>
          <div class="text-h4 text-metric-mono text-main">{{ metrics.totalOpen }}</div>
        </q-card>
      </div>
      <div class="col-12 col-md-2">
        <q-card flat class="bg-panel border-muted rounded-borders q-pa-md h-full text-center cursor-pointer hover-bg" @click="filter = 'Breached'">
          <div class="text-subtitle2 text-muted font-mono q-mb-xs">Breached</div>
          <div class="text-h4 text-metric-mono" :class="metrics.totalBreached > 0 ? 'text-red-4' : 'text-main'">{{ metrics.totalBreached }}</div>
        </q-card>
      </div>
      <div class="col-12 col-md-2">
        <q-card flat class="bg-panel border-muted rounded-borders q-pa-md h-full text-center cursor-pointer hover-bg" @click="filter = 'Escalated'">
          <div class="text-subtitle2 text-muted font-mono q-mb-xs">Escalated</div>
          <div class="text-h4 text-metric-mono text-amber-4">{{ metrics.totalEscalated }}</div>
        </q-card>
      </div>
    </div>

    <!-- Main Grid Workspace -->
    <div class="enterprise-panel bg-panel col column no-wrap">
      <!-- Toolbar -->
      <div class="enterprise-subpanel border-bottom row items-center justify-between q-px-md">
        <q-tabs v-model="filter" dense class="text-grey-5 font-mono text-subtitle2" active-color="cyan-4" indicator-color="cyan-4" align="left" no-caps>
          <q-tab name="All" label="All Active SLAs" />
          <q-tab name="Breached" label="Breached" class="text-red-4" />
          <q-tab name="At Risk" label="At Risk" class="text-amber-4" />
          <q-tab name="Escalated" label="Escalated" />
        </q-tabs>
        <div class="row items-center op-gap-8">
          <q-input dense outlined bg-color="dark" v-model="search" placeholder="Search SLA or Entity ID..." class="text-caption" style="width: 250px;">
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
          class="bg-transparent text-main font-mono text-caption sla-table"
          :rows="filteredSLAs"
          :columns="columns"
          row-key="slaId"
          :pagination="{ rowsPerPage: 50 }"
          hide-bottom
          @row-click="onRowClick"
        >
          <!-- Custom Status formatting -->
          <template v-slot:body-cell-status="props">
            <q-td :props="props">
              <q-badge :color="getStatusColor(props.value)">{{ props.value }}</q-badge>
            </q-td>
          </template>

          <template v-slot:body-cell-priority="props">
            <q-td :props="props">
              <span :class="getPriorityColor(props.value)">{{ props.value }}</span>
            </q-td>
          </template>
        </q-table>
      </div>
    </div>

    <!-- Drawer for SLA Investigation -->
    <q-drawer v-model="drawerOpen" side="right" overlay bordered class="bg-panel border-left drawer-shadow" :width="500">
      <div class="column full-height no-wrap" v-if="selectedSLA">
        <div class="q-pa-md border-bottom bg-subpanel row items-center justify-between">
          <div class="row items-center op-gap-8">
            <q-icon name="timer" color="cyan-4" size="sm" />
            <div class="text-h6 font-mono text-main">SLA Investigation</div>
          </div>
          <q-btn flat dense round icon="close" color="grey-5" v-close-popup />
        </div>

        <q-tabs v-model="tab" dense class="text-muted border-bottom bg-dark" active-color="cyan-4" indicator-color="cyan-4" align="left">
          <q-tab name="overview" label="Overview" />
          <q-tab name="escalation" label="Escalation Path" />
          <q-tab name="audit" label="Audit Trail" />
        </q-tabs>

        <q-scroll-area class="col q-pa-md">
          <q-tab-panels v-model="tab" animated class="bg-transparent">
            
            <q-tab-panel name="overview" class="q-pa-none">
              <q-card flat class="bg-dark border-muted rounded-borders q-pa-md q-mb-md">
                <div class="row justify-between q-mb-sm">
                  <div class="text-caption text-muted font-mono">SLA ID</div>
                  <div class="text-caption text-cyan-4 font-mono">{{ selectedSLA.slaId }}</div>
                </div>
                <div class="row justify-between q-mb-sm">
                  <div class="text-caption text-muted font-mono">Entity Type</div>
                  <div class="text-caption text-main font-mono">{{ selectedSLA.entityType }}</div>
                </div>
                <div class="row justify-between q-mb-sm">
                  <div class="text-caption text-muted font-mono">Entity ID</div>
                  <div class="text-caption text-main font-mono">{{ selectedSLA.entityId }}</div>
                </div>
                <div class="row justify-between q-mb-sm">
                  <div class="text-caption text-muted font-mono">Module</div>
                  <div class="text-caption text-main font-mono">{{ selectedSLA.module }}</div>
                </div>
                <div class="row justify-between q-mb-sm">
                  <div class="text-caption text-muted font-mono">Status</div>
                  <q-badge :color="getStatusColor(selectedSLA.status)">{{ selectedSLA.status }}</q-badge>
                </div>
                <q-btn outline color="cyan-4" label="Open Entity Workspace" class="full-width q-mt-sm font-mono text-caption" />
              </q-card>

              <div class="text-subtitle2 text-main font-mono q-mb-sm">Ownership</div>
              <q-card flat class="bg-subpanel border-muted rounded-borders q-pa-sm q-mb-md font-mono text-caption">
                <div class="row items-center op-gap-8">
                  <q-icon name="person" color="purple-4" />
                  <div>
                    <div class="text-main">{{ selectedSLA.assignedTo }}</div>
                    <div class="text-muted">{{ selectedSLA.assignedRole }}</div>
                  </div>
                </div>
              </q-card>
            </q-tab-panel>

            <q-tab-panel name="escalation" class="q-pa-none">
              <div class="text-caption text-muted q-mb-md font-mono">Escalation Level: <span class="text-amber-4 text-weight-bold">{{ selectedSLA.escalationLevel }}</span></div>
              <q-timeline color="cyan-4" dark>
                <q-timeline-entry title="SLA Created" :subtitle="formatDate(selectedSLA.createdAt)" />
                <q-timeline-entry title="Level 1 Warning Issued" subtitle="System Automator" color="amber-4" v-if="selectedSLA.escalationLevel >= 1" />
                <q-timeline-entry title="SLA Breached" :subtitle="formatDate(selectedSLA.breachedAt)" color="red-5" v-if="selectedSLA.breachedAt" />
              </q-timeline>
              <q-btn flat class="bg-amber-10 text-amber-4 font-mono full-width q-mt-md" label="Trigger Manual Escalation" @click="escalate" />
            </q-tab-panel>

            <q-tab-panel name="audit" class="q-pa-none">
              <div class="text-caption text-muted font-mono">Immutable Audit Trail loading...</div>
            </q-tab-panel>

          </q-tab-panels>
        </q-scroll-area>
      </div>
    </q-drawer>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { SLAEngine } from 'src/services/SLAEngine'
import { SLAAnalyticsService } from 'src/services/SLAAnalyticsService'
import { SLAEscalationService } from 'src/services/SLAEscalationService'

const filter = ref('All')
const search = ref('')
const drawerOpen = ref(false)
const selectedSLA = ref(null)
const tab = ref('overview')

const metrics = ref(SLAAnalyticsService.getComplianceMetrics())
const slas = ref([])

const handleUpdate = (data) => {
  slas.value = [...data]
  metrics.value = SLAAnalyticsService.getComplianceMetrics()
}

onMounted(() => {
  SLAEngine.subscribe(handleUpdate)
})

onUnmounted(() => {
  SLAEngine.unsubscribe(handleUpdate)
})

const filteredSLAs = computed(() => {
  let list = slas.value
  if (filter.value !== 'All') {
    if (filter.value === 'Escalated') {
      list = list.filter(s => s.escalationLevel > 0)
    } else {
      list = list.filter(s => s.status === filter.value)
    }
  }
  if (search.value) {
    list = list.filter(s => 
      s.slaId.toLowerCase().includes(search.value.toLowerCase()) || 
      s.entityId.toLowerCase().includes(search.value.toLowerCase())
    )
  }
  return list
})

const onRowClick = (evt, row) => {
  selectedSLA.value = row
  drawerOpen.value = true
}

const escalate = () => {
  if (selectedSLA.value) {
    SLAEscalationService.escalate(selectedSLA.value.slaId)
  }
}

const formatDate = (isoString) => {
  if (!isoString) return '-'
  const d = new Date(isoString)
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`
}

const getStatusColor = (status) => {
  switch (status) {
    case 'Healthy': return 'green-5'
    case 'At Risk': return 'amber-5'
    case 'Approaching Deadline': return 'orange-5'
    case 'Breached': return 'red-5'
    case 'Resolved': return 'grey-6'
    default: return 'grey-5'
  }
}

const getPriorityColor = (priority) => {
  switch (priority) {
    case 'Critical': return 'text-red-4 font-weight-bold'
    case 'High': return 'text-orange-4'
    case 'Medium': return 'text-amber-4'
    case 'Low': return 'text-cyan-4'
    default: return 'text-grey-5'
  }
}

const columns = [
  { name: 'slaId', label: 'SLA ID', field: 'slaId', align: 'left', sortable: true },
  { name: 'entityType', label: 'Entity Type', field: 'entityType', align: 'left', sortable: true },
  { name: 'entityId', label: 'Entity ID', field: 'entityId', align: 'left' },
  { name: 'priority', label: 'Priority', field: 'priority', align: 'left', sortable: true },
  { name: 'assignedTo', label: 'Assigned To', field: 'assignedTo', align: 'left' },
  { name: 'dueAt', label: 'Due Date', field: 'dueAt', align: 'left', sortable: true, format: val => formatDate(val) },
  { name: 'status', label: 'Status', field: 'status', align: 'center', sortable: true },
  { name: 'riskScore', label: 'Risk', field: 'riskScore', align: 'right', sortable: true }
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

.sla-table :deep(th) {
  font-weight: bold;
  color: var(--enterprise-text-muted);
  border-bottom: 1px solid var(--enterprise-border);
}
.sla-table :deep(td) {
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}
</style>
