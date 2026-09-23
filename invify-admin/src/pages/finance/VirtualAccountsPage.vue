<template>
  <q-page class="q-pa-md bg-main text-main column full-height no-wrap">
    <div class="row items-center justify-between q-mb-md no-wrap border-bottom q-pb-sm">
      <div>
        <div class="text-operator-title text-muted">NUBAN Inventory</div>
        <div class="text-h6 text-main text-weight-bold" style="line-height: 1.2;">
          Virtual Accounts
        </div>
      </div>
      <div class="row items-center op-gap-8">
        <q-input
          v-model="search"
          dense
          outlined
          dark
          clearable
          placeholder="Search tenant, holder, NUBAN…"
          class="bg-panel"
          style="min-width: 260px"
        >
          <template #prepend>
            <q-icon name="search" />
          </template>
        </q-input>
        <q-btn
          outline
          size="xs"
          color="grey-6"
          icon="refresh"
          label="Refresh"
          class="text-caption text-weight-bold"
          :loading="loading"
          @click="loadRows"
        />
      </div>
    </div>

    <div class="row q-col-gutter-sm q-mb-md">
      <div class="col-12 col-sm-6 col-md-3">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-cyan-left">
          <div class="text-operator-title text-muted">Accounts</div>
          <div class="text-h5 text-metric-mono text-cyan-4">{{ filteredRows.length }}</div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <div class="enterprise-panel op-pa-8 full-height column justify-between bg-panel border-green-left">
          <div class="text-operator-title text-muted">Pending Balance</div>
          <div class="text-h5 text-metric-mono text-green-4">₦{{ formatMoney(pendingTotal) }}</div>
        </div>
      </div>
    </div>

    <div class="enterprise-panel bg-panel col column no-wrap">
      <q-table
        flat
        dense
        dark
        class="bg-transparent text-main col"
        :rows="filteredRows"
        :columns="columns"
        row-key="id"
        :loading="loading"
        :pagination="{ rowsPerPage: 25 }"
      >
        <template #body-cell-balance="props">
          <q-td :props="props" class="text-metric-mono">
            ₦{{ formatMoney(props.row.balance) }}
          </q-td>
        </template>
        <template #body-cell-actions="props">
          <q-td :props="props">
            <q-btn
              flat
              dense
              size="xs"
              color="cyan-4"
              label="Txns"
              :loading="txnLoading === props.row.accountNumber"
              @click="openTransactions(props.row)"
            />
          </q-td>
        </template>
        <template #no-data>
          <div class="full-width row flex-center text-muted q-pa-lg text-caption">
            {{ loading ? 'Loading virtual accounts…' : 'No virtual accounts found.' }}
          </div>
        </template>
      </q-table>
    </div>

    <q-dialog v-model="txnOpen">
      <q-card class="bg-subpanel text-main border-main" style="min-width: 520px; max-width: 720px;">
        <q-card-section class="row items-center justify-between border-bottom">
          <div>
            <div class="text-weight-bold">VA Transactions</div>
            <div class="text-caption text-muted text-metric-mono">{{ selectedAccount?.accountNumber }}</div>
          </div>
          <q-btn flat dense round icon="close" v-close-popup />
        </q-card-section>
        <q-card-section style="max-height: 420px; overflow: auto;">
          <q-list dense separator dark v-if="transactions.length">
            <q-item v-for="(txn, idx) in transactions" :key="txn.reference || idx">
              <q-item-section>
                <q-item-label class="text-metric-mono">{{ txn.reference || '—' }}</q-item-label>
                <q-item-label caption>{{ txn.type || '—' }} · {{ txn.status || '—' }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <div class="text-metric-mono">₦{{ formatMoney(txn.amount) }}</div>
                <div class="text-caption text-muted">{{ formatDate(txn.created_at || txn.createdAt) }}</div>
              </q-item-section>
            </q-item>
          </q-list>
          <div v-else class="text-caption text-muted q-pa-md">No transactions for this account.</div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { adminApi } from '../../api'
import { userFacingApiError } from '../../utils/userFacingApiError'

const $q = useQuasar()
const loading = ref(false)
const rows = ref([])
const search = ref('')
const txnOpen = ref(false)
const txnLoading = ref('')
const selectedAccount = ref(null)
const transactions = ref([])

const columns = [
  { name: 'tenantName', label: 'Tenant', field: 'tenantName', align: 'left', sortable: true },
  { name: 'holderType', label: 'Holder Type', field: 'holderType', align: 'left' },
  { name: 'holderName', label: 'Holder', field: 'holderName', align: 'left', sortable: true },
  { name: 'accountNumber', label: 'NUBAN', field: 'accountNumber', align: 'left', sortable: true },
  { name: 'bankName', label: 'Bank', field: 'bankName', align: 'left' },
  { name: 'status', label: 'Status', field: 'status', align: 'center' },
  { name: 'balance', label: 'Pending Bal.', field: 'balance', align: 'right', sortable: true },
  { name: 'actions', label: '', field: 'actions', align: 'right' },
]

const filteredRows = computed(() => {
  const q = String(search.value || '').trim().toLowerCase()
  if (!q) return rows.value
  return rows.value.filter((r) =>
    [r.tenantName, r.holderName, r.accountNumber, r.holderType, r.bankName]
      .map((v) => String(v || '').toLowerCase())
      .some((v) => v.includes(q)),
  )
})

const pendingTotal = computed(() =>
  filteredRows.value.reduce((sum, row) => sum + Number(row.balance || 0), 0),
)

function formatMoney(value) {
  return Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString()
  } catch {
    return String(value)
  }
}

async function loadRows() {
  loading.value = true
  try {
    const res = await adminApi.getVirtualAccounts()
    const payload = res?.data || {}
    rows.value = Array.isArray(payload.rows) ? payload.rows : (Array.isArray(payload) ? payload : [])
  } catch (err) {
    $q.notify({ type: 'negative', message: userFacingApiError(err, 'Failed to load virtual accounts') })
  } finally {
    loading.value = false
  }
}

async function openTransactions(row) {
  selectedAccount.value = row
  transactions.value = []
  txnOpen.value = true
  txnLoading.value = row.accountNumber
  try {
    const res = await adminApi.getVirtualAccountTransactions(row.accountNumber)
    const payload = res?.data || {}
    transactions.value = Array.isArray(payload.rows)
      ? payload.rows
      : (Array.isArray(payload.transactions) ? payload.transactions : (Array.isArray(payload) ? payload : []))
  } catch (err) {
    $q.notify({ type: 'negative', message: userFacingApiError(err, 'Failed to load VA transactions') })
  } finally {
    txnLoading.value = ''
  }
}

onMounted(loadRows)
</script>
