  <q-page class="q-pa-md bg-main text-main font-inter column op-gap-16">
    <div class="row items-center justify-between border-bottom q-pb-sm shrink-0">
      <div class="row items-center op-gap-8 no-wrap">
        <q-icon name="view_kanban" size="sm" color="amber-4" />
        <div>
          <div class="text-operator-title text-weight-bold" style="font-size: 16px;">LEAD PIPELINE KANBAN</div>
          <div class="text-metric-mono text-muted" style="font-size: 10px;">STAGE PROGRESSION & TRACKING</div>
        </div>
      </div>
      <q-btn dense flat color="amber-4" icon="add" label="New Lead" @click="createLead" />
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex flex-center col">
      <q-spinner color="amber-4" size="3em" />
    </div>

    <!-- Empty State -->
    <div v-else-if="!loading && totalLeads === 0" class="flex flex-center col text-center column op-gap-8">
      <q-icon name="inbox" size="xl" color="grey-8" />
      <div class="text-muted text-weight-bold">No leads found in pipeline</div>
      <q-btn outline color="amber-4" label="Create First Lead" @click="createLead" />
    </div>

    <!-- Kanban Board -->
    <div v-else class="row op-gap-16 flex-nowrap overflow-auto custom-scrollbar col">
      <div v-for="stage in stages" :key="stage.id" class="kanban-column bg-panel border-muted rounded-borders column shrink-0">
        <div class="q-pa-sm border-bottom-light bg-panel-darker row justify-between items-center">
          <div class="text-weight-bold" style="font-size: 13px;">{{ stage.title }}</div>
          <q-badge color="grey-9" text-color="grey-4">{{ stage.leads.length }}</q-badge>
        </div>
        
        <div class="col q-pa-sm custom-scrollbar" style="overflow-y: auto;">
          <div v-for="lead in stage.leads" :key="lead.id" class="kanban-card bg-panel-darker q-pa-md q-mb-sm rounded-borders border-muted cursor-pointer hover-card">
            <div class="text-weight-bold text-main" style="font-size: 14px;">{{ lead.business_name || lead.businessName }}</div>
            <div class="text-caption text-muted q-mt-xs">{{ lead.contact_name || lead.contactName }}</div>
            <div class="row justify-between items-center q-mt-sm">
              <q-badge :color="lead.score > 80 ? 'green-4' : 'amber-4'" text-color="black">{{ lead.score || 0 }} pts</q-badge>
              <div class="text-metric-mono text-muted" style="font-size: 10px;">{{ new Date(lead.created_at || lead.createdAt).toLocaleDateString() }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'

const $q = useQuasar()
const router = useRouter()
const loading = ref(true)
const rawLeads = ref([])

const fetchLeads = async () => {
  loading.value = true
  try {
    const token = localStorage.getItem('invify_agent_token')
    if (!token) {
      $q.notify({ type: 'negative', message: 'Not authenticated. Please log in.' })
      router.push('/agent/login')
      return
    }

    const res = await axios.get('http://localhost:3004/api/agent-portal/lead/list', {
      headers: { Authorization: `Bearer ${token}` }
    })
    rawLeads.value = res.data.data || []
  } catch (err) {
    console.error('Failed to fetch leads', err)
    $q.notify({ type: 'negative', message: 'Failed to load lead pipeline', position: 'top-right' })
  } finally {
    loading.value = false
  }
}

onMounted(fetchLeads)

const totalLeads = computed(() => rawLeads.value.length)

const stages = computed(() => {
  const definition = [
    { id: 'new', title: 'Prospecting', leads: [] },
    { id: 'contacted', title: 'Contacted', leads: [] },
    { id: 'pending', title: 'KYC Submitted', leads: [] },
    { id: 'approved', title: 'Approved', leads: [] },
    { id: 'active', title: 'Activated', leads: [] }
  ]
  
  rawLeads.value.forEach(lead => {
    // Map backend status to kanban stage
    const status = (lead.status || lead.stage || 'new').toLowerCase()
    let stageId = 'new'
    
    if (status.includes('contact')) stageId = 'contacted'
    else if (status.includes('pend') || status.includes('kyc')) stageId = 'pending'
    else if (status.includes('approv')) stageId = 'approved'
    else if (status.includes('activ') || status.includes('won')) stageId = 'active'

    const stageDef = definition.find(s => s.id === stageId) || definition[0]
    stageDef.leads.push(lead)
  })
  
  return definition
})

const createLead = () => {
  router.push('/agent/coming-soon/create-lead')
}
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

.kanban-column {
  width: 300px;
  min-width: 300px;
}

.kanban-card {
  transition: transform 0.2s, border-color 0.2s;
}
.hover-card:hover {
  border-color: #fcc419;
  transform: translateY(-2px);
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