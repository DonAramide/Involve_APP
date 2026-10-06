<template>
  <q-page class="q-pa-md bg-main text-main column full-height no-wrap">
    <div class="row items-center justify-between q-mb-md no-wrap border-bottom q-pb-sm">
      <div>
        <div class="text-operator-title text-muted">Invify commercial AR · not fee orchestration</div>
        <div class="text-h6 text-main text-weight-bold" style="line-height: 1.2;">Tenant Billing & Collections</div>
      </div>
      <q-btn outline size="xs" color="grey-6" icon="refresh" label="Refresh" :loading="loading" @click="reload" />
    </div>

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
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel">
          <div class="text-operator-title text-muted">{{ card.label }}</div>
          <div class="text-h6 text-metric-mono text-amber-4">{{ card.value }}</div>
        </div>
      </div>
    </div>

    <q-tabs v-model="tab" dense align="left" class="text-grey-5" active-color="amber-5" indicator-color="amber-5">
      <q-tab name="overview" label="Overview" />
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
          <q-select v-model="planForm.tenantId" :options="planTenantOptions" emit-value map-options use-input fill-input input-debounce="150" dense filled dark label="Tenant" option-label="label" option-value="value" @filter="filterPlanTenants" />
        </div>
        <div class="col-12 col-md-2"><q-input v-model="planForm.deviceId" dense filled dark label="Device UUID" /></div>
        <div class="col-12 col-md-2"><q-input v-model="planForm.serialNumber" dense filled dark label="Serial" /></div>
        <div class="col-12 col-md-1"><q-input v-model="planForm.purchaseNaira" dense filled dark label="Price ₦" /></div>
        <div class="col-12 col-md-1"><q-input v-model="planForm.downNaira" dense filled dark label="Down ₦" /></div>
        <div class="col-12 col-md-1"><q-input v-model="planForm.installmentNaira" dense filled dark label="Inst ₦" /></div>
        <div class="col-12 col-md-2"><q-input v-model="planForm.firstDueDate" dense filled dark type="date" label="First due" /></div>
        <div class="col-12 col-md-1"><q-btn color="amber-8" class="full-width" label="Create" @click="createPlan" /></div>
      </div>
      <div v-if="tab === 'subscriptions'" class="row q-col-gutter-sm q-mb-sm">
        <div class="col-12 col-md-2">
          <q-select v-model="subServiceMode" :options="serviceModeOptions" emit-value map-options dense filled dark label="Service mode" />
        </div>
        <div class="col-12 col-md-3">
          <q-select v-model="subForm.tenantId" :options="subTenantOptions" emit-value map-options use-input fill-input input-debounce="150" dense filled dark label="Tenant" option-label="label" option-value="value" @filter="filterSubTenants" />
        </div>
        <div class="col-12 col-md-3"><q-input v-model="subForm.planName" dense filled dark label="Plan name" /></div>
        <div class="col-12 col-md-2"><q-input v-model="subForm.amountNaira" dense filled dark label="Amount ₦ / month" /></div>
        <div class="col-12 col-md-2"><q-input v-model="subForm.nextDue" dense filled dark type="date" label="Next due" /></div>
        <div class="col-12 col-md-2"><q-btn color="amber-8" class="full-width" label="Generate obligation" @click="createSub" /></div>
      </div>
      <div class="row justify-end q-mb-sm" v-if="tab === 'payments' || tab === 'overview'">
        <q-btn color="amber-8" icon="payments" label="Post Payment" @click="openPost" />
      </div>
      <q-table
        flat dense dark class="bg-transparent text-main col"
        :rows="tableRows"
        :columns="tableColumns"
        row-key="id"
        :loading="loading"
        :pagination="{ rowsPerPage: 25 }"
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
          <q-btn color="amber-8" label="Post Payment" :loading="posting" :disable="!preview" @click="confirmPost" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { adminApi } from '../../api'
import { userFacingApiError } from '../../utils/userFacingApiError'
import { toCsv, triggerDownload } from '../../domains/tenant/reports/exportReportFile'

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
const subForm = ref({ tenantId: '', planName: 'Business Pro', amountNaira: '10000', nextDue: isoToday() })
const post = ref({ tenantId: '', method: 'BANK_TRANSFER', obligationId: '', installmentId: '', amountNaira: '', reference: '', paymentDate: '', notes: '', otp: '' })
const profileTenantId = ref('')
const profile = ref(null)
const tenantNames = ref({})
const tenants = ref([])
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
  const n = Number(kobo || 0)
  return (n / 100).toFixed(2)
}

function tenantLabel(row) {
  if (!row) return ''
  const id = row.tenantId || row.id || ''
  return row.tenantName || tenantNames.value[id] || id
}

