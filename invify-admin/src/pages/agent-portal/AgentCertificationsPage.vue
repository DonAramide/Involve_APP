<template>
  <q-page class="q-pa-md bg-main text-main font-inter column op-gap-16">
    <div class="row items-center op-gap-8 border-bottom q-pb-sm">
      <q-icon name="workspace_premium" size="sm" color="amber-4" />
      <div class="text-operator-title text-weight-bold" style="font-size: 16px;">CERTIFICATIONS</div>
    </div>

    <div v-if="loading" class="flex flex-center q-pa-xl">
      <q-spinner color="amber-4" size="3em" />
    </div>

    <div v-else class="column op-gap-16">
      <div class="row op-gap-16">
        <q-card v-for="c in certifications" :key="c.id" class="col-xs-12 col-md-4 bg-panel border-muted column justify-between">
          <q-card-section>
            <div class="row justify-between items-start">
              <div class="text-weight-bold text-h6">{{ c.certifications?.name }}</div>
              <q-badge :color="getStatusColor(c.status)" text-color="black">{{ c.status }}</q-badge>
            </div>
            <div class="text-caption text-muted q-mt-xs">{{ c.certifications?.description }}</div>
            
            <div class="row items-center op-gap-16 q-mt-md text-caption">
              <div>
                <div class="text-muted text-metric-mono" style="font-size: 10px;">SCORE</div>
                <div class="text-weight-bold">{{ c.score }}%</div>
              </div>
              <div>
                <div class="text-muted text-metric-mono" style="font-size: 10px;">ISSUED</div>
                <div class="text-weight-bold">{{ new Date(c.issued_at).toLocaleDateString() }}</div>
              </div>
              <div>
                <div class="text-muted text-metric-mono" style="font-size: 10px;">EXPIRES</div>
                <div class="text-weight-bold" :class="{ 'text-red-4': isExpired(c.expires_at) }">
                  {{ c.expires_at ? new Date(c.expires_at).toLocaleDateString() : 'Never' }}
                </div>
              </div>
            </div>
          </q-card-section>
          <q-card-actions align="right" class="border-top-light">
            <q-btn flat icon="download" label="Certificate" color="amber-4" :disable="!c.certificate_url" @click="download(c.certificate_url)" />
          </q-card-actions>
        </q-card>
      </div>

      <div v-if="!certifications.length" class="text-muted text-center q-pa-xl border-dashed border-muted rounded-borders">
        <q-icon name="workspace_premium" size="xl" class="q-mb-md opacity-50" />
        <div class="text-h6">No Certifications Yet</div>
        <div class="text-caption">Complete courses in the Training Portal to earn your credentials.</div>
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
const certifications = ref([])

const fetchCertifications = async () => {
  loading.value = true
  try {
    const token = localStorage.getItem('invify_agent_token')
    const res = await axios.get('/api/agent/certifications', { headers: { Authorization: `Bearer ${token}` } })
    certifications.value = res.data.data || []
  } catch (err) {
    $q.notify({ type: 'negative', message: 'Failed to load certifications' })
  } finally {
    loading.value = false
  }
}

const getStatusColor = (status) => {
  if (status === 'ACTIVE') return 'green-4'
  if (status === 'EXPIRED') return 'red-4'
  return 'grey-6'
}

const isExpired = (dateString) => {
  if (!dateString) return false
  return new Date(dateString) < new Date()
}

const download = (url) => {
  window.open(url, '_blank')
}

onMounted(fetchCertifications)
</script>

<style scoped>
.bg-main { background-color: #0b0f12; }
.bg-panel { background-color: #12181c; }
.bg-panel-darker { background-color: #0e1216; }
.text-main { color: #f8f9fa; }
.text-muted { color: #868e96; }
.border-muted { border: 1px solid #2a3339; }
.border-bottom { border-bottom: 1px solid #1a2024; }
.border-top-light { border-top: 1px solid #1a2024; }
.border-dashed { border-style: dashed !important; }
.font-inter { font-family: 'Inter', Roboto, sans-serif; }
</style>
