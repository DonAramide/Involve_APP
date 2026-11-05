<!-- invify-admin/src/domains/tenant/health-insurance/pages/HealthInsuranceDashboardPage.vue -->
<template>
  <q-page class="q-pa-lg text-white" style="background: #05070d; min-height: 100vh;">
    <!-- Top Header & Breadcrumbs -->
    <div class="row items-center justify-between q-mb-lg">
      <div>
        <div class="row items-center op-gap-8 no-wrap">
          <q-icon name="health_and_safety" color="teal-4" size="md" />
          <h1 class="text-h4 text-weight-bolder text-white q-my-none letter-spacing-1">Health & Wellness</h1>
          <q-badge color="teal-10" text-color="teal-3" class="text-weight-bold q-ml-sm letter-spacing-1">
            {{ modeBadge }}
          </q-badge>
          <q-badge v-if="isSandbox" color="amber-10" text-color="amber-3" class="text-weight-bold q-ml-xs">
            SANDBOX ENGINE
          </q-badge>
        </div>
        <div class="text-caption text-grey-5 q-mt-xs">
          {{ modeCaption }}
        </div>
      </div>

      <!-- Quick Action Buttons -->
      <div class="row q-gutter-sm items-center">
        <q-btn
          outline
          color="teal-4"
          icon="add_circle"
          label="New Enrolment"
          @click="showEnrolDialog = true"
          class="text-weight-bold text-caption font-mono"
        />
        <q-btn
          outline
          color="cyan-4"
          icon="person_add"
          label="Invite Guardian"
          @click="showGuardianDialog = true"
          class="text-weight-bold text-caption font-mono"
        />
        <q-btn
          outline
          color="amber-4"
          icon="receipt"
          label="Issue Premium Bill"
          @click="showInvoiceDialog = true"
          class="text-weight-bold text-caption font-mono"
        />
        <q-btn
          unelevated
          color="grey-9"
          icon="refresh"
          @click="refreshAll"
          :loading="loading"
          round
          dense
        >
          <q-tooltip class="bg-grey-9 text-white">Refresh metrics</q-tooltip>
        </q-btn>
      </div>
    </div>

    <!-- Regulatory & Safety Notice -->
    <q-banner dense rounded class="bg-dark text-grey-4 border-grey-9 q-mb-lg" style="border: 1px solid rgba(20, 184, 166, 0.2);">
      <template v-slot:avatar>
        <q-icon name="verified_user" color="teal-4" />
      </template>
      <div class="text-caption">
        <strong class="text-teal-3">Safety & Compliance Protocol:</strong>
        Invify is a technology platform. Actual insurance underwriting and policy issuance are performed exclusively by licensed HMO partners.
        A policy remains <strong>inactive</strong> until the provider confirms policy activation upon verified premium settlement.
      </div>
    </q-banner>

    <!-- Operational KPI Cards -->
    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="bg-card-dark border-grey-9 q-pa-md">
          <div class="row items-center justify-between">
            <span class="text-grey-5 text-weight-bold text-caption text-uppercase" style="letter-spacing: 1px;">TOTAL ENROLMENTS</span>
            <q-icon name="group" color="cyan-4" size="sm" />
          </div>
          <div class="text-h4 text-weight-bolder text-white font-mono q-mt-sm">{{ metrics.totalEnrolments }}</div>
          <div class="text-caption text-grey-6 q-mt-xs font-mono">
            {{ metrics.studentsEnrolled }} {{ memberNoun }} • {{ metrics.staffEnrolled }} Staff
          </div>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="bg-card-dark border-grey-9 q-pa-md">
          <div class="row items-center justify-between">
            <span class="text-grey-5 text-weight-bold text-caption text-uppercase" style="letter-spacing: 1px;">ACTIVE POLICIES</span>
            <q-icon name="health_and_safety" color="teal-4" size="sm" />
          </div>
          <div class="text-h4 text-weight-bolder text-teal-4 font-mono q-mt-sm">{{ metrics.activePolicies }}</div>
          <div class="text-caption text-grey-6 q-mt-xs font-mono">
            Confirmed with Provider
          </div>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="bg-card-dark border-grey-9 q-pa-md">
          <div class="row items-center justify-between">
            <span class="text-grey-5 text-weight-bold text-caption text-uppercase" style="letter-spacing: 1px;">AWAITING ACTION</span>
            <q-icon name="pending_actions" color="amber-4" size="sm" />
          </div>
          <div class="text-h4 text-weight-bolder text-amber-4 font-mono q-mt-sm">
            {{ metrics.pendingVerification + metrics.awaitingPayment }}
          </div>
          <div class="text-caption text-grey-6 q-mt-xs font-mono">
            {{ metrics.pendingVerification }} Verification • {{ metrics.awaitingPayment }} Payment
          </div>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="bg-card-dark border-grey-9 q-pa-md">
          <div class="row items-center justify-between">
            <span class="text-grey-5 text-weight-bold text-caption text-uppercase" style="letter-spacing: 1px;">PREMIUMS RECONCILED</span>
            <q-icon name="account_balance_wallet" color="green-4" size="sm" />
          </div>
          <div class="text-h4 text-weight-bolder text-green-4 font-mono q-mt-sm">
            {{ formatNgn(metrics.totalCollectedAmount) }}
          </div>
          <div class="text-caption text-grey-6 q-mt-xs font-mono">
            Of {{ formatNgn(metrics.totalBilledAmount) }} Billed
          </div>
        </q-card>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <q-card class="bg-card-dark border-grey-9">
      <q-tabs
        v-model="activeTab"
        dense
        align="left"
        active-color="teal-4"
        indicator-color="teal-4"
        class="text-grey-5 border-bottom"
        style="border-bottom: 1px solid rgba(255,255,255,0.06);"
      >
        <q-tab name="enrolments" icon="badge" label="Enrolments Roster" />
        <q-tab name="policies" icon="verified" label="Active Policies" />
        <q-tab name="guardians" icon="family_restroom" label="Guardians & Links" />
        <q-tab name="billing" icon="receipt_long" label="Premium Billing" />
        <q-tab name="plans" icon="layers" label="Insurance Plans" />
        <q-tab name="facilities" icon="local_hospital" label="HMO Facilities" />
        <q-tab name="claims" icon="assignment" label="Claims Log" />
      </q-tabs>

      <q-tab-panels v-model="activeTab" animated class="bg-transparent text-white">
        <!-- TAB 1: Enrolments -->
        <q-tab-panel name="enrolments" class="q-pa-md">
          <div class="row items-center justify-between q-mb-md">
            <div class="text-subtitle1 text-weight-bold">Enrolment Lifecycle Status</div>
            <div class="row q-gutter-sm">
              <q-select
                v-model="statusFilter"
                dense
                outlined
                dark
                emit-value
                map-options
                :options="statusOptions"
                label="Filter Status"
                style="min-width: 180px;"
                @update:model-value="loadEnrolments"
              />
            </div>
          </div>

          <q-table
            :rows="enrolments"
            :columns="enrolmentColumns"
            row-key="id"
            dark
            flat
            :loading="loadingEnrolments"
            class="bg-transparent text-grey-3 font-mono"
            :pagination="{ rowsPerPage: 10 }"
          >
            <template v-slot:body-cell-status="props">
              <q-td :props="props">
                <q-badge :color="getEnrolmentBadgeColor(props.value)" class="text-weight-bold">
                  {{ props.value }}
                </q-badge>
              </q-td>
            </template>

            <template v-slot:body-cell-actions="props">
              <q-td :props="props">
                <div class="row q-gutter-xs no-wrap">
                  <!-- Verification action -->
                  <q-btn
                    v-if="['draft', 'submitted', 'pending_verification'].includes(props.row.status)"
                    size="xs"
                    color="teal-10"
                    text-color="teal-3"
                    label="Verify"
                    @click="executeVerifyEnrolment(props.row)"
                  />
                  <!-- Activate Policy Action -->
                  <q-btn
                    v-if="['awaiting_premium_payment', 'verified', 'submitted_to_insurer'].includes(props.row.status)"
                    size="xs"
                    color="indigo-10"
                    text-color="indigo-3"
                    label="Activate Policy"
                    @click="promptPolicyActivation(props.row)"
                  />
                </div>
              </q-td>
            </template>
          </q-table>
        </q-tab-panel>

        <!-- TAB 2: Active Policies -->
        <q-tab-panel name="policies" class="q-pa-md">
          <div class="text-subtitle1 text-weight-bold q-mb-md">Insurer-Confirmed Coverage Policies</div>
          <q-table
            :rows="policies"
            :columns="policyColumns"
            row-key="id"
            dark
            flat
            :loading="loadingPolicies"
            class="bg-transparent text-grey-3 font-mono"
          >
            <template v-slot:body-cell-status="props">
              <q-td :props="props">
                <q-badge :color="props.value === 'active' ? 'green-10' : 'grey-8'" class="text-weight-bold">
                  {{ props.value }}
                </q-badge>
              </q-td>
            </template>
          </q-table>
        </q-tab-panel>

        <!-- TAB 3: Guardians & Links -->
        <q-tab-panel name="guardians" class="q-pa-md">
          <div class="row items-center justify-between q-mb-md">
            <div>
              <div class="text-subtitle1 text-weight-bold">Student-Guardian Verification Matrix</div>
              <div class="text-caption text-grey-5">
                Guardians cannot access dependant medical coverage until their relationship is explicitly verified by administration.
              </div>
            </div>
            <q-btn
              color="teal-4"
              outline
              size="sm"
              icon="person_add"
              label="Invite Guardian"
              @click="showGuardianDialog = true"
            />
          </div>

          <q-table
            :rows="guardianLinks"
            :columns="guardianLinkColumns"
            row-key="id"
            dark
            flat
            class="bg-transparent text-grey-3 font-mono"
          >
            <template v-slot:body-cell-verification_status="props">
              <q-td :props="props">
                <q-badge
                  :color="props.value === 'verified' ? 'green-10' : props.value === 'rejected' ? 'red-10' : 'amber-10'"
                  class="text-weight-bold"
                >
                  {{ props.value }}
                </q-badge>
              </q-td>
            </template>
            <template v-slot:body-cell-actions="props">
              <q-td :props="props">
                <q-btn
                  v-if="props.row.verification_status === 'pending_verification'"
                  size="xs"
                  color="green-10"
                  text-color="green-3"
                  label="Confirm Verification"
                  @click="executeVerifyGuardianLink(props.row)"
                />
              </q-td>
            </template>
          </q-table>
        </q-tab-panel>

        <!-- TAB 4: Premium Billing -->
        <q-tab-panel name="billing" class="q-pa-md">
          <div class="row items-center justify-between q-mb-md">
            <div class="text-subtitle1 text-weight-bold">Health Premium Invoices & Payments</div>
            <q-btn
              color="amber-4"
              outline
              size="sm"
              icon="receipt"
              label="New Invoice"
              @click="showInvoiceDialog = true"
            />
          </div>

          <q-table
            :rows="invoices"
            :columns="invoiceColumns"
            row-key="id"
            dark
            flat
            :loading="loadingInvoices"
            class="bg-transparent text-grey-3 font-mono"
          >
            <template v-slot:body-cell-status="props">
              <q-td :props="props">
                <q-badge
                  :color="props.value === 'paid' ? 'green-10' : props.value === 'partially_paid' ? 'cyan-10' : 'amber-10'"
                  class="text-weight-bold"
                >
                  {{ props.value }}
                </q-badge>
              </q-td>
            </template>
            <template v-slot:body-cell-actions="props">
              <q-td :props="props">
                <q-btn
                  v-if="['draft', 'issued', 'partially_paid'].includes(props.row.status)"
                  size="xs"
                  color="amber-10"
                  text-color="amber-3"
                  label="Pay Premium"
                  @click="promptPayPremium(props.row)"
                />
              </q-td>
            </template>
          </q-table>
        </q-tab-panel>

        <!-- TAB 5: Insurance Plans -->
        <q-tab-panel name="plans" class="q-pa-md">
          <div class="row items-center justify-between q-mb-md">
            <div>
              <div class="text-subtitle1 text-weight-bold">Configured HMO Plans & Tenant Offers</div>
              <div class="text-caption text-grey-5">Partner underwriters and eligible plans offered to this {{ workplace }}. Institution admins cannot register global HMO providers.</div>
            </div>
          </div>

          <q-card class="bg-card-dark border-grey-9 q-pa-md q-mb-md">
            <div class="text-subtitle2 text-weight-bold">HMO affiliation</div>
            <div v-if="assignedProvider" class="q-mt-sm">
              <div class="text-body2 text-teal-3 text-weight-medium">{{ assignedProvider.name || assignedProvider.display_name }}</div>
              <div class="text-caption text-grey-5">
                Assigned from institute onboarding / platform assignment
                <span v-if="assignedProvider.code"> · code {{ assignedProvider.code }}</span>
                <span v-if="healthSettings?.assignmentMode"> · {{ healthSettings.assignmentMode }}</span>
              </div>
              <div v-if="activeAffiliationStatus" class="text-caption text-grey-4 q-mt-xs">
                Link status: {{ activeAffiliationStatus }}
              </div>
            </div>
            <template v-else>
              <div class="text-caption text-grey-5 q-mb-sm">Select an approved (verified) platform HMO. The request starts as pending approval.</div>
              <div class="row q-col-gutter-sm items-end">
                <div class="col-12 col-md-6">
                  <q-select
                    v-model="affiliationProviderId"
                    :options="eligibleProviderOptions"
                    emit-value
                    map-options
                    dense
                    outlined
                    dark
                    label="Approved HMO provider"
                  />
                </div>
                <div class="col-12 col-md-3">
                  <q-btn color="teal-8" no-caps label="Request affiliation" :loading="affiliationSaving" :disable="!affiliationProviderId" @click="submitAffiliation" />
                </div>
              </div>
            </template>
            <div v-if="affiliations.length" class="q-mt-md">
              <div class="text-caption text-grey-4" v-for="link in affiliations" :key="link.id">
                {{ link.hw_providers?.display_name || link.provider_id }} — {{ link.onboarding_status }}
              </div>
            </div>
          </q-card>

          <div v-if="!normalizedOffers.length" class="text-caption text-grey-5 q-mb-md">
            No published plans are offered for this {{ workplace }} yet. When the assigned HMO publishes an active plan, it appears here automatically.
          </div>
          <div class="row q-col-gutter-md">
            <div v-for="offer in normalizedOffers" :key="offer.id" class="col-12 col-md-4">
              <q-card class="bg-card-dark border-grey-9 q-pa-md">
                <div class="row items-center justify-between">
                  <div class="text-weight-bolder text-subtitle2 text-teal-3">{{ offer.planName }}</div>
                  <q-badge color="teal-10" text-color="teal-3">{{ offer.statusLabel }}</q-badge>
                </div>
                <div class="text-caption text-grey-5 q-mt-xs">Provider: {{ offer.providerName }}</div>
                <div class="text-h6 text-white font-mono q-mt-md">
                  {{ formatNgn(offer.annualPremiumNaira) }} / {{ offer.billingLabel }}
                </div>
                <div class="text-caption text-grey-6 font-mono" v-if="offer.categoriesLabel">
                  Categories: {{ offer.categoriesLabel }}
                </div>
                <div class="q-mt-sm text-caption text-grey-4">
                  {{ offer.planCode }} · v{{ offer.version }}
                </div>
              </q-card>
            </div>
          </div>
        </q-tab-panel>

        <!-- TAB 6: Facilities Directory -->
        <q-tab-panel name="facilities" class="q-pa-md">
          <div class="row items-center justify-between q-mb-md">
            <div>
              <div class="text-subtitle1 text-weight-bold">Participating Hospitals & Healthcare Centers</div>
              <div class="text-caption text-grey-5">
                Live from your assigned HMO network. Updates made in the HMO Institution Portal appear here after refresh.
              </div>
            </div>
            <q-btn dense outline color="cyan-4" icon="refresh" label="Refresh" no-caps @click="loadFacilities" />
          </div>
          <q-table
            :rows="facilities"
            :columns="facilityColumns"
            row-key="id"
            dark
            flat
            class="bg-transparent text-grey-3 font-mono"
          >
            <template #no-data>
              <div class="full-width text-center q-pa-lg text-grey-5">
                No facilities published by {{ assignedProvider?.name || assignedProvider?.display_name || 'the assigned HMO' }} yet.
              </div>
            </template>
          </q-table>
        </q-tab-panel>

        <!-- TAB 7: Claims Log (tenant submit + status; no HMO adjudication) -->
        <q-tab-panel name="claims" class="q-pa-md">
          <div class="row items-center justify-between q-mb-md">
            <div class="text-subtitle1 text-weight-bold">Claims & Treatment Authorisations</div>
            <div class="row q-gutter-sm">
              <q-btn dense outline color="cyan-4" icon="refresh" label="Refresh" no-caps :loading="loadingClaims" @click="loadClaims" />
              <q-btn dense unelevated color="teal-7" icon="add" label="Submit Claim" no-caps @click="showClaimDialog = true" />
            </div>
          </div>
          <q-banner dense rounded class="bg-dark text-grey-4 border-grey-9 q-mb-md">
            <template v-slot:avatar><q-icon name="info" color="cyan-4" /></template>
            <div class="text-caption">
              Submit administrative claim or pre-authorisation records for HMO review.
              Approval, rejection, and settlement are performed by the HMO — not from this dashboard.
            </div>
          </q-banner>
          <q-table
            :rows="claims"
            :columns="claimColumns"
            row-key="id"
            dark
            flat
            :loading="loadingClaims"
            class="bg-transparent text-grey-3 font-mono"
            @row-click="(_, row) => openClaimDetail(row)"
          >
            <template #body-cell-status="props">
              <q-td :props="props">
                <q-badge :color="claimStatusColor(props.row.status)">{{ props.row.status }}</q-badge>
              </q-td>
            </template>
            <template #body-cell-actions="props">
              <q-td :props="props">
                <q-btn dense flat color="cyan-4" label="Detail" no-caps @click.stop="openClaimDetail(props.row)" />
              </q-td>
            </template>
            <template #no-data>
              <div class="full-width text-center q-pa-lg text-grey-5">No claims submitted yet.</div>
            </template>
          </q-table>
        </q-tab-panel>
      </q-tab-panels>
    </q-card>

    <!-- DIALOG: New Enrolment -->
    <q-dialog v-model="showEnrolDialog">
      <q-card class="bg-card-dark text-white border-grey-9" style="min-width: 480px;">
        <q-card-section class="row items-center justify-between border-bottom">
          <div class="text-subtitle1 text-weight-bold">New Health Plan Enrolment</div>
          <q-btn flat dense round icon="close" v-close-popup />
        </q-card-section>
        <q-card-section class="q-gutter-md">
          <q-select
            v-model="newEnrolment.memberType"
            outlined
            dark
            dense
            :options="['student', 'staff']"
            label="Member Type"
          />
          <q-input
            v-model="newEnrolment.memberId"
            outlined
            dark
            dense
            label="Member UUID or Admission Number"
            hint="Select or input existing student/staff ID"
          />
          <q-select
            v-model="newEnrolment.planVersionId"
            outlined
            dark
            dense
            emit-value
            map-options
            :options="planVersionOptions"
            label="Plan version"
            hint="Reference price is read-only. Only an active bank offering is listed when this tenant belongs to a bank."
          />
          <div v-if="selectedPlanDetail" class="text-caption text-grey-4">
            {{ selectedPlanDetail }}
          </div>
          <q-input
            v-model="newEnrolment.startDate"
            outlined
            dark
            dense
            type="date"
            label="Coverage Start Date"
          />
          <q-input
            v-model="newEnrolment.endDate"
            outlined
            dark
            dense
            type="date"
            label="Coverage End Date"
          />
        </q-card-section>
        <q-card-actions align="right" class="border-top q-pa-md">
          <q-btn flat label="Cancel" v-close-popup color="grey-5" />
          <q-btn
            unelevated
            label="Submit Enrolment"
            color="teal-4"
            class="text-weight-bold font-mono"
            @click="submitNewEnrolment"
            :loading="submitting"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- DIALOG: Invite Guardian -->
    <q-dialog v-model="showGuardianDialog">
      <q-card class="bg-card-dark text-white border-grey-9" style="min-width: 480px;">
        <q-card-section class="row items-center justify-between border-bottom">
          <div class="text-subtitle1 text-weight-bold">Invite Student Guardian</div>
          <q-btn flat dense round icon="close" v-close-popup />
        </q-card-section>
        <q-card-section class="q-gutter-md">
          <q-input
            v-model="newGuardian.studentId"
            outlined
            dark
            dense
            label="Student ID (UUID)"
          />
          <q-input
            v-model="newGuardian.guardianEmail"
            outlined
            dark
            dense
            type="email"
            label="Guardian Email Address"
          />
          <q-select
            v-model="newGuardian.relationshipType"
            outlined
            dark
            dense
            :options="['parent', 'legal_guardian', 'sponsor', 'other']"
            label="Relationship Type"
          />
        </q-card-section>
        <q-card-actions align="right" class="border-top q-pa-md">
          <q-btn flat label="Cancel" v-close-popup color="grey-5" />
          <q-btn
            unelevated
            label="Send Invitation"
            color="cyan-4"
            class="text-weight-bold font-mono"
            @click="submitGuardianInvite"
            :loading="submitting"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- DIALOG: Issue Premium Invoice -->
    <q-dialog v-model="showInvoiceDialog">
      <q-card class="bg-card-dark text-white border-grey-9" style="min-width: 480px;">
        <q-card-section class="row items-center justify-between border-bottom">
          <div class="text-subtitle1 text-weight-bold">Generate Health Premium Invoice</div>
          <q-btn flat dense round icon="close" v-close-popup />
        </q-card-section>
        <q-card-section class="q-gutter-md">
          <q-input
            v-model="newInvoice.enrolmentId"
            outlined
            dark
            dense
            label="Enrolment UUID"
          />
          <q-input
            v-model.number="newInvoice.totalAmount"
            outlined
            dark
            dense
            type="number"
            label="Premium Amount (NGN)"
          />
          <q-input
            v-model="newInvoice.dueDate"
            outlined
            dark
            dense
            type="date"
            label="Due Date"
          />
        </q-card-section>
        <q-card-actions align="right" class="border-top q-pa-md">
          <q-btn flat label="Cancel" v-close-popup color="grey-5" />
          <q-btn
            unelevated
            label="Issue Invoice"
            color="amber-4"
            class="text-weight-bold font-mono"
            @click="submitNewInvoice"
            :loading="submitting"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- DIALOG: Activate Policy (Insurer Confirmation) -->
    <q-dialog v-model="showActivationDialog">
      <q-card class="bg-card-dark text-white border-grey-9" style="min-width: 500px;">
        <q-card-section class="row items-center justify-between border-bottom">
          <div class="text-subtitle1 text-weight-bold">Confirm Insurer Policy Activation</div>
          <q-btn flat dense round icon="close" v-close-popup />
        </q-card-section>
        <q-card-section class="q-gutter-md">
          <div class="text-caption text-grey-4">
            Enrolment ID: <span class="font-mono text-teal-3">{{ selectedEnrolment?.id }}</span>
          </div>
          <q-input
            v-model="activationData.policyNumber"
            outlined
            dark
            dense
            label="Underwriter Policy Number"
            hint="Provided by partner HMO/Insurer (e.g. POL-REL-2026-9921)"
          />
          <q-input
            v-model="activationData.certificateNumber"
            outlined
            dark
            dense
            label="Certificate Number"
          />
          <q-input
            v-model="activationData.effectiveDate"
            outlined
            dark
            dense
            type="date"
            label="Effective Date"
          />
          <q-input
            v-model="activationData.expiryDate"
            outlined
            dark
            dense
            type="date"
            label="Expiry Date"
          />
        </q-card-section>
        <q-card-actions align="right" class="border-top q-pa-md">
          <q-btn flat label="Cancel" v-close-popup color="grey-5" />
          <q-btn
            unelevated
            label="Confirm & Activate Coverage"
            color="green-5"
            class="text-weight-bold font-mono"
            @click="submitPolicyActivation"
            :loading="submitting"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- DIALOG: Submit Claim / Pre-Auth (tenant) -->
    <q-dialog v-model="showClaimDialog">
      <q-card class="bg-card-dark text-white border-grey-9" style="min-width: 480px;">
        <q-card-section class="row items-center justify-between border-bottom">
          <div class="text-subtitle1 text-weight-bold">Submit Claim / Pre-Authorisation</div>
          <q-btn flat dense round icon="close" v-close-popup />
        </q-card-section>
        <q-card-section class="q-gutter-md">
          <q-select
            v-model="newClaim.recordType"
            outlined
            dark
            dense
            :options="[
              { label: 'Claim', value: 'claim' },
              { label: 'Pre-Authorisation', value: 'pre_authorisation' }
            ]"
            emit-value
            map-options
            label="Record Type"
          />
          <q-input v-model="newClaim.policyId" outlined dark dense label="Policy UUID" hint="Active policy id for this institution" />
          <q-input v-model="newClaim.memberId" outlined dark dense label="Member UUID" />
          <q-input v-model="newClaim.facilityId" outlined dark dense label="Facility UUID (optional)" />
          <q-input
            v-model.number="newClaim.amountNaira"
            outlined
            dark
            dense
            type="number"
            label="Authorised amount (₦)"
            hint="Stored as administrative authorised amount — not a disbursement"
          />
          <q-input v-model="newClaim.notes" outlined dark dense type="textarea" label="Notes (optional)" />
        </q-card-section>
        <q-card-actions align="right" class="border-top q-pa-md">
          <q-btn flat label="Cancel" v-close-popup color="grey-5" />
          <q-btn
            unelevated
            label="Submit"
            color="teal-7"
            class="text-weight-bold font-mono"
            :loading="submittingClaim"
            @click="submitNewClaim"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- DIALOG: Claim Detail + History -->
    <q-dialog v-model="showClaimDetailDialog">
      <q-card class="bg-card-dark text-white border-grey-9" style="min-width: 520px; max-width: 640px;">
        <q-card-section class="row items-center justify-between border-bottom">
          <div class="text-subtitle1 text-weight-bold">Claim Detail</div>
          <q-btn flat dense round icon="close" v-close-popup />
        </q-card-section>
        <q-card-section v-if="selectedClaim" class="q-gutter-sm">
          <div class="text-caption text-grey-5">Reference</div>
          <div class="font-mono text-teal-3">{{ selectedClaim.claim_reference }}</div>
          <div class="row q-col-gutter-md q-mt-xs">
            <div class="col-6">
              <div class="text-caption text-grey-5">Status</div>
              <q-badge :color="claimStatusColor(selectedClaim.status)">{{ selectedClaim.status }}</q-badge>
            </div>
            <div class="col-6">
              <div class="text-caption text-grey-5">Type</div>
              <div>{{ selectedClaim.record_type }}</div>
            </div>
            <div class="col-6">
              <div class="text-caption text-grey-5">Submitted</div>
              <div>{{ selectedClaim.submitted_date || '—' }}</div>
            </div>
            <div class="col-6">
              <div class="text-caption text-grey-5">Amount</div>
              <div>{{ formatNgn((Number(selectedClaim.authorised_amount_minor || 0) / 100)) }}</div>
            </div>
          </div>
          <div v-if="selectedClaim.rejection_reason" class="text-caption text-red-4 q-mt-sm">
            Rejection: {{ selectedClaim.rejection_reason }}
          </div>
          <div class="text-subtitle2 q-mt-md">Status History</div>
          <div v-if="claimHistoryNote" class="text-caption text-amber-4">{{ claimHistoryNote }}</div>
          <div v-if="loadingClaimHistory" class="text-caption text-grey-5">Loading history…</div>
          <div v-else-if="!claimHistory.length" class="text-caption text-grey-5">No history events.</div>
          <div v-else class="column q-gutter-xs">
            <div
              v-for="ev in claimHistory"
              :key="ev.id"
              class="bg-dark border-grey-9 rounded-borders q-pa-sm text-caption font-mono"
            >
              {{ ev.from_status || '∅' }} → {{ ev.to_status }}
              <span class="text-grey-5"> · {{ ev.occurred_at }}</span>
              <div v-if="ev.notes" class="text-grey-4">{{ ev.notes }}</div>
            </div>
          </div>
        </q-card-section>
        <q-card-actions align="right" class="border-top q-pa-md">
          <q-btn flat label="Close" v-close-popup color="grey-5" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useQuasar } from 'quasar';
