<template>
  <q-page class="q-pa-lg text-white" style="background: #05070d; min-height: 100vh;">
    <div class="row items-center justify-between q-mb-xl">
      <div>
        <div class="row items-center op-gap-8 no-wrap">
          <q-icon name="verified_user" color="cyan-3" size="md" />
          <h1 class="text-h4 text-weight-bolder text-white q-my-none letter-spacing-1">Compliance Scope</h1>
        </div>
        <div class="text-caption text-grey-5 q-mt-xs">
          Upload your CAC certificate and a valid ID card so we can verify the workspace.
        </div>
      </div>
      <q-badge :color="kycStatus === 'APPROVED' ? 'green-9' : 'orange-9'" text-color="white" class="text-weight-bold q-pa-sm">
        KYC Status: {{ kycStatus }}
      </q-badge>
    </div>

    <q-banner rounded class="bg-cyan-10 text-cyan-2 q-mb-lg" dense>
      <template #avatar><q-icon name="info" color="cyan-3" /></template>
      Required documents: CAC (certificate of incorporation or business name) and a valid ID (NIN slip, National ID, driver’s licence, or international passport).
    </q-banner>

    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-12 col-md-6" v-for="slot in requiredSlots" :key="slot.type">
        <q-card dark bordered class="bg-card-dark">
          <q-card-section>
            <div class="row items-center justify-between">
              <div>
                <div class="text-subtitle1 text-weight-bold">{{ slot.title }}</div>
                <div class="text-caption text-grey-5">{{ slot.hint }}</div>
              </div>
              <q-chip dense :color="slot.uploaded ? 'green-9' : 'red-9'" text-color="white" size="sm">
                {{ slot.uploaded ? 'UPLOADED' : 'REQUIRED' }}
              </q-chip>
            </div>
            <div v-if="slot.url" class="q-mt-sm">
              <a :href="slot.url" target="_blank" class="text-cyan-3 text-caption">Open uploaded file</a>
            </div>
          </q-card-section>
          <q-card-actions align="right">
            <q-file
              dark
              dense
              filled
              :model-value="null"
              :label="slot.uploaded ? 'Replace file' : 'Choose file'"
              accept="image/*,.pdf"
              :loading="slot.busy"
              @update:model-value="(file) => uploadDoc(slot.type, file)"
            />
          </q-card-actions>
        </q-card>
      </div>
    </div>

    <div class="q-pa-md bg-card-dark rounded-borders border-grey-9">
      <q-table
        dark
        :rows="documents"
        :columns="columns"
        row-key="id"
        flat
        class="bg-transparent"
      >
        <template #body-cell-url="props">
          <q-td :props="props">
            <a v-if="props.row.url || props.row.document_url" :href="props.row.url || props.row.document_url" target="_blank" class="text-cyan-3">View</a>
            <span v-else class="text-grey-6">—</span>
          </q-td>
        </template>
      </q-table>
    </div>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { Notify } from 'quasar'
import { adminApi } from '../../../../api'

const kycStatus = ref('NOT UPLOADED')
const documents = ref([])
const uploading = ref('')

const columns = [
  { name: 'document_type', label: 'Document', field: 'document_type', align: 'left' },
  { name: 'status', label: 'Status', field: 'status', align: 'center' },
  { name: 'url', label: 'File URL', field: row => row.url || row.document_url, align: 'left' },
]

function tenantId() {
  return localStorage.getItem('tenant_id') || ''
}

function latestUrl(type) {
  const hit = documents.value.find((d) => String(d.document_type || '').toUpperCase() === type)
  return hit?.url || hit?.document_url || ''
}

const requiredSlots = computed(() => ([
  {
    type: 'CAC_CERT',
    title: 'CAC certificate',
    hint: 'Certificate of Incorporation or Business Name registration.',
    uploaded: Boolean(latestUrl('CAC_CERT')),
    url: latestUrl('CAC_CERT'),
    busy: uploading.value === 'CAC_CERT',
  },
  {
    type: 'GOVT_ID',
    title: 'Valid ID card',
    hint: 'NIN slip, National ID, driver’s licence, or international passport.',
    uploaded: Boolean(latestUrl('GOVT_ID')),
    url: latestUrl('GOVT_ID'),
    busy: uploading.value === 'GOVT_ID',
  },
]))

async function loadDocs() {
  const id = tenantId()
  if (!id) return
  try {
    const { data } = await adminApi.getTenantKyc(id)
    const rows = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : [])
    documents.value = rows
    const pending = rows.some((d) => String(d.status || '').toUpperCase() === 'PENDING')
    const approved = rows.length > 0 && rows.every((d) => String(d.status || '').toUpperCase() === 'APPROVED')
    kycStatus.value = approved ? 'APPROVED' : (rows.length ? (pending ? 'PENDING' : 'SUBMITTED') : 'NOT UPLOADED')
  } catch (e) {
    Notify.create({ type: 'negative', message: e?.response?.data?.message || 'Could not load KYC documents' })
  }
}

async function uploadDoc(type, file) {
  if (!file) return
  uploading.value = type
  try {
    const form = new FormData()
    form.append('file', file)
    form.append('type', type)
    const { data } = await adminApi.uploadTenantKyc(form)
    const url = data?.url || data?.data?.url || data?.data?.document_url
    Notify.create({
      type: 'positive',
      message: url ? `Uploaded. ${url}` : 'Document uploaded',
      caption: url || undefined,
      timeout: 8000,
    })
    await loadDocs()
  } catch (e) {
    Notify.create({ type: 'negative', message: e?.response?.data?.message || e?.message || 'Upload failed' })
  } finally {
    uploading.value = ''
  }
}

onMounted(loadDocs)
</script>

<style scoped>
.bg-card-dark { background: #0b0f19; }
.border-grey-9 { border: 1px solid rgba(255,255,255,0.06); }
.letter-spacing-1 { letter-spacing: 1px; }
</style>
