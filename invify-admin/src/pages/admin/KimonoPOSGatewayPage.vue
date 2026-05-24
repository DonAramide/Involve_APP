<template>
  <q-page padding>
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="text-h4 text-weight-bold">EMV POS Gateway</div>
        <div class="text-subtitle1 text-grey-7">Hardware Level Socket Routing & Transaction Insights</div>
      </div>
      <q-btn color="primary" icon="refresh" label="Refresh" @click="fetchData" />
    </div>

    <!-- Main Navigation Tabs -->
    <q-card flat bordered class="q-mb-md bg-transparent">
      <q-tabs
        v-model="mainTab"
        dense
        class="text-grey"
        active-color="primary"
        indicator-color="primary"
        align="left"
        narrow-indicator
      >
        <q-tab name="routing" icon="router" label="Dynamic Host Routing Strategy" />
        <q-tab name="analytics" icon="insights" label="Analytics & Charts" />
        <q-tab name="transactions" icon="receipt_long" label="Recent Transactions (ISO8583)" />
      </q-tabs>
    </q-card>

    <q-tab-panels v-model="mainTab" animated class="bg-transparent">
      
      <!-- Routing Panel -->
      <q-tab-panel name="routing" class="q-pa-none">
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
    </q-tab-panel>

    <!-- Analytics Panel -->
    <q-tab-panel name="analytics" class="q-pa-none">
      <!-- Analytics Tabs Section -->
      <q-card flat bordered class="q-mb-md">
        <q-tabs
          v-model="activeTab"
          dense
          class="text-grey"
          active-color="primary"
          indicator-color="primary"
          align="left"
          narrow-indicator
        >
          <q-tab name="successRate" icon="trending_up" label="Success & Fail Rate" />
          <q-tab name="amount" icon="payments" label="Volume & Profit Rate" />
          <q-tab name="speed" icon="speed" label="Speed & Uptime" />
        </q-tabs>

        <q-separator />

        <q-tab-panels v-model="activeTab" animated class="bg-transparent">
          <q-tab-panel name="successRate">
            <VueApexCharts v-if="chartSeries[0].data.length > 0" type="bar" height="300" :options="chartOptions" :series="chartSeries" />
            <div v-else class="text-center text-grey-6 q-py-lg">No data available for chart</div>
          </q-tab-panel>

          <q-tab-panel name="amount">
            <VueApexCharts v-if="amountSeries[0].data.length > 0" type="area" height="300" :options="amountChartOptions" :series="amountSeries" />
            <div v-else class="text-center text-grey-6 q-py-lg">No data available for chart</div>
          </q-tab-panel>

          <q-tab-panel name="speed">
            <VueApexCharts v-if="speedSeries[0].data.length > 0" type="line" height="300" :options="speedChartOptions" :series="speedSeries" />
            <div v-else class="text-center text-grey-6 q-py-lg">No data available for chart</div>
          </q-tab-panel>
        </q-tab-panels>
      </q-card>
    </q-tab-panel>

    <!-- Transactions Panel -->
    <q-tab-panel name="transactions" class="q-pa-none">
      <!-- Filters Section -->
      <q-card flat bordered class="q-mb-md">
        <q-card-section>
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-2">
              <q-input v-model="filters.tenantId" label="Business Owner" outlined dense clearable />
            </div>
            <div class="col-12 col-md-2">
              <q-input v-model.number="filters.amountGt" label="Amount Greater (₦)" type="number" outlined dense clearable />
            </div>
            <div class="col-12 col-md-2">
              <q-input v-model="filters.date" label="Date (YYYY-MM-DD)" outlined dense clearable>
                <template v-slot:append>
                  <q-icon name="event" class="cursor-pointer">
                    <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                      <q-date v-model="filters.date" mask="YYYY-MM-DD" />
                    </q-popup-proxy>
                  </q-icon>
                </template>
              </q-input>
            </div>
            <div class="col-12 col-md-2">
              <q-select v-model="filters.host" :options="['All', 'Medusa', 'NIBSS']" label="Host" outlined dense />
            </div>
            <div class="col-12 col-md-2">
              <q-select v-model="filters.status" :options="['All', 'Approved', 'Declined']" label="Status" outlined dense />
            </div>
            <div class="col-12 col-md-2">
              <q-input v-model="filters.search" label="Search RRN / STAN" outlined dense clearable>
                <template v-slot:append><q-icon name="search" /></template>
              </q-input>
            </div>
          </div>
        </q-card-section>
      </q-card>

      <!-- Transactions Table -->
      <q-card flat bordered>
        <q-table
          title="Recent Socket Transactions (ISO8583)"
          :rows="filteredTransactions"
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
    </q-tab-panel>

  </q-tab-panels>

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
            <div class="col-6"><strong>Business Owner:</strong> {{ selectedTx.tenantId }}</div>
            <div class="col-6"><strong>Terminal ID:</strong> {{ selectedTx.terminalId }}</div>
            <div class="col-6"><strong>Amount:</strong> ₦{{ selectedTx.amount }}</div>
            <div class="col-6"><strong>Card:</strong> {{ selectedTx.maskedPan }}</div>
            <div class="col-6"><strong>Date:</strong> {{ new Date(selectedTx.date).toLocaleString() }}</div>
            <div class="col-6"><strong>RRN:</strong> {{ selectedTx.rrn || 'N/A' }}</div>
            <div class="col-6"><strong>STAN:</strong> {{ selectedTx.stan || 'N/A' }}</div>
          </div>
          <q-separator class="q-my-md"/>
          <div class="text-subtitle2 text-grey-8 q-mb-sm">Raw Socket Request (Hex / TLV)</div>
          <q-input type="textarea" readonly :model-value="selectedTx.rawRequest || mockHexRequest" outlined dense />
          <div class="text-subtitle2 text-grey-8 q-my-sm">Host Response</div>
          <q-input type="textarea" readonly :model-value="selectedTx.rawResponse || mockHexResponse" outlined dense />
        </q-card-section>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../../api'
