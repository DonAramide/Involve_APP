<!-- invify-admin/src/pages/governance/GovernanceApprovalCenter.vue -->
<template>
  <q-page class="q-pa-md bg-page">
    <!-- Header -->
    <div class="row items-center justify-between q-mb-lg border-bottom q-pb-md">
      <div>
        <div class="text-h5 font-mono text-main row items-center op-gap-8">
          <q-icon name="fact_check" color="purple-4" />
          Governance Approval Engine
        </div>
        <div class="text-caption text-muted q-mt-xs">
          Centralized Maker-Checker queue for all high-risk operational actions.
        </div>
      </div>
      <div class="row items-center op-gap-12">
        <q-btn unelevated color="purple-5" text-color="white" icon="add" label="New Request" class="font-mono text-caption" @click="createMockRequest" />
      </div>
    </div>

    <!-- Stats Row -->
    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-12 col-md-3" v-for="stat in stats" :key="stat.label">
        <q-card flat class="bg-panel border-muted rounded-borders q-pa-md">
          <div class="text-caption text-muted font-mono q-mb-xs">{{ stat.label }}</div>
          <div class="text-h4 text-weight-bold" :class="stat.colorClass">{{ stat.value }}</div>
        </q-card>
      </div>
    </div>

    <!-- Data Grid -->
    <q-card flat class="bg-panel border-muted rounded-borders">
      <q-table
        :rows="approvals"
        :columns="columns"
        row-key="approvalId"
        flat
        dark
        class="bg-transparent text-main font-mono text-caption"
        :pagination="{ rowsPerPage: 10 }"
        @row-click="onRowClick"
      >
        <template v-slot:body-cell-status="props">
          <q-td :props="props">
            <q-badge :color="getStatusColor(props.value)" text-color="white" class="font-mono">{{ props.value }}</q-badge>
          </q-td>
        </template>
        
        <template v-slot:body-cell-riskScore="props">
          <q-td :props="props">
            <div class="row items-center op-gap-4">
              <span :class="getRiskColor(props.value)">{{ props.value }}</span>
              <q-linear-progress :value="props.value / 100" :color="getRiskColorClass(props.value)" class="col" style="max-width: 40px;" />
            </div>
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- Investigation Drawer -->
    <q-drawer v-model="drawerOpen" side="right" overlay bordered class="bg-panel border-left drawer-shadow" :width="600">
      <div class="column full-height no-wrap" v-if="selectedRequest">
        <!-- Drawer Header -->
        <div class="q-pa-md border-bottom bg-subpanel row items-center justify-between">
          <div>
            <div class="text-h6 font-mono text-main">{{ selectedRequest.approvalId }}</div>
            <div class="text-caption text-muted">{{ selectedRequest.approvalType }}</div>
          </div>
          <q-btn flat dense round icon="close" color="grey-5" @click="drawerOpen = false" />
        </div>

        <q-tabs v-model="activeTab" dense class="text-muted border-bottom" active-color="purple-4" indicator-color="purple-4" align="left">
          <q-tab name="overview" label="Overview" />
          <q-tab name="workflow" label="Workflow" />
          <q-tab name="approvals" label="Approvals" />
          <q-tab name="risk" label="Risk Assessment" />
          <q-tab name="audit" label="Audit Trail" />
          <q-tab name="timeline" label="Timeline" />
          <q-tab name="related" label="Related Records" />
          <q-tab name="docs" label="Documents" />
        </q-tabs>

        <q-scroll-area class="col q-pa-md">
          <q-tab-panels v-model="activeTab" animated class="bg-transparent">
            <!-- Overview -->
            <q-tab-panel name="overview" class="q-pa-none">
              <div class="column op-gap-12">
                <div class="row q-col-gutter-sm">
                  <div class="col-6">
                    <div class="text-caption text-muted">Entity Type</div>
                    <div class="text-main text-weight-bold font-mono">{{ selectedRequest.entityType }}</div>
                  </div>
                  <div class="col-6">
                    <div class="text-caption text-muted">Entity ID</div>
                    <div class="text-main text-weight-bold font-mono text-cyan-4 cursor-pointer">{{ selectedRequest.entityId }}</div>
                  </div>
                </div>
                <q-separator dark class="opacity-20" />
                <div>
                  <div class="text-caption text-muted q-mb-xs">Status</div>
                  <q-badge :color="getStatusColor(selectedRequest.status)" class="text-subtitle2 font-mono">{{ selectedRequest.status }}</q-badge>
                </div>
                <q-separator dark class="opacity-20" />
                <div class="row q-col-gutter-sm">
                  <div class="col-12">
                    <div class="text-caption text-muted">Maker Node</div>
                    <div class="text-main font-mono">{{ getOperatorLabel(selectedRequest.maker) }}</div>
                  </div>
                  <div class="col-12" v-if="selectedRequest.checker">
                    <div class="text-caption text-muted">Assigned Checker</div>
                    <div class="text-main font-mono text-amber-4">{{ getOperatorLabel(selectedRequest.checker) }}</div>
                  </div>
                  <div class="col-12" v-if="selectedRequest.approver">
                    <div class="text-caption text-muted">Authorized Approver</div>
                    <div class="text-main font-mono text-green-4">{{ getOperatorLabel(selectedRequest.approver) }}</div>
                  </div>
                </div>
              </div>
            </q-tab-panel>

            <!-- Workflow -->
            <q-tab-panel name="workflow" class="q-pa-none">
              <q-timeline color="purple-4" dark>
                <q-timeline-entry title="Request Created" :subtitle="selectedRequest.createdAt">
                  <div>Maker: <span class="text-cyan-4">{{ getOperatorLabel(selectedRequest.maker) }}</span></div>
                </q-timeline-entry>
                <q-timeline-entry 
                  title="Under Review" 
                  :subtitle="selectedRequest.checker ? 'Assigned' : 'Pending Checker'" 
                  :color="selectedRequest.checker ? 'amber-4' : 'grey-7'"
                >
                  <div v-if="selectedRequest.checker">Checker: <span class="text-amber-4">{{ getOperatorLabel(selectedRequest.checker) }}</span></div>
                </q-timeline-entry>
                <q-timeline-entry 
                  title="Final Approval" 
                  :subtitle="selectedRequest.approvedAt || 'Pending Approver'" 
                  :color="selectedRequest.status === 'Approved' ? 'green-4' : (selectedRequest.status === 'Rejected' ? 'red-4' : 'grey-7')"
                >
                  <div v-if="selectedRequest.approver">Approver: <span class="text-green-4">{{ getOperatorLabel(selectedRequest.approver) }}</span></div>
                </q-timeline-entry>
              </q-timeline>
            </q-tab-panel>

            <q-tab-panel name="risk" class="q-pa-none text-muted">
              Risk assessment payload will render here.
            </q-tab-panel>
            
            <!-- Audit Trail -->
            <q-tab-panel name="audit" class="q-pa-none">
              <div class="column op-gap-12">
                <div class="text-caption text-muted font-mono row items-center justify-between">
                  <span>Ledger Block Count: {{ selectedRequest.auditTrail?.length || 0 }}</span>
                  <span class="text-green-5"><q-icon name="lock" class="q-mr-xs" />IMMUTABLE LEDGER HASH</span>
                </div>
                
                <q-list dense class="q-gutter-y-sm">
                  <q-item
                    v-for="(event, idx) in selectedRequest.auditTrail"
                    :key="idx"
                    class="bg-subpanel rounded-borders q-pa-md border-muted column op-gap-8"
                  >
                    <!-- Header: Action & Timestamp -->
                    <div class="row items-center justify-between no-wrap">
                      <div class="row items-center op-gap-8">
                        <q-badge color="purple-9" text-color="white" class="font-mono text-weight-bold" style="font-size: 10px;">
                          {{ event.action }}
                        </q-badge>
                        <span class="text-main text-weight-bold text-metric-sm">{{ getOperatorLabel(event.actor) }}</span>
                      </div>
                      <span class="text-metric-mono text-muted" style="font-size: 10px;">
                        {{ new Date(event.timestamp).toLocaleString() }}
                      </span>
                    </div>

                    <!-- Client Telemetry Context -->
                    <div class="row items-center justify-between text-metric-mono text-muted q-mt-xs" style="font-size: 11px;">
                      <div class="row items-center op-gap-4">
                        <q-icon name="dns" size="xs" color="cyan-4" />
                        <span>IP: <strong class="text-white">{{ event.ipAddress }}</strong></span>
                      </div>
                      <div class="row items-center op-gap-4">
                        <q-icon name="place" size="xs" color="amber-5" />
                        <span>Location: <strong class="text-white">{{ event.location }}</strong></span>
                      </div>
                    </div>

                    <!-- Cryptographic Hash -->
                    <div class="bg-dark rounded-borders q-pa-xs text-metric-mono text-muted overflow-hidden ellipsis q-mt-xs" style="font-size: 9px; opacity: 0.8; letter-spacing: 0.5px;">
                      <span class="text-green-4 font-bold q-mr-xs">SHA256:</span>{{ event.integrityHash }}
                    </div>
                  </q-item>
                </q-list>
              </div>
            </q-tab-panel>
          </q-tab-panels>
        </q-scroll-area>

        <!-- Drawer Footer Actions -->
          <div class="q-pa-md border-top bg-dark row items-center justify-end op-gap-8" v-if="['Submitted', 'Under Review'].includes(selectedRequest.status)">
            <q-btn outline color="red-4" label="Reject" class="font-mono text-caption" v-if="canApproveCurrentDomain() && selectedRequest.maker !== currentUserEmail" @click="updateStatus('Rejected')" />
            <q-btn unelevated color="amber-5" text-color="black" label="Mark Reviewing" class="font-mono text-caption" v-if="selectedRequest.status === 'Submitted' && canApproveCurrentDomain() && selectedRequest.maker !== currentUserEmail" @click="updateStatus('Under Review')" />
            <q-btn unelevated color="orange-5" text-color="black" label="Escalate" class="font-mono text-caption" v-if="selectedRequest.status === 'Under Review' && canApproveCurrentDomain() && selectedRequest.maker !== currentUserEmail" @click="updateStatus('Escalated')" />
            <q-btn unelevated color="green-5" text-color="black" label="Approve Request" class="font-mono text-caption" v-if="selectedRequest.status === 'Under Review' && canApproveCurrentDomain() && selectedRequest.maker !== currentUserEmail" @click="updateStatus('Approved')" />
            
            <div v-if="selectedRequest.maker === currentUserEmail" class="text-caption text-amber-5 font-mono q-ml-md">
              <q-icon name="warning" class="q-mr-xs"/> Self-approval restricted by Governance Policy
            </div>
            <div v-else-if="!canApproveCurrentDomain()" class="text-caption text-red-4 font-mono q-ml-md">
              <q-icon name="lock" class="q-mr-xs"/> Missing Domain Approval Permission
            </div>
          </div>
      </div>
    </q-drawer>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ApprovalEngine } from 'src/services/ApprovalEngine'

