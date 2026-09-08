<template>
  <q-page class="q-pa-lg text-white" style="background: #05070d; min-height: 100vh;">
    <div class="row items-center justify-between q-mb-xl q-col-gutter-md">
      <div>
        <div class="row items-center op-gap-8 no-wrap">
          <q-icon name="devices" color="cyan-3" size="md" />
          <h1 class="text-h4 text-weight-bolder text-white q-my-none letter-spacing-1">Devices</h1>
        </div>
        <div class="text-caption text-grey-5 q-mt-xs">
          Manage hardware devices connected to the tenant workspace.
        </div>
      </div>
      <q-btn
        unelevated
        color="indigo-7"
        text-color="white"
        icon="qr_code_2"
        label="Link replacement device"
        class="text-weight-bold"
        :loading="generating"
        @click="openLinkDialog"
      />
    </div>
    
    <div class="q-pa-md bg-card-dark rounded-borders border-grey-9">
      <q-table
        dark
        :rows="devices"
        :columns="columns"
        row-key="id"
        flat
        class="bg-transparent"
      >
        <template v-slot:no-data>
          <div class="full-width q-pa-lg text-center text-grey-5">
            No registered devices yet. Use <span class="text-indigo-3">Link replacement device</span> if a tablet is missing.
          </div>
        </template>
        <template v-slot:body-cell-status="props">
          <q-td :props="props">
            <q-chip :color="props.value === 'active' ? 'green-9' : 'red-9'" text-color="white" size="xs" dense>
              {{ props.value?.toUpperCase() }}
            </q-chip>
          </q-td>
        </template>
        <template v-slot:body-cell-plan="props">
          <q-td :props="props">
            <q-badge :color="props.value === 'TRIAL MODE' ? 'orange-9' : 'indigo-9'" text-color="white" class="text-weight-bold font-mono q-pa-xs">
              {{ props.value }}
            </q-badge>
          </q-td>
        </template>
      </q-table>
    </div>

    <q-dialog v-model="linkDialog" persistent @hide="stopCountdown">
      <q-card class="bg-card-dark text-white" style="min-width: 360px; max-width: 440px;">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-subtitle1 text-weight-bold">Link replacement device</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup color="grey-5" />
        </q-card-section>

        <q-card-section class="column items-center op-gap-12 text-center">
          <div class="text-caption text-grey-5">
            On the new tablet, open Invify, tap <span class="text-indigo-3 text-weight-bold">Link device to existing profile</span>, then scan this code. It expires in 3 minutes.
          </div>

          <div v-if="generating" class="q-py-xl column items-center op-gap-12">
            <q-spinner color="indigo-4" size="42px" />
            <div class="text-caption text-grey-5">Generating secure link…</div>
          </div>

          <div v-else-if="linkError" class="q-py-md">
            <q-banner dense class="bg-red-10 text-red-2 rounded-borders text-caption">
              {{ linkError }}
            </q-banner>
          </div>

          <template v-else-if="qrPayload && !expired">
            <div class="bg-white q-pa-sm rounded-borders">
              <qrcode-vue :value="qrPayload" :size="220" level="M" />
            </div>
            <div class="text-metric-mono text-amber-4 text-weight-bold">
              Expires in {{ remainingLabel }}
            </div>
            <div v-if="businessName" class="text-caption text-grey-5">
              {{ businessName }}
            </div>
          </template>

          <div v-else-if="expired" class="q-py-md text-caption text-grey-5">
            This code expired. Generate a new one and scan it immediately.
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Close" color="grey-5" v-close-popup />
          <q-btn
            unelevated
            color="indigo-7"
            :label="expired || linkError ? 'Generate new code' : 'Refresh code'"
            :loading="generating"
            @click="generateLinkQr"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useQuasar } from 'quasar';
import QrcodeVue from 'qrcode.vue';
import { deviceApi } from 'src/api';
import { userFacingApiError } from 'src/utils/userFacingApiError';
import { useTenantDeviceStore } from '../stores/tenantDeviceStore';

const $q = useQuasar();
const store = useTenantDeviceStore();
const { devices } = storeToRefs(store);

const columns = [
  { name: 'id', label: 'Device ID', field: 'id', align: 'left' },
  { name: 'name', label: 'Device Name', field: 'name', align: 'left' },
  { name: 'plan', label: 'Active Plan', field: 'plan', align: 'left' },
  { name: 'expiry', label: 'Expiration Date', field: 'expiry', align: 'right' },
  { name: 'status', label: 'Status', field: 'status', align: 'center' }
];

const linkDialog = ref(false);
const generating = ref(false);
const qrPayload = ref('');
const businessName = ref('');
const expiresAtMs = ref(0);
const remainingMs = ref(0);
const linkError = ref('');
const expired = ref(false);
let countdownTimer = null;

const remainingLabel = computed(() => {
  const total = Math.max(0, Math.floor(remainingMs.value / 1000));
  const mins = Math.floor(total / 60);
  const secs = String(total % 60).padStart(2, '0');
  return `${mins}:${secs}`;
});

function stopCountdown() {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
}

function startCountdown() {
  stopCountdown();
  const tick = () => {
    remainingMs.value = expiresAtMs.value - Date.now();
    expired.value = remainingMs.value <= 0;
    if (expired.value) stopCountdown();
  };
  tick();
  countdownTimer = setInterval(tick, 1000);
}

async function generateLinkQr() {
  generating.value = true;
  linkError.value = '';
  expired.value = false;
  qrPayload.value = '';
  try {
    const res = await deviceApi.generateTenantLinkQr();
    const data = res.data || {};
    if (!data.success || !data.qrPayload) {
      throw new Error(data.error || 'Could not generate a device link QR.');
    }
    qrPayload.value = data.qrPayload;
    businessName.value = data.tenant?.name || '';
    expiresAtMs.value = data.expiresAt ? Date.parse(data.expiresAt) : Date.now() + 3 * 60 * 1000;
    startCountdown();
  } catch (e) {
    linkError.value = userFacingApiError(e, 'Could not generate a device link QR. Please try again.');
    $q.notify({ type: 'negative', message: linkError.value });
  } finally {
    generating.value = false;
  }
}

async function openLinkDialog() {
  linkDialog.value = true;
  await generateLinkQr();
}

onMounted(() => {
  store.loadDevices();
});

onUnmounted(() => {
  stopCountdown();
});
</script>

<style scoped>
.bg-card-dark { background: #0b0f19; }
.border-grey-9 { border: 1px solid rgba(255,255,255,0.06); }
.letter-spacing-1 { letter-spacing: 1px; }
</style>