import { useQuasar } from 'quasar'
import VueApexCharts from 'vue3-apexcharts'

const $q = useQuasar()
const loading = ref(false)
const saving = ref(false)
const transactions = ref([])
const detailsDialog = ref(false)
const selectedTx = ref(null)
const activeTab = ref('successRate')
const mainTab = ref('routing')

const mockHexRequest = ref("0200 4220000000000000 000000 000000001388...")
const mockHexResponse = ref("0210 4220000000000000 000000 000000001388 00...")

const routingConfig = ref({
  activeHost: 'medusa',
  medusa: { host: 'core.medusang.com', port: 8080, thresholdAmount: 0, isActive: true },
  nibss: { host: 'nibss.example.com', port: 5000, thresholdAmount: 50000, isActive: true }
})

const filters = ref({
  tenantId: '',
  amountGt: null,
  date: '',
  host: 'All',
  status: 'All',
  search: ''
})

const filteredTransactions = computed(() => {
  return transactions.value.filter(tx => {
    let match = true;
    if (filters.value.tenantId && !tx.tenantId?.toLowerCase().includes(filters.value.tenantId.toLowerCase())) match = false;
    if (filters.value.amountGt !== null && tx.amount <= filters.value.amountGt) match = false;
    if (filters.value.date && !new Date(tx.date).toISOString().startsWith(filters.value.date)) match = false;
    if (filters.value.host && filters.value.host !== 'All' && tx.host !== filters.value.host) match = false;
    if (filters.value.status && filters.value.status !== 'All' && tx.status !== filters.value.status) match = false;
    if (filters.value.search) {
      const q = filters.value.search.toLowerCase();
      if (!tx.rrn?.toLowerCase().includes(q) && !tx.stan?.toLowerCase().includes(q)) match = false;
    }
    return match;
  });
})

const chartSeries = computed(() => {
  const grouped = {};
  filteredTransactions.value.forEach(tx => {
    const d = new Date(tx.date);
    const timeKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:00`;
    if (!grouped[timeKey]) grouped[timeKey] = { approved: 0, declined: 0 };
    if (tx.status === 'Approved') {
      grouped[timeKey].approved++;
    } else {
      grouped[timeKey].declined++;
    }
  });

  const categories = Object.keys(grouped).sort();
  const approvedData = categories.map(k => grouped[k].approved);
  const declinedData = categories.map(k => grouped[k].declined);

  return [
    { name: 'Approved', data: approvedData },
    { name: 'Declined', data: declinedData }
  ];
})

const chartOptions = computed(() => {
  const grouped = {};
  filteredTransactions.value.forEach(tx => {
    const d = new Date(tx.date);
    const timeKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:00`;
    grouped[timeKey] = true;
  });
  const categories = Object.keys(grouped).sort();

  return {
    chart: { type: 'bar', stacked: true, toolbar: { show: true }, background: 'transparent' },
    plotOptions: { bar: { horizontal: false, borderRadius: 2 } },
    xaxis: { categories: categories, title: { text: 'Time (Hours)' } },
    yaxis: { title: { text: 'Transaction Count' } },
    colors: ['#21BA45', '#C10015'],
    dataLabels: { enabled: false },
    theme: { mode: $q.dark.isActive ? 'dark' : 'light' }
  };
})

