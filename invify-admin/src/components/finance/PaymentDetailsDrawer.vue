<template>
  <div class="payment-drawer-overlay" @click.self="$emit('close')">
    <div class="payment-drawer">
      <div class="drawer-header">
        <h2>Payment Details</h2>
        <button class="btn-close" @click="$emit('close')"><i class="fas fa-times"></i></button>
      </div>
      
      <div class="drawer-content">
        <div class="drawer-section">
          <h3>Summary</h3>
          <div class="summary-grid">
            <div>
              <span class="label">Amount</span>
              <MoneyDisplay :amount="intent.amount" :currency="intent.currency" class="value" />
            </div>
            <div>
              <span class="label">Status</span>
              <FinancialStatusBadge :status="intent.status" class="value" />
            </div>
            <div>
              <span class="label">Invoice</span>
              <span class="value">{{ intent.invoiceNumber || 'INV-UNKNOWN' }}</span>
            </div>
            <div>
              <span class="label">Customer</span>
              <span class="value">{{ intent.customerName || 'N/A' }}</span>
            </div>
          </div>
        </div>

        <div class="drawer-section">
          <h3>Payment Timeline</h3>
          <FinancialTimeline :steps="timelineSteps" />
        </div>

        <div v-if="intent.status === 'SUCCEEDED'" class="drawer-section">
          <h3>Refund</h3>
          <button class="btn btn-outline" @click="showRefundWizard = true">Issue Refund</button>
        </div>
        
        <div v-if="showSupportMode" class="drawer-section support-section">
          <h3>Support Information</h3>
          <div class="support-field">
            <span class="label">Correlation ID</span>
            <code>{{ intent.correlationId || 'N/A' }}</code>
          </div>
          <!-- Webhook events would be listed here -->
        </div>
      </div>
      
      <div class="drawer-footer">
        <label class="support-toggle">
          <input type="checkbox" v-model="showSupportMode" /> Enable Support Mode
        </label>
      </div>
    </div>
    
    <!-- Modals -->
    <div v-if="showRefundWizard" class="modal-overlay">
      <div class="modal-content">
         <RefundWizard :intent="intent" @cancel="showRefundWizard = false" @done="handleRefundDone" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import FinancialStatusBadge from './FinancialStatusBadge.vue';
import MoneyDisplay from './MoneyDisplay.vue';
import FinancialTimeline from './FinancialTimeline.vue';
import RefundWizard from './RefundWizard.vue';

const props = defineProps({
  intent: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['close']);

const showSupportMode = ref(false);
const showRefundWizard = ref(false);

const handleRefundDone = () => {
  showRefundWizard.value = false;
  emit('close'); // or refresh data
};

// Mock timeline steps based on intent status
const timelineSteps = computed(() => {
  const status = props.intent.status;
  const steps = [
    { title: 'Invoice Created', completed: true },
    { title: 'Payment Requested', completed: true },
  ];
  
  if (status === 'CREATED') {
    steps.push({ title: 'Customer Started Checkout', active: true });
  } else if (status === 'PENDING') {
    steps.push({ title: 'Customer Started Checkout', completed: true });
    steps.push({ title: 'Payment Authorised', active: true });
  } else if (status === 'SUCCEEDED') {
    steps.push({ title: 'Customer Started Checkout', completed: true });
    steps.push({ title: 'Payment Authorised', completed: true });
    steps.push({ title: 'Funds Captured', completed: true });
    steps.push({ title: 'Settlement Pending', active: true });
  } else if (status === 'FAILED') {
    steps.push({ title: 'Customer Started Checkout', completed: true });
    steps.push({ title: 'Payment Failed', failed: true });
  }
  
  return steps;
});
</script>

<style scoped>
.payment-drawer-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.4);
  z-index: 1000;
  display: flex;
  justify-content: flex-end;
}

.payment-drawer {
  width: 400px;
  background: white;
  height: 100%;
  display: flex;
  flex-direction: column;
  box-shadow: -4px 0 15px rgba(0,0,0,0.1);
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
}

.drawer-header h2 { margin: 0; font-size: 18px; }

.btn-close {
  background: none; border: none; font-size: 18px; cursor: pointer; color: #6b7280;
}

.drawer-content {
  padding: 20px;
  flex: 1;
  overflow-y: auto;
}

.drawer-section {
  margin-bottom: 32px;
}

.drawer-section h3 {
  font-size: 14px;
  text-transform: uppercase;
  color: #6b7280;
  margin-bottom: 12px;
  letter-spacing: 0.05em;
}

.summary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.label {
  display: block;
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 4px;
}

.value {
  font-size: 14px;
  font-weight: 500;
  color: #111827;
}

.support-section {
  background: #f9fafb;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.support-field code {
  background: #e5e7eb;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
}

.drawer-footer {
  padding: 16px 20px;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
}

.support-toggle {
  font-size: 13px;
  color: #4b5563;
  display: flex;
  align-items: center;
  cursor: pointer;
}
.support-toggle input { margin-right: 8px; }

.btn-outline {
  padding: 8px 16px;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  cursor: pointer;
}

.modal-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1001;
}

.modal-content {
  width: 90%;
  max-width: 400px;
}
</style>
