<template>
  <q-page class="q-pa-lg text-white" style="background: #05070d; min-height: 100vh;">
    
    <!-- Top Nav -->
    <div class="row items-center q-mb-md">
      <q-btn flat round icon="arrow_back" color="white" @click="router.back()" class="q-mr-sm" />
      <div class="text-h5 text-weight-bold">{{ profileTitle }}</div>
    </div>

    <!-- Header Card -->
    <q-card class="bg-card-dark border-grey-9 q-pa-lg q-mb-lg flex items-center">
      <q-avatar size="100px" color="primary" text-color="white" class="q-mr-lg">
        {{ initials }}
      </q-avatar>
      <div class="column justify-center flex-grow">
        <div class="text-h4 text-weight-bolder">{{ displayName }}</div>
        <div class="text-subtitle1 text-grey-5 q-mt-xs">{{ student?.email }} • {{ student?.phone }}</div>
        <div class="row q-mt-sm op-gap-8">
          <q-chip color="cyan-9" text-color="black" size="sm" class="text-weight-bold font-mono" v-if="isSchool">
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
            {{ formattedBalance }}
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
          >SURPLUS</q-chip>
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
        <q-tab name="results" label="Academic Results" v-if="isSchool" />
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
                <div class="text-grey-4">{{ isSchool ? 'Admission Number' : 'Customer Account ID' }}</div>
                <div class="text-body1 font-mono">{{ student?.id || 'N/A' }}</div>
              </div>
              <div class="q-mb-md">
                <div class="text-grey-4">Registration Date</div>
                <div class="text-body1">{{ new Date(student?.created_at || Date.now()).toLocaleDateString() }}</div>
              </div>
              <div class="q-mb-md" v-if="isSchool">
                <div class="text-grey-4">Gender</div>
                <div class="text-body1">{{ student?.metadata?.gender || 'N/A' }}</div>
              </div>
            </div>
            <div class="col-12 col-md-6" v-if="isSchool">
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
            :rows="customerInvoices"
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
            :rows="customerPayments"
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
            <div class="text-grey-5">{{ entityLabel }}</div>
            <div class="text-subtitle1">{{ displayName }}</div>
          </div>
          
          <q-separator dark class="border-grey-9 q-mb-md" />

          <!-- Itemized Details for Retail -->
          <div v-if="!isSchool && selectedPayment.items && selectedPayment.items.length" class="q-mb-lg">
            <div class="text-caption text-grey-5 text-uppercase q-mb-sm">Items purchased</div>
            <div v-for="item in selectedPayment.items" :key="item.name" class="row items-center justify-between q-py-xs text-caption">
              <div class="text-grey-3">{{ item.name }} (x{{ item.quantity }})</div>
              <div class="font-mono">₦{{ item.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</div>
            </div>
            <q-separator dark class="border-grey-9 q-mt-md q-mb-none" />
          </div>
          
          <div class="row items-center justify-between">
            <div class="text-h6">Amount Paid</div>
            <div class="text-h5 font-mono text-weight-bolder text-green-4">₦{{ selectedPayment.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</div>
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
            <div class="text-grey-5">{{ entityLabel }}</div>
            <div class="text-subtitle1">{{ displayName }}</div>
          </div>
          
          <q-separator dark class="border-grey-9 q-mb-md" />

          <!-- Itemized Details for Invoice -->
          <div v-if="selectedInvoice.items && selectedInvoice.items.length" class="q-mb-lg">
            <div class="text-caption text-grey-5 text-uppercase q-mb-sm">Invoice Items</div>
            <div v-for="item in selectedInvoice.items" :key="item.name" class="row items-center justify-between q-py-xs text-caption">
              <div class="text-grey-3">{{ item.name }} (x{{ item.quantity }})</div>
              <div class="font-mono">₦{{ item.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</div>
            </div>
            <q-separator dark class="border-grey-9 q-mt-md q-mb-none" />
          </div>
          
          <div class="row items-center justify-between">
            <div class="text-h6">Amount Due</div>
            <div class="text-h5 font-mono text-weight-bolder">₦{{ selectedInvoice.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</div>
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
import { FinanceRepository } from '../../../../repositories/FinanceRepository'

const route = useRoute()
const router = useRouter()
const $q = useQuasar()
const tab = ref('general')
const student = ref(null)
const showReceiptDialog = ref(false)
const selectedPayment = ref(null)
const showInvoiceDialog = ref(false)
const selectedInvoice = ref(null)

const customerInvoices = ref([])
const customerPayments = ref([])

const isSchool = computed(() => {
  const type = localStorage.getItem('tenant_type') || 'school'
  return type.toLowerCase() === 'school'
})

const profileTitle = computed(() => isSchool.value ? 'Student Profile' : 'Customer Profile')
const entityLabel = computed(() => isSchool.value ? 'Student' : 'Customer')

const loadRealInvoicesAndPayments = async (tenantId) => {
  try {
    const allInvoices = await FinanceRepository.getInvoices(tenantId, { refresh: true });
    
    // Filter for this customer ID (match case-insensitive or direct match)
    customerInvoices.value = allInvoices
      .filter(inv => inv.customer_id === route.params.id)
      .map(inv => {
        return {
          id: inv.id,
          date: inv.created_at ? new Date(inv.created_at).toISOString().split('T')[0] : 'N/A',
          description: inv.invoice_number || 'Billing Invoice',
          amount: inv.total_amount || 0,
          status: inv.payment_status || inv.status || 'UNPAID',
          invoice_number: inv.invoice_number,
          items: inv.items || []
        };
      });

    // Populate payments tab with paid invoices
    customerPayments.value = customerInvoices.value
      .filter(inv => inv.status?.toUpperCase() === 'PAID')
      .map(inv => {
        return {
          id: inv.id,
          date: inv.date,
          receipt: inv.invoice_number || `REC-${inv.id.slice(0, 8)}`,
          method: inv.metadata?.payment?.method || 'Cash',
          amount: inv.amount,
          items: inv.items || []
        };
      });
  } catch (err) {
    console.error('Failed to load real customer invoices:', err);
  }
}

onMounted(async () => {
  if (route.query.tab) {
    tab.value = route.query.tab
  }

  const tenantId = localStorage.getItem('tenant_id') || 'demo-tenant'
  const type = isSchool.value ? 'STUDENT' : 'CUSTOMER'
  const students = await CrmRepository.getCustomers(tenantId, type)
  student.value = students.find(s => s.id === route.params.id) || students[0]

  await loadRealInvoicesAndPayments(tenantId)
})

const displayName = computed(() => {
  return student.value?.name || (student.value?.first_name ? `${student.value.first_name} ${student.value.last_name}` : 'Unknown')
})

const initials = computed(() => {
  if (!student.value) return ''
  if (student.value.name) {
    const parts = student.value.name.split(' ')
    return (parts[0]?.[0] || '') + (parts[1]?.[0] || '')
  }
  return (student.value.first_name?.[0] || '') + (student.value.last_name?.[0] || '')
})

const balance = computed(() => student.value?.balance !== undefined ? student.value.balance : (student.value?.metadata?.balance || 0))
const balanceColor = computed(() => {
  const val = Number(balance.value || 0)
  if (val > 0) return 'text-red-4'
  if (val < 0) return 'text-green-4'
  return 'text-grey-5'
})
const formattedBalance = computed(() => {
  const val = Number(balance.value || 0)
  if (val < 0) {
    return `-₦${Math.abs(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  return `₦${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
})

// --- DATA COLUMNS ---

const invoiceColumns = [
  { name: 'date', label: 'DATE', align: 'left', field: 'date', sortable: true },
  { name: 'description', label: 'DESCRIPTION', align: 'left', field: 'description' },
  { name: 'amount', label: 'AMOUNT (₦)', align: 'right', field: 'amount', sortable: true },
  { name: 'status', label: 'STATUS', align: 'right', field: 'status' }
]

const viewInvoiceDetails = async (evt, row) => {
  selectedInvoice.value = row
  showInvoiceDialog.value = true
  
  if (!row.items || !row.items.length) {
    try {
      const detailed = await FinanceRepository.getInvoice(row.id);
      if (detailed && detailed.items) {
        selectedInvoice.value = {
          ...row,
          items: detailed.items
        };
      }
    } catch (e) {
      console.error('Failed to load invoice items:', e);
    }
  }
}

const downloadInvoice = () => {
  if (!selectedInvoice.value) return;
  const inv = selectedInvoice.value;
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  
  const itemsHtml = (inv.items || []).map(item => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.name || 'Product Item'}</td>
      <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">₦${Number(item.unit_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">₦${Number(item.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
    </tr>
  `).join('');

  const html = `
    <html` + `>
      <head>
        <title>Invoice - ${inv.invoice_number}</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; margin: 40px; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #333; padding-bottom: 20px; }
          .logo { font-size: 24px; font-weight: bold; color: #1098ad; }
          .title { font-size: 24px; font-weight: bold; text-align: right; }
          .details { display: flex; justify-content: space-between; margin-top: 30px; }
          .details div { width: 45%; }
          .table { width: 100%; border-collapse: collapse; margin-top: 40px; }
          .table th { background: #f5f5f5; padding: 10px; text-align: left; border-bottom: 2px solid #ddd; }
          .summary { margin-top: 30px; display: flex; justify-content: flex-end; }
          .summary table { width: 300px; border-collapse: collapse; }
          .summary td { padding: 8px 0; }
          .summary .total { font-weight: bold; font-size: 18px; border-top: 2px solid #333; padding-top: 10px; }
          @media print {
            body { margin: 20px; }
          }
        </style>
      </head>
      <body` + `>
        <div class="header">
          <div>
            <div class="logo">INVIFY</div>
            <div style="margin-top: 5px; font-size: 12px; color: #666;">SaaS Financial Orchestration Center</div>
          </div>
          <div>
            <div class="title">INVOICE</div>
            <div style="margin-top: 5px; text-align: right; font-size: 14px;"><strong>No:</strong> ${inv.invoice_number}</div>
            <div style="text-align: right; font-size: 14px;"><strong>Date:</strong> ${inv.date}</div>
          </div>
        </div>
        <div class="details">
          <div>
            <h3 style="margin-top: 0; color: #666; font-size: 14px; text-transform: uppercase;">Billed To</h3>
            <strong>${displayName.value}</strong><br>
            ${student.value?.email || ''}<br>
            ${student.value?.phone || ''}
          </div>
          <div style="text-align: right;">
            <h3 style="margin-top: 0; color: #666; font-size: 14px; text-transform: uppercase;">Payment Details</h3>
            <strong>Status:</strong> ${inv.status || 'UNPAID'}<br>
            <strong>Method:</strong> ${inv.payment_method || 'N/A'}
          </div>
        </div>
        <table class="table">
          <thead>
            <tr>
              <th>Item Name</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Unit Price</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml.length ? itemsHtml : '<tr><td colspan="4" style="padding: 10px; text-align: center; color: #888;">No items registered.</td></tr>'}
          </tbody>
        </table>
        <div class="summary">
          <table>
            <tr>
              <td>Subtotal:</td>
              <td style="text-align: right;">₦${Number(inv.subtotal || inv.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
            ${inv.tax_amount > 0 ? `
            <tr>
              <td>Tax:</td>
              <td style="text-align: right;">₦${Number(inv.tax_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>` : ''}
            ${inv.discount_amount > 0 ? `
            <tr>
              <td>Discount:</td>
              <td style="text-align: right;">-₦${Number(inv.discount_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>` : ''}
            <tr class="total">
              <td>Total Value:</td>
              <td style="text-align: right; color: #1098ad;">₦${Number(inv.amount || inv.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
          </table>
        </div>
        <script` + `>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          }
        </script` + `>
      </body` + `>
    </html` + `>
  `;
  printWindow.document.write(html);
  printWindow.document.close();
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

const viewPaymentReceipt = async (evt, row) => {
  selectedPayment.value = row
  showReceiptDialog.value = true

  if (!row.items || !row.items.length) {
    try {
      const detailed = await FinanceRepository.getInvoice(row.id);
      if (detailed && detailed.items) {
        selectedPayment.value = {
          ...row,
          items: detailed.items
        };
      }
    } catch (e) {
      console.error('Failed to load payment items:', e);
    }
  }
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
  if (!selectedPayment.value) return;
  const pay = selectedPayment.value;
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const itemsHtml = (pay.items || []).map(item => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.name || 'Product Item'}</td>
      <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity || 1}</td>
      <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">₦${Number(item.unit_price || item.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">₦${Number(item.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
    </tr>
  `).join('');

  const html = `
    <html` + `>
      <head>
        <title>Receipt - ${pay.id.substring(0, 8).toUpperCase()}</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; margin: 40px; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #333; padding-bottom: 20px; }
          .logo { font-size: 24px; font-weight: bold; color: #2e7d32; }
          .title { font-size: 24px; font-weight: bold; text-align: right; }
          .details { display: flex; justify-content: space-between; margin-top: 30px; }
          .details div { width: 45%; }
          .table { width: 100%; border-collapse: collapse; margin-top: 40px; }
          .table th { background: #f5f5f5; padding: 10px; text-align: left; border-bottom: 2px solid #ddd; }
          .summary { margin-top: 30px; display: flex; justify-content: flex-end; }
          .summary table { width: 300px; border-collapse: collapse; }
          .summary td { padding: 8px 0; }
          .summary .total { font-weight: bold; font-size: 18px; border-top: 2px solid #333; padding-top: 10px; }
          @media print {
            body { margin: 20px; }
          }
        </style>
      </head>
      <body` + `>
        <div class="header">
          <div>
            <div class="logo">INVIFY</div>
            <div style="margin-top: 5px; font-size: 12px; color: #666;">SaaS Financial Orchestration Center</div>
          </div>
          <div>
            <div class="title">PAYMENT RECEIPT</div>
            <div style="margin-top: 5px; text-align: right; font-size: 14px;"><strong>Ref:</strong> ${pay.id.substring(0, 8).toUpperCase()}</div>
            <div style="text-align: right; font-size: 14px;"><strong>Date:</strong> ${new Date(pay.created_at || pay.date).toLocaleDateString()}</div>
          </div>
        </div>
        <div class="details">
          <div>
            <h3 style="margin-top: 0; color: #666; font-size: 14px; text-transform: uppercase;">Customer Info</h3>
            <strong>${displayName.value}</strong><br>
            ${student.value?.email || ''}<br>
            ${student.value?.phone || ''}
          </div>
          <div style="text-align: right;">
            <h3 style="margin-top: 0; color: #666; font-size: 14px; text-transform: uppercase;">Payment Details</h3>
            <strong>Status:</strong> SUCCESSFUL<br>
            <strong>Method:</strong> ${pay.payment_method || pay.channel || 'N/A'}<br>
            <strong>Invoice:</strong> ${pay.description || 'N/A'}
          </div>
        </div>
        <table class="table">
          <thead>
            <tr>
              <th>Item Name</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Price</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml.length ? itemsHtml : `<tr><td style="padding: 10px; border-bottom: 1px solid #ddd;">${pay.description || 'Customer Payment'}</td><td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">1</td><td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">₦${Number(pay.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td><td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">₦${Number(pay.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>`}
          </tbody>
        </table>
        <div class="summary">
          <table>
            <tr class="total">
              <td>Amount Paid:</td>
              <td style="text-align: right; color: #2e7d32;">₦${Number(pay.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
          </table>
        </div>
        <script` + `>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          }
        </script` + `>
      </body` + `>
    </html` + `>
  `;
  printWindow.document.write(html);
  printWindow.document.close();
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
