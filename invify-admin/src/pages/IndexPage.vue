<!-- invify-admin/src/pages/IndexPage.vue -->
<template>
  <q-page class="q-pa-lg">
    <!-- Dashboard Header -->
    <div class="row items-center q-mb-xl">
      <div class="col">
        <h1 class="text-h4 text-weight-bold q-ma-none text-main letter-spacing-1">
          System <span class="text-indigo-4">Overview</span>
        </h1>
        <p class="text-muted q-mt-sm">Real-time metrics across your multi-tenant SaaS platform.</p>
      </div>
      <div class="col-auto">
        <q-btn outline color="indigo-4" icon="download" label="Export Report" class="q-px-md" />
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="row q-col-gutter-lg q-mb-xl">
      <div v-for="stat in stats" :key="stat.label" class="col-12 col-md-3">
        <q-card class="bg-panel text-main shadow-2 q-pa-md hover-scale border-indigo no-shadow">
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
        <q-card class="bg-panel text-main shadow-2 no-shadow">
          <q-card-section class="row items-center">
            <div class="text-h6 text-indigo-3">Recent Ledger Activity</div>
            <q-space />
            <q-btn flat dense color="indigo-4" label="View All" to="/ledger" />
          </q-card-section>

          <q-separator :dark="prefs.isDarkMode" />

          <q-list :dark="prefs.isDarkMode" padding>
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
            <q-linear-progress :value="0.84" color="cyan-4" class="q-mt-sm q-mb-md" />
            <q-btn 
              flat 
              dense 
              color="cyan-3" 
              icon="note_alt" 
              label="Launch AI Lesson Planner Hub" 
              to="/notes" 
              class="fit text-weight-bold q-py-xs bg-[#121b2d] hover-scale" 
            />
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Enterprise SaaS Configuration Lookup Matrix -->
    <div class="row q-col-gutter-lg q-mt-lg">
      <div class="col-12">
        <q-card class="bg-[#0b0f19] text-white border-indigo shadow-2 no-shadow" style="border: 1px solid rgba(99, 102, 241, 0.2); border-radius: 12px;">
          <q-card-section class="row items-center justify-between q-pb-none">
            <div>
              <div class="text-h6 text-indigo-3 text-weight-bold">
                <q-icon name="dns" class="q-mr-xs" /> SaaS Configuration Lookup Matrix
              </div>
              <div class="text-caption text-grey-5">Maintain global gateway integrations, industry modes, and core dropdown values.</div>
            </div>
            <q-btn color="indigo-7" icon="save" label="Publish Changes" @click="saveLookupData" :loading="saving" class="font-mono text-weight-bold" />
          </q-card-section>

          <q-card-section class="row q-col-gutter-md q-pt-md">
            <!-- Selectable Integration Gateways -->
            <div class="col-12 col-md-6">
              <div class="bg-[#101625] border-grey-9 q-pa-md rounded-borders h-full" style="border: 1px solid rgba(255, 255, 255, 0.04);">
                <div class="row items-center justify-between q-mb-md">
                  <span class="text-subtitle2 text-weight-bold text-indigo-4"><q-icon name="credit_card" /> Payment Integration Gateways</span>
                  <q-btn size="xs" color="indigo-6" icon="add" label="Add Gateway" @click="addGateway" />
                </div>
                <q-list separator dark class="rounded-borders" style="background: rgba(0,0,0,0.15);">
                  <q-item v-for="(gw, index) in gateways" :key="index" class="q-py-sm">
                    <q-item-section avatar>
                      <q-icon :name="gw.icon || 'credit_card'" color="indigo-3" size="sm" />
                    </q-item-section>
                    <q-item-section>
                      <q-input v-model="gw.label" dark dense label="Gateway Display Name" class="font-mono text-caption" />
                    </q-item-section>
                    <q-item-section>
                      <q-input v-model="gw.id" dark dense label="System Identifier" class="font-mono text-caption" />
                    </q-item-section>
                    <q-item-section side>
                      <q-btn flat round color="red-4" icon="delete" size="sm" @click="removeGateway(index)" />
                    </q-item-section>
                  </q-item>
                  <q-item v-if="gateways.length === 0">
                    <q-item-section class="text-center text-grey-6 text-caption q-py-md">No gateways configured.</q-item-section>
                  </q-item>
                </q-list>
              </div>
            </div>

            <!-- Core Industry Operating Modes -->
            <div class="col-12 col-md-6">
              <div class="bg-[#101625] border-grey-9 q-pa-md rounded-borders h-full" style="border: 1px solid rgba(255, 255, 255, 0.04);">
                <div class="row items-center justify-between q-mb-md">
                  <span class="text-subtitle2 text-weight-bold text-indigo-4"><q-icon name="corporate_fare" /> Active Industry Modes</span>
                  <q-btn size="xs" color="indigo-6" icon="add" label="Add Industry" @click="addIndustry" />
                </div>
                <q-list separator dark class="rounded-borders" style="background: rgba(0,0,0,0.15);">
                  <q-item v-for="(ind, index) in industries" :key="index" class="q-py-sm column">
                    <div class="row items-center full-width no-wrap">
                      <q-item-section avatar>
                        <q-icon :name="ind.icon || 'business'" color="indigo-3" size="sm" />
                      </q-item-section>
                      <q-item-section>
                        <q-input v-model="ind.label" dark dense label="Industry Name" class="font-mono text-caption" />
                      </q-item-section>
                      <q-item-section>
                        <q-input v-model="ind.id" dark dense label="System ID" class="font-mono text-caption" />
                      </q-item-section>
                      <q-item-section side>
                        <q-btn flat round color="red-4" icon="delete" size="sm" @click="removeIndustry(index)" />
                      </q-item-section>
                    </div>
                    <div class="full-width q-mt-xs q-px-sm">
                      <q-input v-model="ind.desc" dark dense label="Detailed Description (visible to tenant during onboarding)" class="font-mono text-caption" />
                    </div>
                  </q-item>
                  <q-item v-if="industries.length === 0">
                    <q-item-section class="text-center text-grey-6 text-caption q-py-md">No industries configured.</q-item-section>
                  </q-item>
                </q-list>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { useQuasar } from 'quasar'
