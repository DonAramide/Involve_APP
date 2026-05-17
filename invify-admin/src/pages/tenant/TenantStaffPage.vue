<!-- invify-admin/src/pages/tenant/TenantStaffPage.vue -->
<template>
  <q-page class="q-pa-lg text-white" style="background: #05070d; min-height: 100vh;">
    
    <!-- Top Header -->
    <div class="row items-center justify-between q-mb-xl">
      <div>
        <div class="row items-center op-gap-8 no-wrap">
          <q-icon name="people_outline" color="cyan-4" size="md" />
          <h1 class="text-h4 text-weight-bolder text-white q-my-none letter-spacing-1">Staff Governance</h1>
        </div>
        <div class="text-caption text-grey-5 q-mt-xs">
          Manage staff accounts, assign granular RBAC roles, track operator lineages, and enforce MFA compliance.
        </div>
      </div>

      <q-btn unelevated color="cyan-9" text-color="black" icon="person_add" label="Onboard Operator" @click="showAddDialog = true" class="text-weight-bold text-caption text-black" />
    </div>

    <!-- 1. Operational Staff Grid & RBAC Details -->
    <div class="row q-col-gutter-lg q-mb-lg">
      
      <!-- Operators Grid -->
      <div class="col-12 col-lg-8">
        <q-card class="bg-card-dark border-grey-9 q-pa-lg fit">
          <div class="text-h6 text-weight-bold text-white q-mb-md">Active Business Operators</div>

          <q-table
            :rows="operators"
            :columns="columns"
            row-key="id"
            dark
            flat
            bordered
            class="bg-card-dark"
          >
            <template v-slot:body-cell-role="props">
              <q-td :props="props">
                <q-badge color="indigo-10" text-color="indigo-3" class="text-weight-bold font-mono">
                  {{ props.value }}
                </q-badge>
              </q-td>
            </template>

            <template v-slot:body-cell-status="props">
              <q-td :props="props">
                <q-chip 
                  dense 
                  :color="props.value === 'ACTIVE' ? 'green-10' : 'red-10'" 
                  :text-color="props.value === 'ACTIVE' ? 'green-3' : 'red-3'"
                  class="text-weight-bold font-mono"
                  style="font-size: 10px;"
                >
                  {{ props.value }}
                </q-chip>
              </q-td>
            </template>

            <template v-slot:body-cell-actions="props">
              <q-td :props="props" class="text-center">
                <!-- Suspend / Activate Toggle -->
                <q-btn 
                  flat 
                  dense 
                  round 
                  size="sm" 
                  :color="props.row.status === 'ACTIVE' ? 'red-4' : 'green-4'" 
                  :icon="props.row.status === 'ACTIVE' ? 'block' : 'lock_open'"
                  @click="toggleOperatorState(props.row)"
                >
                  <q-tooltip class="bg-indigo-10 text-white">
                    {{ props.row.status === 'ACTIVE' ? 'Suspend Account' : 'Re-Activate Account' }}
                  </q-tooltip>
                </q-btn>
              </q-td>
            </template>
          </q-table>
        </q-card>
      </div>

      <!-- Live Operator Audit Trail -->
      <div class="col-12 col-lg-4">
        <q-card class="bg-card-dark border-grey-9 q-pa-lg fit">
          <div class="text-h6 text-weight-bold text-white q-mb-xs">Operator Audit Lineage</div>
          <div class="text-caption text-grey-5 q-mb-md">Immutable track log of staff ledger events.</div>

          <q-scroll-area style="height: 320px;">
            <div class="column q-gutter-y-sm">
              <div class="q-pa-md rounded-borders border-grey-9 bg-black-transparent" v-for="log in auditLogs" :key="log.id">
                <div class="row items-center justify-between text-metric-mono font-mono" style="font-size: 10.5px;">
                  <span class="text-white text-weight-bold">{{ log.operator }}</span>
                  <span class="text-grey-6">{{ log.time }}</span>
                </div>
                <div class="text-caption text-grey-4 q-mt-xs">{{ log.action }}</div>
                <div class="text-metric-sm text-cyan-4 font-mono q-mt-xs" style="font-size: 9.5px;">IP Trace: {{ log.ip }}</div>
              </div>
            </div>
          </q-scroll-area>
        </q-card>
      </div>

    </div>

    <!-- Onboard Operator Dialog -->
    <q-dialog v-model="showAddDialog" backdrop-filter="blur(10px)">
      <q-card class="bg-card-dark border-indigo q-pa-md" style="min-width: 400px; border-radius: 16px;">
        <q-card-section>
          <div class="text-h6 text-weight-bold text-white">Onboard Operator Node</div>
          <div class="text-caption text-grey-5">Create credentials for a new business team member.</div>
        </q-card-section>

        <q-card-section class="column q-gutter-y-md">
          <q-input v-model="newOperator.name" dark outlined dense label="Operator Full Name" color="cyan-4" />
          <q-input v-model="newOperator.email" dark outlined dense type="email" label="Operator Email Address" color="cyan-4" />
          
          <!-- Explicit 3-Radio Role Selector block designating Identity Scope -->
          <div>
            <div class="text-operator-title text-grey-5 q-mb-sm" style="font-size: 9px; letter-spacing: 1px;">DESIGNATE STAFF IDENTITY (WHO I AM)</div>
            <div class="row q-col-gutter-sm">
              <div class="col-4" v-for="opt in [{label: 'Staff', value: 'STAFF', desc: 'Operational Access'}, {label: 'Admin', value: 'ADMIN', desc: 'Global Control'}, {label: 'Finance', value: 'FINANCE', desc: 'Treasury Sweeps'}]" :key="opt.value">
                <q-card 
                  clickable 
                  @click="newOperator.role = opt.value"
                  :class="newOperator.role === opt.value ? 'border-active bg-cyan-10 text-cyan-3' : 'border-grey-9'"
                  class="q-pa-sm text-center cursor-pointer transition-2 rounded-borders hover-bg"
                >
                  <q-radio v-model="newOperator.role" :val="opt.value" dark color="cyan-4" size="sm" class="q-mr-none" />
                  <div class="text-caption font-mono text-weight-bold text-white q-mt-xs">{{ opt.label }}</div>
                  <div class="text-grey-6 font-mono" style="font-size: 8px;">{{ opt.desc }}</div>
                </q-card>
              </div>
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right" class="q-mt-md">
          <q-btn flat color="grey-5" label="Cancel" v-close-popup class="text-weight-bold font-mono" />
          <q-btn unelevated color="cyan-9" label="Provision Account" @click="provisionOperator" class="text-weight-bold font-mono text-black" />
        </q-card-actions>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import { useQuasar } from 'quasar'

