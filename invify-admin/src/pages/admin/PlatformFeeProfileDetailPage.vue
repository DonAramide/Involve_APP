<template>
  <q-page class="q-pa-xl bg-main text-main" style="min-height: 100vh;">
    <div class="row items-center q-mb-lg">
      <q-btn flat color="grey-4" icon="arrow_back" label="Fee Profiles" to="/admin/platform-fees" />
    </div>

    <q-banner v-if="loadError" class="bg-red-10 text-red-2 q-mb-md" rounded>{{ loadError }}</q-banner>
    <div v-if="loading" class="text-grey-5">Loading profile…</div>

    <div v-else-if="detail" class="row q-col-gutter-lg">
      <div class="col-12 col-lg-7">
        <q-card class="bg-card-dark q-pa-lg q-mb-lg">
          <div class="text-h6 text-white q-mb-sm">Profile</div>
          <div class="text-caption text-grey-5 font-mono">Transaction Type</div>
          <div id="profile-transaction-type" class="text-h5 text-white q-mb-md">{{ detail.profile.transaction_type }}</div>
          <div class="text-white">{{ detail.profile.display_name }}</div>
          <q-badge class="q-mt-sm" :color="workingStatus === 'DRAFT' ? 'orange-9' : workingStatus === 'PUBLISHED' ? 'green-9' : 'grey-8'" :label="workingStatus" />
          <q-badge v-if="detail.proposal" class="q-ml-sm" color="purple-8" label="PENDING_CHECKER" />
          <div class="text-caption text-amber-4 q-mt-md" id="fee-source-label">Source: {{ detail.fee_source_label || 'Global configuration' }}</div>
          <q-select
            class="q-mt-md"
            dark
            filled
            v-model="selectedAgentId"
            :options="agentOptions"
            label="Institute"
            emit-value
            map-options
            clearable
          />
        </q-card>

        <q-card class="bg-card-dark q-pa-lg q-mb-lg">
          <div class="text-h6 text-white q-mb-sm">Calculation</div>
          <div class="text-caption text-grey-5 q-mb-md">
            Switch method, then edit the fields that apply. Save Draft to persist. Publish is maker-checker.
          </div>
          <div class="q-gutter-sm q-mb-md">
            <q-radio v-model="fields.method" val="FLAT" label="FLAT" dark color="indigo-4" :disable="!canEdit || posTariffLocked" />
            <q-radio v-model="fields.method" val="PERCENTAGE" label="PERCENTAGE" dark color="indigo-4" :disable="!canEdit || posTariffLocked" />
            <q-radio v-model="fields.method" val="HYBRID" label="HYBRID" dark color="indigo-4" :disable="!canEdit || posTariffLocked" />
          </div>
          <div id="method-formula" class="q-mb-md font-mono text-indigo-3">{{ methodFormula }}</div>
          <div class="row q-col-gutter-md">
            <div class="col-6">
              <q-input
                id="percentage-bps-input"
                v-model.number="fields.percentage_bps"
                type="number"
                dark
                filled
                label="Percentage (bps)"
                :hint="percentageHint"
                :disable="!canEdit || fields.method === 'FLAT' || posTariffLocked"
              />
            </div>
            <div class="col-6">
              <q-input
                id="flat-amount-kobo-input"
                v-model.number="fields.flat_amount_kobo"
                type="number"
                dark
                filled
                label="Flat amount (kobo)"
                :hint="flatHint"
                :disable="!canEdit || fields.method === 'PERCENTAGE'"
              />
            </div>
            <div class="col-6">
              <q-input v-model.number="fields.min_fee_kobo" type="number" dark filled label="Minimum fee (kobo)" :disable="!canEdit" />
            </div>
            <div class="col-6">
              <q-input id="max-fee-kobo-input" v-model.number="fields.max_fee_kobo" type="number" dark filled label="Maximum fee / cap (kobo)" :hint="capHint" :disable="!canEdit || posTariffLocked" />
            </div>
          </div>
        </q-card>

        <q-card class="bg-card-dark q-pa-lg q-mb-lg">
          <div class="text-h6 text-white q-mb-xs">Distribution</div>
          <div class="text-caption text-grey-5 q-mb-md">Integer basis points. Must total 10000 to publish. Values are not auto-normalized.</div>
          <div class="row q-col-gutter-md">
            <div class="col-6">
              <q-input v-model.number="fields.platform_share_bps" type="number" dark filled label="Platform bps" :hint="bpsToPercentLabel(fields.platform_share_bps)" :disable="!canEdit" />
            </div>
            <div class="col-6">
              <q-input v-model.number="fields.processor_share_bps" type="number" dark filled label="Processor bps" :hint="bpsToPercentLabel(fields.processor_share_bps)" :disable="!canEdit" />
            </div>
            <div class="col-6">
              <q-input v-model.number="fields.service_share_bps" type="number" dark filled label="Service bps" :hint="bpsToPercentLabel(fields.service_share_bps)" :disable="!canEdit" />
            </div>
            <div class="col-6">
              <q-input v-model.number="fields.agent_share_bps" type="number" dark filled label="Agent bps" :hint="bpsToPercentLabel(fields.agent_share_bps)" :disable="!canEdit" />
            </div>
          </div>
          <div id="distribution-total" class="q-mt-md font-mono" :class="distributionIsValid(fields) ? 'text-green-4' : 'text-red-4'">
            Total {{ shareTotalBps(fields) }} bps ({{ (shareTotalBps(fields) / 100).toFixed(2) }}%)
          </div>
          <div v-if="!distributionIsValid(fields)" id="distribution-invalid-message" class="text-red-4 q-mt-sm">
            Distribution must total exactly 100%.
          </div>
        </q-card>

        <q-banner v-if="detail.proposal" class="bg-purple-10 text-purple-2 q-mb-md" rounded>
          Pending checker: proposed by {{ detail.proposal.makerEmail || detail.proposal.makerId }}.
          {{ isMaker ? 'You cannot approve your own proposal.' : 'A different operator must Approve & Publish.' }}
          Saving a new draft cancels the pending proposal.
        </q-banner>
        <div class="row q-gutter-sm">
          <q-btn color="indigo-7" label="Save Draft" :disable="!canEdit" :loading="saving" @click="saveDraft" />
          <q-btn
            v-if="!detail.proposal"
            id="propose-fee-btn"
            unelevated
            color="teal-8"
            label="Propose Publish"
            :disable="!canPublish"
            @click="openProposeDialog"
          />
          <q-btn
            v-if="detail.proposal"
            id="publish-fee-btn"
            unelevated
            color="teal-8"
            label="Approve & Publish"
            :disable="!canCheckerPublish"
            @click="openPublishDialog"
          />
          <q-btn
            v-if="detail.proposal"
            outline
            color="red-4"
            label="Reject Proposal"
            :loading="rejecting"
            @click="rejectProposal"
          />
        </div>
        <div id="publish-readiness" class="q-mt-md font-mono" :class="readinessOk ? 'text-green-4' : 'text-amber-4'">
          {{ readinessText }}
        </div>
        <ul v-if="blockers.length" class="text-grey-5 text-caption">
          <li v-for="reason in blockers" :key="reason">{{ reason }}</li>
        </ul>
      </div>

      <div class="col-12 col-lg-5">
        <q-card class="bg-card-dark q-pa-lg q-mb-lg">
          <div class="text-h6 text-white q-mb-xs">Fee Preview</div>
          <div class="text-caption text-grey-5 q-mb-md">Informational only. Does not create assessments, ledger entries, or wallet debits.</div>
          <q-input v-model.number="previewNaira" type="number" dark filled label="Transaction amount (₦)" prefix="₦" />
          <div class="q-mt-md font-mono text-caption text-grey-4">
            <div id="preview-method">Method {{ fields.method }}</div>
            <div>{{ methodFormula }}</div>
            <div v-if="fields.method !== 'FLAT'">Percentage {{ bpsToPercentLabel(fields.percentage_bps) }}</div>
            <div v-if="fields.method !== 'PERCENTAGE'">Flat {{ koboToNairaLabel(fields.flat_amount_kobo) }}</div>
            <div id="preview-calculated">Calculated fee {{ koboToNairaLabel(preview.calculated_fee_kobo) }}</div>
            <div>Maximum cap {{ koboToNairaLabel(fields.max_fee_kobo) }}</div>
            <div id="preview-final" class="text-white text-body1 q-mt-sm">Final fee {{ koboToNairaLabel(preview.final_fee_kobo) }}</div>
            <div v-if="preview.cap_applied_kobo" class="text-amber-4">Cap applied: −{{ koboToNairaLabel(preview.cap_applied_kobo) }}</div>
          </div>
          <div v-if="preview.distribution" class="q-mt-md text-caption font-mono text-grey-4">
            <div>Platform {{ koboToNairaLabel(preview.distribution.platform_amount_kobo) }}</div>
            <div>Processor {{ koboToNairaLabel(preview.distribution.processor_amount_kobo) }}</div>
            <div>Service {{ koboToNairaLabel(preview.distribution.service_amount_kobo) }}</div>
            <div>Agent {{ koboToNairaLabel(preview.distribution.agent_amount_kobo) }}</div>
            <div class="text-white">Total distributed {{ koboToNairaLabel(preview.final_fee_kobo) }}</div>
          </div>
          <q-btn class="q-mt-md" outline color="indigo-4" label="Server preview (no mutation)" :loading="previewing" @click="runServerPreview" />
          <div v-if="serverPreview" class="q-mt-sm text-caption text-grey-4 font-mono">
            Source {{ serverPreview.fee_source }} · Agent share {{ koboToNairaLabel(serverPreview.agent_share_kobo) }}
          </div>
        </q-card>

        <q-card class="bg-card-dark q-pa-lg">
          <div class="text-h6 text-white q-mb-md">Version History</div>
          <q-markup-table dark flat dense>
            <thead>
              <tr>
                <th>Version</th>
                <th>Status</th>
                <th>Effective From</th>
                <th>Effective To</th>
                <th>Method</th>
                <th>Created</th>
                <th>Published</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="v in detail.versions" :key="v.id">
                <td>v{{ v.version_number }}</td>
                <td>{{ v.status }}</td>
                <td>{{ formatTs(v.effective_from) }}</td>
                <td>{{ v.effective_to ? formatTs(v.effective_to) : '—' }}</td>
                <td>{{ v.method }}</td>
                <td>{{ formatTs(v.created_at) }}</td>
                <td>{{ formatTs(v.published_at) }}</td>
              </tr>
            </tbody>
          </q-markup-table>
          <div class="text-caption text-grey-6 q-mt-sm">Effective from is published_at, otherwise created_at. There is no separate effective_from column.</div>
        </q-card>
      </div>
    </div>

    <q-dialog v-model="proposeDialog" persistent>
      <q-card class="bg-card-dark text-white" style="min-width: 420px;">
        <q-card-section>
          <div class="text-h6">Propose {{ detail?.profile?.display_name || 'Fee' }} Publish?</div>
          <div class="text-caption text-grey-4 q-mt-sm">
            You are the maker. A different operator must checker-approve before this version goes live.
            <br />Method {{ fields.method }}
            <br />Percentage {{ bpsToPercentLabel(fields.percentage_bps) }}
            <br />Flat amount {{ koboToNairaLabel(fields.flat_amount_kobo) }}
            <br />Maximum fee {{ koboToNairaLabel(fields.max_fee_kobo) }}
            <br />Distribution Platform {{ bpsToPercentLabel(fields.platform_share_bps) }}
            · Processor {{ bpsToPercentLabel(fields.processor_share_bps) }}
            · Service {{ bpsToPercentLabel(fields.service_share_bps) }}
            · Agent {{ bpsToPercentLabel(fields.agent_share_bps) }}
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="grey-4" v-close-popup />
          <q-btn id="propose-confirm-btn" unelevated color="teal-8" label="Confirm Propose" :loading="proposing" @click="confirmPropose" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="publishDialog" persistent>
      <q-card class="bg-card-dark text-white" style="min-width: 420px;">
        <q-card-section>
          <div class="text-h6">Publish {{ detail?.profile?.display_name || 'Fee' }} Version?</div>
          <div class="text-caption text-grey-4 q-mt-sm">
            Checker approval. Maker was {{ detail?.proposal?.makerEmail || detail?.proposal?.makerId }}.
            <br />Method {{ fields.method }}
            <br />Percentage {{ bpsToPercentLabel(fields.percentage_bps) }}
            <br />Flat amount {{ koboToNairaLabel(fields.flat_amount_kobo) }}
            <br />Maximum fee {{ koboToNairaLabel(fields.max_fee_kobo) }}
            <br />Distribution Platform {{ bpsToPercentLabel(fields.platform_share_bps) }}
            · Processor {{ bpsToPercentLabel(fields.processor_share_bps) }}
            · Service {{ bpsToPercentLabel(fields.service_share_bps) }}
            · Agent {{ bpsToPercentLabel(fields.agent_share_bps) }}
            <br />Effective from will be the publish timestamp.
          </div>
          <q-input
            id="publish-checker-mfa"
            v-model="publishMfa"
            dark
            filled
            class="q-mt-md"
            label="2FA / authenticator code"
            maxlength="8"
            autocomplete="one-time-code"
            hint="Required for checker approval"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn id="publish-cancel-btn" flat label="Cancel" color="grey-4" v-close-popup />
          <q-btn id="publish-confirm-btn" unelevated color="teal-8" label="Confirm Publish" :loading="publishing" @click="confirmPublish" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Notify, Dialog } from 'quasar'
