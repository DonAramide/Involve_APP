<template>
  <q-page class="q-pa-md bg-main text-main column full-height no-wrap">
    <div class="row items-center justify-between q-mb-md no-wrap border-bottom q-pb-sm">
      <div>
        <div class="text-operator-title text-muted">Invify commercial AR · not fee orchestration</div>
        <div class="text-h6 text-main text-weight-bold" style="line-height: 1.2;">Tenant Billing & Collections</div>
      </div>
      <q-btn outline size="xs" color="grey-6" icon="refresh" label="Refresh" :loading="loading" @click="reload" />
    </div>
    <MakerCheckerQueue ref="billingApprovals" domain="tenant_billing" @changed="reload" />

    <div class="row q-col-gutter-sm q-mb-md items-end">
      <div class="col-12 col-md-3">
        <q-select v-model="profileServiceMode" :options="serviceModeOptions" emit-value map-options dense filled dark label="Service mode" />
      </div>
      <div class="col-12 col-md-6">
        <q-select
          v-model="profileTenantId"
          :options="profileTenantOptions"
          emit-value
          map-options
          use-input
          fill-input
          input-debounce="150"
          dense
          filled
          dark
          label="Tenant"
          option-label="label"
          option-value="value"
          @filter="filterProfileTenants"
          @keyup.enter="loadProfile"
        />
      </div>
      <div class="col-12 col-md-3">
        <q-btn color="amber-8" class="full-width" icon="search" label="Load profile" @click="loadProfile" />
      </div>
    </div>
    <div v-if="profile" class="row q-col-gutter-sm q-mb-md">
      <div class="col-12 col-sm-6 col-md-3" v-for="row in profileCards" :key="row.label">
        <div class="enterprise-panel op-pa-8 full-height bg-panel">
          <div class="text-operator-title text-muted">{{ row.label }}</div>
          <div class="text-h6 text-metric-mono text-amber-4">{{ row.value }}</div>
        </div>
      </div>
    </div>
    <div class="row q-col-gutter-sm q-mb-md">
      <div v-for="card in cards" :key="card.label" class="col-12 col-sm-6 col-md-3">
        <div
          class="enterprise-panel op-pa-8 full-height column justify-between bg-panel"
          :class="card.tab ? 'cursor-pointer' : ''"
          :style="card.tab && tab === card.tab ? 'outline: 1px solid #ffc107;' : ''"
          role="button"
          @click="openMetric(card.tab)"
        >
          <div class="text-operator-title text-muted">{{ card.label }}</div>
          <div class="text-h6 text-metric-mono text-amber-4">{{ card.value }}</div>
        </div>
      </div>
    </div>

    <q-tabs v-model="tab" dense align="left" class="text-grey-5" active-color="amber-5" indicator-color="amber-5">
      <q-tab name="overview" label="Overview" />
      <q-tab name="due-month" label="Due this month" />
      <q-tab name="accounts" label="Accounts" />
      <q-tab name="obligations" label="Obligations" />
      <q-tab name="plans" label="Installment Plans" />
      <q-tab name="subscriptions" label="Subscriptions" />
      <q-tab name="payments" label="Payments" />
      <q-tab name="overdue" label="Overdue" />
      <q-tab name="reports" label="Reports" />
    </q-tabs>

    <div class="enterprise-panel bg-panel col column no-wrap q-mt-sm q-pa-sm">
      <div v-if="tab === 'plans'" class="row q-col-gutter-sm q-mb-sm">
        <div class="col-12 col-md-2">
          <q-select v-model="planServiceMode" :options="serviceModeOptions" emit-value map-options dense filled dark label="Service mode" />
        </div>
        <div class="col-12 col-md-3">
          <q-select v-model="planForm.tenantId" :options="planTenantOptions" emit-value map-options use-input fill-input input-debounce="150" dense filled dark label="Tenant" option-label="label" option-value="value" @filter="filterPlanTenants" @update:model-value="onPlanTenantChange" />
        </div>
        <div class="col-12 col-md-3">
          <q-select
            v-if="planDeviceOptions.length > 1"
            v-model="planForm.deviceId"
            :options="planDeviceOptions"
            emit-value
            map-options
            dense
            filled
            dark
            label="Device"
            option-label="label"
            option-value="value"
            @update:model-value="onPlanDeviceChange"
          />
          <q-input v-else :model-value="planDeviceSummary" dense filled dark readonly label="Device" :hint="planForm.tenantId && !planForm.deviceId ? 'No device linked to this tenant' : (planForm.serialNumber && planForm.deviceId !== planForm.serialNumber ? planForm.deviceId : '')" />
        </div>
        <div class="col-12 col-md-1"><q-input v-model="planForm.purchaseNaira" dense filled dark label="Price ₦" /></div>
        <div class="col-12 col-md-1"><q-input v-model="planForm.downNaira" dense filled dark label="Down ₦" /></div>
        <div class="col-12 col-md-1"><q-input v-model="planForm.installmentNaira" dense filled dark label="Inst ₦" /></div>
        <div class="col-12 col-md-2"><q-input v-model="planForm.firstDueDate" dense filled dark type="date" label="First due" /></div>
        <div class="col-12 col-md-1"><q-btn color="amber-8" class="full-width" label="Submit" :disable="planCreateBlocked" @click="createPlan" /></div>
        <div v-if="planCreateBlocked" class="col-12 text-caption text-amber-5">This tenant already has an unpaid installment or pending payment. Collect or reverse it before submitting another plan. support@iips.app must approve new plans.</div>
      </div>
      <div v-if="tab === 'subscriptions'" class="row q-col-gutter-sm q-mb-sm">
        <div class="col-12 col-md-2">
          <q-select v-model="subServiceMode" :options="serviceModeOptions" emit-value map-options dense filled dark label="Service mode" />
        </div>
        <div class="col-12 col-md-3">
          <q-select v-model="subForm.tenantId" :options="subTenantOptions" emit-value map-options use-input fill-input input-debounce="150" dense filled dark label="Tenant" option-label="label" option-value="value" @filter="filterSubTenants" />
        </div>
        <div class="col-12 col-md-3">
          <q-select
            v-model="subForm.planName"
            :options="subscriptionPlanOptions"
            emit-value
            map-options
            dense
            filled
            dark
            label="Plan name"
            option-label="label"
            option-value="value"
            @update:model-value="onSubscriptionPlanChange"
          />
        </div>
        <div class="col-12 col-md-2"><q-input v-model="subForm.amountNaira" dense filled dark label="Amount ₦ / month" /></div>
        <div class="col-12 col-md-2"><q-input v-model="subForm.nextDue" dense filled dark type="date" label="Next due" /></div>
        <div class="col-12 col-md-2"><q-btn color="amber-8" class="full-width" label="Generate obligation" @click="createSub" /></div>
      </div>
      <div v-if="tab === 'overview'" class="row q-col-gutter-sm q-mb-sm items-end">
        <div class="col-12 col-md-4">
          <q-input v-model="overviewFilter" dense filled dark clearable debounce="150" label="Search" placeholder="Tenant, ID, status, due..." />
        </div>
        <div class="col-12 col-md-3">
          <q-select v-model="overviewStatus" :options="overviewStatusOptions" emit-value map-options dense filled dark label="Status" />
        </div>
        <div class="col-12 col-md-3">
          <q-select
            v-model="overviewTenantId"
            :options="overviewTenantOptions"
            emit-value
            map-options
            use-input
            fill-input
            input-debounce="150"
            dense
            filled
            dark
            clearable
            label="Tenant"
            option-label="label"
            option-value="value"
            @filter="filterOverviewTenants"
          />
        </div>
        <div class="col-12 col-md-2">
          <q-btn color="amber-8" class="full-width" icon="payments" label="Post Payment" @click="openPost" />
        </div>
      </div>
      <div class="row justify-end q-mb-sm" v-else-if="tab === 'payments' || tab === 'due-month'">
        <q-btn color="amber-8" icon="payments" label="Post Payment" @click="openPost" />
      </div>
      <q-table
        flat dense dark class="bg-transparent text-main col"
        :rows="tableRows"
        :columns="tableColumns"
        row-key="id"
        :loading="loading"
        v-model:pagination="tablePagination"
        :filter="tab === 'overview' ? overviewFilter : ''"
        binary-state-sort
      >
        <template #body-cell-tenant="props">
          <q-td :props="props">
            <div class="text-weight-medium">{{ tenantLabel(props.row) }}</div>
            <div v-if="props.row.tenantId && tenantLabel(props.row) !== props.row.tenantId" class="text-caption text-muted">{{ props.row.tenantId }}</div>
          </q-td>
        </template>
        <template #no-data>
          <div class="full-width row flex-center text-muted q-pa-lg text-caption">No billing rows yet. Create a plan or obligation on staging after the migration is applied.</div>
        </template>
      </q-table>
      <div class="row justify-end q-mt-sm">
        <q-btn outline size="sm" color="grey-6" label="Export CSV" @click="exportCsv" />
      </div>
    </div>

    <q-dialog v-model="postOpen" persistent>
      <q-card class="bg-panel text-main" style="min-width: 520px;">
        <q-card-section>
          <div class="text-h6">Post Payment</div>
          <div class="text-caption text-muted">Outstanding after is calculated. Do not type a balance.</div>
        </q-card-section>
        <q-card-section class="q-gutter-sm">
          <q-select v-model="postServiceMode" :options="serviceModeOptions" emit-value map-options dense filled dark label="Service mode" @update:model-value="onPostModeChange" />
          <q-select
            v-model="post.tenantId"
            :options="postTenantOptions"
            emit-value
            map-options
            use-input
            fill-input
            input-debounce="150"
            dense
            filled
            dark
            label="Tenant"
            option-label="label"
            option-value="value"
            :hint="postTenantHint"
            @filter="filterPostTenants"
            @update:model-value="runPreview"
          />
          <q-select v-model="post.method" :options="methods" dense filled dark label="Payment method" />
          <q-input v-model="post.obligationId" dense filled dark label="Obligation ID (optional)" @blur="runPreview" />
          <q-input v-model="post.installmentId" dense filled dark label="Installment ID (optional)" @blur="runPreview" />
          <q-input v-model="post.amountNaira" dense filled dark label="Amount ₦" @blur="runPreview" />
          <q-input v-model="post.reference" dense filled dark label="Payment reference" />
          <q-input v-model="post.paymentDate" dense filled dark type="date" label="Payment date" />
          <q-input v-model="post.notes" dense filled dark label="Notes" />
          <q-input v-model="post.otp" dense filled dark label="Admin MFA code" />
          <div v-if="preview" class="q-pa-sm bg-subpanel rounded-borders">
            <div class="text-caption">Outstanding before ₦{{ naira(preview.outstandingBeforeKobo) }}</div>
            <div class="text-caption">Payment ₦{{ naira(preview.paymentKobo) }}</div>
            <div class="text-caption">Amount applied ₦{{ naira(preview.amountAppliedKobo) }}</div>
            <div class="text-caption text-weight-bold">Outstanding after ₦{{ naira(preview.outstandingAfterKobo) }} (calculated, not editable)</div>
            <div class="text-caption text-amber-4">Unapplied credit ₦{{ naira(preview.unappliedCreditKobo) }} ({{ preview.overpaymentPolicy }})</div>
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn color="amber-8" label="Submit for approval" :loading="posting" :disable="!preview" @click="confirmPost" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { adminApi, deviceApi } from '../../api'
import { userFacingApiError } from '../../utils/userFacingApiError'
import { toCsv, triggerDownload } from '../../domains/tenant/reports/exportReportFile'
import MakerCheckerQueue from '../../components/MakerCheckerQueue.vue'

