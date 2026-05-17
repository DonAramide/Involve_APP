<!-- invify-admin/src/pages/tenant/TenantStaffPage.vue -->
<template>
  <q-page class="q-pa-lg text-white" style="background: #05070d; min-height: 100vh;">
    
    <!-- Top Header -->
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="row items-center op-gap-8 no-wrap">
          <q-icon name="people_outline" color="cyan-4" size="md" />
          <h1 class="text-h4 text-weight-bolder text-white q-my-none letter-spacing-1">Staff Governance</h1>
        </div>
        <div class="text-caption text-grey-5 q-mt-xs">
          Manage staff accounts, assign granular identity scopes, and enforce permission compliance.
        </div>
      </div>

      <!-- Action Button - Disabled if active identity is Finance (Read-only) -->
      <div>
        <q-btn 
          unelevated 
          color="cyan-9" 
          text-color="black" 
          icon="person_add" 
          label="Onboard Operator" 
          @click="showAddDialog = true" 
          :disabled="activeUserRole === 'FINANCE'"
          class="text-weight-bold text-caption text-black"
        >
          <q-tooltip v-if="activeUserRole === 'FINANCE'" class="bg-red-10 text-white font-mono">
            FINANCE COMPLIANCE: Onboarding disabled in Read-Only mode.
          </q-tooltip>
        </q-btn>
      </div>
    </div>

    <!-- Dynamic Identity Scope Switcher (For live testing of permissions!) -->
    <q-card class="bg-card-dark border-grey-9 q-pa-md q-mb-lg">
      <div class="row items-center justify-between">
        <div>
          <div class="text-operator-title text-grey-4 text-weight-bold" style="font-size: 11px; letter-spacing: 1px;">ACTIVE WORKSPACE IDENTITY (WHO I AM)</div>
          <div class="text-caption text-grey-6 q-mt-xs">Toggle roles below to dynamically test portal-wide permissions.</div>
        </div>
        <q-btn-toggle
          v-model="activeUserRole"
          toggle-color="cyan-9"
          color="black"
          dense
          flat
          text-color="grey-4"
          toggle-text-color="black"
          class="border-grey-9 q-px-sm font-mono text-caption"
          :options="[
            {label: 'ADMIN (FULL ACCESS)', value: 'ADMIN'},
            {label: 'FINANCE (READ ONLY)', value: 'FINANCE'},
            {label: 'STAFF (OPERATIONAL)', value: 'STAFF'}
          ]"
        />
      </div>

      <!-- Interactive Banner for Finance Compliance Mode -->
      <transition enter-active-class="animated fadeIn" leave-active-class="animated fadeOut">
        <div v-if="activeUserRole === 'FINANCE'" class="q-mt-md q-pa-sm border-red rounded-borders bg-red-10 text-red-3 row items-center op-gap-8 text-caption font-mono">
          <q-icon name="security" size="sm" />
          <span><strong>FINANCE COMPLIANCE MODE ACTIVE:</strong> You can read all staff registries, logs, and telemetry, but all modification and onboarding controls are strictly locked.</span>
        </div>
      </transition>
    </q-card>

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
                <q-badge 
                  :color="props.value === 'ADMIN' ? 'red-10' : (props.value === 'FINANCE' ? 'amber-10' : 'indigo-10')" 
                  :text-color="props.value === 'ADMIN' ? 'red-3' : (props.value === 'FINANCE' ? 'amber-3' : 'indigo-3')" 
                  class="text-weight-bold font-mono"
                >
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
                <!-- Suspend / Activate Toggle - Disabled if logged-in user is Finance -->
                <q-btn 
                  flat 
                  dense 
                  round 
                  size="sm" 
                  :color="activeUserRole === 'FINANCE' ? 'grey-7' : (props.row.status === 'ACTIVE' ? 'red-4' : 'green-4')" 
                  :icon="props.row.status === 'ACTIVE' ? 'block' : 'lock_open'"
                  :disabled="activeUserRole === 'FINANCE'"
                  @click="toggleOperatorState(props.row)"
                >
                  <q-tooltip class="bg-indigo-10 text-white font-mono">
                    <span v-if="activeUserRole === 'FINANCE'">Finance Viewport: Mutate blocked</span>
                    <span v-else>{{ props.row.status === 'ACTIVE' ? 'Suspend Account' : 'Re-Activate Account' }}</span>
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

    <!-- Onboard / Add Staff Dialog (Strictly matches the Mobile App screen layout!) -->
    <q-dialog v-model="showAddDialog" backdrop-filter="blur(10px)">
      <q-card class="bg-card-dark border-indigo q-pa-md" style="width: 440px; border-radius: 24px; background: #0b0f19;">
        
        <q-card-section class="q-pb-none">
          <div class="text-h5 text-weight-bold text-white font-mono text-center q-my-sm">Add Staff</div>
        </q-card-section>

        <q-card-section class="column q-gutter-y-md text-left">
          <!-- 1. Staff Name Input -->
          <q-input 
            v-model="newOperator.name" 
            dark 
            filled
            dense 
            label="Staff Name" 
            color="cyan-4" 
            class="bg-black-transparent rounded-borders" 
          />

          <!-- 2. Staff ID (Optional) Input with max counter -->
          <q-input 
            v-model="newOperator.staffId" 
            dark 
            filled
            dense 
            label="Staff ID (Optional)" 
            placeholder="e.g., MGT-01" 
            color="cyan-4" 
            maxlength="20"
            counter
            class="bg-black-transparent rounded-borders" 
          />

          <!-- 3. Auth Code (4 digits) password mask with counter -->
          <q-input 
            v-model="newOperator.authCode" 
            dark 
            filled
            dense 
            type="password"
            label="Auth Code (4 digits)" 
            color="cyan-4" 
            maxlength="4"
            counter
            class="bg-black-transparent rounded-borders" 
          />

          <!-- 4. Phone Number Input -->
          <q-input 
            v-model="newOperator.phone" 
            dark 
            filled
            dense 
            type="tel"
            label="Phone Number" 
            color="cyan-4" 
            class="bg-black-transparent rounded-borders" 
          />
          
          <!-- Elegant 3-Radio Identity Selector block designating permissions scope -->
          <div class="q-mt-sm">
            <div class="text-operator-title text-grey-5 q-mb-sm" style="font-size: 9.5px; letter-spacing: 1px; font-weight: bold;">IDENTITY SCOPE ACCESS LIMITATIONS</div>
            <div class="row q-col-gutter-sm">
              <div 
                class="col-4" 
                v-for="opt in [
                  {label: 'Staff', value: 'STAFF', desc: 'Operational Scope'}, 
                  {label: 'Admin', value: 'ADMIN', desc: 'Full Read/Write'}, 
                  {label: 'Finance', value: 'FINANCE', desc: 'Read-Only View'}
                ]" 
                :key="opt.value"
              >
                <q-card 
                  clickable 
                  @click="newOperator.role = opt.value"
                  :class="newOperator.role === opt.value ? 'border-active bg-cyan-10 text-cyan-3' : 'border-grey-9'"
                  class="q-pa-sm text-center cursor-pointer transition-2 rounded-borders hover-bg fit column justify-between"
                  style="min-height: 85px;"
                >
                  <div class="row justify-center">
                    <q-radio v-model="newOperator.role" :val="opt.value" dark color="cyan-4" size="sm" class="q-mr-none" />
                  </div>
                  <div class="text-caption font-mono text-weight-bold text-white">{{ opt.label }}</div>
                  <div class="text-grey-6 font-mono" style="font-size: 8px; line-height: 1.1;">{{ opt.desc }}</div>
                </q-card>
              </div>
            </div>
          </div>
        </q-card-section>

        <!-- Standard Mobile Actions: Cancel and Save -->
        <q-card-actions class="row justify-between q-px-md q-pb-md q-pt-none">
          <q-btn flat color="grey-5" label="CANCEL" v-close-popup class="text-weight-bold font-mono text-caption" style="border-radius: 12px; width: 45%;" />
          <q-btn unelevated color="white" text-color="black" label="SAVE" @click="provisionOperator" class="text-weight-bold font-mono text-caption text-black" style="border-radius: 12px; width: 45%;" />
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
const activeUserRole = ref('ADMIN') // Interactive tester role (ADMIN / FINANCE / STAFF)

