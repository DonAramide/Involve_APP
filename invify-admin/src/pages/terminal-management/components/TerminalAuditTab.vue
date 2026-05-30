<template>
  <div>
    <div class="row q-mb-md q-col-gutter-sm items-center">
      <div class="col-12 col-sm-4">
        <q-input v-model="filters.terminalId" dense outlined placeholder="Filter by Terminal ID" @keyup.enter="fetchLogs">
          <template v-slot:append>
            <q-icon name="search" class="cursor-pointer" @click="fetchLogs" />
          </template>
        </q-input>
      </div>
      <div class="col-12 col-sm-4">
        <q-select v-model="filters.actionType" :options="actionOptions" dense outlined emit-value map-options label="Action Type" @update:model-value="fetchLogs" clearable />
      </div>
      <div class="col-12 col-sm-4 row justify-end">
        <q-btn icon="refresh" flat round color="primary" @click="fetchLogs" />
      </div>
    </div>

    <q-table
      :rows="logs"
      :columns="columns"
      row-key="id"
      v-model:pagination="pagination"
      :loading="loading"
      @request="onRequest"
      flat
      bordered
    >
      <template v-slot:body-cell-action_type="props">
        <q-td :props="props">
          <q-chip
            dense
            :color="getActionColor(props.row.action_type)"
            text-color="white"
            class="text-weight-bold"
          >
            {{ props.row.action_type }}
          </q-chip>
        </q-td>
      </template>
    </q-table>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { terminalApi } from 'src/api/terminalApi'
import { date } from 'quasar'

const $q = useQuasar()
const loading = ref(false)
const logs = ref([])
const pagination = ref({ page: 1, rowsPerPage: 50, rowsNumber: 0 })
const filters = ref({ terminalId: '', actionType: '' })

const actionOptions = [
  { label: 'All', value: '' },
  { label: 'ASSIGNED', value: 'ASSIGNED' },
  { label: 'UNASSIGNED', value: 'UNASSIGNED' },
  { label: 'TRANSFERRED', value: 'TRANSFERRED' },
  { label: 'SUSPENDED', value: 'SUSPENDED' },
  { label: 'BULK_IMPORT', value: 'BULK_IMPORT' },
  { label: 'EDITED', value: 'EDITED' }
]

const columns = [
  { name: 'created_at', label: 'Timestamp', field: row => date.formatDate(row.created_at, 'YYYY-MM-DD HH:mm:ss'), align: 'left' },
  { name: 'action_type', label: 'Action', field: 'action_type', align: 'left' },
  { name: 'terminal_id', label: 'Terminal ID', field: 'terminal_id', align: 'left' },
  { name: 'admin_id', label: 'Admin', field: 'admin_id', align: 'left' },
  { name: 'old_device_id', label: 'Old Device', field: 'old_device_id', align: 'left' },
  { name: 'new_device_id', label: 'New Device', field: 'new_device_id', align: 'left' },
  { name: 'reason', label: 'Reason', field: 'reason', align: 'left' },
  { name: 'ip_address', label: 'IP Address', field: 'ip_address', align: 'left' }
]

const getActionColor = (action) => {
  switch (action) {
    case 'ASSIGNED': return 'positive'
    case 'UNASSIGNED': return 'warning'
    case 'TRANSFERRED': return 'info'
    case 'SUSPENDED': return 'negative'
    case 'BULK_IMPORT': return 'purple'
    case 'EDITED': return 'orange'
    default: return 'grey'
  }
}

const fetchLogs = async (props) => {
  if (props && props.pagination) {
    pagination.value = props.pagination
  }
  loading.value = true
  try {
    const params = {
      page: pagination.value.page,
      limit: pagination.value.rowsPerPage,
      terminalId: filters.value.terminalId,
      actionType: filters.value.actionType
    }
    const { data } = await terminalApi.getAuditLog(params)
    logs.value = data.data
    pagination.value.rowsNumber = data.total
  } catch (error) {
    $q.notify({ type: 'negative', message: 'Failed to load audit logs' })
  } finally {
    loading.value = false
  }
}

const onRequest = (props) => {
  fetchLogs(props)
}

onMounted(() => {
  fetchLogs()
})
</script>