const approvals = ref([])
const drawerOpen = ref(false)
const selectedRequest = ref(null)
const activeTab = ref('overview')

const currentUserEmail = ref(localStorage.getItem('operator_email') || 'current_user@invify.app')
const userPermissions = ref([])

onMounted(() => {
  try {
    const perms = localStorage.getItem('operator_permissions')
    if (perms) {
      userPermissions.value = JSON.parse(perms)
    }
  } catch (e) {
    console.error('Failed to parse permissions')
  }
})

const canApproveCurrentDomain = () => {
  if (!selectedRequest.value) return false
  const domain = selectedRequest.value.domain || 'OPERATIONS' // Default for legacy mock data
  const permMap = {
    'FINANCE': 'approve_finance',
    'OPERATIONS': 'approve_operations',
    'DEPLOYMENT': 'approve_deployment',
    'GOVERNANCE': 'approve_governance'
  }
  const requiredPerm = permMap[domain]
  return userPermissions.value.includes(requiredPerm) || userPermissions.value.includes('execute_actions')
}

const columns = [
  { name: 'approvalId', align: 'left', label: 'ID', field: 'approvalId', sortable: true },
  { name: 'approvalType', align: 'left', label: 'Type', field: 'approvalType', sortable: true },
  { name: 'entityId', align: 'left', label: 'Entity ID', field: 'entityId', sortable: true },
  { name: 'status', align: 'left', label: 'Status', field: 'status', sortable: true },
  { name: 'riskScore', align: 'left', label: 'Risk', field: 'riskScore', sortable: true },
  { name: 'createdAt', align: 'left', label: 'Created At', field: (row) => new Date(row.createdAt).toLocaleString(), sortable: true }
]

