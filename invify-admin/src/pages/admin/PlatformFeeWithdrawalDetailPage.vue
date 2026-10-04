<template>
  <q-page class="q-pa-xl bg-main text-main" style="min-height: 100vh; position: relative; overflow: hidden;">
    <div class="ambient-glow" />
    <div class="relative-position" style="z-index: 10;">
      <q-btn flat color="grey-4" icon="arrow_back" label="Withdrawals" to="/admin/platform-fees/withdrawals" class="q-mb-lg" />
      <q-banner v-if="loadError" class="bg-red-10 text-red-2 q-mb-md" rounded>{{ loadError }}</q-banner>
      <div v-if="row">
        <div class="text-caption text-grey-5 font-mono">{{ row.status }} · payout_executed={{ row.payout_executed }}</div>
        <h1 class="text-h5 text-white q-mt-sm">Withdrawal {{ row.id }}</h1>
        <div class="q-mt-md text-grey-4">
          Stakeholder: {{ row.stakeholder?.display_name || row.stakeholder_id }}<br />
          Requested amount: {{ row.amount?.display }}<br />
          Available balance at request: {{ row.available_at_request?.display }}<br />
          Reference: {{ row.client_request_id }}<br />
          Control plane only: {{ row.control_plane_only }}
        </div>
        <div class="text-subtitle1 text-white q-mt-lg q-mb-sm">Audit trail</div>
        <q-table dark flat class="bg-card-dark text-white" row-key="id" :rows="row.audit_trail || []" :columns="eventColumns">
          <template #no-data>
            <div class="q-pa-md text-grey-5">No audit events yet.</div>
          </template>
        </q-table>
        <div class="row q-gutter-sm q-mt-lg" v-if="row.status === 'REQUESTED'">
          <q-btn unelevated color="indigo-8" label="Approve (no payout)" @click="approve" />
          <q-btn outline color="red-4" label="Reject" @click="reject" />
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { adminApi } from '../../api'

const route = useRoute()
const loadError = ref('')
const row = ref(null)

const eventColumns = [
  { name: 'created_at', label: 'Time', field: 'created_at', align: 'left' },
  { name: 'event_type', label: 'Event', field: 'event_type', align: 'left' },
  { name: 'actor_email', label: 'Actor', field: 'actor_email', align: 'left' },
]

async function load() {
  loadError.value = ''
  try {
    const { data } = await adminApi.getFeeWithdrawal(String(route.params.withdrawalId || ''))
    row.value = data?.data || null
  } catch (e) {
    loadError.value = e?.response?.data?.error || 'Could not load withdrawal'
  }
}

async function approve() {
  try {
    await adminApi.approveFeeWithdrawal(String(route.params.withdrawalId || ''))
    await load()
  } catch (e) {
    loadError.value = e?.response?.data?.error || 'Approve failed'
  }
}

async function reject() {
  try {
    await adminApi.rejectFeeWithdrawal(String(route.params.withdrawalId || ''), { reason: 'Rejected by admin' })
    await load()
  } catch (e) {
    loadError.value = e?.response?.data?.error || 'Reject failed'
  }
}

watch(() => route.params.withdrawalId, load)
onMounted(load)
</script>
