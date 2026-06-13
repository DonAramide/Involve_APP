<template>
  <div class="q-pa-md">
    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div class="text-h6">Hardware Binding & Assignment</div>
        <div class="text-caption">Bundle physical hardware (Tablet, MPOS, Printer) and Logical TIDs, then assign to a Business.</div>
      </q-card-section>
      
      <q-card-section class="row q-col-gutter-md">
        <div class="col-12 col-md-6">
          <q-select 
            v-model="form.tablet_id" 
            :options="tabletOptions" 
            label="1. Select Android Tablet Device" 
            outlined dense emit-value map-options clearable
          />
        </div>
        <div class="col-12 col-md-6">
          <q-select 
            v-model="form.mpos_id" 
            :options="mposOptions" 
            label="2. Select MPOS Device (Optional)" 
            outlined dense emit-value map-options clearable
          />
        </div>
        <div class="col-12 col-md-6">
          <q-select 
            v-model="form.printer_id" 
            :options="printerOptions" 
            label="3. Select Bluetooth Printer (Optional)" 
            outlined dense emit-value map-options clearable
          />
        </div>
        <div class="col-12 col-md-6">
          <q-select 
            v-model="form.terminal_id_id" 
            :options="tidOptions" 
            label="4. Select Bank Terminal ID" 
            outlined dense emit-value map-options clearable
          />
        </div>
        <div class="col-12">
          <q-select 
            v-model="form.tenant_id" 
            :options="tenantOptions" 
            label="5. Target Business / Tenant" 
            outlined dense emit-value map-options clearable
          />
        </div>
      </q-card-section>
      
      <q-card-actions>
        <q-btn color="primary" label="Bind & Assign Bundle" @click="handleAssign" :loading="loading" />
      </q-card-actions>
    </q-card>

    <q-card flat bordered>
      <q-table
        title="Active Assignments"
        :rows="assignments.filter(a => a.status === 'ACTIVE')"
        :columns="columns"
        row-key="id"
        :loading="loadingTable"
        flat
      >
        <template v-slot:body-cell-status="props">
          <q-td :props="props">
            <q-chip :color="props.row.status === 'ACTIVE' ? 'positive' : 'grey'" text-color="white" size="sm">
              {{ props.row.status }}
            </q-chip>
          </q-td>
        </template>
        <template v-slot:body-cell-actions="props">
          <q-td :props="props" class="text-right">
            <q-btn v-if="props.row.status === 'ACTIVE'" flat color="negative" icon="link_off" size="sm" @click="handleUnassign(props.row)" label="Unassign" />
          </q-td>
        </template>
      </q-table>
    </q-card>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useQuasar } from 'quasar'
import { terminalApi } from 'src/api/terminalApi'
import { adminApi } from 'src/api'

const $q = useQuasar()

const form = ref({
  tablet_id: '',
  mpos_id: '',
  printer_id: '',
  terminal_id_id: '',
  tenant_id: ''
})

const loading = ref(false)
const loadingTable = ref(false)

const tablets = ref([])
const mposList = ref([])
const printers = ref([])
const tids = ref([])
const tenants = ref([])
const assignments = ref([])

const columns = [
  { 
    name: 'tablet', 
    label: 'Tablet ID', 
    align: 'left', 
    field: row => {
      if (!row.tablet_id) return 'N/A'
      const match = tablets.value.find(t => t.id === row.tablet_id)
      return match ? match.device_id : row.tablet_id
    }
  },
  { 
    name: 'mpos', 
    label: 'MPOS ID', 
    align: 'left', 
    field: row => {
      if (!row.mpos_id) return 'N/A'
      const match = mposList.value.find(m => m.id === row.mpos_id)
      return match ? match.serial_number : row.mpos_id
    }
  },
  { 
    name: 'printer', 
    label: 'Printer ID', 
    align: 'left', 
    field: row => {
      if (!row.printer_id) return 'N/A'
      const match = printers.value.find(p => p.id === row.printer_id)
      return match ? match.mac_address : row.printer_id
    }
  },
  { 
    name: 'tid', 
    label: 'TID', 
    align: 'left', 
    field: row => {
      if (!row.terminal_id_id) return 'N/A'
      const match = tids.value.find(t => t.id === row.terminal_id_id)
      return match ? match.tid : row.terminal_id_id
    }
  },
  { 
    name: 'tenant', 
    label: 'Business / Tenant', 
    align: 'left', 
    field: row => {
      const tenant = tenants.value.find(t => t.id === row.tenant_id)
      return tenant ? tenant.name : row.tenant_id
    }
  },
  { name: 'status', label: 'Status', align: 'center', field: 'status' },
  { name: 'assigned_at', label: 'Assigned At', align: 'left', field: 'assigned_at' },
  { name: 'actions', label: 'Actions', align: 'right', field: 'actions' }
]

