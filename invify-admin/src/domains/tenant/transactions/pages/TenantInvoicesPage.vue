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
        class="bg-card-dark"
        :loading="loading"
        :rows-per-page-options="[10, 20, 50]"
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
            ₦{{ props.value.toLocaleString() }}
          </q-td>
        </template>
      </q-table>
    </q-card>

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

const newInvoice = ref({
  customer_name: '',
  amount: 0,
  description: ''
});

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