import { adminApi } from '../../api'
import { bpsToPercentLabel, distributionIsValid, publishBlockers, shareTotalBps } from '../../utils/platformFeeBps'
import { koboToNairaLabel, previewPlatformFee } from '../../utils/platformFeePreview'
import { promptCheckerMfa } from '../../utils/promptCheckerMfa'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const saving = ref(false)
const proposing = ref(false)
const publishing = ref(false)
const rejecting = ref(false)
const proposeDialog = ref(false)
const publishDialog = ref(false)
const publishMfa = ref('')
const loadError = ref('')
const detail = ref(null)
const previewNaira = ref(10000)
const selectedAgentId = ref(route.query.agentId || null)
const agentOptions = ref([{ label: 'Global configuration', value: null }])
const previewing = ref(false)
const serverPreview = ref(null)
const posTariffLocked = computed(() => Boolean(detail.value?.pos_tariff_locked))
const fields = reactive({
  method: 'PERCENTAGE',
  percentage_bps: 0,
  flat_amount_kobo: 0,
  min_fee_kobo: 0,
  max_fee_kobo: 0,
  platform_share_bps: 0,
  processor_share_bps: 0,
  service_share_bps: 0,
  agent_share_bps: 0,
})

function operatorEmail() {
  return String(localStorage.getItem('operator_email') || '').trim().toLowerCase()
}