const cards = computed(() => [
  { label: 'Total Outstanding', value: `₦${naira(overview.value.totalOutstandingKobo)}` },
  { label: 'Due This Month', value: `₦${naira(overview.value.dueThisMonthKobo)}` },
  { label: 'Overdue', value: `₦${naira(overview.value.overdueKobo)}` },
  { label: 'Collected This Month', value: `₦${naira(overview.value.collectedThisMonthKobo)}` },
  { label: 'Pending Payments', value: String(overview.value.pendingPayments || 0) },
  { label: 'Active Installment Plans', value: String(overview.value.activeInstallmentPlans || 0) },
  { label: 'Active Subscriptions', value: String(overview.value.activeSubscriptions || 0) },
])

const tableRows = computed(() => {
  if (tab.value === 'accounts') return accounts.value
  if (tab.value === 'obligations') return obligations.value
  if (tab.value === 'plans' || tab.value === 'overview') return installments.value
  if (tab.value === 'payments') return payments.value
  if (tab.value === 'overdue') return overdue.value
  if (tab.value === 'subscriptions') return obligations.value.filter((o) => o.type === 'SUBSCRIPTION')
  return obligations.value
})

const tableColumns = computed(() => {
  if (tab.value === 'payments') {
    return [
      { name: 'reference', label: 'Reference', field: 'reference', align: 'left' },
      { name: 'tenant', label: 'Tenant', field: (r) => tenantLabel(r), align: 'left' },
      { name: 'amountKobo', label: 'Amount ₦', field: (r) => naira(r.amountKobo), align: 'right' },
      { name: 'method', label: 'Method', field: 'method' },
      { name: 'status', label: 'Status', field: 'status' },
      { name: 'postedBy', label: 'Posted by', field: 'postedBy' },
    ]
  }
  if (tab.value === 'accounts') {
    return [
      { name: 'tenant', label: 'Tenant', field: (r) => tenantLabel(r), align: 'left' },
      { name: 'unappliedCreditKobo', label: 'Credit ₦', field: (r) => naira(r.unappliedCreditKobo), align: 'right' },
      { name: 'status', label: 'Status', field: 'status' },
    ]
  }
  return [
    { name: 'id', label: 'ID', field: 'id', align: 'left' },
    { name: 'tenant', label: 'Tenant', field: (r) => tenantLabel(r), align: 'left' },
    { name: 'status', label: 'Status', field: 'status' },
    { name: 'dueDate', label: 'Due', field: (r) => r.dueDate || r.due_date || '' },
    { name: 'outstanding', label: 'Outstanding ₦', field: (r) => naira(r.outstandingKobo ?? r.amountOutstandingKobo), align: 'right' },
  ]
})

async function reload() {
  loading.value = true
  try {
    const [ov, ac, ob, ins, pay, od, ten] = await Promise.all([
      adminApi.getTenantBillingOverview(),
      adminApi.listTenantBillingAccounts(),
      adminApi.listTenantBillingObligations(),
      adminApi.listTenantBillingInstallments(),
      adminApi.listTenantBillingPayments(),
      adminApi.listTenantBillingOverdue(),
      adminApi.getTenants().catch(() => ({ data: [] })),
    ])
    overview.value = ov.data?.data || {}
    accounts.value = ac.data?.data || []
    obligations.value = ob.data?.data || []
    installments.value = ins.data?.data || []
    payments.value = pay.data?.data || []
    overdue.value = od.data?.data || []
    const list = Array.isArray(ten.data) ? ten.data : (ten.data?.data || [])
    tenants.value = list
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
  try {
    await adminApi.createTenantBillingPlan({
      tenantId: planForm.value.tenantId,
      deviceId: planForm.value.deviceId,
      serialNumber: planForm.value.serialNumber,
      purchasePriceKobo: Math.round(Number(planForm.value.purchaseNaira) * 100),
      downPaymentKobo: Math.round(Number(planForm.value.downNaira) * 100),
      installmentKobo: Math.round(Number(planForm.value.installmentNaira) * 100),
      firstDueDate: planForm.value.firstDueDate,
      description: `Invify Box ${planForm.value.serialNumber || ''}`.trim(),
    })
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
  if (!(Number(subForm.value.amountNaira) > 0)) {
    $q.notify({ type: 'warning', message: 'Enter a monthly amount greater than 0' })
    return
  }
  try {
    await adminApi.createTenantBillingSubscription({
      tenantId: subForm.value.tenantId,
      planName: subForm.value.planName || 'Business Pro',
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
    await adminApi.postTenantBillingPayment({
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
  planTenantOptions.value = tenantOptionsForMode(planServiceMode.value)
})
watch(subServiceMode, () => {
  subForm.value.tenantId = ''
  subTenantOptions.value = tenantOptionsForMode(subServiceMode.value)
})
watch(tab, () => {})
onMounted(reload)
</script>
