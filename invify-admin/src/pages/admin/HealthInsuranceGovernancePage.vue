<template>
  <q-page class="q-pa-lg text-white" style="background: #05070d; min-height: 100vh;">
    <!-- Top Header & Breadcrumbs -->
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="row items-center q-gutter-sm no-wrap">
          <q-icon name="health_and_safety" color="teal-4" size="md" />
          <h1 class="text-h4 text-weight-bolder text-white q-my-none letter-spacing-1">Health &amp; Wellness Governance</h1>
          <q-badge color="teal-10" text-color="teal-3" class="text-weight-bold letter-spacing-1">
            SUPER ADMIN CONSOLE
          </q-badge>
          <q-badge v-if="grantStatus.hasActiveGrant" color="green-10" text-color="green-3" class="text-weight-bold">
            SESSION ACTIVE
          </q-badge>
          <q-badge v-else color="amber-10" text-color="amber-3" class="text-weight-bold">
            GRANT REQUIRED
          </q-badge>
        </div>
        <div class="text-caption text-grey-5 q-mt-xs">
          Cross-Tenant HMO Provider Telemetry, Coverage Participation, Access Grants &amp; Lineage Audit.
        </div>
      </div>

      <!-- Quick Action Buttons -->
      <div class="row q-gutter-sm items-center">
        <q-btn
          v-if="!grantStatus.hasActiveGrant"
          unelevated
          color="amber-9"
          text-color="dark"
          icon="key"
          label="Activate Operational Session"
          @click="showActivateSessionDialog = true"
          class="text-weight-bold text-caption font-mono"
        />
        <q-btn
          outline
          color="teal-4"
          icon="add_moderator"
          label="Grant Access"
          @click="showCreateGrantDialog = true"
          class="text-weight-bold text-caption font-mono"
        />
        <q-btn
          unelevated
          color="grey-9"
          icon="refresh"
          @click="loadAll"
          :loading="loading"
          round
          dense
        >
          <q-tooltip class="bg-grey-9 text-white">Refresh platform data</q-tooltip>
        </q-btn>
      </div>
    </div>

    <!-- Active Session / Governance Protocol Banner -->
    <q-banner
      v-if="!grantStatus.hasActiveGrant"
      dense
      rounded
      class="bg-amber-10 text-amber-2 q-mb-lg border-amber"
      style="border: 1px solid rgba(245, 158, 11, 0.4);"
    >
      <template v-slot:avatar>
        <q-icon name="security" color="amber-3" />
      </template>
      <div class="row items-center justify-between full-width">
        <div class="text-caption">
          <strong>Strict Security Boundary Enforced:</strong> Platform Super Admins do not possess implicit bypass access to student, staff, or tenant health records.
          You must activate a time-bounded operational session with an explicit audit reason to query cross-tenant health telemetry.
        </div>
        <q-btn
          dense
          flat
          color="amber-2"
          label="Self-Activate Now"
          class="text-weight-bold"
          @click="showActivateSessionDialog = true"
        />
      </div>
    </q-banner>

    <q-banner
      v-else
      dense
      rounded
      class="bg-dark text-grey-3 q-mb-lg border-grey-9"
      style="border: 1px solid rgba(20, 184, 166, 0.3);"
    >
      <template v-slot:avatar>
        <q-icon name="verified_user" color="teal-4" />
      </template>
      <div class="row items-center justify-between full-width">
        <div class="text-caption">
          <span class="text-teal-3 text-weight-bold">Active Operational Grant Session:</span>
          Permissions: <span class="font-mono text-white">{{ (grantStatus.activeGrants || []).map(g => g.permission).join(', ') }}</span> •
          Session Reason: <span class="text-grey-4">"{{ activePlatformReason }}"</span> •
          Remaining: <span class="text-amber-3 font-mono">{{ grantRemainingMinutes }} mins</span>
        </div>
        <q-btn
          dense
          flat
          size="sm"
          color="teal-3"
          label="Change Reason"
          @click="promptChangeReason"
        />
      </div>
    </q-banner>

    <!-- Error Banner -->
    <q-banner v-if="errorMessage" dense rounded class="bg-red-10 text-red-2 q-mb-lg">
      <template v-slot:avatar>
        <q-icon name="error_outline" color="red-2" />
      </template>
      <div class="text-caption">{{ errorMessage }}</div>
    </q-banner>

    <!-- Navigation Tabs -->
    <q-tabs
      v-model="activeTab"
      dense
      class="text-grey-5 q-mb-lg bg-card-dark rounded-borders"
      active-color="teal-3"
      indicator-color="teal-4"
      align="left"
      narrow-indicator
    >
      <q-tab name="overview" icon="dashboard" label="Platform Overview" />
      <q-tab name="tenants" icon="corporate_fare" label="Tenant Participation" :badge="tenantsList.length ? String(tenantsList.length) : undefined" />
      <q-tab name="providers" icon="hub" label="HMO Integration Telemetry" />
      <q-tab name="grants" icon="shield" label="Access Grants Manager" />
      <q-tab name="audit" icon="history" label="Lineage Audit Events" />
    </q-tabs>

    <!-- TAB 1: OVERVIEW -->
    <div v-if="activeTab === 'overview'">
      <!-- Platform KPI Cards -->
      <div class="row q-col-gutter-md q-mb-lg">
        <div class="col-12 col-sm-6 col-md-3">
          <q-card class="bg-card-dark border-grey-9 q-pa-md">
            <div class="row items-center justify-between">
              <span class="text-grey-5 text-weight-bold text-caption text-uppercase" style="letter-spacing: 1px;">ENABLED TENANTS</span>
              <q-icon name="apartment" color="cyan-4" size="sm" />
            </div>
            <div class="text-h4 text-weight-bolder text-white font-mono q-mt-sm">
              {{ overview.totalEnabledTenants || 0 }}
            </div>
            <div class="text-caption text-grey-5 q-mt-xs font-mono">
              Participating institutions
            </div>
          </q-card>
        </div>

        <div class="col-12 col-sm-6 col-md-3">
          <q-card class="bg-card-dark border-grey-9 q-pa-md">
            <div class="row items-center justify-between">
              <span class="text-grey-5 text-weight-bold text-caption text-uppercase" style="letter-spacing: 1px;">INSURED MEMBERS</span>
              <q-icon name="groups" color="teal-4" size="sm" />
            </div>
            <div class="text-h4 text-weight-bolder text-teal-4 font-mono q-mt-sm">
              {{ overview.totalDistinctMembers || 0 }}
            </div>
            <div class="text-caption text-grey-5 q-mt-xs font-mono">
              Students, staff &amp; dependants
            </div>
          </q-card>
        </div>

        <div class="col-12 col-sm-6 col-md-3">
          <q-card class="bg-card-dark border-grey-9 q-pa-md">
            <div class="row items-center justify-between">
              <span class="text-grey-5 text-weight-bold text-caption text-uppercase" style="letter-spacing: 1px;">ACTIVE COVERAGE</span>
              <q-icon name="verified" color="green-4" size="sm" />
            </div>
            <div class="text-h4 text-weight-bolder text-green-4 font-mono q-mt-sm">
              {{ overview.activePoliciesCount || 0 }}
            </div>
            <div class="text-caption text-grey-5 q-mt-xs font-mono">
              Confirmed HMO active policies
            </div>
          </q-card>
        </div>

        <div class="col-12 col-sm-6 col-md-3">
          <q-card class="bg-card-dark border-grey-9 q-pa-md">
            <div class="row items-center justify-between">
              <span class="text-grey-5 text-weight-bold text-caption text-uppercase" style="letter-spacing: 1px;">EXPIRING SOON</span>
              <q-icon name="event_repeat" color="amber-4" size="sm" />
            </div>
            <div class="text-h4 text-weight-bolder text-amber-4 font-mono q-mt-sm">
              {{ overview.expiringSoonCount || 0 }}
            </div>
            <div class="text-caption text-grey-5 q-mt-xs font-mono">
              Expiring in 30 days
            </div>
          </q-card>
        </div>
      </div>

      <!-- Financial Metrics Row -->
      <div class="row q-col-gutter-md q-mb-lg">
        <div class="col-12 col-md-6">
          <q-card class="bg-card-dark border-grey-9 q-pa-md">
            <div class="row items-center justify-between">
              <div>
                <div class="text-caption text-grey-5 text-uppercase letter-spacing-1 font-mono">TOTAL PREMIUMS BILLED</div>
                <div class="text-h4 text-weight-bolder text-white font-mono q-mt-xs">
                  {{ formatNgn(overview.totalPremiumsBilledKobo || 0) }}
                </div>
              </div>
              <q-icon name="receipt_long" color="cyan-3" size="md" />
            </div>
            <div class="text-caption text-grey-5 q-mt-sm">
              Aggregated across all verified invoices across all tenant health modules.
            </div>
          </q-card>
        </div>

        <div class="col-12 col-md-6">
          <q-card class="bg-card-dark border-grey-9 q-pa-md">
            <div class="row items-center justify-between">
              <div>
                <div class="text-caption text-teal-3 text-uppercase letter-spacing-1 font-mono">TOTAL PREMIUMS SETTLED</div>
                <div class="text-h4 text-weight-bolder text-teal-3 font-mono q-mt-xs">
                  {{ formatNgn(overview.totalPremiumsCollectedKobo || 0) }}
                </div>
              </div>
              <q-icon name="account_balance_wallet" color="teal-3" size="md" />
            </div>
            <div class="text-caption text-grey-5 q-mt-sm">
              Reconciled settlement payments credited to platform and tenant escrow.
            </div>
          </q-card>
        </div>
      </div>

      <!-- Coverage Distribution Analytics -->
      <div class="row q-col-gutter-md q-mb-lg">
        <!-- Distribution by Mode -->
        <div class="col-12 col-md-4">
          <q-card class="bg-card-dark border-grey-9 q-pa-md full-height">
            <div class="text-subtitle2 text-weight-bold text-white q-mb-sm row items-center justify-between">
              <span>Coverage by Mode</span>
              <q-icon name="domain" color="teal-4" />
            </div>
            <q-separator color="grey-9" class="q-mb-md" />
            <div v-if="coverageTrends.byMode && coverageTrends.byMode.length" class="q-gutter-y-sm">
              <div v-for="item in coverageTrends.byMode" :key="item.mode" class="row items-center justify-between q-pa-xs">
                <div class="row items-center q-gutter-xs">
                  <q-badge :color="getModeColor(item.mode)" class="text-uppercase font-mono">{{ item.mode }}</q-badge>
                </div>
                <div class="text-right">
                  <span class="text-weight-bold font-mono text-white">{{ item.count }}</span>
                  <span class="text-caption text-grey-5 q-ml-xs">enrolments</span>
                </div>
              </div>
            </div>
            <div v-else class="text-caption text-grey-6 text-center q-pa-md">
              No coverage distribution records recorded yet.
            </div>
          </q-card>
        </div>

        <!-- Enrolment Status Breakdown -->
        <div class="col-12 col-md-4">
          <q-card class="bg-card-dark border-grey-9 q-pa-md full-height">
            <div class="text-subtitle2 text-weight-bold text-white q-mb-sm row items-center justify-between">
              <span>Enrolment Lifecycle Status</span>
              <q-icon name="donut_large" color="cyan-4" />
            </div>
            <q-separator color="grey-9" class="q-mb-md" />
            <div v-if="overview.enrolmentStatusBreakdown && Object.keys(overview.enrolmentStatusBreakdown).length" class="q-gutter-y-sm">
              <div v-for="(cnt, status) in overview.enrolmentStatusBreakdown" :key="status" class="row items-center justify-between q-pa-xs">
                <q-badge :color="getStatusColor(status)" class="text-uppercase font-mono">{{ formatStatus(status) }}</q-badge>
                <div class="text-right">
                  <span class="text-weight-bold font-mono text-white">{{ cnt }}</span>
                  <span class="text-caption text-grey-5 q-ml-xs">members</span>
                </div>
              </div>
            </div>
            <div v-else class="text-caption text-grey-6 text-center q-pa-md">
              No enrolment status records recorded yet.
            </div>
          </q-card>
        </div>

        <!-- Member Category Breakdown -->
        <div class="col-12 col-md-4">
          <q-card class="bg-card-dark border-grey-9 q-pa-md full-height">
            <div class="text-subtitle2 text-weight-bold text-white q-mb-sm row items-center justify-between">
              <span>Member Categories</span>
              <q-icon name="badge" color="indigo-4" />
            </div>
            <q-separator color="grey-9" class="q-mb-md" />
            <div v-if="coverageTrends.byCategory && coverageTrends.byCategory.length" class="q-gutter-y-sm">
              <div v-for="item in coverageTrends.byCategory" :key="item.category" class="row items-center justify-between q-pa-xs">
                <q-badge color="indigo-10" text-color="indigo-2" class="text-uppercase font-mono">{{ item.category }}</q-badge>
                <div class="text-right">
                  <span class="text-weight-bold font-mono text-white">{{ item.count }}</span>
                  <span class="text-caption text-grey-5 q-ml-xs">covered</span>
                </div>
              </div>
            </div>
            <div v-else class="text-caption text-grey-6 text-center q-pa-md">
              No member category records recorded yet.
            </div>
          </q-card>
        </div>
      </div>
    </div>

    <!-- TAB 2: TENANT PARTICIPATION DIRECTORY -->
    <div v-if="activeTab === 'tenants'">
      <q-card class="bg-card-dark border-grey-9 q-pa-md">
        <div class="row items-center justify-between q-mb-md">
          <div class="row items-center q-gutter-sm">
            <q-input
              v-model="tenantSearch"
              dense
              outlined
              dark
              placeholder="Search tenant name or slug..."
              class="bg-dark"
              style="min-width: 280px;"
            >
              <template v-slot:append>
                <q-icon name="search" color="grey-5" />
              </template>
            </q-input>

            <q-select
              v-model="tenantModeFilter"
              :options="['all', 'school', 'retail', 'services']"
              dense
              outlined
              dark
              label="Filter Mode"
              class="bg-dark"
              style="min-width: 140px;"
            />
          </div>

          <div class="text-caption text-grey-5 font-mono">
            Showing {{ filteredTenants.length }} participating tenants (Zero Student PII Exposed)
          </div>
        </div>

        <q-table
          :rows="filteredTenants"
          :columns="tenantColumns"
          row-key="id"
          dark
          flat
          bordered
          :loading="loading"
          :pagination="{ rowsPerPage: 15 }"
          no-data-label="No participating tenants found."
          class="bg-dark text-white border-grey-9 font-mono"
        >
          <template v-slot:body-cell-mode="props">
            <q-td :props="props">
              <q-badge :color="getModeColor(props.value)" class="text-uppercase">
                {{ props.value }}
              </q-badge>
            </q-td>
          </template>

          <template v-slot:body-cell-enrolled_count="props">
            <q-td :props="props" class="text-right">
              <span class="text-weight-bold text-white">{{ props.value }}</span>
            </q-td>
          </template>

          <template v-slot:body-cell-active_count="props">
            <q-td :props="props" class="text-right">
              <span class="text-weight-bold text-teal-3">{{ props.value }}</span>
            </q-td>
          </template>

          <template v-slot:body-cell-expiring_count="props">
            <q-td :props="props" class="text-right">
              <span :class="props.value > 0 ? 'text-amber-3 text-weight-bold' : 'text-grey-6'">
                {{ props.value }}
              </span>
            </q-td>
          </template>

          <template v-slot:body-cell-total_billed="props">
            <q-td :props="props" class="text-right">
              {{ formatNgn(props.value) }}
            </q-td>
          </template>

          <template v-slot:body-cell-total_paid="props">
            <q-td :props="props" class="text-right text-teal-3">
              {{ formatNgn(props.value) }}
            </q-td>
          </template>

          <template v-slot:body-cell-is_enabled="props">
            <q-td :props="props">
              <q-badge :color="props.value ? 'green-10' : 'grey-8'" :text-color="props.value ? 'green-2' : 'grey-4'">
                {{ props.value ? 'HEALTH ENABLED' : 'DISABLED' }}
              </q-badge>
            </q-td>
          </template>
        </q-table>
      </q-card>
    </div>

    <!-- TAB 3: HMO INTEGRATION TELEMETRY -->
    <div v-if="activeTab === 'providers'">
      <div class="row q-col-gutter-md">
        <div v-for="prov in providersHealth" :key="prov.id" class="col-12 col-md-6">
          <q-card class="bg-card-dark border-grey-9 q-pa-md">
            <div class="row items-center justify-between">
              <div class="row items-center q-gutter-sm">
                <q-icon name="local_hospital" color="teal-4" size="md" />
                <div>
                  <div class="text-h6 text-weight-bold text-white">{{ prov.name }}</div>
                  <div class="text-caption text-grey-5 font-mono">Code: {{ prov.code }}</div>
                </div>
              </div>
              <div class="column items-end">
                <q-badge :color="prov.isSandbox ? 'amber-10' : 'green-10'" :text-color="prov.isSandbox ? 'amber-2' : 'green-2'" class="text-weight-bold">
                  {{ prov.isSandbox ? 'SANDBOX ADAPTER' : 'LIVE HMO API' }}
                </q-badge>
                <q-badge :color="prov.isActive ? 'teal-10' : 'red-10'" :text-color="prov.isActive ? 'teal-3' : 'red-3'" class="q-mt-xs">
                  {{ prov.isActive ? 'ACTIVE' : 'SUSPENDED' }}
                </q-badge>
              </div>
            </div>

            <q-separator color="grey-9" class="q-my-md" />

            <!-- Telemetry Metrics -->
            <div class="row q-col-gutter-sm q-mb-md font-mono text-caption">
              <div class="col-4">
                <div class="text-grey-5">ACTIVE PLANS</div>
                <div class="text-subtitle1 text-white text-weight-bold">{{ prov.activePlansCount || 0 }}</div>
              </div>
              <div class="col-4">
                <div class="text-grey-5">API INTEGRATION</div>
                <div class="text-subtitle1 text-teal-3 text-weight-bold">
                  {{ prov.integrationStatus || 'VERIFIED' }}
                </div>
              </div>
              <div class="col-4">
                <div class="text-grey-5">TELEMETRY</div>
                <div class="text-subtitle1 text-grey-4">
                  {{ prov.lastVerifiedAt ? formatDate(prov.lastVerifiedAt) : 'Live / Active' }}
                </div>
              </div>
            </div>

            <!-- Supported Capabilities -->
            <div class="q-mt-sm">
              <div class="text-caption text-grey-5 text-weight-bold q-mb-xs">SUPPORTED CAPABILITIES</div>
              <div class="row q-gutter-xs">
                <q-badge
                  v-for="cap in (prov.capabilities || ['auto_verification', 'claims_lookup', 'digital_id_card'])"
                  :key="cap"
                  color="grey-9"
                  text-color="teal-2"
                  class="font-mono text-caption"
                >
                  {{ cap }}
                </q-badge>
              </div>
            </div>
          </q-card>
        </div>

        <div v-if="!providersHealth.length" class="col-12">
          <q-card class="bg-card-dark border-grey-9 q-pa-lg text-center">
            <q-icon name="hub" color="grey-6" size="xl" />
            <div class="text-subtitle1 text-grey-4 q-mt-sm">No HMO Provider Registry Records Found</div>
            <div class="text-caption text-grey-6">Providers configured in `hw_providers` will appear here with live health telemetry.</div>
          </q-card>
        </div>
      </div>
    </div>

    <!-- TAB 4: ACCESS GRANTS MANAGER -->
    <div v-if="activeTab === 'grants'">
      <q-card class="bg-card-dark border-grey-9 q-pa-md">
        <div class="row items-center justify-between q-mb-md">
          <div>
            <div class="text-subtitle1 text-weight-bold text-white">Platform Operator Grants (`hw_platform_grants`)</div>
            <div class="text-caption text-grey-5">
              Explicit, time-bounded privileges granting super admins operational access to platform health data.
            </div>
          </div>
          <q-btn
            unelevated
            color="teal-4"
            text-color="dark"
            icon="add"
            label="Create New Grant"
            @click="showCreateGrantDialog = true"
            class="text-weight-bold text-caption font-mono"
          />
        </div>

        <q-table
          :rows="grantsList"
          :columns="grantColumns"
          row-key="id"
          dark
          flat
          bordered
          :loading="loading"
          :pagination="{ rowsPerPage: 10 }"
          no-data-label="No platform operator grants recorded."
          class="bg-dark text-white border-grey-9 font-mono"
        >
          <template v-slot:body-cell-permission="props">
            <q-td :props="props">
              <q-badge color="teal-10" text-color="teal-2" class="font-mono text-weight-bold">
                {{ props.value }}
              </q-badge>
            </q-td>
          </template>

          <template v-slot:body-cell-status="props">
            <q-td :props="props">
              <q-badge
                :color="props.row.revoked_at ? 'red-10' : isExpired(props.row.expires_at) ? 'grey-8' : 'green-10'"
                :text-color="props.row.revoked_at ? 'red-2' : isExpired(props.row.expires_at) ? 'grey-4' : 'green-2'"
                class="font-mono"
              >
                {{ props.row.revoked_at ? 'REVOKED' : isExpired(props.row.expires_at) ? 'EXPIRED' : 'ACTIVE' }}
              </q-badge>
            </q-td>
          </template>

          <template v-slot:body-cell-granted_at="props">
            <q-td :props="props">
              {{ formatDate(props.value) }}
            </q-td>
          </template>

          <template v-slot:body-cell-expires_at="props">
            <q-td :props="props">
              {{ formatDate(props.value) }}
            </q-td>
          </template>

          <template v-slot:body-cell-actions="props">
            <q-td :props="props" class="text-right">
              <q-btn
                v-if="!props.row.revoked_at && !isExpired(props.row.expires_at)"
                dense
                flat
                size="sm"
                color="red-4"
                label="Revoke"
                @click="openRevokeDialog(props.row)"
              />
              <span v-else class="text-grey-6 text-caption">—</span>
            </q-td>
          </template>
        </q-table>
      </q-card>
    </div>

    <!-- TAB 5: AUDIT EVENTS -->
    <div v-if="activeTab === 'audit'">
      <q-card class="bg-card-dark border-grey-9 q-pa-md">
        <div class="row items-center justify-between q-mb-md">
          <div>
            <div class="text-subtitle1 text-weight-bold text-white">Immutable Platform Audit Events (`hw_audit_events`)</div>
            <div class="text-caption text-grey-5">
              Cryptographically timestamped log of all health operations, grants, and operator actions.
            </div>
          </div>
          <div class="row q-gutter-sm items-center">
            <q-select
              v-model="auditActionFilter"
              :options="['all', 'grant_created', 'grant_revoked', 'session_activated', 'policy_activated', 'status_sync', 'provider_created']"
              dense
              outlined
              dark
              label="Action Filter"
              class="bg-dark"
              style="min-width: 170px;"
            />
          </div>
        </div>

        <q-table
          :rows="filteredAuditEvents"
          :columns="auditColumns"
          row-key="id"
          dark
          flat
          bordered
          :loading="loading"
          :pagination="{ rowsPerPage: 15 }"
          no-data-label="No platform health audit events recorded."
          class="bg-dark text-white border-grey-9 font-mono text-caption"
        >
          <template v-slot:body-cell-occurred_at="props">
            <q-td :props="props">
              {{ formatDate(props.value) }}
            </q-td>
          </template>

          <template v-slot:body-cell-action="props">
            <q-td :props="props">
              <q-badge color="indigo-10" text-color="indigo-2" class="font-mono text-weight-bold">
                {{ props.value }}
              </q-badge>
            </q-td>
          </template>

          <template v-slot:body-cell-platform_reason="props">
            <q-td :props="props">
              <span class="text-grey-3">{{ props.value || 'N/A' }}</span>
            </q-td>
          </template>

          <template v-slot:body-cell-changes="props">
            <q-td :props="props">
              <span class="text-grey-4">{{ summarizeChanges(props.value) }}</span>
            </q-td>
          </template>
        </q-table>
      </q-card>
    </div>

    <!-- DIALOG: SELF-ACTIVATE OPERATIONAL SESSION -->
    <q-dialog v-model="showActivateSessionDialog" persistent>
      <q-card class="bg-card-dark text-white border-grey-9" style="min-width: 480px; max-width: 600px;">
        <q-card-section class="row items-center justify-between">
          <div class="text-h6 text-weight-bold text-teal-3 row items-center q-gutter-xs">
            <q-icon name="key" color="teal-3" />
            <span>Self-Activate Operational Session</span>
          </div>
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="q-pt-none">
          <div class="text-caption text-grey-4 q-mb-md">
            As a verified Super Admin, you can self-activate an operational grant session to query platform health governance data.
            This action creates an immutable record in <code class="text-amber-3">hw_audit_events</code>.
          </div>

          <div class="q-gutter-y-md">
            <div>
              <div class="text-caption text-grey-5 q-mb-xs font-mono">DURATION (MINUTES)</div>
              <q-select
                v-model="sessionForm.durationMinutes"
                :options="[15, 30, 60, 120, 240, 480]"
                dense
                outlined
                dark
                class="bg-dark"
              />
            </div>

            <div>
              <div class="text-caption text-grey-5 q-mb-xs font-mono">OPERATIONAL JUSTIFICATION (MANDATORY)</div>
              <q-input
                v-model="sessionForm.reason"
                type="textarea"
                rows="3"
                dense
                outlined
                dark
                class="bg-dark font-mono text-caption"
                placeholder="Describe why platform-level health data access is required (e.g. 'Investigating HMO claims webhook discrepancy for St. Jude Academy')"
              />
              <div class="text-caption text-grey-6 q-mt-xs">
                Minimum 6 characters required. Will be logged in `hw_audit_events`.
              </div>
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancel" color="grey-5" v-close-popup />
          <q-btn
            unelevated
            color="teal-4"
            text-color="dark"
            label="Activate Session"
            :loading="activatingSession"
            :disable="!sessionForm.reason || sessionForm.reason.trim().length < 6"
            @click="submitSelfActivate"
            class="text-weight-bold font-mono"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- DIALOG: CREATE GRANT -->
    <q-dialog v-model="showCreateGrantDialog" persistent>
      <q-card class="bg-card-dark text-white border-grey-9" style="min-width: 480px; max-width: 600px;">
        <q-card-section class="row items-center justify-between">
          <div class="text-h6 text-weight-bold text-teal-3 row items-center q-gutter-xs">
            <q-icon name="add_moderator" color="teal-3" />
            <span>Grant Platform Operator Privileges</span>
          </div>
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="q-pt-none">
          <div class="text-caption text-grey-4 q-mb-md">
            Assign explicit, time-bounded health governance permission to an operator in <code class="text-teal-3">hw_platform_grants</code>.
          </div>

          <div class="q-gutter-y-md">
            <div>
              <div class="text-caption text-grey-5 q-mb-xs font-mono">OPERATOR USER ID (UUID)</div>
              <q-input
                v-model="createGrantForm.userId"
                dense
                outlined
                dark
                class="bg-dark font-mono"
                placeholder="e.g. 00000000-0000-0000-0000-000000000000"
              />
            </div>

            <div>
              <div class="text-caption text-grey-5 q-mb-xs font-mono">PLATFORM PERMISSION</div>
              <q-select
                v-model="createGrantForm.permission"
                :options="[
                  'platform.integration.health',
                  'platform.tenant_access',
                  'platform.providers.manage',
                  'platform.plans.manage',
                  'platform.tenants.onboard'
                ]"
                dense
                outlined
                dark
                class="bg-dark font-mono"
              />
            </div>

            <div>
              <div class="text-caption text-grey-5 q-mb-xs font-mono">DURATION (MINUTES)</div>
              <q-select
                v-model="createGrantForm.durationMinutes"
                :options="[30, 60, 120, 240, 480, 1440]"
                dense
                outlined
                dark
                class="bg-dark"
              />
            </div>

            <div>
              <div class="text-caption text-grey-5 q-mb-xs font-mono">JUSTIFICATION REASON (MANDATORY)</div>
              <q-input
                v-model="createGrantForm.reason"
                type="textarea"
                rows="2"
                dense
                outlined
                dark
                class="bg-dark font-mono text-caption"
                placeholder="Specify justification for operator elevation"
              />
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancel" color="grey-5" v-close-popup />
          <q-btn
            unelevated
            color="teal-4"
            text-color="dark"
            label="Grant Privileges"
            :loading="creatingGrant"
            :disable="!createGrantForm.userId || !createGrantForm.reason || createGrantForm.reason.trim().length < 6"
            @click="submitCreateGrant"
            class="text-weight-bold font-mono"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- DIALOG: REVOKE GRANT -->
    <q-dialog v-model="showRevokeGrantDialog" persistent>
      <q-card class="bg-card-dark text-white border-grey-9" style="min-width: 440px;">
        <q-card-section class="row items-center justify-between">
          <div class="text-h6 text-weight-bold text-red-4 row items-center q-gutter-xs">
            <q-icon name="gavel" color="red-4" />
            <span>Revoke Platform Grant</span>
          </div>
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="q-pt-none">
          <div class="text-caption text-grey-4 q-mb-md">
            Immediately revoke grant for permission <strong class="text-white">{{ activeRevokeGrant?.permission }}</strong>.
          </div>

          <div>
            <div class="text-caption text-grey-5 q-mb-xs font-mono">REVOCATION REASON (MANDATORY)</div>
            <q-input
              v-model="revokeReason"
              type="textarea"
              rows="2"
              dense
              outlined
              dark
              class="bg-dark font-mono text-caption"
              placeholder="e.g. Audit completed, operator role changed, session decommissioned"
            />
          </div>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancel" color="grey-5" v-close-popup />
          <q-btn
            unelevated
            color="red-6"
            label="Revoke Immediately"
            :loading="revokingGrant"
            :disable="!revokeReason || revokeReason.trim().length < 6"
            @click="submitRevokeGrant"
            class="text-weight-bold font-mono"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { healthInsuranceApi } from 'src/api/healthInsuranceApi';