import { useOperatorPreferences } from '../composables/useOperatorPreferences'

const $q = useQuasar()
const { prefs } = useOperatorPreferences()

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

const gateways = ref([])
const industries = ref([])
const saving = ref(false)

const loadLookupConfig = async () => {
  try {
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3004'
    const res = await axios.get(`${API_BASE}/public/lookup`)
    if (res.data) {
      gateways.value = res.data.gateways || []
      industries.value = res.data.industries || []
    }
  } catch (err) {
    console.error('Failed to load lookup configurations:', err)
  }
}

onMounted(() => {
  loadLookupConfig()
})

const addGateway = () => {
  gateways.value.push({ id: 'new_gateway', label: 'New Payment Provider', icon: 'payments' })
}

const removeGateway = (index) => {
  gateways.value.splice(index, 1)
}

const addIndustry = () => {
  industries.value.push({ id: 'new_industry', label: 'New Business Sector', icon: 'business', desc: 'Custom configured SaaS modules and checkout flows.' })
}

const removeIndustry = (index) => {
  industries.value.splice(index, 1)
}

const saveLookupData = async () => {
  saving.value = true
  try {
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3004'
    const res = await axios.post(`${API_BASE}/admin/lookup`, {
      gateways: gateways.value,
      industries: industries.value
    })
    if (res.status === 200) {
      $q.notify({
        type: 'positive',
        message: 'Platform Lookup Matrix published successfully!'
      })
      loadLookupConfig()
    }
  } catch (err) {
    console.error(err)
    $q.notify({
      type: 'negative',
      message: 'Failed to publish lookup configurations: ' + (err.response?.data?.error || err.message)
    })
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.letter-spacing-1 {
  letter-spacing: 1px;
}
.bg-blue-grey-10 {
  background: var(--enterprise-panel-bg);
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
