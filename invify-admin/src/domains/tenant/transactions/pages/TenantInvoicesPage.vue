<template>
  <q-page class="q-pa-lg text-white" style="background: #05070d; min-height: 100vh;">
    
    <!-- Header -->
    <div class="row items-center justify-between q-mb-xl">
      <div>
        <div class="row items-center op-gap-8 no-wrap">
          <q-icon name="receipt" color="purple-4" size="md" />
          <h1 class="text-h4 text-weight-bolder text-white q-my-none letter-spacing-1">Billing Invoices</h1>
        </div>
        <div class="text-caption text-grey-5 q-mt-xs">
          Manage, create, and audit all physical invoices for the tenant.
        </div>
      </div>

      <div class="row q-gutter-sm">
        <q-btn unelevated color="purple-10" icon="add" label="Create Invoice" @click="openCreateDialog" class="text-weight-bold text-caption" />
        <q-btn outline color="grey-5" icon="refresh" label="Refresh" @click="loadInvoices" :loading="loading" class="text-weight-bold text-caption" />
      </div>
    </div>

    <!-- Data Matrix -->
    <q-card class="bg-card-dark border-grey-9">
      <q-table
        :rows="invoices"
        :columns="columns"
        row-key="id"
        dark
        flat
        bordered
        class="bg-card-dark cursor-pointer"
        :loading="loading"
        :rows-per-page-options="[10, 20, 50]"
        @row-click="onRowClick"
      >
        <template v-slot:body-cell-status="props">
          <q-td :props="props">
            <q-badge :color="getStatusColor(props.value)" class="text-weight-bold font-mono" style="font-size: 10px;">
              {{ props.value ? props.value.toUpperCase() : '' }}
            </q-badge>
          </q-td>
        </template>
        
        <template v-slot:body-cell-amount="props">
          <q-td :props="props" class="text-metric-mono font-mono text-weight-bold">
            ₦{{ props.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- Invoice Details Dialog -->
    <q-dialog v-model="showDetailsDialog">
      <q-card class="bg-card-dark border-grey-9 text-white" style="width: 450px; max-width: 90vw;">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6 text-weight-bold">Invoice Details</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="q-pt-md" v-if="selectedInvoice">
          <div class="row items-center justify-between q-mb-md">
            <div class="text-grey-5">Status</div>
            <q-badge :color="getStatusColor(selectedInvoice.status)" class="text-weight-bold font-mono">
              {{ selectedInvoice.status ? selectedInvoice.status.toUpperCase() : '' }}
            </q-badge>
          </div>
          <div class="row items-center justify-between q-mb-md">
            <div class="text-grey-5">Date</div>
            <div class="text-subtitle1">{{ new Date(selectedInvoice.created_at).toLocaleString() }}</div>
          </div>
          <div class="row items-center justify-between q-mb-md">
            <div class="text-grey-5">Invoice Number</div>
            <div class="text-subtitle1">{{ selectedInvoice.invoice_number }}</div>
          </div>
          <div class="row items-center justify-between q-mb-lg">
            <div class="text-grey-5">Customer</div>
            <div class="text-subtitle1">{{ selectedInvoice.metadata?.customer_name || 'Walk-in' }}</div>
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
            <div class="text-h5 font-mono text-weight-bolder">
              ₦{{ Number(selectedInvoice.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="center" class="q-pb-md op-gap-8">
          <q-btn flat color="cyan-4" icon="picture_as_pdf" label="Download Invoice" @click="downloadInvoice" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Create Dialog -->
    <q-dialog v-model="createDialog" persistent>
      <q-card class="bg-card-dark text-white border-grey-9" style="min-width: 400px">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Create New Invoice</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="q-pt-md">
          <q-form @submit="submitInvoice" class="q-gutter-md">
            <q-input v-model="newInvoice.customer_name" label="Customer Name" dark outlined dense required />
            <q-input v-model.number="newInvoice.amount" label="Amount (NGN)" type="number" dark outlined dense required />
            <q-input v-model="newInvoice.description" label="Description" dark outlined dense required />
            
            <div class="text-right q-mt-md">
              <q-btn label="Cancel" color="grey-7" flat v-close-popup class="q-mr-sm" />
              <q-btn label="Generate & Pay" color="purple-10" type="submit" :loading="submitting" />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { FinanceRepository } from '../../../../repositories/FinanceRepository';
import { useRuntimeStore } from '../../../../stores/runtime.store';
import { useFinanceStore } from '../../../../stores/finance.store';

const $q = useQuasar();
const runtimeStore = useRuntimeStore();
const financeStore = useFinanceStore();

const loading = ref(false);
const submitting = ref(false);
const invoices = ref([]);
const createDialog = ref(false);
const showDetailsDialog = ref(false);
const selectedInvoice = ref(null);

const newInvoice = ref({
  customer_name: '',
  amount: 0,
  description: ''
});

const onRowClick = async (evt, row) => {
  selectedInvoice.value = row;
  showDetailsDialog.value = true;
  
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
};

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
            <div style="text-align: right; font-size: 14px;"><strong>Date:</strong> ${new Date(inv.created_at).toLocaleDateString()}</div>
          </div>
        </div>
        <div class="details">
          <div>
            <h3 style="margin-top: 0; color: #666; font-size: 14px; text-transform: uppercase;">Billed To</h3>
            <strong>${inv.metadata?.customer_name || 'Walk-in Customer'}</strong>
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
              <td style="text-align: right;">₦${Number(inv.subtotal || inv.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
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
              <td style="text-align: right; color: #1098ad;">₦${Number(inv.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
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
};

const columns = [
  { name: 'date', label: 'DATE', field: row => new Date(row.created_at).toLocaleString(), align: 'left', sortable: true },
  { name: 'invoice_number', label: 'INVOICE NO', field: 'invoice_number', align: 'left' },
  { name: 'customer', label: 'CUSTOMER', field: row => row.metadata?.customer_name || 'Walk-in', align: 'left' },
  { name: 'amount', label: 'AMOUNT', field: 'total_amount', align: 'right', sortable: true },
  { name: 'status', label: 'STATUS', field: 'status', align: 'center' }
];

const loadInvoices = async () => {
  loading.value = true;
  try {
    const tenantId = runtimeStore.tenantId;
    invoices.value = await FinanceRepository.getInvoices(tenantId, { refresh: true });
  } catch (err) {
    $q.notify({ type: 'negative', message: 'Failed to load invoices' });
  } finally {
    loading.value = false;
  }
};

const openCreateDialog = () => {
  newInvoice.value = { customer_name: '', amount: 0, description: '' };
  createDialog.value = true;
};

const submitInvoice = async () => {
  submitting.value = true;
  try {
    const payload = {
      tenant_id: runtimeStore.tenantId,
      items: [
        {
          description: newInvoice.value.description,
          quantity: 1,
          unit_price: newInvoice.value.amount
        }
      ],
      payment: {
        method: 'CASH',
        amount_paid: newInvoice.value.amount
      },
      metadata: {
        customer_name: newInvoice.value.customer_name,
        source: 'DASHBOARD'
      }
    };
    
    await FinanceRepository.createInvoice(payload);
    
    $q.notify({ type: 'positive', message: 'Invoice generated and paid successfully' });
    createDialog.value = false;
    
    // Refresh local list
    await loadInvoices();
    
    // Optionally trigger a manual summary refresh if sockets are slow or missed
    await financeStore.fetchSummary(true);
    await financeStore.fetchTransactions(true);
    
  } catch (err) {
    console.error(err);
    $q.notify({ type: 'negative', message: err.response?.data?.error || 'Failed to create invoice' });
  } finally {
    submitting.value = false;
  }
};

onMounted(() => {
  loadInvoices();
});

const getStatusColor = (status) => {
  if (!status) return 'grey-9';
  switch (status.toUpperCase()) {
    case 'PAID': return 'green-10';
    case 'PENDING': return 'amber-10';
    case 'CANCELLED': return 'red-10';
    default: return 'grey-9';
  }
};
</script>

<style scoped>
.border-grey-9 { border: 1px solid rgba(255,255,255,0.06); }
.bg-card-dark { background: #0b0f19; }
.letter-spacing-1 { letter-spacing: 1px; }
.font-mono { font-family: 'Courier New', Courier, monospace; }
</style>
