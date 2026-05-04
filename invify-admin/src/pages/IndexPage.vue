<!-- invify-admin/src/pages/IndexPage.vue -->
<template>
  <q-page class="q-pa-lg">
    <!-- Dashboard Header -->
    <div class="row items-center q-mb-xl">
      <div class="col">
        <h1 class="text-h4 text-weight-bold q-ma-none text-white letter-spacing-1">
          System <span class="text-indigo-4">Overview</span>
        </h1>
        <p class="text-grey-5 q-mt-sm">Real-time metrics across your multi-tenant SaaS platform.</p>
      </div>
      <div class="col-auto">
        <q-btn outline color="indigo-4" icon="download" label="Export Report" class="q-px-md" />
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="row q-col-gutter-lg q-mb-xl">
      <div v-for="stat in stats" :key="stat.label" class="col-12 col-md-3">
        <q-card class="bg-blue-grey-10 text-white shadow-2 q-pa-md hover-scale border-indigo">
          <q-card-section horizontal class="items-center">
            <q-card-section>
              <div class="text-overline text-grey-5">{{ stat.label }}</div>
              <div class="text-h5 text-weight-bolder text-cyan-4">{{ stat.value }}</div>
              <div class="text-caption text-indigo-4 q-mt-xs">
                <q-icon :name="stat.trend > 0 ? 'trending_up' : 'trending_down'" />
                {{ Math.abs(stat.trend) }}% from last month
              </div>
            </q-card-section>
            <q-space />
            <q-card-section>
              <q-icon :name="stat.icon" size="44px" class="text-indigo-9 opacity-40" />
            </q-card-section>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Middle Section: Recent Activity & AI Insights -->
    <div class="row q-col-gutter-lg">
      <!-- Recent Ledger Activity -->
      <div class="col-12 col-lg-8">
        <q-card class="bg-blue-grey-10 text-white shadow-2">
          <q-card-section class="row items-center">
            <div class="text-h6 text-indigo-3">Recent Ledger Activity</div>
            <q-space />
            <q-btn flat dense color="indigo-4" label="View All" to="/ledger" />
          </q-card-section>

          <q-separator dark />

          <q-list dark padding>
            <q-item v-for="tx in recentTransactions" :key="tx.ref" clickable>
              <q-item-section avatar>
                <q-avatar :icon="tx.amount > 0 ? 'arrow_upward' : 'arrow_downward'" 
                          :color="tx.amount > 0 ? 'green-10' : 'red-10'" 
                          text-color="white" />
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-weight-medium">{{ tx.tenant }}</q-item-label>
                <q-item-label caption class="text-grey-6">{{ tx.ref }} • {{ tx.date }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <div :class="tx.amount > 0 ? 'text-green-4' : 'text-red-4'" class="text-weight-bold">
                  {{ tx.amount > 0 ? '+' : '' }}{{ tx.amount.toLocaleString() }} NGN
                </div>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </div>

      <!-- Quick AI Stats -->
      <div class="col-12 col-lg-4">
        <q-card class="bg-indigo-10 text-white shadow-2 glossy">
          <q-card-section>
            <div class="text-h6">AI Efficiency</div>
            <div class="text-caption text-indigo-2">Lesson Notes Caching Metrics</div>
          </q-card-section>
          
          <q-card-section class="text-center q-py-xl">
            <div class="text-h2 text-weight-bolder text-cyan-4">84%</div>
            <div class="text-subtitle1 text-grey-4">Global Cache Hit Rate</div>
          </q-card-section>

          <q-separator dark />

          <q-card-section>
            <div class="row items-center q-mb-sm">
              <div class="text-caption text-grey-4">Tokens Saved This Week</div>
              <q-space />
              <div class="text-weight-bold">12.4M</div>
            </div>
            <q-linear-progress :value="0.84" color="cyan-4" class="q-mt-sm" />
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
const stats = [
  { label: 'Platform Revenue', value: '₦4.2M', icon: 'payments', trend: 12.5 },
  { label: 'Active Tenants', value: '184', icon: 'business', trend: 4.2 },
  { label: 'AI Generations', value: '54,208', icon: 'psychology', trend: 28.1 },
  { label: 'Active Subscriptions', value: '142', icon: 'receipt_long', trend: -2.4 }
]

const recentTransactions = [
  { tenant: 'Heritage High School', ref: 'QU-847291', date: '2 min ago', amount: 50000 },
  { tenant: 'QuickShop Retail', ref: 'QU-847285', date: '15 min ago', amount: -12500 },
  { tenant: 'St. Jude Academy', ref: 'QU-847244', date: '1 hour ago', amount: 25000 },
  { tenant: 'BlueWave Services', ref: 'QU-847212', date: '3 hours ago', amount: 15000 }
]
</script>

<style scoped>
.letter-spacing-1 {
  letter-spacing: 1px;
}
.bg-blue-grey-10 {
  background: #1c262b;
}
.border-indigo {
  border-left: 5px solid #3f51b5;
}
.hover-scale {
  transition: transform 0.2s ease-in-out;
}
.hover-scale:hover {
  transform: scale(1.02);
}
.opacity-40 {
  opacity: 0.4;
}
</style>