const canEdit = computed(() => Boolean(detail.value))
const workingStatus = computed(() => detail.value?.working_version?.status || 'NO_VERSION')
const blockers = computed(() => publishBlockers(detail.value?.profile?.transaction_type, fields, {
  noDraft: !detail.value?.draft,
}))
const canPublish = computed(() => Boolean(detail.value?.draft) && blockers.value.length === 0)
const isMaker = computed(() => {
  const maker = String(detail.value?.proposal?.makerEmail || '').trim().toLowerCase()
  const me = operatorEmail()
  return Boolean(maker && me && maker === me)
})
const canCheckerPublish = computed(() => Boolean(detail.value?.proposal) && canPublish.value && !isMaker.value)
const readinessOk = computed(() => {
  if (!canPublish.value) return false
  if (detail.value?.proposal) return canCheckerPublish.value
  return true
})
const readinessText = computed(() => {
  if (!canPublish.value) return 'Cannot publish' + (blockers.value[0] ? ': ' + blockers.value[0] : '')
  if (detail.value?.proposal && isMaker.value) return 'Waiting for a different checker. You are the maker.'
  if (detail.value?.proposal) return 'Ready for checker to approve & publish'
  return 'Ready for maker to propose publish'
})
const methodFormula = computed(() => {
  if (fields.method === 'FLAT') return 'FLAT = flat amount only (percentage is unused)'
  if (fields.method === 'HYBRID') return 'HYBRID = flat amount + percentage of transaction, then min/cap'
  return 'PERCENTAGE = percentage of transaction, then min/cap'
})
const percentageHint = computed(() => {
  if (fields.method === 'FLAT') return 'Unused for FLAT (held at 0)'
  return `${Number(fields.percentage_bps || 0)} bps = ${bpsToPercentLabel(fields.percentage_bps)}`
})
const flatHint = computed(() => {
  if (fields.method === 'PERCENTAGE') return 'Unused for PERCENTAGE (held at 0)'
  return `${koboToNairaLabel(fields.flat_amount_kobo)} flat`
})
const capHint = computed(() => `${koboToNairaLabel(fields.max_fee_kobo)} cap`)
const preview = computed(() => previewPlatformFee({
  transactionType: detail.value?.profile?.transaction_type,
  transactionAmountKobo: Math.round(Number(previewNaira.value || 0) * 100),
  fields,
}))