const newOperator = ref({
  name: '',
  staffId: '',
  authCode: '',
  phone: '',
  role: 'STAFF'
})

const columns = [
  { name: 'name', label: 'STAFF OPERATOR', field: 'name', align: 'left', sortable: true },
  { name: 'staffId', label: 'STAFF ID', field: 'staffId', align: 'left' },
  { name: 'phone', label: 'PHONE LINK', field: 'phone', align: 'left' },
  { name: 'role', label: 'SECURITY IDENTITY', field: 'role', align: 'center' },
  { name: 'status', label: 'OPERATIONAL STATE', field: 'status', align: 'center' },
  { name: 'actions', label: 'OVERSIGHT ACTIONS', align: 'center' }
]

const operators = ref([
  { id: 1, name: 'Olive Invify', staffId: 'MGT-01', phone: '+234 803 111 2222', role: 'ADMIN', status: 'ACTIVE' },
  { id: 2, name: 'Samuel Staff', staffId: 'OPS-12', phone: '+234 809 333 4444', role: 'STAFF', status: 'ACTIVE' },
  { id: 3, name: 'Victoria Finance', staffId: 'FIN-02', phone: '+234 812 555 6666', role: 'FINANCE', status: 'ACTIVE' }
])

const auditLogs = ref([
  { id: 1, operator: 'olive@invify.com', time: '10m ago', action: 'Approved POS batch settlement matching sweep.', ip: '102.89.34.12' },
  { id: 2, operator: 'sam@invify.com', time: '1h ago', action: 'Activated terminal key generator DSP-9044.', ip: '102.89.34.14' },
  { id: 3, operator: 'olive@invify.com', time: '4h ago', action: 'Modified payout destination sweep preferences.', ip: '102.89.34.12' }
])

