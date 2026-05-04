<!-- invify-admin/src/pages/ReconciliationPage.vue -->
<template>
  <q-page class="q-pa-lg bg-dark text-white">
    <!-- Header -->
    <div class="row items-center q-mb-lg">
      <div class="col">
        <h1 class="text-h4 text-weight-bolder q-ma-none text-white">Reconciliation Hub</h1>
        <div class="text-grey-6">Sync check between payment provider intents and immutable ledger entries.</div>
      </div>
      <div class="col-auto">
        <q-btn 
          color="indigo-7" 
          icon="refresh" 
          label="Run Integrity Check" 
          :loading="loading" 
          @click="fetchReport"
          class="glossy"
        />
      </div>
    </div>

    <!-- Summary Cards -->
    <div class="row q-col-gutter-md q-mb-xl">
      <div class="col-12 col-md-3">
        <q-card class="bg-blue-grey-10 border-green shadow-2">
          <q-card-section>
            <div class="text-overline text-grey-6">Matched Payments</div>
            <div class="text-h3 text-weight-bold text-green-4">{{ report.matchedPayments.length }}</div>
            <q-linear-progress :value="1" color="green-4" class="q-mt-sm" />
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-md-3">
        <q-card class="bg-blue-grey-10 border-orange shadow-2">
          <q-card-section>
            <div class="text-overline text-grey-6">Unmatched / Manual Action</div>
            <div class="text-h3 text-weight-bold text-orange-4">{{ report.unmatchedPayments.length }}</div>
            <q-linear-progress :value="1" color="orange-4" class="q-mt-sm" />
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-md-3">
        <q-card class="bg-blue-grey-10 border-red shadow-2">
          <q-card-section>
            <div class="text-overline text-grey-6">Critical Discrepancies</div>
            <div class="text-h3 text-weight-bold text-red-4">{{ report.discrepancies.length }}</div>
            <q-linear-progress :value="1" color="red-4" class="q-mt-sm" />
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-md-3">
        <q-card class="bg-blue-grey-10 border-indigo shadow-2">
          <q-card-section>
            <div class="text-overline text-grey-6">Failed Intents</div>
            <div class="text-h3 text-weight-bold text-indigo-4">{{ report.failedPayments.length }}</div>
            <q-linear-progress :value="1" color="indigo-4" class="q-mt-sm" />
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Main Content Tabs -->
    <q-tabs
      v-model="tab"
      dense
      class="text-grey-6 q-mb-md"
      active-color="indigo-3"
      indicator-color="indigo-3"
      align="left"
      narrow-indicator
    >
      <q-tab name="unmatched" :label="`Action Required (${report.unmatchedPayments.length})`" />
      <q-tab name="discrepancies" :label="`Discrepancies (${report.discrepancies.length})`" />
      <q-tab name="matched" label="Matched" />
      <q-tab name="failed" label="Failed Intents" />
    </q-tabs>

    <q-separator dark />

    <q-tab-panels v-model="tab" animated class="bg-transparent q-mt-md">
      <!-- UNMATCHED PANEL -->
      <q-tab-panel name="unmatched" class="q-pa-none">
        <q-table
          :rows="report.unmatchedPayments"
          :columns="columns"
          row-key="reference"
          flat bordered dark
          class="bg-blue-grey-10 shadow-2"
          :loading="loading"
        >
          <template v-slot:body-cell-issueType="props">
            <q-td :props="props">
              <q-chip outline color="orange-4" text-color="white" size="sm" dense>
                {{ formatIssue(props.value) }}
              </q-chip>
            </q-td>
          </template>
          <template v-slot:body-cell-actions="props">
            <q-td :props="props" class="text-center">
              <q-btn 
                v-if="props.row.issueType === 'missing_student'"
                flat dense color="indigo-3" 
                label="Assign Student" 
                icon="person_add" 
                @click="openAssignModal(props.row)"
              />
            </q-td>
          </template>
        </q-table>
      </q-tab-panel>

      <!-- DISCREPANCIES PANEL -->
      <q-tab-panel name="discrepancies" class="q-pa-none">
        <q-table
          :rows="report.discrepancies"
          :columns="columns"
          row-key="reference"
          flat bordered dark
          class="bg-blue-grey-10 shadow-2"
          :loading="loading"
        >
          <template v-slot:body-cell-issueType="props">
            <q-td :props="props">
              <q-chip outline color="red-4" text-color="white" size="sm" dense>
                {{ formatIssue(props.value) }}
              </q-chip>
            </q-td>
          </template>
        </q-tab-panel>

      <!-- MATCHED PANEL -->
      <q-tab-panel name="matched" class="q-pa-none">
        <q-table
          :rows="report.matchedPayments"
          :columns="columns"
          row-key="reference"
          flat bordered dark
          class="bg-blue-grey-10 shadow-2"
          :loading="loading"
        />
      </q-tab-panel>

      <!-- FAILED PANEL -->
      <q-tab-panel name="failed" class="q-pa-none">
        <q-table
          :rows="report.failedPayments"
          :columns="columns"
          row-key="reference"
          flat bordered dark
          class="bg-blue-grey-10 shadow-2"
          :loading="loading"
        />
      </q-tab-panel>
    </q-tab-panels>

    <!-- Assign Student Modal -->
    <q-dialog v-model="assignModal" backdrop-filter="blur(10px)">
      <q-card style="width: 450px;" class="bg-blue-grey-10 text-white border-indigo">
        <q-card-section>
          <div class="text-h6 text-weight-bold">Resolve Missing Student</div>
          <div class="text-caption text-grey-6">Assign Reference: {{ selectedPayment?.reference }}</div>
        </q-card-section>

        <q-card-section>
          <q-select
            v-model="targetStudent"
            :options="studentOptions"
            label="Search Student"
            dark filled
            use-input
            input-debounce="300"
            @filter="filterStudents"
            emit-value map-options
          >
            <template v-slot:no-option>
              <q-item><q-item-section class="text-grey">No students found</q-item-section></q-item>
            </template>
          </q-select>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancel" v-close-popup color="grey-6" />
          <q-btn 
            unelevated 
            label="Confirm & Patch" 
            color="indigo-7" 
            :loading="patching"
            @click="patchPayment"
            :disable="!targetStudent"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { reconciliationApi, attendanceApi } from '../api'
