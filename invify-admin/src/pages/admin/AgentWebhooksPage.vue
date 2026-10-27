<template>
  <q-page class="q-pa-md">
    <div class="text-h6 q-mb-md">Institute Webhooks</div>
    <div class="text-caption text-grey-6 q-mb-md">Private keys are never shown. Disable or inspect delivery only.</div>
    <q-table dark flat :rows="rows" :columns="columns" row-key="agent_id" :loading="loading">
      <template v-slot:body-cell-actions="props">
        <q-td :props="props">
          <q-btn dense flat color="amber-4" label="Disable" @click="setStatus(props.row.agent_id, 'disable')" />
          <q-btn dense flat color="green-4" label="Enable" @click="setStatus(props.row.agent_id, 'enable')" />
          <q-btn dense flat color="teal-3" label="Deliveries" @click="openDeliveries(props.row.agent_id)" />
        </q-td>
      </template>
    </q-table>
    <q-dialog v-model="showDeliveries">
      <q-card class="bg-grey-10 text-white" style="min-width: 640px;">
        <q-card-section>Delivery history</q-card-section>
        <q-card-section>
          <div v-for="d in deliveries" :key="d.event_id" class="text-caption q-mb-xs">
            {{ d.event_type }} · {{ d.status }} · {{ d.event_id }}
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { api } from 'boot/axios'

const loading = ref(false)
const rows = ref([])
const deliveries = ref([])
const showDeliveries = ref(false)
const columns = [
  { name: 'agent_code', label: 'Institute Code', field: 'agent_code' },
  { name: 'webhook_url', label: 'Webhook URL', field: 'webhook_url' },
  { name: 'status', label: 'Status', field: 'status' },
  { name: 'fingerprint', label: 'Fingerprint', field: 'fingerprint' },
  { name: 'last_delivery_at', label: 'Last Delivery', field: 'last_delivery_at' },
  { name: 'failure_count', label: 'Failures', field: 'failure_count' },
  { name: 'actions', label: 'Actions', field: 'actions' }
]

const load = async () => {
  loading.value = true
  try {
    const res = await api.get('/api/admin/agent-webhooks')
    rows.value = res.data.data || []
  } finally {
    loading.value = false
  }
}

const setStatus = async (agentId, action) => {
  await api.post(`/api/admin/agent-webhooks/${agentId}/${action}`)
  await load()
}

const openDeliveries = async (agentId) => {
  const res = await api.get(`/api/admin/agent-webhooks/${agentId}/deliveries`)
  deliveries.value = res.data.data || []
  showDeliveries.value = true
}

onMounted(load)
</script>
