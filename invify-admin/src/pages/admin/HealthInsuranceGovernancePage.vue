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
            <q-tooltip>Platform staff shell. It does not bypass health grants.</q-tooltip>
          </q-badge>
          <q-badge v-if="grantStatus.hasActiveGrant" color="green-10" text-color="green-3" class="text-weight-bold">
            SESSION ACTIVE
            <q-tooltip>An unexpired platform grant was returned by /platform/my-grant-status.</q-tooltip>
          </q-badge>
          <q-badge v-else color="amber-10" text-color="amber-3" class="text-weight-bold">
            GRANT REQUIRED
            <q-tooltip>Cross-tenant metrics stay hidden until an independent administrator has issued an unexpired hw_platform_grants row. Activate Operational Session only works after that grant exists.</q-tooltip>
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
          icon="inventory_2"
          label="Health Plans"
          to="/hmo/plans"
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
      v-if="hasActiveDurableEntitlement"
      dense
      rounded
      class="bg-green-10 text-green-2 q-mb-lg"
      style="border: 1px solid rgba(34, 197, 94, 0.35);"
    >
      <div class="text-caption">
        A durable platform entitlement is active. It is not an eight-hour grant. Suspended and revoked entitlements do not authorize access, and this screen does not issue, suspend, or revoke the entitlement.
      </div>
    </q-banner>
    <q-banner
      v-if="!grantStatus.hasActiveGrant && !hasActiveDurableEntitlement"
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
          Each cross-tenant read requires its own unexpired hw_platform_grants row, issued by an independent administrator. Activating a session records an audit reason. It does not create or renew a grant.
          <span v-if="inactiveGrantSummary"> {{ inactiveGrantSummary }}</span>
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
      v-else-if="String(activePlatformReason || '').trim().length < 5"
      dense
      rounded
      class="bg-amber-10 text-amber-2 q-mb-lg border-amber"
      style="border: 1px solid rgba(245, 158, 11, 0.4);"
    >
      <template v-slot:avatar>
        <q-icon name="edit_note" color="amber-3" />
      </template>
      <div class="row items-center justify-between full-width">
        <div class="text-caption">
          An unexpired platform grant is present. Cross-tenant reads stay blocked until you record an operational audit reason of at least 5 characters. Recording the reason does not create or renew a grant.
        </div>
        <q-btn dense flat color="amber-2" label="Set audit reason" class="text-weight-bold" @click="promptChangeReason" />
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
      <q-banner v-if="overviewState === 'withheld'" dense rounded class="bg-amber-10 text-amber-2 q-mb-md">
        Metrics are withheld. An active platform.integration.health grant was not confirmed, so these totals are not displayed as zero.
      </q-banner>
      <q-banner v-else-if="overviewState === 'error'" dense rounded class="bg-red-10 text-red-2 q-mb-md">
        The overview API failed{{ overviewError ? `: ${overviewError}` : '' }}. Totals are not shown.
      </q-banner>
      <div v-else-if="overviewState === 'loaded'" class="row q-col-gutter-md q-mb-lg">
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
      <div v-if="overviewState === 'loaded'" class="row q-col-gutter-md q-mb-lg">
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
          no-data-label="No participating tenants were returned. If the request failed, the banner above the overview explains the denial or API error."
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
                <q-badge :color="prov.isSandbox ? 'amber-10' : 'grey-9'" :text-color="prov.isSandbox ? 'amber-2' : 'grey-3'" class="text-weight-bold">
                  {{ prov.telemetryStatus || prov.integrationStatus || 'Unknown' }}
                </q-badge>
                <q-badge :color="prov.isActive ? 'teal-10' : 'grey-9'" :text-color="prov.isActive ? 'teal-3' : 'grey-4'" class="q-mt-xs">
                  {{ prov.isActive ? 'ADAPTER REACHABLE' : 'NOT VERIFIED' }}
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
                  {{ prov.lastVerifiedAt ? formatDate(prov.lastVerifiedAt) : 'Not verified' }}
                </div>
              </div>
            </div>

            <!-- Supported Capabilities -->
            <div class="q-mt-sm">
              <div class="text-caption text-grey-5 text-weight-bold q-mb-xs">SUPPORTED CAPABILITIES</div>
              <div class="row q-gutter-xs">
                <q-badge
                  v-for="cap in (prov.capabilities || [])"
                  :key="cap"
                  color="grey-9"
                  text-color="teal-2"
                  class="font-mono text-caption"
                >
                  {{ cap }}
                </q-badge>
                <span v-if="!(prov.capabilities || []).length" class="text-caption text-grey-6">No capabilities recorded</span>
              </div>
            </div>
          </q-card>
        </div>

        <div v-if="telemetryOutcome !== 'ok'" class="col-12">
          <q-card class="bg-card-dark border-grey-9 q-pa-lg text-center">
            <q-icon name="hub" color="grey-6" size="xl" />
            <div class="text-subtitle1 text-grey-4 q-mt-sm">{{ telemetryMessage.title }}</div>
            <div class="text-caption text-grey-6">{{ telemetryMessage.detail }}</div>
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
          :no-data-label="grantsEmptyLabel"
          class="bg-dark text-white border-grey-9 font-mono"
        >
          <template v-slot:body-cell-user_id="props">
            <q-td :props="props">
              <span class="text-white font-mono text-caption">{{ props.value || props.row.user_id || props.row.userId || '—' }}</span>
            </q-td>
          </template>

          <template v-slot:body-cell-email="props">
            <q-td :props="props">
              <span class="text-teal-2 font-mono text-caption">{{ props.value || props.row.email || props.row.userEmail || props.row.user_email || '—' }}</span>
            </q-td>
          </template>

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
                :color="(props.row.revoked_at || props.row.revokedAt) ? 'red-10' : isExpired(props.row.expires_at || props.row.expiresAt) ? 'grey-8' : 'green-10'"
                :text-color="(props.row.revoked_at || props.row.revokedAt) ? 'red-2' : isExpired(props.row.expires_at || props.row.expiresAt) ? 'grey-4' : 'green-2'"
                class="font-mono"
              >
                {{ (props.row.revoked_at || props.row.revokedAt) ? 'REVOKED' : isExpired(props.row.expires_at || props.row.expiresAt) ? 'EXPIRED' : 'ACTIVE' }}
              </q-badge>
            </q-td>
          </template>

          <template v-slot:body-cell-granted_at="props">
            <q-td :props="props">
              {{ formatDate(props.value || props.row.granted_at || props.row.grantedAt) }}
            </q-td>
          </template>

          <template v-slot:body-cell-expires_at="props">
            <q-td :props="props">
              {{ formatDate(props.value || props.row.expires_at || props.row.expiresAt) }}
            </q-td>
          </template>

          <template v-slot:body-cell-actions="props">
            <q-td :props="props" class="text-right">
              <q-btn
                v-if="!(props.row.revoked_at || props.row.revokedAt) && !isExpired(props.row.expires_at || props.row.expiresAt)"
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
          :no-data-label="auditEmptyLabel"
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
            Session activation records <code class="text-amber-3">platform.session.activated</code> in hw_audit_events.
            It works only when an independent administrator has already issued the selected permission. It does not create a grant, and it does not extend that grant's expiry.
          </div>

          <div class="q-gutter-y-md">
            <div>
              <div class="text-caption text-grey-5 q-mb-xs font-mono">PERMISSION ALREADY ISSUED TO THIS ACCOUNT</div>
              <q-select
                v-model="sessionForm.permission"
                :options="heldGrantOptions"
                dense
                outlined
                dark
                class="bg-dark font-mono"
                :disable="!heldGrantOptions.length"
              />
              <div v-if="!heldGrantOptions.length" class="text-caption text-amber-3 q-mt-xs">
                No unexpired platform grant is on this account. Ask an administrator who holds platform.tenant_access to issue one for this user. Self-activation cannot do that.
              </div>
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
                At least 5 characters. The text is stored on the platform.session.activated audit event.
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
            :disable="!heldGrantOptions.length || !sessionForm.permission || !sessionForm.reason || sessionForm.reason.trim().length < 5"
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
            <template v-if="grantTargetIsDesignated">
              This issues a durable entitlement for the designated platform administrator. A different active super administrator can do this without platform.tenant_access. It does not expire, and it does not include payout authority. An administrator cannot approve their own entitlement.
            </template>
            <template v-else>
              Assign an explicit, time-bounded permission in <code class="text-teal-3">hw_platform_grants</code>.
              This call requires your own unexpired platform.tenant_access grant, an audit reason, and a different user. An administrator cannot approve a grant for themselves.
            </template>
          </div>

          <div class="q-gutter-y-md">
            <div>
              <div class="text-caption text-grey-5 q-mb-xs font-mono">OPERATOR USER ID (UUID)</div>
              <q-select
                v-model="createGrantForm.userId"
                :options="filteredGrantOperators"
                use-input
                fill-input
                hide-selected
                input-debounce="0"
                emit-value
                map-options
                option-value="id"
                option-label="label"
                dense
                outlined
                dark
                class="bg-dark font-mono"
                :loading="loadingGrantOperators"
                :disable="loadingGrantOperators || !grantOperatorOptions.length"
                label="Search by email, role, or id"
                @filter="filterGrantOperators"
              >
                <template v-slot:no-option>
                  <q-item>
                    <q-item-section class="text-grey">No administrator matches that search.</q-item-section>
                  </q-item>
                </template>
              </q-select>
              <div v-if="grantOperatorError" class="text-caption text-negative q-mt-xs">{{ grantOperatorError }}</div>
              <div v-else-if="!loadingGrantOperators && !grantOperatorOptions.length" class="text-caption text-amber-3 q-mt-xs">
                No other active administrator account was returned. Your own account is not listed.
              </div>
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

            <div v-if="!grantTargetIsDesignated">
              <div class="text-caption text-grey-5 q-mb-xs font-mono">DURATION (MINUTES)</div>
              <q-select
                v-model="createGrantForm.durationMinutes"
                :options="[30, 60, 120, 240, 480]"
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
            :disable="!createGrantForm.userId || !createGrantForm.reason || createGrantForm.reason.trim().length < 5"
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
import { ref, computed, onMounted, watch } from 'vue';
import { useQuasar } from 'quasar';
import { healthInsuranceApi } from 'src/api/healthInsuranceApi';
import { classifyTelemetryOutcome, normalizeProviderHealthPayload, unwrapPlatformBody } from 'src/hmo/telemetryState';
import { DESIGNATED_PLATFORM_ADMIN_USER_ID, INTEGRATION_GRANT, TENANT_ACCESS_GRANT, grantOperatorLabel, hasActiveDurable, hasGrant } from 'src/hmo/overviewState';

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

    const activePlatformReason = ref(sessionStorage.getItem('hw_platform_reason') || '');

    const grantStatus = ref({
      hasActiveGrant: false,
      durableEntitlements: [],
      activeGrants: [],
      inactiveGrants: []
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
    const telemetryOutcome = ref('loading');
    const telemetryDetail = ref('');
    const overviewState = ref('loading');
    const overviewError = ref('');
    const grantsState = ref('loading');
    const auditState = ref('loading');
    const grantsList = ref([]);
    const auditEvents = ref([]);
    const auditActionFilter = ref('all');

    // Dialog state
    const showActivateSessionDialog = ref(false);
    const sessionForm = ref({
      permission: 'platform.integration.health',
      reason: ''
    });
    const heldGrantOptions = computed(() => {
      const grants = (grantStatus.value.activeGrants || []).map((grant) => grant && grant.permission).filter(Boolean);
      const durable = (grantStatus.value.durableEntitlements || [])
        .filter((row) => row && row.status === 'active')
        .map((row) => row.permission);
      return [...new Set([...grants, ...durable])];
    });
    const hasActiveDurableEntitlement = computed(() =>
      (grantStatus.value.durableEntitlements || []).some((row) => row && row.status === 'active')
    );

    const showCreateGrantDialog = ref(false);
    const createGrantForm = ref({
      userId: '',
      permission: 'platform.integration.health',
      durationMinutes: 60,
      reason: ''
    });
    const grantOperators = ref([]);
    const filteredGrantOperators = ref([]);
    const loadingGrantOperators = ref(false);
    const grantOperatorError = ref('');
    const grantOperatorOptions = computed(() => grantOperators.value);
    const grantTargetIsDesignated = computed(() => createGrantForm.value.userId === DESIGNATED_PLATFORM_ADMIN_USER_ID);

    const filterGrantOperators = (value, update) => {
      update(() => {
        const needle = String(value || '').trim().toLowerCase();
        filteredGrantOperators.value = !needle
          ? grantOperators.value
          : grantOperators.value.filter((row) => {
            const label = String(row.label || '').toLowerCase();
            const id = String(row.id || '').toLowerCase();
            return label.includes(needle) || id.includes(needle);
          });
      });
    };

    const loadGrantOperators = async () => {
      loadingGrantOperators.value = true;
      grantOperatorError.value = '';
      try {
        const res = await healthInsuranceApi.listGrantOperators();
        const payload = unwrapPlatformBody(res.data) || {};
        const rows = Array.isArray(payload.operators) ? payload.operators : [];
        const selfId = localStorage.getItem('operator_userId') || '';
        grantOperators.value = rows
          .filter((row) => row && row.id && row.id !== selfId)
          .map((row) => ({
            id: row.id,
            label: grantOperatorLabel(row)
          }));
        filteredGrantOperators.value = grantOperators.value;
        if (!grantOperators.value.some((row) => row.id === createGrantForm.value.userId)) {
          createGrantForm.value.userId = '';
        }
      } catch (err) {
        grantOperators.value = [];
        filteredGrantOperators.value = [];
        createGrantForm.value.userId = '';
        grantOperatorError.value = err?.response?.data?.error?.message || 'Administrator accounts could not be loaded.';
      } finally {
        loadingGrantOperators.value = false;
      }
    };

    watch(showCreateGrantDialog, (open) => {
      if (open) loadGrantOperators();
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
      { name: 'user_id', label: 'OPERATOR USER ID', field: (row) => row.user_id || row.userId || '—', align: 'left', sortable: true },
      { name: 'email', label: 'OPERATOR EMAIL', field: (row) => row.email || row.user_email || row.userEmail || '—', align: 'left', sortable: true },
      { name: 'permission', label: 'PERMISSION', field: 'permission', align: 'left', sortable: true },
      { name: 'status', label: 'STATUS', field: (row) => row.status || (row.revoked_at || row.revokedAt ? 'revoked' : 'active'), align: 'center' },
      { name: 'granted_at', label: 'GRANTED AT', field: (row) => row.granted_at || row.grantedAt, align: 'left', sortable: true },
      { name: 'expires_at', label: 'EXPIRES AT', field: (row) => row.expires_at || row.expiresAt, align: 'left', sortable: true },
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

    const inactiveGrantSummary = computed(() => {
      const rows = grantStatus.value.inactiveGrants || [];
      if (!rows.length) return '';
      return rows.map((row) => `${row.permission} is ${row.status} and does not authorize access.`).join(' ');
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
        if (data && data.trim().length >= 5) {
          activePlatformReason.value = data.trim();
          sessionStorage.setItem('hw_platform_reason', data.trim());
          $q.notify({ type: 'positive', message: 'Operational reason updated.' });
          loadAll();
        } else {
          $q.notify({ type: 'warning', message: 'Reason must be at least 5 characters.' });
        }
      });
    };

    // API actions
    const grantsEmptyLabel = computed(() => {
      if (grantsState.value === 'withheld' || grantsState.value === 'denied') {
        return 'Grant list withheld. platform.tenant_access was not confirmed, so this is not an empty registry.';
      }
      if (grantsState.value === 'error') return 'The grants API failed. No empty-registry result is shown.';
      return 'No platform operator grants are recorded.';
    });

    const auditEmptyLabel = computed(() => {
      if (auditState.value === 'withheld' || auditState.value === 'denied') {
        return 'Audit events are withheld until platform.integration.health is active.';
      }
      if (auditState.value === 'error') return 'The audit API failed.';
      return 'No platform health audit events are recorded.';
    });

    const telemetryMessage = computed(() => {
      const messages = {
        loading: {
          title: 'Loading provider telemetry',
          detail: 'Waiting for the grant check and provider registry response.'
        },
        access_denied: {
          title: 'Access denied',
          detail: 'Provider telemetry requires an unexpired platform.integration.health grant and an audit reason. No registry rows are shown.'
        },
        unavailable: {
          title: 'Telemetry API unavailable',
          detail: telemetryDetail.value || 'The provider health request failed.'
        },
        malformed: {
          title: 'Telemetry response was malformed',
          detail: 'The response did not include a provider list.'
        },
        empty: {
          title: 'No HMO provider registry records exist',
          detail: 'The request succeeded and hw_providers returned no rows.'
        }
      };
      return messages[telemetryOutcome.value] || messages.unavailable;
    });

    const checkGrantStatus = async () => {
      try {
        const res = await healthInsuranceApi.getMyGrantStatus();
        const payload = unwrapPlatformBody(res.data) || {};
        const active = Boolean(payload.hasActiveGrant || payload.hasActiveGrants);
        const inactive = Array.isArray(payload.inactiveGrants) ? payload.inactiveGrants : [];
        const durableEntitlements = Array.isArray(payload.durableEntitlements) ? payload.durableEntitlements : [];
        const durableActive = durableEntitlements.some((row) => row && row.status === 'active');
        grantStatus.value = {
          hasActiveGrant: active,
          activeGrants: payload.activeGrants || [],
          inactiveGrants: inactive,
          durableEntitlements
        };
        return active || durableActive;
      } catch (err) {
        grantStatus.value = { hasActiveGrant: false, activeGrants: [], inactiveGrants: [], durableEntitlements: [] };
        const status = err?.response?.status;
        if (status && status !== 401 && status !== 403 && status !== 404) {
          overviewError.value = err?.response?.data?.error?.message || err.message || 'Grant status request failed.';
          return 'error';
        }
        return false;
      }
    };

    const applySettled = (result) => {
      if (result.status !== 'fulfilled') {
        const status = result.reason?.response?.status;
        const message = result.reason?.response?.data?.error?.message || result.reason?.message || 'Request failed';
        return { rejected: true, httpStatus: status, message, payload: null };
      }
      return {
        rejected: false,
        httpStatus: result.value.status,
        message: '',
        payload: unwrapPlatformBody(result.value.data)
      };
    };

    const loadAll = async () => {
      loading.value = true;
      errorMessage.value = '';
      overviewError.value = '';
      telemetryDetail.value = '';
      try {
        const grantResult = await checkGrantStatus();
        if (grantResult !== true) {
          overviewState.value = grantResult === 'error' ? 'error' : 'withheld';
          telemetryOutcome.value = grantResult === 'error' ? 'unavailable' : 'access_denied';
          grantsState.value = 'withheld';
          auditState.value = grantResult === 'error' ? 'error' : 'withheld';
          providersHealth.value = [];
          tenantsList.value = [];
          grantsList.value = [];
          auditEvents.value = [];
          return;
        }

        const grants = grantStatus.value.activeGrants || [];
        const durable = grantStatus.value.durableEntitlements || [];
        const reason = String(activePlatformReason.value || '').trim();
        const integrationGranted = hasGrant(grants, INTEGRATION_GRANT) || hasActiveDurable(durable, INTEGRATION_GRANT);
        const tenantAccessGranted = hasGrant(grants, TENANT_ACCESS_GRANT) || hasActiveDurable(durable, TENANT_ACCESS_GRANT);
        if (reason.length < 5) {
          overviewState.value = 'withheld';
          overviewError.value = 'Set an operational audit reason of at least 5 characters before querying cross-tenant health data. This does not create a grant.';
          telemetryOutcome.value = 'access_denied';
          telemetryDetail.value = overviewError.value;
          grantsState.value = 'withheld';
          auditState.value = 'withheld';
          providersHealth.value = [];
          tenantsList.value = [];
          grantsList.value = [];
          auditEvents.value = [];
          return;
        }
        if (!integrationGranted) {
          overviewState.value = 'withheld';
          overviewError.value = `No unexpired ${INTEGRATION_GRANT} grant or active durable entitlement is present. Cross-tenant telemetry stays withheld.`;
          telemetryOutcome.value = 'access_denied';
          telemetryDetail.value = overviewError.value;
          auditState.value = 'withheld';
          providersHealth.value = [];
          tenantsList.value = [];
          auditEvents.value = [];
        }
        if (!tenantAccessGranted) {
          grantsState.value = 'withheld';
          grantsList.value = [];
        }

        const requests = [];
        if (integrationGranted) {
          requests.push(['overview', healthInsuranceApi.getPlatformOverview(reason)]);
          requests.push(['tenants', healthInsuranceApi.getPlatformTenants({}, reason)]);
          requests.push(['providers', healthInsuranceApi.getProvidersHealth(reason)]);
          requests.push(['trends', healthInsuranceApi.getCoverageTrends(reason)]);
          requests.push(['audit', healthInsuranceApi.getPlatformAuditEvents({ limit: 50 }, reason)]);
        }
        if (tenantAccessGranted) {
          requests.push(['grants', healthInsuranceApi.getPlatformGrants({}, reason)]);
        }
        const settled = await Promise.all(requests.map(async ([key, promise]) => {
          try {
            return [key, { status: 'fulfilled', value: await promise }];
          } catch (reason) {
            return [key, { status: 'rejected', reason }];
          }
        }));
        const byKey = Object.fromEntries(settled);

        if (byKey.overview) {
          const overviewResult = applySettled(byKey.overview);
          if (overviewResult.rejected) {
            overviewState.value = 'error';
            overviewError.value = overviewResult.message;
          } else {
            overview.value = overviewResult.payload || overview.value;
            overviewState.value = 'loaded';
          }
        }

        if (byKey.tenants) {
          const tenantResult = applySettled(byKey.tenants);
          tenantsList.value = tenantResult.rejected ? [] : (tenantResult.payload?.tenants || []);
        }

        if (byKey.providers) {
          const providerResult = applySettled(byKey.providers);
          telemetryOutcome.value = classifyTelemetryOutcome({
            grantActive: true,
            rejected: providerResult.rejected,
            httpStatus: providerResult.httpStatus,
            payload: providerResult.payload
          });
          telemetryDetail.value = providerResult.message;
          const normalized = normalizeProviderHealthPayload(providerResult.payload);
          providersHealth.value = telemetryOutcome.value === 'ok' ? normalized.providers : [];
        }

        if (byKey.trends) {
          const trendResult = applySettled(byKey.trends);
          if (!trendResult.rejected && trendResult.payload) {
            coverageTrends.value = trendResult.payload;
          }
        }

        if (byKey.grants) {
          const grantListResult = applySettled(byKey.grants);
          if (grantListResult.rejected) {
            grantsState.value = grantListResult.httpStatus === 401 || grantListResult.httpStatus === 403 ? 'denied' : 'error';
            grantsList.value = [];
          } else {
            grantsList.value = grantListResult.payload?.grants || [];
            grantsState.value = 'loaded';
          }
        }

        if (byKey.audit) {
          const auditResult = applySettled(byKey.audit);
          if (auditResult.rejected) {
            auditState.value = auditResult.httpStatus === 401 || auditResult.httpStatus === 403 ? 'denied' : 'error';
            auditEvents.value = [];
          } else {
            auditEvents.value = auditResult.payload?.events || [];
            auditState.value = 'loaded';
          }
        }
      } catch (err) {
        errorMessage.value = err?.response?.data?.message || err.message || 'Error loading platform governance data.';
        overviewState.value = 'error';
        telemetryOutcome.value = 'unavailable';
      } finally {
        loading.value = false;
      }
    };

    const submitSelfActivate = async () => {
      activatingSession.value = true;
      try {
        const sessionDurable = hasActiveDurable(grantStatus.value.durableEntitlements, sessionForm.value.permission);
        if (!hasGrant(grantStatus.value.activeGrants, sessionForm.value.permission) && !sessionDurable) {
          $q.notify({
            type: 'warning',
            message: `No unexpired ${sessionForm.value.permission} grant or active durable entitlement is on this account. Self-activation cannot create one.`
          });
          return;
        }
        const res = await healthInsuranceApi.selfActivateGrant({
          permission: sessionForm.value.permission,
          reason: sessionForm.value.reason
        });

        if (res.data?.success) {
          $q.notify({
            type: 'positive',
            message: 'Operational session recorded under the existing grant. The grant expiry is unchanged.'
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
          message: err?.response?.data?.error?.message || err?.response?.data?.message || 'The operational session was not activated.'
        });
      } finally {
        activatingSession.value = false;
      }
    };

    const submitCreateGrant = async () => {
      creatingGrant.value = true;
      try {
        const reason = String(createGrantForm.value.reason || '').trim();
        if (reason.length < 5) {
          $q.notify({
            type: 'warning',
            message: 'A justification reason of at least 5 characters is required.'
          });
          return;
        }
        const designated = createGrantForm.value.userId === DESIGNATED_PLATFORM_ADMIN_USER_ID;
        let res;
        if (designated) {
          res = await healthInsuranceApi.issuePlatformEntitlement({
            userId: createGrantForm.value.userId,
            permission: createGrantForm.value.permission
          }, reason);
        } else {
          if (!hasGrant(grantStatus.value.activeGrants, TENANT_ACCESS_GRANT) && !hasActiveDurable(grantStatus.value.durableEntitlements, TENANT_ACCESS_GRANT)) {
            $q.notify({
              type: 'warning',
              message: 'An eight-hour grant for another administrator requires your own unexpired platform.tenant_access grant. The designated platform administrator is the account that can receive a durable entitlement without that grant.'
            });
            return;
          }
          res = await healthInsuranceApi.createPlatformGrant({
            userId: createGrantForm.value.userId,
            permission: createGrantForm.value.permission,
            durationMinutes: createGrantForm.value.durationMinutes,
            reason
          }, reason);
        }

        if (res.data?.success) {
          $q.notify({
            type: 'positive',
            message: designated
              ? 'Durable platform entitlement issued. It does not expire and does not include payout authority.'
              : 'Platform operator grant created successfully.'
          });
          showCreateGrantDialog.value = false;
          createGrantForm.value = {
            userId: '',
            permission: 'platform.integration.health',
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
          message: err?.response?.data?.error?.message || err?.response?.data?.message || 'The platform grant was not created.'
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
          message: err?.response?.data?.error?.message || err?.response?.data?.message || 'The platform grant was not revoked.'
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
      hasActiveDurableEntitlement,
      overview,
      coverageTrends,
      tenantsList,
      tenantSearch,
      tenantModeFilter,
      providersHealth,
      telemetryOutcome,
      telemetryMessage,
      overviewState,
      overviewError,
      grantsEmptyLabel,
      auditEmptyLabel,
      grantsList,
      auditEvents,
      auditActionFilter,
      showActivateSessionDialog,
      sessionForm,
      heldGrantOptions,
      showCreateGrantDialog,
      createGrantForm,
      grantTargetIsDesignated,
      grantOperatorOptions,
      filteredGrantOperators,
      filterGrantOperators,
      loadingGrantOperators,
      grantOperatorError,
      showRevokeGrantDialog,
      activeRevokeGrant,
      revokeReason,
      tenantColumns,
      grantColumns,
      auditColumns,
      filteredTenants,
      filteredAuditEvents,
      grantRemainingMinutes,
      inactiveGrantSummary,
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
