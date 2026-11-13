<template>
  <q-page class="q-pa-xl bg-main text-main">
    <div class="row items-center justify-between q-mb-lg">
      <div>
        <div class="text-caption text-grey-5 font-mono q-mb-xs">GOVERNANCE</div>
        <h1 class="text-h4 text-weight-bolder text-white q-my-none">Bank Account Verification</h1>
        <div class="text-caption text-grey-5 q-mt-sm">
          Institution and tenant settlement account updates. Matcher never auto-approves. Maker cannot approve their own request.
        </div>
      </div>
      <q-btn outline color="indigo-4" icon="refresh" label="Refresh" :loading="loading" @click="load" />
    </div>

    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-12 col-md-3">
        <q-select dark filled v-model="entityType" :options="entityOptions" label="Entity" emit-value map-options />
      </div>
      <div class="col-12 col-md-3">
        <q-select dark filled v-model="status" :options="statusOptions" label="Status" emit-value map-options />
      </div>
    </div>

    <q-banner v-if="error" class="bg-red-10 text-red-2 q-mb-md" rounded>{{ error }}</q-banner>

    <q-table
      class="bg-card-dark text-white"
      dark
      flat
      row-key="id"
      :rows="rows"
      :columns="columns"
      :loading="loading"
      :rows-per-page-options="[20]"
    >
      <template #body-cell-actions="props">
        <q-td :props="props">
          <q-btn dense flat color="green-4" label="Approve" @click="decide(props.row, 'APPROVE')" />
          <q-btn dense flat color="red-4" label="Reject" @click="reject(props.row)" />
        </q-td>
      </template>
    </q-table>
  </q-page>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { Notify, Dialog } from 'quasar'
import { adminApi } from '../../api'

const loading = ref(false)
const error = ref('')
const rows = ref([])
const entityType = ref(null)
const status = ref('ALL')

const entityOptions = [
  { label: 'All', value: null },
  { label: 'Institutions', value: 'INSTITUTION' },
  { label: 'Tenants', value: 'TENANT' },
]
const statusOptions = [
  { label: 'All', value: 'ALL' },
  { label: 'Pending review', value: 'PENDING_REVIEW' },
  { label: 'Name mismatch', value: 'REQUIRES_MANUAL_REVIEW' },
  { label: 'Name verification', value: 'PENDING_NAME_VERIFICATION' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
]

const columns = [
  { name: 'entityName', label: 'Business / tenant', field: 'entityName', align: 'left' },
  { name: 'entityType', label: 'Entity', field: 'entityType', align: 'left' },
  { name: 'current', label: 'Approved account', field: (row) => accountLabel(row.currentAccount), align: 'left' },
  { name: 'proposed', label: 'Proposed account', field: (row) => accountLabel(row.proposedAccount), align: 'left' },
  { name: 'match', label: 'Name match', field: (row) => `${row.nameMatch?.matchCount || 0} tokens · ${row.status}`, align: 'left' },
  { name: 'requesterEmail', label: 'Requester', field: 'requesterEmail', align: 'left' },
  { name: 'createdAt', label: 'Submitted', field: 'createdAt', align: 'left' },
  { name: 'actions', label: '', field: 'id', align: 'right' },
]

function accountLabel(account) {
  if (!account) return '—'
  return `${account.accountName || '—'} · ${account.bankName || account.bankCode || ''} · ${account.accountNumber || ''}`
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await adminApi.listBankAccountRequests({
      entityType: entityType.value || undefined,
      status: status.value,
    })
    rows.value = data?.data || []
  } catch (e) {
    error.value = e?.response?.data?.error?.message || 'Could not load bank account requests'
  } finally {
    loading.value = false
  }
}

async function decide(row, action, reason) {
  try {
    await adminApi.decideBankAccountRequest(row.id, { action, reason })
    Notify.create({ type: 'positive', message: `Request ${action.toLowerCase()}d` })
    await load()
  } catch (e) {
    Notify.create({ type: 'negative', message: e?.response?.data?.error?.message || 'Decision failed' })
  }
}

function reject(row) {
  Dialog.create({
    title: 'Reject bank account',
    message: 'A rejection reason is required.',
    prompt: { model: '', type: 'text', isValid: (v) => String(v || '').trim().length >= 5 },
    cancel: true,
  }).onOk((reason) => decide(row, 'REJECT', reason))
}

onMounted(load)
</script>

<style scoped>
.bg-card-dark { background: #0b0f19; }
</style>
