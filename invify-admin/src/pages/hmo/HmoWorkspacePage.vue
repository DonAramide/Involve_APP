<template>
  <q-page class="q-pa-lg hmo-workspace">
    <div class="q-mb-md">
      <div class="text-caption text-grey-5">HMO / {{ current.section }}</div>
      <div class="row items-center q-gutter-sm no-wrap">
        <q-icon name="health_and_safety" :color="isDark ? 'teal-4' : 'teal-8'" size="md" />
        <h1 class="text-h4 text-weight-bolder q-my-none">{{ current.label }}</h1>
      </div>
      <div class="text-caption text-grey-5 q-mt-xs">
        Platform HMO workspace. Cross-tenant health records stay behind an operational grant on Platform Governance.
      </div>
    </div>

    <q-banner v-if="pageError" dense rounded class="bg-red-10 text-red-2 q-mb-md">
      {{ pageError }}
    </q-banner>

    <div v-if="current.id === 'overview'" class="overview-board column q-gutter-sm">
      <q-banner v-if="overviewGrantWarning" dense rounded class="bg-amber-10 text-amber-1" role="status">
        <div>{{ overviewGrantWarning }}</div>
        <q-btn flat dense color="amber-2" label="Open Platform Governance" no-caps to="/admin/health-insurance" />
      </q-banner>
      <q-banner v-if="catalogueState === 'access_denied' || catalogueState === 'reason_required'" dense rounded class="bg-amber-10 text-amber-1" role="status">
        <div>{{ catalogueDenial }}</div>
        <q-btn flat dense color="amber-2" label="Open Platform Governance" no-caps to="/admin/health-insurance" />
      </q-banner>
      <q-banner v-if="registryState === 'access_denied' || registryState === 'reason_required'" dense rounded class="bg-amber-10 text-amber-1" role="status">
        <div>{{ registryDenial }}</div>
        <q-btn flat dense color="amber-2" label="Open Platform Governance" no-caps to="/admin/health-insurance" />
      </q-banner>
      <q-banner v-else-if="integrationState === 'unavailable'" dense rounded class="bg-red-10 text-red-2" role="alert">
        The grant or overview request failed. Totals are not shown as zero. {{ integrationError }}
      </q-banner>
      <q-banner v-else-if="integrationState === 'malformed'" dense rounded class="bg-red-10 text-red-2" role="alert">
        The grant-status response did not list permissions. Totals stay withheld.
      </q-banner>
      <div class="kpi-grid" aria-label="HMO overview metrics">
        <article v-for="metric in overviewKpis" :key="metric.label" class="kpi-card" :data-tone="metric.tone">
          <div class="kpi-label">{{ metric.label }}</div>
          <div class="kpi-value">{{ metric.value }}</div>
          <div v-if="metric.detail" class="kpi-detail">{{ metric.detail }}</div>
        </article>
      </div>
      <section class="panel" aria-label="Financial command center">
        <div class="row items-center justify-between q-col-gutter-sm">
          <div>
            <div class="panel-title">Financial command</div>
            <div class="kpi-detail">Refreshed {{ commandRefreshed }}. Currency NGN. Amounts are kobo converted only for display.</div>
          </div>
            <div class="row q-gutter-xs wrap">
            <q-btn v-for="option in periodOptions" :key="option.id" dense no-caps :outline="commandPeriod !== option.id" :color="commandPeriod === option.id ? 'teal-7' : 'grey-6'" :label="option.label" @click="selectPeriod(option.id)" />
            <q-btn dense flat no-caps color="teal-3" label="Retry" @click="loadFinanceCommand" />
          </div>
        </div>
        <div v-if="commandPeriod === 'custom'" class="row q-gutter-sm q-mt-sm">
          <q-input v-model="commandFrom" type="date" :dark="isDark" outlined dense label="From" />
          <q-input v-model="commandTo" type="date" :dark="isDark" outlined dense label="To" />
          <q-btn dense no-caps color="teal-8" label="Apply range" @click="loadFinanceCommand" />
        </div>
        <div v-if="commandError" class="kpi-detail text-red-3 q-mt-sm">{{ commandError }}</div>
        <div v-if="commandLoad === 'loading'" class="kpi-grid q-mt-sm" aria-hidden="true">
          <q-skeleton v-for="index in 4" :key="index" type="rect" height="84px" />
        </div>
        <div v-else class="kpi-grid q-mt-sm" aria-label="Financial metrics">
          <article v-for="metric in financialCards" :key="metric.label" class="kpi-card" :data-tone="metric.tone">
            <div class="kpi-label">{{ metric.label }}</div>
            <div class="kpi-value">{{ metric.value }}</div>
            <div class="kpi-detail">{{ metric.period }}</div>
            <div v-if="metric.detail" class="kpi-detail">{{ metric.detail }}</div>
          </article>
        </div>
        <div class="chart-grid q-mt-sm">
          <section class="panel" aria-label="Premium invoicing versus collection">
            <div class="panel-title">Premium invoicing versus collection</div>
            <div v-if="!premiumSeries.categories.length" class="kpi-detail">No dated invoice or successful payment rows are in this period. Undated rows are omitted rather than assigned to a month.</div>
            <apexchart v-else type="bar" height="240" :options="premiumChartOptions" :series="premiumSeriesData" />
            <div v-if="premiumSeries.undatedInvoices || premiumSeries.undatedPayments" class="kpi-detail">{{ premiumSeries.undatedInvoices }} invoices and {{ premiumSeries.undatedPayments }} payments have no usable timestamp and are excluded from this chart.</div>
          </section>
          <section class="panel" aria-label="Enrolment status">
            <div class="panel-title">Enrolment status</div>
            <div class="kpi-detail">Current status counts. This is not an enrolment trend over time.</div>
            <apexchart v-if="enrolmentSeries" type="bar" height="220" :options="enrolmentChartOptions" :series="enrolmentSeriesData" />
            <div v-else class="kpi-detail">Enrolment status counts were not returned.</div>
          </section>
          <section class="panel" aria-label="Unavailable financial charts">
            <div class="panel-title">Not calculated</div>
            <div class="kpi-detail">Revenue, expenses, and profit are unavailable. Premium cash is not profit.</div>
            <div class="kpi-detail">Claims paid versus outstanding claims are unavailable. Approval is not a disbursement.</div>
            <div class="kpi-detail">Premium collection by HMO is unavailable. Invoices are not attributed to a provider.</div>
          </section>
        </div>
        <div class="q-mt-sm">
          <div class="panel-title">Premium invoices</div>
          <div class="kpi-detail q-mb-sm">Invoice references only. Payer, member, and payment credentials are not loaded. Failed and reconciled are payment states and are not invoice rows.</div>
          <div class="row q-gutter-sm q-mb-sm">
            <q-input v-model="recordSearch" :dark="isDark" outlined dense label="Invoice reference" @keyup.enter="reloadRecords" />
            <q-select v-model="recordStatus" :options="invoiceStatusFilters" :dark="isDark" outlined dense emit-value map-options label="Status" style="min-width: 180px" @update:model-value="reloadRecords" />
          </div>
          <q-table
            :rows="financeCommand?.records?.rows || []"
            :columns="invoiceColumns"
            row-key="reference"
            :dark="isDark"
            flat
            bordered
            :loading="commandLoad === 'loading'"
            hide-pagination
            :rows-per-page-options="[20]"
            no-data-label="No premium invoices were returned for this filter."
          />
          <div class="row items-center q-gutter-sm q-mt-sm">
            <q-btn dense flat no-caps color="grey-4" label="Previous" :disable="recordOffset === 0" @click="changeRecordPage(-1)" />
            <div class="kpi-detail">{{ recordOffset + 1 }}–{{ recordOffset + (financeCommand?.records?.rows?.length || 0) }} of {{ financeCommand?.records?.total ?? 'unavailable' }}</div>
            <q-btn dense flat no-caps color="grey-4" label="Next" :disable="!canNextRecords" @click="changeRecordPage(1)" />
          </div>
        </div>
      </section>
      <div class="action-grid" aria-label="HMO quick actions">
        <component
          :is="action.allowed ? 'router-link' : 'button'"
          v-for="action in overviewActions"
          :key="action.id"
          class="action-card"
          :to="action.allowed ? action.to : undefined"
          :type="action.allowed ? undefined : 'button'"
          :disabled="action.allowed ? undefined : true"
          :aria-disabled="action.allowed ? 'false' : 'true'"
        >
          <span class="action-label">{{ action.label }}</span>
          <span class="kpi-detail">{{ action.allowed ? action.detail : action.reason }}</span>
        </component>
      </div>
      <div class="row q-col-gutter-sm">
        <div class="col-12 col-md-6">
          <section class="panel" aria-label="Integration status">
            <div class="panel-title">Integration status</div>
            <div v-for="(line, index) in integrationSummary.lines" :key="index" class="kpi-detail">{{ line }}</div>
          </section>
        </div>
        <div class="col-12 col-md-6">
          <section class="panel" aria-label="Recent audit activity">
            <div class="panel-title">Recent audit activity</div>
            <div v-if="auditState === 'access_denied' || auditState === 'reason_required'" class="kpi-detail">{{ auditDenial || 'Audit events stay withheld until platform.integration.health is unexpired.' }}</div>
            <div v-else-if="auditState === 'unavailable'" class="kpi-detail">The audit request failed. {{ auditError }}</div>
            <div v-else-if="auditState === 'malformed'" class="kpi-detail">The audit response did not contain an event list.</div>
            <div v-else-if="!recentAudit.length && auditState === 'ok'" class="kpi-detail">No audit events were returned.</div>
            <div v-else-if="auditState !== 'ok'" class="kpi-detail">Loading audit events.</div>
            <div v-for="event in recentAudit" :key="event.id" class="kpi-detail">
              {{ event.action }} · {{ event.occurred_at || 'Time not recorded' }}
            </div>
          </section>
        </div>
      </div>
      <q-expansion-item
        dense
        :dark="isDark"
        expand-separator
        icon="info"
        label="Role access guide"
        caption="Existing roles only. Collapsed so the metrics stay in view."
        header-class="text-grey-4"
      >
        <div class="q-pa-sm">
          <div v-for="persona in personas" :key="persona.title" class="kpi-detail q-mb-xs">
            <span class="text-teal-3">{{ persona.title }}. </span>{{ persona.detail }}
          </div>
        </div>
      </q-expansion-item>
    </div>

    <div v-else-if="current.id === 'plans'">
      <div class="row items-center justify-between q-mb-md">
        <div class="text-caption text-grey-5">Source of truth: hw_plans and hw_plan_versions. A saved draft is not published or activated.</div>
        <q-btn color="teal-8" icon="add" label="Create Plan" no-caps @click="openCreate" />
      </div>
      <q-banner v-if="catalogueState === 'access_denied' || catalogueState === 'reason_required'" dense rounded class="bg-amber-10 text-amber-2 q-mb-md">
        <div>{{ catalogueDenial || 'Listing and creating plans requires an unexpired platform.plans.manage grant and an audit reason. This is separate from platform.integration.health.' }}</div>
        <q-btn flat dense color="amber-2" label="Open Platform Governance" no-caps to="/admin/health-insurance" />
      </q-banner>
      <q-banner v-else-if="catalogueState === 'unavailable'" dense rounded class="bg-red-10 text-red-2 q-mb-md">
        The plan catalogue API is unavailable. No plans are shown because the request failed.
      </q-banner>
      <q-banner v-else-if="catalogueState === 'malformed'" dense rounded class="bg-red-10 text-red-2 q-mb-md">
        {{ catalogueDenial || 'The plan catalogue response did not contain a plan list. No zero count is shown.' }}
      </q-banner>
      <q-table
        v-else
        :rows="plans"
        :columns="planColumns"
        row-key="id"
        :dark="isDark"
        flat
        bordered
        :loading="loadingCatalogue"
        :pagination="{ rowsPerPage: 10 }"
        no-data-label="No health plans exist in hw_plans."
      >
        <template v-slot:body-cell-actions="props">
          <q-td :props="props">
            <q-btn flat dense color="cyan-3" label="Edit draft" no-caps :disable="!latestDraft(props.row)" @click="openEdit(props.row)" />
            <q-btn flat dense color="teal-3" label="Publish latest draft" no-caps :disable="!latestDraft(props.row)" @click="askPublish(props.row)" />
            <q-btn flat dense color="green-4" label="Activate" no-caps :disable="props.row.status === 'active' || !hasPublished(props.row)" @click="askActivate(props.row)" />
            <q-btn flat dense color="red-4" label="Retire" no-caps :disable="props.row.status === 'retired'" @click="askRetire(props.row)" />
          </q-td>
        </template>
      </q-table>
    </div>

    <div v-else-if="current.id === 'registry'">
      <q-input v-model="registryQuery" :dark="isDark" outlined dense label="Search HMO code or name" class="q-mb-md" />
      <q-banner v-if="registryState === 'access_denied' || registryState === 'reason_required'" dense rounded class="bg-amber-10 text-amber-2 q-mb-md">
        <div>{{ registryDenial || 'The HMO registry read requires platform.providers.manage. It loads hw_providers only. No rows are shown until that grant is active.' }}</div>
        <q-btn flat dense color="amber-2" label="Open Platform Governance" no-caps to="/admin/health-insurance" />
      </q-banner>
      <q-banner v-else-if="registryState === 'unavailable'" dense rounded class="bg-red-10 text-red-2 q-mb-md">
        The registry request failed. This is not an empty organisation list. {{ registryError }}
      </q-banner>
      <q-banner v-else-if="registryState === 'malformed'" dense rounded class="bg-red-10 text-red-2 q-mb-md">
        {{ registryDenial || 'The registry response did not contain a provider list. This is not an empty organisation list.' }}
      </q-banner>
      <q-table
        v-else
        :rows="visibleProviders"
        :columns="providerColumns"
        row-key="id"
        :dark="isDark"
        flat
        bordered
        :loading="loadingRegistry"
        :pagination="{ rowsPerPage: 10 }"
        no-data-label="No HMO organisations exist in hw_providers."
        @row-click="(_evt, row) => { selectedProvider = row }"
      />
      <q-card v-if="selectedProvider" class="bg-card-dark q-pa-md q-mt-md">
        <div class="text-subtitle1 text-weight-bold">{{ selectedProvider.display_name }}</div>
        <div class="text-caption text-grey-4">Code {{ selectedProvider.code }}</div>
        <div class="text-caption text-grey-4">Integration status: {{ selectedProvider.integration_status || 'none' }}</div>
        <div class="text-caption text-grey-4">Licence: {{ selectedProvider.licence_reference || 'Not recorded' }}</div>
        <div class="text-caption text-grey-5 q-mt-sm">Profile edits stay on the owning institute portal. This screen does not write another HMO's settings.</div>
      </q-card>
    </div>

    <div v-else-if="current.id === 'providers'">
      <div class="text-caption text-grey-5 q-mb-sm">Facilities come from hw_facilities and stay tied to hw_providers. Requires platform.integration.health.</div>
      <q-select v-model="facilityProviderId" :options="registryProviderOptions" emit-value map-options clearable label="Owning HMO" :dark="isDark" outlined dense class="q-mb-md" @update:model-value="loadFacilities" />
      <q-banner v-if="facilityState === 'access_denied' || facilityState === 'reason_required'" dense rounded class="bg-amber-10 text-amber-2">
        <div>{{ facilityDenial || 'Facility rows require an unexpired platform.integration.health grant. They are withheld.' }}</div>
        <q-btn flat dense color="amber-2" label="Open Platform Governance" no-caps to="/admin/health-insurance" />
      </q-banner>
      <q-banner v-else-if="facilityState === 'unavailable'" dense rounded class="bg-red-10 text-red-2">The facilities API failed. {{ facilityError }}</q-banner>
      <q-banner v-else-if="facilityState === 'malformed'" dense rounded class="bg-red-10 text-red-2">The facilities response had no list. Rows are not shown as an empty network.</q-banner>
      <q-table
        v-else
        :rows="facilities"
        :columns="facilityColumns"
        row-key="id"
        :dark="isDark"
        flat
        bordered
        :loading="loadingFacilities"
        no-data-label="No facilities are recorded for this filter. The request succeeded."
      />
    </div>

    <div v-else-if="current.id === 'telemetry'">
      <q-btn outline color="teal-4" label="Refresh telemetry" no-caps class="q-mb-md" :loading="loadingTelemetry" @click="loadTelemetry" />
      <q-banner v-if="telemetryOutcome === 'loading'" dense rounded class="hmo-note q-mb-md">
        Checking the operational grant and provider registry.
      </q-banner>
      <q-banner v-else-if="telemetryOutcome === 'access_denied' || telemetryOutcome === 'reason_required'" dense rounded class="bg-amber-10 text-amber-2 q-mb-md">
        <div>{{ telemetryDetail || 'Provider telemetry requires an unexpired platform.integration.health grant. Rows are withheld. This is not an empty registry.' }}</div>
        <q-btn flat dense color="amber-2" label="Open Platform Governance" no-caps to="/admin/health-insurance" />
      </q-banner>
      <q-banner v-else-if="telemetryOutcome === 'unavailable'" dense rounded class="bg-red-10 text-red-2 q-mb-md">
        The telemetry API is unavailable{{ telemetryDetail ? `: ${telemetryDetail}` : '' }}.
      </q-banner>
      <q-banner v-else-if="telemetryOutcome === 'malformed'" dense rounded class="bg-red-10 text-red-2 q-mb-md">
        The telemetry response did not contain a provider list.
      </q-banner>
      <q-banner v-else-if="telemetryOutcome === 'empty'" dense rounded class="hmo-note q-mb-md">
        No HMO provider registry records exist in hw_providers. The request succeeded.
      </q-banner>
      <div v-else class="row q-col-gutter-md">
        <div v-for="provider in telemetryProviders" :key="provider.id" class="col-12 col-md-6">
          <q-card class="bg-card-dark q-pa-md">
            <div class="text-subtitle1 text-weight-bold">{{ provider.displayName }}</div>
            <div class="text-caption text-grey-5">{{ provider.code }} · {{ provider.telemetryStatus }}</div>
            <div class="text-caption q-mt-sm">Active plans: {{ provider.activePlansCount || 0 }}</div>
            <div class="text-caption">Adapter: {{ provider.adapterKey || 'Not configured' }}</div>
            <div class="text-caption">Licence: {{ provider.licenceReference || 'Not recorded' }}</div>
          </q-card>
        </div>
      </div>
    </div>

    <div v-else-if="current.id === 'coverage'">
      <q-banner v-if="catalogueState === 'access_denied' || catalogueState === 'reason_required'" dense rounded class="bg-amber-10 text-amber-2">
        <div>{{ catalogueDenial || 'Benefit rows require platform.plans.manage. They are stored on hw_plan_versions, not a separate coverage table.' }}</div>
        <q-btn flat dense color="amber-2" label="Open Platform Governance" no-caps to="/admin/health-insurance" />
      </q-banner>
      <template v-else>
        <q-select v-model="selectedPlanId" :options="planOptions" emit-value map-options label="Plan" :dark="isDark" outlined dense class="q-mb-md" />
        <q-card v-if="selectedVersion" class="bg-card-dark q-pa-md">
          <div class="text-subtitle1 text-weight-bold">Version {{ selectedVersion.version }} · {{ selectedVersion.status }}</div>
          <div class="text-caption text-grey-4">Premium {{ formatKobo(selectedVersion.premium_minor) }} · {{ selectedVersion.billing_frequency }} · {{ selectedVersion.currency || 'NGN' }}</div>
          <div class="text-caption text-grey-4">Eligible: {{ (selectedVersion.member_categories || []).join(', ') || 'None recorded' }}</div>
          <div class="text-caption text-grey-4">Eligibility rules: {{ formatRules(selectedVersion.eligibility_rules) }}</div>
          <div class="text-caption text-grey-4 q-mt-sm">
            {{ selectedVersion.status === 'draft'
              ? 'Add benefits and coverage on this draft. Saving does not publish the plan or enrol members.'
              : 'This version is immutable. Saving creates the next draft version with these benefits. It does not publish or activate the plan.' }}
          </div>
          <BenefitRows v-model="coverageBenefits" class="q-mt-sm" />
          <q-input v-model="coverageExclusions" type="textarea" class="q-mt-sm" label="Exclusions, one per line" :dark="isDark" outlined dense />
          <div v-if="coverageError" class="text-caption text-red-4 q-mt-sm">{{ coverageError }}</div>
          <q-btn class="q-mt-sm" color="teal-8" no-caps :loading="coverageSaving" :label="selectedVersion.status === 'draft' ? 'Save benefits' : 'Save as new draft'" @click="saveCoverage" />
          <div class="text-caption text-grey-5 q-mt-sm">School or member contribution splits live on hw_tenant_plan_offers and are configured by the tenant after publication. This page does not enrol members.</div>
        </q-card>
        <div v-else class="text-caption text-grey-5">Select a plan to read its latest version. An empty catalogue means hw_plans has no rows.</div>
      </template>
    </div>

    <div v-else-if="current.id === 'governance'">
      <q-card class="bg-card-dark q-pa-md column q-gutter-sm">
        <div class="text-subtitle1 text-weight-bold">Platform governance stays separate</div>
        <div class="text-caption text-grey-4">
          Grant status: {{ grantActive ? 'platform authority is active for this operator' : 'no active platform grant or durable entitlement was returned' }}.
          Session activation, grant issue, and revocation stay on the governance screen. This page does not issue them.
        </div>
        <q-btn color="teal-8" label="Open governance" no-caps class="self-start" to="/admin/health-insurance" />
      </q-card>
    </div>

    <div v-else-if="current.id === 'enrolment' || current.id === 'members'">
      <div class="text-caption text-grey-5 q-mb-sm">
        Counts come from GET /platform/tenants. Names, dependant profiles, and enrolment forms stay in the school or HMO portal that owns the records.
      </div>
      <q-banner v-if="integrationState === 'access_denied' || integrationState === 'reason_required'" dense rounded class="bg-amber-10 text-amber-2">
        <div>{{ integrationDenial || 'Participation counts require an unexpired platform.integration.health grant. Names and enrolment forms stay in the owning portal.' }}</div>
        <q-btn flat dense color="amber-2" label="Open Platform Governance" no-caps to="/admin/health-insurance" />
      </q-banner>
      <q-banner v-else-if="tenantLoad === 'error'" dense rounded class="bg-red-10 text-red-2">The tenant participation request failed. Counts are not shown as zero.</q-banner>
      <template v-else>
        <div class="row q-gutter-sm q-mb-sm items-end">
          <q-input v-model="tenantSearch" :dark="isDark" outlined dense label="Search tenant" style="min-width: 200px" @keyup.enter="reloadTenants" />
          <q-select v-model="tenantMode" :options="tenantModeFilters" :dark="isDark" outlined dense emit-value map-options label="Mode" style="min-width: 140px" @update:model-value="reloadTenants" />
          <q-select v-model="tenantHealth" :options="tenantHealthFilters" :dark="isDark" outlined dense emit-value map-options label="Health access" style="min-width: 160px" @update:model-value="reloadTenants" />
          <q-btn dense no-caps color="teal-8" label="Search" @click="reloadTenants" />
        </div>
        <div v-if="current.id === 'enrolment'" class="text-caption text-grey-5 q-mb-sm">Activate and Suspend change only hw_tenant_settings.enabled. They do not enrol members, create an invoice, or move money. The action requires platform.tenants.onboard.</div>
        <q-table
          :rows="tenants"
          :columns="participationColumns"
          row-key="id"
          :dark="isDark"
          flat
          bordered
          :loading="tenantLoad === 'loading' || integrationState === 'loading'"
          hide-pagination
          :rows-per-page-options="[20]"
          no-data-label="No tenants matched this search."
        >
          <template #body-cell-actions="props">
            <q-td :props="props">
              <q-btn
                v-if="props.row.is_enabled === false"
                dense no-caps color="teal-8"
                label="Activate"
                :disable="!canOnboardTenants"
                @click="askParticipation(props.row, true)"
              />
              <q-btn
                v-else-if="props.row.is_enabled === true"
                dense no-caps color="orange-9"
                label="Suspend"
                :disable="!canOnboardTenants"
                @click="askParticipation(props.row, false)"
              />
              <span v-else class="text-caption text-grey-5">Unavailable</span>
            </q-td>
          </template>
        </q-table>
        <div class="row items-center q-gutter-sm q-mt-sm">
          <q-btn dense flat no-caps color="grey-4" label="Previous" :disable="tenantOffset === 0" @click="changeTenantPage(-1)" />
          <div class="text-caption text-grey-5">{{ tenantOffset + 1 }}–{{ tenantOffset + tenants.length }} of {{ tenantTotal ?? 'unavailable' }}</div>
          <q-btn dense flat no-caps color="grey-4" label="Next" :disable="!canNextTenants" @click="changeTenantPage(1)" />
        </div>
      </template>
      <div v-if="current.id === 'members' && trends" class="q-mt-md text-caption text-grey-4">
        Category counts from coverage trends:
        <span v-for="item in trends.byCategory || []" :key="item.category"> {{ item.category }} {{ item.count }}.</span>
        <span v-if="!(trends.byCategory || []).length"> No category rows were returned.</span>
      </div>
    </div>

    <div v-else-if="current.id === 'billing'">
      <div class="text-caption text-grey-5 q-mb-sm">Recorded premium invoices from hw_premium_invoices. This page does not create an invoice, collect a payment, or start a payout. Real-money payouts stay disabled.</div>
      <q-banner v-if="integrationState === 'access_denied' || integrationState === 'reason_required'" dense rounded class="bg-amber-10 text-amber-2">
        <div>{{ integrationDenial || 'Premium invoices require an unexpired platform.integration.health grant. They are withheld.' }}</div>
        <q-btn flat dense color="amber-2" label="Open Platform Governance" no-caps to="/admin/health-insurance" />
      </q-banner>
      <template v-else>
        <div class="text-subtitle2 q-mb-xs">Status totals</div>
        <q-banner v-if="financeLoad === 'error'" dense rounded class="bg-red-10 text-red-2 q-mb-sm">The finance summary failed. Amounts are not replaced with zeros. {{ financeError }}</q-banner>
        <q-table
          v-else
          :rows="finance?.invoices || []"
          :columns="financeColumns"
          row-key="status"
          :dark="isDark"
          flat
          bordered
          :loading="integrationState === 'loading'"
          no-data-label="The request succeeded and returned no invoice status rows."
        />
        <div class="row q-gutter-xs wrap q-mt-md q-mb-sm">
          <q-btn v-for="option in periodOptions" :key="option.id" dense no-caps :outline="commandPeriod !== option.id" :color="commandPeriod === option.id ? 'teal-7' : 'grey-6'" :label="option.label" @click="selectPeriod(option.id)" />
          <q-btn dense flat no-caps color="teal-3" label="Retry" @click="loadFinanceCommand" />
        </div>
        <div v-if="commandPeriod === 'custom'" class="row q-gutter-sm q-mb-sm">
          <q-input v-model="commandFrom" type="date" :dark="isDark" outlined dense label="From" />
          <q-input v-model="commandTo" type="date" :dark="isDark" outlined dense label="To" />
          <q-btn dense no-caps color="teal-8" label="Apply range" @click="loadFinanceCommand" />
        </div>
        <div v-if="commandError" class="text-caption text-red-4 q-mb-sm">{{ commandError }}</div>
        <div class="row q-gutter-sm q-mb-sm">
          <q-input v-model="recordSearch" :dark="isDark" outlined dense label="Invoice reference" @keyup.enter="reloadRecords" />
          <q-select v-model="recordStatus" :options="invoiceStatusFilters" :dark="isDark" outlined dense emit-value map-options label="Status" style="min-width: 180px" @update:model-value="reloadRecords" />
        </div>
        <q-table
          :rows="financeCommand?.records?.rows || []"
          :columns="invoiceColumns"
          row-key="reference"
          :dark="isDark"
          flat
          bordered
          :loading="commandLoad === 'loading'"
          hide-pagination
          :rows-per-page-options="[20]"
          no-data-label="No premium invoices were returned for this filter."
        />
        <div class="row items-center q-gutter-sm q-mt-sm">
          <q-btn dense flat no-caps color="grey-4" label="Previous" :disable="recordOffset === 0" @click="changeRecordPage(-1)" />
          <div class="text-caption text-grey-5">{{ recordOffset + 1 }}–{{ recordOffset + (financeCommand?.records?.rows?.length || 0) }} of {{ financeCommand?.records?.total ?? 'unavailable' }}</div>
          <q-btn dense flat no-caps color="grey-4" label="Next" :disable="!canNextRecords" @click="changeRecordPage(1)" />
        </div>
      </template>
    </div>

    <div v-else-if="current.id === 'payments'">
      <div class="text-caption text-grey-5 q-mb-sm">Payment status totals from hw_payments. Nothing on this page initiates a transfer. Real-money payouts stay disabled.</div>
      <q-banner v-if="integrationState === 'access_denied' || integrationState === 'reason_required'" dense rounded class="bg-amber-10 text-amber-2">
        <div>{{ integrationDenial || 'Financial totals require an unexpired platform.integration.health grant. They are withheld.' }}</div>
        <q-btn flat dense color="amber-2" label="Open Platform Governance" no-caps to="/admin/health-insurance" />
      </q-banner>
      <q-banner v-else-if="financeLoad === 'error'" dense rounded class="bg-red-10 text-red-2">The finance summary failed. Amounts are not replaced with zeros. {{ financeError }}</q-banner>
      <q-table
        v-else
        :rows="finance?.payments || []"
        :columns="financeColumns"
        row-key="status"
        :dark="isDark"
        flat
        bordered
        :loading="integrationState === 'loading'"
        no-data-label="The request succeeded and returned no status rows."
      />
    </div>

    <div v-else-if="current.id === 'reports'">
      <q-banner v-if="integrationState === 'access_denied' || integrationState === 'reason_required'" dense rounded class="bg-amber-10 text-amber-2">
        <div>{{ integrationDenial || 'Reports require an unexpired platform.integration.health grant. They are withheld.' }}</div>
        <q-btn flat dense color="amber-2" label="Open Platform Governance" no-caps to="/admin/health-insurance" />
      </q-banner>
      <q-banner v-else-if="trendLoad === 'error'" dense rounded class="bg-red-10 text-red-2">Coverage trends failed to load.</q-banner>
      <q-card v-else class="bg-card-dark q-pa-md">
        <div class="text-subtitle2 text-weight-bold">Coverage by mode</div>
        <div v-if="!(trends?.byMode || []).length" class="text-caption text-grey-5">No mode rows were returned.</div>
        <div v-for="item in trends?.byMode || []" :key="item.mode" class="text-caption">{{ item.mode }}: {{ item.count }}</div>
        <div class="text-subtitle2 text-weight-bold q-mt-md">Policies by status</div>
        <div v-if="!(trends?.byStatus || []).length" class="text-caption text-grey-5">No policy status rows were returned.</div>
        <div v-for="item in trends?.byStatus || []" :key="item.status" class="text-caption">{{ item.status }}: {{ item.count }}</div>
        <div class="text-caption text-grey-5 q-mt-sm">Export is not offered. There is no health export route behind this workspace.</div>
      </q-card>
    </div>

    <div v-else-if="current.id === 'audit'">
      <div class="row q-gutter-sm q-mb-md">
        <q-input v-model="auditAction" :dark="isDark" outlined dense label="Filter action" class="col" />
        <q-btn outline color="teal-4" label="Apply" no-caps @click="loadAudit" />
      </div>
      <q-banner v-if="auditState === 'access_denied' || auditState === 'reason_required'" dense rounded class="bg-amber-10 text-amber-2">
        <div>{{ auditDenial || 'Audit events require an unexpired platform.integration.health grant. The ledger was not loaded.' }}</div>
        <q-btn flat dense color="amber-2" label="Open Platform Governance" no-caps to="/admin/health-insurance" />
      </q-banner>
      <q-banner v-else-if="auditState === 'unavailable'" dense rounded class="bg-red-10 text-red-2">The audit API failed. {{ auditError }}</q-banner>
      <q-table
        v-else
        :rows="auditEvents"
        :columns="auditColumns"
        row-key="id"
        :dark="isDark"
        flat
        bordered
        :loading="loadingAudit"
        :pagination="{ rowsPerPage: 10 }"
        no-data-label="No audit events matched this filter."
      />
    </div>

    <div v-else-if="current.id === 'settings'">
      <q-banner v-if="registryState === 'access_denied' || registryState === 'reason_required'" dense rounded class="bg-amber-10 text-amber-2 q-mb-md">
        <div>{{ registryDenial || 'Organisation identity requires platform.providers.manage to read hw_providers. Updates are not available to platform operators.' }}</div>
        <q-btn flat dense color="amber-2" label="Open Platform Governance" no-caps to="/admin/health-insurance" />
      </q-banner>
      <q-banner v-else-if="registryState === 'unavailable'" dense rounded class="bg-red-10 text-red-2 q-mb-md">The organisation profile request failed. {{ registryError }}</q-banner>
      <q-table
        v-else
        :rows="registryProviders"
        :columns="providerColumns"
        row-key="id"
        :dark="isDark"
        flat
        bordered
        :loading="loadingRegistry"
        no-data-label="No HMO profile rows exist in hw_providers."
      />
      <div class="text-caption text-grey-5 q-mt-sm">An HMO edits its own profile with PATCH /api/agent/hmo/profile. That route checks the caller is that institution. There is no save action here.</div>
    </div>

    <q-card v-else class="bg-card-dark q-pa-md">
      <div class="text-subtitle1 text-weight-bold">{{ unavailable.title }}</div>
      <p class="text-caption text-grey-4 q-mb-none">{{ unavailable.detail }}</p>
    </q-card>

    <q-dialog v-model="showCreate" persistent>
      <q-card class="hmo-dialog">
        <q-card-section class="text-h6">{{ editingVersionId ? 'Edit draft version' : 'Create health plan draft' }}</q-card-section>
        <q-card-section class="q-gutter-sm">
          <q-select v-model="form.providerId" :options="providerOptions" emit-value map-options label="Owning HMO" :dark="isDark" outlined dense :disable="!!editingVersionId" />
          <q-input v-model="form.name" label="Plan name" :dark="isDark" outlined dense />
          <q-input v-model="form.code" label="Plan code" :dark="isDark" outlined dense hint="Unique for the owning HMO. Letters, numbers, _ or -." :disable="!!editingVersionId" />
          <q-input v-model="form.premiumNaira" label="Premium (NGN)" :dark="isDark" outlined dense />
          <q-select v-model="form.billingFrequency" :options="billingOptions" label="Billing frequency" :dark="isDark" outlined dense />
          <q-select v-model="form.memberCategories" :options="categoryOptions" label="Eligible categories" multiple use-chips :dark="isDark" outlined dense />
          <div class="row q-col-gutter-sm">
            <q-input v-model.number="form.minAge" type="number" class="col" label="Min age" :dark="isDark" outlined dense />
            <q-input v-model.number="form.maxAge" type="number" class="col" label="Max age" :dark="isDark" outlined dense />
            <q-input v-model.number="form.waitingPeriodDays" type="number" class="col" label="Waiting days" :dark="isDark" outlined dense />
          </div>
          <q-input v-model="form.effectiveFrom" type="date" label="Effective date" :dark="isDark" outlined dense />
          <q-input v-model="form.effectiveTo" type="date" label="Expiry date (optional)" :dark="isDark" outlined dense />
          <div class="text-caption text-grey-4">Benefits and coverage. A blank row is ignored. Saving a list replaces the benefits on this draft.</div>
          <BenefitRows v-model="form.benefits" />
          <q-input v-model="form.exclusionsText" type="textarea" label="Exclusions, one per line" :dark="isDark" outlined dense />
          <div v-if="formError" class="text-caption text-red-4">{{ formError }}</div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="grey-5" @click="closeCreate" />
          <q-btn color="teal-8" :label="editingVersionId ? 'Save draft changes' : 'Save draft'" :loading="saving" @click="saveDraft" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import { healthInsuranceApi } from 'src/api/healthInsuranceApi'
