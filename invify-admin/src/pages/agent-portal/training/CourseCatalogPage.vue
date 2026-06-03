<template>
  <q-page class="q-pa-md bg-main text-main font-inter column op-gap-16">
    <div class="row items-center justify-between border-bottom q-pb-sm shrink-0">
      <div class="row items-center op-gap-8 no-wrap">
        <q-icon name="school" size="sm" color="amber-4" />
        <div>
          <div class="text-operator-title text-weight-bold" style="font-size: 16px;">TRAINING ACADEMY</div>
          <div class="text-metric-mono text-muted" style="font-size: 10px;">CERTIFICATIONS & SKILL PROGRESSION</div>
        </div>
      </div>
      <q-btn-group unelevated class="border-muted">
        <q-btn :color="filter === 'ALL' ? 'amber-4' : 'panel-darker'" :text-color="filter === 'ALL' ? 'black' : 'main'" label="All" @click="filter = 'ALL'" />
        <q-btn :color="filter === 'IN_PROGRESS' ? 'amber-4' : 'panel-darker'" :text-color="filter === 'IN_PROGRESS' ? 'black' : 'main'" label="In Progress" @click="filter = 'IN_PROGRESS'" />
        <q-btn :color="filter === 'COMPLETED' ? 'amber-4' : 'panel-darker'" :text-color="filter === 'COMPLETED' ? 'black' : 'main'" label="Completed" @click="filter = 'COMPLETED'" />
      </q-btn-group>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex flex-center col">
      <q-spinner color="amber-4" size="3em" />
    </div>

    <!-- Empty State -->
    <div v-else-if="!loading && courses.length === 0" class="flex flex-center col text-center column op-gap-8">
      <q-icon name="school" size="xl" color="grey-8" />
      <div class="text-muted text-weight-bold">No training courses available</div>
    </div>

    <div v-else class="row op-gap-16 col overflow-auto custom-scrollbar content-start">
      <div v-for="course in filteredCourses" :key="course.id" class="col-12 col-md-6 col-lg-4">
        <div class="panel-card bg-panel border-muted rounded-borders column hover-card h-full">
          <div class="bg-panel-darker q-pa-md border-bottom row items-center justify-between">
            <q-badge :color="getStatusColor(course.status)" text-color="black">{{ course.status.replace('_', ' ') }}</q-badge>
            <div class="text-metric-mono text-muted" style="font-size: 10px;">{{ course.duration }} MINS</div>
          </div>
          
          <div class="q-pa-md column col op-gap-8">
            <div class="text-h6 text-weight-bold text-main">{{ course.title }}</div>
            <div class="text-caption text-muted col">{{ course.description }}</div>
            
            <div class="q-mt-md">
              <div class="row justify-between text-metric-mono text-muted q-mb-xs" style="font-size: 10px;">
                <span>PROGRESS</span>
                <span>{{ course.progress }}%</span>
              </div>
              <q-linear-progress :value="course.progress / 100" color="amber-4" track-color="grey-9" />
            </div>
          </div>
          
          <div class="q-pa-sm border-top row justify-end">
            <q-btn flat color="amber-4" :label="course.status === 'COMPLETED' ? 'Review' : 'Continue'" dense />
          </div>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import { useQuasar } from 'quasar'

const $q = useQuasar()
const filter = ref('ALL')
const loading = ref(true)
const courses = ref([])

const fetchCourses = async () => {
  loading.value = true
  try {
    const token = localStorage.getItem('agent_token') || 'mock-agent-token-123'
    const res = await axios.get('http://localhost:3004/api/training/courses/list', {
      headers: { Authorization: `Bearer ${token}` }
    })
    courses.value = res.data.data || []
  } catch (err) {
    console.error('Failed to fetch training courses', err)
    $q.notify({ type: 'negative', message: 'Failed to load course catalog', position: 'top-right' })
  } finally {
    loading.value = false
  }
}

onMounted(fetchCourses)

const filteredCourses = computed(() => {
  if (filter.value === 'ALL') return courses.value
  return courses.value.filter(c => c.status === filter.value)
})

const getStatusColor = (status) => {
  if (status === 'COMPLETED') return 'green-4'
  if (status === 'IN_PROGRESS') return 'amber-4'
  return 'grey-6'
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
.border-top { border-top: 1px solid #1a2024; }
.font-inter { font-family: 'Inter', Roboto, sans-serif; }

.hover-card {
  transition: transform 0.2s, border-color 0.2s;
}
.hover-card:hover {
  border-color: #fcc419;
  transform: translateY(-2px);
}
.h-full {
  height: 100%;
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