import { healthInsuranceApi } from 'src/api/healthInsuranceApi';
import { industryLabel, industryWorkplace, tenantIndustry } from 'src/utils/tenantIndustry';

const workplace = industryWorkplace()
const modeBadge = `${industryLabel()} MODE`
const memberNoun = tenantIndustry() === 'school' ? 'Students' : 'Members'
const modeCaption = tenantIndustry() === 'school'
  ? 'Health insurance administration — manage student, guardian, and staff coverage, premium billing, and insurer activation.'
  : `Health insurance administration — manage staff, member, and dependant coverage, premium billing, and insurer activation for this ${workplace}.`

const $q = useQuasar();

// State
const loading = ref(false);
const submitting = ref(false);
const activeTab = ref('enrolments');
const isSandbox = ref(true);

const metrics = reactive({
  totalEnrolments: 0,
  activePolicies: 0,
  pendingVerification: 0,
  awaitingPayment: 0,
  studentsEnrolled: 0,
  staffEnrolled: 0,
  totalBilledAmount: 0,
  totalCollectedAmount: 0
});

// Enrolments
const enrolments = ref([]);
const loadingEnrolments = ref(false);
const statusFilter = ref('');
const statusOptions = [
  { label: 'All Statuses', value: '' },
  { label: 'Draft', value: 'draft' },
  { label: 'Pending Verification', value: 'pending_verification' },
  { label: 'Awaiting Premium Payment', value: 'awaiting_premium_payment' },
  { label: 'Active', value: 'active' },
  { label: 'Terminated', value: 'terminated' }
];

