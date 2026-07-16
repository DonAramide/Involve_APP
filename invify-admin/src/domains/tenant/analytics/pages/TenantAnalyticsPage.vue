<template>
  <q-page class="q-pa-lg text-white" style="background: #05070d; min-height: 100vh;">
    <div class="row items-center justify-between q-mb-xl">
      <div>
        <div class="row items-center op-gap-8 no-wrap">
          <q-icon name="insights" color="cyan-3" size="md" />
          <h1 class="text-h4 text-weight-bolder text-white q-my-none letter-spacing-1">Student Analytics</h1>
        </div>
        <div class="text-caption text-grey-5 q-mt-xs">
          Real-time business telemetry and predictive insights.
        </div>
      </div>
    </div>
    
    <!-- Summary Cards -->
    <div class="row q-col-gutter-lg q-mb-lg">
      <div class="col-12 col-md-4">
        <q-card class="bg-card-dark border-grey-9 q-pa-lg row items-center justify-between">
          <div>
            <div class="text-caption text-grey-5 text-uppercase">Total Students</div>
            <div class="text-h4 text-weight-bold font-mono q-mt-sm">{{ metrics.totalStudents }}</div>
          </div>
          <q-icon name="people" color="blue-4" size="xl" />
        </q-card>
      </div>
      <div class="col-12 col-md-4">
        <q-card class="bg-card-dark border-grey-9 q-pa-lg row items-center justify-between">
          <div>
            <div class="text-caption text-grey-5 text-uppercase">Fully Paid</div>
            <div class="text-h4 text-weight-bold font-mono q-mt-sm text-green-4">
              {{ metrics.paidCount }}
              <span class="text-caption text-grey-5">({{ metrics.totalStudents ? Math.round((metrics.paidCount / metrics.totalStudents) * 100) : 0 }}%)</span>
            </div>
          </div>
          <q-icon name="check_circle" color="green-4" size="xl" />
        </q-card>
      </div>
      <div class="col-12 col-md-4">
        <q-card class="bg-card-dark border-grey-9 q-pa-lg row items-center justify-between">
          <div>
            <div class="text-caption text-grey-5 text-uppercase">Owing</div>
            <div class="text-h4 text-weight-bold font-mono q-mt-sm text-red-4">
              {{ metrics.owingCount }}
              <span class="text-caption text-grey-5">(₦{{ metrics.totalOwingValue?.toLocaleString() }})</span>
            </div>
          </div>
          <q-icon name="warning" color="red-4" size="xl" />
        </q-card>
      </div>
    </div>

    <!-- Charts Row 1 -->
    <div class="row q-col-gutter-lg q-mb-lg">
      <!-- Payment Status Donut -->
      <div class="col-12 col-md-4">
        <q-card class="bg-card-dark border-grey-9 q-pa-lg fit">
          <div class="text-h6 text-weight-bold q-mb-md">Payment Status</div>
          <apexchart 
            type="donut" 
            height="250" 
            :options="paymentChartOptions" 
            :series="charts.paymentStatus?.series || []"
          ></apexchart>
        </q-card>
      </div>
      
      <!-- Students per Class Bar Chart -->
      <div class="col-12 col-md-8">
        <q-card class="bg-card-dark border-grey-9 q-pa-lg fit">
          <div class="text-h6 text-weight-bold q-mb-md">Students per Class</div>
          <apexchart 
            type="bar" 
            height="250" 
            :options="classChartOptions" 
            :series="charts.studentsPerClass?.series || []"
          ></apexchart>
        </q-card>
      </div>
    </div>

    <!-- Charts Row 2 -->
    <div class="row q-col-gutter-lg">
      <div class="col-12 col-md-6">
        <q-card class="bg-card-dark border-grey-9 q-pa-lg">
          <div class="text-h6 text-weight-bold q-mb-md">Revenue Trend</div>
          <apexchart 
            type="area" 
            height="300" 
            :options="revenueChartOptions" 
            :series="charts.revenueTrend?.series || []"
          ></apexchart>
        </q-card>
      </div>

      <!-- Owing Students Table -->
      <div class="col-12">
        <q-card class="bg-card-dark border-grey-9 q-pa-lg">
          <div class="text-h6 text-weight-bold q-mb-md">Owing Students</div>
          <q-table
            :rows="filteredOwingStudents"
            :columns="studentColumns"
            row-key="id"
            dark
            flat
            bordered
            class="bg-card-dark cursor-pointer"
            :filter="searchQuery"
            @row-click="goToProfile"
          >
            <template v-slot:top>
              <div class="row w-100 justify-between items-center full-width">
                <q-input 
                  v-model="searchQuery" 
                  dark 
                  dense 
                  outlined 
                  placeholder="Search by name..." 
                  class="col-12 col-md-4"
                >
                  <template v-slot:append>
                    <q-icon name="search" />
                  </template>
                </q-input>
                
                <q-select 
                  v-model="selectedClass" 
                  :options="classOptions" 
                  dark 
                  dense 
                  outlined 
                  placeholder="Filter by Class" 
                  class="col-12 col-md-3 q-ml-md"
                  clearable
                />
              </div>
            </template>
            <template v-slot:body-cell-balance="props">
              <q-td :props="props" class="text-red-4 font-mono">
                ₦{{ props.value?.toLocaleString() }}
              </q-td>
            </template>
          </q-table>
        </q-card>
      </div>
    </div>

  </q-page>
