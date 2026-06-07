<template>
  <q-page class="q-pa-md bg-main text-main font-inter column op-gap-16">
    <div class="row items-center justify-between border-bottom q-pb-sm shrink-0">
      <div class="row items-center op-gap-8 no-wrap">
        <q-icon name="cases" size="sm" color="amber-4" />
        <div>
          <div class="text-operator-title text-weight-bold" style="font-size: 16px;">TENANT PORTFOLIO</div>
          <div class="text-metric-mono text-muted" style="font-size: 10px;">ACTIVE BUSINESSES UNDER MANAGEMENT</div>
        </div>
      </div>
      <q-input dark dense filled v-model="search" placeholder="Search portfolio..." class="bg-panel-darker" style="width: 250px">
        <template v-slot:append>
          <q-icon name="search" color="amber-4" />
        </template>
      </q-input>
    </div>

    <div class="row op-gap-16 shrink-0">
      <div class="col panel-card bg-panel border-muted rounded-borders q-pa-md row items-center justify-between">
        <div>
          <div class="text-caption text-muted">Total Active</div>
          <div class="text-h4 text-weight-bold text-main">
            <q-spinner v-if="loading" size="sm" />
            <span v-else>{{ tenants.filter(t => t.status === 'ACTIVE').length }}</span>
          </div>
        </div>
        <q-icon name="check_circle" color="green-4" size="lg" />
      </div>
      <div class="col panel-card bg-panel border-muted rounded-borders q-pa-md row items-center justify-between">
        <div>
          <div class="text-caption text-muted">Onboarding</div>
          <div class="text-h4 text-weight-bold text-amber-4">
            <q-spinner v-if="loading" size="sm" />
            <span v-else>{{ tenants.filter(t => t.status === 'ONBOARDING').length }}</span>
          </div>
        </div>
        <q-icon name="pending" color="amber-4" size="lg" />
      </div>
      <div class="col panel-card bg-panel border-muted rounded-borders q-pa-md row items-center justify-between">
        <div>
          <div class="text-caption text-muted">Total Volume</div>
          <div class="text-h4 text-weight-bold text-cyan-3">
            <q-spinner v-if="loading" size="sm" />
            <span v-else>${{ tenants.reduce((acc, t) => acc + (t.volume || 0), 0).toLocaleString() }}</span>
          </div>
        </div>
        <q-icon name="payments" color="cyan-3" size="lg" />
      </div>
    </div>

    <div class="col column border-muted rounded-borders bg-panel overflow-hidden">
      <div class="panel-header bg-panel-darker q-px-sm q-py-xs border-bottom row items-center op-gap-4 shrink-0">
        <q-icon name="list" size="xs" color="amber-4" />
        <span class="text-operator-title text-weight-bold" style="font-size: 12px;">PORTFOLIO ACCOUNTS</span>
      </div>
      
      <!-- Loading State -->
      <div v-if="loading" class="flex flex-center q-pa-xl">
        <q-spinner color="amber-4" size="3em" />
      </div>

      <!-- Empty State -->
      <div v-else-if="!loading && tenants.length === 0" class="flex flex-center q-pa-xl text-center column op-gap-8">
        <q-icon name="cases" size="xl" color="grey-8" />
        <div class="text-muted text-weight-bold">No tenants onboarded yet</div>
        <q-btn outline color="amber-4" label="Onboard First Tenant" />
      </div>

      <div v-else class="col overflow-auto custom-scrollbar">
        <table class="enterprise-table full-width text-left" style="border-collapse: collapse;">
          <thead class="bg-panel-darker text-muted text-metric-mono text-weight-bold border-bottom sticky-header" style="font-size: 10px;">
            <tr>
              <th class="q-pa-sm">Business Name</th>
              <th class="q-pa-sm">Industry</th>
              <th class="q-pa-sm">Health Score</th>
              <th class="q-pa-sm">Monthly Vol</th>
              <th class="q-pa-sm">Status</th>
            </tr>
          </thead>
          <tbody class="text-caption" style="font-size: 12px;">
            <tr v-for="t in filteredTenants" :key="t.id" class="border-bottom-light hover-row cursor-pointer" @click="openMerchantDetail(t)">
              <td class="q-pa-sm text-main text-weight-bold">{{ t.business_name || t.businessName || 'Unknown' }}</td>
              <td class="q-pa-sm text-muted">{{ t.industry_type || t.industry || 'Unknown' }}</td>
              <td class="q-pa-sm">
                <q-linear-progress :value="t.health / 100" color="green-4" track-color="grey-9" class="q-mt-xs" style="width: 60px" />
                <span class="text-metric-mono text-muted q-ml-sm" style="font-size: 10px;">{{ t.health }}</span>
              </td>
              <td class="q-pa-sm text-metric-mono text-main">${{ t.volume.toLocaleString() }}</td>
              <td class="q-pa-sm">
                <q-badge :color="t.status === 'ACTIVE' ? 'green-9' : 'amber-9'" :text-color="t.status === 'ACTIVE' ? 'green-3' : 'amber-3'">
                  {{ t.status }}
                </q-badge>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    
    <MerchantDetailDrawer ref="merchantDrawer" @updated="fetchTenants" />
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import MerchantDetailDrawer from '../../../components/agent-portal/portfolio/MerchantDetailDrawer.vue'

const $q = useQuasar()
const router = useRouter()
const search = ref('')
const loading = ref(true)
const tenants = ref([])
const merchantDrawer = ref(null)

const openMerchantDetail = (tenant) => {
  if (merchantDrawer.value) {
    merchantDrawer.value.open(tenant)
  }
}

const fetchTenants = async () => {
  loading.value = true
  try {
    const token = localStorage.getItem('invify_agent_token')
    if (!token) {
      $q.notify({ type: 'negative', message: 'Not authenticated. Please log in.' })
      router.push('/agent/login')
      return
    }

    const res = await axios.get('/api/agent-portal/tenant/list', {
      headers: { Authorization: `Bearer ${token}` }
    })
    tenants.value = res.data.data || []
  } catch (err) {
    console.error('Failed to fetch tenants', err)
    $q.notify({ type: 'negative', message: 'Failed to load tenant portfolio', position: 'top-right' })
  } finally {
    loading.value = false
  }
}

onMounted(fetchTenants)

const filteredTenants = computed(() => {
  if (!search.value) return tenants.value
  const q = search.value.toLowerCase()
  return tenants.value.filter(t => 
    (t.business_name || '').toLowerCase().includes(q) || 
    (t.industry_type || '').toLowerCase().includes(q)
  )
})
</script>

<style scoped>
.bg-main { background-color: #0b0f12; }
.bg-panel { background-color: #12181c; }
.bg-panel-darker { background-color: #0e1216; }
.text-main { color: #f8f9fa; }
.text-muted { color: #868e96; }
.border-muted { border: 1px solid #2a3339; }
.border-bottom { border-bottom: 1px solid #1a2024; }
.border-bottom-light { border-bottom: 1px solid #1a2024; }
.font-inter { font-family: 'Inter', Roboto, sans-serif; }

.sticky-header {
  position: sticky;
  top: 0;
  z-index: 2;
}

.hover-row:hover {
  background-color: #1a2327 !important;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: #0b0f12;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #22282d;
  border-radius: 3px;
}
</style>