const enrolmentColumns = [
  { name: 'id', label: 'ENROLMENT ID', field: 'id', align: 'left', format: v => v ? v.slice(0, 8) + '...' : '' },
  { name: 'member', label: 'MEMBER NAME', field: 'member_name', align: 'left' },
  { name: 'type', label: 'TYPE', field: 'member_type', align: 'left', format: v => (v || '').toUpperCase() },
  { name: 'status', label: 'STATUS', field: 'status', align: 'center' },
  { name: 'plan', label: 'PLAN', field: 'plan_name', align: 'left' },
  { name: 'start_date', label: 'START DATE', field: 'start_date', align: 'left' },
  { name: 'actions', label: 'ACTIONS', align: 'center' }
];

// Policies
const policies = ref([]);
const loadingPolicies = ref(false);
const policyColumns = [
  { name: 'policy_number', label: 'POLICY #', field: 'policy_number', align: 'left' },
  { name: 'member', label: 'MEMBER', field: 'member_name', align: 'left' },
  { name: 'status', label: 'STATUS', field: 'status', align: 'center' },
  { name: 'effective_date', label: 'EFFECTIVE', field: 'effective_date', align: 'left' },
  { name: 'expiry_date', label: 'EXPIRY', field: 'expiry_date', align: 'left' }
];

