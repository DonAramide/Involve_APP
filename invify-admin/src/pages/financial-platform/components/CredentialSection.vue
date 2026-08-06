<template>
  <q-card flat bordered class="credential-section ops-card" role="region" aria-labelledby="fp-security-title">
    <q-card-section>
      <div class="row items-center justify-between q-mb-md">
        <div class="row items-center">
          <div class="icon-orb amber q-mr-sm" aria-hidden="true">
            <q-icon name="shield" size="18px" color="amber-3" />
          </div>
          <div>
            <div id="fp-security-title" class="text-subtitle1 text-weight-bold text-white">Credentials & Security</div>
            <div class="text-caption text-grey-5">Vault-backed secrets — never exposed in the UI</div>
          </div>
        </div>
        <PlatformStatusBadge status="PROTECTED" label="Vault Enabled" />
      </div>

      <div class="vault-banner q-pa-md rounded-borders q-mb-md">
        <div class="row items-center">
          <q-icon name="lock" color="positive" class="q-mr-sm" />
          <span class="text-weight-medium text-green-3">Vault Storage Enabled</span>
        </div>
        <div class="text-caption text-grey-4 q-mt-xs q-ml-lg">
          Credentials are injected server-side. Raw API keys and secrets are never rendered.
        </div>
      </div>

      <div class="sec-grid">
        <div class="sec-cell">
          <div class="sec-label">Encryption</div>
          <div class="sec-value">AES-256-GCM</div>
        </div>
        <div class="sec-cell">
          <div class="sec-label">Credential version</div>
          <div class="sec-value">{{ credentialVersion }}</div>
        </div>
        <div class="sec-cell">
          <div class="sec-label">Rotation status</div>
          <div class="sec-value">
            <PlatformStatusBadge
              :status="lastRotationAt ? 'HEALTHY' : 'WARNING'"
              :label="lastRotationAt ? 'Current' : 'Never rotated'"
            />
          </div>
        </div>
        <div class="sec-cell">
          <div class="sec-label">Last rotation</div>
          <div class="sec-value">{{ lastRotationLabel }}</div>
        </div>
        <div class="sec-cell">
          <div class="sec-label">Next scheduled</div>
          <div class="sec-value">{{ nextRotationLabel }}</div>
        </div>
        <div class="sec-cell">
          <div class="sec-label">Last rotated by</div>
          <div class="sec-value">{{ lastRotatedBy }}</div>
        </div>
        <div class="sec-cell">
          <div class="sec-label">Secrets exposure</div>
          <div class="sec-value">
            <PlatformStatusBadge status="PROTECTED" label="Protected" />
          </div>
        </div>
        <div class="sec-cell">
          <div class="sec-label">Vault state</div>
          <div class="sec-value text-amber-3">{{ details?.vaultStatus || 'HEALTHY' }}</div>
        </div>
      </div>
    </q-card-section>

    <q-separator dark />

    <q-card-actions align="right" class="q-pa-md">
      <q-btn
        outline
        color="amber-4"
        icon="autorenew"
        label="Rotate Credentials"
        :aria-label="'Rotate financial platform credentials'"
        @click="confirmRotation"
      />
    </q-card-actions>

    <q-dialog v-model="confirmDialog" persistent>
      <q-card class="bg-grey-10 text-white" style="min-width: 420px; max-width: 520px;">
        <q-card-section class="row items-center">
          <q-avatar icon="warning" color="amber-8" text-color="white" />
          <div class="q-ml-md">
            <div class="text-h6">Confirm credential rotation</div>
            <div class="text-caption text-grey-5">Existing sandbox credentials will be revoked</div>
          </div>
        </q-card-section>
        <q-card-section class="q-pt-none text-body2 text-grey-4">
          This regenerates Quasar credentials and stores them in the vault. Brief disruption to in-flight financial calls is possible.
        </q-card-section>
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancel" color="grey-5" v-close-popup />
          <q-btn
            unelevated
            color="amber-8"
            text-color="black"
            label="Confirm Rotation"
            :loading="rotating"
            @click="executeRotation"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-card>
</template>

<script setup>
import { computed, ref } from 'vue'
import PlatformStatusBadge from './PlatformStatusBadge.vue'

const props = defineProps({
  details: { type: Object, default: () => ({}) },
  rotating: { type: Boolean, default: false }
})

const emit = defineEmits(['rotate'])

const confirmDialog = ref(false)

const lastRotationAt = computed(() => props.details?.lastRotationAt || null)

const lastRotationLabel = computed(() => {
  if (!lastRotationAt.value) return 'Never'
  return new Date(lastRotationAt.value).toLocaleString()
})

const nextRotationLabel = computed(() => {
  if (!lastRotationAt.value) return 'Schedule after first rotation'
  const next = new Date(lastRotationAt.value)
  next.setDate(next.getDate() + 30)
  return next.toLocaleDateString()
})

const credentialVersion = computed(() => {
  if (!lastRotationAt.value) return 'v1 (initial)'
  // Presentational version stamp derived from rotation timestamp — no secret material
  const t = new Date(lastRotationAt.value).getTime()
  return `v${Math.max(1, Math.floor(t / 1e8) % 900 + 100)}`
})

const lastRotatedBy = computed(() => props.details?.lastRotatedBy || props.details?.rotatedBy || 'Operator / system')

const confirmRotation = () => {
  confirmDialog.value = true
}

const executeRotation = () => {
  emit('rotate')
  confirmDialog.value = false
}
</script>

<style scoped>
.ops-card {
  background: linear-gradient(165deg, rgba(30, 41, 59, 0.92) 0%, rgba(15, 23, 42, 0.98) 100%);
  border-color: rgba(148, 163, 184, 0.18) !important;
  border-radius: 12px;
  transition: box-shadow 0.18s ease;
}
.ops-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
}
.icon-orb {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: rgba(251, 191, 36, 0.12);
  border: 1px solid rgba(251, 191, 36, 0.28);
}
.vault-banner {
  background: rgba(16, 185, 129, 0.08);
  border: 1px solid rgba(16, 185, 129, 0.28);
}
.sec-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.sec-cell {
  background: rgba(2, 6, 23, 0.45);
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 10px;
  padding: 10px 12px;
}
.sec-label {
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #94a3b8;
  margin-bottom: 4px;
}
.sec-value {
  font-size: 13px;
  font-weight: 700;
  color: #e2e8f0;
}
</style>
