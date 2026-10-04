<template>
  <q-page class="q-pa-xl bg-main text-main" style="min-height: 100vh; position: relative; overflow: hidden;">
    <div class="ambient-glow" />
    <div class="relative-position" style="z-index: 10;">
      <div class="row items-center q-gutter-sm q-mb-lg">
        <q-btn flat color="grey-4" icon="arrow_back" label="Stakeholders" to="/admin/platform-fees/stakeholders" />
      </div>
      <q-banner v-if="loadError" class="bg-red-10 text-red-2 q-mb-md" rounded>{{ loadError }}</q-banner>
      <div v-if="row">
        <div class="text-caption text-grey-5 font-mono">{{ row.stakeholder_type }} · {{ row.status }}</div>
        <h1 class="text-h4 text-white q-mt-sm">{{ row.display_name }}</h1>
        <div class="text-caption text-grey-5 q-mb-lg">
          {{ row.label }} · Historical assessment values are immutable. Click a row for tenant, assessed fee, and split formula.
        </div>
        <div class="row q-col-gutter-md q-mb-lg">
          <div class="col-12 col-md-3" v-for="card in cards" :key="card.label">
            <q-card class="bg-card-dark q-pa-md">
              <div class="text-caption text-grey-5">{{ card.label }}</div>
              <div class="text-h6 text-white font-mono">{{ card.value }}</div>
            </q-card>
          </div>
        </div>
        <q-table
          id="stakeholder-payable-history"
          dark
          flat
          class="bg-card-dark text-white cursor-pointer"
          row-key="id"
          :rows="row.history || []"
          :columns="columns"
          @row-click="openAssessment"
        >
          <template #no-data>
            <div class="q-pa-lg text-grey-5">No payable history.</div>
          </template>
        </q-table>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { adminApi } from '../../api'

const route = useRoute()
const router = useRouter()
const loadError = ref('')
const row = ref(null)

const cards = computed(() => {
  const r = row.value || {}
  return [
    { label: 'Total earned (assessed)', value: r.earned?.display || '₦0.00' },
    { label: 'Pending', value: r.pending?.display || '₦0.00' },
    { label: 'Available', value: r.available?.display || '₦0.00' },
    { label: 'Settled', value: r.settled?.display || '₦0.00' },
    { label: 'Assessment count', value: String(r.assessment_count || 0) },
  ]
})

const columns = [
  { name: 'created_at', label: 'Date', field: 'created_at', align: 'left' },
  { name: 'tenant_name', label: 'Tenant', field: (r) => r.tenant_name || r.tenant_id || '—', align: 'left' },
  { name: 'assessment_id', label: 'Assessment', field: 'assessment_id', align: 'left' },
  { name: 'transaction_type', label: 'Transaction Type', field: 'transaction_type', align: 'left' },
  { name: 'amount', label: 'Amount', field: (r) => r.amount?.display, align: 'left' },
  { name: 'component', label: 'Component', field: 'component', align: 'left' },
  { name: 'status', label: 'Status', field: 'status', align: 'left' },
  { name: 'settlement_id', label: 'Settlement', field: (r) => r.settlement_id || '—', align: 'left' },
]

async function load() {
  loadError.value = ''
  try {
    const { data } = await adminApi.getFeeStakeholder(String(route.params.stakeholderId || ''))
    row.value = data?.data || null
  } catch (e) {
    loadError.value = e?.response?.data?.error || 'Could not load stakeholder'
  }
}

function openAssessment(_evt, historyRow) {
  if (!historyRow?.assessment_id) return
  router.push({
    path: `/admin/platform-fees/assessments/${historyRow.assessment_id}`,
    query: {
      from: 'stakeholder',
      stakeholderId: String(route.params.stakeholderId || ''),
    },
  })
}

watch(() => route.params.stakeholderId, load)
onMounted(load)
</script>