const stats = computed(() => [
  { label: 'Pending Approvals', value: ApprovalEngine.getPendingCount(), colorClass: 'text-amber-4' },
  { label: 'Total Volume (24h)', value: approvals.value.length, colorClass: 'text-cyan-4' },
  { label: 'Auto-Approved', value: 0, colorClass: 'text-green-4' },
  { label: 'Escalated', value: approvals.value.filter(a => a.status === 'Escalated').length, colorClass: 'text-red-4' }
])

const handleEngineUpdate = (data) => {
  const isSuperAdmin = userPermissions.value.includes('view_all') || 
                       userPermissions.value.includes('execute_actions') ||
                       localStorage.getItem('operator_role')?.toLowerCase() === 'super_admin';
  
  const filteredData = data.filter(item => {
    if (isSuperAdmin) return true
    
    const domain = item.domain || 'OPERATIONS'
    const viewMap = {
      'FINANCE': 'view_finance_queue',
      'OPERATIONS': 'view_operations_queue',
      'DEPLOYMENT': 'view_deployment_queue',
      'GOVERNANCE': 'view_governance_queue'
    }
    const requiredView = viewMap[domain]
    
    // Maker can always view their own request
    if (item.maker === currentUserEmail.value && userPermissions.value.includes('view_own_requests')) return true
    
    return userPermissions.value.includes(requiredView)
  })

  approvals.value = filteredData

  if (selectedRequest.value) {
    const updated = filteredData.find(a => a.approvalId === selectedRequest.value.approvalId)
    if (updated) selectedRequest.value = { ...updated }
  }
}

