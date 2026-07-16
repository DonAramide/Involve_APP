<template>
  <q-page class="q-pa-lg text-white" style="background: #05070d; min-height: 100vh;">
    
    <!-- Top Nav -->
    <div class="row items-center q-mb-md">
      <q-btn flat round icon="arrow_back" color="white" @click="router.back()" class="q-mr-sm" />
      <div class="text-h5 text-weight-bold">Student Profile</div>
    </div>

    <!-- Header Card -->
    <q-card class="bg-card-dark border-grey-9 q-pa-lg q-mb-lg flex items-center">
      <q-avatar size="100px" color="primary" text-color="white" class="q-mr-lg">
        {{ initials }}
      </q-avatar>
      <div class="column justify-center flex-grow">
        <div class="text-h4 text-weight-bolder">{{ student?.first_name }} {{ student?.last_name }}</div>
        <div class="text-subtitle1 text-grey-5 q-mt-xs">{{ student?.email }} • {{ student?.phone }}</div>
        <div class="row q-mt-sm op-gap-8">
          <q-chip color="cyan-9" text-color="black" size="sm" class="text-weight-bold font-mono">
            {{ student?.metadata?.class || 'N/A' }}
          </q-chip>
          <q-chip color="green-10" text-color="green-3" size="sm" class="text-weight-bold font-mono" v-if="student?.status === 'ACTIVE'">
            ACTIVE
          </q-chip>
        </div>
      </div>
      <div class="column items-end justify-center q-ml-auto">
        <div class="text-caption text-grey-5 text-uppercase">Current Balance</div>
        <div class="row items-center justify-end q-mt-xs op-gap-8">
          <div :class="['text-h4 font-mono text-weight-bolder', balanceColor]">
            ₦{{ balance.toLocaleString() }}
          </div>
          <q-chip 
            v-if="balance > 0" 
            color="red-10" 
            text-color="red-3" 
            size="sm" 
            class="text-weight-bold font-mono"
          >OWING</q-chip>
          <q-chip 
            v-else-if="balance < 0" 
            color="green-10" 
            text-color="green-3" 
            size="sm" 
            class="text-weight-bold font-mono"
          >CREDIT</q-chip>
        </div>
      </div>
    </q-card>

    <!-- Tabs -->
    <q-card class="bg-card-dark border-grey-9">
      <q-tabs
        v-model="tab"
        dense
        class="text-grey-5"
        active-color="cyan-4"
        indicator-color="cyan-4"
        align="left"
        narrow-indicator
      >
        <q-tab name="general" label="General Info" />
        <q-tab name="billing" label="Billing Records" />
        <q-tab name="results" label="Academic Results" />
        <q-tab name="payments" label="Payment History" />
      </q-tabs>

      <q-separator dark class="border-grey-9" />

      <q-tab-panels v-model="tab" animated class="bg-transparent text-white">
        <!-- GENERAL TAB -->
        <q-tab-panel name="general" class="q-pa-lg">
          <div class="row q-col-gutter-lg">
            <div class="col-12 col-md-6">
              <div class="text-caption text-grey-5 text-uppercase q-mb-sm">Demographics</div>
              <div class="q-mb-md">
                <div class="text-grey-4">Admission Number</div>
                <div class="text-body1 font-mono">{{ student?.id || 'N/A' }}</div>
              </div>
              <div class="q-mb-md">
                <div class="text-grey-4">Registration Date</div>
                <div class="text-body1">{{ new Date(student?.created_at || Date.now()).toLocaleDateString() }}</div>
              </div>
              <div class="q-mb-md">
                <div class="text-grey-4">Gender</div>
                <div class="text-body1">{{ student?.metadata?.gender || 'N/A' }}</div>
              </div>
            </div>
            <div class="col-12 col-md-6">
              <div class="text-caption text-grey-5 text-uppercase q-mb-sm">Guardians</div>
              <div class="q-mb-md" v-if="student?.metadata?.guardianName">
                <div class="text-grey-4">Primary Guardian</div>
                <div class="text-body1">{{ student?.metadata?.guardianName }}</div>
                <div class="text-body2 text-grey-5">{{ student?.metadata?.guardianPhone }}</div>
              </div>
              <div v-else class="text-grey-6 text-italic">No guardian assigned</div>
            </div>
          </div>
        </q-tab-panel>

        <!-- BILLING TAB -->
        <q-tab-panel name="billing" class="q-pa-none">
          <q-table
            :rows="mockInvoices"
            :columns="invoiceColumns"
            row-key="id"
            dark
            flat
            class="bg-transparent cursor-pointer"
            hide-pagination
            :rows-per-page-options="[0]"
            @row-click="viewInvoiceDetails"
          >
            <template v-slot:body-cell-status="props">
              <q-td :props="props">
                <q-chip 
                  :color="props.value === 'PAID' ? 'green-10' : (props.value === 'UNPAID' ? 'red-10' : 'orange-10')"
                  :text-color="props.value === 'PAID' ? 'green-3' : (props.value === 'UNPAID' ? 'red-3' : 'orange-3')"
                  size="sm"
                  class="font-mono text-weight-bold"
                >
                  {{ props.value }}
                </q-chip>
              </q-td>
            </template>
            <template v-slot:body-cell-amount="props">
              <q-td :props="props" class="font-mono">₦{{ props.value.toLocaleString() }}</q-td>
            </template>
          </q-table>
        </q-tab-panel>

        <!-- RESULTS TAB -->
        <q-tab-panel name="results" class="q-pa-lg">
          <div v-for="(results, term) in resultsByTerm" :key="term" class="q-mb-xl">
            <div class="text-h6 text-weight-bold q-mb-md text-cyan-4 border-bottom-cyan q-pb-sm">{{ term }}</div>
            <q-table
              :rows="results"
              :columns="resultColumns"
              row-key="id"
              dark
              flat
              bordered
              class="bg-transparent"
              hide-pagination
              :rows-per-page-options="[0]"
            >
              <template v-slot:body-cell-score="props">
                <q-td :props="props" class="font-mono">{{ props.value }}%</q-td>
              </template>
              <template v-slot:body-cell-grade="props">
                <q-td :props="props" class="font-mono text-weight-bold" :class="getGradeColor(props.value)">{{ props.value }}</q-td>
              </template>
            </q-table>
          </div>
        </q-tab-panel>

        <!-- PAYMENTS TAB -->
        <q-tab-panel name="payments" class="q-pa-none">
          <q-table
            :rows="mockPayments"
            :columns="paymentColumns"
            row-key="id"
            dark
            flat
            class="bg-transparent cursor-pointer"
            hide-pagination
            :rows-per-page-options="[0]"
            @row-click="viewPaymentReceipt"
          >
            <template v-slot:body-cell-amount="props">
              <q-td :props="props" class="font-mono text-green-4">+₦{{ props.value.toLocaleString() }}</q-td>
            </template>
          </q-table>
        </q-tab-panel>
      </q-tab-panels>
    </q-card>

    <!-- Payment Receipt Dialog -->
    <q-dialog v-model="showReceiptDialog">
      <q-card class="bg-card-dark border-grey-9 text-white" style="width: 450px; max-width: 90vw;">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6 text-weight-bold">Payment Receipt</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="q-pt-md" v-if="selectedPayment">
          <div class="row items-center justify-between q-mb-md">
            <div class="text-grey-5">Receipt No</div>
            <div class="text-subtitle1 font-mono text-weight-bold">{{ selectedPayment.receipt }}</div>
          </div>
          <div class="row items-center justify-between q-mb-md">
            <div class="text-grey-5">Date</div>
            <div class="text-subtitle1">{{ selectedPayment.date }}</div>
          </div>
          <div class="row items-center justify-between q-mb-md">
            <div class="text-grey-5">Payment Method</div>
            <div class="text-subtitle1">{{ selectedPayment.method }}</div>
          </div>
          <div class="row items-center justify-between q-mb-lg">
            <div class="text-grey-5">Student</div>
            <div class="text-subtitle1">{{ student?.first_name }} {{ student?.last_name }}</div>
          </div>
          
          <q-separator dark class="border-grey-9 q-mb-md" />
          
          <div class="row items-center justify-between">
            <div class="text-h6">Amount Paid</div>
            <div class="text-h5 font-mono text-weight-bolder text-green-4">₦{{ selectedPayment.amount.toLocaleString() }}</div>
          </div>
        </q-card-section>

        <q-card-actions align="center" class="q-pb-md op-gap-8">
          <q-btn flat color="cyan-4" icon="email" label="Email Receipt" @click="sendEmailReceipt" />
          <q-btn unelevated color="cyan-9" text-color="black" icon="picture_as_pdf" label="Download PDF" @click="downloadPdfReceipt" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Invoice Details Dialog -->
    <q-dialog v-model="showInvoiceDialog">
      <q-card class="bg-card-dark border-grey-9 text-white" style="width: 450px; max-width: 90vw;">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6 text-weight-bold">Invoice Details</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="q-pt-md" v-if="selectedInvoice">
          <div class="row items-center justify-between q-mb-md">
            <div class="text-grey-5">Status</div>
            <q-chip 
              :color="selectedInvoice.status === 'PAID' ? 'green-10' : (selectedInvoice.status === 'UNPAID' ? 'red-10' : 'orange-10')"
              :text-color="selectedInvoice.status === 'PAID' ? 'green-3' : (selectedInvoice.status === 'UNPAID' ? 'red-3' : 'orange-3')"
              size="sm"
              class="font-mono text-weight-bold"
            >
              {{ selectedInvoice.status }}
            </q-chip>
          </div>
          <div class="row items-center justify-between q-mb-md">
            <div class="text-grey-5">Date</div>
            <div class="text-subtitle1">{{ selectedInvoice.date }}</div>
          </div>
          <div class="row items-center justify-between q-mb-md">
            <div class="text-grey-5">Description</div>
            <div class="text-subtitle1 text-right" style="max-width: 60%;">{{ selectedInvoice.description }}</div>
          </div>
          <div class="row items-center justify-between q-mb-lg">
            <div class="text-grey-5">Student</div>
            <div class="text-subtitle1">{{ student?.first_name }} {{ student?.last_name }}</div>
          </div>
          
          <q-separator dark class="border-grey-9 q-mb-md" />
          
          <div class="row items-center justify-between">
            <div class="text-h6">Amount Due</div>
            <div class="text-h5 font-mono text-weight-bolder">₦{{ selectedInvoice.amount.toLocaleString() }}</div>
          </div>
        </q-card-section>

        <q-card-actions align="center" class="q-pb-md op-gap-8">
          <q-btn v-if="selectedInvoice?.status === 'UNPAID'" unelevated color="cyan-9" text-color="black" icon="payment" label="Process Payment" @click="processPayment" />
          <q-btn flat color="cyan-4" icon="picture_as_pdf" label="Download Invoice" @click="downloadInvoice" />
        </q-card-actions>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { CrmRepository } from '../../../../repositories/CrmRepository'

