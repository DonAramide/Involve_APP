<!-- invify-admin/src/pages/AnalyticsPage.vue -->
<template>
  <q-page class="q-pa-lg bg-dark text-white">
    <!-- Header -->
    <div class="row items-center q-mb-xl">
      <div class="col">
        <h1 class="text-h4 text-weight-bolder q-ma-none text-white letter-spacing-1">Usage & Growth Intelligence</h1>
        <div class="text-grey-6">Real-time platform signals, school activation, and revenue performance.</div>
      </div>
      <div class="col-auto">
        <q-btn flat icon="refresh" color="indigo-4" label="Refresh Data" @click="fetchAnalytics" :loading="loading" />
      </div>
    </div>

    <!-- 1. KPI Pulse (Top Row) -->
    <div class="row q-col-gutter-lg q-mb-xl">
       <div class="col-12 col-sm-6 col-md-3" v-for="kpi in kpis" :key="kpi.label">
          <q-card class="bg-blue-grey-10 shadow-5 border-indigo-accent q-pa-md">
             <div class="text-caption text-grey-6 text-uppercase text-weight-bold">{{ kpi.label }}</div>
             <div class="row items-center q-mt-sm">
                <div class="text-h4 text-weight-bolder">{{ kpi.value }}</div>
                <q-icon :name="kpi.icon" :color="kpi.color" size="sm" class="q-ml-sm" />
             </div>
             <div class="text-caption text-grey-8 q-mt-xs">{{ kpi.sub }}</div>
          </q-card>
       </div>
    </div>

    <div class="row q-col-gutter-lg">
       <!-- 2. Usage Trends -->
       <div class="col-12 col-md-8">
          <q-card class="bg-blue-grey-10 shadow-5 q-pa-lg border-indigo h-100">
             <div class="row items-center q-mb-lg">
                <div class="text-h6 text-weight-bold">Intelligence Funnel</div>
                <q-space />
                <div class="text-caption text-grey-6">Signup → Activate → Retention</div>
             </div>
             
             <!-- Simple Funnel Component -->
             <div class="q-mt-xl row justify-around text-center no-wrap">
                <div class="funnel-step" style="width: 30%">
                   <div class="text-h5 text-weight-bolder">{{ stats?.funnel?.signups }}</div>
                   <div class="text-caption text-grey-6">TOTAL SIGNUPS</div>
                </div>
                <div class="funnel-connector flex flex-center"><q-icon name="chevron_right" color="grey-8" /></div>
                <div class="funnel-step" style="width: 30%">
                   <div class="text-h5 text-weight-bolder text-green-4">{{ stats?.funnel?.activation }}</div>
                   <div class="text-caption text-grey-6">ACTIVATED SCHOOLS</div>
                   <div class="text-caption text-green-7">{{ stats?.activation?.onboardingCompletionRate }}% Conversion</div>
                </div>
                <div class="funnel-connector flex flex-center"><q-icon name="chevron_right" color="grey-8" /></div>
                <div class="funnel-step" style="width: 30%">
                   <div class="text-h5 text-weight-bolder text-indigo-4">{{ stats?.activation?.wau }}</div>
                   <div class="text-caption text-grey-6">ACTIVE (7-DAY)</div>
                   <div class="text-caption text-indigo-7">Retention Health</div>
                </div>
             </div>

             <q-separator dark class="q-my-xl" />

             <div class="text-subtitle2 text-grey-4 q-mb-md">Cache vs. AI Performance</div>
             <div class="row q-gutter-lg">
                <div class="col-auto">
                   <div class="text-h3 text-weight-bolder text-indigo-4">{{ stats?.usage?.cacheHitRate }}%</div>
                   <div class="text-caption text-grey-6">Cache Hit Rate</div>
                </div>
                <q-separator vertical dark />
                <div class="col">
                   <q-linear-progress :value="stats?.usage?.cacheHitRate / 100" color="indigo-4" class="q-mt-sm" track-color="blue-grey-11" />
                   <div class="text-caption text-grey-6 q-mt-xs">Optimizing cost efficiency is key to scaling Invify profitably.</div>
                </div>
             </div>
          </q-card>
       </div>

       <!-- 3. Revenue Distribution -->
       <div class="col-12 col-md-4">
          <q-card class="bg-blue-grey-10 shadow-5 q-pa-lg border-indigo h-100">
             <div class="text-h6 text-weight-bold q-mb-lg">Revenue Mix</div>
             <div class="text-center q-pa-md">
                <div class="text-h3 text-weight-bolder text-green-4 q-mb-xs">
                   <span class="text-caption">₦</span>{{ (stats?.revenue?.mrrEstimate || 0).toLocaleString() }}
                </div>
                <div class="text-subtitle2 text-grey-4 uppercase letter-spacing-1">Estimated MRR</div>
             </div>

             <q-list dark separator class="q-mt-lg rounded-borders bg-dark">
                <q-item v-for="(count, plan) in stats?.revenue?.planDistribution" :key="plan">
                   <q-item-section>
                      <q-item-label class="text-uppercase text-weight-bold text-indigo-3">{{ plan }}</q-item-label>
                      <q-item-label caption class="text-grey-6">{{ (count / stats?.revenue?.payingSchools * 100).toFixed(0) || 0 }}% of paying base</q-item-label>
                   </q-item-section>
                   <q-item-section side class="text-h6 text-weight-bolder text-white">
                      {{ count }}
                   </q-item-section>
                </q-item>
             </q-list>

             <div class="q-mt-xl text-center">
                <q-btn flat label="View Financial Ledger" icon="receipt_long" color="grey-6" size="sm" to="/admin/ledger" />
             </div>
          </q-card>
       </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { adminApi } from '../api'

const loading = ref(true)
const stats = ref(null)

const kpis = computed(() => {
  if (!stats.value) return []
  return [
    { label: 'Active (7-Day)', value: stats.value.activation.wau, icon: 'bolt', color: 'indigo-4', sub: 'Weekly Active Schools' },
    { label: 'Cache Hit Rate', value: stats.value.usage.cacheHitRate + '%', icon: 'speed', color: 'green-4', sub: 'Cost efficiency signal' },
    { label: 'Staff Population', value: stats.value.growth.totalTeachers, icon: 'people', color: 'blue-4', sub: 'Total registered teachers' },
    { label: 'MRR (Est)', value: '₦' + (stats.value.revenue.mrrEstimate || 0).toLocaleString(), icon: 'trending_up', color: 'teal-4', sub: 'Monthly Recurring Revenue' }
  ]
})

const fetchAnalytics = async () => {
  loading.value = true
  try {
    const { data } = await adminApi.getAnalytics()
    stats.value = data
  } finally {
    loading.value = false
  }
}

onMounted(fetchAnalytics)
</script>

<style scoped>
.letter-spacing-1 { letter-spacing: 1px; }
.bg-blue-grey-10 { background: #1c262b; }
.border-indigo { border-left: 5px solid #3f51b5; }
.border-indigo-accent { border-bottom: 4px solid #3f51b5; }
.funnel-step { border: 1px solid #263238; padding: 20px; border-radius: 12px; background: #0f172a; }
.h-100 { height: 100%; }
</style>