import BenefitRows from 'src/hmo/BenefitRows.vue'
import { benefitsFromVersion, benefitsPayload, emptyBenefit } from 'src/hmo/benefitDraft'
import { hmoItemForPath } from 'src/hmo/hmoWorkspace'
import { classifyTelemetryOutcome, normalizeProviderHealthPayload, unwrapPlatformBody } from 'src/hmo/telemetryState'
import {
  INTEGRATION_GRANT,
  PLANS_GRANT,
  REGISTRY_GRANT,
  buildOverviewKpis,
  grantGapMessage,
  integrationStatusSummary,
  platformHttpDenial,
  platformReadDecision,
  quickActions,
  readActiveGrants
} from 'src/hmo/overviewState'
import {
  commandCards,
  enrolmentChartSeries,
  periodRange,
  premiumChartSeries
} from 'src/hmo/commandCenter'

const route = useRoute()
const $q = useQuasar()
const isDark = computed(() => $q.dark.isActive)

const current = computed(() => hmoItemForPath(route.path))
const loadingCatalogue = ref(false)
const loadingTelemetry = ref(false)
const saving = ref(false)
const catalogueState = ref('idle')
const telemetryOutcome = ref('loading')
const telemetryDetail = ref('')
const pageError = ref('')
const formError = ref('')
const showCreate = ref(false)
const dirty = ref(false)
const plans = ref([])
const providers = ref([])
const registryProviders = ref([])
const registryState = ref('idle')
const registryError = ref('')
const registryDenial = ref('')
const catalogueDenial = ref('')
const loadingRegistry = ref(false)
const telemetryProviders = ref([])
const registryQuery = ref('')
const selectedProvider = ref(null)
const integrationState = ref('idle')
const integrationError = ref('')
const integrationDenial = ref('')
const facilityDenial = ref('')
const overview = ref(null)
const overviewLoad = ref('idle')
const tenants = ref([])
const tenantTotal = ref(null)
const tenantSearch = ref('')
const tenantMode = ref('')
const tenantHealth = ref('')
const tenantOffset = ref(0)
const tenantModeFilters = [
  { label: 'All modes', value: '' },
  { label: 'School', value: 'school' },
  { label: 'Retail', value: 'retail' },
  { label: 'Services', value: 'services' }
]
const tenantHealthFilters = [
  { label: 'All access', value: '' },
  { label: 'Enabled', value: 'enabled' },
  { label: 'Not enabled', value: 'disabled' }
]
const tenantLoad = ref('idle')
const trends = ref(null)
const trendLoad = ref('idle')
const finance = ref(null)
const financeLoad = ref('idle')
const financeError = ref('')
const financeCommand = ref(null)
const commandLoad = ref('idle')
const commandError = ref('')
const commandPeriod = ref('all')
const commandFrom = ref('')
const commandTo = ref('')
const recordSearch = ref('')
const recordStatus = ref('')
const recordOffset = ref(0)
const periodOptions = [
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: '90d', label: '90 days' },
  { id: 'ytd', label: 'Year to date' },
  { id: 'all', label: 'All rows' },
  { id: 'custom', label: 'Custom' }
]
const invoiceStatusFilters = [
  { label: 'All statuses', value: '' },
  { label: 'Issued', value: 'issued' },
  { label: 'Partially paid', value: 'partially_paid' },
  { label: 'Paid', value: 'paid' },
  { label: 'Overdue', value: 'overdue' },
  { label: 'Refunded', value: 'refunded' },
  { label: 'Void', value: 'void' }
]
const invoiceColumns = [
  { name: 'reference', label: 'Invoice', field: 'reference', align: 'left' },
  { name: 'recordType', label: 'Type', field: 'recordType', align: 'left' },
  { name: 'grossMinor', label: 'Gross', field: (row) => formatKobo(row.grossMinor), align: 'right' },
  { name: 'paidMinor', label: 'Paid', field: (row) => formatKobo(row.paidMinor), align: 'right' },
  { name: 'outstandingMinor', label: 'Outstanding', field: (row) => formatKobo(row.outstandingMinor), align: 'right' },
  { name: 'status', label: 'Status', field: 'status', align: 'left' },
  { name: 'occurredOn', label: 'Issued', field: (row) => row.occurredOn || 'Not recorded', align: 'left' }
]
const facilities = ref([])
const facilityProviderId = ref('')
const facilityState = ref('idle')
const facilityError = ref('')
const loadingFacilities = ref(false)
const auditEvents = ref([])
const auditAction = ref('')
const auditState = ref('idle')
const auditError = ref('')
const auditDenial = ref('')
const loadingAudit = ref(false)
const grantActive = ref(false)
const activeGrants = ref([])
const inactiveGrants = ref([])
const durableEntitlements = ref([])
const selectedPlanId = ref('')
const coverageBenefits = ref([emptyBenefit()])
const coverageExclusions = ref('')
const coverageError = ref('')
const coverageSaving = ref(false)
const editingVersionId = ref('')

