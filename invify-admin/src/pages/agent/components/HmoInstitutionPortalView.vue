<template>
  <div class="column op-gap-16">
    <!--Restricted / Unapproved Banner if portalMode === 'RESTRICTED' -->
    <div v-if="portalMode === 'RESTRICTED'" class="panel-card bg-panel border-muted rounded-borders q-pa-xl column flex-center text-center op-gap-12">
      <q-icon name="gpp_maybe" size="4rem" color="amber-4" />
      <div class="text-h6 text-weight-bold">Institution Access Restricted</div>
      <div class="text-body2 text-muted" style="max-width: 520px;">
        {{ restrictionReason || 'Your institution account is pending verification or restricted from operational modules. Please contact Invify Governance.' }}
      </div>
      <div class="row op-gap-8 q-mt-sm">
        <q-badge color="amber-9" text-color="amber-2" class="q-pa-xs">
          Classification: {{ institutionType }}
        </q-badge>
        <q-badge color="blue-grey-9" text-color="grey-3" class="q-pa-xs">
          Approval Status: {{ approvalStatus }}
        </q-badge>
      </div>
    </div>

    <template v-else>
      <!-- HMO Sub-Navigation Tabs -->
      <div class="shrink-0">
        <q-tabs
          v-model="hmoTab"
          dense
          scrollable
          outside-arrows
          mobile-arrows
          class="bg-panel text-muted rounded-borders border-muted"
          active-color="teal-3"
          indicator-color="teal-3"
          align="left"
          narrow-indicator
        >
          <q-tab name="overview" label="Executive Overview" icon="dashboard" no-caps />
          <q-tab name="excel_centre" label="Excel / CSV Centre" icon="table_view" no-caps />
          <q-tab name="enrollments" label="Members & Enrollments" icon="how_to_reg" no-caps />
          <q-tab name="schools" label="Schools & Employers" icon="school" no-caps />
          <q-tab name="plans" label="Plans & Benefits" icon="health_and_safety" no-caps />
          <q-tab name="providers" label="Provider Network" icon="local_hospital" no-caps />
          <q-tab name="claims" label="Pre-Auth & Claims" icon="fact_check" no-caps />
          <q-tab name="billing" label="Billing & Reconciliation" icon="account_balance" no-caps />
          <q-tab name="users_audit" label="RBAC & Audit Trail" icon="admin_panel_settings" no-caps />
          <q-tab name="org_profile" label="HMO Profile & 2FA" icon="verified_user" no-caps />
        </q-tabs>
      </div>

      <q-tab-panels v-model="hmoTab" animated class="bg-transparent">
        <!-- 1. EXECUTIVE OVERVIEW TAB (12 MANDATORY HMO KPIs) -->
        <q-tab-panel name="overview" class="q-pa-none column op-gap-16">
          <!-- Identity & Regulatory Status Strip -->
          <div class="bg-panel border-muted rounded-borders q-pa-md row items-center justify-between op-gap-12">
            <div class="row items-center op-gap-12">
              <q-avatar color="teal-9" text-color="teal-2" icon="health_and_safety" size="44px" />
              <div>
                <div class="row items-center op-gap-8">
                  <span class="text-subtitle1 text-weight-bold">{{ orgProfile.tradingName || identity.institution || identity.name }}</span>
                  <q-badge color="teal-9" text-color="teal-2">HMO INSTITUTION</q-badge>
                  <q-badge color="green-9" text-color="green-2">{{ orgProfile.regulatorType || 'NHIA' }} VERIFIED</q-badge>
                </div>
                <div class="text-caption text-muted">
                  Code: <span class="text-amber-4 text-weight-bold">{{ identity.agentCode }}</span>
                  <span class="q-mx-xs">•</span>
                  Licence: <span class="text-main">{{ orgProfile.licenceReference || 'NHIA/HMO/060' }}</span>
                  <span class="q-mx-xs">•</span>
                  Role: <span class="text-teal-3">{{ currentRole }}</span>
                </div>
              </div>
            </div>
            <div class="row op-gap-8">
              <q-btn dense color="teal-4" text-color="black" icon="download" label="Export Enrollment Batch" no-caps class="text-weight-bold q-px-sm" @click="hmoTab = 'excel_centre'" />
              <q-btn dense outline color="amber-4" icon="upload_file" label="Upload Processed Sheet" no-caps class="q-px-sm" @click="hmoTab = 'excel_centre'" />
            </div>
          </div>

          <!-- 12 Mandatory HMO KPI Cards (3 rows x 4 columns) -->
          <div class="row q-col-gutter-md">
            <div
              v-for="(kpi, key) in hmoKpisList"
              :key="key"
              class="col-xs-12 col-sm-6 col-md-3"
            >
              <div class="bg-panel border-muted rounded-borders q-pa-md row items-center justify-between full-height">
                <div>
                  <div class="text-caption text-muted">{{ kpi.label }}</div>
                  <div class="text-h5 text-weight-bold q-mt-xs" :class="`text-${kpi.color || 'main'}`">
                    {{ Number(kpi.value || 0).toLocaleString() }}
                  </div>
                </div>
                <q-icon :name="kpi.icon || 'analytics'" :color="kpi.color || 'teal-4'" size="md" />
              </div>
            </div>
          </div>

          <!-- Quick Actions + Batch Pipeline Breakdown -->
          <div class="row q-col-gutter-md">
            <div class="col-xs-12 col-md-7">
              <div class="bg-panel border-muted rounded-borders q-pa-md full-height column justify-between">
                <div class="text-caption text-weight-bold text-uppercase text-muted q-mb-sm">HMO Operational Quick Actions</div>
                <div class="row q-col-gutter-sm">
                  <div
                    v-for="action in quickActions"
                    :key="action.key"
                    class="col-xs-6 col-sm-4"
                  >
                    <div
                      class="bg-panel-darker border-muted rounded-borders q-pa-md column items-center justify-center text-center cursor-pointer hover-card full-height"
                      @click="hmoTab = action.tab"
                    >
                      <q-icon :name="action.icon" color="teal-3" size="sm" class="q-mb-xs" />
                      <div class="text-caption text-weight-bold">{{ action.label }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="col-xs-12 col-md-5">
              <div class="bg-panel border-muted rounded-borders q-pa-md full-height column justify-between">
                <div class="text-caption text-weight-bold text-uppercase text-muted q-mb-sm">Excel / CSV Batch Pipeline</div>
                <div class="column op-gap-8">
                  <div class="row justify-between items-center border-bottom-light q-pb-xs">
                    <span class="text-caption text-muted">Ready for Export</span>
                    <q-badge color="blue-9" text-color="blue-2">{{ batchBreakdown.readyForExport || 0 }}</q-badge>
                  </div>
                  <div class="row justify-between items-center border-bottom-light q-pb-xs">
                    <span class="text-caption text-muted">Exported / Awaiting HMO Response</span>
                    <q-badge color="amber-9" text-color="amber-2">{{ batchBreakdown.awaitingResponse || 0 }}</q-badge>
                  </div>
                  <div class="row justify-between items-center border-bottom-light q-pb-xs">
                    <span class="text-caption text-muted">Partially Processed</span>
                    <q-badge color="orange-9" text-color="orange-2">{{ batchBreakdown.partiallyProcessed || 0 }}</q-badge>
                  </div>
                  <div class="row justify-between items-center">
                    <span class="text-caption text-muted">Reconciled & Completed</span>
                    <q-badge color="green-9" text-color="green-2">{{ batchBreakdown.reconciled || 0 }}</q-badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </q-tab-panel>

        <!-- 2. EXCEL / CSV INTEGRATION CENTRE (PRIORITY MODULE) -->
        <q-tab-panel name="excel_centre" class="q-pa-none column op-gap-16">
          <div class="row q-col-gutter-md">
            <!-- Left: Export Enrollment Batches -->
            <div class="col-xs-12 col-md-6">
              <div class="bg-panel border-muted rounded-borders q-pa-md column op-gap-12 full-height">
                <div class="row items-center justify-between">
                  <div>
                    <div class="text-subtitle2 text-weight-bold text-teal-3">1. Outbound Enrollment Batch Export</div>
                    <div class="text-caption text-muted">Generate formula-sanitized CSV/Excel batches for HMO underwriting</div>
                  </div>
                  <q-btn
                    dense
                    color="teal-4"
                    text-color="black"
                    icon="add_box"
                    label="New Enrollment Batch"
                    no-caps
                    class="text-weight-bold q-px-sm"
                    :loading="creatingBatch"
                    @click="handleCreateBatch"
                  />
                </div>

                <div v-if="!batches.length" class="bg-panel-darker border-muted rounded-borders q-pa-lg text-center text-muted text-caption">
                  No enrollment batches created yet. Click "New Enrollment Batch" to bundle pending school enrollments.
                </div>

                <div v-else class="column op-gap-8" style="max-height: 360px; overflow-y: auto;">
                  <div
                    v-for="b in batches"
                    :key="b.id"
                    class="bg-panel-darker border-muted rounded-borders q-pa-sm row items-center justify-between"
                  >
                    <div>
                      <div class="row items-center op-gap-8">
                        <span class="text-weight-bold text-caption">{{ b.batch_reference }}</span>
                        <q-badge :color="batchStatusColor(b.status)">{{ b.status }}</q-badge>
                      </div>
                      <div class="text-caption text-muted" style="font-size: 11px;">
                        Rows: {{ b.total_rows || 0 }} (Valid: {{ b.valid_rows || 0 }}, Confirmed: {{ b.confirmed_rows || 0 }}, Rejected: {{ b.rejected_rows || 0 }})
                      </div>
                    </div>
                    <div class="row op-gap-8">
                      <q-btn
                        dense
                        outline
                        color="teal-3"
                        icon="download"
                        label="Download CSV"
                        size="sm"
                        no-caps
                        @click="handleDownloadBatchCsv(b)"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Right: Upload & Reconcile Processed HMO Sheet -->
            <div class="col-xs-12 col-md-6">
              <div class="bg-panel border-muted rounded-borders q-pa-md column op-gap-12 full-height">
                <div>
                  <div class="text-subtitle2 text-weight-bold text-amber-4">2. Processed HMO Response Upload & Reconciliation</div>
                  <div class="text-caption text-muted">
                    Upload the processed CSV containing <code class="text-teal-3">INVIFY_ENROLMENT_REF</code>, <code class="text-teal-3">HMO_MEMBER_ID</code>, and <code class="text-teal-3">HMO_CONFIRMATION_STATUS</code>.
                  </div>
                </div>

                <q-select
                  v-model="selectedReconcileBatchId"
                  :options="batchSelectOptions"
                  emit-value
                  map-options
                  dark
                  filled
                  dense
                  clearable
                  label="Target Enrollment Batch (Optional — leave blank to match across all HMO batches)"
                  class="bg-panel-darker"
                />

                <q-file
                  v-model="responseCsvFile"
                  dark
                  filled
                  dense
                  accept=".csv,text/csv"
                  label="Select Processed HMO Response CSV File"
                  class="bg-panel-darker"
                  @update:model-value="onResponseFileSelected"
                >
                  <template v-slot:prepend>
                    <q-icon name="upload_file" color="amber-4" />
                  </template>
                </q-file>

                <q-input
                  v-model="responseCsvText"
                  dark
                  filled
                  dense
                  type="textarea"
                  rows="5"
                  label="Or Paste Processed CSV Content Directly"
                  placeholder="BATCH_REF,INVIFY_ENROLMENT_REF,HMO_MEMBER_ID,HMO_POLICY_NUMBER,HMO_CONFIRMATION_STATUS,CONFIRMED_START_DATE,CONFIRMED_END_DATE&#10;BATCH-MHMO-001,ENR-1234ABCD,MHMO/2026/0091,POL-991,CONFIRMED,2026-09-01,2027-08-31"
                  class="bg-panel-darker font-mono"
                />

                <div class="row op-gap-8 justify-end">
                  <q-btn
                    outline
                    color="cyan-3"
                    icon="visibility"
                    label="Preview Reconciliation"
                    no-caps
                    :loading="reconciling"
                    :disable="!responseCsvText.trim()"
                    @click="handleReconcileSheet(false)"
                  />
                  <q-btn
                    color="amber-4"
                    text-color="black"
                    icon="task_alt"
                    label="Commit & Activate Policies"
                    class="text-weight-bold"
                    no-caps
                    :loading="reconciling"
                    :disable="!responseCsvText.trim()"
                    @click="handleReconcileSheet(true)"
                  />
                </div>

                <!-- Reconciliation Preview / Commit Result Summary -->
                <div v-if="reconciliationResult" class="bg-panel-darker border-muted rounded-borders q-pa-md column op-gap-8">
                  <div class="row items-center justify-between">
                    <span class="text-caption text-weight-bold text-teal-3">
                      Reconciliation {{ reconciliationResult.mode }} — SHA256: {{ String(reconciliationResult.checksumSha256 || '').slice(0, 12) }}…
                    </span>
                    <q-badge color="teal-9" text-color="teal-2">
                      Next Batch State: {{ reconciliationResult.summary?.nextBatchStatus }}
                    </q-badge>
                  </div>
                  <div class="row q-col-gutter-sm text-caption">
                    <div class="col-4">Total Rows: <b>{{ reconciliationResult.summary?.totalRows || 0 }}</b></div>
                    <div class="col-4 text-green-4">Confirmed: <b>{{ reconciliationResult.summary?.confirmedRows || 0 }}</b></div>
                    <div class="col-4 text-orange-4">Rejected: <b>{{ reconciliationResult.summary?.rejectedRows || 0 }}</b></div>
                    <div class="col-4 text-red-4">Unmatched: <b>{{ reconciliationResult.summary?.unmatchedRows || 0 }}</b></div>
                    <div class="col-4 text-amber-4">Duplicates Ignored: <b>{{ reconciliationResult.summary?.duplicateRows || 0 }}</b></div>
                    <div class="col-4 text-red-3">Validation Errors: <b>{{ reconciliationResult.summary?.invalidRows || 0 }}</b></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Export Column Mapping Configuration -->
          <div class="bg-panel border-muted rounded-borders q-pa-md column op-gap-8">
            <div class="row items-center justify-between">
              <div>
                <div class="text-subtitle2 text-weight-bold">Configurable HMO Export Template Mapping</div>
                <div class="text-caption text-muted">Active Template: {{ activeMapping?.template_name || 'MHMO Standard Enrollment Exchange v1' }} ({{ activeMapping?.date_format || 'YYYY-MM-DD' }})</div>
              </div>
              <q-badge color="green-9" text-color="green-2">Formula Injection Guard Active (CWE-1236)</q-badge>
            </div>
            <div class="row q-col-gutter-xs q-mt-xs">
              <div
                v-for="(col, idx) in (activeMapping?.column_mappings || [])"
                :key="idx"
                class="col-xs-6 col-sm-3 col-md-2"
              >
                <div class="bg-panel-darker border-muted rounded-borders q-pa-xs text-caption">
                  <div class="text-weight-bold text-teal-3" style="font-size: 10px;">{{ col.headerName }}</div>
                  <div class="text-muted" style="font-size: 9px;">← {{ col.sourceField }}</div>
                </div>
              </div>
            </div>
          </div>
        </q-tab-panel>

        <!-- 3. MEMBERS & ENROLLMENTS TAB -->
        <q-tab-panel name="enrollments" class="q-pa-none column op-gap-16">
          <div class="bg-panel border-muted rounded-borders q-pa-md column op-gap-12">
            <div class="row items-center justify-between op-gap-12">
              <div>
                <div class="text-subtitle1 text-weight-bold">Member & Enrollment Confirmation Queue</div>
                <div class="text-caption text-muted">Review enrollments submitted by participating schools/employers and assign HMO Member IDs</div>
              </div>
              <div class="row op-gap-8 items-center">
                <q-input
                  v-model="enrollmentSearch"
                  dark
                  filled
                  dense
                  placeholder="Search ref, school, plan..."
                  class="bg-panel-darker"
                  @keyup.enter="loadEnrollments"
                >
                  <template v-slot:append>
                    <q-icon name="search" class="cursor-pointer" @click="loadEnrollments" />
                  </template>
                </q-input>
                <q-btn dense flat icon="refresh" color="teal-3" @click="loadEnrollments" />
              </div>
            </div>

            <div v-if="!enrollments.length" class="bg-panel-darker border-muted rounded-borders q-pa-lg text-center text-muted text-caption">
              No enrollments found for this HMO's plans yet.
            </div>

            <div v-else class="column op-gap-8">
              <div
                v-for="enr in enrollments"
                :key="enr.id"
                class="bg-panel-darker border-muted rounded-borders q-pa-sm row items-center justify-between op-gap-8"
              >
                <div class="col-xs-12 col-md-5">
                  <div class="row items-center op-gap-8">
                    <span class="text-weight-bold text-teal-3">{{ enr.enrolmentReference }}</span>
                    <q-badge :color="enr.status === 'active' ? 'green-9' : enr.status === 'rejected' ? 'red-9' : 'amber-9'">
                      {{ enr.status }}
                    </q-badge>
                    <span class="text-caption text-muted">• {{ enr.memberCategory }}</span>
                  </div>
                  <div class="text-caption text-muted">
                    School: <b class="text-main">{{ enr.schoolName }}</b> | Plan: <b class="text-main">{{ enr.planName }} ({{ enr.planCode }})</b>
                  </div>
                  <div class="text-caption text-muted" style="font-size: 11px;">
                    Period: {{ enr.periodStart }} → {{ enr.periodEnd }}
                    <template v-if="enr.insurerMemberRef"> | HMO ID: <b class="text-green-4">{{ enr.insurerMemberRef }}</b></template>
                  </div>
                </div>
                <div class="row op-gap-8 items-center">
                  <q-input
                    v-model="enr._inputMemberId"
                    dark
                    filled
                    dense
                    placeholder="HMO Member ID (e.g. MHMO/26/001)"
                    class="bg-panel"
                    style="width: 210px;"
                  />
                  <q-btn
                    dense
                    color="green-5"
                    text-color="black"
                    label="Confirm Coverage"
                    no-caps
                    class="text-weight-bold q-px-sm"
                    @click="handleAdjudicateEnrollment(enr, 'confirm')"
                  />
                  <q-btn
                    dense
                    outline
                    color="red-4"
                    label="Reject"
                    no-caps
                    class="q-px-sm"
                    @click="handleAdjudicateEnrollment(enr, 'reject')"
                  />
                </div>
              </div>
            </div>
          </div>
        </q-tab-panel>

        <!-- 4. SCHOOLS & EMPLOYERS NETWORK TAB -->
        <q-tab-panel name="schools" class="q-pa-none column op-gap-16">
          <div class="bg-panel border-muted rounded-borders q-pa-md column op-gap-12">
            <div class="row items-center justify-between">
              <div>
                <div class="text-subtitle1 text-weight-bold">Participating Schools & Employers Network</div>
                <div class="text-caption text-muted">Schools and organizations offering your HMO health plans on Invify</div>
              </div>
              <q-btn dense flat icon="refresh" color="teal-3" @click="loadSchools" />
            </div>

            <div v-if="!schools.length" class="bg-panel-darker border-muted rounded-borders q-pa-lg text-center text-muted text-caption">
              No schools or employers linked yet. When schools select your HMO plans, they appear here.
            </div>

            <div v-else class="row q-col-gutter-md">
              <div v-for="sch in schools" :key="sch.tenantId" class="col-xs-12 col-md-6">
                <div class="bg-panel-darker border-muted rounded-borders q-pa-md column op-gap-8">
                  <div class="row items-center justify-between">
                    <div class="text-subtitle2 text-weight-bold">{{ sch.schoolName }}</div>
                    <q-badge :color="sch.onboardingStatus === 'active' ? 'green-9' : 'amber-9'">
                      {{ sch.onboardingStatus }}
                    </q-badge>
                  </div>
                  <div class="text-caption text-muted">
                    Type: {{ sch.tenantType }} | State: {{ sch.state }} | Contact: {{ sch.contactEmail || sch.contactPhone || 'N/A' }}
                  </div>
                  <div class="row justify-between text-caption q-pt-xs border-top">
                    <span>Total Enrolled: <b>{{ sch.enrolledMembers }}</b></span>
                    <span class="text-green-4">Active Covered: <b>{{ sch.activeMembers }}</b></span>
                    <span class="text-amber-4">Pending Confirmation: <b>{{ sch.pendingMembers }}</b></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </q-tab-panel>

        <!-- 5. PLANS & BENEFITS TAB -->
        <q-tab-panel name="plans" class="q-pa-none column op-gap-16">
          <div class="row q-col-gutter-md">
            <div class="col-xs-12 col-md-5">
              <div class="bg-panel border-muted rounded-borders q-pa-md column op-gap-12">
                <div class="text-subtitle2 text-weight-bold text-teal-3">Create / Version HMO Health Plan</div>
                <q-input v-model="newPlan.code" dark filled dense label="Plan Code (e.g. MHMO-STUDENT-GOLD)" class="bg-panel-darker" />
                <q-input v-model="newPlan.name" dark filled dense label="Plan Display Name" class="bg-panel-darker" />
                <div class="row q-col-gutter-sm">
                  <div class="col-6">
                    <q-input v-model.number="newPlan.premiumNaira" dark filled dense type="number" label="Premium (₦ NGN)" class="bg-panel-darker" />
                  </div>
                  <div class="col-6">
                    <q-select
                      v-model="newPlan.billingFrequency"
                      :options="['termly', 'annual', 'quarterly', 'monthly']"
                      dark
                      filled
                      dense
                      label="Billing Cycle"
                      class="bg-panel-darker"
                    />
                  </div>
                </div>
                <div class="row q-col-gutter-sm">
                  <div class="col-6">
                    <q-input v-model.number="newPlan.waitingPeriodDays" dark filled dense type="number" label="Waiting Period (Days)" class="bg-panel-darker" />
                  </div>
                  <div class="col-6">
                    <q-input v-model="newPlan.effectiveFrom" dark filled dense type="date" label="Effective From" class="bg-panel-darker" />
                  </div>
                </div>
                <q-checkbox v-model="newPlan.publishImmediately" dark label="Publish Plan Version Immediately" color="teal-4" />
                <q-btn
                  color="teal-4"
                  text-color="black"
                  icon="save"
                  label="Save & Publish Plan Version"
                  class="text-weight-bold"
                  no-caps
                  :loading="savingPlan"
                  @click="handleCreatePlan"
                />
              </div>
            </div>

            <div class="col-xs-12 col-md-7">
              <div class="bg-panel border-muted rounded-borders q-pa-md column op-gap-12 full-height">
                <div class="row items-center justify-between">
                  <div class="text-subtitle2 text-weight-bold">Published & Draft HMO Plans ({{ plans.length }})</div>
                  <q-btn dense flat icon="refresh" color="teal-3" @click="loadPlans" />
                </div>
                <div v-if="!plans.length" class="text-caption text-muted q-pa-md text-center">
                  No health plans configured yet. Use the form to create your first HMO plan.
                </div>
                <div v-else class="column op-gap-8">
                  <div v-for="p in plans" :key="p.id" class="bg-panel-darker border-muted rounded-borders q-pa-md row items-center justify-between">
                    <div>
                      <div class="row items-center op-gap-8">
                        <span class="text-weight-bold">{{ p.name }}</span>
                        <q-badge color="teal-9" text-color="teal-2">{{ p.code }}</q-badge>
                        <q-badge :color="p.status === 'active' ? 'green-9' : 'grey-8'">{{ p.status }}</q-badge>
                      </div>
                      <div class="text-caption text-muted q-mt-xs" v-if="p.latestVersion">
                        v{{ p.latestVersion.version }} • ₦{{ (Number(p.latestVersion.premium_minor || 0) / 100).toLocaleString() }} ({{ p.latestVersion.billing_frequency }})
                        • Categories: {{ (p.latestVersion.member_categories || []).join(', ') }}
                      </div>
                    </div>
                    <div class="row op-gap-4">
                      <q-btn
                        v-if="p.status !== 'active'"
                        dense
                        flat
                        color="green-4"
                        label="Activate"
                        no-caps
                        @click="handleTogglePlanStatus(p.id, 'active')"
                      />
                      <q-btn
                        v-else
                        dense
                        flat
                        color="orange-4"
                        label="Retire"
                        no-caps
                        @click="handleTogglePlanStatus(p.id, 'retired')"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </q-tab-panel>

        <!-- 6. PROVIDER NETWORK (HOSPITALS & CLINICS) TAB -->
        <q-tab-panel name="providers" class="q-pa-none column op-gap-16">
          <div class="row q-col-gutter-md">
            <div class="col-xs-12 col-md-5">
              <div class="bg-panel border-muted rounded-borders q-pa-md column op-gap-12">
                <div class="row items-center justify-between">
                  <div class="text-subtitle2 text-weight-bold text-teal-3">Add Accredited Hospital / Clinic</div>
                  <q-badge color="teal-9" text-color="teal-2">GEO-TAGGED</q-badge>
                </div>

                <q-input v-model="newFacility.external_ref" dark filled dense label="Hospital Code (e.g. MHMO-LAG-001) *" class="bg-panel-darker text-caption" />
                <q-input v-model="newFacility.name" dark filled dense label="Hospital / Facility Name *" class="bg-panel-darker text-caption" />

                <!-- Provider Official Logo Upload -->
                <div class="bg-panel-darker rounded-borders border-muted q-pa-sm column op-gap-6">
                  <div class="row items-center justify-between">
                    <span class="text-caption text-weight-bold text-muted" style="font-size: 10px;">FACILITY LOGO (PNG, JPEG, WebP - MAX 3MB)</span>
                    <span v-if="facilityLogoFile" class="text-caption text-teal-3" style="font-size: 9px;">{{ (facilityLogoFile.size / 1024).toFixed(0) }} KB</span>
                  </div>
                  <div class="row items-center op-gap-12" v-if="facilityLogoPreview">
                    <q-avatar size="44px" class="bg-panel rounded-borders border-muted">
                      <img :src="facilityLogoPreview" alt="Provider Logo" style="object-fit: contain;" />
                    </q-avatar>
                    <div class="column col">
                      <span class="text-caption text-weight-bold ellipsis">{{ facilityLogoFile?.name || 'Selected Logo' }}</span>
                      <span class="text-caption text-muted" style="font-size: 9px;">Recommended: 512 × 512 px square</span>
                    </div>
                    <q-btn flat round dense size="sm" icon="close" color="red-4" @click="clearFacilityLogo">
                      <q-tooltip>Remove logo</q-tooltip>
                    </q-btn>
                  </div>
                  <q-file
                    v-model="facilityLogoFile"
                    dark filled dense
                    label="Upload Facility Logo (512x512 standard)"
                    accept="image/png,image/jpeg,image/webp"
                    class="bg-panel text-caption"
                    @update:model-value="onFacilityLogoSelected"
                  >
                    <template v-slot:prepend><q-icon name="add_photo_alternate" color="teal-3" /></template>
                  </q-file>
                </div>

                <div class="row q-col-gutter-sm">
                  <div class="col-6">
                    <q-input v-model="newFacility.state" dark filled dense label="State *" class="bg-panel-darker text-caption" />
                  </div>
                  <div class="col-6">
                    <q-input v-model="newFacility.lga" dark filled dense label="City / LGA *" class="bg-panel-darker text-caption" />
                  </div>
                </div>

                <q-input v-model="newFacility.phone" dark filled dense label="Emergency / Frontdesk Phone" class="bg-panel-darker text-caption" />
                <q-input v-model="newFacility.address" dark filled dense label="Street Address" class="bg-panel-darker text-caption" />

                <!-- Map Coordinates & Geolocation -->
                <div class="bg-panel-darker rounded-borders border-muted q-pa-sm column op-gap-6">
                  <div class="row items-center justify-between">
                    <span class="text-caption text-weight-bold text-teal-3" style="font-size: 10px;">MAP COORDINATES & NAVIGATION</span>
                    <q-btn flat dense size="xs" color="teal-3" icon="my_location" label="Detect GPS" @click="detectFacilityLocation" :loading="detectingGps" />
                  </div>
                  <div class="row q-col-gutter-sm">
                    <div class="col-6">
                      <q-input v-model="newFacility.latitude" dark filled dense label="Latitude (e.g. 6.5244)" class="bg-panel text-caption" />
                    </div>
                    <div class="col-6">
                      <q-input v-model="newFacility.longitude" dark filled dense label="Longitude (e.g. 3.3792)" class="bg-panel text-caption" />
                    </div>
                  </div>
                  <div v-if="newFacility.latitude && newFacility.longitude" class="row items-center justify-between q-mt-xs">
                    <span class="text-caption text-muted font-mono" style="font-size: 9px;">GPS: {{ newFacility.latitude }}, {{ newFacility.longitude }}</span>
                    <a :href="`https://www.google.com/maps?q=${newFacility.latitude},${newFacility.longitude}`" target="_blank" class="text-caption text-teal-3" style="font-size: 10px; text-decoration: underline;">
                      <q-icon name="open_in_new" size="12px" class="q-mr-xs" />Preview on Google Maps
                    </a>
                  </div>
                </div>

                <!-- Services Multi-Select Dropdown with Chips & Custom Input -->
                <div class="column op-gap-4">
                  <label class="text-caption text-muted" style="font-size: 10px;">ACCREDITED HEALTHCARE SERVICES *</label>
                  <q-select
                    v-model="newFacility.servicesList"
                    multiple
                    use-chips
                    use-input
                    new-value-mode="add-unique"
                    :options="standardFacilityServices"
                    dark filled dense
                    label="Select or type custom services..."
                    class="bg-panel-darker text-caption"
                  >
                    <template v-slot:selected-item="scope">
                      <q-chip
                        removable
                        dense
                        @remove="scope.removeAtIndex(scope.index)"
                        :tabindex="scope.tabindex"
                        color="teal-9"
                        text-color="teal-2"
                        class="q-ma-none q-mr-xs"
                        style="font-size: 11px;"
                      >
                        {{ scope.opt }}
                      </q-chip>
                    </template>
                  </q-select>
                </div>

                <q-btn
                  color="teal-4"
                  text-color="black"
                  icon="add_business"
                  label="Save Accredited Provider"
                  class="text-weight-bold full-width q-mt-xs"
                  no-caps
                  :loading="savingFacility"
                  @click="handleSaveFacility"
                />
              </div>
            </div>

            <div class="col-xs-12 col-md-7">
              <div class="bg-panel border-muted rounded-borders q-pa-md column op-gap-12 full-height">
                <div class="row items-center justify-between">
                  <div class="text-subtitle2 text-weight-bold">Accredited Provider Network ({{ facilities.length }})</div>
                  <q-btn dense flat icon="refresh" color="teal-3" @click="loadFacilities" />
                </div>
                <div v-if="!facilities.length" class="text-caption text-muted q-pa-md text-center">
                  No accredited hospitals or clinics registered in your HMO directory yet.
                </div>
                <div v-else class="column op-gap-8" style="max-height: 720px; overflow-y: auto;">
                  <div v-for="fac in facilities" :key="fac.id" class="bg-panel-darker border-muted rounded-borders q-pa-sm row items-start justify-between op-gap-12">
                    <div class="row items-start op-gap-12 col">
                      <q-avatar size="44px" rounded class="bg-panel border-muted shrink-0">
                        <img v-if="fac.logo_url" :src="fac.logo_url" alt="Logo" style="object-fit: contain;" />
                        <q-icon v-else name="local_hospital" color="teal-3" size="24px" />
                      </q-avatar>
                      <div class="column col">
                        <div class="row items-center op-gap-8">
                          <span class="text-weight-bold text-subtitle2">{{ fac.name }}</span>
                          <q-badge color="teal-9" text-color="teal-2">{{ fac.external_ref }}</q-badge>
                        </div>
                        <div class="text-caption text-muted">
                          {{ fac.address || 'Address unlisted' }} • {{ fac.lga }}, {{ fac.state }} • {{ fac.phone || 'No phone' }}
                        </div>
                        <div class="row items-center op-gap-8 q-mt-xs" v-if="fac.latitude && fac.longitude">
                          <q-badge color="blue-grey-9" text-color="teal-3" class="font-mono" style="font-size: 9px;">
                            <q-icon name="place" size="10px" class="q-mr-xs" />{{ fac.latitude }}, {{ fac.longitude }}
                          </q-badge>
                          <a :href="`https://www.google.com/maps?q=${fac.latitude},${fac.longitude}`" target="_blank" class="text-caption text-teal-3 font-mono" style="font-size: 9px; text-decoration: underline;">
                            <q-icon name="open_in_new" size="10px" class="q-mr-xs" />Map
                          </a>
                        </div>
                        <div class="row op-gap-4 q-mt-xs wrap">
                          <q-badge v-for="svc in (fac.services || [])" :key="svc" color="grey-9" text-color="grey-3" style="font-size: 10px;">
                            {{ svc }}
                          </q-badge>
                        </div>
                      </div>
                    </div>
                    <q-badge :color="fac.is_active ? 'green-9' : 'red-9'">
                      {{ fac.is_active ? 'ACTIVE' : 'SUSPENDED' }}
                    </q-badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </q-tab-panel>

        <!-- 7. PRE-AUTHORIZATION & CLAIMS TAB -->
        <q-tab-panel name="claims" class="q-pa-none column op-gap-16">
          <div class="bg-panel border-muted rounded-borders q-pa-md column op-gap-12">
            <div class="row items-center justify-between">
              <div>
                <div class="text-subtitle1 text-weight-bold">Pre-Authorization & Claims Adjudication</div>
                <div class="text-caption text-muted">Review treatment pre-authorization requests and provider claims (separated from payment execution)</div>
              </div>
              <q-btn dense flat icon="refresh" color="teal-3" @click="loadClaims" />
            </div>

            <div v-if="!claimsList.length" class="bg-panel-darker border-muted rounded-borders q-pa-lg text-center text-muted text-caption">
              No pending pre-authorization or claim records found.
            </div>

            <div v-else class="column op-gap-8">
              <div v-for="clm in claimsList" :key="clm.id" class="bg-panel-darker border-muted rounded-borders q-pa-sm row items-center justify-between">
                <div>
                  <div class="row items-center op-gap-8">
                    <span class="text-weight-bold">{{ clm.claim_reference }}</span>
                    <q-badge color="indigo-9" text-color="indigo-2">{{ clm.record_type }}</q-badge>
                    <q-badge :color="clm.status === 'approved' || clm.status === 'settled' ? 'green-9' : clm.status === 'rejected' ? 'red-9' : 'amber-9'">
                      {{ clm.status }}
                    </q-badge>
                  </div>
                  <div class="text-caption text-muted">
                    Policy: {{ clm.policyNumber || clm.policy_id }} • Submitted: {{ clm.submitted_date }}
                    • Amount: ₦{{ (Number(clm.authorised_amount_minor || 0) / 100).toLocaleString() }}
                  </div>
                </div>
                <div class="row op-gap-8">
                  <q-btn dense color="green-5" text-color="black" label="Approve" no-caps @click="handleAdjudicateClaim(clm.id, 'approved')" />
                  <q-btn dense outline color="red-4" label="Reject" no-caps @click="handleAdjudicateClaim(clm.id, 'rejected')" />
                </div>
              </div>
            </div>
          </div>
        </q-tab-panel>

        <!-- 8. BILLING & PREMIUM RECONCILIATION TAB -->
        <q-tab-panel name="billing" class="q-pa-none column op-gap-16">
          <div class="row q-col-gutter-md">
            <div class="col-xs-12 col-sm-4">
              <div class="bg-panel border-muted rounded-borders q-pa-md">
                <div class="text-caption text-muted">Total Invoiced Premiums</div>
                <div class="text-h5 text-weight-bold text-main">
                  ₦{{ (Number(billingData.summary?.totalInvoicedMinor || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 }) }}
                </div>
              </div>
            </div>
            <div class="col-xs-12 col-sm-4">
              <div class="bg-panel border-muted rounded-borders q-pa-md">
                <div class="text-caption text-muted">Collected & Reconciled Premiums</div>
                <div class="text-h5 text-weight-bold text-green-4">
                  ₦{{ (Number(billingData.summary?.totalPaidMinor || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 }) }}
                </div>
              </div>
            </div>
            <div class="col-xs-12 col-sm-4">
              <div class="bg-panel border-muted rounded-borders q-pa-md">
                <div class="text-caption text-muted">Outstanding School/Guardian Premiums</div>
                <div class="text-h5 text-weight-bold text-amber-4">
                  ₦{{ (Number(billingData.summary?.outstandingMinor || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 }) }}
                </div>
              </div>
            </div>
          </div>

          <div class="bg-panel border-muted rounded-borders q-pa-md column op-gap-8">
            <div class="text-subtitle2 text-weight-bold">Profit-Sharing & Remittance Statements</div>
            <div v-if="!billingData.statements?.length" class="text-caption text-muted q-pa-md text-center">
              No periodic profit-sharing or remittance statements generated for this HMO period yet.
            </div>
            <div v-else class="column op-gap-8">
              <div v-for="st in billingData.statements" :key="st.id" class="bg-panel-darker border-muted rounded-borders q-pa-sm row justify-between items-center">
                <div>
                  <div class="text-weight-bold text-caption">{{ st.statement_reference }} ({{ st.period_key }})</div>
                  <div class="text-caption text-muted">HMO Share: ₦{{ (Number(st.hmo_share_minor || 0) / 100).toLocaleString() }}</div>
                </div>
                <q-badge color="teal-9" text-color="teal-2">{{ st.status }}</q-badge>
              </div>
            </div>
          </div>
        </q-tab-panel>

        <!-- 9. RBAC & AUDIT TRAIL TAB -->
        <q-tab-panel name="users_audit" class="q-pa-none column op-gap-16">
          <div class="bg-panel border-muted rounded-borders q-pa-md column op-gap-12">
            <div class="text-subtitle1 text-weight-bold">HMO Role-Based Access Control (RBAC) & Import Audit Trail</div>
            <div class="text-caption text-muted">
              Active Role: <b class="text-teal-3">{{ currentRole }}</b> • Granted Capabilities: {{ (permissions || []).join(', ') }}
            </div>

            <div class="text-subtitle2 text-weight-bold q-mt-sm">Recent Spreadsheet Reconciliation Audit Log</div>
            <div v-if="!auditData.recentImportAudit?.length" class="text-caption text-muted">
              No spreadsheet import jobs recorded yet.
            </div>
            <div v-else class="column op-gap-8">
              <div v-for="job in auditData.recentImportAudit" :key="job.id" class="bg-panel-darker border-muted rounded-borders q-pa-sm row justify-between items-center">
                <div>
                  <div class="text-weight-bold text-caption">{{ job.job_reference }} — {{ job.file_name }}</div>
                  <div class="text-caption text-muted">
                    Confirmed: {{ job.confirmed_rows }} | Rejected: {{ job.rejected_rows }} | Unmatched: {{ job.unmatched_rows }} | SHA256: {{ String(job.file_checksum_sha256 || '').slice(0, 12) }}…
                  </div>
                </div>
                <q-badge color="green-9" text-color="green-2">{{ job.status }}</q-badge>
              </div>
            </div>
          </div>
        </q-tab-panel>

        <!-- 10. ORGANIZATION PROFILE & 2FA SECURITY TAB -->
        <q-tab-panel name="org_profile" class="q-pa-none column op-gap-16">
          <div class="row q-col-gutter-md">
            <div class="col-xs-12 col-md-7">
              <div class="bg-panel border-muted rounded-borders q-pa-md column op-gap-12">
                <div class="text-subtitle1 text-weight-bold">HMO Organization Profile & Regulatory Credentials</div>
                <div class="row q-col-gutter-sm">
                  <div class="col-6">
                    <q-input v-model="orgProfile.legalName" dark filled dense label="Registered Legal Name" class="bg-panel-darker" />
                  </div>
                  <div class="col-6">
                    <q-input v-model="orgProfile.tradingName" dark filled dense label="Display / Trading Name" class="bg-panel-darker" />
                  </div>
                  <div class="col-6">
                    <q-input v-model="orgProfile.licenceReference" dark filled dense label="NHIA / NAICOM Licence Number" class="bg-panel-darker" />
                  </div>
                  <div class="col-6">
                    <q-select v-model="orgProfile.regulatorType" :options="['NHIA', 'NAICOM', 'STATE_HMO']" dark filled dense label="Primary Regulator" class="bg-panel-darker" />
                  </div>
                  <div class="col-6">
                    <q-input v-model="orgProfile.contactEmail" dark filled dense label="Primary Operations Email" class="bg-panel-darker" />
                  </div>
                  <div class="col-6">
                    <q-input v-model="orgProfile.claimsEmail" dark filled dense label="Claims & Pre-Auth Desk Email" class="bg-panel-darker" />
                  </div>
                  <div class="col-6">
                    <q-input v-model="orgProfile.contactPhone" dark filled dense label="Operations Hotline" class="bg-panel-darker" />
                  </div>
                  <div class="col-6">
                    <q-input v-model="orgProfile.state" dark filled dense label="Headquarters State" class="bg-panel-darker" />
                  </div>
                  <div class="col-12">
                    <q-input v-model="orgProfile.headOfficeAddress" dark filled dense label="Head Office Address" class="bg-panel-darker" />
                  </div>
                </div>
                <div class="row justify-end">
                  <q-btn color="teal-4" text-color="black" icon="save" label="Update HMO Organization Profile" class="text-weight-bold" no-caps :loading="savingProfile" @click="handleSaveOrgProfile" />
                </div>
              </div>
            </div>

            <div class="col-xs-12 col-md-5">
              <div class="bg-panel border-muted rounded-borders q-pa-md column op-gap-12">
                <div class="text-subtitle1 text-weight-bold">Account Security & Multi-Factor Authentication</div>
                <div class="text-caption text-muted">
                  Protect HMO enrollment exports and member adjudications with TOTP 2FA.
                </div>
                <div class="row items-center justify-between bg-panel-darker q-pa-md rounded-borders border-muted">
                  <div>
                    <div class="text-weight-bold">Two-Factor Authentication (2FA)</div>
                    <div class="text-caption" :class="identity.mfa ? 'text-green-4' : 'text-amber-4'">
                      {{ identity.mfa ? 'Enabled & Verified' : 'Not Enabled' }}
                    </div>
                  </div>
                  <q-btn
                    v-if="!identity.mfa"
                    color="amber-4"
                    text-color="black"
                    label="Enable 2FA"
                    no-caps
                    class="text-weight-bold"
                    @click="$emit('enable-mfa')"
                  />
                </div>
              </div>
            </div>
          </div>
        </q-tab-panel>
      </q-tab-panels>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import axios from 'axios'
import { useQuasar } from 'quasar'

const props = defineProps({
  identity: { type: Object, required: true },
  initialHmoDashboard: { type: Object, default: null },
  portalMode: { type: String, default: 'HMO' },
  institutionType: { type: String, default: 'HMO' },
  approvalStatus: { type: String, default: 'ACTIVE' },
  restrictionReason: { type: String, default: '' },
})

defineEmits(['enable-mfa'])

const $q = useQuasar()
const hmoTab = ref('overview')

const overviewData = ref(props.initialHmoDashboard || {})
const orgProfile = ref({
  legalName: '',
  tradingName: '',
  licenceReference: 'NHIA/HMO/060',
  regulatorType: 'NHIA',
  contactEmail: '',
  claimsEmail: '',
  contactPhone: '',
  state: 'Lagos',
  headOfficeAddress: '',
})
const batches = ref([])
const mappings = ref([])
const enrollments = ref([])
const enrollmentSearch = ref('')
const schools = ref([])
const plans = ref([])
const facilities = ref([])
const claimsList = ref([])
const billingData = ref({ summary: {}, statements: [] })
const auditData = ref({ recentImportAudit: [] })

const creatingBatch = ref(false)
const reconciling = ref(false)
const selectedReconcileBatchId = ref(null)
const responseCsvFile = ref(null)
const responseCsvText = ref('')
const reconciliationResult = ref(null)
const savingPlan = ref(false)
const savingFacility = ref(false)
const savingProfile = ref(false)

const newPlan = ref({
  code: 'MHMO-SCH-BASIC',
  name: 'MHMO Student Comprehensive Care',
  premiumNaira: 15000,
  billingFrequency: 'termly',
  waitingPeriodDays: 14,
  effectiveFrom: new Date().toISOString().slice(0, 10),
  publishImmediately: true,
})

const standardFacilityServices = [
  'Outpatient',
  'Inpatient',
  'Pharmacy',
  'Emergency',
  'Optical',
  'Dental',
  'Maternity / Antenatal',
  'Surgery & Theatre',
  'Pediatrics',
  'Laboratory & Diagnostics',
  'Radiology / Ultrasound',
  'Physiotherapy',
  'Intensive Care (ICU)',
  'Mental Health',
]

const facilityLogoFile = ref(null)
const facilityLogoPreview = ref('')
const facilityLogoBase64 = ref('')
const detectingGps = ref(false)

const newFacility = ref({
  external_ref: '',
  name: '',
  state: 'Lagos',
  lga: 'Ikeja',
  phone: '',
  address: '',
  servicesList: ['Outpatient', 'Inpatient', 'Pharmacy', 'Emergency', 'Optical'],
  latitude: '',
  longitude: '',
  restrictions: '',
})

function onFacilityLogoSelected(file) {
  if (!file) {
    facilityLogoPreview.value = ''
    facilityLogoBase64.value = ''
    return
  }
  if (file.size > 3 * 1024 * 1024) {
    $q.notify({ type: 'negative', message: 'Logo file size exceeds the 3MB limit (Recommended: 512 × 512 px square).' })
    facilityLogoFile.value = null
    facilityLogoPreview.value = ''
    facilityLogoBase64.value = ''
    return
  }
  const reader = new FileReader()
  reader.onload = (e) => {
    facilityLogoPreview.value = e.target.result
    facilityLogoBase64.value = e.target.result
  }
  reader.readAsDataURL(file)
}

function clearFacilityLogo() {
  facilityLogoFile.value = null
  facilityLogoPreview.value = ''
  facilityLogoBase64.value = ''
}

function detectFacilityLocation() {
  if (!navigator.geolocation) {
    $q.notify({ type: 'warning', message: 'Geolocation is not supported by your browser.' })
    return
  }
  detectingGps.value = true
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      newFacility.value.latitude = pos.coords.latitude.toFixed(6)
      newFacility.value.longitude = pos.coords.longitude.toFixed(6)
      detectingGps.value = false
      $q.notify({ type: 'positive', message: 'GPS coordinates detected successfully' })
    },
    (err) => {
      detectingGps.value = false
      $q.notify({ type: 'warning', message: `Could not detect GPS: ${err.message}` })
    },
    { enableHighAccuracy: true, timeout: 10000 }
  )
}

