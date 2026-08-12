<!-- invify-admin/src/components/finance/CardSettlementUploadDialog.vue -->
<template>
  <q-dialog v-model="open" persistent>
    <q-card class="bg-panel text-main" style="min-width: 520px; max-width: 720px;">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6 text-weight-bold">Upload Processor Settlement File</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section class="q-gutter-md">
        <div class="text-caption text-muted">
          Confirms Quasar pull-account settlement beyond auth code <strong>00</strong>.
          Upload requires admin 2FA.
        </div>

        <q-select
          v-model="templateType"
          :options="templateOptions"
          label="Settlement template"
          emit-value
          map-options
          filled
          dense
          :dark="prefs.isDarkMode"
        />

        <q-file
          v-model="file"
          label="Excel settlement file (.xlsx)"
          accept=".xlsx,.xls"
          filled
          dense
          clearable
          :dark="prefs.isDarkMode"
        >
          <template #prepend>
            <q-icon name="upload_file" />
          </template>
        </q-file>

        <q-input
          v-model="otp"
          label="Admin 2FA code"
          mask="######"
          filled
          dense
          :dark="prefs.isDarkMode"
          input-class="text-center text-h6 font-mono"
        />

        <q-toggle v-model="dryRun" label="Dry run (preview matches only — do not mark settled)" color="amber-6" />

        <q-banner v-if="result" dense class="bg-subpanel border-muted rounded-borders">
          <div class="text-weight-bold q-mb-xs">
            {{ result.dryRun ? 'Dry-run result' : 'Upload complete' }}
          </div>
          <div class="font-mono text-caption">
            Rows: {{ result.totalRows }} · Matched: {{ result.matchedCount }} ·
            Unmatched: {{ result.unmatchedFileRows }} · Already settled: {{ result.alreadySettledCount }}
          </div>
        </q-banner>
      </q-card-section>

      <q-card-actions align="right" class="q-pa-md">
        <q-btn flat label="Cancel" v-close-popup />
        <q-btn
          color="amber-6"
          text-color="black"
          label="Preview"
          :loading="loading && dryRun"
          :disable="!canSubmit"
          @click="submit(true)"
        />
        <q-btn
          color="green-6"
          text-color="black"
          label="Upload & Settle"
          :loading="loading && !dryRun"
          :disable="!canSubmit"
          @click="submit(false)"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { Notify } from 'quasar'
import { cardSettlementApi } from '../../api'
import { useOperatorPreferences } from '../../composables/useOperatorPreferences'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  tenantId: { type: String, default: null },
})

const emit = defineEmits(['update:modelValue', 'uploaded'])

const { prefs } = useOperatorPreferences()

const open = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const templateType = ref('NIBSS_REXCONNECT')
const templateOptions = ref([])
const file = ref(null)
const otp = ref('')
const dryRun = ref(true)
const loading = ref(false)
const result = ref(null)

const canSubmit = computed(() => !!file.value && templateType.value && otp.value.length === 6)

watch(open, async (isOpen) => {
  if (!isOpen) return
  result.value = null
  otp.value = ''
  try {
    const res = await cardSettlementApi.listTemplates()
    templateOptions.value = (res.data?.templates || []).map((t) => ({
      label: t.label,
      value: t.id,
      caption: t.description,
    }))
  } catch (e) {
    Notify.create({ type: 'negative', message: 'Failed to load settlement templates' })
  }
})

async function submit(preview) {
  if (!file.value) return
  loading.value = true
  dryRun.value = preview

  try {
    const form = new FormData()
    form.append('file', file.value)
    form.append('templateType', templateType.value)
    form.append('otp', otp.value)
    form.append('dryRun', preview ? 'true' : 'false')
    if (props.tenantId) form.append('tenantId', props.tenantId)

    const res = await cardSettlementApi.upload(form)
    result.value = res.data?.result
    Notify.create({
      type: 'positive',
      message: res.data?.message || 'Settlement file processed',
    })
    if (!preview) emit('uploaded', result.value)
  } catch (e) {
    const msg = e?.response?.data?.error || e?.response?.data?.message || e.message
    Notify.create({ type: 'negative', message: msg || 'Upload failed' })
  } finally {
    loading.value = false
  }
}
</script>
