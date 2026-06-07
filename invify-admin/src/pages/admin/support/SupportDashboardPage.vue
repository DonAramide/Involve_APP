<template>
  <q-page class="q-pa-md bg-main text-main font-inter column op-gap-16">
    <div class="row items-center justify-between border-bottom q-pb-sm shrink-0">
      <div class="row items-center op-gap-8 no-wrap">
        <q-icon name="support_agent" size="sm" color="amber-4" />
        <div>
          <div class="text-operator-title text-weight-bold" style="font-size: 16px;">SUPPORT OPERATIONS</div>
          <div class="text-metric-mono text-muted" style="font-size: 10px;">TICKET & ESCALATION METRICS</div>
        </div>
      </div>
      <q-btn-group unelevated class="border-muted">
        <q-btn color="amber-4" text-color="black" label="All Tickets" />
        <q-btn color="panel-darker" text-color="main" label="Escalated" />
      </q-btn-group>
    </div>

    <div class="row op-gap-16 shrink-0">
      <div class="col panel-card bg-panel border-muted rounded-borders q-pa-md row items-center justify-between">
        <div>
          <div class="text-caption text-muted">Open</div>
          <div class="text-h4 text-weight-bold text-amber-4">
            <q-spinner v-if="loading" size="sm" />
            <span v-else>{{ tickets.filter(t => t.status === 'OPEN').length }}</span>
          </div>
        </div>
        <q-icon name="pending_actions" color="amber-4" size="lg" />
      </div>
      <div class="col panel-card bg-panel border-muted rounded-borders q-pa-md row items-center justify-between">
        <div>
          <div class="text-caption text-muted">Escalated</div>
          <div class="text-h4 text-weight-bold text-red-4">
            <q-spinner v-if="loading" size="sm" />
            <span v-else>{{ tickets.filter(t => t.status === 'ESCALATED').length }}</span>
          </div>
        </div>
        <q-icon name="warning" color="red-4" size="lg" />
      </div>
      <div class="col panel-card bg-panel border-muted rounded-borders q-pa-md row items-center justify-between">
        <div>
          <div class="text-caption text-muted">Resolved</div>
          <div class="text-h4 text-weight-bold text-green-4">
            <q-spinner v-if="loading" size="sm" />
            <span v-else>{{ tickets.filter(t => t.status === 'RESOLVED').length }}</span>
          </div>
        </div>
        <q-icon name="check_circle" color="green-4" size="lg" />
      </div>
    </div>

    <div class="col column border-muted rounded-borders bg-panel overflow-hidden">
      <div class="panel-header bg-panel-darker q-px-sm q-py-xs border-bottom row items-center justify-between shrink-0">
        <div class="row items-center op-gap-4">
          <q-icon name="list" size="xs" color="amber-4" />
          <span class="text-operator-title text-weight-bold" style="font-size: 12px;">RECENT TICKETS</span>
        </div>
      </div>
      
      <!-- Loading State -->
      <div v-if="loading" class="flex flex-center q-pa-xl">
        <q-spinner color="amber-4" size="3em" />
      </div>

      <!-- Empty State -->
      <div v-else-if="!loading && tickets.length === 0" class="flex flex-center q-pa-xl text-center column op-gap-8">
        <q-icon name="support_agent" size="xl" color="grey-8" />
        <div class="text-muted text-weight-bold">No support tickets found</div>
      </div>

      <div v-else class="col overflow-auto custom-scrollbar">
        <table class="enterprise-table full-width text-left" style="border-collapse: collapse;">
          <thead class="bg-panel-darker text-muted text-metric-mono text-weight-bold border-bottom sticky-header" style="font-size: 10px;">
            <tr>
              <th class="q-pa-sm">Ticket ID</th>
              <th class="q-pa-sm">Merchant</th>
              <th class="q-pa-sm">Issue Category</th>
              <th class="q-pa-sm">SLA Status</th>
              <th class="q-pa-sm">State</th>
            </tr>
          </thead>
          <tbody class="text-caption" style="font-size: 12px;">
            <tr v-for="t in tickets" :key="t.id" class="border-bottom-light hover-row">
              <td class="q-pa-sm text-metric-mono text-muted">#{{ t.id ? t.id.substring(0,8) : 'UNKNOWN' }}</td>
              <td class="q-pa-sm text-main text-weight-bold">{{ t.tenant_id ? t.tenant_id.substring(0,8) : (t.merchant || 'Unknown') }}</td>
              <td class="q-pa-sm text-muted">{{ t.category || 'General' }}</td>
              <td class="q-pa-sm">
                <q-badge :color="(t.sla_status || t.sla) === 'BREACHED' ? 'red-9' : 'green-9'" :text-color="(t.sla_status || t.sla) === 'BREACHED' ? 'red-3' : 'green-3'">
                  {{ t.sla_status || t.sla || 'ON_TRACK' }}
                </q-badge>
              </td>
              <td class="q-pa-sm text-amber-4">{{ t.status || t.state || 'OPEN' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { useQuasar } from 'quasar'

const $q = useQuasar()
const loading = ref(true)
const tickets = ref([])

const fetchTickets = async () => {
  loading.value = true
  try {
    const token = localStorage.getItem('token') || 'mock-admin-token-123'
    const res = await axios.get('/api/support/tickets/list', {
      headers: { Authorization: `Bearer ${token}` }
    })
    tickets.value = res.data.data || []
  } catch (err) {
    console.error('Failed to fetch support tickets', err)
    $q.notify({ type: 'negative', message: 'Failed to load support tickets', position: 'top-right' })
  } finally {
    loading.value = false
  }
}

onMounted(fetchTickets)
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