function authHeaders() {
  const token = localStorage.getItem('invify_agent_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const currentRole = computed(() => overviewData.value?.institution?.hmoRole || props.identity?.hmoRole || 'HMO_ADMIN')
const permissions = computed(() => overviewData.value?.institution?.permissions || props.identity?.hmoPermissions || [])

const hmoKpisList = computed(() => {
  const k = overviewData.value?.hmoKpis || {}
  return {
    totalRegisteredMembers: k.totalRegisteredMembers || { label: 'Total Registered Members', value: 0, icon: 'groups', color: 'cyan-4' },
    activeCoveredMembers: k.activeCoveredMembers || { label: 'Active Covered Members', value: 0, icon: 'verified_user', color: 'green-4' },
    pendingEnrollmentConfirmations: k.pendingEnrollmentConfirmations || { label: 'Pending Enrollment Confirmations', value: 0, icon: 'pending_actions', color: 'amber-4' },
    suspendedOrExpiredMemberships: k.suspendedOrExpiredMemberships || { label: 'Suspended / Expired Memberships', value: 0, icon: 'person_off', color: 'orange-4' },
    participatingSchools: k.participatingSchools || { label: 'Participating Schools & Employers', value: 0, icon: 'school', color: 'purple-4' },
    registeredHospitals: k.registeredHospitals || { label: 'Registered Hospitals & Providers', value: 0, icon: 'local_hospital', color: 'teal-4' },
    pendingEnrollmentBatches: k.pendingEnrollmentBatches || { label: 'Pending Enrollment Batches', value: 0, icon: 'inventory_2', color: 'blue-4' },
    failedOrRejectedRows: k.failedOrRejectedRows || { label: 'Failed / Rejected Enrollment Rows', value: 0, icon: 'error_outline', color: 'red-4' },
    pendingPreAuthorizations: k.pendingPreAuthorizations || { label: 'Pending Pre-Authorizations', value: 0, icon: 'fact_check', color: 'indigo-4' },
    pendingClaims: k.pendingClaims || { label: 'Pending Claims', value: 0, icon: 'receipt_long', color: 'amber-3' },
    approvedClaimsAwaitingSettlement: k.approvedClaimsAwaitingSettlement || { label: 'Approved Claims Awaiting Settlement', value: 0, icon: 'account_balance', color: 'light-green-4' },
    overdueOperationalTasks: k.overdueOperationalTasks || { label: 'Overdue Operational Tasks', value: 0, icon: 'alarm', color: 'deep-orange-4' },
  }
})

const quickActions = computed(() => overviewData.value?.quickActions || [
  { key: 'export_batch', label: 'Export Enrollment Batch', tab: 'excel_centre', icon: 'download' },
  { key: 'upload_response', label: 'Upload Processed Sheet', tab: 'excel_centre', icon: 'upload_file' },
  { key: 'create_plan', label: 'Create Health Plan', tab: 'plans', icon: 'health_and_safety' },
  { key: 'add_provider', label: 'Add Hospital / Clinic', tab: 'providers', icon: 'local_hospital' },
  { key: 'review_enrollments', label: 'Review Enrollments', tab: 'enrollments', icon: 'how_to_reg' },
  { key: 'review_claims', label: 'Pre-Auth & Claims', tab: 'claims', icon: 'fact_check' },
])

const batchBreakdown = computed(() => overviewData.value?.charts?.batchStatusBreakdown || {})
const activeMapping = computed(() => mappings.value[0] || null)
const batchSelectOptions = computed(() =>
  batches.value.map((b) => ({
    label: `${b.batch_reference} (${b.status} — ${b.total_rows || 0} rows)`,
    value: b.id,
  }))
)

function batchStatusColor(status) {
  if (status === 'reconciled' || status === 'completed') return 'green-9'
  if (status === 'validation_failed' || status === 'cancelled') return 'red-9'
  if (status === 'exported' || status === 'ready_for_export') return 'teal-9'
  return 'amber-9'
}

async function loadOverviewAndProfile() {
  if (props.portalMode !== 'HMO') return
  try {
    const [ovRes, profRes, batRes, mapRes] = await Promise.allSettled([
      axios.get('/api/agent/hmo/overview', { headers: authHeaders() }),
      axios.get('/api/agent/hmo/profile', { headers: authHeaders() }),
      axios.get('/api/agent/hmo/excel/batches', { headers: authHeaders() }),
      axios.get('/api/agent/hmo/excel/mappings', { headers: authHeaders() }),
    ])
    if (ovRes.status === 'fulfilled' && ovRes.value.data?.data) {
      overviewData.value = ovRes.value.data.data
    }
    if (profRes.status === 'fulfilled' && profRes.value.data?.data) {
      Object.assign(orgProfile.value, profRes.value.data.data)
    }
    if (batRes.status === 'fulfilled' && batRes.value.data?.data) {
      batches.value = batRes.value.data.data
    }
    if (mapRes.status === 'fulfilled' && mapRes.value.data?.data) {
      mappings.value = mapRes.value.data.data
    }
  } catch (err) {
    console.warn('[HmoPortal] Initial fetch warning:', err)
  }
}

async function loadEnrollments() {
  try {
    const res = await axios.get('/api/agent/hmo/enrollments', {
      headers: authHeaders(),
      params: { search: enrollmentSearch.value || undefined },
    })
    enrollments.value = (res.data?.data || []).map((r) => ({
      ...r,
      _inputMemberId: r.insurerMemberRef || '',
    }))
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.message || 'Failed to load enrollments' })
  }
}

