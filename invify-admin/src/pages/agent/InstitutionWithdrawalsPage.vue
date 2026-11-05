<template>
  <q-page class="q-pa-md bg-main text-main">
    <q-btn flat dense color="teal-3" icon="arrow_back" label="Back" no-caps to="/institute/dashboard" />
    <div class="text-caption text-grey-5 font-mono q-mt-md">FINANCE</div>
    <h1 class="text-h5 text-weight-bolder text-white q-my-none">Withdrawals</h1>
    <q-banner class="bg-amber-10 text-amber-2 q-my-md" rounded>
      Real-money payouts are disabled. Requests are recorded and reserved in the control plane only. Live payout execution will not run.
    </q-banner>
    <div class="text-caption q-mb-md">Available (ledger) {{ naira(available) }} · Reserved {{ naira(reserved) }}</div>

    <q-form class="row q-col-gutter-md items-end q-mb-md" @submit.prevent="submit">
      <div class="col-12 col-sm-4">
        <q-input dark filled v-model.number="amountNaira" type="number" min="1" label="Amount (₦)" />
      </div>
      <div class="col-12 col-sm-3">
        <q-btn type="submit" color="teal-7" label="Submit request" :loading="busy" unelevated />
      </div>
    </q-form>

    <q-table dark flat class="bg-panel text-white" :rows="rows" :columns="columns" row-key="id" />
  </q-page>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { Notify } from 'quasar'
import { adminApi } from '../../api'

const available = ref(0)
const reserved = ref(0)
const rows = ref([])
const amountNaira = ref(null)
const busy = ref(false)

const columns = [
  { name: 'id', label: 'Reference', field: 'id', align: 'left' },
  { name: 'amountKobo', label: 'Amount', field: (row) => naira(row.amountKobo), align: 'left' },
  { name: 'status', label: 'Status', field: 'status', align: 'left' },
  { name: 'bankAccountMasked', label: 'Account', field: 'bankAccountMasked', align: 'left' },
  { name: 'createdAt', label: 'Submitted', field: 'createdAt', align: 'left' },
]

function naira(kobo) {
  return '₦' + (Number(kobo || 0) / 100).toFixed(2)
}

async function load() {
  const { data } = await adminApi.listInstitutionWithdrawals()
  available.value = data?.data?.available_kobo || 0
  reserved.value = data?.data?.reserved_kobo || 0
  rows.value = data?.data?.withdrawals || []
}

async function submit() {
  busy.value = true
  try {
    await adminApi.createInstitutionWithdrawal({ amountKobo: Math.round(Number(amountNaira.value) * 100) })
    Notify.create({ type: 'info', message: 'Request recorded. Live payout was not executed.' })
    await load()
  } catch (e) {
    Notify.create({ type: 'negative', message: e?.response?.data?.error?.message || 'Withdrawal was not accepted' })
  } finally {
    busy.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.bg-main { background-color: #0b0f12; }
.bg-panel { background-color: #12181c; }
</style>
