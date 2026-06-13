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
              <q-td :props="props" class="text-center row items-center justify-center q-gutter-x-xs">
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

                <!-- Reset Auth Code / Password -->
                <q-btn 
                  flat 
                  dense 
                  round 
                  size="sm" 
                  :color="activeUserRole === 'FINANCE' ? 'grey-7' : 'amber-4'" 
                  icon="vpn_key"
                  :disabled="activeUserRole === 'FINANCE'"
                  @click="resetOperatorPassword(props.row)"
                >
                  <q-tooltip class="bg-indigo-10 text-white font-mono">
                    <span v-if="activeUserRole === 'FINANCE'">Finance Viewport: Mutate blocked</span>
                    <span v-else>Reset Auth Code / Password</span>
                  </q-tooltip>
                </q-btn>

                <!-- Change Security Role -->
                <q-btn 
                  flat 
                  dense 
                  round 
                  size="sm" 
                  :color="activeUserRole === 'FINANCE' ? 'grey-7' : 'cyan-4'" 
                  icon="admin_panel_settings"
                  :disabled="activeUserRole === 'FINANCE'"
                  @click="changeOperatorRole(props.row)"
                >
                  <q-tooltip class="bg-indigo-10 text-white font-mono">
                    <span v-if="activeUserRole === 'FINANCE'">Finance Viewport: Mutate blocked</span>
                    <span v-else>Change Security Role</span>
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

    <!-- Onboard / Add Staff Dialog (100% Matches Mobile App Mockup Screen & Enforces RBAC!) -->
    <q-dialog v-model="showAddDialog" backdrop-filter="blur(10px)">
      <q-card class="q-pa-lg text-black" style="width: 400px; border-radius: 28px; background: #ffffff; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);">
        
        <!-- Dialog Title -->
        <q-card-section class="q-pb-none q-pt-sm text-left">
          <div class="text-h5 text-weight-bold text-grey-9 q-mb-xs">Add Staff</div>
        </q-card-section>

        <!-- Form Inputs (Standard Material Line Inputs as seen in Screenshot) -->
        <q-card-section class="column q-gutter-y-md text-left q-pt-sm">
          
          <!-- 1. Staff Name Input -->
          <q-input 
            v-model="newOperator.name" 
            standard
            dense 
            label="Staff Name" 
            color="primary"
            label-color="grey-6"
            input-class="text-black"
          />

          <!-- 2. Staff ID Input with counter -->
          <q-input 
            v-model="newOperator.staffId" 
            standard
            dense 
            label="Staff ID (Optional)" 
            placeholder="e.g., MGT-01" 
            color="primary" 
            label-color="grey-6"
            maxlength="20"
            counter
            input-class="text-black"
          />

          <!-- 3. Auth Code Input with counter -->
          <q-input 
            v-model="newOperator.authCode" 
            standard
            dense 
            type="password"
            label="Auth Code (4 digits)" 
            color="primary" 
            label-color="grey-6"
            maxlength="4"
            counter
            input-class="text-black"
          />

          <!-- 4. Phone Number Input -->
          <q-input 
            v-model="newOperator.phone" 
            standard
            dense 
            type="tel"
            label="Phone Number" 
            color="primary" 
            label-color="grey-6"
            input-class="text-black"
          />
          
          <!-- Elegant 3-Radio Identity Selector Block (Staff, Admin, Finance) -->
          <div class="q-mt-lg">
            <div class="text-operator-title text-grey-7 q-mb-sm text-weight-bold" style="font-size: 10px; letter-spacing: 0.5px;">SECURITY ROLE IDENTITY (WHO I AM)</div>
            <div class="row q-col-gutter-xs">
              <div 
                class="col-4" 
                v-for="opt in [
                  {label: 'Staff 👤', value: 'STAFF', desc: 'Standard operational'}, 
                  {label: 'Admin 🔑', value: 'ADMIN', desc: 'Full Read/Write'}, 
                  {label: 'Finance 💰', value: 'FINANCE', desc: 'Read-Only audit'}
                ]" 
                :key="opt.value"
              >
                <q-card 
                  clickable 
                  @click="newOperator.role = opt.value"
                  :class="newOperator.role === opt.value ? 'bg-blue-5 border-blue text-primary' : 'bg-grey-2 text-grey-8'"
                  class="q-pa-xs text-center cursor-pointer transition-2 rounded-borders column justify-between hover-bg-light border-grey-light"
                  style="min-height: 80px; box-shadow: none;"
                >
                  <div class="row justify-center q-pt-xs">
                    <q-radio v-model="newOperator.role" :val="opt.value" color="primary" size="xs" class="q-mr-none" />
                  </div>
                  <div class="text-caption font-mono text-weight-bold" style="font-size: 10.5px;">{{ opt.label }}</div>
                  <div class="text-grey-6" style="font-size: 8px; line-height: 1.1; margin-bottom: 4px;">{{ opt.desc }}</div>
                </q-card>
              </div>
            </div>
          </div>

        </q-card-section>

        <!-- Dialog Action Buttons (Matches Mobile CANCEL & SAVE perfectly) -->
        <q-card-actions class="row justify-end q-px-md q-pb-sm q-pt-md">
          <q-btn 
            flat 
            color="primary" 
            label="CANCEL" 
            v-close-popup 
            class="text-weight-bold font-mono text-caption q-mr-sm" 
            style="border-radius: 100px;" 
          />
          <q-btn 
            unelevated 
            color="grey-2" 
            text-color="primary" 
            label="SAVE" 
            @click="provisionOperator" 
            class="text-weight-bold font-mono text-caption" 
            style="border-radius: 100px; padding: 6px 20px; background: #eef2f6;" 
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import { useQuasar } from 'quasar'
import { useTenantUsersStore } from '../stores/tenantUsersStore'
import { storeToRefs } from 'pinia'

