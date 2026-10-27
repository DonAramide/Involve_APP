<template>
  <q-page class="q-pa-xl bg-main text-main" style="min-height: 100vh; position: relative; overflow: hidden;">
    <div class="ambient-glow" />
    <div class="relative-position" style="z-index: 10;">
      <div class="row items-center justify-between q-mb-lg">
        <div>
          <div class="text-caption text-grey-5 font-mono q-mb-xs">ADMIN · WITHDRAWAL READINESS</div>
          <h1 class="text-h4 text-weight-bolder text-white q-my-none">Fee Withdrawals</h1>
          <div class="text-caption text-grey-5 q-mt-sm">
            CONTROL_PLANE_ONLY. Requests do not call a payout provider, debit USER_WALLET, or complete a bank transfer.
          </div>
        </div>
        <q-btn flat color="grey-4" label="Distribution" to="/admin/platform-fees/distribution" />
      </div>
      <q-banner v-if="loadError" class="bg-red-10 text-red-2 q-mb-md" rounded>{{ loadError }}</q-banner>
      <q-table
        id="fee-withdrawal-table"
        class="bg-card-dark text-white"
        dark
        flat
        row-key="id"
        :rows="rows"
        :columns="columns"
        :loading="loading"
        @row-click="openRow"
      >
        <template #no-data>
          <div class="q-pa-lg text-grey-5">No withdrawal requests. Shadow assessed payables remain PENDING and are not withdrawable cash.</div>
        </template>
      </q-table>
    </div>
  </q-page>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { adminApi } from '../../api'

const router = useRouter()
const loading = ref(false)
const loadError = ref('')
const rows = ref([])

const columns = [
  { name: 'id', label: 'Request ID', field: 'id', align: 'left' },
  { name: 'stakeholder_name', label: 'Stakeholder', field: 'stakeholder_name', align: 'left' },
  { name: 'amount', label: 'Amount', field: (row) => row.amount?.display, align: 'left' },
  { name: 'status', label: 'Status', field: 'status', align: 'left' },
  { name: 'created_at', label: 'Requested At', field: 'created_at', align: 'left' },
  { name: 'approved_at', label: 'Approved At', field: (row) => row.approved_at || '—', align: 'left' },
  { name: 'completed_at', label: 'Completed At', field: () => '—', align: 'left' },
  { name: 'client_request_id', label: 'Reference', field: 'client_request_id', align: 'left' },
]

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const { data } = await adminApi.listFeeWithdrawals()
    rows.value = data?.data || []
  } catch (e) {
    loadError.value = e?.response?.data?.error || 'Could not load withdrawals'
  } finally {
    loading.value = false
  }
}

function openRow(_evt, row) {
  router.push(`/admin/platform-fees/withdrawals/${row.id}`)
}

onMounted(load)
</script>
