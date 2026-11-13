<template>
  <q-page class="q-pa-xl bg-main text-main">
    <div class="text-caption text-grey-5 font-mono q-mb-xs">FINANCE &amp; AUDIT</div>
    <h1 class="text-h4 text-weight-bolder text-white q-my-none">HMO Financial Reconciliation</h1>
    <div class="text-caption text-grey-5 q-my-sm">Ledger-backed HMO_SERVICE totals. No hardcoded figures.</div>

    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-12 col-md-3"><q-input dark filled v-model="from" type="date" label="From" /></div>
      <div class="col-12 col-md-3"><q-input dark filled v-model="to" type="date" label="To" /></div>
      <div class="col-12 col-md-3"><q-input dark filled v-model="tenantId" label="Tenant ID" /></div>
      <div class="col-12 col-md-3"><q-btn color="indigo-6" label="Run" unelevated :loading="loading" @click="load" /></div>
    </div>

    <div class="row q-col-gutter-md q-mb-md">
      <div v-for="card in cards" :key="card.label" class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="bg-card-dark q-pa-md">
          <div class="text-caption text-grey-5">{{ card.label }}</div>
          <div class="text-h6 text-white">{{ naira(card.value) }}</div>
        </q-card>
      </div>
    </div>
    <div class="text-caption text-amber-4">{{ note }}</div>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { adminApi } from '../../api'

const loading = ref(false)
const from = ref('')
const to = ref('')
const tenantId = ref('')
const report = ref({})
const note = ref('')

const cards = computed(() => [
  { label: 'Gross HMO volume', value: report.value.gross_hmo_volume_kobo },
  { label: 'HMO service fees', value: report.value.total_hmo_service_fees_kobo },
  { label: 'Platform revenue', value: report.value.platform_revenue_kobo },
  { label: 'Institution payable', value: report.value.institution_payable_kobo },
  { label: 'Institution withdrawals', value: report.value.institution_withdrawals_kobo },
  { label: 'Outstanding liabilities', value: report.value.outstanding_institution_liabilities_kobo },
  { label: 'Reversed HMO transactions', value: report.value.reversed_hmo_transactions_kobo },
  { label: 'Failed HMO debits', value: report.value.failed_hmo_debits },
])

function naira(kobo) {
  return '₦' + (Number(kobo || 0) / 100).toFixed(2)
}

async function load() {
  loading.value = true
  try {
    const { data } = await adminApi.getHmoFinanceReport({ from: from.value || undefined, to: to.value || undefined, tenantId: tenantId.value || undefined })
    report.value = data?.data || {}
    note.value = data?.data?.note || ''
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.bg-card-dark { background: #0b0f19; }
</style>
