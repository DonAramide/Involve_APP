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
        :loading="store.loading"
        @row-click="(_, row) => openDevice(row)"
      >
        <template v-slot:no-data>
          <div class="full-width q-pa-lg text-center text-grey-5">
            No registered devices yet. Use <span class="text-indigo-3">Link replacement device</span> if a tablet is missing.
          </div>
        </template>
        <template v-slot:body-cell-online="props">
          <q-td :props="props">
            <q-chip :color="props.row.online ? 'green-9' : 'grey-8'" text-color="white" size="xs" dense>
              {{ props.row.online ? 'ONLINE' : 'OFFLINE' }}
            </q-chip>
          </q-td>
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
            <q-badge :color="planBadgeColor(props.value)" text-color="white" class="text-weight-bold font-mono q-pa-xs">
              {{ props.value }}
            </q-badge>
          </q-td>
        </template>
        <template v-slot:body-cell-actions="props">
          <q-td :props="props">
            <q-btn flat dense color="cyan-4" label="Manage" @click.stop="openDevice(props.row)" />
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

    <q-drawer v-model="drawerOpen" side="right" overlay bordered :width="420" class="bg-card-dark text-white">
      <div class="q-pa-md" v-if="selected">
        <div class="row items-center justify-between q-mb-md">
          <div>
            <div class="text-subtitle1 text-weight-bold">{{ selected.name }}</div>
            <div class="text-caption text-grey-5 font-mono">{{ selected.id }}</div>
          </div>
          <q-btn flat round dense icon="close" color="grey-5" @click="drawerOpen = false" />
        </div>
        <q-chip :color="selected.online ? 'green-9' : 'grey-8'" text-color="white" size="sm" class="q-mb-md">
          {{ selected.online ? 'ONLINE' : 'OFFLINE' }}
        </q-chip>
        <div class="text-caption text-grey-5 q-mb-xs">Status: {{ selected.status }}</div>
        <div class="text-caption text-grey-5 q-mb-xs">Plan: {{ selected.plan }}</div>
        <div class="text-caption text-grey-5 q-mb-xs">Expires: {{ selected.expiry }}</div>
        <div class="text-caption text-grey-5 q-mb-xs">Last seen: {{ selected.lastSeen || '—' }}</div>
        <div class="text-caption text-grey-5 q-mb-xs" v-if="selected.ip">IP: {{ selected.ip }}</div>
        <div class="text-caption text-grey-5 q-mb-xs" v-if="selected.profile?.model">Model: {{ selected.profile.model }}</div>
        <div class="text-caption text-grey-5 q-mb-xs" v-if="selected.profile?.os_version">OS: {{ selected.profile.os_version }}</div>
        <div class="text-caption text-grey-5 q-mb-md" v-if="selected.profile?.tenant_id">Tenant: {{ selected.profile.tenant_id }}</div>
        <q-separator dark class="q-mb-md" />

        <div class="text-subtitle2 q-mb-sm">Remote actions</div>
        <div class="column q-gutter-sm">
          <q-btn unelevated color="red-8" icon="lock" label="Lock device" :loading="busy === 'lock'" @click="confirmLock" />
          <q-btn outline color="green-4" icon="lock_open" label="Unlock device" :loading="busy === 'unlock'" @click="runCommand('unlock')" />
          <q-btn outline color="cyan-4" icon="notifications" label="Send notification" @click="showNotify = true" />
          <q-btn outline color="amber-5" icon="cloud_sync" label="Pull data & records" :loading="busy === 'pull_sync'" @click="runCommand('pull_sync')" />
        </div>
        <div v-if="lastPasscode" class="q-mt-md q-pa-sm bg-red-10 text-red-2 rounded-borders text-caption">
          Lock code for this device: <span class="text-weight-bold font-mono">{{ lastPasscode }}</span>
        </div>
      </div>
    </q-drawer>

    <q-dialog v-model="showNotify">
      <q-card class="bg-card-dark text-white" style="min-width: 360px">
        <q-card-section>
          <div class="text-subtitle1">Send socket notification</div>
          <q-input v-model="notifyMessage" dark outlined autogrow class="q-mt-md" label="Message" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="grey-5" v-close-popup />
          <q-btn unelevated color="cyan-7" label="Send" :loading="busy === 'notify'" @click="sendNotify" />
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