</template>

<script setup>
import { onMounted, computed, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useTenantAnalyticsStore } from '../stores/tenantAnalyticsStore';
import { useRouter } from 'vue-router';
import VueApexCharts from 'vue3-apexcharts';

// Register locally if not registered globally
const apexchart = VueApexCharts;

const store = useTenantAnalyticsStore();
const router = useRouter();
const { metrics, charts } = storeToRefs(store);

const searchQuery = ref('');
const selectedClass = ref(null);

const studentColumns = [
  { name: 'name', label: 'STUDENT NAME', align: 'left', field: 'name', sortable: true },
  { name: 'className', label: 'CLASS', align: 'center', field: 'className', sortable: true },
  { name: 'phone', label: 'PHONE', align: 'center', field: 'phone', sortable: true },
  { name: 'balance', label: 'OWING AMOUNT (₦)', align: 'right', field: 'balance', sortable: true, sort: (a, b) => a - b }
];

const classOptions = computed(() => {
  const classes = new Set(charts.value.owingStudents?.map(s => s.className));
  return Array.from(classes).sort();
});

const filteredOwingStudents = computed(() => {
  let data = charts.value.owingStudents || [];
  if (selectedClass.value) {
    data = data.filter(s => s.className === selectedClass.value);
  }
  return data;
});

onMounted(() => {
  store.loadMetrics();
});

const goToProfile = (evt, row) => {
  router.push(`/tenant/users/${row.id}?tab=payments`);
};

// Chart Options Configured for Dark Mode
const paymentChartOptions = computed(() => ({
  labels: charts.value.paymentStatus?.labels || [],
  colors: ['#4ade80', '#f87171'],
  chart: { foreColor: '#9ca3af' },
  dataLabels: { enabled: true },
  legend: { position: 'bottom' },
  stroke: { show: false },
  plotOptions: {
    pie: {
      donut: {
        size: '65%',
        labels: {
          show: true,
          name: { show: true },
          value: { show: true, color: '#fff' }
        }
      }
    }
  }
}));

const classChartOptions = computed(() => ({
  chart: { foreColor: '#9ca3af', toolbar: { show: false } },
  colors: ['#38bdf8'],
  xaxis: {
    categories: charts.value.studentsPerClass?.categories || [],
    labels: { style: { colors: '#9ca3af' } }
  },
  yaxis: { labels: { style: { colors: '#9ca3af' } } },
  plotOptions: {
    bar: { borderRadius: 4, horizontal: false, columnWidth: '40%' }
  },
  dataLabels: { enabled: false },
  grid: { borderColor: 'rgba(255,255,255,0.05)' }
}));

const revenueChartOptions = computed(() => ({
  chart: { foreColor: '#9ca3af', toolbar: { show: false } },
  colors: ['#818cf8'],
  fill: {
    type: 'gradient',
    gradient: { shadeIntensity: 1, opacityFrom: 0.7, opacityTo: 0.1, stops: [0, 90, 100] }
  },
  xaxis: {
    categories: charts.value.revenueTrend?.categories || [],
    labels: { style: { colors: '#9ca3af' } }
  },
  yaxis: {
    labels: { 
      style: { colors: '#9ca3af' },
      formatter: (val) => '₦' + (val / 1000000).toFixed(1) + 'M'
    }
  },
  dataLabels: { enabled: false },
  stroke: { curve: 'smooth', width: 2 },
  grid: { borderColor: 'rgba(255,255,255,0.05)' }
}));
</script>

<style scoped>
.bg-card-dark { background: #0b0f19; }
.border-grey-9 { border: 1px solid rgba(255,255,255,0.06); }
.letter-spacing-1 { letter-spacing: 1px; }
.font-mono { font-family: 'Courier New', Courier, monospace; }
</style>
