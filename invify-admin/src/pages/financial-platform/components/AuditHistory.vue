<template>
  <q-card class="audit-history shadow-2">
    <q-card-section>
      <div class="text-h6 q-mb-md">Audit History</div>
      <q-table
        :rows="rows"
        :columns="columns"
        row-key="id"
        :loading="loading"
        v-model:pagination="pagination"
        @request="onRequest"
        flat
        bordered
      >
        <template v-slot:body-cell-status="props">
          <q-td :props="props">
            <q-chip 
              :color="props.row.status === 'SUCCESS' ? 'positive' : 'negative'" 
              text-color="white" 
              dense 
              size="sm"
            >
              {{ props.row.status }}
            </q-chip>
          </q-td>
        </template>
        
        <template v-slot:body-cell-created_at="props">
          <q-td :props="props">
            {{ new Date(props.row.created_at).toLocaleString() }}
          </q-td>
        </template>
      </q-table>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import financialPlatformApi from 'src/api/financialPlatformApi'
import { useQuasar } from 'quasar'
import { useRuntimeStore } from 'src/stores/runtime.store'

const $q = useQuasar()
const runtimeStore = useRuntimeStore()

const loading = ref(false)
const rows = ref([])
const pagination = ref({
  page: 1,
  rowsPerPage: 10,
  rowsNumber: 0
})

const columns = [
  { name: 'created_at', required: true, label: 'Time', align: 'left', field: 'created_at', sortable: true },
  { name: 'actor_id', align: 'left', label: 'User ID', field: 'actor_id', sortable: true },
  { name: 'action', align: 'left', label: 'Action', field: 'action', sortable: true },
  { name: 'status', align: 'center', label: 'Result', field: 'status', sortable: true }
]

const onRequest = async (props) => {
  const { page, rowsPerPage } = props.pagination
  loading.value = true
  const tenantId = runtimeStore.config?.tenant?.id
  if (!tenantId) {
    loading.value = false
    return
  }
  
  try {
    const response = await financialPlatformApi.getHistory(tenantId, page, rowsPerPage)
    const logs = response.data || []
    rows.value = logs.map(l => ({
      id: l.id,
      created_at: l.created_at,
      actor_id: l.actor_id || 'system',
      action: l.event_type,
      status: l.payload?.status || 'SUCCESS'
    }))
    pagination.value.rowsNumber = logs.length
    
    pagination.value.page = page
    pagination.value.rowsPerPage = rowsPerPage
  } catch (error) {
    $q.notify({ type: 'negative', message: 'Failed to load audit history' })
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  if (!runtimeStore.isReady) {
    await runtimeStore.hydrate()
  }
  onRequest({
    pagination: pagination.value
  })
})
</script>