// Guardians
const guardianLinks = ref([]);
const guardianLinkColumns = [
  { name: 'guardian_name', label: 'GUARDIAN NAME', field: 'guardian_name', align: 'left' },
  { name: 'student_name', label: 'STUDENT NAME', field: 'student_name', align: 'left' },
  { name: 'relationship', label: 'RELATIONSHIP', field: 'relationship_type', align: 'left' },
  { name: 'verification_status', label: 'VERIFICATION', field: 'verification_status', align: 'center' },
  { name: 'actions', label: 'ACTIONS', align: 'center' }
];

// Billing
const invoices = ref([]);
const loadingInvoices = ref(false);
const invoiceColumns = [
  { name: 'invoice_number', label: 'INVOICE #', field: 'invoice_number', align: 'left' },
  { name: 'amount', label: 'AMOUNT (NGN)', field: 'total_amount', align: 'right', format: v => formatNgn(v) },
  { name: 'status', label: 'STATUS', field: 'status', align: 'center' },
  { name: 'due_date', label: 'DUE DATE', field: 'due_date', align: 'left' },
  { name: 'actions', label: 'ACTIONS', align: 'center' }
];

// Plans & Facilities & Claims
const tenantOffers = ref([]);
const healthSettings = ref(null);
const eligibleProviderOptions = ref([]);
const affiliations = ref([]);
const affiliationProviderId = ref('');
const affiliationSaving = ref(false);
const facilities = ref([]);
const facilityColumns = [
  { name: 'name', label: 'FACILITY NAME', field: 'name', align: 'left' },
  { name: 'type', label: 'SERVICES', field: (row) => Array.isArray(row.services) ? row.services.join(', ') : (row.facility_type || '—'), align: 'left' },
  { name: 'state', label: 'STATE', field: 'state', align: 'left' },
  { name: 'address', label: 'ADDRESS', field: 'address', align: 'left' }
];
const claims = ref([]);
const loadingClaims = ref(false);
const showClaimDialog = ref(false);
const showClaimDetailDialog = ref(false);
const submittingClaim = ref(false);
const selectedClaim = ref(null);
const claimHistory = ref([]);
const claimHistoryNote = ref('');
const loadingClaimHistory = ref(false);
const newClaim = reactive({
  recordType: 'claim',
  policyId: '',
  memberId: '',
  facilityId: '',
  amountNaira: null,
  notes: ''
});
const claimColumns = [
  { name: 'claim_reference', label: 'CLAIM #', field: 'claim_reference', align: 'left' },
  { name: 'record_type', label: 'TYPE', field: 'record_type', align: 'left' },
  { name: 'submitted_date', label: 'DATE', field: 'submitted_date', align: 'left' },
  {
    name: 'amount',
    label: 'AMOUNT (NGN)',
    field: (row) => Number(row.authorised_amount_minor || 0) / 100,
    align: 'right',
    format: (v) => formatNgn(v)
  },
  { name: 'status', label: 'STATUS', field: 'status', align: 'center' },
  { name: 'actions', label: '', field: 'id', align: 'right' }
];

