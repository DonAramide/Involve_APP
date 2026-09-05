<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-md">
      <div>
        <div class="text-h5 text-weight-bold">Refunds & Chargebacks</div>
        <div class="text-caption text-grey-7">
          Maker creates the case. A different checker approves it. Quasar is debited only after approval (fail-closed).
        </div>
      </div>
      <q-space />
      <q-btn outline icon="refresh" label="Refresh" :loading="loading" class="q-mr-sm" @click="fetchCases" />
      <q-btn color="primary" icon="add" label="New case" @click="openCreate" />
    </div>

    <div class="row q-col-gutter-sm q-mb-md">
      <div class="col-12 col-sm-4 col-md-2">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-caption text-grey-7">Pending checker</div>
            <div class="text-h5 text-weight-bold">{{ pendingCount }}</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-sm-4 col-md-2">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-caption text-grey-7">Posted</div>
            <div class="text-h5 text-weight-bold text-positive">{{ postedCount }}</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-sm-4 col-md-2">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-caption text-grey-7">Failed / rejected</div>
            <div class="text-h5 text-weight-bold text-negative">{{ failedCount }}</div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <div class="row q-gutter-sm q-mb-md items-center">
      <q-select
        v-model="statusFilter"
        dense
        outlined
        emit-value
        map-options
        style="min-width: 220px"
        :options="statusOptions"
        label="Status"
        @update:model-value="fetchCases"
      />
    </div>

    <q-card flat bordered>
      <q-table
        flat
        row-key="id"
        :rows="rows"
        :columns="columns"
        :loading="loading"
        :pagination="{ rowsPerPage: 25 }"
        :rows-per-page-options="[25, 50, 100]"
      >
        <template #body-cell-amount_kobo="props">
          <q-td :props="props">
            ₦{{ naira(props.row.amount_kobo).toLocaleString() }}
          </q-td>
        </template>
        <template #body-cell-status="props">
          <q-td :props="props">
            <q-badge :color="statusColor(props.row.status)" :label="props.row.status" />
          </q-td>
        </template>
        <template #body-cell-actions="props">
          <q-td :props="props">
            <q-btn dense flat icon="history" size="sm" @click="openAudit(props.row)">
              <q-tooltip>Audit trail</q-tooltip>
            </q-btn>
            <q-btn
              v-if="props.row.status === 'PENDING_CHECKER' || props.row.status === 'FAILED' || props.row.status === 'APPROVED_EXECUTING'"
              dense
              flat
              color="positive"
              icon="check"
              size="sm"
              :disable="isMaker(props.row) && props.row.status !== 'APPROVED_EXECUTING'"
              @click="approveCase(props.row)"
            >
              <q-tooltip>
                {{
                  props.row.status === 'APPROVED_EXECUTING'
                    ? 'Retry finalize (Quasar / ledger)'
                    : isMaker(props.row)
                      ? 'You created this case — another operator must approve'
                      : 'Approve (checker)'
                }}
              </q-tooltip>
            </q-btn>
            <q-btn
              v-if="props.row.status === 'PENDING_CHECKER'"
              dense
              flat
              color="negative"
              icon="close"
              size="sm"
              :disable="isMaker(props.row)"
              @click="rejectCase(props.row)"
            />
          </q-td>
        </template>
      </q-table>
    </q-card>

    <q-dialog v-model="showCreate">
      <q-card style="min-width: 480px; max-width: 560px">
        <q-card-section>
          <div class="text-h6">Create debit case</div>
          <div class="text-caption text-grey-7">No money moves until a different operator approves.</div>
        </q-card-section>
        <q-card-section class="q-gutter-md">
          <q-select
            v-model="form.tenantId"
            filled
            emit-value
            map-options
            use-input
            input-debounce="200"
            :options="tenantOptions"
            :loading="tenantsLoading"
            label="Tenant"
            @filter="filterTenants"
          />
          <q-select
            v-model="form.caseType"
            filled
            emit-value
            map-options
            :options="typeOptions"
            label="Type"
          />
          <q-input v-model.number="form.amountNaira" filled type="number" min="0.01" step="0.01" label="Amount (NGN)" />
          <q-input
            v-model="form.originalPaymentReference"
            filled
            label="Original payment reference (required for payment refunds)"
          />
          <q-input v-model="form.reason" filled type="textarea" autogrow label="Reason (audit)" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn color="primary" label="Submit for checker" :loading="saving" @click="submitCreate" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="showAudit">
      <q-card style="min-width: 640px; max-width: 760px">
        <q-card-section>
          <div class="text-h6">Audit trail</div>
          <div class="text-caption text-grey-7">{{ selectedCase?.id }} · {{ selectedCase?.tenant_name }}</div>
        </q-card-section>
        <q-card-section>
          <q-timeline color="primary" v-if="auditEvents.length">
            <q-timeline-entry
              v-for="ev in auditEvents"
              :key="ev.id"
              :title="ev.event_type"
              :subtitle="formatDate(ev.created_at)"
              :color="ev.to_status === 'FAILED' || ev.to_status === 'REJECTED' ? 'negative' : 'primary'"
            >
              <div class="text-caption">
                {{ ev.actor_email }} · {{ ev.from_status || '—' }} → {{ ev.to_status }}
              </div>
              <pre class="text-caption" style="white-space: pre-wrap">{{ JSON.stringify(ev.payload || {}, null, 2) }}</pre>
            </q-timeline-entry>
          </q-timeline>
          <div v-else class="text-grey-7">No events yet.</div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Close" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { adminApi } from 'src/api'