function planBadgeColor(plan) {
  const n = String(plan || '').toLowerCase()
  if (n.includes('premium') || n.includes('enterprise')) return 'purple-8'
  if (n.includes('standard') || n.includes('pro')) return 'indigo-9'
  if (n.includes('trial')) return 'orange-9'
  if (n.includes('basic')) return 'blue-grey-7'
  return 'indigo-9'
}

const columns = [
  { name: 'id', label: 'Device ID', field: 'id', align: 'left' },
  { name: 'name', label: 'Device Name', field: 'name', align: 'left' },
  { name: 'online', label: 'Live', field: 'online', align: 'center' },
  { name: 'plan', label: 'Active Plan', field: 'plan', align: 'left' },
  { name: 'expiry', label: 'Expiration Date', field: 'expiry', align: 'right' },
  { name: 'status', label: 'Status', field: 'status', align: 'center' },
  { name: 'actions', label: '', field: 'actions', align: 'right' },
];

const drawerOpen = ref(false);
const selected = ref(null);
const busy = ref('');
const showNotify = ref(false);
const notifyMessage = ref('');
const lastPasscode = ref('');

const linkDialog = ref(false);
const generating = ref(false);
const qrPayload = ref('');
const businessName = ref('');
const expiresAtMs = ref(0);
const remainingMs = ref(0);
const linkError = ref('');
const expired = ref(false);
let countdownTimer = null;
let pollTimer = null;

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

function confirmLock() {
  $q.dialog({
    title: 'Lock this device?',
    message: 'The tablet will show a lock screen until you send Unlock or the operator enters the passcode. A new 6-character code will be generated.',
    cancel: true,
    persistent: true,
    ok: { label: 'Lock now', color: 'red-8' },
  }).onOk(() => runCommand('lock'));
}

async function openDevice(row) {
  selected.value = row;
  lastPasscode.value = '';
  drawerOpen.value = true;
  try {
    const [st, tel] = await Promise.allSettled([
      deviceApi.getDeviceStatus(row.id),
      deviceApi.getDeviceTelemetry(row.id),
    ]);
    const extra = {};
    if (st.status === 'fulfilled') extra.statusDetail = st.value?.data;
    if (tel.status === 'fulfilled') extra.telemetry = tel.value?.data;
    selected.value = { ...selected.value, profile: { ...(selected.value.profile || {}), ...extra } };
  } catch (_) { /* optional live profile */ }
}

async function runCommand(action, extra = {}) {
  if (!selected.value?.id) return;
  busy.value = action;
  try {
    const { data } = await deviceApi.sendDeviceCommand(selected.value.id, { action, ...extra });
    if (action === 'lock' && data?.passcode) lastPasscode.value = data.passcode;
    $q.notify({ type: 'positive', message: data?.message || `Sent ${action}` });
    await store.loadDevices();
    const refreshed = store.devices.find((d) => d.id === selected.value.id);
    if (refreshed) selected.value = refreshed;
  } catch (e) {
    $q.notify({ type: 'negative', message: userFacingApiError(e, 'Command failed') });
  } finally {
    busy.value = '';
  }
}

async function sendNotify() {
  await runCommand('notify', { message: notifyMessage.value });
  if (!busy.value) {
    showNotify.value = false;
    notifyMessage.value = '';
  }
}

onMounted(() => {
  store.loadDevices();
  pollTimer = setInterval(() => store.loadDevices(), 15000);
});

onUnmounted(() => {
  stopCountdown();
  if (pollTimer) clearInterval(pollTimer);
});
</script>

<style scoped>
.bg-card-dark { background: #0b0f19; }
.border-grey-9 { border: 1px solid rgba(255,255,255,0.06); }
.letter-spacing-1 { letter-spacing: 1px; }
</style>