const getActiveIds = (field) => new Set(assignments.value.filter(a => a.status === 'ACTIVE').map(a => a[field]).filter(Boolean))

const tabletOptions = computed(() => {
  const assigned = getActiveIds('tablet_id')
  return tablets.value.filter(t => !assigned.has(t.id)).map(t => ({ label: `${t.device_id} (${t.model}) - SN: ${t.serial_number}`, value: t.id }))
})
const mposOptions = computed(() => {
  const assigned = getActiveIds('mpos_id')
  return mposList.value.filter(m => !assigned.has(m.id)).map(m => ({ label: `${m.serial_number} (${m.hardware_type})`, value: m.id }))
})
const printerOptions = computed(() => {
  const assigned = getActiveIds('printer_id')
  return printers.value.filter(p => !assigned.has(p.id)).map(p => ({ label: `${p.mac_address} (${p.model})`, value: p.id }))
})
const tidOptions = computed(() => tids.value.map(t => ({ label: `${t.tid} (MID: ${t.mid})`, value: t.id })))
const tenantOptions = computed(() => tenants.value.map(t => ({ label: t.name, value: t.id })))

const fetchData = async () => {
  loadingTable.value = true
  try {
    const [tabsRes, mposRes, printsRes, tidsRes, tenRes, asgRes] = await Promise.all([
      terminalApi.getTablets(),
      terminalApi.getMpos(),
      terminalApi.getPrinters(),
      terminalApi.getTids(),
      adminApi.getTenants({ limit: 1000 }),
      terminalApi.getAssignments()
    ])
    tablets.value = tabsRes.data?.data || []
    mposList.value = mposRes.data?.data || []
    printers.value = printsRes.data?.data || []
    tids.value = tidsRes.data?.data || []
    tenants.value = Array.isArray(tenRes.data) ? tenRes.data : (tenRes.data?.tenants || [])
    assignments.value = asgRes.data?.data || []
  } catch (error) {
    console.error('Failed to load provisioning data', error)
  } finally {
    loadingTable.value = false
  }
}

const handleUnassign = (row) => {
  $q.dialog({
    title: 'Confirm Unassign',
    message: 'Are you sure you want to unassign this hardware bundle?',
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      loadingTable.value = true
      await terminalApi.unassignHardware(row.id)
      $q.notify({ type: 'positive', message: 'Hardware bundle unassigned successfully' })
      fetchData()
    } catch (error) {
      $q.notify({ type: 'negative', message: error.response?.data?.error || 'Failed to unassign' })
      loadingTable.value = false
    }
  })
}

const handleAssign = async () => {
  if (!form.value.tablet_id || !form.value.terminal_id_id || !form.value.tenant_id) {
    $q.notify({ type: 'warning', message: 'Tablet, TID, and Tenant are required' })
    return
  }

  loading.value = true
  try {
    await terminalApi.assignHardware(form.value)
    $q.notify({ type: 'positive', message: 'Provisioning bundle successfully assigned!' })
    form.value = { tablet_id: '', mpos_id: '', printer_id: '', terminal_id_id: '', tenant_id: '' }
    fetchData()
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.error || 'Failed to assign bundle' })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>
