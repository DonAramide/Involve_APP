<template>
  <q-page class="q-pa-lg bg-main text-main">
    <div class="row items-center q-mb-lg">
      <div class="col">
        <h1 class="text-h4 text-weight-bold q-ma-none text-main cursor-help">
          Provisioning Issues
        </h1>
        <div class="text-muted">Review and resolve tenant onboarding conflicts.</div>
      </div>
      <div class="col-auto row q-gutter-x-sm items-center">
        <q-select 
          v-model="filterStatus" 
          :options="[{label:'All Status', value:''}, {label:'Pending', value:'pending'}, {label:'In Progress', value:'in_progress'}, {label:'Resolved', value:'resolved'}]" 
          dense outlined dark class="bg-dark text-white" style="width: 140px"
          emit-value map-options
        />
        <q-input v-model="searchQuery" dense outlined placeholder="Search issues..." dark class="bg-dark text-white" style="width: 200px">
          <template v-slot:append>
            <q-icon name="search" color="grey-5" />
          </template>
        </q-input>
        <q-btn flat color="grey-6" icon="refresh" @click="fetchComplaints" />
      </div>
    </div>

    <!-- Table -->
    <q-table
      :rows="filteredComplaints"
      :columns="columns"
      row-key="id"
      :loading="loading"
      flat
      bordered
      :dark="prefs.isDarkMode"
      class="bg-panel shadow-2 no-shadow"
      :filter="searchQuery"
      :pagination="pagination"
    >
      <template v-slot:body-cell-tenant_name="props">
        <q-td :props="props">
          <div class="text-weight-bold">{{ props.row.tenant_name }}</div>
          <div class="text-caption text-grey-5">{{ props.row.tenant_id }}</div>
        </q-td>
      </template>
      <template v-slot:body-cell-urgency="props">
        <q-td :props="props">
          <q-chip 
            :color="props.value === 'critical' ? 'red-9' : (props.value === 'high' ? 'orange-9' : 'blue-grey-8')" 
            text-color="white" size="xs" dense>
            {{ props.value?.toUpperCase() }}
          </q-chip>
        </q-td>
      </template>
      <template v-slot:body-cell-status="props">
        <q-td :props="props">
          <q-chip 
            :color="props.value === 'resolved' ? 'green-9' : (props.value === 'in_progress' ? 'amber-9' : 'red-9')" 
            text-color="white" size="xs" dense>
            {{ props.value?.toUpperCase() }}
          </q-chip>
        </q-td>
      </template>
      <template v-slot:body-cell-actions="props">
        <q-td :props="props" class="q-gutter-x-sm">
          <q-btn flat round dense icon="visibility" color="cyan-4" @click="viewComplaint(props.row)">
            <q-tooltip>View Details</q-tooltip>
          </q-btn>
          <q-btn v-if="props.row.status !== 'resolved'" flat round dense icon="check_circle" color="green-4" @click="markResolved(props.row)">
            <q-tooltip>Mark Resolved</q-tooltip>
          </q-btn>
        </q-td>
      </template>
      <template v-slot:loading>
        <q-inner-loading showing color="indigo-4" />
      </template>
      <template v-slot:no-data>
        <div class="full-width row flex-center q-pa-xl text-grey-6">
          <q-icon size="2em" name="sentiment_satisfied" />
          <span class="q-ml-sm">No complaints found. All good!</span>
        </div>
      </template>
    </q-table>

    <!-- Complaint Detail Dialog -->
    <q-dialog v-model="showDialog">
      <q-card class="bg-blue-grey-10 text-white" style="min-width: 500px">
        <q-card-section class="bg-indigo-10 row items-center">
          <div class="text-h6">{{ selectedComplaint?.title }}</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section class="q-pa-md">
          <div class="row q-col-gutter-sm q-mb-md">
            <div class="col-6">
              <div class="text-caption text-grey-5">Tenant</div>
              <div class="text-subtitle2">{{ selectedComplaint?.tenant_name }}</div>
            </div>
            <div class="col-6">
              <div class="text-caption text-grey-5">Device ID</div>
              <div class="text-subtitle2">{{ selectedComplaint?.device_id || 'N/A' }}</div>
            </div>
            <div class="col-6">
              <div class="text-caption text-grey-5">Category</div>
              <div class="text-subtitle2 text-capitalize">{{ selectedComplaint?.category }}</div>
            </div>
            <div class="col-6">
              <div class="text-caption text-grey-5">Reported On</div>
              <div class="text-subtitle2">{{ selectedComplaint?.created_at ? new Date(selectedComplaint.created_at).toLocaleString() : '' }}</div>
            </div>
          </div>
          <q-separator dark class="q-mb-md" />
          <div class="text-caption text-grey-5 q-mb-xs">Description</div>
          <div class="bg-dark q-pa-md rounded-borders text-body2" style="white-space: pre-wrap;">
            {{ selectedComplaint?.description }}
          </div>
        </q-card-section>
        <q-card-actions align="right" class="q-pa-md bg-blue-grey-9">
          <q-select 
            v-model="selectedComplaint.status" 
            :options="['pending', 'in_progress', 'resolved']" 
            label="Status" 
            dense dark filled style="width: 150px" class="q-mr-md"
            @update:model-value="updateStatus"
          />
          <q-btn flat label="Close" color="grey-5" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useQuasar } from 'quasar'
