<template>
  <q-page class="q-pa-lg bg-main text-main">
    <div class="row items-center justify-between q-mb-lg">
      <div>
        <h1 class="text-h4 text-weight-bold q-ma-none">Pending KYC Documents</h1>
        <div class="text-muted q-mt-xs">
          All CAC certificates and valid ID cards awaiting operator approval.
        </div>
      </div>
      <div class="row items-center q-gutter-sm">
        <q-select
          v-model="statusFilter"
          :options="statusOptions"
          emit-value
          map-options
          dense
          filled
          dark
          style="min-width: 160px"
          @update:model-value="loadRows"
        />
        <q-btn outline color="cyan-4" icon="refresh" label="Refresh" :loading="loading" @click="loadRows" />
      </div>
    </div>

    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-12 col-sm-4">
        <q-card dark bordered class="bg-panel">
          <q-card-section>
            <div class="text-caption text-grey-5">Awaiting approval</div>
            <div class="text-h4 text-amber-4 text-weight-bold">{{ counts.pending }}</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-sm-4">
        <q-card dark bordered class="bg-panel">
          <q-card-section>
            <div class="text-caption text-grey-5">In this list</div>
            <div class="text-h4 text-cyan-3 text-weight-bold">{{ counts.total }}</div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <q-table
      dark
      flat
      :rows="rows"
      :columns="columns"
      row-key="id"
      :loading="loading"
      :pagination="{ rowsPerPage: 20 }"
      class="bg-panel"
    >
      <template #body-cell-url="props">
        <q-td :props="props">
          <q-btn
            v-if="props.row.url"
            flat
            dense
            color="cyan-4"
            icon="launch"
            label="Open file"
            type="a"
            target="_blank"
            :href="props.row.url"
          />
          <span v-else class="text-grey-6">No URL</span>
        </q-td>
      </template>
      <template #body-cell-status="props">
        <q-td :props="props">
          <q-chip dense size="sm" :color="statusColor(props.row.status)" text-color="white">
            {{ props.row.status }}
          </q-chip>
        </q-td>
      </template>
      <template #body-cell-actions="props">
        <q-td :props="props">
          <q-btn
            unelevated
            dense
            color="green-8"
            label="Approve"
            class="q-mr-xs"
            :disable="props.row.status === 'APPROVED'"
            :loading="busyId === props.row.id"
            @click="review(props.row, 'APPROVED')"
          />
          <q-btn
            outline
            dense
            color="red-4"
            label="Reject"
            class="q-mr-xs"
            :disable="props.row.status === 'REJECTED'"
            :loading="busyId === props.row.id"
            @click="review(props.row, 'REJECTED')"
          />
          <q-btn
            flat
            dense
            color="grey-4"
            icon="open_in_new"
            :to="`/tenants/${props.row.tenantId}`"
          />
        </q-td>
      </template>
      <template #no-data>
        <div class="full-width text-center q-pa-lg text-grey-5">
          No documents in this filter.
        </div>
      </template>
    </q-table>
  </q-page>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { Notify } from 'quasar'
import { adminApi } from '../../api'

const loading = ref(false)
const busyId = ref('')
const rows = ref([])
const counts = ref({ pending: 0, total: 0 })
const statusFilter = ref('PENDING')
const statusOptions = [
  { label: 'Pending only', value: 'PENDING' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'All', value: 'ALL' },
]

const columns = [
  { name: 'tenantName', label: 'Tenant', field: 'tenantName', align: 'left', sortable: true },
  { name: 'documentLabel', label: 'Document', field: 'documentLabel', align: 'left' },
  { name: 'status', label: 'Status', field: 'status', align: 'center' },
  { name: 'createdAt', label: 'Submitted', field: (row) => row.createdAt ? new Date(row.createdAt).toLocaleString() : '—', align: 'left' },
  { name: 'url', label: 'File', field: 'url', align: 'left' },
  { name: 'actions', label: 'Review', field: 'id', align: 'right' },
]

function statusColor(status) {
  const s = String(status || '').toUpperCase()
  if (s === 'APPROVED') return 'green-9'
  if (s === 'REJECTED') return 'red-9'
  return 'orange-9'
}

async function loadRows() {
  loading.value = true
  try {
    const { data } = await adminApi.listPendingKycDocuments({ status: statusFilter.value })
    rows.value = data?.data || []
    counts.value = data?.counts || { pending: 0, total: rows.value.length }
  } catch (e) {
    Notify.create({ type: 'negative', message: e?.response?.data?.message || 'Could not load pending documents' })
  } finally {
    loading.value = false
  }
}

async function review(row, status) {
  busyId.value = row.id
  try {
    await adminApi.reviewKycDocument(row.id, { status })
    Notify.create({ type: 'positive', message: `${row.documentLabel} ${status.toLowerCase()} for ${row.tenantName}` })
    await loadRows()
  } catch (e) {
    Notify.create({ type: 'negative', message: e?.response?.data?.message || 'Review failed' })
  } finally {
    busyId.value = ''
  }
}

onMounted(loadRows)
</script>
