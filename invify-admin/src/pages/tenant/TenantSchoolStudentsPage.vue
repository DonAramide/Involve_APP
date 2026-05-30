<!-- invify-admin/src/pages/tenant/TenantSchoolStudentsPage.vue -->
<template>
  <q-page class="q-pa-lg text-white" style="background: #05070d; min-height: 100vh;">
    <!-- Ambient Sleek Background Glow -->
    <div class="ambient-glow" style="background: radial-gradient(circle, rgba(99,102,241, 0.05) 0%, rgba(5,7,13,0) 70%);" />

    <!-- Page Header -->
    <div class="row items-center justify-between q-mb-md relative-position" style="z-index: 10;">
      <div>
        <div class="row items-center op-gap-8 no-wrap">
          <q-icon name="school" color="indigo-4" size="md" />
          <h1 class="text-h4 text-weight-bolder text-white q-my-none letter-spacing-1">Student Directory</h1>
        </div>
        <div class="text-caption text-grey-5 q-mt-xs">
          Comprehensive student profiles, academic records, and tuition tracking.
        </div>
      </div>

      <q-btn unelevated color="indigo-10" text-color="indigo-3" icon="person_add" label="Enroll Student" class="text-weight-bold font-mono text-caption q-mt-sm q-mt-md-none" />
    </div>

    <!-- Responsive Data Table / Grid -->
    <q-card class="bg-card-dark border-grey-9 q-pa-md q-pa-md-lg relative-position" style="z-index: 10;">
      <q-table
        :grid="$q.screen.lt.md"
        card-class="bg-black-transparent border-grey-9 text-white"
        table-class="text-grey-4 text-left"
        table-header-class="text-grey-5 text-operator-title"
        :rows="students"
        :columns="columns"
        row-key="id"
        flat
        dark
        hide-bottom
        :pagination="{ rowsPerPage: 0 }"
        class="bg-transparent"
        separator="none"
      >
        <!-- Custom Top Bar for Search -->
        <template v-slot:top>
          <div class="row items-center justify-between fit no-wrap q-pb-md">
            <div class="text-h6 text-weight-bold text-white font-mono" style="font-size: 14px;">Master Register</div>
            <q-input dark filled v-model="filter" label="Search students..." color="indigo-4" dense class="bg-black-transparent rounded-borders" style="width: 200px; max-width: 100%;">
              <template v-slot:append>
                <q-icon name="search" size="xs" />
              </template>
            </q-input>
          </div>
        </template>

        <!-- Desktop Row Customization -->
        <template v-slot:body="props">
          <q-tr :props="props" class="border-bottom border-grey-9 hover-bg transition-2 cursor-pointer" @click="openStudentProfile(props.row)">
            <q-td key="id" :props="props" class="font-mono text-white text-weight-bold">
              {{ props.row.id }}
            </q-td>
            <q-td key="name" :props="props">
              <div class="row items-center op-gap-8 no-wrap">
                <q-avatar size="24px" class="bg-indigo-9 text-white">{{ props.row.name.charAt(0) }}</q-avatar>
                <span class="text-white text-weight-medium">{{ props.row.name }}</span>
              </div>
            </q-td>
            <q-td key="classGroup" :props="props" class="font-mono">
              {{ props.row.classGroup }}
            </q-td>
            <q-td key="attendance" :props="props">
              <q-linear-progress :value="props.row.attendance / 100" color="green-4" track-color="green-10" class="q-mt-sm rounded-borders" />
              <div class="text-metric-sm font-mono q-mt-xs text-green-3">{{ props.row.attendance }}%</div>
            </q-td>
            <q-td key="balance" :props="props" class="font-mono text-weight-bold" :class="props.row.balance > 0 ? 'text-red-4' : 'text-grey-4'">
              {{ formatCurrency(props.row.balance) }}
            </q-td>
            <q-td key="actions" :props="props" class="text-right">
              <q-btn flat round dense color="grey-5" icon="chevron_right" size="sm" />
            </q-td>
          </q-tr>
        </template>

        <!-- Mobile Grid Customization -->
        <template v-slot:item="props">
          <div class="q-pa-xs col-12 col-sm-6 col-md-4 transition-2">
            <q-card class="bg-black-transparent border-grey-9 q-pa-md cursor-pointer hover-bg" @click="openStudentProfile(props.row)">
              <div class="row items-center justify-between q-mb-sm">
                <span class="font-mono text-grey-5 text-caption">{{ props.row.id }}</span>
                <q-badge :color="props.row.balance > 0 ? 'red-10' : 'grey-9'" :text-color="props.row.balance > 0 ? 'red-3' : 'grey-5'" class="text-metric-sm font-mono">
                  {{ formatCurrency(props.row.balance) }}
                </q-badge>
              </div>
              <div class="row items-center op-gap-12 q-mb-md">
                <q-avatar size="36px" class="bg-indigo-9 text-white font-mono">{{ props.row.name.charAt(0) }}</q-avatar>
                <div>
                  <div class="text-white text-weight-bold">{{ props.row.name }}</div>
                  <div class="text-grey-5 text-caption">{{ props.row.classGroup }}</div>
                </div>
              </div>
              <div class="q-mt-sm">
                <div class="row justify-between text-caption font-mono q-mb-xs">
                  <span class="text-grey-5">Attendance</span>
                  <span class="text-green-4">{{ props.row.attendance }}%</span>
                </div>
                <q-linear-progress :value="props.row.attendance / 100" color="green-4" track-color="green-10" class="rounded-borders" />
              </div>
            </q-card>
          </div>
        </template>
      </q-table>
    </q-card>

    <!-- Student Detail Profile Dialog (Bottom Sheet on Mobile, Dialog on Desktop) -->
    <q-dialog v-model="profileDialog" :position="$q.screen.lt.sm ? 'bottom' : 'standard'" :full-width="$q.screen.lt.sm">
      <q-card class="bg-card-dark border-grey-9 text-white" :style="$q.screen.lt.sm ? 'border-radius: 16px 16px 0 0;' : 'width: 500px; max-width: 90vw;'">
        <q-card-section class="row items-center justify-between border-bottom border-grey-9 q-pa-md">
          <div class="row items-center op-gap-12">
            <q-avatar size="42px" class="bg-indigo-9 text-white font-mono text-weight-bold">{{ selectedStudent?.name.charAt(0) }}</q-avatar>
            <div>
              <div class="text-h6 text-weight-bold" style="line-height: 1.2;">{{ selectedStudent?.name }}</div>
              <div class="text-caption text-grey-5 font-mono">{{ selectedStudent?.id }} • {{ selectedStudent?.classGroup }}</div>
            </div>
          </div>
          <q-btn icon="close" flat round dense v-close-popup color="grey-5" />
        </q-card-section>

        <q-card-section class="q-pa-md">
          <div class="row q-col-gutter-sm">
            <!-- Academic Record Snippet -->
            <div class="col-12 col-sm-6">
              <div class="enterprise-panel bg-black-transparent border-grey-9 q-pa-sm rounded-borders">
                <div class="text-metric-mono text-grey-5 q-mb-xs" style="font-size: 10px;">GPA / PERFORMANCE</div>
                <div class="text-h6 font-mono text-indigo-3">{{ selectedStudent?.gpa }}</div>
              </div>
            </div>
            <!-- Financial Status Snippet -->
            <div class="col-12 col-sm-6">
              <div class="enterprise-panel bg-black-transparent border-grey-9 q-pa-sm rounded-borders">
                <div class="text-metric-mono text-grey-5 q-mb-xs" style="font-size: 10px;">TUITION BALANCE</div>
                <div class="text-h6 font-mono" :class="selectedStudent?.balance > 0 ? 'text-red-4' : 'text-green-4'">
                  {{ formatCurrency(selectedStudent?.balance) }}
                </div>
              </div>
            </div>
          </div>

          <q-separator dark class="q-my-md opacity-10" />

          <!-- Emergency Contacts -->
          <div class="text-operator-title text-grey-5 q-mb-sm">EMERGENCY CONTACTS</div>
          <q-list dense>
            <q-item class="q-pa-none q-mb-sm">
              <q-item-section avatar class="min-width-0 q-pr-sm">
                <q-icon name="family_restroom" color="grey-5" size="sm" />
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-weight-bold text-white">{{ selectedStudent?.contactName }}</q-item-label>
                <q-item-label caption class="text-grey-5 font-mono">{{ selectedStudent?.contactRelation }} • {{ selectedStudent?.contactPhone }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-btn flat round dense icon="phone" color="green-4" size="sm" />
              </q-item-section>
            </q-item>
          </q-list>

          <q-separator dark class="q-my-md opacity-10" />
          
          <div class="text-operator-title text-grey-5 q-mb-sm">QUICK ACTIONS</div>
          <div class="row q-gutter-x-sm">
            <q-btn outline color="indigo-4" label="Issue Invoice" class="col" size="sm" />
            <q-btn outline color="amber-4" label="Log Incident" class="col" size="sm" />
          </div>

        </q-card-section>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup>
import { ref, computed } from 'vue'

const filter = ref('')
const profileDialog = ref(false)
const selectedStudent = ref(null)

const columns = [
  { name: 'id', align: 'left', label: 'Student ID', field: 'id', sortable: true },
  { name: 'name', align: 'left', label: 'Legal Name', field: 'name', sortable: true },
  { name: 'classGroup', align: 'left', label: 'Enrolled Class', field: 'classGroup', sortable: true },
  { name: 'attendance', align: 'left', label: 'Attendance', field: 'attendance', sortable: true },
  { name: 'balance', align: 'left', label: 'Tuition Bal', field: 'balance', sortable: true },
  { name: 'actions', align: 'right', label: '', field: 'actions' }
]

const students = ref([
  { id: 'STU-980', name: 'David Adebayo Jr.', classGroup: 'Grade 10-A', attendance: 98, balance: 0, gpa: '3.8', contactName: 'Mr. David Adebayo Sr.', contactRelation: 'Father', contactPhone: '+234 801 234 5678' },
  { id: 'STU-981', name: 'Chinelo Okeke', classGroup: 'Grade 11-B', attendance: 85, balance: 45000, gpa: '3.2', contactName: 'Mrs. Grace Okeke', contactRelation: 'Mother', contactPhone: '+234 802 345 6789' },
  { id: 'STU-982', name: 'Musa Abubakar', classGroup: 'Grade 10-A', attendance: 92, balance: 12500, gpa: '3.5', contactName: 'Alhaji Abubakar', contactRelation: 'Guardian', contactPhone: '+234 803 456 7890' },
  { id: 'STU-983', name: 'Sarah Johnson', classGroup: 'Grade 9-C', attendance: 100, balance: 0, gpa: '4.0', contactName: 'Dr. Emily Johnson', contactRelation: 'Mother', contactPhone: '+234 804 567 8901' },
  { id: 'STU-984', name: 'Emmanuel Eze', classGroup: 'Grade 12-A', attendance: 78, balance: 85000, gpa: '2.9', contactName: 'Mr. Peter Eze', contactRelation: 'Father', contactPhone: '+234 805 678 9012' }
])

const openStudentProfile = (student) => {
  selectedStudent.value = student
  profileDialog.value = true
}

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount)
}
</script>

<style scoped>
.ambient-glow {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 400px;
  pointer-events: none;
  z-index: 1;
  transition: background 0.8s ease;
}

.border-grey-9 { border: 1px solid rgba(255,255,255,0.06); }
.border-bottom { border-bottom: 1px solid rgba(255,255,255,0.06); }
.bg-card-dark { background: #0b0f19; }
.bg-black-transparent { background: rgba(0, 0, 0, 0.25) !important; }

.hover-bg:hover { background: rgba(255,255,255,0.02); }
.transition-2 { transition: all 0.2s ease; }
.font-mono { font-family: 'Courier New', Courier, monospace; }
.letter-spacing-1 { letter-spacing: 1px; }
.min-width-0 { min-width: 0; }
</style>