// Dialog Modals
const showEnrolDialog = ref(false);
const showGuardianDialog = ref(false);
const showInvoiceDialog = ref(false);
const showActivationDialog = ref(false);
const selectedEnrolment = ref(null);

const newEnrolment = reactive({
  memberType: 'student',
  memberId: '',
  planVersionId: '',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10)
});

const newGuardian = reactive({
  studentId: '',
  guardianEmail: '',
  relationshipType: 'parent'
});

const newInvoice = reactive({
  enrolmentId: '',
  totalAmount: 35000,
  dueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
});

const activationData = reactive({
  policyNumber: '',
  certificateNumber: '',
  effectiveDate: new Date().toISOString().slice(0, 10),
  expiryDate: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10)
});

const planRows = computed(() => {
  const raw = tenantOffers.value
  if (Array.isArray(raw)) return raw
  if (Array.isArray(raw?.data)) return raw.data
  return []
})

function unwrapRelation(value) {
  if (Array.isArray(value)) return value[0] || null
  return value || null
}

const assignedProvider = computed(() => {
  const fromSettings = healthSettings.value?.assignedProvider || null
  if (fromSettings?.id || fromSettings?.name || fromSettings?.display_name) return fromSettings
  const link = affiliations.value.find((row) => String(row.onboarding_status || '').toLowerCase() === 'active')
  const provider = unwrapRelation(link?.hw_providers)
  return provider || null
})

