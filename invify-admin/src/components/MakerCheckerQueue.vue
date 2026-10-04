<template>
  <q-card v-if="rows.length" flat class="q-mb-md bg-panel border-muted">
    <q-card-section class="q-pa-md">
      <div class="text-subtitle2 text-weight-bold q-mb-xs">Waiting for approval</div>
      <div class="text-caption text-grey-5 q-mb-sm">Only support@iips.app can approve. The person who submitted a change cannot approve it.</div>
      <q-list dense separator class="bg-transparent">
        <q-item v-for="row in rows" :key="row.id" class="q-px-none">
          <q-item-section>
            <q-item-label class="text-weight-medium">{{ row.summary }}</q-item-label>
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

const props = defineProps({
  domain: { type: String, required: true },
})
const emit = defineEmits(['changed'])
const $q = useQuasar()
const rows = ref([])
const busyId = ref('')
const operatorEmail = (localStorage.getItem('operator_email') || '').trim().toLowerCase()

const canApprove = (row) => operatorEmail === 'support@iips.app' && operatorEmail !== String(row.makerEmail || '').toLowerCase()

const refresh = async () => {
  try {
    const { data } = await adminApi.listMakerChecker(props.domain)
    rows.value = Array.isArray(data) ? data : []
  } catch (error) {
    rows.value = []
  }
}

const decide = async (row, action) => {
  busyId.value = row.id
  try {
    if (action === 'approve') await adminApi.approveMakerChecker(row.id)
    else await adminApi.rejectMakerChecker(row.id)
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