import { adminApi } from '../../api'
import { useOperatorPreferences } from '../../composables/useOperatorPreferences'

const $q = useQuasar()
const { prefs } = useOperatorPreferences()

const loading = ref(false)
const complaints = ref([])
const showDialog = ref(false)
const selectedComplaint = ref(null)
const searchQuery = ref('')
const filterStatus = ref('')

const filteredComplaints = computed(() => {
  return complaints.value.filter(c => {
    if (c.category !== 'provisioning_error') return false;
    if (filterStatus.value && c.status !== filterStatus.value) return false;
    return true;
  });
});

const pagination = ref({
  sortBy: 'created_at',
  descending: true,
  page: 1,
  rowsPerPage: 20
})

const columns = [
  { name: 'created_at', label: 'DATE', field: 'created_at', align: 'left', format: val => new Date(val).toLocaleString(), sortable: true },
  { name: 'tenant_name', label: 'TENANT', field: 'tenant_name', align: 'left', sortable: true },
  { name: 'title', label: 'ISSUE', field: 'title', align: 'left', sortable: true },
  { name: 'urgency', label: 'URGENCY', field: 'urgency', align: 'center', sortable: true },
  { name: 'status', label: 'STATUS', field: 'status', align: 'center', sortable: true },
  { name: 'actions', label: 'ACTIONS', field: 'actions', align: 'center' }
]

const fetchComplaints = async () => {
  loading.value = true
  try {
    const { data } = await adminApi.getComplaints()
    complaints.value = data.data || data || []
  } catch (err) {
    $q.notify({ type: 'negative', message: 'Failed to load complaints' })
  } finally {
    loading.value = false
  }
}

const viewComplaint = (row) => {
  selectedComplaint.value = { ...row }
  showDialog.value = true
}

const updateStatus = async (newStatus) => {
  try {
    await adminApi.updateComplaintStatus(selectedComplaint.value.id, newStatus)
    $q.notify({ type: 'positive', message: `Status updated to ${newStatus}` })
    await fetchComplaints()
  } catch (err) {
    $q.notify({ type: 'negative', message: 'Failed to update status' })
  }
}

const markResolved = async (row) => {
  try {
    await adminApi.updateComplaintStatus(row.id, 'resolved')
    $q.notify({ type: 'positive', message: 'Complaint resolved!' })
    await fetchComplaints()
  } catch (err) {
    $q.notify({ type: 'negative', message: 'Failed to resolve complaint' })
  }
}

onMounted(() => {
  fetchComplaints()
})
</script>
