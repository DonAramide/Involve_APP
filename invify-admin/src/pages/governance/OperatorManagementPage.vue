<!-- invify-admin/src/pages/governance/OperatorManagementPage.vue -->
<template>
  <q-page class="bg-main text-main q-pa-md column op-gap-16">
    
    <!-- Title Configuration Header -->
    <div class="row items-center justify-between no-wrap border-bottom q-pb-sm">
      <div class="row items-center op-gap-8 no-wrap">
        <q-icon name="manage_accounts" size="sm" color="blue-5" />
        <div>
          <div class="text-operator-title text-main text-weight-bold cursor-help" style="font-size: 14px;">
            Multi-Tier Operator Accounts Governance Hub
            <EnterpriseManualTooltip 
              title="Operator Governance Hub"
              icon="manage_accounts"
              description="A centralized control plane for provisioning and managing human operators. Supports granular role assignment from high-privilege Super Admins to restricted Tenant Operators."
              impact="CRITICAL: Manages credential lifecycle and access vectors."
            />
          </div>
          <div class="text-metric-mono text-muted" style="font-size: 10px;">5_TIER_IDENTITY_HIERARCHY // IMMUTABLE_AUDITING_ENABLED</div>
        </div>
      </div>
      
      <div class="row items-center op-gap-8 no-wrap">
        <q-btn
          color="blue-5"
          label="Provision Operator Profile"
          icon="add"
          dense
          size="sm"
          class="q-px-sm text-weight-bold"
          unelevated
          @click="openCreateDialog = true"
        />
      </div>
    </div>

    <!-- HIERARCHY FILTER TABS -->
    <div class="row items-center justify-between no-wrap border-main bg-panel rounded-borders q-pa-xs">
      <q-tabs
        v-model="activeTierTab"
        dense
        :dark="prefs.isDarkMode"
        class="text-muted"
        active-color="blue-5"
        indicator-color="blue-5"
        align="left"
        narrow-indicator
      >
        <q-tab name="ALL" label="All Corporate Tiers" />
        <q-tab name="SUPER_ADMIN" label="Super Admins" />
        <q-tab name="INTERNAL_STAFF" label="Internal Staff" />
        <q-tab name="TENANT_ADMIN" label="Tenant Admins" />
        <q-tab name="TENANT_OPERATOR" label="Tenant Operators" />
        <q-tab name="PRO_CUSTOMER" label="Pro Accounts" />
        <EnterpriseManualTooltip 
          title="RBAC Hierarchy Tiers"
          icon="layers"
          description="Filters operators by their functional boundary. Higher tiers have 'Platform-Wide' visibility, while lower tiers are strictly isolated to their specific Tenant ID."
          impact="SECURITY: Enforces vertical privilege separation."
        />
      </q-tabs>
      
      <span class="text-metric-mono text-muted q-px-sm text-metric-sm">
        Filtered: {{ filteredOperators.length }} Nodes
      </span>
    </div>

    <!-- MAIN OPERATORS DIRECTORY GRID -->
    <div class="enterprise-panel bg-panel column col">
      <div class="panel-header bg-subpanel q-px-sm q-py-xs border-bottom row items-center justify-between text-metric-sm text-muted">
        <span class="col-3">Operator Identifier Context</span>
        <span class="col-2">Corporate Hierarchy Role</span>
        <span class="col-2">Assigned Scope Boundary</span>
        <span class="col-2 text-center">MFA Enforcement</span>
        <span class="col-1 text-center">Status</span>
        <span class="col-2 text-right">Attestation Operations</span>
      </div>

      <div class="panel-body col q-pa-xs overflow-y-auto">
        <q-list dense class="q-gutter-y-xs">
          <q-item
            v-for="op in filteredOperators"
            :key="op.id"
            class="q-px-sm q-py-sm bg-subpanel rounded-borders row items-center justify-between no-wrap hover-row"
          >
            <!-- 1. Identity -->
            <div class="column col-3 no-wrap ellipsis">
              <span class="text-main text-weight-bold text-caption">{{ op.email }}</span>
              <span class="text-metric-mono text-muted" style="font-size: 9px;">ID: {{ op.id }}</span>
            </div>

            <!-- 2. Role Tier -->
            <div class="col-2">
              <q-badge :color="getRoleBadgeColor(op.role)" class="text-main text-weight-bold q-py-xs q-px-xs" style="font-size: 9px;">
                {{ op.role }}
              </q-badge>
            </div>

            <!-- 3. Scope -->
            <div class="col-2 text-metric-mono text-secondary" style="font-size: 11px;">
              {{ op.tenantId }}
            </div>

            <!-- 4. MFA State -->
            <div class="col-2 text-center">
              <q-icon name="check_circle" color="green-5" size="xs" v-if="op.isMfaEnabled" />
              <q-icon name="warning_amber" color="amber-5" size="xs" v-else>
                <q-tooltip class="bg-panel text-amber-8 text-caption">Mandatory gateway will enforce initial TOTP attestation pass</q-tooltip>
              </q-icon>
            </div>

            <!-- 5. Status -->
            <div class="col-1 text-center">
              <span class="text-metric-mono text-weight-bold" :class="op.status === 'ACTIVE' ? 'text-green-5' : 'text-red-5'" style="font-size: 10px;">
                {{ op.status }}
              </span>
            </div>

            <!-- 6. Command Execution Actions -->
            <div class="col-2 row items-center justify-end op-gap-4 no-wrap">
              <q-btn
                dense
                flat
                size="xs"
                color="red-5"
                label="Suspend"
                class="bg-red-focus q-px-xs text-metric-sm"
                v-if="op.status === 'ACTIVE'"
                @click="confirmSuspension(op)"
              />
              <q-btn
                dense
                flat
                size="xs"
                color="green-5"
                label="Unsuspend"
                class="bg-green-focus q-px-xs text-metric-sm"
                v-else
                @click="restoreOperator(op)"
              />
            </div>
          </q-item>
        </q-list>
      </div>
    </div>

    <!-- PROVISION OPERATOR PROFILE DIALOG OVERLAY -->
    <q-dialog v-model="openCreateDialog" persistent>
      <q-card class="bg-panel text-main border-main" style="width: 100%; max-width: 450px;">
        <q-card-section class="row items-center justify-between border-bottom q-pb-sm bg-subpanel">
          <div class="row items-center op-gap-8">
            <q-icon name="person_add_alt" color="blue-5" size="sm" />
            <span class="text-weight-bold text-caption">Provision Enterprise Operator Profile</span>
          </div>
          <q-btn icon="close" flat dense round v-close-popup />
        </q-card-section>

        <q-form @submit.prevent="executeCreationPipeline" class="column op-gap-16 q-pa-md">
          
          <div>
            <div class="text-caption text-muted q-mb-xs">Operator Account Identity Email *</div>
            <q-input
              v-model="newOp.email"
              :dark="prefs.isDarkMode"
              filled
              dense
              placeholder="e.g. core-operator@IIPS.app"
              class="bg-subpanel text-main rounded-borders"
              required
            />
          </div>

          <div>
            <div class="text-caption text-muted q-mb-xs">Assigned Identity Hierarchy Role *</div>
            <q-select
              v-model="newOp.role"
              :options="hierarchyRoles"
              :dark="prefs.isDarkMode"
              filled
              dense
              options-dense
              emit-value
              map-options
              class="bg-subpanel text-main rounded-borders"
            />
          </div>

          <div>
            <div class="text-caption text-muted q-mb-xs">Target Workspace Scope Namespace *</div>
            <q-select
              v-model="newOp.targetTenantId"
              :options="targetScopeOptions"
              :dark="prefs.isDarkMode"
              filled
              dense
              options-dense
              emit-value
              map-options
              class="bg-subpanel text-main rounded-borders"
            />
          </div>

          <div>
            <div class="text-caption text-muted q-mb-xs">Secure Credential Secret Passphrase *</div>
            <q-input
              v-model="newOp.password"
              :dark="prefs.isDarkMode"
              filled
              dense
              type="password"
              placeholder="••••••••••••"
              class="bg-subpanel text-main rounded-borders"
              required
            />
          </div>

          <div class="border-top q-pt-sm row justify-end op-gap-8">
            <q-btn flat dense label="Cancel" color="grey-5" v-close-popup class="q-px-sm" />
            <q-btn type="submit" color="blue-5" label="Commit Operator Profile Natively" dense unelevated class="q-px-sm text-weight-bold" :loading="loading" />
          </div>

        </q-form>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { adminApi } from '../../api'