const route = useRoute()
const router = useRouter()
const $q = useQuasar()
const tab = ref('general')
const student = ref(null)
const showReceiptDialog = ref(false)
const selectedPayment = ref(null)
const showInvoiceDialog = ref(false)
const selectedInvoice = ref(null)

onMounted(async () => {
  if (route.query.tab) {
    tab.value = route.query.tab
  }

  const tenantId = localStorage.getItem('tenant_id') || 'demo-tenant'
  // In a real app we would call getCustomerProfile(id)
  // But since the stub is in getCustomers, we'll fetch all and find
  const students = await CrmRepository.getCustomers(tenantId, 'STUDENT')
  student.value = students.find(s => s.id === route.params.id) || students[0]
})

const initials = computed(() => {
  if (!student.value) return ''
  return (student.value.first_name?.[0] || '') + (student.value.last_name?.[0] || '')
})

const balance = computed(() => student.value?.metadata?.balance || 0)
const balanceColor = computed(() => balance.value > 0 ? 'text-red-4' : 'text-green-4')

// --- MOCK DATA ---

const invoiceColumns = [
  { name: 'date', label: 'DATE', align: 'left', field: 'date', sortable: true },
  { name: 'description', label: 'DESCRIPTION', align: 'left', field: 'description' },
  { name: 'amount', label: 'AMOUNT (₦)', align: 'right', field: 'amount', sortable: true },
  { name: 'status', label: 'STATUS', align: 'right', field: 'status' }
]
const mockInvoices = [
  { id: 1, date: '2026-06-01', description: 'Term 3 Tuition', amount: 45000, status: 'PAID' },
  { id: 2, date: '2026-06-01', description: 'School Bus Fee', amount: 15000, status: 'UNPAID' }
]

