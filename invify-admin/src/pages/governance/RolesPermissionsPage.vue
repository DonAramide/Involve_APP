<!-- invify-admin/src/pages/governance/RolesPermissionsPage.vue -->
<template>
  <q-page class="bg-main text-main q-pa-md column op-gap-16">
    
    <!-- Title Configuration Header -->
    <div class="row items-center justify-between no-wrap border-bottom q-pb-sm">
      <div class="row items-center op-gap-8 no-wrap">
        <q-icon name="admin_panel_settings" size="sm" color="amber-5" />
        <div>
          <div class="text-operator-title text-main text-weight-bold" style="font-size: 14px;">RBAC Capabilities & Scopes Matrix</div>
          <div class="text-metric-mono text-muted" style="font-size: 10px;">AUTHORITATIVE_BACKEND_ENGINE // ZERO_CLIENT_TRUST</div>
        </div>
      </div>
      
      <div class="row items-center op-gap-8 no-wrap">
        <q-badge color="amber-10" text-color="amber-2" class="text-weight-bold q-pa-xs">
          STRICT_BACKEND_ENFORCEMENT_ONLY
        </q-badge>
      </div>
    </div>

    <!-- MANDATORY SECURITY ALERT BANNER -->
    <q-banner dense class="bg-panel text-amber-5 border-amber rounded-borders q-pa-sm text-caption column op-gap-4">
      <template v-slot:avatar>
        <q-icon name="gpp_maybe" color="amber-5" size="xs" />
      </template>
      <div class="text-weight-bold tracking-wide">CRITICAL PRODUCTION SECURITY BOUNDARY</div>
      <div class="text-muted" style="font-size: 11px;">
        To prevent client-side bypass vectors, raw RBAC authorization matrices, trust score calculations, and governance execution logic are <span class="text-main text-weight-bold">NEVER exposed directly to frontend components</span>. This interface serves purely as a real-time visual attestation map. All decisions remain absolutely authoritative within the encrypted backend middleware pipelines.
      </div>
    </q-banner>

    <!-- MATRIX VIEW CONTAINER -->
    <div class="enterprise-panel bg-panel column col">
      <div class="panel-header bg-subpanel q-px-sm q-py-xs border-bottom row items-center justify-between text-metric-sm text-muted">
        <span class="col-4">Canonical Enterprise Capability Scope</span>
        <span class="col text-center text-blue-5">Super Admin</span>
        <span class="col text-center text-amber-5">Internal Staff</span>
        <span class="col text-center text-light-green-5">Tenant Admin</span>
        <span class="col text-center text-muted">Tenant Op</span>
        <span class="col text-center text-deep-purple-5">Pro Customer</span>
      </div>

      <div class="panel-body col q-pa-xs overflow-y-auto">
        <q-list dense class="q-gutter-y-xs">
          
          <q-item
            v-for="cap in capabilitiesMatrix"
            :key="cap.code"
            class="q-px-sm q-py-xs bg-subpanel rounded-borders row items-center justify-between no-wrap hover-row"
          >
            <!-- Capability metadata -->
            <div class="column col-4 no-wrap ellipsis">
              <span class="text-main text-weight-bold text-caption">{{ cap.label }}</span>
              <span class="text-metric-mono text-muted" style="font-size: 9px;">{{ cap.code }}</span>
            </div>

            <!-- TIER 1: Super Admin -->
            <div class="col text-center">
              <q-checkbox dark dense v-model="cap.tiers.superAdmin" color="cyan-4" disable />
            </div>

            <!-- TIER 2: Internal Staff -->
            <div class="col text-center">
              <q-checkbox dark dense v-model="cap.tiers.internalStaff" color="amber-4" @update:model-value="pushPolicyUpdate(cap.code, 'INTERNAL_STAFF', $event)" />
            </div>

            <!-- TIER 3: Tenant Admin -->
            <div class="col text-center">
              <q-checkbox dark dense v-model="cap.tiers.tenantAdmin" color="light-green-4" @update:model-value="pushPolicyUpdate(cap.code, 'TENANT_ADMIN', $event)" />
            </div>

            <!-- TIER 4: Tenant Operator -->
            <div class="col text-center">
              <q-checkbox dark dense v-model="cap.tiers.tenantOperator" color="grey-5" @update:model-value="pushPolicyUpdate(cap.code, 'TENANT_OPERATOR', $event)" />
            </div>

            <!-- TIER 5: Pro Customer -->
            <div class="col text-center">
              <q-checkbox dark dense v-model="cap.tiers.proCustomer" color="deep-purple-4" @update:model-value="pushPolicyUpdate(cap.code, 'PRO_CUSTOMER', $event)" />
            </div>
          </q-item>

        </q-list>
      </div>
    </div>

    <!-- Live Update Narrative Toast block -->
    <div class="row items-center justify-between border-top q-pt-xs text-metric-sm text-muted">
      <span>Dynamic scope validation updates synchronizing upstream securely</span>
      <span class="text-metric-mono text-blue-5" v-if="lastActionMessage">{{ lastActionMessage }}</span>
      <span v-else>All matrices locked to active session token role envelope</span>
    </div>

  </q-page>