const $q = useQuasar()
const showAddDialog = ref(false)

const newOperator = ref({
  name: '',
  email: '',
  role: 'STAFF'
})

const columns = [
  { name: 'name', label: 'OPERATOR NAME', field: 'name', align: 'left', sortable: true },
  { name: 'email', label: 'EMAIL NODE', field: 'email', align: 'left' },
  { name: 'role', label: 'RBAC SCOPE (IDENTITY)', field: 'role', align: 'center' },
  { name: 'status', label: 'OPERATIONAL STATE', field: 'status', align: 'center' },
  { name: 'actions', label: 'OVERSIGHT ACTIONS', align: 'center' }
]

const operators = ref([
  { id: 1, name: 'Olive Invify', email: 'olive@invify.com', role: 'ADMIN', status: 'ACTIVE' },
  { id: 2, name: 'Samuel Staff', email: 'sam@invify.com', role: 'STAFF', status: 'ACTIVE' },
  { id: 3, name: 'Victoria Finance', email: 'victoria@invify.com', role: 'FINANCE', status: 'ACTIVE' }
])

const auditLogs = ref([
  { id: 1, operator: 'olive@invify.com', time: '10m ago', action: 'Approved POS batch settlement matching sweep.', ip: '102.89.34.12' },
  { id: 2, operator: 'sam@invify.com', time: '1h ago', action: 'Activated terminal key generator DSP-9044.', ip: '102.89.34.14' },
  { id: 3, operator: 'olive@invify.com', time: '4h ago', action: 'Modified payout destination sweep preferences.', ip: '102.89.34.12' }
])

const toggleOperatorState = (row) => {
  const nextStatus = row.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
  $q.dialog({
    title: `${nextStatus === 'SUSPENDED' ? 'Suspend' : 'Reactivate'} Operator Account?`,
    message: `Are you sure you want to transition ${row.name} to ${nextStatus} status?`,
    cancel: true,
    dark: true
  }).onOk(() => {
    row.status = nextStatus
    $q.notify({ type: 'positive', message: `Operator account successfully marked as ${nextStatus.toLowerCase()}.` })
    
    // Append to audit logs
    auditLogs.value.unshift({
      id: Date.now(),
      operator: 'owner@business.com',
      time: 'Just now',
      action: `Modified status of ${row.email} to ${nextStatus}.`,
      ip: '197.210.8.44'
    })
  })
}

const provisionOperator = () => {
  if (!newOperator.value.name || !newOperator.value.email) {
    $q.notify({ type: 'negative', message: 'Specify all operator configuration values.' })
    return
  }

  operators.value.push({
    id: Date.now(),
    name: newOperator.value.name,
    email: newOperator.value.email,
    role: newOperator.value.role,
    status: 'ACTIVE'
  })

  // Append to audit logs
  auditLogs.value.unshift({
    id: Date.now(),
    operator: 'owner@business.com',
    time: 'Just now',
    action: `Created new ${newOperator.value.role} profile: ${newOperator.value.email}.`,
    ip: '197.210.8.44'
  })

  $q.notify({ type: 'positive', message: `Operator profile for ${newOperator.value.name} created successfully.` })
  showAddDialog.value = false
  newOperator.value = { name: '', email: '', role: 'STAFF' }
}
</script>

<style scoped>
.border-indigo { border: 1px solid #00acc1; }
.border-grey-9 { border: 1px solid rgba(255,255,255,0.06); }
.border-active { border: 1px solid #00acc1 !important; }
.bg-card-dark { background: #0b0f19; }
.bg-black-transparent { background: rgba(0, 0, 0, 0.25) !important; }
.hover-bg:hover { background: rgba(255,255,255,0.02) !important; }
.letter-spacing-1 { letter-spacing: 1px; }
.font-mono { font-family: 'Courier New', Courier, monospace; }
.transition-2 { transition: all 0.2s ease; }
</style>
