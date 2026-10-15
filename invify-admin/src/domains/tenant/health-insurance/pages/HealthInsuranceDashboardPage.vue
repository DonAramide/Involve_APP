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
            SCHOOL MODE
          </q-badge>
          <q-badge v-if="isSandbox" color="amber-10" text-color="amber-3" class="text-weight-bold q-ml-xs">
            SANDBOX ENGINE
          </q-badge>
        </div>
        <div class="text-caption text-grey-5 q-mt-xs">
          Multi-Mode Health Insurance Administration — Manage student, guardian, and staff coverage, premium billing, and insurer activation.
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
            {{ metrics.studentsEnrolled }} Students • {{ metrics.staffEnrolled }} Staff
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
                Guardians cannot access student medical coverage until their relationship is explicitly verified by school administration.
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
              <div class="text-caption text-grey-5">Partner underwriters and eligible plans offered to this school.</div>
            </div>
          </div>

          <div class="row q-col-gutter-md">
            <div v-for="offer in tenantOffers" :key="offer.id" class="col-12 col-md-4">
              <q-card class="bg-card-dark border-grey-9 q-pa-md">
                <div class="row items-center justify-between">
                  <div class="text-weight-bolder text-subtitle2 text-teal-3">{{ offer.plan_name || 'Standard School Plan' }}</div>
                  <q-badge color="teal-10" text-color="teal-3">ACTIVE OFFER</q-badge>
                </div>
                <div class="text-caption text-grey-5 q-mt-xs">Provider: {{ offer.provider_name || 'Reliance Health' }}</div>
                <div class="text-h6 text-white font-mono q-mt-md">
                  {{ formatNgn(offer.custom_annual_premium || offer.annual_premium || 35000) }} / yr
                </div>
                <div class="text-caption text-grey-6 font-mono">
                  Term: {{ formatNgn(offer.custom_term_premium || 12000) }} / term
                </div>
                <div class="q-mt-sm text-caption text-grey-4">
                  Tier: {{ offer.tier || 'STANDARD' }}
                </div>
              </q-card>
            </div>
          </div>
        </q-tab-panel>

        <!-- TAB 6: Facilities Directory -->
        <q-tab-panel name="facilities" class="q-pa-md">
          <div class="text-subtitle1 text-weight-bold q-mb-md">Participating Hospitals & Healthcare Centers</div>
          <q-table
            :rows="facilities"
            :columns="facilityColumns"
            row-key="id"
            dark
            flat
            class="bg-transparent text-grey-3 font-mono"
          />
        </q-tab-panel>

        <!-- TAB 7: Claims Log -->
        <q-tab-panel name="claims" class="q-pa-md">
          <div class="text-subtitle1 text-weight-bold q-mb-md">Claims & Treatment Authorisations</div>
          <q-banner dense rounded class="bg-dark text-grey-4 border-grey-9 q-mb-md">
            <template v-slot:avatar><q-icon name="info" color="cyan-4" /></template>
            <div class="text-caption">
              Clinical claim adjudications and medical justifications reside in the HMO provider systems.
              Only verified financial and authorization status updates are reflected here.
            </div>
          </q-banner>
          <q-table
            :rows="claims"
            :columns="claimColumns"
            row-key="id"
            dark
            flat
            class="bg-transparent text-grey-3 font-mono"
          />
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
            label="Plan Version"
          />
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
  </q-page>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { healthInsuranceApi } from 'src/api/healthInsuranceApi';

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
const facilities = ref([]);
const facilityColumns = [
  { name: 'name', label: 'FACILITY NAME', field: 'name', align: 'left' },
  { name: 'type', label: 'TIER', field: 'facility_type', align: 'left' },
  { name: 'state', label: 'STATE', field: 'state', align: 'left' },
  { name: 'address', label: 'ADDRESS', field: 'address', align: 'left' }
];
const claims = ref([]);
const claimColumns = [
  { name: 'claim_number', label: 'CLAIM #', field: 'claim_number', align: 'left' },
  { name: 'service_date', label: 'DATE', field: 'service_date', align: 'left' },
  { name: 'amount', label: 'AMOUNT (NGN)', field: 'amount', align: 'right', format: v => formatNgn(v) },
  { name: 'status', label: 'STATUS', field: 'status', align: 'center' }
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

const planVersionOptions = ref([
  { label: 'Reliance Basic Student Care v1 (Standard)', value: 'plan-ver-default-01' }
]);

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

// Fetch Functions
async function loadOverviewMetrics() {
  try {
    const res = await healthInsuranceApi.getOverviewMetrics();
    if (res.data) {
      Object.assign(metrics, res.data);
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
    const res = await healthInsuranceApi.getTenantOffers();
    tenantOffers.value = res.data || [];
  } catch (err) {
    console.warn('Plans load:', err?.message);
  }
}

async function loadFacilities() {
  try {
    const res = await healthInsuranceApi.getFacilities();
    facilities.value = res.data || [];
  } catch (err) {
    console.warn('Facilities load:', err?.message);
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
    loadFacilities()
  ]);
  loading.value = false;
}

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
