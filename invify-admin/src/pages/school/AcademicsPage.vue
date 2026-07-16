<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="text-h5 text-weight-bold text-indigo-9">Academics & Grading</div>
      <q-space />
      <q-btn color="primary" icon="refresh" label="Refresh" @click="fetchData" :loading="loading" />
    </div>

    <q-card flat bordered class="rounded-borders">
      <q-table
        :rows="rows"
        :columns="columns"
        row-key="id"
        :loading="loading"
        flat
        bordered
      />
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { schoolApi } from 'src/api'

const loading = ref(false)
const rows = ref([])

const columns = [
  { name: 'id', align: 'left', label: 'Record ID', field: 'id', sortable: true },
  { name: 'student', align: 'left', label: 'Student', field: 'student', sortable: true },
  { name: 'term', align: 'left', label: 'Term', field: 'term', sortable: true },
  { name: 'average', align: 'left', label: 'Average Grade', field: 'average', sortable: true },
]

const fetchData = async () => {
  loading.value = true
  try {
    const { data } = await schoolApi.getAcademics()
    rows.value = data || []
  } catch (error) {
    console.error('Failed to fetch academics:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>
