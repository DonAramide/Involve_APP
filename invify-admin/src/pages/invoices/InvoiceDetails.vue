<template>
  <div class="invoice-details-page">
    <header class="invoice-header">
      <div class="invoice-title">
        <h1>Invoice {{ invoice.invoiceNumber }}</h1>
        <span class="status-badge">{{ invoice.status }}</span>
      </div>
      <div class="invoice-actions">
        <!-- Disabled if not eligible for payments -->
        <button class="btn btn-primary" :disabled="!isEligibleForPayments" :title="!isEligibleForPayments ? 'Requires Professional Plan' : ''">
          Generate Payment Link
        </button>
      </div>
    </header>

    <div class="invoice-layout">
      <div class="invoice-main">
        <!-- Existing invoice details like line items would go here -->
        <div class="panel">
          <h2>Line Items</h2>
          <p>Product A - $100.00</p>
          <p>Service B - $50.00</p>
          <p><strong>Total: $150.00</strong></p>
        </div>
      </div>

      <div class="invoice-sidebar">
        <!-- The New Financial Operations Pane -->
        <div class="financial-pane panel">
          <h2>Financial Operations</h2>
          
          <div v-if="!isEligibleForPayments" class="locked-state">
            <i class="fas fa-lock"></i>
            <p>Upgrade to process payments directly on this invoice.</p>
            <router-link to="/billing">Upgrade Plan</router-link>
          </div>
          
          <div v-else class="payment-history">
            <h3>Payment Intents</h3>
            <ul v-if="paymentIntents.length > 0" class="intent-list">
              <li v-for="intent in paymentIntents" :key="intent.id" class="intent-item" @click="openDrawer(intent)">
                <div class="intent-summary">
                  <MoneyDisplay :amount="intent.amount" :currency="intent.currency" />
                  <FinancialStatusBadge :status="intent.status" />
                </div>
                <div class="intent-meta">
                  <span>{{ new Date(intent.createdAt).toLocaleDateString() }}</span>
                </div>
              </li>
            </ul>
            <div v-else class="empty-payments">
              <p>No payments attempted yet.</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Reusing the Payment Details Drawer -->
    <PaymentDetailsDrawer 
      v-if="selectedIntent" 
      :intent="selectedIntent" 
      @close="selectedIntent = null" 
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { paymentApi } from '@/api/paymentApi';
import MoneyDisplay from '@/components/finance/MoneyDisplay.vue';
import FinancialStatusBadge from '@/components/finance/FinancialStatusBadge.vue';
import PaymentDetailsDrawer from '@/components/finance/PaymentDetailsDrawer.vue';

// Mock data
const invoice = ref({
  id: 'inv-123',
  invoiceNumber: 'INV-2026-001',
  status: 'ISSUED'
});

const isEligibleForPayments = ref(true); // From billing store
const paymentIntents = ref([]);
const selectedIntent = ref(null);

const loadPayments = async () => {
  try {
    // In reality, filter history by invoiceId
    const response = await paymentApi.getHistory('tenant', { invoiceId: invoice.value.id });
    // Mocking an intent for display
    paymentIntents.value = [{
      id: 'intent-999',
      invoiceNumber: invoice.value.invoiceNumber,
      amount: 15000,
      currency: 'USD',
      status: 'SUCCEEDED',
      createdAt: new Date().toISOString()
    }];
  } catch (error) {
    console.error(error);
  }
};

const openDrawer = (intent) => {
  selectedIntent.value = intent;
};

onMounted(() => {
  if (isEligibleForPayments.value) {
    loadPayments();
  }
});
</script>

<style scoped>
.invoice-details-page {
  padding: 32px;
  max-width: 1200px;
  margin: 0 auto;
}

.invoice-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.invoice-title {
  display: flex;
  align-items: center;
  gap: 16px;
}

.invoice-title h1 {
  margin: 0;
  font-size: 24px;
}

.status-badge {
  background: #e5e7eb;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.invoice-layout {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
}

.panel {
  background: white;
  border-radius: 8px;
  padding: 24px;
  border: 1px solid #e5e7eb;
  margin-bottom: 24px;
}

.panel h2 {
  font-size: 18px;
  margin-top: 0;
  margin-bottom: 16px;
  border-bottom: 1px solid #f3f4f6;
  padding-bottom: 12px;
}

.locked-state {
  text-align: center;
  padding: 32px 16px;
  color: #6b7280;
}

.locked-state i {
  font-size: 32px;
  margin-bottom: 12px;
}

.payment-history h3 {
  font-size: 14px;
  color: #6b7280;
  text-transform: uppercase;
}

.intent-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.intent-item {
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.intent-item:hover {
  background: #f9fafb;
}

.intent-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.intent-meta {
  font-size: 12px;
  color: #9ca3af;
}

.empty-payments {
  padding: 24px;
  text-align: center;
  color: #9ca3af;
  font-style: italic;
}

.btn-primary {
  padding: 10px 20px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
.btn-primary:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}
</style>
