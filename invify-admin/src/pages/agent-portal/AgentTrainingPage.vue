<template>
  <q-page class="q-pa-md bg-main text-main font-inter column op-gap-16">
    <div class="row items-center op-gap-8 border-bottom q-pb-sm">
      <q-icon name="school" size="sm" color="amber-4" />
      <div class="text-operator-title text-weight-bold" style="font-size: 16px;">TRAINING PORTAL</div>
    </div>

    <div v-if="loading" class="flex flex-center q-pa-xl">
      <q-spinner color="amber-4" size="3em" />
    </div>

    <div v-else class="column op-gap-16">
      
      <!-- In Progress / Enrolled -->
      <div v-if="myProgress.length > 0" class="column op-gap-8">
        <div class="text-weight-bold text-h6 border-bottom-light q-pb-sm">My Learning</div>
        <div class="row op-gap-16">
          <q-card v-for="p in myProgress" :key="p.id" class="col-xs-12 col-md-4 bg-panel border-muted">
            <q-card-section>
              <div class="text-weight-bold text-h6">{{ p.training_courses?.title }}</div>
              <div class="text-caption text-muted q-mt-xs">{{ p.training_courses?.description }}</div>
              <div class="q-mt-md">
                <div class="row justify-between text-caption text-muted q-mb-xs">
                  <span>{{ p.status }}</span>
                  <span>{{ p.progress_percent }}%</span>
                </div>
                <q-linear-progress :value="p.progress_percent / 100" color="amber-4" track-color="grey-9" size="10px" rounded />
              </div>
            </q-card-section>
            <q-card-actions align="right">
              <q-btn flat :label="p.status === 'COMPLETED' ? 'Review' : 'Continue'" color="amber-4" @click="updateProgress(p.course_id, 100, 'COMPLETED')" />
            </q-card-actions>
          </q-card>
        </div>
      </div>

      <!-- Course Catalog -->
      <div class="column op-gap-8 q-mt-md">
        <div class="text-weight-bold text-h6 border-bottom-light q-pb-sm">Course Catalog</div>
        <div class="row op-gap-16">
          <q-card v-for="c in courses" :key="c.id" class="col-xs-12 col-md-3 bg-panel border-muted column justify-between">
            <q-card-section>
              <div class="text-weight-bold text-h6">{{ c.title }}</div>
              <div class="text-caption text-muted q-mt-xs">{{ c.description }}</div>
            </q-card-section>
            <q-card-actions align="right">
              <q-btn v-if="!isEnrolled(c.id)" outline label="Enroll" color="amber-4" @click="updateProgress(c.id, 0, 'ENROLLED')" />
              <q-btn v-else flat label="Enrolled" color="grey" disable />
            </q-card-actions>
          </q-card>
          <div v-if="!courses.length" class="text-muted q-pa-md border-dashed border-muted rounded-borders full-width text-center">
            No courses available in the catalog.
          </div>
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
const courses = ref([])
const myProgress = ref([])

const fetchTrainingData = async () => {
  loading.value = true
  try {
    const token = localStorage.getItem('invify_agent_token')
    const headers = { Authorization: `Bearer ${token}` }
    const [cRes, pRes] = await Promise.all([
      axios.get('/api/training/courses', { headers }),
      axios.get('/api/training/progress', { headers })
    ])
    courses.value = cRes.data.data || []
    myProgress.value = pRes.data.data || []
  } catch (err) {
    $q.notify({ type: 'negative', message: 'Failed to load training portal' })
  } finally {
    loading.value = false
  }
}

const isEnrolled = (courseId) => {
  return myProgress.value.some(p => p.course_id === courseId)
}

const updateProgress = async (courseId, percent, status) => {
  try {
    const token = localStorage.getItem('invify_agent_token')
    const url = status === 'ENROLLED' ? '/api/training/enroll' : '/api/training/progress'
    await axios.post(url, { courseId, progressPercent: percent, status }, { headers: { Authorization: `Bearer ${token}` } })
    $q.notify({ type: 'positive', message: 'Progress updated' })
    await fetchTrainingData()
  } catch (err) {
    $q.notify({ type: 'negative', message: 'Failed to update progress' })
  }
}

onMounted(fetchTrainingData)
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
.border-dashed { border-style: dashed !important; }
.font-inter { font-family: 'Inter', Roboto, sans-serif; }
</style>
