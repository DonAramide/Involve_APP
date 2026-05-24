<template>
  <q-page padding>
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="text-h4 text-weight-bold">Kimono POS Gateway</div>
        <div class="text-subtitle1 text-grey-7">Hardware Level Socket Routing & Transaction Insights</div>
      </div>
      <q-btn color="primary" icon="refresh" label="Refresh" @click="fetchData" />
    </div>

    <!-- Configuration Section -->
    <div class="row q-col-gutter-md q-mb-lg">
      <q-col cols="12" md="6">
        <q-card class="full-height" flat bordered>
          <q-card-section>
            <div class="text-h6 text-primary q-mb-md">
              <q-icon name="router" class="q-mr-sm"/> Dynamic Host Routing Strategy
            </div>
            <div class="row q-col-gutter-sm">
              <div class="col-12 col-sm-6">
                <q-select 
                  v-model="routingConfig.activeHost" 
                  :options="['medusa', 'nibss']" 
                  label="Active Primary Host"
                  outlined
                  dense
                  class="q-mb-md"
                />
              </div>
            </div>

            <q-separator class="q-my-sm"/>

            <div class="row q-col-gutter-md q-mt-sm">
              <div class="col-12 col-md-6">
                <div class="row items-center justify-between q-mb-xs">
                  <div class="text-subtitle2 text-weight-bold">Medusa (core.medusang.com)</div>
                  <q-toggle v-model="routingConfig.medusa.isActive" label="Active" color="positive" dense />
                </div>
                <q-input :disable="!routingConfig.medusa.isActive" v-model="routingConfig.medusa.host" label="Host/IP" outlined dense class="q-mb-sm" />
                <q-input :disable="!routingConfig.medusa.isActive" v-model.number="routingConfig.medusa.port" label="Port" type="number" outlined dense class="q-mb-sm" />
                <q-input :disable="!routingConfig.medusa.isActive" v-model.number="routingConfig.medusa.thresholdAmount" label="Threshold Routing Amt" type="number" outlined dense />
              </div>
              <div class="col-12 col-md-6">
                <div class="row items-center justify-between q-mb-xs">
                  <div class="text-subtitle2 text-weight-bold">NIBSS Host</div>
                  <q-toggle v-model="routingConfig.nibss.isActive" label="Active" color="positive" dense />
                </div>
                <q-input :disable="!routingConfig.nibss.isActive" v-model="routingConfig.nibss.host" label="Host/IP" outlined dense class="q-mb-sm" />
                <q-input :disable="!routingConfig.nibss.isActive" v-model.number="routingConfig.nibss.port" label="Port" type="number" outlined dense class="q-mb-sm" />
                <q-input :disable="!routingConfig.nibss.isActive" v-model.number="routingConfig.nibss.thresholdAmount" label="Threshold Routing Amt" type="number" outlined dense />
              </div>
            </div>
          </q-card-section>
          <q-card-actions align="right" class="q-px-md q-pb-md">
            <q-btn color="primary" label="Apply Configuration" @click="saveConfig" :loading="saving" />
          </q-card-actions>
        </q-card>
      </q-col>

      <q-col cols="12" md="6">
        <q-card class="full-height" flat bordered>
          <q-card-section>
             <div class="text-h6 text-primary q-mb-md">
              <q-icon name="insights" class="q-mr-sm"/> Gateway Health
            </div>
            <div class="row q-col-gutter-md text-center">
              <div class="col-6">
                <q-card class="bg-primary text-white">
                  <q-card-section>
                    <div class="text-h4">99.9%</div>
                    <div class="text-subtitle2">Uptime (Medusa)</div>
                  </q-card-section>
                </q-card>
              </div>
              <div class="col-6">
                 <q-card class="bg-secondary text-white">
                  <q-card-section>
                    <div class="text-h4">{{ transactions.length }}</div>
                    <div class="text-subtitle2">Socket Calls (24h)</div>
                  </q-card-section>
                </q-card>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </q-col>
    </div>

    <!-- Transactions Table -->
    <q-card flat bordered>
      <q-table
        title="Recent Socket Transactions (ISO8583)"
        :rows="transactions"
        :columns="columns"
        row-key="id"
        :loading="loading"
        flat
        bordered
      >
        <template v-slot:body-cell-status="props">
          <q-td :props="props">
            <q-chip 
              :color="props.row.status === 'Approved' ? 'positive' : 'negative'" 
              text-color="white" 
              dense 
              class="text-weight-bold"
            >
              {{ props.row.status }}
            </q-chip>
          </q-td>
        </template>
        <template v-slot:body-cell-actions="props">
          <q-td :props="props" class="text-right">
            <q-btn flat dense round icon="visibility" color="primary" @click="viewDetails(props.row)">
              <q-tooltip>View ISO Trace</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- Details Dialog -->
    <q-dialog v-model="detailsDialog">
      <q-card style="min-width: 500px">
        <q-card-section class="row items-center bg-primary text-white">
          <div class="text-h6">ISO8583 Transaction Trace</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section v-if="selectedTx">
          <div class="row q-col-gutter-sm">
            <div class="col-6"><strong>Host:</strong> {{ selectedTx.host }}</div>
            <div class="col-6"><strong>Amount:</strong> ₦{{ selectedTx.amount }}</div>
            <div class="col-6"><strong>Card:</strong> {{ selectedTx.maskedPan }}</div>
            <div class="col-6"><strong>Date:</strong> {{ new Date(selectedTx.date).toLocaleString() }}</div>
          </div>
          <q-separator class="q-my-md"/>
          <div class="text-subtitle2 text-grey-8 q-mb-sm">Raw Socket Request (Hex / TLV)</div>
          <q-input type="textarea" readonly v-model="mockHexRequest" outlined dense />
          <div class="text-subtitle2 text-grey-8 q-my-sm">Host Response</div>
          <q-input type="textarea" readonly v-model="mockHexResponse" outlined dense />
        </q-card-section>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../../api'