const billingApprovals = ref(null)
const $q = useQuasar()
const loading = ref(false)
const posting = ref(false)
const tab = ref('overview')
const overview = ref({})
const accounts = ref([])
const obligations = ref([])
const installments = ref([])
const payments = ref([])
const overdue = ref([])
const postOpen = ref(false)
const preview = ref(null)
const methods = ['BANK_TRANSFER', 'CASH', 'POS', 'CARD', 'PAYSTACK', 'FLUTTERWAVE', 'OTHER']
function isoToday() {
  return new Date().toISOString().slice(0, 10)
}

const planForm = ref({ tenantId: '', deviceId: '', serialNumber: '', purchaseNaira: '300000', downNaira: '50000', installmentNaira: '25000', firstDueDate: isoToday() })
const subForm = ref({ tenantId: '', planName: 'Basic', amountNaira: '15000', nextDue: isoToday() })
const post = ref({ tenantId: '', method: 'BANK_TRANSFER', obligationId: '', installmentId: '', amountNaira: '', reference: '', paymentDate: '', notes: '', otp: '' })
const subscriptionPlanOptions = [
  { label: 'Basic', value: 'Basic', amountNaira: '15000' },
  { label: 'Standard', value: 'Standard', amountNaira: '35000' },
  { label: 'Premium', value: 'Premium', amountNaira: '60000' },
  { label: 'Enterprise', value: 'Enterprise', amountNaira: '120000' },
  { label: 'Business Pro', value: 'Business Pro', amountNaira: '10000' },
]

