<template>
  <q-page class="q-pa-md bg-main text-main">
    <q-btn flat dense color="teal-3" icon="arrow_back" label="Back" no-caps to="/institute/dashboard" />
    <div class="text-caption text-grey-5 font-mono q-mt-md">FINANCE</div>
    <h1 class="text-h5 text-weight-bolder text-white q-my-none">HMO Earnings</h1>
    <div class="text-caption text-grey-5 q-mb-md">Ledger-backed only. Posting is blocked until fee ownership is approved.</div>

    <div class="row q-col-gutter-md q-mb-md">
      <div v-for="card in cards" :key="card.label" class="col-12 col-sm-6 col-md-4">
        <q-card flat bordered class="bg-panel q-pa-md">
          <div class="text-caption text-muted">{{ card.label }}</div>
          <div class="text-h6">{{ naira(card.value) }}</div>
        </q-card>
      </div>
    </div>
    <div class="text-caption text-amber-4 q-mb-md">{{ note }}</div>
    <q-table dark flat class="bg-panel text-white" :rows="transactions" :columns="columns" row-key="ledger_id" />
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { adminApi } from '../../api'

const totals = ref({})
const transactions = ref([])
const note = ref('')

const cards = computed(() => [
  { label: 'Total HMO earnings', value: totals.value.total_earnings_kobo },
  { label: 'Pending earnings', value: totals.value.pending_earnings_kobo },
  { label: 'Available withdrawal', value: totals.value.available_withdrawal_kobo },
  { label: 'Total withdrawn', value: totals.value.total_withdrawn_kobo },
  { label: 'Failed withdrawals', value: totals.value.failed_withdrawals_kobo },
  { label: 'Outstanding settlements', value: totals.value.outstanding_settlements_kobo },
])

const columns = [
  { name: 'reference', label: 'Reference', field: 'reference', align: 'left' },
  { name: 'tenant_id', label: 'Tenant', field: 'tenant_id', align: 'left' },
  { name: 'amount_kobo', label: 'Institution share', field: (row) => naira(row.amount_kobo), align: 'left' },
  { name: 'platform_fee_kobo', label: 'Platform fee', field: (row) => naira(row.platform_fee_kobo), align: 'left' },
  { name: 'status', label: 'Settlement', field: 'status', align: 'left' },
  { name: 'created_at', label: 'Date', field: 'created_at', align: 'left' },
]

function naira(kobo) {
  return '₦' + (Number(kobo || 0) / 100).toFixed(2)
}

onMounted(async () => {
  const { data } = await adminApi.listInstitutionHmoEarnings()
  totals.value = data?.data?.totals || {}
  transactions.value = data?.data?.transactions || []
  note.value = data?.data?.note || ''
})
</script>

<style scoped>
.bg-main { background-color: #0b0f12; }
.bg-panel { background-color: #12181c; }
.text-muted { color: #868e96; }
</style>