function formatTs(value) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString()
}

function applyFields(src) {
  Object.assign(fields, {
    method: src.method,
    percentage_bps: src.percentage_bps,
    flat_amount_kobo: src.flat_amount_kobo,
    min_fee_kobo: src.min_fee_kobo,
    max_fee_kobo: src.max_fee_kobo,
    platform_share_bps: src.platform_share_bps,
    processor_share_bps: src.processor_share_bps,
    service_share_bps: src.service_share_bps,
    agent_share_bps: src.agent_share_bps,
  })
}

async function runServerPreview() {
  previewing.value = true
  try {
    const type = String(route.params.transactionType || '')
    const { data } = await adminApi.previewPlatformFee(type, agentPayload({
      amountKobo: Math.round(Number(previewNaira.value || 0) * 100),
      use_resolved_profile: true,
    }))
    serverPreview.value = data?.data || null
  } catch (e) {
    Notify.create({ type: 'negative', message: e?.response?.data?.error || 'Preview failed' })
  } finally {
    previewing.value = false
  }
}

function agentPayload(extra = {}) {
  return selectedAgentId.value ? { ...extra, agentId: selectedAgentId.value } : extra
}

async function loadAgents() {
  try {
    const { data } = await adminApi.listPlatformFeeAgents()
    agentOptions.value = [
      { label: 'Global configuration', value: null },
      ...(data?.data || []).map((a) => ({ label: `${a.agent_code} — ${a.name || a.status}`, value: a.id })),
    ]
  } catch { /* ignore */ }
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    await loadAgents()
    const type = String(route.params.transactionType || '')
    const params = selectedAgentId.value ? { agentId: selectedAgentId.value } : undefined
    const { data } = await adminApi.getPlatformFeeProfile(type, params)
    detail.value = data?.data
    if (detail.value?.fields) applyFields(detail.value.fields)
  } catch (e) {
    loadError.value = e?.response?.data?.error || 'Could not load fee profile'
    if (e?.response?.status === 403 || e?.response?.status === 401) {
      router.push('/unauthorized')
    }
  } finally {
    loading.value = false
  }
}