function onSubscriptionPlanChange(planName) {
  const plan = subscriptionPlanOptions.find((p) => p.value === planName)
  if (plan) subForm.value.amountNaira = plan.amountNaira
}
const profileTenantId = ref('')
const profile = ref(null)
const tenantNames = ref({})
const tenants = ref([])
const fleetDevices = ref([])
const serviceModeOptions = [
  { label: 'All', value: 'all' },
  { label: 'School', value: 'school' },
  { label: 'Retail', value: 'retail' },
  { label: 'Service', value: 'service' },
]
const profileServiceMode = ref('all')
const planServiceMode = ref('all')
const subServiceMode = ref('all')
const postServiceMode = ref('all')
const profileTenantOptions = ref([])
const planTenantOptions = ref([])
const subTenantOptions = ref([])
const postTenantOptions = ref([])
const overviewFilter = ref('')
const overviewStatus = ref('all')
const overviewTenantId = ref(null)
const overviewTenantOptions = ref([])
const tablePagination = ref({
  page: 1,
  rowsPerPage: 25,
  sortBy: 'dueDate',
  descending: false,
})
const overviewStatusOptions = [
  { label: 'All statuses', value: 'all' },
  { label: 'Due', value: 'DUE' },
  { label: 'Upcoming', value: 'UPCOMING' },
  { label: 'Paid', value: 'PAID' },
  { label: 'Overdue', value: 'OVERDUE' },
  { label: 'Partial', value: 'PARTIAL' },
]