const billingOptions = ['monthly', 'quarterly', 'termly', 'annual', 'one_off']
const categoryOptions = ['student', 'teaching_staff', 'non_teaching_staff', 'dependant', 'retail_employee', 'services_member']

const form = reactive({
  providerId: '',
  name: '',
  code: '',
  premiumNaira: '',
  billingFrequency: 'termly',
  memberCategories: ['student'],
  minAge: 0,
  maxAge: 65,
  waitingPeriodDays: 0,
  effectiveFrom: '',
  effectiveTo: '',
  benefits: [emptyBenefit()],
  exclusionsText: ''
})

const personas = [
  { title: 'SUPER_ADMIN / ADMIN_DEPLOY', detail: 'This HMO workspace and Health & Wellness Governance. Plan writes still need platform.plans.manage. Telemetry still needs platform.integration.health.' },
  { title: 'HMO institution operator', detail: 'Own organisation, plans, facilities, enrolments, and billing in the institute portal. That portal cannot read another HMO.' },
  { title: 'School / tenant administrator', detail: 'Eligible members, offers, and premium billing on /tenant/health-insurance when health insurance is enabled for that tenant.' },
  { title: 'Healthcare provider', detail: 'No separate provider login exists. Facilities are recorded by the owning HMO and are not invented here.' }
]