const viewInvoiceDetails = (evt, row) => {
  selectedInvoice.value = row
  showInvoiceDialog.value = true
}

const downloadInvoice = () => {
  $q.notify({
    type: 'info',
    message: 'Downloading Invoice PDF...',
    position: 'top-right',
    icon: 'download'
  })
}

const processPayment = () => {
  $q.notify({
    type: 'info',
    message: 'Opening payment gateway...',
    position: 'top-right',
    icon: 'payment'
  })
}

const resultColumns = [
  { name: 'subject', label: 'SUBJECT', align: 'left', field: 'subject', sortable: true },
  { name: 'score', label: 'SCORE', align: 'right', field: 'score', sortable: true },
  { name: 'grade', label: 'GRADE', align: 'right', field: 'grade' }
]
const mockResults = [
  { id: 1, term: 'Term 2 (2025/2026)', subject: 'Mathematics', score: 85, grade: 'A' },
  { id: 2, term: 'Term 2 (2025/2026)', subject: 'English Language', score: 72, grade: 'B' },
  { id: 3, term: 'Term 2 (2025/2026)', subject: 'Basic Science', score: 68, grade: 'C' },
  { id: 4, term: 'Term 2 (2025/2026)', subject: 'History', score: 91, grade: 'A' },
  { id: 5, term: 'Term 1 (2025/2026)', subject: 'Mathematics', score: 78, grade: 'B' },
  { id: 6, term: 'Term 1 (2025/2026)', subject: 'English Language', score: 65, grade: 'C' }
]

