<template>
  <q-page class="q-pa-xl bg-main text-main">
    <div class="text-caption text-grey-5 font-mono q-mb-xs">SETTINGS</div>
    <h1 class="text-h4 text-weight-bolder text-white q-my-none">Bank Accounts</h1>
    <q-banner class="bg-amber-10 text-amber-2 q-my-md" rounded>
      Changes to your settlement bank account require Super Admin verification. Your previously approved account remains active until the new account is approved.
    </q-banner>

    <q-card flat bordered class="bg-card-dark q-pa-md q-mb-md">
      <div class="text-caption text-grey-5">Currently approved</div>
      <div class="text-white">{{ approvedLabel }}</div>
    </q-card>

    <q-form @submit.prevent="submit" class="column q-gutter-md" style="max-width: 480px;">
      <q-input dark filled v-model="form.entityName" label="Registered business name" />
      <q-input dark filled v-model="form.bankName" label="Bank name" />
      <q-input dark filled v-model="form.bankCode" label="Bank code" />
      <q-input dark filled v-model="form.accountName" label="Account name" />
      <q-input dark filled v-model="form.accountNumber" label="Account number" mask="##########" />
      <q-btn type="submit" color="indigo-6" label="Submit for verification" :loading="busy" unelevated />
    </q-form>

    <q-table class="bg-card-dark text-white q-mt-lg" dark flat :rows="requests" :columns="columns" row-key="id" />
  </q-page>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { Notify } from 'quasar'
import { adminApi } from '../../api'

const props = defineProps({
  mode: { type: String, default: 'tenant' },
})

const approved = ref(null)
const requests = ref([])
const busy = ref(false)
const form = reactive({ entityName: '', bankName: '', bankCode: '', accountName: '', accountNumber: '' })

const columns = [
  { name: 'status', label: 'Status', field: 'status', align: 'left' },
  { name: 'proposed', label: 'Proposed', field: (row) => row.proposedAccount?.accountNumber, align: 'left' },
  { name: 'reason', label: 'Review', field: (row) => row.nameMatch?.reviewReason || row.rejectionReason || '', align: 'left' },
]

const approvedLabel = computed(() => {
  if (!approved.value) return 'No approved settlement account.'
  return `${approved.value.accountName} · ${approved.value.bankName || approved.value.bankCode} · ${approved.value.accountNumber}`
})

async function load() {
  const api = props.mode === 'institution' ? adminApi.listInstitutionBankAccounts : adminApi.listTenantBankAccounts
  const { data } = await api()
  approved.value = data?.data?.approved || null
  requests.value = data?.data?.requests || []
}

async function submit() {
  busy.value = true
  try {
    const api = props.mode === 'institution' ? adminApi.submitInstitutionBankAccount : adminApi.submitTenantBankAccount
    await api({ ...form })
    Notify.create({ type: 'positive', message: 'Submitted for Super Admin verification' })
    await load()
  } catch (e) {
    Notify.create({ type: 'negative', message: e?.response?.data?.error?.message || 'Submit failed' })
  } finally {
    busy.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.bg-card-dark { background: #0b0f19; }
</style>
