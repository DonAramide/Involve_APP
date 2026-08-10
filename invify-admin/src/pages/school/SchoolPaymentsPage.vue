<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-md">
      <div>
        <div class="text-h5 text-weight-bold">
          {{ isPlatform ? 'School Payments (Platform)' : 'School Payments' }}
        </div>
        <div class="text-caption text-grey-7">
          {{
            isPlatform
              ? 'Cross-tenant Cash / POS payments and disputes from school apps'
              : 'Cash / POS student payments and disputes synced from the school app'
          }}
        </div>
      </div>
      <q-space />
      <q-btn
        color="primary"
        icon="refresh"
        label="Refresh"
        :loading="loading"
        @click="fetchAll"
      />
    </div>

    <div v-if="isPlatform" class="row q-gutter-sm q-mb-md items-center">
      <q-select
        v-model="selectedTenantId"
        dense
        outlined
        clearable
        emit-value
        map-options
        style="min-width: 260px"
        :options="tenantOptions"
        label="Filter school / tenant"
        @update:model-value="fetchAll"
      />
    </div>

    <q-tabs
      v-model="tab"
      dense
      class="text-primary q-mb-sm"
      active-color="primary"
      indicator-color="primary"
      align="left"
    >
      <q-tab name="payments" icon="payments" label="Payments" />
      <q-tab name="disputes" icon="gavel" label="Disputes" />
    </q-tabs>

    <q-tab-panels v-model="tab" animated>
      <q-tab-panel name="payments" class="q-pa-none">
        <q-card flat bordered>
          <q-table
            flat
            bordered
            row-key="id"
            :rows="payments"
            :columns="paymentColumns"
            :loading="loading"
            :pagination="{ rowsPerPage: 20 }"
          >
            <template #body-cell-amount="props">
              <q-td :props="props.col">
                ₦{{ Number(props.row.amount || 0).toLocaleString() }}
              </q-td>
            </template>
            <template #body-cell-balance="props">
              <q-td :props="props.col">
                <div class="text-caption">
                  Before: ₦{{ Number(props.row.balance_before || 0).toLocaleString() }}
                  / Credit ₦{{ Number(props.row.credit_before || 0).toLocaleString() }}
                </div>
                <div class="text-caption text-weight-medium">
                  After: ₦{{ Number(props.row.balance_after || 0).toLocaleString() }}
                  / Credit ₦{{ Number(props.row.credit_after || 0).toLocaleString() }}
                </div>
              </q-td>
            </template>
          </q-table>
        </q-card>
      </q-tab-panel>

      <q-tab-panel name="disputes" class="q-pa-none">
        <div class="row q-gutter-sm q-mb-sm items-center">
          <q-select
            v-model="disputeStatus"
            dense
            outlined
            emit-value
            map-options
            style="min-width: 180px"
            :options="statusOptions"
            label="Status"
            @update:model-value="fetchDisputes"
          />
        </div>
        <q-card flat bordered>
          <q-table
            flat
            bordered
            row-key="id"
            :rows="disputes"
            :columns="disputeColumns"
            :loading="loading"
            :pagination="{ rowsPerPage: 20 }"
          >
            <template #body-cell-amount="props">
              <q-td :props="props.col">
                ₦{{ Number(props.row.amount || 0).toLocaleString() }}
              </q-td>
            </template>
            <template #body-cell-status="props">
              <q-td :props="props.col">
                <q-badge
                  :color="statusColor(props.row.status)"
                  :label="props.row.status || 'OPEN'"
                />
              </q-td>
            </template>
            <template #body-cell-actions="props">
              <q-td :props="props.col">
                <q-btn
                  dense
                  flat
                  color="primary"
                  label="Update"
                  @click="openUpdateDispute(props.row)"
                />
              </q-td>
            </template>
          </q-table>
        </q-card>
      </q-tab-panel>
    </q-tab-panels>

    <q-dialog v-model="showUpdate">
      <q-card style="min-width: 360px">
        <q-card-section class="text-h6">Update Dispute</q-card-section>
        <q-card-section>
          <div class="text-caption q-mb-sm">
            <span v-if="selectedDispute?.tenant_name">{{ selectedDispute.tenant_name }} · </span>
            {{ selectedDispute?.local_invoice_number }} — {{ selectedDispute?.student_name }}
          </div>
          <q-select
            v-model="updateForm.status"
            dense
            outlined
            emit-value
            map-options
            class="q-mb-md"
            :options="statusOptions.filter((o) => o.value !== 'ALL')"
            label="Status"
          />
          <q-input
            v-model="updateForm.resolutionNotes"
            dense
            outlined
            type="textarea"
            label="Resolution notes"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn color="primary" label="Save" :loading="saving" @click="saveDispute" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import { schoolApi, adminApi } from 'src/api'

const $q = useQuasar()
const route = useRoute()

const isPlatform = computed(
  () =>
    route.meta?.platformScope === true ||
    String(route.path || '').includes('/finance/school-payments') ||
    String(route.path || '').includes('/admin/school-payments'),
)