async function saveDraft() {
  saving.value = true
  try {
    const type = String(route.params.transactionType || '')
    const { data } = await adminApi.savePlatformFeeDraft(type, agentPayload({ ...fields }))
    detail.value = data?.data
    if (detail.value?.fields) applyFields(detail.value.fields)
    Notify.create({ type: 'positive', message: 'Draft saved' })
  } catch (e) {
    Notify.create({ type: 'negative', message: e?.response?.data?.error || 'Save failed' })
  } finally {
    saving.value = false
  }
}

function openProposeDialog() {
  if (!canPublish.value) return
  proposeDialog.value = true
}

function openPublishDialog() {
  if (!canCheckerPublish.value) return
  publishDialog.value = true
}

async function confirmPropose() {
  proposing.value = true
  try {
    const type = String(route.params.transactionType || '')
    const { data } = await adminApi.proposePlatformFeePublish(type, agentPayload({ ...fields }))
    detail.value = data?.data
    if (detail.value?.fields) applyFields(detail.value.fields)
    proposeDialog.value = false
    Notify.create({ type: 'positive', message: 'Publish proposed. A different operator must approve.' })
  } catch (e) {
    Notify.create({ type: 'negative', message: e?.response?.data?.error || 'Propose failed' })
  } finally {
    proposing.value = false
  }
}