const unavailableBySection = {
  enrolment: {
    title: 'Enrolment stays with the owning organisation',
    detail: 'School enrolment is on /tenant/health-insurance. HMO adjudication is in the institute portal. This platform page does not enrol members from a plan draft.'
  },
  members: {
    title: 'Member records are not listed here',
    detail: 'A platform operator does not get an implicit cross-tenant member or dependant directory. Use the tenant or HMO portal that already scopes those records.'
  },
  claims: {
    title: 'Claims are not available on the platform workspace',
    detail: 'Claim and pre-authorisation adjudication exists for the owning HMO in the institute portal. A cross-tenant claims inbox would expose clinical data and is not provided.'
  },
  billing: {
    title: 'Premium billing is tenant-scoped',
    detail: 'Invoices are issued through the tenant health billing API. Platform premium totals, when an integration grant is active, are the governance overview aggregates.'
  },
  payments: {
    title: 'Payment reconciliation is not a new ledger',
    detail: 'Real-money payouts stay disabled. Payment confirmation remains on the existing health billing endpoints. This page does not post a payment.'
  },
  reports: {
    title: 'Aggregates stay on governance',
    detail: 'Cross-tenant counts are loaded only on Health & Wellness Governance after an operational grant. This page does not substitute zeros or sample figures.'
  },
  audit: {
    title: 'Lineage audit is on governance',
    detail: 'Plan draft, publish, activate, and retire actions write hw_audit_events. Inspect them from Platform Governance rather than a second audit store.'
  },
  settings: {
    title: 'Organisation settings belong to the HMO',
    detail: 'Licence and profile edits are on the institute HMO portal and are limited to that institution. Platform operators do not edit another HMO profile from this page.'
  }
}