function normalizeServiceMode(value) {
  const raw = String(value || '').trim().toLowerCase()
  if (['service', 'services', 'invify_services', 'hospitality'].includes(raw)) return 'service'
  if (['education', 'invify_school', 'school'].includes(raw)) return 'school'
  if (['invify_retail', 'retail'].includes(raw)) return 'retail'
  return raw
}

function tenantDisplayName(t) {
  return String(t?.business_name || t?.businessName || t?.name || t?.id || '').trim()
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ''))
}

function deviceUuid(d) {
  if (isUuid(d?.id)) return d.id
  if (isUuid(d?.device_id)) return d.device_id
  return String(d?.id || d?.device_id || '')
}

function deviceSerial(d) {
  return String(d?.serial_number || d?.serialNumber || d?.device_suffix || d?.device_id || d?.device_name || deviceUuid(d) || '').trim()
}

function devicesForTenant(tenantId) {
  if (!tenantId) return []
  const seen = new Set()
  const out = []
  const push = (d) => {
    const id = deviceUuid(d)
    if (!id || seen.has(id)) return
    seen.add(id)
    out.push(d)
  }
  fleetDevices.value.forEach((d) => {
    if (String(d.tenant_id || d.tenantId) === tenantId) push(d)
  })
  const tenant = tenants.value.find((t) => t.id === tenantId)
  ;(tenant?.device_registrations || []).forEach(push)
  if (tenant?.device_id) push({ id: tenant.device_id, device_id: tenant.device_id, tenant_id: tenantId })
  return out
}