import { useOperatorPreferences } from '../../composables/useOperatorPreferences'
import EnterpriseManualTooltip from '../../components/common/EnterpriseManualTooltip.vue'

const { prefs } = useOperatorPreferences()
const $q = useQuasar()

const loading = ref(false)
const openCreateDialog = ref(false)
const activeTierTab = ref('ALL')

const tenants = ref([])
const baseOperatorsList = ref([])

const fetchOperators = async () => {
  try {
    const res = await adminApi.getUsers()
    const rawUsers = res.data || []
    baseOperatorsList.value = rawUsers.map(u => ({
      id: u.id,
      email: u.email,
      role: (u.role || '').toUpperCase(),
      tenantId: u.tenant_id || 'global-platform',
      isMfaEnabled: !!u.is_mfa_enabled,
      status: u.is_active ? 'ACTIVE' : 'SUSPENDED'
    }))
  } catch (e) {
    console.error('Failed to fetch operators:', e)
    $q.notify({
      type: 'negative',
      message: 'Failed to retrieve operator profiles from server telemetry context.',
      position: 'bottom-right'
    })
  }
}

onMounted(async () => {
  loading.value = true
  try {
    const res = await adminApi.getTenants()
    tenants.value = res.data || []
  } catch (e) {
    // Sandbox offline presets fallback
    tenants.value = [
      { id: 'tenant-alpha', name: 'Fintech Alpha' },
      { id: 'tenant-beta', name: 'Beta Labs' },
      { id: 'tenant-omega', name: 'Omega Retail Group' }
    ]
  }
  await fetchOperators()
  loading.value = false
})