import { useQuasar } from 'quasar'

const $q = useQuasar()
const loading = ref(false)
const tab = ref('unmatched')
const report = ref({
  matchedPayments: [],
  unmatchedPayments: [],
  failedPayments: [],
  discrepancies: []
})

const assignModal = ref(false)
const selectedPayment = ref(null)
const targetStudent = ref(null)
const patching = ref(false)
const studentOptions = ref([])
const allStudents = ref([])

const columns = [
  { name: 'createdAt', label: 'DATE', field: 'createdAt', format: val => new Date(val).toLocaleString(), align: 'left', sortable: true },
  { name: 'reference', label: 'REFERENCE', field: 'reference', align: 'left' },
  { name: 'amount', label: 'AMOUNT', field: 'amount', format: val => `₦${Number(val).toLocaleString()}`, align: 'right' },
  { name: 'issueType', label: 'DETECTION', field: 'issueType', align: 'left' },
  { name: 'actions', label: 'ACTIONS', align: 'center' }
]

const formatIssue = (type) => {
  if (!type) return 'CLEAR'
  return type.replace(/_/g, ' ').toUpperCase()
}

const fetchReport = async () => {
  loading.value = true
  try {
    const { data } = await reconciliationApi.getReport()
    report.value = data
  } catch (err) {
    $q.notify({ color: 'negative', message: 'Failed to generate report' })
  } finally {
    loading.value = false
  }
}

const openAssignModal = (payment) => {
  selectedPayment.value = payment
  targetStudent.value = null
  assignModal.value = true
}

const filterStudents = (val, update) => {
  if (val === '') {
    update(() => {
      studentOptions.value = allStudents.value.map(s => ({ 
        label: `${s.first_name} ${s.last_name} (${s.admission_number})`, 
        value: s.id 
      }))
    })
    return
  }

  update(() => {
    const needle = val.toLowerCase()
    studentOptions.value = allStudents.value
      .filter(s => 
        s.first_name.toLowerCase().includes(needle) || 
        s.last_name.toLowerCase().includes(needle) ||
        s.admission_number.toLowerCase().includes(needle)
      )
      .map(s => ({ 
        label: `${s.first_name} ${s.last_name} (${s.admission_number})`, 
        value: s.id 
      }))
  })
}

const patchPayment = async () => {
  patching.value = true
  try {
    await reconciliationApi.fixIssue({
      reference: selectedPayment.value.reference,
      walletId: targetStudent.value, // We use student ID as walletId here per service logic
      action: 'assign_student'
    })
    $q.notify({ color: 'positive', message: 'Payment patched successfully' })
    assignModal.value = false
    fetchReport()
  } catch (err) {
    $q.notify({ color: 'negative', message: 'Patch failed' })
  } finally {
    patching.value = false
  }
}

onMounted(async () => {
  fetchReport()
  // Pre-load students for the assignment dialog
  const { data } = await attendanceApi.listStudents()
  allStudents.value = data
})
</script>

<style scoped>
.border-green { border-left: 5px solid #66bb6a; }
.border-orange { border-left: 5px solid #ffa726; }
.border-red { border-left: 5px solid #ef5350; }
.border-indigo { border-left: 5px solid #5c6bc0; }
.bg-blue-grey-10 { background: #1c262b; }
</style>