const $q = useQuasar()
const store = useTenantUsersStore()
const { activeUserRole, operators, auditLogs } = storeToRefs(store)

const showAddDialog = ref(false)

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

const toggleOperatorState = (row) => {
  if (activeUserRole.value === 'FINANCE') {
    $q.notify({ type: 'negative', message: 'Action Rejected: Finance Scope is read-only compliant.' })
    return
  }
  const nextStatus = row.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
  $q.dialog({
    title: `${nextStatus === 'SUSPENDED' ? 'Suspend' : 'Reactivate'} Operator Account?`,
    message: `Are you sure you want to transition ${row.name} to ${nextStatus} status?`,
    cancel: true, dark: true
  }).onOk(() => {
    store.updateOperatorStatus(row.id, nextStatus)
    $q.notify({ type: 'positive', message: `Operator account marked as ${nextStatus.toLowerCase()}.` })
  })
}

const resetOperatorPassword = (row) => {
  if (activeUserRole.value === 'FINANCE') {
    $q.notify({ type: 'negative', message: 'Action Rejected: Finance Scope is read-only compliant.' })
    return
  }
  $q.dialog({
    title: 'Reset Operator Auth Code / Password',
    message: `Enter new 4-digit security code for ${row.name}:`,
    prompt: { model: '', type: 'password', maxLength: 4, filled: true, dark: true },
    cancel: true, dark: true
  }).onOk((newCode) => {
    if (!newCode || newCode.length !== 4 || isNaN(newCode)) {
      $q.notify({ type: 'negative', message: 'Auth code must be a 4-digit number.' })
      return
    }
    store.logAudit(`Reset security auth code for ${row.staffId}.`)
    $q.notify({ type: 'positive', message: `Auth code reset successfully for ${row.name}.` })
  })
}

const changeOperatorRole = (row) => {
  if (activeUserRole.value === 'FINANCE') {
    $q.notify({ type: 'negative', message: 'Action Rejected: Finance Scope is read-only compliant.' })
    return
  }
  $q.dialog({
    title: 'Change Security Role',
    message: `Choose a new role for ${row.name}:`,
    options: {
      type: 'radio', model: row.role,
      items: [
        { label: 'Admin (Full access)', value: 'ADMIN' },
        { label: 'Finance (Read only)', value: 'FINANCE' },
        { label: 'Staff (Standard operational)', value: 'STAFF' }
      ]
    },
    cancel: true, dark: true
  }).onOk((newRole) => {
    store.updateOperatorRole(row.id, newRole)
    $q.notify({ type: 'positive', message: `Security role for ${row.name} updated.` })
  })
}

const provisionOperator = () => {
  if (activeUserRole.value === 'FINANCE') {
    $q.notify({ type: 'negative', message: 'Action Rejected: Finance Scope is read-only compliant.' })
    return
  }
  if (!newOperator.value.name || !newOperator.value.authCode) {
    $q.notify({ type: 'negative', message: 'Staff Name and Auth Code are required.' })
    return
  }
  store.addOperator({
    id: Date.now(),
    name: newOperator.value.name,
    staffId: newOperator.value.staffId || 'OPT-MEMBER',
    phone: newOperator.value.phone || 'Unlinked',
    role: newOperator.value.role,
    status: 'ACTIVE'
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

/* Light Theme Mockup Dialog Selectors styles */
.bg-blue-5 { background: #e0f2fe !important; }
.border-blue { border: 1.5px solid #0288d1 !important; }
.bg-grey-2 { background: #f3f4f6 !important; }
.border-grey-light { border: 1px solid #e5e7eb !important; }
.hover-bg-light:hover { background: #f9fafb !important; }
</style>
