<template>
  <q-page class="q-pa-md bg-main text-main font-inter column op-gap-16">
    <div class="row items-center justify-between border-bottom q-pb-sm shrink-0">
      <div class="row items-center op-gap-8 no-wrap">
        <q-icon name="explore" size="sm" color="amber-4" />
        <div>
          <div class="text-operator-title text-weight-bold" style="font-size: 16px;">GLOBAL LEADS DIRECTORY</div>
          <div class="text-metric-mono text-muted" style="font-size: 10px;">ALL PLATFORM PROSPECTS</div>
        </div>
      </div>
      <q-input dark dense filled v-model="search" placeholder="Search leads..." class="bg-panel-darker" style="width: 250px">
        <template v-slot:append>
          <q-icon name="search" color="amber-4" />
        </template>
      </q-input>
    </div>

    <div class="col column border-muted rounded-borders bg-panel overflow-hidden">
      <div class="panel-header bg-panel-darker q-px-sm q-py-xs border-bottom row items-center op-gap-4 shrink-0">
        <q-icon name="list" size="xs" color="amber-4" />
        <span class="text-operator-title text-weight-bold" style="font-size: 12px;">PROSPECT LIST</span>
      </div>
      
      <!-- Loading State -->
      <div v-if="loading" class="flex flex-center q-pa-xl">
        <q-spinner color="amber-4" size="3em" />
      </div>

      <!-- Empty State -->
      <div v-else-if="!loading && leads.length === 0" class="flex flex-center q-pa-xl text-center column op-gap-8">
        <q-icon name="explore" size="xl" color="grey-8" />
        <div class="text-muted text-weight-bold">No leads found across the platform</div>
      </div>

      <div v-else class="col overflow-auto custom-scrollbar">
        <table class="enterprise-table full-width text-left" style="border-collapse: collapse;">
          <thead class="bg-panel-darker text-muted text-metric-mono text-weight-bold border-bottom sticky-header" style="font-size: 10px;">
            <tr>
              <th class="q-pa-sm">Business Name</th>
              <th class="q-pa-sm">Contact</th>
              <th class="q-pa-sm">Agent Owner</th>
              <th class="q-pa-sm">Status</th>
              <th class="q-pa-sm">Created</th>
            </tr>
          </thead>
          <tbody class="text-caption" style="font-size: 12px;">
            <tr v-for="lead in filteredLeads" :key="lead.id" class="border-bottom-light hover-row">
              <td class="q-pa-sm text-main text-weight-bold">{{ lead.business_name || lead.businessName }}</td>
              <td class="q-pa-sm text-muted">{{ lead.contact_name || lead.contact }}</td>
              <td class="q-pa-sm text-amber-4">{{ lead.agent_id ? lead.agent_id.substring(0,8) : (lead.agentCode || 'UNKNOWN') }}</td>
              <td class="q-pa-sm">
                <q-badge :color="lead.stage === 'WON' ? 'green-9' : 'blue-grey-9'" :text-color="lead.stage === 'WON' ? 'green-3' : 'blue-grey-3'">
                  {{ lead.stage || lead.status || 'PROSPECT' }}
                </q-badge>
              </td>
              <td class="q-pa-sm text-metric-mono text-muted">{{ new Date(lead.created_at || lead.created).toLocaleDateString() }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import { useQuasar } from 'quasar'

const $q = useQuasar()
const search = ref('')
const loading = ref(true)
const leads = ref([])

const fetchLeads = async () => {
  loading.value = true
  try {
    const token = localStorage.getItem('token') || 'mock-admin-token-123'
    const res = await axios.get('/api/admin/lead/listAll', {
      headers: { Authorization: `Bearer ${token}` }
    })
    leads.value = res.data.data || []
  } catch (err) {
    console.error('Failed to fetch global leads', err)
    $q.notify({ type: 'negative', message: 'Failed to load global leads', position: 'top-right' })
  } finally {
    loading.value = false
  }
}

onMounted(fetchLeads)

const filteredLeads = computed(() => {
  if (!search.value) return leads.value
  const q = search.value.toLowerCase()
  return leads.value.filter(l => 
    (l.business_name || '').toLowerCase().includes(q) || 
    (l.contact_name || '').toLowerCase().includes(q)
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
