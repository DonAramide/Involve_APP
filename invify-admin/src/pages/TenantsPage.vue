<!-- invify-admin/src/pages/TenantsPage.vue -->
<template>
  <q-page class="q-pa-lg bg-main text-main">
    <!-- Header -->
    <div class="row items-center q-mb-lg">
      <div class="col">
        <h1 class="text-h4 text-weight-bold q-ma-none text-main cursor-help">
          Tenants Identity Matrix
          <EnterpriseManualTooltip 
            title="Tenants Identity Matrix"
            icon="corporate_fare"
            description="The master record of all businesses, schools, and organizations onboarded into the ecosystem. This view allows for global oversight of activation states and plan expiration lineage."
            impact="READ_ONLY: Primary operational record."
          />
        </h1>
        <div class="text-muted row items-center">
          Manage business organizations and schools.
          <q-badge color="indigo-7" class="q-ml-sm">{{ rows.length }} Total</q-badge>
        </div>
      </div>
      <div class="col-auto">
        <q-btn 
          color="indigo-7" 
          icon="add" 
          label="Create Tenant" 
          unelevated 
          class="q-px-md"
          @click="openCreateModal"
        />
      </div>
    </div>

    <!-- Filters -->
    <q-card class="bg-panel q-mb-lg shadow-2 border-indigo no-shadow">
      <q-card-section class="row q-col-gutter-md items-center">
        <div class="col-12 col-md-4">
          <q-input v-model="filter.name" label="Search by Name, Email, or Agent Code" :dark="prefs.isDarkMode" filled dense @update:model-value="fetchTenants">
            <template v-slot:append>
              <q-icon name="search" />
            </template>
          </q-input>
        </div>
        <div class="col-12 col-md-3">
          <q-select 
            v-model="filter.type" 
            :options="['all', 'school', 'retail', 'service']" 
            label="Type" 
            :dark="prefs.isDarkMode" filled dense 
            emit-value
            @update:model-value="fetchTenants" 
          />
        </div>
        <div class="col-12 col-md-3">
          <q-select 
            v-model="filter.status" 
            :options="['all', 'pending', 'active', 'suspended']" 
            label="Status" 
            :dark="prefs.isDarkMode" filled dense
            emit-value
            @update:model-value="fetchTenants" 
          />
        </div>
      </q-card-section>
    </q-card>

    <!-- Table -->
    <q-table
      :rows="rows"
      :columns="columns"
      row-key="id"
      :loading="loading"
      flat
      bordered
      :dark="prefs.isDarkMode"
      class="bg-panel shadow-2 no-shadow"
      :pagination="pagination"
    >
      <template v-slot:body-cell-device_serial="props">
        <q-td :props="props">
          <span v-if="props.row.device_id" class="text-weight-medium" style="font-family: monospace; font-size: 11px; color: #a5b4fc;">
            {{ props.row.device_id }}
          </span>
          <q-badge v-else color="grey-8" label="UNASSIGNED" class="text-weight-bold" style="font-size: 10px; opacity: 0.6;" />
        </q-td>
      </template>

      <template v-slot:body-cell-agent_code="props">
        <q-td :props="props" class="text-center">
          <span v-if="props.row.agent_code" class="text-weight-bold" style="font-family: monospace; font-size: 12px; color: #34d399;">
            {{ props.row.agent_code }}
          </span>
          <span v-else class="text-grey-6" style="font-size: 11px;">N/A</span>
        </q-td>
      </template>

      <template v-slot:body-cell-location="props">
        <q-td :props="props">
          <span v-if="props.row.location" style="font-size: 11px; max-width: 140px; display: inline-block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"
            :title="props.row.location">
            📍 {{ props.row.location }}
          </span>
          <span v-else class="text-grey-6" style="font-size: 11px;">N/A</span>
        </q-td>
      </template>

      <template v-slot:body-cell-device_count="props">
        <q-td :props="props" class="text-center">
          <q-badge
            :color="props.value > 1 ? 'deep-purple-7' : 'grey-8'"
            :label="props.value > 1 ? `${props.value} Devices` : '1 Device'"
            class="text-weight-bold q-px-sm"
            :style="props.value > 1 ? 'font-size: 11px;' : 'font-size: 11px; opacity: 0.7;'"
          />
        </q-td>
      </template>


      <template v-slot:body-cell-plan_expires_at="props">
        <q-td :props="props">
          <q-chip 
            :color="!props.row.plan_expires_at ? 'grey-9' : (new Date(props.row.plan_expires_at) < new Date() ? 'red-10' : 'indigo-9')" 
            text-color="white" 
            size="sm"
            dense
          >
            {{ props.row.plan_expires_at ? new Date(props.row.plan_expires_at).toLocaleDateString() : 'PERMANENT' }}
          </q-chip>
        </q-td>
      </template>

      <template v-slot:body-cell-status="props">
        <q-td :props="props">
          <q-chip 
            :color="props.value === 'active' ? 'green-10' : (props.value === 'pending' ? 'amber-10' : 'red-10')" 
            text-color="white" 
            size="sm"
            dense
          >
            {{ props.value.toUpperCase() }}
          </q-chip>
        </q-td>
      </template>

      <template v-slot:body-cell-actions="props">
        <q-td :props="props" class="q-gutter-x-sm">
          <q-btn flat round dense icon="visibility" color="cyan-4" @click="viewDetails(props.row.id)">
            <q-tooltip>View Details</q-tooltip>
          </q-btn>
          <q-btn flat round dense icon="edit" color="indigo-4" @click="openEditModal(props.row)">
            <q-tooltip>Edit Tenant</q-tooltip>
          </q-btn>
          <q-btn 
            flat round dense 
            :icon="props.row.status === 'active' ? 'block' : 'check_circle'" 
            :color="props.row.status === 'active' ? 'orange' : 'green'" 
            @click="toggleStatus(props.row)"
          >
            <q-tooltip>{{ props.row.status === 'active' ? 'Suspend Tenant' : 'Activate Tenant' }}</q-tooltip>
          </q-btn>
        </q-td>
      </template>

      <template v-slot:loading>
        <q-inner-loading showing color="indigo-4" />
      </template>

      <template v-slot:no-data>
        <div class="full-width row flex-center q-pa-xl text-grey-6">
          <q-icon size="2em" name="sentiment_dissatisfied" />
          <span class="q-ml-sm">No tenants found matching your filters.</span>
        </div>
      </template>
    </q-table>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { adminApi } from '../api'
