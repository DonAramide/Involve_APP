<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="text-h5 text-weight-bold text-indigo-9">Data Backup & Exports</div>
      <q-space />
      <q-btn color="primary" icon="cloud_download" label="Generate Full Backup" @click="triggerBackup" :loading="generating" />
    </div>

    <q-card flat bordered class="rounded-borders">
      <q-table
        :rows="rows"
        :columns="columns"
        row-key="id"
        :loading="loading"
        flat
        bordered
      />
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { schoolApi } from 'src/api'
import { useQuasar } from 'quasar'

const $q = useQuasar()
const loading = ref(false)
const generating = ref(false)
const rows = ref([])

const columns = [
  { name: 'id', align: 'left', label: 'Backup ID', field: 'id', sortable: true },
  { name: 'date', align: 'left', label: 'Date Generated', field: 'date', sortable: true },
  { name: 'size', align: 'left', label: 'Size', field: 'size', sortable: true },
  { name: 'status', align: 'left', label: 'Status', field: 'status', sortable: true },
]

const fetchData = async () => {
  loading.value = true
  try {
    const { data } = await schoolApi.getBackupHistory()
    rows.value = data || []
  } catch (error) {
    console.error('Failed to fetch backup history:', error)
  } finally {
    loading.value = false
  }
}

const triggerBackup = async () => {
  generating.value = true
  try {
    await schoolApi.triggerBackup()
    $q.notify({ type: 'positive', message: 'Backup generation started!' })
    fetchData()
  } catch (error) {
    console.error('Backup generation failed:', error)
    $q.notify({ type: 'negative', message: 'Failed to generate backup' })
  } finally {
    generating.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>