const unavailable = computed(() => unavailableBySection[current.value.id] || {
  title: 'This section is not available',
  detail: 'The current health-insurance model does not back this screen.'
})

const visibleProviders = computed(() => {
  const query = registryQuery.value.trim().toLowerCase()
  if (!query) return registryProviders.value
  return registryProviders.value.filter((provider) =>
    `${provider.display_name || ''} ${provider.code || ''} ${provider.integration_status || ''}`.toLowerCase().includes(query)
  )
})

const planOptions = computed(() => plans.value.map((plan) => ({
  label: `${plan.name} (${plan.code})`,
  value: plan.id
})))

const selectedPlan = computed(() => plans.value.find((plan) => plan.id === selectedPlanId.value) || null)

const selectedVersion = computed(() => {
  const versions = [...(selectedPlan.value?.hw_plan_versions || [])]
  versions.sort((a, b) => Number(b.version) - Number(a.version))
  return versions[0] || null
})

watch(selectedVersion, (version) => {
  coverageBenefits.value = benefitsFromVersion(version?.benefits)
  coverageExclusions.value = Array.isArray(version?.exclusions) ? version.exclusions.join('\n') : ''
  coverageError.value = ''
})

function formatCount(value) {
  if (value === null || value === undefined || value === '') return 'Unavailable'
  return value
}

const overviewKpis = computed(() => buildOverviewKpis({
  integrationState: integrationState.value,
  overview: overview.value,
  overviewLoad: overviewLoad.value,
  facilities: facilities.value,
  facilityState: facilityState.value,
  plans: plans.value,
  catalogueState: catalogueState.value,
  finance: finance.value,
  financeLoad: financeLoad.value
}))

const periodLabel = computed(() => {
  const range = periodRange(commandPeriod.value, new Date().toISOString().slice(0, 10), commandFrom.value, commandTo.value)
  if (!range.from && !range.to) return 'All persisted rows'
  return `${range.from || 'start'} to ${range.to || 'latest'}`
})
const financialCards = computed(() => commandCards(financeCommand.value, commandLoad.value, periodLabel.value))
const premiumSeries = computed(() => premiumChartSeries(financeCommand.value))
const premiumSeriesData = computed(() => [
  { name: 'Invoiced', data: premiumSeries.value.invoiced },
  { name: 'Collected', data: premiumSeries.value.collected }
])
const enrolmentSeries = computed(() => enrolmentChartSeries(overview.value))
const enrolmentSeriesData = computed(() => enrolmentSeries.value ? [{ name: 'Enrolments', data: enrolmentSeries.value.counts }] : [])
const chartTheme = computed(() => {
  const label = isDark.value ? '#94a3b8' : '#334155'
  return {
    chart: { background: 'transparent', toolbar: { show: false }, fontFamily: 'inherit' },
    theme: { mode: isDark.value ? 'dark' : 'light' },
    dataLabels: { enabled: false },
    grid: { borderColor: isDark.value ? '#243044' : '#e2e8f0' },
    legend: { labels: { colors: label } },
    label
  }
})
const premiumChartOptions = computed(() => ({
  ...chartTheme.value,
  xaxis: { categories: premiumSeries.value.categories, labels: { style: { colors: chartTheme.value.label } } },
  yaxis: { labels: { style: { colors: chartTheme.value.label } }, title: { text: 'NGN', style: { color: chartTheme.value.label } } },
  tooltip: { y: { formatter: (value) => `₦${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` } }
}))
const enrolmentChartOptions = computed(() => ({
  ...chartTheme.value,
  xaxis: { categories: enrolmentSeries.value?.categories || [], labels: { style: { colors: chartTheme.value.label } } },
  yaxis: { labels: { style: { colors: chartTheme.value.label } } }
}))
const commandRefreshed = computed(() => financeCommand.value?.generatedAt || 'not yet')
const canNextRecords = computed(() => {
  const total = financeCommand.value?.records?.total
  if (typeof total !== 'number') return false
  return recordOffset.value + (financeCommand.value?.records?.rows?.length || 0) < total
})

const overviewActions = computed(() => quickActions(activeGrants.value, inactiveGrants.value, durableEntitlements.value))

const overviewGrantWarning = computed(() => {
  if (integrationState.value === 'reason_required' || integrationState.value === 'access_denied') {
    return integrationDenial.value || grantGapMessage(activeGrants.value, INTEGRATION_GRANT)
  }
  return ''
})

const integrationSummary = computed(() => integrationStatusSummary(
  telemetryProviders.value,
  integrationState.value === 'reason_required' || telemetryOutcome.value === 'reason_required'
    ? 'reason_required'
    : integrationState.value === 'access_denied' ? 'access_denied' : telemetryOutcome.value
))

const recentAudit = computed(() => (auditEvents.value || []).slice(0, 5))

const tenantColumns = [
  { name: 'name', label: 'Tenant', field: 'name', align: 'left' },
  { name: 'mode', label: 'Mode', field: 'mode', align: 'left' },
  { name: 'enrolled_count', label: 'Members', field: (row) => formatCount(row.enrolled_count), align: 'right' },
  { name: 'active_count', label: 'Active policies', field: (row) => formatCount(row.active_count), align: 'right' },
  { name: 'pendingEnrolmentsCount', label: 'Pending enrolments', field: (row) => formatCount(row.pendingEnrolmentsCount), align: 'right' },
  { name: 'is_enabled', label: 'Health enabled', field: (row) => row.is_enabled === null || row.is_enabled === undefined ? 'Unavailable' : (row.is_enabled ? 'Yes' : 'No'), align: 'left' }
]
const participationColumns = computed(() => (
  current.value.id === 'enrolment'
    ? [...tenantColumns, { name: 'actions', label: 'Health access', field: 'id', align: 'right' }]
    : tenantColumns
))
const canOnboardTenants = computed(() => {
  const granted = (activeGrants.value || []).some((grant) => grant && grant.permission === 'platform.tenants.onboard')
  const entitled = (durableEntitlements.value || []).some((row) => row && row.permission === 'platform.tenants.onboard' && row.status === 'active')
  return granted || entitled
})
const canNextTenants = computed(() => typeof tenantTotal.value === 'number' && tenantOffset.value + tenants.value.length < tenantTotal.value)

