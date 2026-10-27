<template>
  <div class="q-pa-md">
    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div class="text-h6">Hardware Binding & Assignment</div>
        <div class="text-caption">Bundle physical hardware (Tablet, MPOS, Printer) and Logical TIDs, then assign to a Business. Type in any dropdown to search.</div>
      </q-card-section>
      
      <q-card-section class="row q-col-gutter-md">
        <div class="col-12 col-md-6">
          <q-select 
            v-model="form.tablet_id" 
            :options="filteredTabletOptions" 
            label="1. Select Android Tablet Device" 
            outlined dense emit-value map-options clearable
            use-input
            input-debounce="0"
            @filter="filterTablets"
            @filter-abort="() => {}"
          >
            <template v-slot:no-option>
              <q-item>
                <q-item-section class="text-grey">No matching tablets</q-item-section>
              </q-item>
            </template>
          </q-select>
        </div>
        <div class="col-12 col-md-6">
          <q-select 
            v-model="form.mpos_id" 
            :options="filteredMposOptions" 
            label="2. Select MPOS Device (Optional)" 
            outlined dense emit-value map-options clearable
            use-input
            input-debounce="0"
            @filter="filterMpos"
          >
            <template v-slot:no-option>
              <q-item>
                <q-item-section class="text-grey">No matching MPOS devices</q-item-section>
              </q-item>
            </template>
          </q-select>
        </div>
        <div class="col-12 col-md-6">
          <q-select 
            v-model="form.printer_id" 
            :options="filteredPrinterOptions" 
            label="3. Select Bluetooth Printer (Optional)" 
            outlined dense emit-value map-options clearable
            use-input
            input-debounce="0"
            @filter="filterPrinters"
          >
            <template v-slot:no-option>
              <q-item>
                <q-item-section class="text-grey">No matching printers</q-item-section>
              </q-item>
            </template>
          </q-select>
        </div>
        <div class="col-12 col-md-6">
          <q-select 
            v-model="form.terminal_id_id" 
            :options="filteredTidOptions" 
            label="4. Select Bank Terminal ID" 
            outlined dense emit-value map-options clearable
            use-input
            input-debounce="0"
            @filter="filterTids"
          >
            <template v-slot:no-option>
              <q-item>
                <q-item-section class="text-grey">No matching TIDs</q-item-section>
              </q-item>
            </template>
          </q-select>
        </div>
        <div class="col-12">
          <q-select 
            v-model="form.tenant_id" 
            :options="filteredTenantOptions" 
            label="5. Target Business / Tenant" 
            outlined dense emit-value map-options clearable
            use-input
            input-debounce="0"
            @filter="filterTenants"
          >
            <template v-slot:no-option>
              <q-item>
                <q-item-section class="text-grey">No matching tenants</q-item-section>
              </q-item>
            </template>
          </q-select>
        </div>
      </q-card-section>
      
      <q-card-actions>
        <q-btn color="primary" label="Bind & Assign Bundle" @click="handleAssign" :loading="loading" />
      </q-card-actions>
    </q-card>

    <q-card flat bordered>
      <q-table
        title="Active Assignments"
        :rows="activeAssignments"
        :columns="columns"
        row-key="id"
        :loading="loadingTable"
        :filter="assignmentSearch"
        v-model:pagination="tablePagination"
        :rows-per-page-options="[10, 30, 50, 100]"
        flat
      >
        <template v-slot:top-right>
          <q-input
            v-model="assignmentSearch"
            dense
            outlined
            debounce="200"
            placeholder="Search assignments (tablet, MPOS, printer, TID, tenant...)"
            style="min-width: 280px"
          >
            <template v-slot:append>
              <q-icon name="search" />
            </template>
          </q-input>
        </template>
        <template v-slot:body-cell-status="props">
          <q-td :props="props">
            <q-chip :color="isActiveAssignment(props.row) ? 'positive' : 'grey'" text-color="white" size="sm">
              {{ props.row.assignment_status || props.row.status || '—' }}
            </q-chip>
          </q-td>
        </template>
        <template v-slot:body-cell-actions="props">
          <q-td :props="props" class="text-right">
            <q-btn v-if="isActiveAssignment(props.row)" flat color="negative" icon="link_off" size="sm" @click="handleUnassign(props.row)" label="Unassign" />
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
import { userFacingApiError } from 'src/utils/userFacingApiError'

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
const assignmentSearch = ref('')
const tablePagination = ref({ page: 1, rowsPerPage: 30 })

const tablets = ref([])
const mposList = ref([])
const printers = ref([])
const tids = ref([])
const tenants = ref([])
const assignments = ref([])

const filteredTabletOptions = ref([])
const filteredMposOptions = ref([])
const filteredPrinterOptions = ref([])
const filteredTidOptions = ref([])
const filteredTenantOptions = ref([])

const isActiveAssignment = (row) => {
  const status = String(row?.assignment_status || row?.status || '').toLowerCase()
  return status === 'assigned' || status === 'active'
}

const activeAssignments = computed(() => assignments.value.filter(isActiveAssignment))

