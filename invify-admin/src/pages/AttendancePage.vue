<!-- invify-admin/src/pages/AttendancePage.vue -->
<template>
  <q-page class="q-pa-lg bg-dark text-white">
    <!-- Header -->
    <div class="row items-center q-mb-xl">
      <div class="col">
        <h1 class="text-h4 text-weight-bolder q-ma-none text-white letter-spacing-1">Class Attendance</h1>
        <div class="text-grey-6">Recording participation for {{ selectedClass || 'a class' }}</div>
      </div>
      <div class="col-auto q-gutter-sm">
        <q-btn flat color="indigo-4" icon="history" label="History" to="/admin/attendance-history" />
        <q-btn color="indigo-7" icon="add" label="Add Student" @click="showAddStudent = true" glossy />
      </div>
    </div>

    <!-- Selection Bar -->
    <div class="row q-col-gutter-lg q-mb-lg">
       <div class="col-12 col-md-4">
          <q-select
            v-model="selectedClass"
            :options="classOptions"
            label="Select Class Level"
            dark filled 
            @update:model-value="fetchStudents"
          />
       </div>
       <div class="col-12 col-md-8 flex items-center justify-end q-gutter-sm" v-if="students.length">
          <div class="text-caption text-grey-6 q-mr-md">{{ stats.present }} Present | {{ stats.absent }} Absent | {{ stats.late }} Late</div>
          <q-btn outline color="indigo-4" icon="done_all" label="Mark All Present" @click="markAllPresent" />
       </div>
    </div>

    <!-- Attendance Checklist -->
    <div v-if="loading" class="flex flex-center q-pa-xl">
       <q-spinner-cube color="indigo-4" size="4em" />
    </div>

    <div v-else-if="!selectedClass" class="flex flex-center q-pa-xl text-grey-8 column">
       <q-icon name="school" size="4em" class="q-mb-md" />
       <div class="text-h6">Select a class to record attendance</div>
    </div>

    <div v-else class="row q-col-gutter-md">
       <div class="col-12">
          <q-list dark separator class="bg-blue-grey-10 rounded-borders border-indigo">
             <q-item v-for="student in students" :key="student.id" class="q-py-md">
                <q-item-section avatar>
                   <q-avatar color="indigo-9" text-color="white">{{ student.full_name.charAt(0) }}</q-avatar>
                </q-item-section>
                
                <q-item-section>
                   <q-item-label class="text-weight-bold">{{ student.full_name }}</q-item-label>
                   <q-item-label caption class="text-grey-6">{{ student.admission_number || 'No ID' }}</q-item-label>
                </q-item-section>
                
                <q-item-section side>
                   <q-btn-toggle
                     v-model="attendance[student.id]"
                     flat dense
                     toggle-color="indigo-4"
                     color="grey-9"
                     :options="[
                       { label: 'P', value: 'present', slot: 'p' },
                       { label: 'A', value: 'absent', slot: 'a' },
                       { label: 'L', value: 'late', slot: 'l' }
                     ]"
                     @update:model-value="saveStatus(student.id, $event)"
                   >
                     <template v-slot:p><q-tooltip>Present</q-tooltip></template>
                     <template v-slot:a><q-tooltip>Absent</q-tooltip></template>
                     <template v-slot:l><q-tooltip>Late</q-tooltip></template>
                   </q-btn-toggle>
                </q-item-section>
             </q-item>

             <q-item v-if="!students.length" class="q-pa-xl text-center text-grey-8">
                <q-item-section>No students found in this class. Click "Add Student" to start.</q-item-section>
             </q-item>
          </q-list>
       </div>
    </div>

    <!-- Add Student Modal -->
    <q-dialog v-model="showAddStudent" backdrop-filter="blur(10px)">
       <q-card class="bg-blue-grey-10 text-white" style="width: 400px">
          <q-card-section class="bg-indigo-10">
             <div class="text-h6">Quick Student Enrollment</div>
          </q-card-section>
          
          <q-card-section class="q-pa-md q-gutter-md">
             <q-input v-model="newStudent.name" label="Full Name" dark filled autofocus />
             <q-select v-model="newStudent.classLevel" :options="classOptions" label="Class Level" dark filled />
          </q-card-section>
          
          <q-card-actions align="right" class="q-pa-md">
             <q-btn flat label="Cancel" v-close-popup color="grey-6" />
             <q-btn label="Enroll Student" color="indigo-7" @click="enrollStudent" :loading="saving" glossy />
          </q-card-actions>
       </q-card>
    </q-dialog>

    <!-- Auto-save Indicator -->
    <div class="fixed-bottom-right q-ma-lg" v-if="savingLocal">
       <q-chip size="sm" color="indigo-10" text-color="white" icon="cloud_sync">Saving...</q-chip>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { attendanceApi } from '../api'
import { Notify } from 'quasar'

const selectedClass = ref('')
const students = ref([])
const attendance = ref({})
const loading = ref(false)
const saving = ref(false)
const savingLocal = ref(false)
const showAddStudent = ref(false)

const newStudent = ref({ name: '', classLevel: '' })

const classOptions = [
  'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6',
  'JSS 1', 'JSS 2', 'JSS 3', 'SSS 1', 'SSS 2', 'SSS 3'
]

const stats = computed(() => {
  const counts = { present: 0, absent: 0, late: 0 }
  Object.values(attendance.value).forEach(v => counts[v]++)
  return counts
})

const fetchStudents = async () => {
  if (!selectedClass.value) return
  loading.value = true
  try {
    const { data } = await attendanceApi.listStudents({ classLevel: selectedClass.value })
    students.value = data
    // Reset attendance map and default to present
    const map = {}
    data.forEach(s => map[s.id] = 'present')
    attendance.value = map
  } finally {
    loading.value = false
  }
}

const saveStatus = async (studentId, status) => {
  savingLocal.value = true
  try {
    await attendanceApi.autoSave({
      classLevel: selectedClass.value,
      studentId,
      status,
      date: new Date().toISOString().split('T')[0]
    })
  } finally {
    setTimeout(() => { savingLocal.value = false }, 500)
  }
}

const markAllPresent = async () => {
  const sids = students.value.map(s => s.id)
  if (!sids.length) return
  
  try {
    await attendanceApi.bulkPresent({
      classLevel: selectedClass.value,
      studentIds: sids
    })
    sids.forEach(sid => attendance.value[sid] = 'present')
    Notify.create({ type: 'positive', message: 'All students marked as present' })
  } catch (e) {
    Notify.create({ type: 'negative', message: 'Bulk update failed' })
  }
}

const enrollStudent = async () => {
  if (!newStudent.value.name || !newStudent.value.classLevel) return
  saving.value = true
  try {
    await attendanceApi.enroll({
      fullName: newStudent.value.name,
      classLevel: newStudent.value.classLevel
    })
    Notify.create({ type: 'positive', message: 'Student enrolled!' })
    showAddStudent.value = false
    if (selectedClass.value === newStudent.value.classLevel) {
       fetchStudents()
    }
    newStudent.value = { name: '', classLevel: '' }
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.letter-spacing-1 { letter-spacing: 1px; }
.bg-blue-grey-10 { background: #1c262b; }
.bg-indigo-10 { background: #1e1b4b; }
.border-indigo { border-left: 5px solid #3f51b5; }
</style>
