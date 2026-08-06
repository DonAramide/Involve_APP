<template>
  <q-card flat bordered class="danger-zone" role="region" aria-labelledby="fp-danger-title">
    <q-card-section>
      <div class="row items-center q-mb-md">
        <div class="icon-orb q-mr-sm" aria-hidden="true">
          <q-icon name="warning" size="18px" color="red-3" />
        </div>
        <div>
          <div id="fp-danger-title" class="text-subtitle1 text-weight-bold text-red-3">Danger Zone</div>
          <div class="text-caption text-grey-5">Irreversible operational suspension controls</div>
        </div>
      </div>

      <div class="impact-grid q-mb-md">
        <div class="impact-cell">
          <div class="impact-label">Impact summary</div>
          <div class="impact-value">Suspends ledger routing, virtual accounts, and reconciliation for this tenant.</div>
        </div>
        <div class="impact-cell">
          <div class="impact-label">Affected services</div>
          <div class="impact-chips row q-gutter-xs q-mt-xs">
            <q-chip dense size="sm" color="red-10" text-color="red-2">Ledgers</q-chip>
            <q-chip dense size="sm" color="red-10" text-color="red-2">Virtual Accounts</q-chip>
            <q-chip dense size="sm" color="red-10" text-color="red-2">Reconciliation</q-chip>
            <q-chip dense size="sm" color="red-10" text-color="red-2">Quasar Routing</q-chip>
          </div>
        </div>
        <div class="impact-cell">
          <div class="impact-label">Estimated downtime</div>
          <div class="impact-value">Immediate suspension · reactivation requires re-provisioning</div>
        </div>
        <div class="impact-cell">
          <div class="impact-label">Confirmation steps</div>
          <ol class="impact-steps text-caption text-grey-4 q-pl-md q-mb-none">
            <li>Review impact summary</li>
            <li>Type DEACTIVATE to confirm</li>
            <li>Provide an operational reason</li>
          </ol>
        </div>
      </div>
    </q-card-section>

    <q-separator dark />

    <q-card-actions align="right" class="q-pa-md">
      <q-btn
        color="negative"
        icon="power_off"
        label="Deactivate Platform"
        unelevated
        aria-label="Open deactivation confirmation"
        @click="confirmDialog = true"
      />
    </q-card-actions>

    <q-dialog v-model="confirmDialog" persistent>
      <q-card class="bg-grey-10 text-white" style="min-width: 460px; max-width: 560px;">
        <q-card-section class="bg-red-10">
          <div class="row items-center">
            <q-icon name="gpp_maybe" size="28px" class="q-mr-sm" />
            <div>
              <div class="text-h6 q-my-none">Confirm platform deactivation</div>
              <div class="text-caption text-red-2">This will suspend financial routing immediately</div>
            </div>
          </div>
        </q-card-section>

        <q-card-section>
          <q-banner dense rounded class="bg-red-10 text-red-1 q-mb-md">
            Ledgers, virtual accounts, and reconciliation will stop processing for this tenant.
          </q-banner>

          <q-input
            v-model="confirmText"
            dark
            outlined
            dense
            label='Type "DEACTIVATE" to continue'
            class="q-mb-md"
            aria-label="Type DEACTIVATE to confirm"
          />
          <q-input
            v-model="reason"
            dark
            outlined
            dense
            type="textarea"
            autogrow
            label="Reason for deactivation"
            aria-label="Reason for deactivation"
          />

          <q-linear-progress
            v-if="deactivating"
            indeterminate
            color="negative"
            class="q-mt-md"
            track-color="grey-9"
          />
          <div v-if="deactivating" class="text-caption text-grey-5 q-mt-xs">
            Suspending financial platform routing…
          </div>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancel" color="grey-5" v-close-popup :disable="deactivating" />
          <q-btn
            unelevated
            color="negative"
            label="Deactivate Now"
            :disable="!canConfirm"
            :loading="deactivating"
            @click="executeDeactivation"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="successDialog">
      <q-card class="bg-grey-10 text-white" style="min-width: 380px;">
        <q-card-section class="column items-center text-center q-pa-lg">
          <q-icon name="check_circle" color="positive" size="48px" class="q-mb-md success-pop" />
          <div class="text-h6">Platform suspended</div>
          <div class="text-body2 text-grey-5 q-mt-sm">
            Financial Platform routing has been deactivated for this tenant.
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Close" color="cyan-4" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-card>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const emit = defineEmits(['deactivate'])

const props = defineProps({
  deactivating: { type: Boolean, default: false }
})

const confirmDialog = ref(false)
const successDialog = ref(false)
const confirmText = ref('')
const reason = ref('')
const awaitingResult = ref(false)

const canConfirm = computed(() =>
  confirmText.value.trim().toUpperCase() === 'DEACTIVATE' && reason.value.trim().length > 0 && !props.deactivating
)

watch(() => props.deactivating, (val, prev) => {
  if (!awaitingResult.value) return
  if (prev === true && val === false) {
    // Parent finished (success or failure). Keep dialog closed only after settle;
    // success confirmation is triggered explicitly via showSuccess().
    awaitingResult.value = false
  }
})

const executeDeactivation = () => {
  if (!canConfirm.value) return
  awaitingResult.value = true
  emit('deactivate', reason.value.trim())
}

const showSuccess = () => {
  confirmDialog.value = false
  confirmText.value = ''
  reason.value = ''
  successDialog.value = true
}

defineExpose({ showSuccess })
</script>

<style scoped>
.danger-zone {
  background: linear-gradient(165deg, rgba(69, 10, 10, 0.35) 0%, rgba(15, 23, 42, 0.98) 55%);
  border: 1px solid rgba(248, 113, 113, 0.45) !important;
  border-radius: 12px;
}
.icon-orb {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: rgba(248, 113, 113, 0.12);
  border: 1px solid rgba(248, 113, 113, 0.35);
}
.impact-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
@media (max-width: 700px) {
  .impact-grid { grid-template-columns: 1fr; }
}
.impact-cell {
  background: rgba(2, 6, 23, 0.45);
  border: 1px solid rgba(248, 113, 113, 0.18);
  border-radius: 10px;
  padding: 12px;
}
.impact-label {
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #fca5a5;
  margin-bottom: 6px;
  font-weight: 700;
}
.impact-value {
  font-size: 13px;
  color: #e2e8f0;
  line-height: 1.45;
}
.impact-steps { line-height: 1.6; }
.success-pop {
  animation: success-pop 0.45s ease;
}
@keyframes success-pop {
  0% { transform: scale(0.6); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
</style>