async function loadSchools() {
  try {
    const res = await axios.get('/api/agent/hmo/schools', { headers: authHeaders() })
    schools.value = res.data?.data || []
  } catch (err) {
    $q.notify({ type: 'negative', message: 'Failed to load schools network' })
  }
}

async function loadPlans() {
  try {
    const res = await axios.get('/api/agent/hmo/plans', { headers: authHeaders() })
    plans.value = res.data?.data || []
  } catch (err) {
    $q.notify({ type: 'negative', message: 'Failed to load HMO plans' })
  }
}

async function loadFacilities() {
  try {
    const res = await axios.get('/api/agent/hmo/facilities', { headers: authHeaders() })
    facilities.value = res.data?.data || []
  } catch (err) {
    $q.notify({ type: 'negative', message: 'Failed to load provider network' })
  }
}

async function loadClaims() {
  try {
    const res = await axios.get('/api/agent/hmo/claims', { headers: authHeaders() })
    claimsList.value = res.data?.data || []
  } catch (err) {
    $q.notify({ type: 'negative', message: 'Failed to load claims/pre-authorizations' })
  }
}

async function loadBilling() {
  try {
    const res = await axios.get('/api/agent/hmo/billing', { headers: authHeaders() })
    billingData.value = res.data?.data || { summary: {}, statements: [] }
  } catch (err) {
    $q.notify({ type: 'negative', message: 'Failed to load billing summary' })
  }
}

