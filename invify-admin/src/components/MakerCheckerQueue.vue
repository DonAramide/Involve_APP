<template>
  <q-card v-if="rows.length" flat class="q-mb-md bg-panel border-muted">
    <q-card-section class="q-pa-md">
      <div class="text-subtitle2 text-weight-bold q-mb-xs">Waiting for approval</div>
      <div class="text-caption text-grey-5 q-mb-sm">Only support@iips.app can approve. The person who submitted a change cannot approve it.</div>
      <q-list dense separator class="bg-transparent">
        <q-item v-for="row in rows" :key="row.id" class="q-px-none">
          <q-item-section>
            <q-item-label class="text-weight-medium">{{ formatSummary(row.summary) }}</q-item-label>
            <q-item-label caption>Submitted by {{ row.makerEmail }}</q-item-label>
          </q-item-section>
          <q-item-section side>
            <div v-if="canApprove(row)" class="row q-gutter-xs">
              <q-btn dense unelevated color="green-8" label="Approve" :loading="busyId === row.id" @click="decide(row, 'approve')" />
              <q-btn dense outline color="red-4" label="Reject" :disable="busyId === row.id" @click="decide(row, 'reject')" />
            </div>
            <div v-else class="text-caption text-amber-5">Pending support@iips.app</div>
          </q-item-section>
        </q-item>
      </q-list>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { adminApi } from '../api'
import { promptCheckerMfa } from '../utils/promptCheckerMfa'

const props = defineProps({
  domain: { type: String, required: true },
})
const emit = defineEmits(['changed'])
const $q = useQuasar()
const rows = ref([])
const busyId = ref('')
const operatorEmail = (localStorage.getItem('operator_email') || '').trim().toLowerCase()

const canApprove = (row) => operatorEmail === 'support@iips.app' && operatorEmail !== String(row.makerEmail || '').toLowerCase()

function formatNaira(raw) {
  const n = Number(String(raw || '').replace(/,/g, ''))
  if (!Number.isFinite(n)) return String(raw || '')
  return n.toLocaleString('en-NG', { style: 'currency', currency: 'NGN' })
}

function formatSummary(summary) {
  return String(summary || '').replace(/Post\s+([\d,.]+)\s+payment/i, (_, amount) => `Post ${formatNaira(amount)} payment`)
}

const refresh = async () => {
  try {
    const { data } = await adminApi.listMakerChecker(props.domain)
    rows.value = Array.isArray(data) ? data : []
  } catch (error) {
    rows.value = []
  }
}

const decide = async (row, action) => {
  let otp = ''
  if (props.domain === 'tenant_billing') {
    otp = await promptCheckerMfa($q.dialog, {
      title: action === 'approve' ? 'Approve with 2FA' : 'Reject with 2FA',
      message: 'Enter the 6-digit authenticator code for this checker account. Billing payments cannot be approved without 2FA.',
      okLabel: action === 'approve' ? 'Verify & approve' : 'Verify & reject',
      okColor: action === 'approve' ? 'green-8' : 'red-8',
    })
    if (!otp) {
      $q.notify({ type: 'warning', message: '2FA code is required for billing approvals.' })
      return
    }
  }
  busyId.value = row.id
  try {
    if (action === 'approve') await adminApi.approveMakerChecker(row.id, { otp })
    else await adminApi.rejectMakerChecker(row.id, { otp })
    $q.notify({
      type: 'positive',
      message: action === 'approve' ? 'Change approved and applied.' : 'Change rejected.',
    })
    await refresh()
    emit('changed')
  } catch (error) {
    const msg = error.response?.data?.error || error.message || 'Could not update this request.'
    $q.notify({ type: 'negative', message: msg })
  } finally {
    busyId.value = ''
  }
}

onMounted(refresh)
defineExpose({ refresh })
</script>
