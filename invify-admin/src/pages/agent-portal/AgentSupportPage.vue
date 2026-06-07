<template>
  <q-page class="q-pa-md bg-main text-main font-inter column op-gap-16">
    <div class="row items-center justify-between border-bottom q-pb-sm">
      <div class="row items-center op-gap-8 no-wrap">
        <q-icon name="support_agent" size="sm" color="amber-4" />
        <div class="text-operator-title text-weight-bold" style="font-size: 16px;">SUPPORT CENTER</div>
      </div>
      <q-btn color="amber-4" text-color="black" label="New Ticket" @click="showCreateModal = true" />
    </div>

    <div v-if="loading" class="flex flex-center q-pa-xl">
      <q-spinner color="amber-4" size="3em" />
    </div>

    <div v-else class="column op-gap-16">
      <div v-if="!selectedTicket" class="bg-panel border-muted rounded-borders q-pa-md">
        <table class="enterprise-table full-width text-left" style="border-collapse: collapse;">
          <thead class="text-muted text-metric-mono" style="font-size: 10px;">
            <tr>
              <th class="q-pa-sm border-bottom">ID</th>
              <th class="q-pa-sm border-bottom">Subject</th>
              <th class="q-pa-sm border-bottom">Status</th>
              <th class="q-pa-sm border-bottom">Date</th>
              <th class="q-pa-sm border-bottom">Action</th>
            </tr>
          </thead>
          <tbody class="text-caption">
            <tr v-for="t in tickets" :key="t.id" class="border-bottom-light cursor-pointer" @click="openTicket(t.id)">
              <td class="q-pa-sm text-metric-mono text-muted">{{ String(t.id).substring(0,8) }}</td>
              <td class="q-pa-sm text-weight-bold">{{ t.title }}</td>
              <td class="q-pa-sm"><q-badge :color="getStatusColor(t.status)" text-color="black">{{ t.status }}</q-badge></td>
              <td class="q-pa-sm">{{ new Date(t.created_at).toLocaleDateString() }}</td>
              <td class="q-pa-sm"><q-btn flat dense icon="chevron_right" color="amber-4" /></td>
            </tr>
            <tr v-if="!tickets.length">
              <td colspan="5" class="q-pa-sm text-muted text-center">No support tickets found.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="column op-gap-16">
        <div class="row items-center op-gap-8">
          <q-btn flat dense icon="arrow_back" @click="selectedTicket = null" color="amber-4" />
          <div class="text-h6 text-weight-bold">{{ selectedTicket.title }}</div>
          <q-badge :color="getStatusColor(selectedTicket.status)" text-color="black">{{ selectedTicket.status }}</q-badge>
        </div>
        
        <div class="bg-panel border-muted rounded-borders q-pa-md">
          <div class="text-caption text-muted q-mb-md">{{ selectedTicket.description }}</div>
          <div class="text-caption text-muted text-weight-bold q-mb-sm">Comments:</div>
          <div class="column op-gap-8 q-mb-md">
            <div v-for="c in selectedTicket.comments" :key="c.id" class="bg-panel-darker q-pa-sm rounded-borders border-muted">
              <div class="text-metric-mono text-amber-4" style="font-size: 10px;">{{ c.created_by === selectedTicket.created_by ? 'YOU' : 'SUPPORT AGENT' }} - {{ new Date(c.created_at).toLocaleString() }}</div>
              <div class="text-caption q-mt-xs">{{ c.comment }}</div>
            </div>
            <div v-if="!selectedTicket.comments.length" class="text-muted text-caption">No comments yet.</div>
          </div>
          
          <q-input dark outlined v-model="commentForm" type="textarea" rows="3" placeholder="Write a reply..." color="amber-4" />
          <div class="row justify-end q-mt-sm">
            <q-btn label="Send Reply" color="amber-4" text-color="black" @click="submitComment" :loading="submitting" :disable="!commentForm.trim()" />
          </div>
        </div>
      </div>
    </div>

    <q-dialog v-model="showCreateModal" persistent>
      <q-card class="bg-panel text-main" style="min-width: 400px">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Create Ticket</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section class="column op-gap-16 q-pt-md">
          <q-input dark outlined v-model="newTicket.title" label="Subject" color="amber-4" />
          <q-select dark outlined v-model="newTicket.category" :options="['GENERAL', 'TECHNICAL', 'FINANCE', 'ACCOUNT']" label="Category" color="amber-4" />
          <q-select dark outlined v-model="newTicket.priority" :options="['LOW', 'MEDIUM', 'HIGH']" label="Priority" color="amber-4" />
          <q-input dark outlined v-model="newTicket.description" type="textarea" label="Description" color="amber-4" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="white" v-close-popup />
          <q-btn label="Submit" color="amber-4" text-color="black" @click="submitTicket" :loading="submitting" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'

const $q = useQuasar()
const router = useRouter()
const loading = ref(true)
const submitting = ref(false)
const tickets = ref([])
const selectedTicket = ref(null)
const commentForm = ref('')

const showCreateModal = ref(false)
const newTicket = ref({ title: '', category: 'GENERAL', priority: 'MEDIUM', description: '' })

const fetchTickets = async () => {
  loading.value = true
  try {
    const token = localStorage.getItem('invify_agent_token')
    if (!token) { router.push('/agent/login'); return; }
    const res = await axios.get('/api/support/tickets', { headers: { Authorization: `Bearer ${token}` } })
    tickets.value = res.data.data || []
  } catch (err) {
    $q.notify({ type: 'negative', message: 'Failed to load tickets' })
  } finally {
    loading.value = false
  }
}

const openTicket = async (id) => {
  try {
    const token = localStorage.getItem('invify_agent_token')
    const res = await axios.get(`/api/support/tickets/${id}`, { headers: { Authorization: `Bearer ${token}` } })
    selectedTicket.value = res.data.data
  } catch (err) {
    $q.notify({ type: 'negative', message: 'Failed to load ticket details' })
  }
}

const submitTicket = async () => {
  submitting.value = true
  try {
    const token = localStorage.getItem('invify_agent_token')
    await axios.post('/api/support/tickets', newTicket.value, { headers: { Authorization: `Bearer ${token}` } })
    $q.notify({ type: 'positive', message: 'Ticket created' })
    showCreateModal.value = false
    newTicket.value = { title: '', category: 'GENERAL', priority: 'MEDIUM', description: '' }
    await fetchTickets()
  } catch (err) {
    $q.notify({ type: 'negative', message: 'Failed to create ticket' })
  } finally {
    submitting.value = false
  }
}

const submitComment = async () => {
  if (!selectedTicket.value) return
  submitting.value = true
  try {
    const token = localStorage.getItem('invify_agent_token')
    await axios.post(`/api/support/tickets/${selectedTicket.value.id}/comments`, { comment: commentForm.value }, { headers: { Authorization: `Bearer ${token}` } })
    commentForm.value = ''
    await openTicket(selectedTicket.value.id)
  } catch (err) {
    $q.notify({ type: 'negative', message: 'Failed to post reply' })
  } finally {
    submitting.value = false
  }
}

const getStatusColor = (status) => {
  if (status === 'RESOLVED' || status === 'CLOSED') return 'green-4'
  if (status === 'OPEN') return 'blue-4'
  return 'amber-4'
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
</style>