const planDeviceOptions = computed(() => devicesForTenant(planForm.value.tenantId).map((d) => ({
  label: deviceSerial(d),
  value: deviceUuid(d),
  serial: deviceSerial(d),
})))

const planDeviceSummary = computed(() => {
  if (!planForm.value.deviceId) return ''
  const serial = planForm.value.serialNumber || planForm.value.deviceId
  return serial === planForm.value.deviceId ? serial : `${serial}`
})

function applyPlanDevice(deviceId) {
  const match = planDeviceOptions.value.find((d) => d.value === deviceId) || planDeviceOptions.value[0]
  if (!match) {
    planForm.value.deviceId = ''
    planForm.value.serialNumber = ''
    return
  }
  planForm.value.deviceId = match.value
  planForm.value.serialNumber = match.serial
}

function onPlanDeviceChange(deviceId) {
  applyPlanDevice(deviceId)
}

function onPlanTenantChange() {
  applyPlanDevice(planDeviceOptions.value[0]?.value)
}

function tenantOptionsForMode(mode, needle = '') {
  const wanted = normalizeServiceMode(mode)
  const q = String(needle || '').toLowerCase().trim()
  return tenants.value
    .filter((t) => t?.id && (wanted === 'all' || !wanted || normalizeServiceMode(t.type) === wanted))
    .map((t) => ({ label: tenantDisplayName(t), value: t.id }))
    .filter((opt) => !q || opt.label.toLowerCase().includes(q) || String(opt.value).toLowerCase().includes(q))
    .sort((a, b) => a.label.localeCompare(b.label))
}

function filterProfileTenants(val, update) {
  update(() => { profileTenantOptions.value = tenantOptionsForMode(profileServiceMode.value, val) })
}
function filterPlanTenants(val, update) {
  update(() => { planTenantOptions.value = tenantOptionsForMode(planServiceMode.value, val) })
}
function filterSubTenants(val, update) {
  update(() => { subTenantOptions.value = tenantOptionsForMode(subServiceMode.value, val) })
}
function filterPostTenants(val, update) {
  update(() => { postTenantOptions.value = tenantOptionsForMode(postServiceMode.value, val) })
}
function filterOverviewTenants(val, update) {
  update(() => { overviewTenantOptions.value = tenantOptionsForMode('all', val) })
}

const postTenantHint = computed(() => {
  const n = tenantOptionsForMode(postServiceMode.value).length
  return n ? `${n} tenant${n === 1 ? '' : 's'} in this service mode` : 'No tenants in this service mode'
})

function onPostModeChange() {
  post.value.tenantId = ''
  preview.value = null
  postTenantOptions.value = tenantOptionsForMode(postServiceMode.value)
}

const profileCards = computed(() => {
  if (!profile.value) return []
  const p = profile.value
  return [
    { label: 'Business', value: tenantLabel(p) },
    { label: 'Total obligations', value: `₦${naira(p.totalObligationsKobo)}` },
    { label: 'Total paid', value: `₦${naira(p.totalPaidKobo)}` },
    { label: 'Outstanding', value: `₦${naira(p.outstandingKobo)}` },
    { label: 'Overdue', value: `₦${naira(p.overdueKobo)}` },
    { label: 'Devices', value: String((p.devices || []).length) },
    { label: 'Installments', value: String((p.installments || []).length) },
    { label: 'Subscriptions', value: String((p.subscriptions || []).length) },
    { label: 'Payment history', value: String((p.payments || []).length) },
  ]
})

