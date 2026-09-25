<template>
  <q-page padding class="q-pa-lg text-main">
    <div class="row items-center justify-between q-mb-lg">
      <div>
        <div class="text-h5 text-weight-bold q-mb-xs">Production environment</div>
        <div class="text-caption text-grey-5">
          Reads <span class="text-amber-4">{{ snapshot.filePath || '/etc/invify/invify-production.env' }}</span>.
          Maker proposes, checker applies. Restricted to your governor account.
        </div>
      </div>
      <q-btn outline color="cyan-4" icon="refresh" label="Reload" @click="load" />
    </div>

    <q-banner v-if="error" class="bg-red-10 text-red-2 q-mb-md" rounded>
      {{ error }}
    </q-banner>

    <q-banner class="bg-amber-10 text-amber-2 q-mb-md" rounded>
      Secrets are masked. Only flags (FEATURE_*, ENABLE_*, PAYSTACK_MODE) can be changed here.
      Type <strong>{{ snapshot.confirmPhrase }}</strong> to apply. Same governor may maker and checker.
    </q-banner>

    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-12 col-md-4">
        <q-card flat class="bg-panel border-main q-pa-md">
          <div class="text-caption text-grey-5">File present</div>
          <div class="text-h6">{{ snapshot.fileExists ? 'Yes' : 'No' }}</div>
        </q-card>
      </div>
      <div class="col-12 col-md-8">
        <q-card flat class="bg-panel border-main q-pa-md">
          <div class="text-caption text-grey-5">Governors</div>
          <div class="text-body2">{{ (snapshot.governors || []).join(', ') || '—' }}</div>
        </q-card>
      </div>
    </div>

    <q-card v-if="(snapshot.pending || []).length" flat class="bg-panel border-main q-mb-lg">
      <q-card-section>
        <div class="text-subtitle1 text-weight-bold q-mb-sm">Pending maker-checker</div>
        <div v-for="row in snapshot.pending" :key="row.id" class="q-mb-md q-pa-sm bg-subpanel rounded-borders">
          <div class="text-weight-bold">{{ row.key }}</div>
          <div class="text-caption text-grey-4">{{ row.fromPreview }} → {{ row.toPreview }}</div>
          <div class="text-caption">Maker: {{ row.makerEmail }} · {{ row.reason }}</div>
          <div class="row q-gutter-sm q-mt-sm">
            <q-input v-model="confirmById[row.id]" dense outlined dark label="Confirm phrase" class="col" />
            <q-btn color="green-7" label="Approve & apply" @click="approve(row)" />
            <q-btn outline color="red-4" label="Reject" @click="reject(row)" />
          </div>
        </div>
      </q-card-section>
    </q-card>

    <q-input v-model="search" dense outlined dark placeholder="Filter keys" class="q-mb-md" />

    <q-table
      :rows="filteredRows"
      :columns="columns"
      row-key="key"
      flat
      dark
      :loading="loading"
      :pagination="{ rowsPerPage: 25 }"
    >
      <template v-slot:body-cell-actions="props">
        <q-td :props="props">
          <q-btn
            v-if="props.row.writable"
            dense
            flat
            color="cyan-4"
            label="Propose"
            @click="openPropose(props.row)"
          />
          <span v-else class="text-grey-6">read-only</span>
        </q-td>
      </template>
    </q-table>

    <q-dialog v-model="showPropose">
      <q-card class="bg-panel" style="min-width: 420px">
        <q-card-section>
          <div class="text-h6">Propose {{ draft.key }}</div>
          <q-input v-model="draft.value" outlined dark dense class="q-mt-md" label="New value" />
          <q-input v-model="draft.reason" outlined dark dense class="q-mt-md" type="textarea" label="Reason" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn color="cyan-7" label="Submit as maker" @click="propose" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useQuasar } from 'quasar'
import { adminApi } from '../../api'

const $q = useQuasar()
const loading = ref(false)
const error = ref('')
const search = ref('')
const showPropose = ref(false)
const confirmById = reactive({})
const snapshot = ref({
  filePath: '',
  fileExists: false,
  rows: [],
  pending: [],
  governors: [],
  confirmPhrase: 'APPLY PRODUCTION ENV',
})
const draft = reactive({ key: '', value: '', reason: '' })

const columns = [
  { name: 'key', label: 'KEY', field: 'key', align: 'left', sortable: true },
  { name: 'classified', label: 'TYPE', field: 'classified', align: 'left' },
  { name: 'valuePreview', label: 'VALUE', field: 'valuePreview', align: 'left' },
  { name: 'actions', label: '', field: 'actions', align: 'right' },
]

const filteredRows = computed(() => {
  const q = search.value.trim().toLowerCase()
  const rows = snapshot.value.rows || []
  if (!q) return rows
  return rows.filter((r) => r.key.toLowerCase().includes(q) || String(r.valuePreview).toLowerCase().includes(q))
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await adminApi.getProductionEnv()
    snapshot.value = data
  } catch (err) {
    error.value = err.response?.data?.error || err.message || 'Failed to load production env'
  } finally {
    loading.value = false
  }
}

function openPropose(row) {
  draft.key = row.key
  draft.value = row.classified === 'flag' ? String(row.valuePreview === '(empty)' ? '' : row.valuePreview) : ''
  draft.reason = ''
  showPropose.value = true
}

async function propose() {
  try {
    await adminApi.proposeProductionEnv({ key: draft.key, value: draft.value, reason: draft.reason })
    $q.notify({ type: 'positive', message: 'Change queued for checker apply' })
    showPropose.value = false
    await load()
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.error || err.message })
  }
}

async function approve(row) {
  try {
    await adminApi.approveProductionEnv({
      id: row.id,
      confirmPhrase: confirmById[row.id],
    })
    $q.notify({ type: 'positive', message: 'Applied to production env' })
    await load()
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.error || err.message })
  }
}

async function reject(row) {
  try {
    await adminApi.rejectProductionEnv({ id: row.id, reason: 'rejected from dashboard' })
    $q.notify({ type: 'warning', message: 'Change rejected' })
    await load()
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.error || err.message })
  }
}

onMounted(load)
</script>