onMounted(() => {
  ApprovalEngine.subscribe(handleEngineUpdate)
})

onUnmounted(() => {
  ApprovalEngine.unsubscribe(handleEngineUpdate)
})

const getOperatorLabel = (emailOrUser) => {
  if (!emailOrUser) return 'Unassigned'
  const map = {
    'operations_team@invify.app': 'Operations Team',
    'risk_agent@invify.app': 'Risk Analyst',
    'compliance_officer@invify.app': 'Compliance Officer',
    'fleet_manager@invify.app': 'Fleet Manager',
    'ciso@invify.app': 'Chief Info Security Officer',
    'current_user@invify.app': 'Active Operator',
    'superadmin@iips.app': 'Super Admin Master'
  }
  const cleanEmail = emailOrUser.toLowerCase().trim()
  const name = map[cleanEmail] || 'Platform Agent'
  return `${name} (${emailOrUser})`
}

const onRowClick = (evt, row) => {
  selectedRequest.value = { ...row }
  activeTab.value = 'overview'
  drawerOpen.value = true
}

const updateStatus = (status) => {
  if (selectedRequest.value) {
    const actorEmail = localStorage.getItem('operator_email') || 'current_user@invify.app'
    ApprovalEngine.updateStatus(selectedRequest.value.approvalId, status, actorEmail)
  }
}

const createMockRequest = () => {
  const actorEmail = localStorage.getItem('operator_email') || 'current_user@invify.app'
  ApprovalEngine.submitApproval({
    approvalType: 'Tenant Suspension',
    entityType: 'Tenant',
    entityId: 'TEN-RET-055',
    riskScore: 98,
    maker: actorEmail
  })
}

const getStatusColor = (status) => {
  switch (status) {
    case 'Approved': return 'green-5'
    case 'Rejected': return 'red-5'
    case 'Under Review': return 'amber-5'
    case 'Submitted': return 'cyan-5'
    default: return 'grey-6'
  }
}

const getRiskColor = (score) => {
  if (score > 80) return 'text-red-4'
  if (score > 50) return 'text-amber-4'
  return 'text-green-4'
}

const getRiskColorClass = (score) => {
  if (score > 80) return 'red-4'
  if (score > 50) return 'amber-4'
  return 'green-4'
}
</script>

<style scoped>
.bg-page { background: var(--enterprise-page-bg); }
.bg-panel { background: var(--sidebar-panel-bg); }
.bg-subpanel { background: rgba(0, 0, 0, 0.2); }
.bg-dark { background: rgba(0, 0, 0, 0.4); }
.border-bottom { border-bottom: 1px solid var(--enterprise-border); }
.border-top { border-top: 1px solid var(--enterprise-border); }
.border-left { border-left: 1px solid var(--enterprise-border); }
.border-muted { border: 1px solid var(--enterprise-border); }
.text-main { color: var(--enterprise-text-main); }
.text-muted { color: var(--enterprise-text-muted); }
.opacity-20 { opacity: 0.2; }
.drawer-shadow { box-shadow: -4px 0 24px rgba(0,0,0,0.5); }
.op-gap-8 { gap: 8px; }
.op-gap-12 { gap: 12px; }
</style>
