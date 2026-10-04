<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-md">
      <div>
        <div class="text-h6">Payment Alerts</div>
        <div class="text-caption text-grey-6">Socket alerts sent to a school tablet when Quasar records a credit. This is not the Institute Webhooks queue.</div>
      </div>
      <q-space />
      <q-btn outline color="cyan-4" label="Refresh" :loading="loading" @click="load" />
    </div>
    <q-table dark flat :rows="rows" :columns="columns" row-key="id" :loading="loading">
      <template #body-cell-amount="props">
        <q-td :props="props">₦{{ Number(props.row.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</q-td>
      </template>
      <template #body-cell-actions="props">
        <q-td :props="props">
          <q-btn dense flat color="teal-3" label="Repush" :loading="repushing === props.row.id" @click="repush(props.row)" />
        </q-td>
      </template>
    </q-table>
  </q-page>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { adminApi } from '../../api'

const $q = useQuasar()
const loading = ref(false)
const repushing = ref('')
const rows = ref([])
const columns = [
  { name: 'createdAt', label: 'Created', field: 'createdAt', align: 'left' },
  { name: 'tenantName', label: 'School', field: 'tenantName', align: 'left' },
  { name: 'sender', label: 'From', field: 'sender', align: 'left' },
  { name: 'accountNumber', label: 'NUBAN', field: 'accountNumber', align: 'left' },
  { name: 'amount', label: 'Amount', field: 'amount', align: 'right' },
  { name: 'status', label: 'Status', field: 'status', align: 'left' },
  { name: 'attempts', label: 'Tries', field: 'attempts', align: 'right' },
  { name: 'actions', label: '', field: 'actions', align: 'right' },
]

async function load() {
  loading.value = true
  try {
    const res = await adminApi.listPaymentAlerts()
    rows.value = res.data?.rows || []
  } catch (e) {
    $q.notify({ type: 'negative', message: e?.response?.data?.error || 'Could not load payment alerts' })
  } finally {
    loading.value = false
  }
}

async function repush(row) {
  repushing.value = row.id
  try {
    await adminApi.repushPaymentAlert(row.id)
    $q.notify({ type: 'positive', message: 'Alert queued. The tablet receives it on the next send.' })
    await load()
  } catch (e) {
    $q.notify({ type: 'negative', message: e?.response?.data?.error || 'Repush failed' })
  } finally {
    repushing.value = ''
  }
}

onMounted(load)
</script>