const targetScopeOptions = computed(() => {
  const list = [
    { label: 'Global Platform Boundary (Platform Level)', value: 'global-platform' }
  ]
  tenants.value.forEach(t => {
    list.push({ label: `${t.name} (${t.id})`, value: t.id })
  })
  return list
})

const hierarchyRoles = [
  { label: 'Tier 1: Super Admin Master Mode', value: 'SUPER_ADMIN' },
  { label: 'Tier 2: Internal Staff / Operators', value: 'INTERNAL_STAFF' },
  { label: 'Tier 3: Tenant Admins', value: 'TENANT_ADMIN' },
  { label: 'Tier 4: Tenant Operators', value: 'TENANT_OPERATOR' },
  { label: 'Tier 5: Pro Customers', value: 'PRO_CUSTOMER' }
]

const filteredOperators = computed(() => {
  if (activeTierTab.value === 'ALL') return baseOperatorsList.value
  return baseOperatorsList.value.filter(op => op.role === activeTierTab.value)
})

const newOp = ref({
  email: '',
  role: 'TENANT_OPERATOR',
  targetTenantId: 'global-platform',
  password: ''
})

const getRoleBadgeColor = (roleStr) => {
  if (roleStr === 'SUPER_ADMIN') return 'blue-5'
  if (roleStr === 'INTERNAL_STAFF') return 'amber-5'
  if (roleStr === 'TENANT_ADMIN') return 'light-green-5'
  if (roleStr === 'TENANT_OPERATOR') return 'secondary'
  return 'deep-purple-5'
}

const executeCreationPipeline = async () => {
  loading.value = true
  try {
    const isPlatform = [
      'SUPER_ADMIN',
      'INTERNAL_STAFF'
    ].includes(newOp.value.role)

    const payload = {
      email: newOp.value.email,
      password: newOp.value.password,
      role: newOp.value.role.toLowerCase(),
      tenantId: isPlatform || newOp.value.targetTenantId === 'global-platform' ? null : newOp.value.targetTenantId
    }

    const res = await adminApi.createUser(payload)
    const u = res.data

    baseOperatorsList.value.unshift({
      id: u?.id || `usr-${Date.now()}`,
      email: u?.email || newOp.value.email,
      role: (u?.role || newOp.value.role).toUpperCase(),
      tenantId: u?.tenant_id || newOp.value.targetTenantId,
      isMfaEnabled: !!u?.is_mfa_enabled,
      status: u?.is_active !== false ? 'ACTIVE' : 'SUSPENDED'
    })

    $q.notify({
      type: 'positive',
      message: 'Enterprise operator profile provisioned successfully.',
      position: 'bottom-right'
    })

    openCreateDialog.value = false
    // Clear input contexts
    newOp.value.email = ''
    newOp.value.password = ''
  } catch (err) {
    console.error('Failed to create operator:', err)
    const errMsg = err.response?.data?.error || err.message || 'Unknown credential sync failure.'
    $q.notify({
      type: 'negative',
      message: `Failed to commit operator profile: ${errMsg}`,
      position: 'bottom-right'
    })
  } finally {
    loading.value = false
  }
}

const confirmSuspension = async (opNode) => {
  try {
    await adminApi.updateUser(opNode.id, { is_active: false })
    opNode.status = 'SUSPENDED'
    $q.notify({
      type: 'info',
      message: `Operator ${opNode.email} suspended successfully.`,
      position: 'bottom-right'
    })
  } catch (e) {
    console.error('Failed to suspend operator:', e)
    $q.notify({
      type: 'negative',
      message: `Failed to suspend operator: ${e.message}`,
      position: 'bottom-right'
    })
  }
}

const restoreOperator = async (opNode) => {
  try {
    await adminApi.updateUser(opNode.id, { is_active: true })
    opNode.status = 'ACTIVE'
    $q.notify({
      type: 'positive',
      message: `Operator ${opNode.email} restored/unsuspended successfully.`,
      position: 'bottom-right'
    })
  } catch (e) {
    console.error('Failed to restore operator:', e)
    $q.notify({
      type: 'negative',
      message: `Failed to restore operator: ${e.message}`,
      position: 'bottom-right'
    })
  }
}
</script>

<style scoped>
.border-bottom { border-bottom: 1px solid var(--enterprise-border); }
.border-top { border-top: 1px solid var(--enterprise-border); }
.border-muted { border: 1px solid var(--enterprise-border); }
.border-premium { border: 1px solid rgba(225, 231, 236, 0.08); }

.hover-row:hover {
  background-color: var(--enterprise-subpanel-bg) !important;
}
</style>