const tab = ref(route.query.tab === 'disputes' ? 'disputes' : 'payments')
const loading = ref(false)
const saving = ref(false)
const payments = ref([])
const disputes = ref([])
const disputeStatus = ref('ALL')
const showUpdate = ref(false)
const selectedDispute = ref(null)
const updateForm = ref({ status: 'INVESTIGATING', resolutionNotes: '' })
const selectedTenantId = ref(null)
const tenantOptions = ref([])

const statusOptions = [
  { label: 'All', value: 'ALL' },
  { label: 'Open', value: 'OPEN' },
  { label: 'Investigating', value: 'INVESTIGATING' },
  { label: 'Resolved', value: 'RESOLVED' },
  { label: 'Rejected', value: 'REJECTED' },
]

const paymentColumns = computed(() => {
  const cols = [
    { name: 'paid_at', label: 'Date', field: (r) => formatDate(r.paid_at), align: 'left', sortable: true },
    { name: 'local_invoice_number', label: 'Receipt', field: 'local_invoice_number', align: 'left' },
    { name: 'student_name', label: 'Student', field: 'student_name', align: 'left' },
    { name: 'admission_number', label: 'Admission', field: 'admission_number', align: 'left' },
    { name: 'payment_method', label: 'Method', field: 'payment_method', align: 'left' },
    { name: 'amount', label: 'Amount', field: 'amount', align: 'right' },
    { name: 'balance', label: 'Balance Impact', field: 'balance_before', align: 'left' },
    { name: 'payment_status', label: 'Status', field: 'payment_status', align: 'left' },
  ]
  if (isPlatform.value) {
    cols.splice(1, 0, {
      name: 'tenant_name',
      label: 'School / Tenant',
      field: (r) => r.tenant_name || r.tenant_id || '—',
      align: 'left',
    })
  }
  return cols
})

const disputeColumns = computed(() => {
  const cols = [
    { name: 'created_at', label: 'Raised', field: (r) => formatDate(r.created_at), align: 'left', sortable: true },
    { name: 'local_invoice_number', label: 'Receipt', field: 'local_invoice_number', align: 'left' },
    { name: 'student_name', label: 'Student', field: 'student_name', align: 'left' },
    { name: 'reason', label: 'Reason', field: 'reason', align: 'left' },
    { name: 'amount', label: 'Amount', field: 'amount', align: 'right' },
    { name: 'status', label: 'Status', field: 'status', align: 'left' },
    { name: 'actions', label: 'Actions', field: 'id', align: 'right' },
  ]
  if (isPlatform.value) {
    cols.splice(1, 0, {
      name: 'tenant_name',
      label: 'School / Tenant',
      field: (r) => r.tenant_name || r.tenant_id || '—',
      align: 'left',
    })
  }
  return cols
})

function listParams(extra = {}) {
  const params = { ...extra }
  if (isPlatform.value) {
    params.allTenants = '1'
    if (selectedTenantId.value) params.tenantId = selectedTenantId.value
  }
  return params
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
  switch (String(status || '').toUpperCase()) {
    case 'RESOLVED':
      return 'positive'
    case 'REJECTED':
      return 'negative'
    case 'INVESTIGATING':
      return 'warning'
    default:
      return 'orange'
  }
}

async function loadTenants() {
  if (!isPlatform.value) return
  try {
    const { data } = await adminApi.getTenants({ limit: 200 })
    const list = data?.data || data || []
    tenantOptions.value = list.map((t) => ({
      label: t.business_name || t.name || t.id,
      value: t.id,
    }))
  } catch (e) {
    console.warn('Failed to load tenants for filter', e)
  }
}

async function fetchPayments() {
  const { data } = await schoolApi.getPayments({ params: listParams() })
  payments.value = data?.payments || data || []
}

async function fetchDisputes() {
  const { data } = await schoolApi.getPaymentDisputes({
    params: listParams({ status: disputeStatus.value }),
  })
  disputes.value = data?.disputes || data || []
}

async function fetchAll() {
  loading.value = true
  try {
    await Promise.all([fetchPayments(), fetchDisputes()])
  } catch (e) {
    console.error(e)
    $q.notify({ type: 'negative', message: 'Failed to load school payments / disputes' })
  } finally {
    loading.value = false
  }
}

function openUpdateDispute(row) {
  selectedDispute.value = row
  updateForm.value = {
    status: row.status || 'OPEN',
    resolutionNotes: row.resolution_notes || '',
  }
  showUpdate.value = true
}

async function saveDispute() {
  if (!selectedDispute.value?.id) return
  saving.value = true
  try {
    await schoolApi.updatePaymentDispute(selectedDispute.value.id, {
      status: updateForm.value.status,
      resolutionNotes: updateForm.value.resolutionNotes,
    })
    showUpdate.value = false
    $q.notify({ type: 'positive', message: 'Dispute updated' })
    await fetchDisputes()
  } catch (e) {
    console.error(e)
    $q.notify({ type: 'negative', message: 'Failed to update dispute' })
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await loadTenants()
  await fetchAll()
})
</script>