async function loadAudit() {
  try {
    const res = await axios.get('/api/agent/hmo/users-audit', { headers: authHeaders() })
    auditData.value = res.data?.data || { recentImportAudit: [] }
  } catch (err) {
    $q.notify({ type: 'negative', message: 'Failed to load RBAC and audit trail' })
  }
}

watch(hmoTab, (tab) => {
  if (tab === 'enrollments') loadEnrollments()
  else if (tab === 'schools') loadSchools()
  else if (tab === 'plans') loadPlans()
  else if (tab === 'providers') loadFacilities()
  else if (tab === 'claims') loadClaims()
  else if (tab === 'billing') loadBilling()
  else if (tab === 'users_audit') loadAudit()
})

async function handleCreateBatch() {
  creatingBatch.value = true
  try {
    const res = await axios.post('/api/agent/hmo/excel/batches', {}, { headers: authHeaders() })
    $q.notify({ type: 'positive', message: res.data?.message || 'Enrollment batch created' })
    await loadOverviewAndProfile()
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.message || 'Failed to create batch' })
  } finally {
    creatingBatch.value = false
  }
}

async function handleDownloadBatchCsv(batch) {
  try {
    const res = await axios.get(`/api/agent/hmo/excel/batches/${batch.id}/export`, { headers: authHeaders() })
    const exportData = res.data?.data
    if (!exportData?.csv) {
      $q.notify({ type: 'warning', message: 'Batch CSV is empty' })
      return
    }
    const blob = new Blob([exportData.csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', exportData.filename || `${batch.batch_reference}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    $q.notify({ type: 'positive', message: `Downloaded ${exportData.filename}` })
    await loadOverviewAndProfile()
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.message || 'Failed to export batch CSV' })
  }
}

