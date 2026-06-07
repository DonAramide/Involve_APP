<template>
  <q-page class="q-pa-md bg-main text-main font-inter column op-gap-16">
    <div class="row items-center op-gap-8 border-bottom q-pb-sm">
      <q-icon name="military_tech" size="sm" color="amber-4" />
      <div class="text-operator-title text-weight-bold" style="font-size: 16px;">REPUTATION & GAMIFICATION</div>
    </div>

    <div v-if="loading" class="flex flex-center q-pa-xl">
      <q-spinner color="amber-4" size="3em" />
    </div>

    <div v-else class="column op-gap-16">
      
      <!-- Top Overview Row -->
      <div class="row op-gap-16">
        <!-- Trust Score Card -->
        <q-card class="col bg-panel border-muted">
          <q-card-section class="column items-center q-py-lg">
            <div class="text-caption text-muted text-weight-bold text-uppercase q-mb-sm">Trust Score</div>
            <div class="text-h2 text-weight-bolder text-amber-4">{{ profile.score || 0 }}</div>
            <q-badge color="grey-9" class="q-mt-sm">{{ profile.tier || 'New Agent' }}</q-badge>
          </q-card-section>
        </q-card>

        <!-- Current Rank Card -->
        <q-card class="col bg-panel border-muted">
          <q-card-section class="column items-center q-py-lg">
            <div class="text-caption text-muted text-weight-bold text-uppercase q-mb-sm">Global Rank</div>
            <div class="text-h2 text-weight-bolder text-white">#{{ profile.rank || '-' }}</div>
            <div class="text-caption text-muted q-mt-sm">Out of all agents</div>
          </q-card-section>
        </q-card>

        <!-- Events summary -->
        <q-card class="col bg-panel border-muted">
          <q-card-section class="column items-center q-py-lg">
            <div class="text-caption text-muted text-weight-bold text-uppercase q-mb-sm">Total Events</div>
            <div class="text-h2 text-weight-bolder text-white">{{ profile.total_events || 0 }}</div>
            <div class="text-caption text-muted q-mt-sm">Actions completed</div>
          </q-card-section>
        </q-card>
      </div>

      <div class="row op-gap-16 items-start">
        <!-- Badges Vault -->
        <div class="col-xs-12 col-md-7 column op-gap-8">
          <div class="text-h6 text-weight-bold border-bottom-light q-pb-sm">Badges Vault</div>
          <div class="row op-gap-8">
            <q-card v-for="b in badges" :key="b.id" class="col-3 bg-panel border-muted" :class="{ 'opacity-50': !b.earned }">
              <q-card-section class="column items-center text-center">
                <q-icon :name="b.icon_name || 'emoji_events'" size="lg" :color="b.earned ? 'amber-4' : 'grey-8'" />
                <div class="text-weight-bold q-mt-sm text-caption" style="line-height: 1.2;">{{ b.name }}</div>
                <div class="text-metric-mono text-muted q-mt-xs" style="font-size: 10px;">{{ b.earned ? 'EARNED' : 'LOCKED' }}</div>
              </q-card-section>
              <q-tooltip>{{ b.description }}</q-tooltip>
            </q-card>
          </div>
        </div>

        <!-- Leaderboard -->
        <div class="col-xs-12 col-md-5 column op-gap-8">
          <div class="row items-center justify-between border-bottom-light q-pb-sm">
            <div class="text-h6 text-weight-bold">Leaderboard</div>
            <q-btn-toggle
              v-model="leaderboardType"
              flat dense
              toggle-color="amber-4"
              color="grey-6"
              :options="[{label: 'Global', value: 'GLOBAL'}, {label: 'Regional', value: 'REGIONAL'}]"
              @update:model-value="fetchLeaderboard"
            />
          </div>
          
          <q-card class="bg-panel border-muted">
            <q-list separator dark>
              <q-item v-for="row in leaderboard" :key="row.agent_id">
                <q-item-section avatar>
                  <q-avatar :color="row.rank <= 3 ? 'amber-4' : 'grey-9'" :text-color="row.rank <= 3 ? 'black' : 'white'">
                    {{ row.rank }}
                  </q-avatar>
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-weight-bold">{{ row.name }}</q-item-label>
                  <q-item-label caption class="text-muted">{{ row.tier }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <div class="text-weight-bold text-amber-4">{{ row.score }}</div>
                </q-item-section>
              </q-item>
              <q-item v-if="!leaderboard.length">
                <q-item-section class="text-muted text-center">No rankings available.</q-item-section>
              </q-item>
            </q-list>
          </q-card>
        </div>
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
const profile = ref({})
const badges = ref([])
const leaderboard = ref([])
const leaderboardType = ref('GLOBAL')

const fetchGamificationData = async () => {
  loading.value = true
  try {
    const token = localStorage.getItem('invify_agent_token')
    const headers = { Authorization: `Bearer ${token}` }
    const [pRes, bRes] = await Promise.all([
      axios.get('/api/gamification/profile', { headers }),
      axios.get('/api/gamification/badges', { headers })
    ])
    profile.value = pRes.data?.data || pRes.data || {}
    badges.value = bRes.data?.data || bRes.data || []
    await fetchLeaderboard()
  } catch (err) {
    $q.notify({ type: 'negative', message: 'Failed to load gamification data' })
  } finally {
    loading.value = false
  }
}

const fetchLeaderboard = async () => {
  try {
    const token = localStorage.getItem('invify_agent_token')
    const res = await axios.get(`/api/gamification/leaderboard?type=${leaderboardType.value}`, { headers: { Authorization: `Bearer ${token}` } })
    leaderboard.value = res.data?.data || res.data || []
  } catch (err) {
    $q.notify({ type: 'negative', message: 'Failed to load leaderboard' })
  }
}

onMounted(fetchGamificationData)
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
.opacity-50 { opacity: 0.4; }
.font-inter { font-family: 'Inter', Roboto, sans-serif; }
</style>
