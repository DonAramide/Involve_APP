<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="text-h5 text-weight-bold text-indigo-9">School Analytics & Reports</div>
      <q-space />
      <q-btn color="primary" icon="refresh" label="Refresh" @click="fetchData" :loading="loading" />
    </div>

    <div class="row q-col-gutter-md">
      <div class="col-12 col-md-4" v-for="metric in metrics" :key="metric.title">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-overline">{{ metric.title }}</div>
            <div class="text-h4 text-weight-bold">{{ metric.value }}</div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { schoolApi } from 'src/api'

const loading = ref(false)
const metrics = ref([
  { title: 'Total Students', value: 0 },
  { title: 'Active Teachers', value: 0 },
  { title: 'Average Attendance', value: '0%' }
])

const fetchData = async () => {
  loading.value = true
  try {
    const { data } = await schoolApi.getAnalytics()
    if (data && data.metrics) {
      metrics.value = data.metrics
    }
  } catch (error) {
    console.error('Failed to fetch analytics:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>
