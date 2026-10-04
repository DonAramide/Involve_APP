<template>
  <q-page class="q-pa-xl bg-main text-main" style="min-height: 100vh; position: relative; overflow: hidden;">
    <div class="ambient-glow" />
    <div class="relative-position" style="z-index: 10;">
      <div class="row items-center justify-between q-mb-lg">
        <div>
          <div class="text-caption text-grey-5 font-mono q-mb-xs">ADMIN · STAKEHOLDERS</div>
          <h1 class="text-h4 text-weight-bolder text-white q-my-none">Fee Stakeholders</h1>
          <div class="text-caption text-grey-5 q-mt-sm">Balances are derived from assessed payables. Admins cannot edit earned/pending/available/settled amounts.</div>
        </div>
        <div class="row q-gutter-sm">
          <q-btn flat color="grey-4" label="Distribution" to="/admin/platform-fees/distribution" />
          <q-btn outline color="indigo-4" label="Create stakeholder" @click="showCreate = true" />
        </div>
      </div>
      <q-card class="bg-card-dark q-pa-md q-mb-lg">
        <q-input id="filter-agent" dark filled v-model="agentId" label="Agent ID" hint="Leave empty for all Agents" @blur="load" />
      </q-card>
      <q-table
        id="fee-stakeholder-table"
        class="bg-card-dark text-white"
        dark
        flat
        row-key="id"
        :rows="rows"
        :columns="columns"
        :loading="loading"
        @row-click="openRow"
      >
        <template #body-cell-actions="props">
          <q-td :props="props">
            <q-btn flat dense color="indigo-3" label="View" :to="`/admin/platform-fees/stakeholders/${props.row.id}`" />
          </q-td>
        </template>
        <template #no-data>
          <div class="q-pa-lg text-grey-5">No stakeholders found.</div>
        </template>
      </q-table>

      <q-dialog v-model="showCreate">
        <q-card class="bg-card-dark text-white" style="min-width: 420px;">
          <q-card-section>
            <div class="text-h6">Create stakeholder</div>
            <q-select dark filled class="q-mt-md" v-model="form.stakeholder_type" :options="['PLATFORM','PROCESSOR','SERVICE','AGENT']" label="Type" />
            <q-input dark filled class="q-mt-md" v-model="form.display_name" label="Display name" />
            <q-select dark filled class="q-mt-md" v-model="form.status" :options="['ACTIVE','SUSPENDED','INACTIVE']" label="Status" />
          </q-card-section>
          <q-card-actions align="right">
            <q-btn flat label="Cancel" v-close-popup />
            <q-btn unelevated color="indigo-8" label="Create" :loading="saving" @click="create" />
          </q-card-actions>
        </q-card>
      </q-dialog>
    </div>
  </q-page>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { adminApi } from '../../api'

const router = useRouter()
const loading = ref(false)
const saving = ref(false)
const loadError = ref('')
const rows = ref([])
const agentId = ref('')
const showCreate = ref(false)
const form = reactive({ stakeholder_type: 'AGENT', display_name: '', status: 'ACTIVE' })

const columns = [
  { name: 'display_name', label: 'Stakeholder', field: 'display_name', align: 'left' },
  { name: 'agent_id', label: 'Institute', field: (row) => row.agent_id || (row.metadata?.system ? 'GLOBAL' : '—'), align: 'left' },
  { name: 'stakeholder_type', label: 'Type', field: 'stakeholder_type', align: 'left' },
  { name: 'status', label: 'Status', field: 'status', align: 'left' },
  { name: 'earned', label: 'Total Earned', field: (row) => row.earned?.display, align: 'left' },
  { name: 'pending', label: 'Pending', field: (row) => row.pending?.display, align: 'left' },
  { name: 'available', label: 'Available', field: (row) => row.available?.display, align: 'left' },
  { name: 'settled', label: 'Settled', field: (row) => row.settled?.display, align: 'left' },
  { name: 'actions', label: 'Actions', field: 'id', align: 'left' },
]

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const { data } = await adminApi.listFeeStakeholders(agentId.value ? { agentId: agentId.value } : undefined)
    rows.value = data?.data || []
  } catch (e) {
    loadError.value = e?.response?.data?.error || 'Could not load stakeholders'
  } finally {
    loading.value = false
  }
}

async function create() {
  saving.value = true
  try {
    await adminApi.createFeeStakeholder({ ...form, metadata: {} })
    showCreate.value = false
    form.display_name = ''
    await load()
  } catch (e) {
    loadError.value = e?.response?.data?.error || 'Create failed'
  } finally {
    saving.value = false
  }
}

function openRow(_evt, row) {
  router.push(`/admin/platform-fees/stakeholders/${row.id}`)
}

onMounted(load)
</script>