export default {
  name: 'HealthInsuranceGovernancePage',
  setup() {
    const $q = useQuasar();

    const loading = ref(false);
    const activatingSession = ref(false);
    const creatingGrant = ref(false);
    const revokingGrant = ref(false);

    const errorMessage = ref('');
    const activeTab = ref('overview');

    const activePlatformReason = ref(
      sessionStorage.getItem('hw_platform_reason') || 'Routine platform health governance audit'
    );

    const grantStatus = ref({
      hasActiveGrant: false,
      activeGrants: []
    });

    const overview = ref({
      totalEnabledTenants: 0,
      totalDistinctMembers: 0,
      activePoliciesCount: 0,
      expiringSoonCount: 0,
      totalPremiumsBilledKobo: 0,
      totalPremiumsCollectedKobo: 0,
      enrolmentStatusBreakdown: {}
    });

    const coverageTrends = ref({
      byMode: [],
      byCategory: [],
      byStatus: []
    });

    const tenantsList = ref([]);
    const tenantSearch = ref('');
    const tenantModeFilter = ref('all');

    const providersHealth = ref([]);
    const grantsList = ref([]);
    const auditEvents = ref([]);
    const auditActionFilter = ref('all');

    // Dialog state
    const showActivateSessionDialog = ref(false);
    const sessionForm = ref({
      durationMinutes: 60,
      reason: 'Routine platform health governance audit'
    });

    const showCreateGrantDialog = ref(false);
    const createGrantForm = ref({
      userId: '',
      permission: 'platform.read',
      durationMinutes: 60,
      reason: ''
    });

    const showRevokeGrantDialog = ref(false);
    const activeRevokeGrant = ref(null);
    const revokeReason = ref('');

    // Table columns
    const tenantColumns = [
      { name: 'name', label: 'TENANT NAME', field: 'name', align: 'left', sortable: true },
      { name: 'slug', label: 'SLUG', field: 'slug', align: 'left', sortable: true },
      { name: 'mode', label: 'MODE', field: 'mode', align: 'center', sortable: true },
      { name: 'enrolled_count', label: 'ENROLLED', field: 'enrolled_count', align: 'right', sortable: true },
      { name: 'active_count', label: 'ACTIVE COVERED', field: 'active_count', align: 'right', sortable: true },
      { name: 'expiring_count', label: 'EXPIRING (30D)', field: 'expiring_count', align: 'right', sortable: true },
      { name: 'total_billed', label: 'TOTAL BILLED', field: 'total_billed_kobo', align: 'right', sortable: true },
      { name: 'total_paid', label: 'TOTAL COLLECTED', field: 'total_paid_kobo', align: 'right', sortable: true },
      { name: 'is_enabled', label: 'STATUS', field: 'is_enabled', align: 'center', sortable: true }
    ];

    const grantColumns = [
      { name: 'user_id', label: 'OPERATOR USER ID', field: 'user_id', align: 'left' },
      { name: 'permission', label: 'PERMISSION', field: 'permission', align: 'left', sortable: true },
      { name: 'status', label: 'STATUS', field: 'id', align: 'center' },
      { name: 'granted_at', label: 'GRANTED AT', field: 'granted_at', align: 'left', sortable: true },
      { name: 'expires_at', label: 'EXPIRES AT', field: 'expires_at', align: 'left', sortable: true },
      { name: 'actions', label: 'ACTION', field: 'id', align: 'right' }
    ];

    const auditColumns = [
      { name: 'occurred_at', label: 'TIMESTAMP', field: 'occurred_at', align: 'left', sortable: true },
      { name: 'action', label: 'ACTION', field: 'action', align: 'left', sortable: true },
      { name: 'resource_type', label: 'RESOURCE', field: 'resource_type', align: 'left' },
      { name: 'actor_role', label: 'ACTOR ROLE', field: 'actor_role', align: 'left' },
      { name: 'platform_reason', label: 'PLATFORM REASON', field: 'platform_reason', align: 'left' },
      { name: 'changes', label: 'DETAILS', field: 'changes', align: 'left' }
    ];

    // Computed filters
    const filteredTenants = computed(() => {
      let res = tenantsList.value || [];
      if (tenantModeFilter.value && tenantModeFilter.value !== 'all') {
        res = res.filter(t => (t.mode || '').toLowerCase() === tenantModeFilter.value.toLowerCase());
      }
      if (tenantSearch.value && tenantSearch.value.trim()) {
        const q = tenantSearch.value.trim().toLowerCase();
        res = res.filter(t =>
          (t.name || '').toLowerCase().includes(q) ||
          (t.slug || '').toLowerCase().includes(q)
        );
      }
      return res;
    });

    const filteredAuditEvents = computed(() => {
      let res = auditEvents.value || [];
      if (auditActionFilter.value && auditActionFilter.value !== 'all') {
        res = res.filter(a => a.action === auditActionFilter.value);
      }
      return res;
    });

    const grantRemainingMinutes = computed(() => {
      const active = (grantStatus.value.activeGrants || [])[0];
      if (!active || !active.expires_at) return 0;
      const diff = new Date(active.expires_at).getTime() - Date.now();
      return Math.max(0, Math.floor(diff / (1000 * 60)));
    });

    // Formatting helpers
    const formatNgn = (kobo) => {
      const val = (Number(kobo) || 0) / 100;
      return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(val);
    };

    const formatDate = (val) => {
      if (!val) return '—';
      try {
        return new Date(val).toLocaleString('en-GB', {
          year: 'numeric',
          month: 'short',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch {
        return val;
      }
    };

    const isExpired = (expiryDate) => {
      if (!expiryDate) return false;
      return new Date(expiryDate).getTime() < Date.now();
    };

    const formatStatus = (s) => {
      if (!s) return '';
      return s.replace(/_/g, ' ');
    };

    const getStatusColor = (status) => {
      const map = {
        active: 'teal-10',
        approved: 'green-10',
        pending_verification: 'amber-10',
        cancelled: 'red-10',
        lapsed: 'grey-9'
      };
      return map[status] || 'grey-8';
    };

    const getModeColor = (mode) => {
      const m = (mode || '').toLowerCase();
      if (m === 'school') return 'teal-9';
      if (m === 'retail') return 'cyan-9';
      if (m === 'services') return 'purple-9';
      return 'grey-8';
    };

    const summarizeChanges = (changes) => {
      if (!changes) return '—';
      if (typeof changes === 'string') return changes;
      try {
        return JSON.stringify(changes);
      } catch {
        return '—';
      }
    };

    // Prompt change reason
    const promptChangeReason = () => {
      $q.dialog({
        title: 'Update Platform Operational Reason',
        message: 'Provide justification for subsequent platform telemetry requests:',
        prompt: {
          model: activePlatformReason.value,
          type: 'text'
        },
        cancel: true,
        persistent: true
      }).onOk(data => {
        if (data && data.trim().length >= 6) {
          activePlatformReason.value = data.trim();
          sessionStorage.setItem('hw_platform_reason', data.trim());
          $q.notify({ type: 'positive', message: 'Operational reason updated.' });
          loadAll();
        } else {
          $q.notify({ type: 'warning', message: 'Reason must be at least 6 characters.' });
        }
      });
    };

    // API actions
    const checkGrantStatus = async () => {
      try {
        const res = await healthInsuranceApi.getMyGrantStatus();
        if (res.data?.success) {
          grantStatus.value = res.data.data;
        }
      } catch (err) {
        console.warn('Could not verify platform grant status:', err);
      }
    };

    const loadAll = async () => {
      loading.value = true;
      errorMessage.value = '';
      try {
        await checkGrantStatus();

        // If grant active, load platform telemetry
        if (grantStatus.value.hasActiveGrant) {
          const reason = activePlatformReason.value;

          const [ovRes, tenRes, provRes, trRes, grRes, audRes] = await Promise.allSettled([
            healthInsuranceApi.getPlatformOverview(reason),
            healthInsuranceApi.getPlatformTenants({}, reason),
            healthInsuranceApi.getProvidersHealth(reason),
            healthInsuranceApi.getCoverageTrends(reason),
            healthInsuranceApi.getPlatformGrants({}, reason),
            healthInsuranceApi.getPlatformAuditEvents({ limit: 50 }, reason)
          ]);

          if (ovRes.status === 'fulfilled' && ovRes.value.data?.success) {
            overview.value = ovRes.value.data.data;
          }
          if (tenRes.status === 'fulfilled' && tenRes.value.data?.success) {
            tenantsList.value = tenRes.value.data.data?.tenants || [];
          }
          if (provRes.status === 'fulfilled' && provRes.value.data?.success) {
            providersHealth.value = provRes.value.data.data || [];
          }
          if (trRes.status === 'fulfilled' && trRes.value.data?.success) {
            coverageTrends.value = trRes.value.data.data || { byMode: [], byCategory: [], byStatus: [] };
          }
          if (grRes.status === 'fulfilled' && grRes.value.data?.success) {
            grantsList.value = grRes.value.data.data?.grants || [];
          }
          if (audRes.status === 'fulfilled' && audRes.value.data?.success) {
            auditEvents.value = audRes.value.data.data?.events || [];
          }
        }
      } catch (err) {
        errorMessage.value = err?.response?.data?.message || err.message || 'Error loading platform governance data.';
      } finally {
        loading.value = false;
      }
    };

    const submitSelfActivate = async () => {
      activatingSession.value = true;
      try {
        const res = await healthInsuranceApi.selfActivateGrant({
          durationMinutes: sessionForm.value.durationMinutes,
          reason: sessionForm.value.reason
        });

        if (res.data?.success) {
          $q.notify({
            type: 'positive',
            message: 'Operational session activated successfully.'
          });
          sessionStorage.setItem('hw_platform_reason', sessionForm.value.reason);
          activePlatformReason.value = sessionForm.value.reason;
          showActivateSessionDialog.value = false;
          await loadAll();
        } else {
          $q.notify({
            type: 'negative',
            message: res.data?.message || 'Failed to activate session.'
          });
        }
      } catch (err) {
        $q.notify({
          type: 'negative',
          message: err?.response?.data?.message || 'Error activating operational grant session.'
        });
      } finally {
        activatingSession.value = false;
      }
    };

    const submitCreateGrant = async () => {
      creatingGrant.value = true;
      try {
        const res = await healthInsuranceApi.createPlatformGrant({
          userId: createGrantForm.value.userId,
          permission: createGrantForm.value.permission,
          durationMinutes: createGrantForm.value.durationMinutes,
          reason: createGrantForm.value.reason
        }, activePlatformReason.value);

        if (res.data?.success) {
          $q.notify({
            type: 'positive',
            message: 'Platform operator grant created successfully.'
          });
          showCreateGrantDialog.value = false;
          createGrantForm.value = {
            userId: '',
            permission: 'platform.read',
            durationMinutes: 60,
            reason: ''
          };
          await loadAll();
        } else {
          $q.notify({
            type: 'negative',
            message: res.data?.message || 'Failed to create grant.'
          });
        }
      } catch (err) {
        $q.notify({
          type: 'negative',
          message: err?.response?.data?.message || 'Error creating platform grant.'
        });
      } finally {
        creatingGrant.value = false;
      }
    };

    const openRevokeDialog = (grant) => {
      activeRevokeGrant.value = grant;
      revokeReason.value = '';
      showRevokeGrantDialog.value = true;
    };

    const submitRevokeGrant = async () => {
      if (!activeRevokeGrant.value) return;
      revokingGrant.value = true;
      try {
        const res = await healthInsuranceApi.revokePlatformGrant(
          activeRevokeGrant.value.id,
          { reason: revokeReason.value },
          activePlatformReason.value
        );

        if (res.data?.success) {
          $q.notify({
            type: 'positive',
            message: 'Platform grant revoked successfully.'
          });
          showRevokeGrantDialog.value = false;
          activeRevokeGrant.value = null;
          await loadAll();
        } else {
          $q.notify({
            type: 'negative',
            message: res.data?.message || 'Failed to revoke grant.'
          });
        }
      } catch (err) {
        $q.notify({
          type: 'negative',
          message: err?.response?.data?.message || 'Error revoking grant.'
        });
      } finally {
        revokingGrant.value = false;
      }
    };

    onMounted(() => {
      loadAll();
    });

    return {
      loading,
      activatingSession,
      creatingGrant,
      revokingGrant,
      errorMessage,
      activeTab,
      activePlatformReason,
      grantStatus,
      overview,
      coverageTrends,
      tenantsList,
      tenantSearch,
      tenantModeFilter,
      providersHealth,
      grantsList,
      auditEvents,
      auditActionFilter,
      showActivateSessionDialog,
      sessionForm,
      showCreateGrantDialog,
      createGrantForm,
      showRevokeGrantDialog,
      activeRevokeGrant,
      revokeReason,
      tenantColumns,
      grantColumns,
      auditColumns,
      filteredTenants,
      filteredAuditEvents,
      grantRemainingMinutes,
      formatNgn,
      formatDate,
      isExpired,
      formatStatus,
      getStatusColor,
      getModeColor,
      summarizeChanges,
      promptChangeReason,
      loadAll,
      submitSelfActivate,
      submitCreateGrant,
      openRevokeDialog,
      submitRevokeGrant
    };
  }
};
</script>

<style scoped>
.bg-card-dark {
  background: #0d121f;
  border-radius: 8px;
}
.border-grey-9 {
  border: 1px solid #1e2638;
}
.letter-spacing-1 {
  letter-spacing: 0.05em;
}
.font-mono {
  font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', Courier, monospace;
}
</style>