async function rejectProposal() {
  rejecting.value = true
  try {
    const type = String(route.params.transactionType || '')
    const otp = await promptCheckerMfa(Dialog.create.bind(Dialog), {
      title: 'Checker 2FA required',
      message: 'Enter your authenticator code to reject this publish proposal.',
      okLabel: 'Verify & reject',
      okColor: 'red-6',
    })
    if (!otp) {
      Notify.create({ type: 'warning', message: 'Rejection cancelled. 2FA code is required.' })
      return
    }
    const { data } = await adminApi.rejectPlatformFeePublish(type, agentPayload({ otp }))
    detail.value = data?.data
    if (detail.value?.fields) applyFields(detail.value.fields)
    Notify.create({ type: 'positive', message: 'Publish proposal rejected' })
  } catch (e) {
    Notify.create({ type: 'negative', message: e?.response?.data?.message || e?.response?.data?.error || 'Reject failed' })
  } finally {
    rejecting.value = false
  }
}

async function confirmPublish() {
  const otp = String(publishMfa.value || '').trim()
  if (otp.length < 6) {
    Notify.create({ type: 'warning', message: 'Enter your 6-digit 2FA code to publish.' })
    return
  }
  publishing.value = true
  try {
    const type = String(route.params.transactionType || '')
    const { data } = await adminApi.publishPlatformFeeVersion(type, agentPayload({ otp }))
    detail.value = data?.data
    if (detail.value?.fields) applyFields(detail.value.fields)
    publishDialog.value = false
    publishMfa.value = ''
    Notify.create({ type: 'positive', message: 'Fee profile version published' })
  } catch (e) {
    Notify.create({ type: 'negative', message: e?.response?.data?.message || e?.response?.data?.error || 'Publish failed' })
  } finally {
    publishing.value = false
  }
}

watch(() => fields.method, (method) => {
  if (method === 'FLAT') fields.percentage_bps = 0
  if (method === 'PERCENTAGE') fields.flat_amount_kobo = 0
})
watch(() => route.params.transactionType, load)
watch(selectedAgentId, load)
onMounted(load)
</script>

<style scoped>
.bg-card-dark { background: #0b0f19; border: 1px solid rgba(255,255,255,0.06); }
.font-mono { font-family: 'Courier New', Courier, monospace; }
</style>