import { useQuasar } from 'quasar'

const $q = useQuasar()
const loading = ref(false)
const saving = ref(false)
const transactions = ref([])
const detailsDialog = ref(false)
const selectedTx = ref(null)

const mockHexRequest = ref("0200 4220000000000000 000000 000000001388...")
const mockHexResponse = ref("0210 4220000000000000 000000 000000001388 00...")

const routingConfig = ref({
  activeHost: 'medusa',
  medusa: { host: 'core.medusang.com', port: 8080, thresholdAmount: 0, isActive: true },
  nibss: { host: 'nibss.example.com', port: 5000, thresholdAmount: 50000, isActive: true }
})

const columns = [
  { name: 'date', label: 'Date', field: row => new Date(row.date).toLocaleString(), sortable: true, align: 'left' },
  { name: 'host', label: 'Routed Host', field: 'host', sortable: true, align: 'left' },
  { name: 'amount', label: 'Amount', field: 'amount', sortable: true, align: 'left' },
  { name: 'maskedPan', label: 'Card PAN', field: 'maskedPan', align: 'left' },
  { name: 'status', label: 'Status', field: 'status', align: 'center' },
  { name: 'actions', label: 'Trace', align: 'right' }
]

async function fetchData() {
  loading.value = true
  try {
    const configRes = await api.get('/admin/pos/routing')
    if(configRes.data) {
      routingConfig.value = configRes.data
    }
    
    const txRes = await api.get('/api/pos/history')
    if(txRes.data) {
      transactions.value = txRes.data
    }
  } catch (e) {
    console.error(e)
    $q.notify({ type: 'negative', message: 'Failed to fetch gateway data' })
  } finally {
    loading.value = false
  }
}

async function saveConfig() {
  saving.value = true
  try {
    await api.post('/admin/pos/routing', routingConfig.value)
    $q.notify({ type: 'positive', message: 'Routing configuration updated successfully' })
  } catch (e) {
    console.error(e)
    $q.notify({ type: 'negative', message: 'Failed to update configuration' })
  } finally {
    saving.value = false
  }
}

function viewDetails(tx) {
  selectedTx.value = tx
  detailsDialog.value = true
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
/* Removed hardcoded white glass-card to support Quasar native dark/light modes */
</style>