const toggleOperatorState = (row) => {
  // Strict check on mutability permissions
  if (activeUserRole.value === 'FINANCE') {
    $q.notify({ type: 'negative', message: 'Action Rejected: Finance Scope is read-only compliant.' })
    return
  }

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
      action: `Modified status of ${row.staffId} to ${nextStatus}.`,
      ip: '197.210.8.44'
    })
  })
}

const provisionOperator = () => {
  // Strict check on mutability permissions
  if (activeUserRole.value === 'FINANCE') {
    $q.notify({ type: 'negative', message: 'Action Rejected: Finance Scope is read-only compliant.' })
    return
  }

  if (!newOperator.value.name || !newOperator.value.authCode) {
    $q.notify({ type: 'negative', message: 'Staff Name and Auth Code are required.' })
    return
  }

  operators.value.push({
    id: Date.now(),
    name: newOperator.value.name,
    staffId: newOperator.value.staffId || 'OPT-MEMBER',
    phone: newOperator.value.phone || 'Unlinked',
    role: newOperator.value.role,
    status: 'ACTIVE'
  })

  // Append to audit logs
  auditLogs.value.unshift({
    id: Date.now(),
    operator: 'owner@business.com',
    time: 'Just now',
    action: `Created new ${newOperator.value.role} profile: ${newOperator.value.name}.`,
    ip: '197.210.8.44'
  })

  $q.notify({ type: 'positive', message: `Staff profile for ${newOperator.value.name} created successfully.` })
  showAddDialog.value = false
  newOperator.value = { name: '', staffId: '', authCode: '', phone: '', role: 'STAFF' }
}
</script>

<style scoped>
.border-indigo { border: 1px solid #00acc1; }
.border-red { border: 1px solid rgba(239, 68, 68, 0.3); }
.border-grey-9 { border: 1px solid rgba(255,255,255,0.06); }
.border-active { border: 1px solid #00acc1 !important; }
.bg-card-dark { background: #0b0f19; }
.bg-black-transparent { background: rgba(0, 0, 0, 0.25) !important; }
.hover-bg:hover { background: rgba(255,255,255,0.02) !important; }
.letter-spacing-1 { letter-spacing: 1px; }
.font-mono { font-family: 'Courier New', Courier, monospace; }
.transition-2 { transition: all 0.2s ease; }
</style>