const resultsByTerm = computed(() => {
  const grouped = {}
  mockResults.forEach(r => {
    if (!grouped[r.term]) grouped[r.term] = []
    grouped[r.term].push(r)
  })
  return grouped
})
const getGradeColor = (grade) => {
  if (grade === 'A') return 'text-green-4'
  if (grade === 'B') return 'text-blue-4'
  if (grade === 'C') return 'text-orange-4'
  return 'text-red-4'
}

const paymentColumns = [
  { name: 'date', label: 'DATE', align: 'left', field: 'date', sortable: true },
  { name: 'receipt', label: 'RECEIPT NO', align: 'left', field: 'receipt' },
  { name: 'method', label: 'METHOD', align: 'left', field: 'method' },
  { name: 'amount', label: 'AMOUNT (₦)', align: 'right', field: 'amount', sortable: true }
]
const mockPayments = [
  { id: 1, date: '2026-06-05', receipt: 'REC-2026-9812', method: 'Bank Transfer', amount: 45000 },
  { id: 2, date: '2026-01-10', receipt: 'REC-2026-1102', method: 'Card (Paystack)', amount: 60000 }
]

const viewPaymentReceipt = (evt, row) => {
  selectedPayment.value = row
  showReceiptDialog.value = true
}

const sendEmailReceipt = () => {
  $q.notify({
    type: 'positive',
    message: `Receipt sent to ${student.value?.email}`,
    position: 'top-right',
    icon: 'check_circle'
  })
}

const downloadPdfReceipt = () => {
  $q.notify({
    type: 'info',
    message: 'Downloading PDF receipt...',
    position: 'top-right',
    icon: 'download'
  })
}
</script>

<style scoped>
.bg-card-dark {
  background: rgba(255, 255, 255, 0.02);
}
.border-grey-9 {
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.font-mono {
  font-family: 'Courier New', Courier, monospace;
}
.flex-grow {
  flex-grow: 1;
}
.border-bottom-cyan {
  border-bottom: 2px solid var(--q-cyan-4);
  display: inline-block;
}
</style>
