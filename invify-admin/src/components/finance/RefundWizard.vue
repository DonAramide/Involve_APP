<template>
  <div class="refund-wizard">
    <div class="wizard-header">
      <h2>Issue Refund</h2>
      <button @click="$emit('cancel')" class="btn-close"><i class="fas fa-times"></i></button>
    </div>

    <div v-if="step === 1" class="wizard-step">
      <h3>Step 1: Validation</h3>
      <p>Verifying payment intent status...</p>
      <div v-if="isValidating" class="spinner"></div>
      <div v-else-if="canRefund">
        <div class="alert alert-success"><i class="fas fa-check-circle"></i> Intent is eligible for refund.</div>
        <button class="btn btn-primary" @click="step = 2">Continue</button>
      </div>
      <div v-else>
        <div class="alert alert-error"><i class="fas fa-exclamation-circle"></i> Intent is not eligible for refund.</div>
      </div>
    </div>

    <div v-if="step === 2" class="wizard-step">
      <h3>Step 2: Configuration</h3>
      <div class="form-group">
        <label>Refund Type</label>
        <select v-model="refundType" class="form-control">
          <option value="FULL">Full Refund</option>
          <option value="PARTIAL">Partial Refund</option>
        </select>
      </div>
      <div v-if="refundType === 'PARTIAL'" class="form-group">
        <label>Amount</label>
        <input type="number" v-model.number="refundAmount" class="form-control" />
      </div>
      <div class="form-group">
        <label>Reason</label>
        <input type="text" v-model="refundReason" class="form-control" placeholder="Optional reason for audit" />
      </div>
      <div class="wizard-actions">
        <button class="btn btn-outline" @click="step = 1">Back</button>
        <button class="btn btn-primary" @click="step = 3">Review</button>
      </div>
    </div>

    <div v-if="step === 3" class="wizard-step">
      <h3>Step 3: Confirmation</h3>
      <div class="danger-zone">
        <i class="fas fa-exclamation-triangle warning-icon"></i>
        <p>You are about to issue a <strong>{{ refundType }}</strong> refund of <strong>{{ refundAmount }}</strong>.</p>
        <p>This action cannot be undone and funds will be returned to the customer.</p>
        <label>Type <strong>CONFIRM</strong> to proceed:</label>
        <input type="text" v-model="confirmText" class="form-control" />
      </div>
      <div class="wizard-actions">
        <button class="btn btn-outline" @click="step = 2">Back</button>
        <button class="btn btn-danger" :disabled="confirmText !== 'CONFIRM' || isProcessing" @click="submitRefund">
          {{ isProcessing ? 'Processing...' : 'Issue Refund' }}
        </button>
      </div>
    </div>

    <div v-if="step === 4" class="wizard-step text-center">
      <i class="fas fa-check-circle success-icon"></i>
      <h3>Refund Initiated Successfully</h3>
      <p>The refund has been queued and is processing via Quasar.</p>
      <button class="btn btn-primary" @click="$emit('done')">Close</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { paymentApi } from '@/api/paymentApi';

const props = defineProps({
  intent: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['cancel', 'done']);

const step = ref(1);
const isValidating = ref(true);
const canRefund = ref(false);

const refundType = ref('FULL');
const refundAmount = ref(props.intent.amount);
const refundReason = ref('');
const confirmText = ref('');
const isProcessing = ref(false);

const validate = () => {
  // Simulate API validation
  setTimeout(() => {
    canRefund.value = props.intent.status === 'SUCCEEDED';
    isValidating.value = false;
  }, 800);
};

const submitRefund = async () => {
  if (confirmText.value !== 'CONFIRM') return;
  isProcessing.value = true;
  try {
    await paymentApi.refundIntent(props.intent.id, {
      amount: refundType.value === 'FULL' ? props.intent.amount : refundAmount.value,
      reason: refundReason.value
    });
    step.value = 4;
  } catch (error) {
    console.error('Refund failed:', error);
    alert('Refund failed. Please try again later.');
  } finally {
    isProcessing.value = false;
  }
};

onMounted(() => {
  validate();
});
</script>

<style scoped>
.refund-wizard {
  background: white;
  border-radius: 8px;
  padding: 24px;
}
.wizard-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 24px;
}
.wizard-step {
  animation: fadeIn 0.3s ease;
}
.form-group {
  margin-bottom: 16px;
}
.form-control {
  width: 100%;
  padding: 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  margin-top: 4px;
}
.wizard-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}
.danger-zone {
  background: #fef2f2;
  border: 1px solid #f87171;
  padding: 16px;
  border-radius: 6px;
  color: #991b1b;
}
.warning-icon { color: #dc2626; font-size: 24px; margin-bottom: 8px; }
.success-icon { color: #10b981; font-size: 48px; margin-bottom: 16px; }
.alert { padding: 12px; border-radius: 4px; margin-bottom: 16px; }
.alert-success { background: #d1fae5; color: #065f46; }
.alert-error { background: #fee2e2; color: #991b1b; }
.spinner { border: 3px solid #f3f3f3; border-top: 3px solid #3b82f6; border-radius: 50%; width: 24px; height: 24px; animation: spin 1s linear infinite; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
</style>