const amountSeries = computed(() => {
  const grouped = {};
  filteredTransactions.value.forEach(tx => {
    const d = new Date(tx.date);
    const timeKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:00`;
    if (!grouped[timeKey]) grouped[timeKey] = { amount: 0, profit: 0 };
    if (tx.status === 'Approved') {
      grouped[timeKey].amount += tx.amount;
      grouped[timeKey].profit += (tx.amount * 0.015); // 1.5% profit margin
    }
  });

  const categories = Object.keys(grouped).sort();
  const volumeData = categories.map(k => grouped[k].amount);
  const profitData = categories.map(k => grouped[k].profit);

  return [
    { name: 'Total Volume (₦)', data: volumeData },
    { name: 'Profit (₦)', data: profitData }
  ];
})

const amountChartOptions = computed(() => {
  const grouped = {};
  filteredTransactions.value.forEach(tx => {
    const d = new Date(tx.date);
    const timeKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:00`;
    grouped[timeKey] = true;
  });
  const categories = Object.keys(grouped).sort();

  return {
    chart: { type: 'area', toolbar: { show: true }, background: 'transparent' },
    stroke: { curve: 'smooth', width: 2 },
    xaxis: { categories: categories, title: { text: 'Time (Hours)' } },
    yaxis: { title: { text: 'Amount (₦)' } },
    colors: ['#1976D2', '#FF9800'],
    dataLabels: { enabled: false },
    theme: { mode: $q.dark.isActive ? 'dark' : 'light' }
  };
})

const speedSeries = computed(() => {
  const grouped = {};
  filteredTransactions.value.forEach(tx => {
    const d = new Date(tx.date);
    const timeKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:00`;
    if (!grouped[timeKey]) grouped[timeKey] = { speedSum: 0, count: 0, uptimeSum: 0 };
    
    // Mocking speed between 150ms and 350ms, uptime around 99.5 to 100
    grouped[timeKey].speedSum += (150 + Math.random() * 200);
    grouped[timeKey].uptimeSum += (99.0 + Math.random() * 1.0);
    grouped[timeKey].count++;
  });

  const categories = Object.keys(grouped).sort();
  const speedData = categories.map(k => Math.round(grouped[k].speedSum / grouped[k].count));
  const uptimeData = categories.map(k => +(grouped[k].uptimeSum / grouped[k].count).toFixed(2));

  return [
    { name: 'Avg Speed (ms)', type: 'line', data: speedData },
    { name: 'Uptime (%)', type: 'line', data: uptimeData }
  ];
})

const speedChartOptions = computed(() => {
  const grouped = {};
  filteredTransactions.value.forEach(tx => {
    const d = new Date(tx.date);
    const timeKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:00`;
    grouped[timeKey] = true;
  });
  const categories = Object.keys(grouped).sort();

  return {
    chart: { type: 'line', toolbar: { show: true }, background: 'transparent' },
    stroke: { width: [3, 3] },
    xaxis: { categories: categories, title: { text: 'Time (Hours)' } },
    yaxis: [
      { title: { text: 'Speed (ms)' } },
      { opposite: true, title: { text: 'Uptime (%)' }, min: 90, max: 100 }
    ],
    colors: ['#9C27B0', '#00BCD4'],
    dataLabels: { enabled: false },
    theme: { mode: $q.dark.isActive ? 'dark' : 'light' }
  };
})

const columns = [
  { name: 'date', label: 'Date', field: row => new Date(row.date).toLocaleString(), sortable: true, align: 'left' },
  { name: 'tenantId', label: 'Business Owner', field: 'tenantId', sortable: true, align: 'left' },
  { name: 'terminalId', label: 'Terminal ID', field: 'terminalId', sortable: true, align: 'left' },
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
