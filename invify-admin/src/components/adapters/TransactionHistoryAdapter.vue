<template>
  <q-table
    title="Transaction History"
    :rows="financeStore.transactions"
    :columns="columns"
    row-key="id"
    :loading="financeStore.isLoading"
    flat bordered dark
    class="bg-blue-grey-10 border-grey-9 shadow-2 full-width cursor-pointer"
    :pagination="{ rowsPerPage: 15 }"
    title-class="text-indigo-3 text-weight-bold text-uppercase font-mono"
    style="min-height: 380px;"
    @row-click="onRowClick"
  >
    <template v-slot:no-data>
      <div class="full-width row flex-center q-pa-xl text-grey-6">
        <q-icon size="2em" name="history" />
        <span class="q-ml-sm">No transaction history found.</span>
      </div>
    </template>
  </q-table>

  <!-- Detailed Transaction/Purchase Dialog -->
  <q-dialog v-model="showDetailsDialog" backdrop-filter="blur(4px)">
    <q-card class="bg-card-dark text-white border-grey-9 q-pa-md" style="width: 600px; max-width: 90vw; border-radius: 12px;">
      <q-card-section class="row items-center justify-between q-pb-md border-bottom-grey-9">
        <div class="column">
          <span class="text-h6 text-weight-bold">Transaction Details</span>
          <span class="text-caption text-grey-5" v-if="selectedInvoice">Ref: {{ selectedInvoice.invoice_number || selectedInvoice.id }}</span>
        </div>
        <q-btn icon="close" flat round dense v-close-popup color="grey-5" />
      </q-card-section>

      <!-- Loading State -->
      <q-card-section v-if="isLoadingDetails" class="column items-center q-py-xl">
        <q-spinner-dots size="40px" color="indigo-4" />
        <span class="text-caption text-grey-5 q-mt-md">Loading purchase items...</span>
      </q-card-section>

      <!-- Content State -->
      <q-card-section v-else-if="selectedInvoice" class="q-py-md column op-gap-16">
        <!-- Invoice Metadata Grid -->
        <div class="row q-col-gutter-md">
          <div class="col-6 column">
            <span class="text-overline text-grey-5 font-mono">Customer Name</span>
            <span class="text-body2 text-weight-bold">{{ selectedInvoice.customer?.name || selectedInvoice.customerName || 'Walk-in Customer' }}</span>
          </div>
          <div class="col-6 column">
            <span class="text-overline text-grey-5 font-mono">Date / Time</span>
            <span class="text-body2">{{ formattedDate }}</span>
          </div>
          <div class="col-6 column">
            <span class="text-overline text-grey-5 font-mono">Payment Method</span>
            <span class="text-body2 text-weight-bold text-uppercase text-cyan-4">{{ selectedInvoice.payment_method || 'N/A' }}</span>
          </div>
          <div class="col-6 column">
            <span class="text-overline text-grey-5 font-mono">Settlement Status</span>
            <q-badge 
              :color="selectedInvoice.payment_status === 'Paid' ? 'green-14' : 'orange-14'" 
              class="self-start text-weight-bold text-uppercase"
              style="padding: 4px 8px; font-size: 10px;"
            >
              {{ selectedInvoice.payment_status || 'Unpaid' }}
            </q-badge>
          </div>
        </div>

        <q-separator dark class="q-my-sm" />

        <!-- Purchased Items Section -->
        <div>
          <div class="text-overline text-grey-5 font-mono q-mb-xs">Purchased Items</div>
          <div class="bg-blue-grey-11 rounded-borders border-grey-9 overflow-hidden">
            <q-list dark separator class="q-pa-xs">
              <q-item v-for="item in selectedInvoice.items" :key="item.id" class="q-py-sm">
                <q-item-section>
                   <q-item-label class="text-weight-bold text-white">{{ item.name || 'Product Item' }}</q-item-label>
                  <q-item-label caption class="text-grey-5" style="font-size: 11px;">
                    Qty: {{ item.quantity }} × ₦{{ Number(item.unit_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                  </q-item-label>
                </q-item-section>
                <q-item-section side class="text-white text-weight-bold">
                  ₦{{ (Number(item.quantity || 0) * Number(item.unit_price || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                </q-item-section>
              </q-item>
              <q-item v-if="!selectedInvoice.items || selectedInvoice.items.length === 0" class="q-py-md text-center text-grey-6 text-caption">
                No item details recorded.
              </q-item>
            </q-list>
          </div>
        </div>

        <!-- Financial Calculation Summary -->
        <div class="column items-end op-gap-4 q-mt-sm">
          <div class="row justify-between w-full text-caption text-grey-4">
            <span>Subtotal:</span>
            <span>₦{{ Number(selectedInvoice.subtotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
          </div>
          <div v-if="selectedInvoice.tax_amount > 0" class="row justify-between w-full text-caption text-grey-4">
            <span>Tax Amount:</span>
            <span>₦{{ Number(selectedInvoice.tax_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
          </div>
          <div v-if="selectedInvoice.discount_amount > 0" class="row justify-between w-full text-caption text-grey-4">
            <span>Discount:</span>
            <span>-₦{{ Number(selectedInvoice.discount_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
          </div>
          <div class="row justify-between w-full text-body1 text-weight-bolder text-white q-mt-xs border-top-grey-9 q-pt-xs">
            <span>Total Value:</span>
            <span class="text-cyan-4">₦{{ Number(selectedInvoice.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
          </div>
        </div>
      </q-card-section>

      <!-- Fallback / No Data State -->
      <q-card-section v-else class="column items-center justify-center q-py-xl text-center">
        <q-icon name="receipt_long" size="48px" color="grey-6" class="q-mb-md" />
        <div class="text-subtitle1 text-weight-medium text-grey-4">No Purchase Details</div>
        <div class="text-caption text-grey-6 q-mt-xs" style="max-width: 320px;">
          This ledger transaction represents a manual entry, payout, or adjustment that is not linked to a customer sales invoice.
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useFinanceStore } from '../../stores/finance.store';
import { FinanceRepository } from '../../repositories/FinanceRepository';

const financeStore = useFinanceStore();

const showDetailsDialog = ref(false);
const isLoadingDetails = ref(false);
const selectedInvoice = ref(null);

const columns = [
  { name: 'date', label: 'DATE', field: 'date', align: 'left', sortable: true },
  { name: 'description', label: 'DESCRIPTION', field: 'description', align: 'left' },
  { name: 'type', label: 'TYPE', field: 'type', align: 'left', sortable: true },
  { name: 'amountFormatted', label: 'AMOUNT', field: 'amountFormatted', align: 'right', sortable: true }
];

const formattedDate = computed(() => {
  if (!selectedInvoice.value?.created_at) return '';
  return new Date(selectedInvoice.value.created_at).toLocaleString();
});

const onRowClick = async (evt, row) => {
  const invoiceId = row.reference || row.id;
  if (!invoiceId) return;

  selectedInvoice.value = null;
  isLoadingDetails.value = true;
  showDetailsDialog.value = true;

  try {
    const detailed = await FinanceRepository.getInvoice(invoiceId);
    selectedInvoice.value = detailed;
  } catch (err) {
    console.error('Failed to load transaction invoice details:', err);
  } finally {
    isLoadingDetails.value = false;
  }
};

const fetchData = async (force = false) => {
  await financeStore.fetchTransactions(force);
};

onMounted(() => {
  if (financeStore.transactions.length === 0) {
    fetchData();
  }
});
</script>

<style scoped>
.bg-blue-grey-10 { background: #1c262b; }
.bg-blue-grey-11 { background: #151e22; }
.border-grey-9 { border: 1px solid #2d3748; }
.border-bottom-grey-9 { border-bottom: 1px solid #2d3748; }
.border-top-grey-9 { border-top: 1px solid #2d3748; }
.font-mono { font-family: monospace; }
.op-gap-4 { gap: 4px; }
.op-gap-16 { gap: 16px; }
.w-full { width: 100%; }
.bg-card-dark { background-color: #12191c; }
</style>