const facilityColumns = [
  { name: 'name', label: 'Facility', field: 'name', align: 'left' },
  { name: 'owner', label: 'Owning HMO', field: (row) => row.hw_providers?.display_name || row.provider_id, align: 'left' },
  { name: 'state', label: 'State', field: (row) => row.state || 'Not recorded', align: 'left' },
  { name: 'services', label: 'Services', field: (row) => (row.services || []).join(', ') || 'None recorded', align: 'left' },
  { name: 'is_active', label: 'Active', field: (row) => row.is_active ? 'Yes' : 'No', align: 'left' }
]

const financeColumns = [
  { name: 'status', label: 'Status', field: 'status', align: 'left' },
  { name: 'count', label: 'Count', field: 'count', align: 'right' },
  { name: 'amountMinor', label: 'Amount', field: (row) => formatKobo(row.amountMinor), align: 'right' }
]

const auditColumns = [
  { name: 'occurred_at', label: 'When', field: 'occurred_at', align: 'left' },
  { name: 'action', label: 'Action', field: 'action', align: 'left' },
  { name: 'resource_type', label: 'Resource', field: 'resource_type', align: 'left' },
  { name: 'platform_reason', label: 'Reason', field: 'platform_reason', align: 'left' }
]

function formatKobo(value) {
  if (value === null || value === undefined || value === '') return 'Amount unavailable'
  const kobo = Number(value)
  if (!Number.isInteger(kobo)) return 'Amount unavailable'
  return `₦${(kobo / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatRules(rules) {
  if (!rules || typeof rules !== 'object' || !Object.keys(rules).length) return 'None recorded'
  return Object.entries(rules).map(([key, item]) => `${key}: ${item}`).join(', ')
}

const providerOptions = computed(() => providers.value.map((provider) => ({
  label: `${provider.display_name || provider.displayName} (${provider.code})`,
  value: provider.id
})))

const registryProviderOptions = computed(() => registryProviders.value.map((provider) => ({
  label: `${provider.display_name || provider.displayName} (${provider.code})`,
  value: provider.id
})))

const planColumns = [
  { name: 'name', label: 'Plan', field: 'name', align: 'left' },
  { name: 'code', label: 'Code', field: 'code', align: 'left' },
  { name: 'status', label: 'Status', field: 'status', align: 'left' },
  { name: 'provider', label: 'HMO', field: (row) => row.hw_providers?.display_name || row.provider_id, align: 'left' },
  { name: 'actions', label: 'Lifecycle', field: 'id', align: 'right' }
]

const providerColumns = [
  { name: 'display_name', label: 'HMO', field: 'display_name', align: 'left' },
  { name: 'code', label: 'Code', field: 'code', align: 'left' },
  { name: 'integration_status', label: 'Integration', field: 'integration_status', align: 'left' },
  { name: 'licence_reference', label: 'Licence', field: (row) => row.licence_reference || 'Not recorded', align: 'left' }
]

function reason() {
  return sessionStorage.getItem('hw_platform_reason') || ''
}

function tenantQueryParams() {
  return {
    limit: 20,
    offset: tenantOffset.value,
    search: tenantSearch.value || undefined,
    mode: tenantMode.value || undefined,
    health: tenantHealth.value || undefined
  }
}

async function loadTenants() {
  tenantLoad.value = 'loading'
  try {
    const decision = await guardPlatformRead(INTEGRATION_GRANT)
    if (!decision.proceed) {
      tenants.value = []
      tenantTotal.value = null
      tenantLoad.value = decision.state === 'unavailable' ? 'error' : 'withheld'
      return
    }
    const res = await healthInsuranceApi.getPlatformTenants(tenantQueryParams(), reason())
    const body = unwrapPlatformBody(res.data)
    if (!body || !Array.isArray(body.tenants)) {
      tenants.value = []
      tenantTotal.value = null
      tenantLoad.value = 'error'
      return
    }
    tenants.value = body.tenants
    tenantTotal.value = typeof body.total === 'number' ? body.total : null
    tenantLoad.value = 'ok'
  } catch {
    tenants.value = []
    tenantTotal.value = null
    tenantLoad.value = 'error'
  }
}

function reloadTenants() {
  tenantOffset.value = 0
  loadTenants()
}

function changeTenantPage(direction) {
  tenantOffset.value = Math.max(0, tenantOffset.value + (direction * 20))
  loadTenants()
}

function askParticipation(row, enabled) {
  if (!canOnboardTenants.value) {
    $q.notify({ type: 'warning', message: 'platform.tenants.onboard is required to activate or suspend health access.' })
    return
  }
  $q.dialog({
    title: enabled ? `Activate health access for ${row.name}` : `Suspend health access for ${row.name}`,
    message: enabled
      ? 'This sets hw_tenant_settings.enabled for this tenant. It does not enrol members or create an invoice.'
      : 'This turns health access off for this tenant. Member records stay in place, and no payment is made.',
    prompt: { model: '', type: 'text', label: 'Audit reason' },
    cancel: true,
    persistent: true
  }).onOk(async (text) => {
    if (!text || String(text).trim().length < 5) {
      $q.notify({ type: 'warning', message: 'Reason must be at least 5 characters.' })
      return
    }
    try {
      await healthInsuranceApi.setTenantParticipation(row.id, { enabled }, String(text).trim())
      $q.notify({ type: 'positive', message: enabled ? 'Health access activated.' : 'Health access suspended.' })
      await loadTenants()
    } catch (err) {
      $q.notify({ type: 'negative', message: err?.response?.data?.error?.message || 'Health access was not changed.' })
    }
  })
}

let grantFlight = null
function loadGrantContext() {
  if (!grantFlight) {
    grantFlight = (async () => {
      try {
        const grantRes = await healthInsuranceApi.getMyGrantStatus()
        const grant = unwrapPlatformBody(grantRes.data) || {}
        const parsed = readActiveGrants(grant)
        if (parsed.ok) {
          activeGrants.value = parsed.grants
          inactiveGrants.value = parsed.inactiveGrants
          durableEntitlements.value = parsed.durableEntitlements
          grantActive.value = parsed.grants.length > 0 || parsed.durableEntitlements.some((row) => row.status === 'active')
        } else {
          activeGrants.value = []
          inactiveGrants.value = []
          durableEntitlements.value = []
          grantActive.value = false
        }
        return { ...parsed, failed: false, message: '' }
      } catch (err) {
        activeGrants.value = []
        inactiveGrants.value = []
        durableEntitlements.value = []
        grantActive.value = false
        return {
          ok: false,
          malformed: false,
          failed: true,
          grants: [],
          message: err?.response?.data?.error?.message || err?.message || 'Grant status could not be loaded.'
        }
      }
    })().finally(() => {
      grantFlight = null
    })
  }
  return grantFlight
}

async function guardPlatformRead(permission) {
  const parsed = await loadGrantContext()
  if (parsed.failed) {
    return { proceed: false, state: 'unavailable', message: parsed.message }
  }
  if (!parsed.ok) {
    return { proceed: false, state: 'malformed', message: 'The grant-status response did not list permissions.' }
  }
  return platformReadDecision(parsed.grants, permission, reason(), parsed.inactiveGrants, parsed.durableEntitlements)
}

function applyDeniedRead(target, decision) {
  target.state.value = decision.state
  target.detail.value = decision.message
  target.clear()
}

function latestDraft(plan) {
  const versions = Array.isArray(plan.hw_plan_versions) ? plan.hw_plan_versions : []
  return versions.find((version) => version.status === 'draft') || null
}

function hasPublished(plan) {
  const versions = Array.isArray(plan.hw_plan_versions) ? plan.hw_plan_versions : []
  return versions.some((version) => version.status === 'published')
}

async function loadRegistry() {
  loadingRegistry.value = true
  registryError.value = ''
  registryDenial.value = ''
  try {
    const decision = await guardPlatformRead(REGISTRY_GRANT)
    if (!decision.proceed) {
      applyDeniedRead(
        { state: registryState, detail: registryDenial, clear: () => { registryProviders.value = [] } },
        decision
      )
      if (decision.state === 'unavailable') registryError.value = decision.message
      return
    }
    const res = await healthInsuranceApi.getPlatformRegistry(reason())
    const data = unwrapPlatformBody(res.data)
    if (!data || typeof data !== 'object' || !Array.isArray(data.providers)) {
      registryState.value = 'malformed'
      registryProviders.value = []
      return
    }
    registryProviders.value = data.providers
    registryState.value = 'ok'
  } catch (err) {
    const denial = platformHttpDenial(err?.response?.status, err?.response?.data)
    registryState.value = denial.state
    registryDenial.value = denial.message
    registryError.value = denial.state === 'unavailable' ? denial.message : ''
    registryProviders.value = []
  } finally {
    loadingRegistry.value = false
  }
}

async function loadCatalogue() {
  loadingCatalogue.value = true
  pageError.value = ''
  catalogueDenial.value = ''
  try {
    const decision = await guardPlatformRead(PLANS_GRANT)
    if (!decision.proceed) {
      applyDeniedRead(
        { state: catalogueState, detail: catalogueDenial, clear: () => { providers.value = []; plans.value = [] } },
        decision
      )
      if (decision.state === 'unavailable') pageError.value = decision.message
      return
    }
    const res = await healthInsuranceApi.getPlatformCatalogue(reason())
    const data = unwrapPlatformBody(res.data)
    if (!data || typeof data !== 'object' || !Array.isArray(data.plans) || !Array.isArray(data.providers)) {
      catalogueState.value = 'malformed'
      providers.value = []
      plans.value = []
      return
    }
    providers.value = data.providers
    plans.value = data.plans
    catalogueState.value = 'ok'
  } catch (err) {
    const denial = platformHttpDenial(err?.response?.status, err?.response?.data)
    catalogueState.value = denial.state
    catalogueDenial.value = denial.message
    providers.value = []
    plans.value = []
    if (denial.state === 'unavailable') pageError.value = denial.message
  } finally {
    loadingCatalogue.value = false
  }
}

async function loadTelemetry() {
  loadingTelemetry.value = true
  telemetryDetail.value = ''
  try {
    const decision = await guardPlatformRead(INTEGRATION_GRANT)
    if (!decision.proceed) {
      telemetryOutcome.value = decision.state === 'unavailable' ? 'unavailable' : decision.state
      telemetryDetail.value = decision.message
      telemetryProviders.value = []
      return
    }
    const res = await healthInsuranceApi.getProvidersHealth(reason())
    const payload = unwrapPlatformBody(res.data)
    telemetryOutcome.value = classifyTelemetryOutcome({
      grantActive: true,
      rejected: false,
      httpStatus: res.status,
      payload
    })
    telemetryProviders.value = normalizeProviderHealthPayload(payload).providers
  } catch (err) {
    const status = err?.response?.status
    telemetryOutcome.value = classifyTelemetryOutcome({
      grantActive: true,
      rejected: true,
      httpStatus: status,
      payload: null
    })
    telemetryDetail.value = err?.response?.data?.error?.message || err?.message || ''
    telemetryProviders.value = []
  } finally {
    loadingTelemetry.value = false
  }
}

async function loadIntegration(includeBoard = false) {
  integrationState.value = 'loading'
  integrationError.value = ''
  integrationDenial.value = ''
  overviewLoad.value = 'idle'
  tenantLoad.value = 'idle'
  trendLoad.value = 'idle'
  financeLoad.value = 'idle'
  try {
    const decision = await guardPlatformRead(INTEGRATION_GRANT)
    if (!decision.proceed) {
      integrationState.value = decision.state === 'malformed'
        ? 'malformed'
        : decision.state === 'unavailable'
          ? 'unavailable'
          : decision.state
      integrationDenial.value = decision.message
      overview.value = null
      tenants.value = []
      tenantTotal.value = null
      trends.value = null
      finance.value = null
      facilities.value = []
      overviewLoad.value = 'withheld'
      financeLoad.value = 'withheld'
      facilityState.value = decision.state === 'unavailable' ? 'unavailable' : decision.state
      facilityDenial.value = decision.message
      telemetryOutcome.value = decision.state === 'unavailable' ? 'unavailable' : decision.state
      telemetryDetail.value = decision.message
      telemetryProviders.value = []
      auditState.value = decision.state === 'unavailable' ? 'unavailable' : decision.state
      auditDenial.value = decision.message
      auditEvents.value = []
      financeCommand.value = null
      commandLoad.value = decision.state === 'unavailable' ? 'unavailable' : 'withheld'
      commandError.value = decision.message
      if (decision.state === 'unavailable') integrationError.value = decision.message
      return
    }
    const [overviewResult, tenantResult, trendResult, financeResult] = await Promise.allSettled([
      healthInsuranceApi.getPlatformOverview(reason()),
      healthInsuranceApi.getPlatformTenants(tenantQueryParams(), reason()),
      healthInsuranceApi.getCoverageTrends(reason()),
      healthInsuranceApi.getPlatformFinance(reason())
    ])
    if (overviewResult.status === 'fulfilled') {
      const body = unwrapPlatformBody(overviewResult.value.data)
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        overview.value = null
        overviewLoad.value = 'malformed'
      } else {
        overview.value = body
        overviewLoad.value = 'ok'
      }
    } else {
      overview.value = null
      const denial = platformHttpDenial(overviewResult.reason?.response?.status, overviewResult.reason?.response?.data)
      overviewLoad.value = denial.state === 'access_denied' || denial.state === 'reason_required' ? 'withheld' : 'error'
      integrationError.value = denial.message
      if (denial.state === 'reason_required') integrationState.value = 'reason_required'
    }
    if (tenantResult.status === 'fulfilled') {
      const body = unwrapPlatformBody(tenantResult.value.data)
      tenants.value = Array.isArray(body?.tenants) ? body.tenants : []
      tenantTotal.value = typeof body?.total === 'number' ? body.total : null
      tenantLoad.value = 'ok'
    } else {
      tenants.value = []
      tenantTotal.value = null
      tenantLoad.value = 'error'
    }
    if (trendResult.status === 'fulfilled') {
      trends.value = unwrapPlatformBody(trendResult.value.data)
      trendLoad.value = 'ok'
    } else {
      trends.value = null
      trendLoad.value = 'error'
    }
    if (financeResult.status === 'fulfilled') {
      const body = unwrapPlatformBody(financeResult.value.data)
      if (!body || typeof body !== 'object' || !Array.isArray(body.invoices) || !Array.isArray(body.payments)) {
        finance.value = null
        financeLoad.value = 'malformed'
      } else {
        finance.value = body
        financeLoad.value = 'ok'
      }
    } else {
      finance.value = null
      const denial = platformHttpDenial(financeResult.reason?.response?.status, financeResult.reason?.response?.data)
      financeLoad.value = denial.state === 'access_denied' || denial.state === 'reason_required' ? 'withheld' : 'error'
      financeError.value = denial.message
    }
    if (integrationState.value !== 'reason_required') integrationState.value = 'loaded'
    if (includeBoard && integrationState.value === 'loaded') {
      loadFacilities()
      loadTelemetry()
      loadAudit(5)
      loadFinanceCommand()
    }
  } catch (err) {
    const denial = platformHttpDenial(err?.response?.status, err?.response?.data)
    integrationState.value = denial.state === 'access_denied' ? 'access_denied' : denial.state
    integrationDenial.value = denial.message
    integrationError.value = denial.message
  }
}

async function loadFinanceCommand() {
  commandLoad.value = 'loading'
  commandError.value = ''
  try {
    const decision = await guardPlatformRead(INTEGRATION_GRANT)
    if (!decision.proceed) {
      financeCommand.value = null
      commandLoad.value = decision.state === 'unavailable' ? 'unavailable' : 'withheld'
      commandError.value = decision.message
      return
    }
    const range = periodRange(commandPeriod.value, new Date().toISOString().slice(0, 10), commandFrom.value, commandTo.value)
    const res = await healthInsuranceApi.getPlatformFinanceCommand({
      from: range.from || undefined,
      to: range.to || undefined,
      search: recordSearch.value || undefined,
      status: recordStatus.value || undefined,
      limit: 20,
      offset: recordOffset.value
    }, reason())
    const body = unwrapPlatformBody(res.data)
    if (!body || typeof body !== 'object' || !body.totals || !body.series || !body.records || !Array.isArray(body.records.rows)) {
      financeCommand.value = null
      commandLoad.value = 'malformed'
      commandError.value = 'The finance command response did not include totals, a series, and invoice rows.'
      return
    }
    financeCommand.value = body
    commandLoad.value = 'ok'
  } catch (err) {
    financeCommand.value = null
    const denial = platformHttpDenial(err?.response?.status, err?.response?.data)
    commandLoad.value = denial.state === 'access_denied' || denial.state === 'reason_required' ? 'withheld' : 'unavailable'
    commandError.value = denial.message
  }
}

function selectPeriod(id) {
  commandPeriod.value = id
  recordOffset.value = 0
  if (id !== 'custom') loadFinanceCommand()
}

function reloadRecords() {
  recordOffset.value = 0
  loadFinanceCommand()
}

function changeRecordPage(direction) {
  recordOffset.value = Math.max(0, recordOffset.value + (direction * 20))
  loadFinanceCommand()
}

async function loadFacilities() {
  loadingFacilities.value = true
  facilityError.value = ''
  facilityDenial.value = ''
  try {
    const decision = await guardPlatformRead(INTEGRATION_GRANT)
    if (!decision.proceed) {
      applyDeniedRead(
        { state: facilityState, detail: facilityDenial, clear: () => { facilities.value = [] } },
        decision
      )
      if (decision.state === 'unavailable') facilityError.value = decision.message
      return
    }
    const res = await healthInsuranceApi.getPlatformFacilities(facilityProviderId.value, reason())
    const data = unwrapPlatformBody(res.data)
    if (!data || typeof data !== 'object' || !Array.isArray(data.facilities)) {
      facilityState.value = 'malformed'
      facilities.value = []
      return
    }
    facilities.value = data.facilities
    facilityState.value = 'ok'
  } catch (err) {
    const denial = platformHttpDenial(err?.response?.status, err?.response?.data)
    facilityState.value = denial.state
    facilityDenial.value = denial.message
    facilityError.value = denial.state === 'unavailable' ? denial.message : ''
    facilities.value = []
  } finally {
    loadingFacilities.value = false
  }
}

async function loadAudit(limit = 50) {
  loadingAudit.value = true
  auditError.value = ''
  auditDenial.value = ''
  try {
    const decision = await guardPlatformRead(INTEGRATION_GRANT)
    if (!decision.proceed) {
      applyDeniedRead(
        { state: auditState, detail: auditDenial, clear: () => { auditEvents.value = [] } },
        decision
      )
      if (decision.state === 'unavailable') auditError.value = decision.message
      return
    }
    const params = { limit }
    if (auditAction.value.trim()) params.action = auditAction.value.trim()
    const res = await healthInsuranceApi.getPlatformAuditEvents(params, reason())
    const data = unwrapPlatformBody(res.data)
    if (!data || typeof data !== 'object' || !Array.isArray(data.events)) {
      auditState.value = 'malformed'
      auditEvents.value = []
      return
    }
    auditEvents.value = data.events
    auditState.value = 'ok'
  } catch (err) {
    const denial = platformHttpDenial(err?.response?.status, err?.response?.data)
    auditState.value = denial.state
    auditDenial.value = denial.message
    auditError.value = denial.state === 'unavailable' ? denial.message : ''
    auditEvents.value = []
  } finally {
    loadingAudit.value = false
  }
}

async function loadGrantFlag() {
  try {
    const grantRes = await healthInsuranceApi.getMyGrantStatus()
    const grant = unwrapPlatformBody(grantRes.data) || {}
    const parsed = readActiveGrants(grant)
    const durableActive = parsed.ok && parsed.durableEntitlements.some((row) => row.status === 'active')
    grantActive.value = parsed.ok && (Boolean(grant.hasActiveGrant || grant.hasActiveGrants) || durableActive)
  } catch {
    grantActive.value = false
  }
}

function openCreate() {
  editingVersionId.value = ''
  formError.value = ''
  form.providerId = ''
  form.name = ''
  form.code = ''
  form.premiumNaira = ''
  form.benefits = [emptyBenefit()]
  form.exclusionsText = ''
  form.effectiveFrom = new Date().toISOString().slice(0, 10)
  showCreate.value = true
}

function openEdit(plan) {
  const draft = latestDraft(plan)
  if (!draft) return
  editingVersionId.value = draft.id
  formError.value = ''
  form.providerId = plan.provider_id
  form.name = plan.name
  form.code = plan.code
  form.premiumNaira = Number.isInteger(Number(draft.premium_minor)) ? (Number(draft.premium_minor) / 100).toFixed(2) : ''
  form.billingFrequency = draft.billing_frequency || 'termly'
  form.memberCategories = [...(draft.member_categories || ['student'])]
  form.minAge = draft.eligibility_rules?.minAge ?? 0
  form.maxAge = draft.eligibility_rules?.maxAge ?? 65
  form.waitingPeriodDays = draft.eligibility_rules?.waitingPeriodDays ?? 0
  form.effectiveFrom = String(draft.effective_from || '').slice(0, 10)
  form.effectiveTo = draft.effective_to ? String(draft.effective_to).slice(0, 10) : ''
  form.benefits = benefitsFromVersion(draft.benefits)
  form.exclusionsText = (draft.exclusions || []).join('\n')
  showCreate.value = true
}

function closeCreate() {
  showCreate.value = false
  dirty.value = false
  editingVersionId.value = ''
}

function draftPayload() {
  const payload = {
    name: form.name,
    premiumNaira: form.premiumNaira,
    billingFrequency: form.billingFrequency,
    memberCategories: form.memberCategories,
    eligibilityRules: {
      minAge: form.minAge,
      maxAge: form.maxAge,
      waitingPeriodDays: form.waitingPeriodDays
    },
    exclusions: exclusionLines(form.exclusionsText),
    effectiveFrom: form.effectiveFrom,
    effectiveTo: form.effectiveTo || null
  }
  const parsed = benefitsPayload(form.benefits)
  if (parsed.error) {
    formError.value = parsed.error
    return null
  }
  payload.benefits = parsed.benefits
  return payload
}

function exclusionLines(text) {
  return String(text || '').split('\n').map((line) => line.trim()).filter(Boolean)
}

async function saveCoverage() {
  coverageError.value = ''
  const version = selectedVersion.value
  const plan = selectedPlan.value
  if (!version || !plan) return
  if (plan.status === 'retired') {
    coverageError.value = 'A retired plan cannot receive a new benefit draft.'
    return
  }
  if (!reason() || reason().trim().length < 5) {
    coverageError.value = 'Set an operational reason of at least 5 characters on Platform Governance before saving benefits.'
    return
  }
  const parsed = benefitsPayload(coverageBenefits.value)
  if (parsed.error) {
    coverageError.value = parsed.error
    return
  }
  const exclusions = exclusionLines(coverageExclusions.value)
  if (exclusions.some((item) => item.length > 200)) {
    coverageError.value = 'Each exclusion must be 200 characters or fewer.'
    return
  }
  coverageSaving.value = true
  try {
    if (version.status === 'draft') {
      await healthInsuranceApi.updatePlatformPlanDraft(version.id, {
        benefits: parsed.benefits,
        exclusions
      }, reason())
    } else {
      await healthInsuranceApi.createPlatformPlanDraft({
        providerId: plan.provider_id,
        code: plan.code,
        name: plan.name,
        premiumMinor: version.premium_minor,
        billingFrequency: version.billing_frequency,
        memberCategories: version.member_categories,
        eligibilityRules: version.eligibility_rules || {},
        benefits: parsed.benefits,
        exclusions,
        effectiveFrom: String(version.effective_from || '').slice(0, 10),
        effectiveTo: version.effective_to ? String(version.effective_to).slice(0, 10) : null
      }, reason())
    }
    $q.notify({ type: 'positive', message: version.status === 'draft' ? 'Benefits saved on this draft.' : 'Benefits saved as a new draft version. It is not published.' })
    await loadCatalogue()
  } catch (err) {
    coverageError.value = err?.response?.data?.error?.message || err?.response?.data?.message || 'Benefits were not saved.'
  } finally {
    coverageSaving.value = false
  }
}

async function saveDraft() {
  formError.value = ''
  if (!reason() || reason().trim().length < 5) {
    formError.value = 'Set an operational reason of at least 5 characters on Platform Governance before saving a plan.'
    return
  }
  saving.value = true
  try {
    const payload = draftPayload()
    if (!payload) return
    if (editingVersionId.value) {
      await healthInsuranceApi.updatePlatformPlanDraft(editingVersionId.value, payload, reason())
    } else {
      await healthInsuranceApi.createPlatformPlanDraft({
        ...payload,
        providerId: form.providerId,
        code: form.code,
        benefits: payload.benefits || []
      }, reason())
    }
    dirty.value = false
    showCreate.value = false
    editingVersionId.value = ''
    $q.notify({ type: 'positive', message: 'Draft saved. It is not published or active.' })
    await loadCatalogue()
  } catch (err) {
    formError.value = err?.response?.data?.error?.message || err?.response?.data?.message || 'Draft was not saved.'
  } finally {
    saving.value = false
  }
}

function askLifecycle(title, message, action) {
  $q.dialog({
    title,
    message,
    prompt: { model: '', type: 'text', label: 'Audit reason' },
    cancel: true,
    persistent: true
  }).onOk(async (text) => {
    if (!text || String(text).trim().length < 5) {
      $q.notify({ type: 'warning', message: 'Reason must be at least 5 characters.' })
      return
    }
    try {
      await action(String(text).trim())
      $q.notify({ type: 'positive', message: 'Plan lifecycle updated.' })
      await loadCatalogue()
    } catch (err) {
      $q.notify({ type: 'negative', message: err?.response?.data?.error?.message || 'Plan action was refused.' })
    }
  })
}

function askPublish(plan) {
  const draft = latestDraft(plan)
  if (!draft) return
  askLifecycle('Publish plan version', 'Publishing makes this version immutable. It does not activate the plan or enrol members.', (text) =>
    healthInsuranceApi.publishPlatformPlanVersion(draft.id, { reason: text }, reason()))
}

function askActivate(plan) {
  askLifecycle('Activate plan', 'Activation requires a published version. It does not enrol members.', (text) =>
    healthInsuranceApi.activatePlatformPlan(plan.id, { reason: text }, reason()))
}

function askRetire(plan) {
  askLifecycle('Retire plan', 'Retiring stops the plan from being treated as active. Versions are kept.', (text) =>
    healthInsuranceApi.retirePlatformPlan(plan.id, { reason: text }, reason()))
}

watch(form, () => {
  if (showCreate.value) dirty.value = true
}, { deep: true })

function refreshSection() {
  const id = current.value.id
  if (id === 'overview') {
    loadCatalogue()
    loadRegistry()
    loadIntegration(true)
    return
  }
  if (['plans', 'coverage'].includes(id)) loadCatalogue()
  if (['registry', 'settings', 'providers'].includes(id)) loadRegistry()
  if (['enrolment', 'members', 'billing', 'payments', 'reports'].includes(id)) loadIntegration()
  if (id === 'billing') loadFinanceCommand()
  if (id === 'telemetry') loadTelemetry()
  if (id === 'providers') loadFacilities()
  if (id === 'audit') loadAudit()
  if (id === 'governance') loadGrantFlag()
}

watch(() => route.path, () => {
  refreshSection()
})

onMounted(() => {
  refreshSection()
})

onBeforeRouteLeave((to, from, next) => {
  if (!dirty.value || !showCreate.value) return next()
  $q.dialog({
    title: 'Discard unsaved plan draft?',
    message: 'The form has not been saved.',
    cancel: true,
    persistent: true
  }).onOk(() => next()).onCancel(() => next(false))
})
</script>

<style scoped>
.overview-board {
  max-width: 1280px;
}
.chart-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 8px;
}
.kpi-grid,
.action-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(148px, 1fr));
  gap: 8px;
}
.hmo-workspace {
  color: var(--enterprise-text-main);
  min-height: 100%;
}
.hmo-note {
  background: var(--enterprise-subpanel-bg);
  color: var(--enterprise-text-secondary);
  border: 1px solid var(--enterprise-border);
}
.kpi-card,
.action-card,
.panel {
  background: var(--enterprise-panel-bg);
  border: 1px solid var(--enterprise-border);
  color: var(--enterprise-text-main);
  border-radius: 8px;
  padding: 8px 10px;
  min-height: 76px;
}
.action-card {
  display: flex;
  flex-direction: column;
  color: inherit;
  text-decoration: none;
  text-align: left;
  cursor: pointer;
}
.action-card:disabled {
  cursor: not-allowed;
  opacity: 0.72;
}
.kpi-label,
.panel-title,
.action-label {
  color: var(--enterprise-text-secondary);
  font-size: 12px;
  font-weight: 650;
}
.kpi-value {
  color: var(--enterprise-text-main);
  font-size: 20px;
  font-weight: 700;
  line-height: 1.2;
}
.kpi-detail {
  color: var(--enterprise-text-secondary);
  font-size: 12px;
  line-height: 1.35;
}
.overview-board :focus-visible {
  outline: 2px solid #5eead4;
  outline-offset: 2px;
}
@media (max-width: 599px) {
  .kpi-value {
    font-size: 18px;
  }
}
</style>

<style>
.hmo-dialog {
  background: var(--enterprise-panel-bg, #ffffff);
  color: var(--enterprise-text-main, #0f172a);
  min-width: 360px;
  max-width: 720px;
  width: 100%;
}
</style>