function onResponseFileSelected(file) {
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => {
    responseCsvText.value = String(e.target?.result || '')
  }
  reader.readAsText(file)
}

async function handleReconcileSheet(commit) {
  if (!responseCsvText.value.trim()) return
  reconciling.value = true
  try {
    const res = await axios.post(
      '/api/agent/hmo/excel/reconcile',
      {
        batchId: selectedReconcileBatchId.value || undefined,
        fileName: responseCsvFile.value?.name || 'mhmo_processed_response.csv',
        csvContent: responseCsvText.value,
        commit,
      },
      { headers: authHeaders() }
    )
    reconciliationResult.value = res.data?.data
    $q.notify({
      type: 'positive',
      message: commit
        ? `Reconciliation committed! Confirmed: ${reconciliationResult.value?.summary?.confirmedRows || 0}`
        : 'Reconciliation preview ready.',
    })
    if (commit) {
      await loadOverviewAndProfile()
    }
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.message || 'Reconciliation failed' })
  } finally {
    reconciling.value = false
  }
}

async function handleAdjudicateEnrollment(enr, decision) {
  try {
    const res = await axios.post(
      `/api/agent/hmo/enrollments/${enr.id}/adjudicate`,
      {
        decision,
        hmoMemberId: enr._inputMemberId,
        policyNumber: enr._inputMemberId,
      },
      { headers: authHeaders() }
    )
    $q.notify({ type: 'positive', message: res.data?.message || 'Enrollment updated' })
    await loadEnrollments()
    await loadOverviewAndProfile()
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.message || 'Failed to adjudicate enrollment' })
  }
}

