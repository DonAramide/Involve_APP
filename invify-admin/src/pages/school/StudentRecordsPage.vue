<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="text-h5 text-weight-bold text-indigo-9">Student Records</div>
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
  { name: 'id', align: 'left', label: 'ID', field: 'id', sortable: true },
  { name: 'name', align: 'left', label: 'Name', field: 'name', sortable: true },
  { name: 'classLevel', align: 'left', label: 'Class', field: 'classLevel', sortable: true },
  { name: 'status', align: 'left', label: 'Status', field: 'status', sortable: true },
]

const fetchData = async () => {
  loading.value = true
  try {
    const { data } = await schoolApi.getStudents()
    rows.value = data || []
  } catch (error) {
    console.error('Failed to fetch students:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>
