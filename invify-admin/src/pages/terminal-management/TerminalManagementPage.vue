<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="text-h6 text-weight-bold">Terminal Governance & MPOS Provisioning System</div>
        <div class="text-caption text-grey">Centralized lifecycle management for POS terminals, devices, and assignment governance.</div>
      </div>
      <q-btn color="primary" icon="upload_file" label="Bulk Import" @click="showImportDialog = true" />
    </div>

    <q-tabs
      v-model="tab"
      dense
      class="text-grey"
      active-color="primary"
      indicator-color="primary"
      align="left"
      narrow-indicator
    >
      <q-tab name="inventory" icon="inventory" label="Inventory" />
      <q-tab name="assignments" icon="assignment_ind" label="Assignments" />
      <q-tab name="audit" icon="history" label="Audit Log" />
      <q-tab name="settings" icon="settings" label="Settings" />
    </q-tabs>

    <q-separator />

    <q-tab-panels v-model="tab" animated>
      <q-tab-panel name="inventory">
        <TerminalListTab />
      </q-tab-panel>

      <q-tab-panel name="assignments">
        <TerminalAssignmentsTab />
      </q-tab-panel>

      <q-tab-panel name="audit">
        <TerminalAuditTab />
      </q-tab-panel>

      <q-tab-panel name="settings">
        <TerminalSettingsTab />
      </q-tab-panel>
    </q-tab-panels>

    <q-dialog v-model="showImportDialog" persistent>
      <q-card style="min-width: 500px">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Bulk Import Terminals</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        
        <q-card-section>
          <div class="row q-gutter-md q-mb-md items-center">
            <q-select 
              v-model="importType" 
              :options="[
                {label: 'Tablets', value: 'tablets'}, 
                {label: 'MPOS Devices', value: 'mpos'},
                {label: 'Printers', value: 'printers'},
                {label: 'Logical Bank TIDs', value: 'tids'},
                {label: 'Unified Bundles', value: 'bundles'}
              ]" 
              label="Import Type" 
              outlined 
              emit-value
              map-options
              class="col" 
            />
            <q-btn outline color="primary" icon="download" label="Template" @click="downloadTemplate" class="q-py-sm" />
          </div>
          <q-file 
            v-model="importFiles" 
            label="Upload CSV or XLSX" 
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
            multiple
            append
            use-chips
            outlined
            class="q-mb-md"
          >
            <template v-slot:prepend>
              <q-icon name="attach_file" />
            </template>
          </q-file>
          
          <div class="text-caption text-grey q-mb-md">
            Max 10MB per upload. Download the template for the required columns.
          </div>
          
          <div v-if="importing" class="row justify-center q-pa-md">
            <q-spinner-dots color="primary" size="40px" />
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="grey" v-close-popup :disable="importing" />
          <q-btn flat label="Import" color="primary" @click="handleImport" :loading="importing" :disable="!importFiles || importFiles.length === 0" />
        </q-card-actions>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import { useQuasar } from 'quasar'
import { terminalApi } from 'src/api/terminalApi'
import TerminalListTab from './components/TerminalListTab.vue'
import TerminalAssignmentsTab from './components/TerminalAssignmentsTab.vue'
import TerminalAuditTab from './components/TerminalAuditTab.vue'
import TerminalSettingsTab from './components/TerminalSettingsTab.vue'

const $q = useQuasar()
const tab = ref('inventory')
const showImportDialog = ref(false)
const importFiles = ref([])
const importing = ref(false)
const importType = ref('tablets')

const downloadTemplate = () => {
  let content = '';
  let filename = '';
  
  switch (importType.value) {
    case 'tablets':
      content = 'device_id,model,serial_number\nDEV-TEST-002,Tab-A7,SN-TAB-002\nDEV-TEST-003,Tab-A7,SN-TAB-003';
      filename = 'Tablets_Template.csv';
      break;
    case 'mpos':
      content = 'serial_number,hardware_type,device_model\nDSPREAD-001,MPOS,DSPREAD-X1\nDSPREAD-002,ANDROID_POS,DSPREAD-X2';
      filename = 'MPOS_Devices_Template.csv';
      break;
    case 'printers':
      content = 'mac_address,model,printer_type\n00:11:22:33:44:55,XP-58,Bluetooth\nAA:BB:CC:DD:EE:FF,Sunmi,Internal';
      filename = 'Printers_Template.csv';
      break;
    case 'tids':
      content = 'tid,mid,bank_name\n20330001,M-9001,Access\n20330002,M-9001,Access';
      filename = 'TIDs_Template.csv';
      break;
    case 'bundles':
      content = 'tenant_id,tablet_device_id,tablet_model,mpos_serial,mpos_model,printer_mac,printer_model,tid,mid,bank,email,phone\ntenant-xyz,DEV-TEST-002,Tab-A7,DSPREAD-001,MPOS-X1,00:11:22:33:44:55,XP-58,20330001,M-9001,Access,merchant@test.com,08012345678';
      filename = 'Unified_Bundles_Template.csv';
      break;
  }
  
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

const handleImport = async () => {
  if (!importFiles.value || importFiles.value.length === 0) return
  
  importing.value = true
  try {
    const response = await terminalApi.importTerminals(importFiles.value, importType.value)
    const d = response.data
    const detail = [
      `Total rows: ${d.total}`,
      `Imported: ${d.successful}`,
      d.duplicates ? `Duplicates skipped: ${d.duplicates}` : null,
      d.failed ? `Failed: ${d.failed}` : null
    ].filter(Boolean).join(' | ')

    if (d.successful > 0) {
      $q.notify({ type: 'positive', message: `Import complete. ${detail}`, timeout: 6000 })
    } else if (d.duplicates > 0 && d.successful === 0) {
      $q.notify({ type: 'warning', message: `All ${d.duplicates} row(s) already exist — no new records added.`, timeout: 8000 })
    } else if (d.failed > 0) {
      const errSample = (d.errors || []).slice(0, 3).join('\n')
      $q.notify({ type: 'negative', message: `Import failed. ${detail}\n${errSample}`, timeout: 10000 })
    } else {
      $q.notify({ type: 'warning', message: `No records were imported. The file may be empty or have unrecognised columns. ${detail}`, timeout: 8000 })
    }
    showImportDialog.value = false
    importFiles.value = []
  } catch (error) {
    let errorMsg = 'Failed to import';
    if (error.response) {
      if (typeof error.response.data === 'string' && error.response.data.includes('<html')) {
        errorMsg = `Server error (${error.response.status}). The server might be down or unreachable.`;
      } else if (error.response.data && error.response.data.error) {
        errorMsg = error.response.data.error;
      } else if (error.response.data && error.response.data.message) {
        errorMsg = error.response.data.message;
      } else {
        errorMsg = `Server returned ${error.response.status}`;
      }
    } else if (error.message) {
      errorMsg = error.message;
    }
    
    $q.notify({
      type: 'negative',
      message: errorMsg,
      timeout: 5000,
      actions: [{ icon: 'close', color: 'white' }]
    })
  } finally {
    importing.value = false
  }
}
</script>
