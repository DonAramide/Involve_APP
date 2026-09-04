<template>
  <div>
    <q-tabs
      v-model="inventoryTab"
      dense
      class="text-grey"
      active-color="primary"
      indicator-color="primary"
      align="left"
      narrow-indicator
    >
      <q-tab name="tablets" label="Tablets" />
      <q-tab name="mpos" label="MPOS Devices" />
      <q-tab name="printers" label="Printers" />
      <q-tab name="tids" label="Logical Bank TIDs" />
    </q-tabs>

    <q-separator />

    <q-tab-panels v-model="inventoryTab" animated>
      <q-tab-panel name="tablets">
        <q-table :rows="tablets" :columns="tabletCols" row-key="id" :loading="loading" flat bordered>
          <template v-slot:body-cell-actions="props">
            <q-td :props="props">
              <q-btn flat round dense color="primary" icon="edit" @click="openEditDialog('tablets', props.row)" />
            </q-td>
          </template>
        </q-table>
      </q-tab-panel>
      <q-tab-panel name="mpos">
        <q-table :rows="mpos" :columns="mposCols" row-key="id" :loading="loading" flat bordered>
          <template v-slot:body-cell-actions="props">
            <q-td :props="props">
              <q-btn flat round dense color="primary" icon="edit" @click="openEditDialog('mpos', props.row)" />
            </q-td>
          </template>
        </q-table>
      </q-tab-panel>
      <q-tab-panel name="printers">
        <q-table :rows="printers" :columns="printerCols" row-key="id" :loading="loading" flat bordered>
          <template v-slot:body-cell-actions="props">
            <q-td :props="props">
              <q-btn flat round dense color="primary" icon="edit" @click="openEditDialog('printers', props.row)" />
            </q-td>
          </template>
        </q-table>
      </q-tab-panel>
      <q-tab-panel name="tids">
        <q-table :rows="tids" :columns="tidCols" row-key="id" :loading="loading" flat bordered>
          <template v-slot:body-cell-actions="props">
            <q-td :props="props">
              <q-btn flat round dense color="primary" icon="edit" @click="openEditDialog('tids', props.row)" />
            </q-td>
          </template>
        </q-table>
      </q-tab-panel>
    </q-tab-panels>

    <q-dialog v-model="editDialog" persistent>
      <q-card style="min-width: 400px">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Edit {{ editType.toUpperCase() }} Record</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section>
          <div v-for="(val, key) in editForm" :key="key">
            <q-input v-if="key !== 'id' && key !== 'created_at'" v-model="editForm[key]" :label="key" filled class="q-mb-md" />
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="primary" v-close-popup />
          <q-btn color="primary" label="Save" @click="saveEdit" :loading="saving" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useQuasar } from 'quasar'
import { terminalApi } from 'src/api/terminalApi'
import { userFacingApiError } from 'src/utils/userFacingApiError'

const $q = useQuasar()
const loading = ref(false)
const saving = ref(false)
const inventoryTab = ref('tablets')
const editDialog = ref(false)
const editType = ref('')
const editForm = ref({})
const currentEditId = ref(null)

const tablets = ref([])
const mpos = ref([])
const printers = ref([])
const tids = ref([])

const tabletCols = [
  { name: 'device_id', label: 'Device ID', field: 'device_id', align: 'left' },
  { name: 'model', label: 'Model', field: 'model', align: 'left' },
  { name: 'serial_number', label: 'Serial Number', field: 'serial_number', align: 'left' },
  { name: 'created_at', label: 'Created At', field: 'created_at', align: 'left' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' }
]

const mposCols = [
  { name: 'serial_number', label: 'Serial Number', field: 'serial_number', align: 'left' },
  { name: 'device_model', label: 'Device Model', field: 'device_model', align: 'left' },
  { name: 'hardware_type', label: 'Hardware Type', field: 'hardware_type', align: 'left' },
  { name: 'created_at', label: 'Created At', field: 'created_at', align: 'left' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' }
]

const printerCols = [
  { name: 'mac_address', label: 'MAC Address', field: 'mac_address', align: 'left' },
  { name: 'model', label: 'Model', field: 'model', align: 'left' },
  { name: 'printer_type', label: 'Printer Type', field: 'printer_type', align: 'left' },
  { name: 'created_at', label: 'Created At', field: 'created_at', align: 'left' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' }
]

const tidCols = [
  { name: 'tid', label: 'Bank TID', field: 'tid', align: 'left' },
  { name: 'mid', label: 'MID', field: 'mid', align: 'left' },
  { name: 'bank_name', label: 'Bank Name', field: 'bank_name', align: 'left' },
  { name: 'created_at', label: 'Created At', field: 'created_at', align: 'left' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' }
]

const fetchData = async () => {
  loading.value = true
  try {
    const unwrap = (payload) => {
      if (Array.isArray(payload)) return payload
      if (Array.isArray(payload?.data)) return payload.data
      return []
    }

    if (inventoryTab.value === 'tablets') {
      const { data } = await terminalApi.getTablets()
      tablets.value = unwrap(data)
    } else if (inventoryTab.value === 'mpos') {
      const { data } = await terminalApi.getMpos()
      mpos.value = unwrap(data)
    } else if (inventoryTab.value === 'printers') {
      const { data } = await terminalApi.getPrinters()
      printers.value = unwrap(data)
    } else if (inventoryTab.value === 'tids') {
      const { data } = await terminalApi.getTids()
      tids.value = unwrap(data)
    }
  } catch (error) {
    console.error('[TerminalListTab] load failed', error)
    $q.notify({
      type: 'negative',
      message: userFacingApiError(error, `Failed to load ${inventoryTab.value}`),
    })
  } finally {
    loading.value = false
  }
}

const openEditDialog = (type, row) => {
  editType.value = type
  currentEditId.value = row.id
  editForm.value = { ...row }
  editDialog.value = true
}

const saveEdit = async () => {
  saving.value = true
  try {
    const payload = { ...editForm.value }
    delete payload.id
    delete payload.created_at

    if (editType.value === 'tablets') {
      await terminalApi.updateTablet(currentEditId.value, payload)
    } else if (editType.value === 'mpos') {
      await terminalApi.updateMpos(currentEditId.value, payload)
    } else if (editType.value === 'printers') {
      await terminalApi.updatePrinter(currentEditId.value, payload)
    } else if (editType.value === 'tids') {
      await terminalApi.updateTid(currentEditId.value, payload)
    }

    $q.notify({ type: 'positive', message: 'Record updated successfully' })
    editDialog.value = false
    fetchData()
  } catch (error) {
    $q.notify({ type: 'negative', message: userFacingApiError(error, 'Failed to update record') })
  } finally {
    saving.value = false
  }
}

watch(inventoryTab, () => {
  fetchData()
})

onMounted(() => {
  fetchData()
})
</script>