async function handleCreatePlan() {
  savingPlan.value = true
  try {
    const res = await axios.post('/api/agent/hmo/plans', newPlan.value, { headers: authHeaders() })
    $q.notify({ type: 'positive', message: res.data?.message || 'Plan version saved' })
    await loadPlans()
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.message || 'Failed to save plan' })
  } finally {
    savingPlan.value = false
  }
}

async function handleTogglePlanStatus(planId, status) {
  try {
    await axios.patch(`/api/agent/hmo/plans/${planId}/status`, { status }, { headers: authHeaders() })
    $q.notify({ type: 'positive', message: `Plan status updated to ${status}` })
    await loadPlans()
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.message || 'Failed to update plan' })
  }
}

async function handleSaveFacility() {
  savingFacility.value = true
  try {
    const payload = {
      external_ref: newFacility.value.external_ref,
      name: newFacility.value.name,
      state: newFacility.value.state,
      lga: newFacility.value.lga,
      phone: newFacility.value.phone,
      address: newFacility.value.address,
      services: newFacility.value.servicesList,
      latitude: newFacility.value.latitude,
      longitude: newFacility.value.longitude,
      restrictions: newFacility.value.restrictions,
      logoImage: facilityLogoBase64.value || undefined,
    }
    await axios.post('/api/agent/hmo/facilities', payload, { headers: authHeaders() })
    $q.notify({ type: 'positive', message: 'Hospital added to HMO network successfully' })
    newFacility.value.external_ref = ''
    newFacility.value.name = ''
    newFacility.value.phone = ''
    newFacility.value.address = ''
    newFacility.value.latitude = ''
    newFacility.value.longitude = ''
    clearFacilityLogo()
    await loadFacilities()
    await loadOverviewAndProfile()
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.message || 'Failed to save hospital' })
  } finally {
    savingFacility.value = false
  }
}

async function handleAdjudicateClaim(id, status) {
  try {
    await axios.post(`/api/agent/hmo/claims/${id}/adjudicate`, { status }, { headers: authHeaders() })
    $q.notify({ type: 'positive', message: `Record marked ${status}` })
    await loadClaims()
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.message || 'Failed to update claim' })
  }
}

async function handleSaveOrgProfile() {
  savingProfile.value = true
  try {
    await axios.patch('/api/agent/hmo/profile', orgProfile.value, { headers: authHeaders() })
    $q.notify({ type: 'positive', message: 'HMO organization profile updated' })
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.message || 'Failed to update profile' })
  } finally {
    savingProfile.value = false
  }
}

onMounted(loadOverviewAndProfile)
</script>

<style scoped>
.bg-panel { background-color: #12181c; }
.bg-panel-darker { background-color: #0e1216; }
.text-main { color: #f8f9fa; }
.text-muted { color: #868e96; }
.border-muted { border: 1px solid #2a3339; }
.border-bottom-light { border-bottom: 1px solid #1a2024; }
.border-top { border-top: 1px solid #1a2024; }
.hover-card { transition: transform 0.2s, border-color 0.2s; }
.hover-card:hover { border-color: #4db6ac; transform: translateY(-2px); }
</style>