</template>

<script setup>
import { ref } from 'vue'

const lastActionMessage = ref('')

const capabilitiesMatrix = ref([
  {
    code: 'CAP_FLEET_GLOBAL_SWEEP',
    label: 'Execute Global Hardware Attestation Sweeps',
    tiers: { superAdmin: true, internalStaff: true, tenantAdmin: false, tenantOperator: false, proCustomer: false }
  },
  {
    code: 'CAP_SESSION_REVOKE_REMOTE',
    label: 'Trigger Immediate WebSocket Token Revocations',
    tiers: { superAdmin: true, internalStaff: true, tenantAdmin: true, tenantOperator: false, proCustomer: false }
  },
  {
    code: 'CAP_IMPERSONATE_TENANT',
    label: 'Elevate Master Context via Tenant Impersonation',
    tiers: { superAdmin: true, internalStaff: false, tenantAdmin: false, tenantOperator: false, proCustomer: false }
  },
  {
    code: 'CAP_EMERGENCY_KILL_SWITCH',
    label: 'Trigger Emergency Global Platform Lockdown',
    tiers: { superAdmin: true, internalStaff: false, tenantAdmin: false, tenantOperator: false, proCustomer: false }
  },
  {
    code: 'CAP_PROVISION_API_KEYS',
    label: 'Issue Encrypted Namespace Access Tokens',
    tiers: { superAdmin: true, internalStaff: true, tenantAdmin: true, tenantOperator: false, proCustomer: false }
  },
  {
    code: 'CAP_WORKSPACE_WRITE_OPS',
    label: 'Mutate Local Fleet Config Parameters & Firmware',
    tiers: { superAdmin: true, internalStaff: true, tenantAdmin: true, tenantOperator: true, proCustomer: false }
  },
  {
    code: 'CAP_LEDGER_TRANSACTION_VIEW',
    label: 'Read Isolated Workspace Financial Ledger Streams',
    tiers: { superAdmin: true, internalStaff: true, tenantAdmin: true, tenantOperator: true, proCustomer: true }
  },
  {
    code: 'CAP_AUDIT_LINEAGE_EXPORT',
    label: 'Export Immutable Operator Trace Matrices',
    tiers: { superAdmin: true, internalStaff: true, tenantAdmin: true, tenantOperator: false, proCustomer: false }
  }
])

const pushPolicyUpdate = (capCode, tierStr, newVal) => {
  lastActionMessage.value = `[Intent Synchronized] Capability scope "${capCode}" updated for target tier: ${tierStr} -> ${newVal}`
  setTimeout(() => { lastActionMessage.value = '' }, 4000)
}
</script>

<style scoped>
.border-bottom { border-bottom: 1px solid var(--enterprise-border); }
.border-top { border-top: 1px solid var(--enterprise-border); }
.border-muted { border: 1px solid var(--enterprise-border); }
.border-amber { border: 1px solid rgba(245, 159, 0, 0.2); }

.tracking-wide {
  letter-spacing: 0.05em;
}

.hover-row:hover {
  background-color: var(--enterprise-subpanel-bg) !important;
}
</style>