const activeAffiliationStatus = computed(() => {
  const assignedId = assignedProvider.value?.id
  const link = affiliations.value.find((row) => !assignedId || row.provider_id === assignedId)
  return link?.onboarding_status || null
})

const normalizedOffers = computed(() => planRows.value.map((row) => {
  const version = unwrapRelation(row.hw_plan_versions)
  const plan = unwrapRelation(version?.hw_plans)
  const provider = unwrapRelation(plan?.hw_providers)
  const minor = Number(version?.premium_minor)
  const billing = String(version?.billing_frequency || 'annual')
  const categories = Array.isArray(version?.member_categories) ? version.member_categories : []
  return {
    id: row.id || version?.id,
    planName: plan?.name || 'Untitled plan',
    planCode: plan?.code || '—',
    providerName: provider?.display_name || assignedProvider.value?.name || assignedProvider.value?.display_name || 'Assigned HMO',
    annualPremiumNaira: Number.isFinite(minor) ? minor / 100 : 0,
    billingLabel: billing === 'termly' ? 'term' : billing === 'monthly' ? 'mo' : billing === 'quarterly' ? 'qtr' : 'yr',
    categoriesLabel: categories.join(', '),
    version: version?.version ?? '—',
    statusLabel: String(version?.status || '').toLowerCase() === 'published' ? 'PUBLISHED OFFER' : 'ACTIVE OFFER'
  }
}).filter((row) => row.id))

const planVersionOptions = computed(() => planRows.value.map((row) => {
  const version = unwrapRelation(row.hw_plan_versions)
  if (!version?.id) return null
  const plan = unwrapRelation(version.hw_plans)
  const provider = unwrapRelation(plan?.hw_providers)
  const minor = Number(version.premium_minor)
  const price = Number.isFinite(minor)
    ? new Intl.NumberFormat('en-NG', { style: 'currency', currency: version.currency || 'NGN' }).format(minor / 100)
    : 'Price unavailable'
  return {
    label: `${provider?.display_name || 'HMO'} · ${plan?.name || 'Plan'} v${version.version} · ${price}`,
    value: version.id,
  }
}).filter(Boolean))