import { userFacingApiError } from 'src/utils/userFacingApiError'

const $q = useQuasar()
const operatorEmail = (localStorage.getItem('operator_email') || '').toLowerCase()

const loading = ref(false)
const saving = ref(false)
const tenantsLoading = ref(false)
const rows = ref([])
const allTenants = ref([])
const tenantOptions = ref([])
const statusFilter = ref('ALL')
const showCreate = ref(false)
const showAudit = ref(false)
const selectedCase = ref(null)
const auditEvents = ref([])

const form = ref({
  tenantId: null,
  caseType: 'MANUAL_DEBIT',
  amountNaira: null,
  originalPaymentReference: '',
  reason: '',
})

const statusOptions = [
  { label: 'All', value: 'ALL' },
  { label: 'Pending checker', value: 'PENDING_CHECKER' },
  { label: 'Executing', value: 'APPROVED_EXECUTING' },
  { label: 'Posted', value: 'POSTED' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'Failed', value: 'FAILED' },
]

const typeOptions = [
  { label: 'Refund (original payment)', value: 'REFUND' },
  { label: 'Chargeback', value: 'CHARGEBACK' },
  { label: 'Manual debit', value: 'MANUAL_DEBIT' },
]

const columns = [
  { name: 'created_at', label: 'Created', field: (r) => formatDate(r.created_at), align: 'left', sortable: true },
  { name: 'tenant_name', label: 'Tenant', field: 'tenant_name', align: 'left' },
  { name: 'case_type', label: 'Type', field: 'case_type', align: 'left' },
  { name: 'amount_kobo', label: 'Amount', field: 'amount_kobo', align: 'right' },
  { name: 'status', label: 'Status', field: 'status', align: 'left' },
  { name: 'maker_email', label: 'Maker', field: 'maker_email', align: 'left' },
  { name: 'checker_email', label: 'Checker', field: 'checker_email', align: 'left' },
  { name: 'actions', label: '', field: 'id', align: 'right' },
]

const pendingCount = computed(() => rows.value.filter((r) => r.status === 'PENDING_CHECKER').length)
const postedCount = computed(() => rows.value.filter((r) => r.status === 'POSTED').length)
const failedCount = computed(() => rows.value.filter((r) => r.status === 'FAILED' || r.status === 'REJECTED').length)

function naira(kobo) {
  return Math.round(Number(kobo) || 0) / 100
}

function formatDate(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

function statusColor(status) {
  if (status === 'POSTED') return 'positive'
  if (status === 'PENDING_CHECKER') return 'warning'
  if (status === 'APPROVED_EXECUTING') return 'info'
  if (status === 'REJECTED' || status === 'FAILED') return 'negative'
  return 'grey'
}

function isMaker(row) {
  return String(row.maker_email || '').toLowerCase() === operatorEmail && !!operatorEmail
}

function unwrapTenants(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.tenants)) return payload.tenants
  return []
}

async function loadTenants() {
  tenantsLoading.value = true
  try {
    const res = await adminApi.getTenants({ limit: 500 })
    const list = unwrapTenants(res.data)
    allTenants.value = list.map((t) => ({
      label: t.name || t.business_name || t.id,
      value: t.id,
    }))
    tenantOptions.value = allTenants.value
  } catch (err) {
    $q.notify({ type: 'negative', message: userFacingApiError(err, 'Could not load tenants.') })
  } finally {
    tenantsLoading.value = false
  }
}

function filterTenants(val, update) {
  update(() => {
    const needle = String(val || '').toLowerCase()
    tenantOptions.value = needle
      ? allTenants.value.filter((t) => t.label.toLowerCase().includes(needle))
      : allTenants.value
  })
}