const columns = [
  { 
    name: 'tablet', 
    label: 'Tablet ID', 
    align: 'left', 
    field: row => {
      if (!row.assigned_device_id && !row.tablet_id) return 'N/A'
      const id = row.assigned_device_id || row.tablet_id
      const match = tablets.value.find(t => t.id === id || t.device_id === id)
      return match ? match.device_id : id
    }
  },
  { 
    name: 'mpos', 
    label: 'MPOS ID', 
    align: 'left', 
    field: row => row.mpos_terminal_id || row.pos_serial_number || row.mpos_id || 'N/A'
  },
  { 
    name: 'printer', 
    label: 'Printer ID', 
    align: 'left', 
    field: row => row.printer_mac_address || row.printer_id || 'N/A'
  },
  { 
    name: 'tid', 
    label: 'TID', 
    align: 'left', 
    field: row => row.terminal_id || row.tid || row.terminal_id_id || 'N/A'
  },
  { 
    name: 'tenant', 
    label: 'Business / Tenant', 
    align: 'left', 
    field: row => {
      const tenantId = row.assigned_tenant_id || row.tenant_id
      const tenant = tenants.value.find(t => t.id === tenantId)
      return tenant ? tenant.name : (tenantId || 'N/A')
    }
  },
  { name: 'status', label: 'Status', align: 'center', field: row => row.assignment_status || row.status || '' },
  { name: 'assigned_at', label: 'Assigned At', align: 'left', field: 'assigned_at' },
  { name: 'actions', label: 'Actions', align: 'right', field: 'actions' }
]

const labelOf = (...parts) => parts.filter(p => p != null && String(p).trim() !== '').join(' · ') || 'Unknown device'

const tabletLabel = (t) => {
  const model = t.model || t.device_info?.model || t.device_name || t.device_type || 'Tablet'
  const serial = t.serial_number || t.device_info?.serial_number || t.pos_serial_number || ''
  return labelOf(t.device_id || t.id, model, serial ? `SN: ${serial}` : '')
}

const mposLabel = (m) => {
  const serial = m.mpos_terminal_id || m.serial_number || m.pos_serial_number || m.id
  const type = m.terminal_type || m.hardware_type || m.device_model || 'MPOS'
  return `${serial} (${type})`
}

const printerLabel = (p) => {
  const mac = p.printer_mac_address || p.mac_address || p.id
  const model = p.printer_model || p.model || 'Printer'
  return `${mac} (${model})`
}

const tidLabel = (t) => {
  const tid = t.terminal_id || t.tid || t.id
  const mid = t.merchant_id || t.mid || 'N/A'
  return `${tid} (MID: ${mid})`
}

const getActiveIds = (field) => new Set(
  assignments.value
    .filter(a => (a.assignment_status || a.status) === 'assigned' || (a.assignment_status || a.status) === 'ACTIVE')
    .map(a => a[field])
    .filter(Boolean)
)

const tabletOptions = computed(() => {
  const assigned = getActiveIds('assigned_device_id')
  return tablets.value
    .filter(t => !assigned.has(t.id) && !assigned.has(t.device_id))
    .map(t => ({ label: tabletLabel(t), value: t.id }))
})
const mposOptions = computed(() => {
  const assigned = getActiveIds('mpos_terminal_id')
  return mposList.value
    .filter(m => !assigned.has(m.id) && !assigned.has(m.mpos_terminal_id))
    .map(m => ({ label: mposLabel(m), value: m.id }))
})
const printerOptions = computed(() => {
  const assigned = getActiveIds('printer_mac_address')
  return printers.value
    .filter(p => !assigned.has(p.id) && !assigned.has(p.printer_mac_address))
    .map(p => ({ label: printerLabel(p), value: p.id }))
})
const tidOptions = computed(() => {
  const assigned = getActiveIds('terminal_id')
  return tids.value
    .filter(t => {
      const status = String(t.assignment_status || '').toLowerCase()
      if (status === 'assigned') return false
      return !assigned.has(t.id) && !assigned.has(t.terminal_id)
    })
    .map(t => ({ label: tidLabel(t), value: t.id }))
})
const tenantOptions = computed(() => tenants.value.map(t => ({ label: t.name || t.business_name || t.id, value: t.id })))

const makeOptionFilter = (allOptions, filteredRef) => (val, update) => {
  update(() => {
    const needle = String(val || '').toLowerCase().trim()
    const all = allOptions.value
    filteredRef.value = !needle
      ? all
      : all.filter(opt => String(opt.label).toLowerCase().includes(needle))
  })
}

const filterTablets = makeOptionFilter(tabletOptions, filteredTabletOptions)
const filterMpos = makeOptionFilter(mposOptions, filteredMposOptions)
const filterPrinters = makeOptionFilter(printerOptions, filteredPrinterOptions)
const filterTids = makeOptionFilter(tidOptions, filteredTidOptions)
const filterTenants = makeOptionFilter(tenantOptions, filteredTenantOptions)

const syncFilteredOptions = () => {
  filteredTabletOptions.value = tabletOptions.value
  filteredMposOptions.value = mposOptions.value
  filteredPrinterOptions.value = printerOptions.value
  filteredTidOptions.value = tidOptions.value
  filteredTenantOptions.value = tenantOptions.value
}

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
    syncFilteredOptions()
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
      $q.notify({ type: 'negative', message: userFacingApiError(error, 'Failed to unassign') })
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
    $q.notify({ type: 'negative', message: userFacingApiError(error, 'Failed to assign bundle') })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>