const selectedPlanDetail = computed(() => {
  const row = planRows.value.find((item) => {
    const version = Array.isArray(item.hw_plan_versions) ? item.hw_plan_versions[0] : item.hw_plan_versions
    return version?.id === newEnrolment.planVersionId
  })
  const version = Array.isArray(row?.hw_plan_versions) ? row.hw_plan_versions[0] : row?.hw_plan_versions
  if (!version) return ''
  const categories = (version.member_categories || []).join(', ')
  const benefits = Array.isArray(version.benefits)
    ? version.benefits.map((benefit) => benefit?.category || benefit?.name).filter(Boolean).join(', ')
    : ''
  return [categories && `Categories: ${categories}`, benefits && `Benefits: ${benefits}`].filter(Boolean).join(' · ')
})

// Helpers
function formatNgn(amount) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(amount || 0);
}

function getEnrolmentBadgeColor(status) {
  switch (status) {
    case 'active': return 'green-10';
    case 'pending_verification': return 'amber-10';
    case 'awaiting_premium_payment': return 'orange-10';
    case 'submitted_to_insurer': return 'cyan-10';
    case 'draft': return 'grey-8';
    case 'terminated': return 'red-10';
    default: return 'indigo-10';
  }
}

function claimStatusColor(status) {
  switch (String(status || '')) {
    case 'approved':
    case 'settled':
      return 'green-10';
    case 'rejected':
      return 'red-10';
    case 'pending':
      return 'amber-10';
    default:
      return 'cyan-10';
  }
}

// Fetch Functions
async function loadOverviewMetrics() {
  try {
    const res = await healthInsuranceApi.getOverviewMetrics();
    const data = res.data || {}
    const nested = data.metrics && typeof data.metrics === 'object' ? data.metrics : {}
    if (res.data) {
      Object.assign(metrics, {
        totalEnrolments: data.enrolledCount ?? nested.enrolledMembers ?? data.totalEnrolments ?? metrics.totalEnrolments,
        activePolicies: data.activeCoverageCount ?? nested.insurerConfirmedActive ?? data.activePolicies ?? metrics.activePolicies,
        pendingVerification: data.awaitingVerificationCount ?? nested.awaitingVerification ?? data.pendingVerification ?? 0,
        awaitingPayment: data.awaitingActivationCount ?? nested.awaitingActivation ?? data.incompleteCount ?? data.awaitingPayment ?? 0,
        studentsEnrolled: data.studentsEnrolled ?? nested.studentsEnrolled ?? metrics.studentsEnrolled,
        staffEnrolled: data.staffEnrolled ?? nested.staffEnrolled ?? metrics.staffEnrolled,
        totalBilledAmount: ((data.billedMinor ?? nested.premiumsBilledMinor ?? 0) / 100),
        totalCollectedAmount: ((data.collectedMinor ?? nested.premiumsCollectedMinor ?? 0) / 100)
      });
    }
  } catch (err) {
    // If table is newly created / empty, default to zero
    console.warn('Overview metrics load:', err?.message);
  }
}

async function loadEnrolments() {
  loadingEnrolments.value = true;
  try {
    const res = await healthInsuranceApi.getEnrolments({ status: statusFilter.value || undefined });
    enrolments.value = res.data || [];
  } catch (err) {
    console.warn('Enrolments load:', err?.message);
  } finally {
    loadingEnrolments.value = false;
  }
}

async function loadPolicies() {
  loadingPolicies.value = true;
  try {
    const res = await healthInsuranceApi.getPolicies();
    policies.value = res.data || [];
  } catch (err) {
    console.warn('Policies load:', err?.message);
  } finally {
    loadingPolicies.value = false;
  }
}

async function loadInvoices() {
  loadingInvoices.value = true;
  try {
    const res = await healthInsuranceApi.getInvoices();
    invoices.value = res.data || [];
  } catch (err) {
    console.warn('Invoices load:', err?.message);
  } finally {
    loadingInvoices.value = false;
  }
}

async function loadPlansAndOffers() {
  try {
    const [offersRes, settingsRes] = await Promise.all([
      healthInsuranceApi.getTenantOffers(),
      healthInsuranceApi.getSettings().catch(() => null)
    ]);
    tenantOffers.value = offersRes.data?.data || offersRes.data || [];
    healthSettings.value = settingsRes?.data?.data || settingsRes?.data || null;
  } catch (err) {
    console.warn('Plans load:', err?.message);
  }
}

async function loadAffiliations() {
  try {
    const [eligible, links] = await Promise.all([
      healthInsuranceApi.listEligibleProviders(),
      healthInsuranceApi.listAffiliations()
    ]);
    const payload = eligible?.data?.data || eligible?.data || {};
    const providers = payload.providers || (Array.isArray(payload) ? payload : []);
    eligibleProviderOptions.value = providers.map((p) => ({
      label: `${p.display_name || p.code} (${p.integration_status || 'verified'})`,
      value: p.id
    }));
    affiliations.value = links?.data?.data || links?.data || [];
    if (eligibleProviderOptions.value.length === 1) {
      affiliationProviderId.value = eligibleProviderOptions.value[0].value;
    }
  } catch (err) {
    console.warn('Affiliation load:', err?.message);
  }
}

async function loadClaims() {
  loadingClaims.value = true;
  try {
    const res = await healthInsuranceApi.getClaims();
    claims.value = res?.data?.data || res?.data || [];
  } catch (err) {
    claims.value = [];
    $q.notify({
      type: 'negative',
      message: err?.response?.data?.error?.message || err?.response?.data?.message || 'Failed to load claims'
    });
  } finally {
    loadingClaims.value = false;
  }
}

async function submitNewClaim() {
  if (!newClaim.policyId || !newClaim.memberId) {
    $q.notify({ type: 'warning', message: 'Policy UUID and Member UUID are required' });
    return;
  }
  submittingClaim.value = true;
  try {
    await healthInsuranceApi.submitClaim({
      policyId: newClaim.policyId.trim(),
      memberId: newClaim.memberId.trim(),
      facilityId: newClaim.facilityId?.trim() || undefined,
      recordType: newClaim.recordType,
      authorisedAmountMinor:
        newClaim.amountNaira != null && newClaim.amountNaira !== ''
          ? Math.round(Number(newClaim.amountNaira) * 100)
          : undefined,
      notes: newClaim.notes || undefined
    });
    $q.notify({ type: 'positive', message: 'Claim submitted for HMO review' });
    showClaimDialog.value = false;
    newClaim.policyId = '';
    newClaim.memberId = '';
    newClaim.facilityId = '';
    newClaim.amountNaira = null;
    newClaim.notes = '';
    await loadClaims();
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err?.response?.data?.error?.message || err?.response?.data?.message || 'Failed to submit claim'
    });
  } finally {
    submittingClaim.value = false;
  }
}