async function fetchCases() {
  loading.value = true
  try {
    const res = await adminApi.listFinancialDisputes({
      status: statusFilter.value,
      limit: 100,
    })
    rows.value = res.data?.data || res.data || []
  } catch (err) {
    $q.notify({ type: 'negative', message: userFacingApiError(err, 'Could not load dispute cases.') })
  } finally {
    loading.value = false
  }
}

function openCreate() {
  form.value = {
    tenantId: null,
    caseType: 'MANUAL_DEBIT',
    amountNaira: null,
    originalPaymentReference: '',
    reason: '',
  }
  showCreate.value = true
}

async function submitCreate() {
  if (!form.value.tenantId || !form.value.amountNaira || !form.value.reason) {
    $q.notify({ type: 'warning', message: 'Tenant, amount, and reason are required.' })
    return
  }
  if (form.value.caseType === 'REFUND' && !String(form.value.originalPaymentReference || '').trim()) {
    $q.notify({ type: 'warning', message: 'Refunds need the original payment reference so Quasar can reverse the intent.' })
    return
  }
  saving.value = true
  try {
    const tenant = allTenants.value.find((t) => t.value === form.value.tenantId)
    await adminApi.createFinancialDispute({
      tenantId: form.value.tenantId,
      tenantName: tenant?.label,
      caseType: form.value.caseType,
      amountNaira: Number(form.value.amountNaira),
      originalPaymentReference: form.value.originalPaymentReference || undefined,
      reason: form.value.reason,
    })
    $q.notify({ type: 'positive', message: 'Case submitted. Waiting for a different checker.' })
    showCreate.value = false
    await fetchCases()
  } catch (err) {
    $q.notify({ type: 'negative', message: userFacingApiError(err, 'Could not create case.') })
  } finally {
    saving.value = false
  }
}

async function approveCase(row) {
  const isRetry = row.status === 'APPROVED_EXECUTING' || row.status === 'FAILED'
  $q.dialog({
    title: isRetry ? 'Retry finalize' : 'Approve debit',
    message: isRetry
      ? `Retry Quasar debit / local ledger for ₦${naira(row.amount_kobo).toLocaleString()} (${row.tenant_name || 'tenant'})?`
      : `Debit ₦${naira(row.amount_kobo).toLocaleString()} from ${row.tenant_name || 'tenant'} via Quasar? This cannot be the same operator who created the case.`,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      const res = await adminApi.approveFinancialDispute(row.id, {
        comment: isRetry ? 'Retry finalize from Refunds & Chargebacks' : 'Approved from Refunds & Chargebacks',
      })
      const data = res?.data || res
      if (data?.waitingQuasar) {
        $q.notify({
          type: 'warning',
          message: data.message || 'Waiting on Quasar confirmation. Case stays Executing until webhook or retry.',
          timeout: 8000,
        })
      } else if (String(data?.status || '').toUpperCase() === 'POSTED') {
        $q.notify({ type: 'positive', message: 'Posted. Quasar debit and local ledger recorded.' })
      } else {
        $q.notify({
          type: 'info',
          message: data?.message || `Case status: ${data?.status || 'updated'}`,
          timeout: 6000,
        })
      }
      await fetchCases()
    } catch (err) {
      $q.notify({
        type: 'negative',
        message: userFacingApiError(err, 'Approval failed. No local ledger was posted.'),
        timeout: 10000,
      })
      await fetchCases()
    }
  })
}

async function rejectCase(row) {
  $q.dialog({
    title: 'Reject case',
    prompt: { model: '', type: 'textarea', label: 'Reason' },
    cancel: true,
    persistent: true,
  }).onOk(async (reason) => {
    try {
      await adminApi.rejectFinancialDispute(row.id, { reason })
      $q.notify({ type: 'info', message: 'Case rejected. No money moved.' })
      await fetchCases()
    } catch (err) {
      $q.notify({ type: 'negative', message: userFacingApiError(err, 'Reject failed.') })
    }
  })
}

async function openAudit(row) {
  selectedCase.value = row
  showAudit.value = true
  try {
    const res = await adminApi.getFinancialDisputeAudit(row.id)
    auditEvents.value = res.data?.data || res.data || []
  } catch (err) {
    auditEvents.value = []
    $q.notify({ type: 'negative', message: userFacingApiError(err, 'Could not load audit trail.') })
  }
}

onMounted(async () => {
  await Promise.all([loadTenants(), fetchCases()])
})
</script>