function naira(kobo) {
  const n = Number(kobo || 0) / 100
  if (!Number.isFinite(n)) return '0.00'
  return n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function tenantLabel(row) {
  if (!row) return ''
  const id = row.tenantId || row.id || ''
  return row.tenantName || tenantNames.value[id] || id
}

const cards = computed(() => [
  { label: 'Total Outstanding', value: `₦${naira(overview.value.totalOutstandingKobo)}`, tab: 'obligations' },
  { label: 'Due This Month', value: `₦${naira(overview.value.dueThisMonthKobo)}`, tab: 'due-month' },
  { label: 'Overdue', value: `₦${naira(overview.value.overdueKobo)}`, tab: 'overdue' },
  { label: 'Collected This Month', value: `₦${naira(overview.value.collectedThisMonthKobo)}`, tab: 'payments' },
  { label: 'Pending Payments', value: String(overview.value.pendingPayments || 0), tab: 'payments' },
  { label: 'Active Installment Plans', value: String(overview.value.activeInstallmentPlans || 0), tab: 'plans' },
  { label: 'Active Subscriptions', value: String(overview.value.activeSubscriptions || 0), tab: 'subscriptions' },
])

function currentMonthPrefix() {
  return new Date().toISOString().slice(0, 7)
}

function isDueThisMonth(row) {
  const due = String(row?.dueDate || row?.due_date || '')
  const outstanding = Number(row?.outstandingKobo ?? row?.amountOutstandingKobo ?? 0)
  return due.startsWith(currentMonthPrefix()) && outstanding > 0
}

function dueThisMonthRows() {
  const inst = installments.value.filter(isDueThisMonth)
  if (inst.length) return inst
  return obligations.value.filter(isDueThisMonth)
}

function openMetric(name) {
  if (!name) return
  tab.value = name
}

function tenantHasOngoingFinancing(tenantId) {
  if (!tenantId) return false
  const openInst = installments.value.some((i) => i.tenantId === tenantId && Number(i.outstandingKobo) > 0 && !i.cancelled)
  const openOb = obligations.value.some((o) =>
    o.tenantId === tenantId
    && o.type === 'DEVICE_INSTALLMENT'
    && o.status !== 'CANCELLED'
    && o.status !== 'PAID'
    && Number(o.amountOutstandingKobo) > 0,
  )
  const pending = payments.value.some((p) => p.tenantId === tenantId && String(p.status || '').toUpperCase() === 'PENDING')
  return openInst || openOb || pending
}

const planCreateBlocked = computed(() => tenantHasOngoingFinancing(planForm.value.tenantId))

function isQueuedResponse(res) {
  return res?.status === 202 || res?.data?.pending === true
}

function matchesOverviewFilters(row) {
  if (overviewStatus.value && overviewStatus.value !== 'all') {
    if (String(row.status || '').toUpperCase() !== overviewStatus.value) return false
  }
  if (overviewTenantId.value && row.tenantId !== overviewTenantId.value) return false
  return true
}

const tableRows = computed(() => {
  if (tab.value === 'due-month') return dueThisMonthRows()
  if (tab.value === 'accounts') return accounts.value
  if (tab.value === 'obligations') return obligations.value
  if (tab.value === 'plans') return installments.value
  if (tab.value === 'overview') return installments.value.filter(matchesOverviewFilters)
  if (tab.value === 'payments') return payments.value
  if (tab.value === 'overdue') return overdue.value
  if (tab.value === 'subscriptions') return obligations.value.filter((o) => o.type === 'SUBSCRIPTION')
  return obligations.value
})

const tableColumns = computed(() => {
  if (tab.value === 'payments') {
    return [
      { name: 'reference', label: 'Reference', field: 'reference', align: 'left', sortable: true },
      { name: 'tenant', label: 'Tenant', field: (r) => tenantLabel(r), align: 'left', sortable: true },
      { name: 'amountKobo', label: 'Amount ₦', field: (r) => Number(r.amountKobo || 0), format: (v) => naira(v), align: 'right', sortable: true },
      { name: 'method', label: 'Method', field: 'method', sortable: true },
      { name: 'status', label: 'Status', field: 'status', sortable: true },
      { name: 'postedBy', label: 'Posted by', field: 'postedBy', sortable: true },
    ]
  }
  if (tab.value === 'accounts') {
    return [
      { name: 'tenant', label: 'Tenant', field: (r) => tenantLabel(r), align: 'left', sortable: true },
      { name: 'unappliedCreditKobo', label: 'Credit ₦', field: (r) => Number(r.unappliedCreditKobo || 0), format: (v) => naira(v), align: 'right', sortable: true },
      { name: 'status', label: 'Status', field: 'status', sortable: true },
    ]
  }
  return [
    { name: 'id', label: 'ID', field: 'id', align: 'left', sortable: true },
    { name: 'tenant', label: 'Tenant', field: (r) => tenantLabel(r), align: 'left', sortable: true },
    { name: 'status', label: 'Status', field: 'status', sortable: true },
    { name: 'dueDate', label: 'Due', field: (r) => r.dueDate || r.due_date || '', sortable: true },
    { name: 'outstanding', label: 'Outstanding ₦', field: (r) => Number(r.outstandingKobo ?? r.amountOutstandingKobo ?? 0), format: (v) => naira(v), align: 'right', sortable: true },
  ]
})

async function reload() {
  loading.value = true
  try {
    const [ov, ac, ob, ins, pay, od, ten, dev] = await Promise.all([
      adminApi.getTenantBillingOverview(),
      adminApi.listTenantBillingAccounts(),
      adminApi.listTenantBillingObligations(),
      adminApi.listTenantBillingInstallments(),
      adminApi.listTenantBillingPayments(),
      adminApi.listTenantBillingOverdue(),
      adminApi.getTenants().catch(() => ({ data: [] })),
      deviceApi.getDevices().catch(() => ({ data: [] })),
    ])
    overview.value = ov.data?.data || {}
    accounts.value = ac.data?.data || []
    obligations.value = ob.data?.data || []
    installments.value = ins.data?.data || []
    payments.value = pay.data?.data || []
    overdue.value = od.data?.data || []
    const list = Array.isArray(ten.data) ? ten.data : (ten.data?.data || [])
    tenants.value = list
    fleetDevices.value = Array.isArray(dev.data) ? dev.data : (dev.data?.data || [])
    const map = {}
    list.forEach((t) => {
      if (!t?.id) return
      map[t.id] = tenantDisplayName(t)
    })
    tenantNames.value = map
    profileTenantOptions.value = tenantOptionsForMode(profileServiceMode.value)
    planTenantOptions.value = tenantOptionsForMode(planServiceMode.value)
    subTenantOptions.value = tenantOptionsForMode(subServiceMode.value)
    postTenantOptions.value = tenantOptionsForMode(postServiceMode.value)
    overviewTenantOptions.value = tenantOptionsForMode('all')
    billingApprovals.value?.refresh?.()
  } catch (e) {
    $q.notify({ type: 'negative', message: userFacingApiError(e) })
  } finally {
    loading.value = false
  }
}

function nairaToKoboPayload(nairaStr) {
  return { amountNaira: String(nairaStr || '0') }
}

async function createPlan() {
  if (!planForm.value.tenantId) {
    $q.notify({ type: 'warning', message: 'Select a tenant first' })
    return
  }
  if (!planForm.value.deviceId) {
    $q.notify({ type: 'warning', message: 'This tenant has no linked device' })
    return
  }
  if (planCreateBlocked.value) {
    $q.notify({ type: 'warning', message: 'This tenant already has an ongoing installment or pending payment' })
    return
  }
  try {
    const res = await adminApi.createTenantBillingPlan({
      tenantId: planForm.value.tenantId,
      deviceId: planForm.value.deviceId,
      serialNumber: planForm.value.serialNumber,
      purchasePriceKobo: Math.round(Number(planForm.value.purchaseNaira) * 100),
      downPaymentKobo: Math.round(Number(planForm.value.downNaira) * 100),
      installmentKobo: Math.round(Number(planForm.value.installmentNaira) * 100),
      firstDueDate: planForm.value.firstDueDate,
      description: `Invify Box ${planForm.value.serialNumber || ''}`.trim(),
    })
    if (isQueuedResponse(res)) {
      $q.notify({ type: 'info', message: res.data?.message || 'Plan submitted. Only support@iips.app can approve it.' })
      billingApprovals.value?.refresh?.()
      return
    }
    $q.notify({ type: 'positive', message: 'Installment plan created' })
    await reload()
  } catch (e) {
    $q.notify({ type: 'negative', message: userFacingApiError(e) })
  }
}

async function createSub() {
  if (!subForm.value.tenantId) {
    $q.notify({ type: 'warning', message: 'Select a service mode and tenant first' })
    return
  }
  if (!subForm.value.nextDue) {
    $q.notify({ type: 'warning', message: 'Set the next due date' })
    return
  }
  if (!subForm.value.planName) {
    $q.notify({ type: 'warning', message: 'Select a plan name' })
    return
  }
  if (!(Number(subForm.value.amountNaira) > 0)) {
    $q.notify({ type: 'warning', message: 'Enter a monthly amount greater than 0' })
    return
  }
  try {
    await adminApi.createTenantBillingSubscription({
      tenantId: subForm.value.tenantId,
      planName: subForm.value.planName,
      ...nairaToKoboPayload(subForm.value.amountNaira),
      nextDue: subForm.value.nextDue,
    })
    $q.notify({ type: 'positive', message: 'Subscription obligation generated (no wallet charge)' })
    await reload()
  } catch (e) {
    $q.notify({ type: 'negative', message: userFacingApiError(e) })
  }
}

function openPost() {
  preview.value = null
  postOpen.value = true
}

async function runPreview() {
  if (!post.value.tenantId || !post.value.amountNaira) return
  try {
    const { data } = await adminApi.previewTenantBillingPayment({
      tenantId: post.value.tenantId,
      obligationId: post.value.obligationId || undefined,
      installmentId: post.value.installmentId || undefined,
      ...nairaToKoboPayload(post.value.amountNaira),
    })
    preview.value = data.data
  } catch (e) {
    preview.value = null
    $q.notify({ type: 'negative', message: userFacingApiError(e) })
  }
}

async function confirmPost() {
  posting.value = true
  try {
    const res = await adminApi.postTenantBillingPayment({
      tenantId: post.value.tenantId,
      method: post.value.method,
      obligationId: post.value.obligationId || undefined,
      installmentId: post.value.installmentId || undefined,
      reference: post.value.reference,
      paymentDate: post.value.paymentDate,
      notes: post.value.notes,
      otp: post.value.otp,
      ...nairaToKoboPayload(post.value.amountNaira),
    })
    if (isQueuedResponse(res)) {
      $q.notify({ type: 'info', message: res.data?.message || 'Payment submitted. Only support@iips.app can approve it.' })
      postOpen.value = false
      billingApprovals.value?.refresh?.()
      return
    }
    $q.notify({ type: 'positive', message: 'Payment posted' })
    postOpen.value = false
    await reload()
  } catch (e) {
    $q.notify({ type: 'negative', message: userFacingApiError(e) })
  } finally {
    posting.value = false
  }
}

function exportCsv() {
  const headers = tableColumns.value.map((c) => c.name)
  const blob = new Blob([toCsv(headers, tableRows.value.map((row) => {
    const out = {}
    headers.forEach((h) => {
      if (h === 'tenant') out[h] = tenantLabel(row)
      else out[h] = typeof row[h] === 'undefined' ? '' : row[h]
    })
    return out
  }))], { type: 'text/csv;charset=utf-8' })
  triggerDownload(blob, `tenant-billing-${tab.value}.csv`)
}

async function loadProfile() {
  if (!profileTenantId.value) return
  try {
    const { data } = await adminApi.getTenantBillingProfile(profileTenantId.value)
    profile.value = data.data
  } catch (e) {
    profile.value = null
    $q.notify({ type: 'negative', message: userFacingApiError(e) })
  }
}

watch(profileServiceMode, () => {
  profileTenantId.value = ''
  profile.value = null
  profileTenantOptions.value = tenantOptionsForMode(profileServiceMode.value)
})
watch(planServiceMode, () => {
  planForm.value.tenantId = ''
  planForm.value.deviceId = ''
  planForm.value.serialNumber = ''
  planTenantOptions.value = tenantOptionsForMode(planServiceMode.value)
})
watch(subServiceMode, () => {
  subForm.value.tenantId = ''
  subTenantOptions.value = tenantOptionsForMode(subServiceMode.value)
})
watch(tab, () => {
  tablePagination.value = { ...tablePagination.value, page: 1 }
})
watch([overviewFilter, overviewStatus, overviewTenantId], () => {
  tablePagination.value = { ...tablePagination.value, page: 1 }
})
onMounted(reload)
</script>