async function openClaimDetail(row) {
  selectedClaim.value = row;
  claimHistory.value = [];
  claimHistoryNote.value = '';
  showClaimDetailDialog.value = true;
  loadingClaimHistory.value = true;
  try {
    const res = await healthInsuranceApi.getClaimHistory(row.id);
    const payload = res?.data?.data || res?.data || {};
    claimHistory.value = payload.events || [];
    claimHistoryNote.value = payload.note || '';
  } catch (err) {
    claimHistoryNote.value =
      err?.response?.data?.error?.message || err?.response?.data?.message || 'Unable to load claim history';
  } finally {
    loadingClaimHistory.value = false;
  }
}

async function submitAffiliation() {
  if (!affiliationProviderId.value) return;
  affiliationSaving.value = true;
  try {
    await healthInsuranceApi.requestAffiliation({ providerId: affiliationProviderId.value });
    $q.notify({ type: 'positive', message: 'Affiliation request submitted for HMO approval.' });
    affiliationProviderId.value = '';
    await loadAffiliations();
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err?.response?.data?.error?.message || err?.message || 'Affiliation request failed'
    });
  } finally {
    affiliationSaving.value = false;
  }
}

async function loadFacilities() {
  try {
    const res = await healthInsuranceApi.getFacilities();
    facilities.value = res.data?.data || res.data || [];
  } catch (err) {
    console.warn('Facilities load:', err?.message);
    facilities.value = [];
  }
}

async function refreshAll() {
  loading.value = true;
  await Promise.all([
    loadOverviewMetrics(),
    loadEnrolments(),
    loadPolicies(),
    loadInvoices(),
    loadPlansAndOffers(),
    loadFacilities(),
    loadAffiliations(),
    loadClaims()
  ]);
  loading.value = false;
}

watch(activeTab, (tab) => {
  if (tab === 'claims') loadClaims();
});

// Actions
async function submitNewEnrolment() {
  submitting.value = true;
  try {
    await healthInsuranceApi.createEnrolment({
      member_id: newEnrolment.memberId,
      plan_version_id: newEnrolment.planVersionId,
      start_date: newEnrolment.startDate,
      end_date: newEnrolment.endDate
    });
    $q.notify({ type: 'positive', message: 'Enrolment created in draft status' });
    showEnrolDialog.value = false;
    await refreshAll();
  } catch (err) {
    $q.notify({ type: 'negative', message: err?.response?.data?.error?.message || 'Failed to create enrolment' });
  } finally {
    submitting.value = false;
  }
}

async function executeVerifyEnrolment(row) {
  try {
    await healthInsuranceApi.verifyEnrolment(row.id, { notes: 'Verified by school admin' });
    $q.notify({ type: 'positive', message: 'Enrolment verified. Awaiting premium payment.' });
    await refreshAll();
  } catch (err) {
    $q.notify({ type: 'negative', message: err?.response?.data?.error?.message || 'Verification failed' });
  }
}

function promptPolicyActivation(row) {
  selectedEnrolment.value = row;
  activationData.policyNumber = `POL-${Math.floor(100000 + Math.random() * 900000)}`;
  showActivationDialog.value = true;
}

async function submitPolicyActivation() {
  if (!selectedEnrolment.value) return;
  submitting.value = true;
  try {
    await healthInsuranceApi.activatePolicy(selectedEnrolment.value.id, {
      policy_number: activationData.policyNumber,
      certificate_number: activationData.certificateNumber,
      effective_date: activationData.effectiveDate,
      expiry_date: activationData.expiryDate
    });
    $q.notify({ type: 'positive', message: 'Policy activated and confirmed with underwriter!' });
    showActivationDialog.value = false;
    await refreshAll();
  } catch (err) {
    $q.notify({ type: 'negative', message: err?.response?.data?.error?.message || 'Policy activation failed' });
  } finally {
    submitting.value = false;
  }
}

async function submitGuardianInvite() {
  submitting.value = true;
  try {
    await healthInsuranceApi.inviteGuardian({
      student_id: newGuardian.studentId,
      guardian_email: newGuardian.guardianEmail,
      relationship_type: newGuardian.relationshipType
    });
    $q.notify({ type: 'positive', message: 'Guardian invitation token generated & sent' });
    showGuardianDialog.value = false;
    await refreshAll();
  } catch (err) {
    $q.notify({ type: 'negative', message: err?.response?.data?.error?.message || 'Failed to invite guardian' });
  } finally {
    submitting.value = false;
  }
}

async function executeVerifyGuardianLink(link) {
  try {
    await healthInsuranceApi.verifyGuardianLink(link.id, { notes: 'Verified in person with birth certificate' });
    $q.notify({ type: 'positive', message: 'Guardian relationship verified successfully' });
    await refreshAll();
  } catch (err) {
    $q.notify({ type: 'negative', message: err?.response?.data?.error?.message || 'Verification failed' });
  }
}

async function submitNewInvoice() {
  submitting.value = true;
  try {
    await healthInsuranceApi.generateInvoice({
      enrolment_id: newInvoice.enrolmentId,
      total_amount: newInvoice.totalAmount,
      due_date: newInvoice.dueDate
    });
    $q.notify({ type: 'positive', message: 'Premium invoice generated' });
    showInvoiceDialog.value = false;
    await refreshAll();
  } catch (err) {
    $q.notify({ type: 'negative', message: err?.response?.data?.error?.message || 'Failed to generate invoice' });
  } finally {
    submitting.value = false;
  }
}

async function promptPayPremium(row) {
  try {
    const res = await healthInsuranceApi.initiatePayment(row.id, {
      amount: row.total_amount,
      channel: 'online'
    });
    $q.notify({ type: 'info', message: `Quasar payment initiated: ${res.data.paymentReference || 'ref'}` });
    await refreshAll();
  } catch (err) {
    $q.notify({ type: 'negative', message: err?.response?.data?.error?.message || 'Payment initiation failed' });
  }
}

onMounted(() => {
  refreshAll();
});
</script>

<style scoped>
.font-mono {
  font-family: 'SF Mono', 'Roboto Mono', Menlo, monospace;
}
.letter-spacing-1 {
  letter-spacing: 1px;
}
.op-gap-8 {
  gap: 8px;
}
.bg-card-dark {
  background: #090c15;
  border-radius: 8px;
}
.border-grey-9 {
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.border-bottom {
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.border-top {
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}
</style>