import TenantModal from '../components/modals/TenantModal.vue'
import { useOperatorPreferences } from '../composables/useOperatorPreferences'
import EnterpriseManualTooltip from '../components/common/EnterpriseManualTooltip.vue'

const { prefs } = useOperatorPreferences()
const $q = useQuasar()
const $router = useRouter()

const loading = ref(false)
const rows = ref([])
const filter = ref({ name: '', type: 'all', status: 'all' })
const pagination = ref({ sortBy: 'created_at', descending: true, rowsPerPage: 15 })

const columns = [
  { name: 'name', label: 'NAME', field: 'name', align: 'left', sortable: true },
  { name: 'type', label: 'TYPE', field: 'type', align: 'left', sortable: true },
  { name: 'device_serial', label: 'DEVICE ID', field: row => row.device_id || 'UNASSIGNED', align: 'left', sortable: true },
  { name: 'device_count', label: 'DEVICES', field: row => row.device_count || 1, align: 'center', sortable: true },
  { name: 'agent_code', label: 'AGENT CODE', field: row => row.agent_code || 'N/A', align: 'center', sortable: true },
  { name: 'location', label: 'LOCATION', field: row => row.location || 'N/A', align: 'left', sortable: true },
  { name: 'plan', label: 'PLAN', field: 'plan', align: 'left', sortable: true },
  { name: 'plan_expires_at', label: 'EXPIRY DATE', field: row => row.plan_expires_at || null, align: 'center', sortable: true },
  { name: 'status', label: 'STATUS', field: 'status', align: 'center', sortable: true },
  { name: 'created_at', label: 'CREATED AT', field: 'created_at', align: 'left', format: val => new Date(val).toLocaleString(), sortable: true },
  { name: 'actions', label: 'ACTIONS', align: 'center' }
]

const fetchTenants = async () => {
  loading.value = true
  try {
    const params = {
      name: filter.value.name,
      type: filter.value.type !== 'all' ? filter.value.type : undefined,
      status: filter.value.status !== 'all' ? filter.value.status : undefined
    }
    const { data } = await adminApi.getTenants(params)
    rows.value = data
  } finally {
    loading.value = false
  }
}

const openCreateModal = () => {
  $q.dialog({
    component: TenantModal,
    componentProps: { isEdit: false }
  }).onOk(async (formData) => {
    await adminApi.createTenant(formData)
    $q.notify({ type: 'positive', message: 'Tenant registered successfully' })
    fetchTenants()
  })
}

const openEditModal = (row) => {
  $q.dialog({
    component: TenantModal,
    componentProps: { isEdit: true, tenant: row }
  }).onOk(async (formData) => {
    await adminApi.updateTenant(row.id, formData)
    $q.notify({ type: 'positive', message: 'Tenant updated successfully' })
    fetchTenants()
  })
}

const toggleStatus = async (row) => {
  const newStatus = row.status === 'active' ? 'suspended' : 'active'
  await adminApi.updateTenant(row.id, { status: newStatus })
  $q.notify({ type: 'positive', message: `Tenant ${newStatus}` })
  fetchTenants()
}

const viewDetails = (id) => {
  $router.push(`/tenants/${id}`)
}

onMounted(fetchTenants)
</script>

<style scoped>
.border-indigo {
  border-left: 5px solid #3f51b5;
}
</style>
