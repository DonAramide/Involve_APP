<template>
  <q-page class="q-pa-xl bg-main text-main" style="min-height: 100vh;">
    <div class="row items-center q-gutter-sm q-mb-lg">
      <q-btn flat color="grey-4" icon="arrow_back" :label="backLabel" :to="backTo" />
    </div>
    <q-banner v-if="loadError" class="bg-red-10 text-red-2 q-mb-md" rounded>{{ loadError }}</q-banner>
    <div v-if="detail" class="row q-col-gutter-lg">
      <div class="col-12 col-lg-7">
        <q-card class="bg-card-dark q-pa-lg q-mb-lg">
          <div class="text-caption text-grey-5 font-mono q-mb-xs">ADMIN · READ ONLY</div>
          <div class="text-h6 text-white q-mb-md">Transaction breakdown</div>
          <div id="assessment-id" class="font-mono text-grey-4">{{ detail.id }}</div>
          <div class="q-mt-md font-mono text-caption text-grey-4">
            <div id="assessment-tenant">Tenant {{ detail.tenant?.name || detail.tenant_name || detail.tenant_id || '—' }}</div>
            <div v-if="detail.tenant_id" class="text-grey-6">Tenant id {{ detail.tenant_id }}</div>
            <div id="assessment-agent">Agent {{ detail.agent_id || '—' }}</div>
            <div>Fee profile {{ detail.fee_profile_id || detail.config_snapshot?.profile_id || '—' }}</div>
            <div>Version {{ detail.profile_version_id || '—' }}</div>
            <div>Resolved source {{ detail.resolved_source || '—' }}</div>
            <div>Agent share {{ koboToNairaLabel(detail.distribution?.AGENT_FEE) }}</div>
            <div>Transaction type {{ detail.transaction_type }}</div>
            <div>Mode {{ detail.mode }}</div>
            <div>Kind {{ detail.kind }}</div>
            <div>Source system {{ detail.source_system }}</div>
            <div>Source / idempotency {{ detail.source_idempotency_key }}</div>
            <div>Event time {{ formatTs(detail.event_time) }}</div>
            <div>Transaction amount {{ koboToNairaLabel(detail.transaction_amount_kobo) }}</div>
            <div id="assessment-calculated">Calculated fee {{ koboToNairaLabel(detail.calculated_fee_kobo) }}</div>
            <div>Minimum {{ koboToNairaLabel(detail.min_fee_kobo) }} (applied {{ koboToNairaLabel(detail.min_applied_kobo) }})</div>
            <div>Cap {{ koboToNairaLabel(detail.max_fee_kobo) }} (applied {{ koboToNairaLabel(detail.cap_applied_kobo) }})</div>
            <div id="assessment-final" class="text-white">Fee charged (assessed) {{ koboToNairaLabel(detail.final_fee_kobo) }}</div>
            <div class="text-grey-5">Not collected. Shadow assessments do not debit USER_WALLET.</div>
            <div id="assessment-ledger">ledger_entry_id {{ detail.ledger_entry_id || 'NULL' }}</div>
          </div>
        </q-card>
        <q-card class="bg-card-dark q-pa-lg q-mb-lg">
          <div class="text-h6 text-white q-mb-md">Split formula</div>
          <div id="split-formula" class="font-mono text-caption text-grey-4">
            <div>{{ detail.split_formula?.text || '—' }}</div>
            <div class="q-mt-sm">PLATFORM {{ detail.split_formula?.platform_share_pct }} · {{ koboToNairaLabel(detail.distribution.PLATFORM_FEE) }}</div>
            <div>PROCESSOR {{ detail.split_formula?.processor_share_pct }} · {{ koboToNairaLabel(detail.distribution.PROCESSOR_FEE) }}</div>
            <div>SERVICE {{ detail.split_formula?.service_share_pct }} · {{ koboToNairaLabel(detail.distribution.SERVICE_FEE) }}</div>
            <div>AGENT {{ detail.split_formula?.agent_share_pct }} · {{ koboToNairaLabel(detail.distribution.AGENT_FEE) }}</div>
          </div>
        </q-card>
        <q-card class="bg-card-dark q-pa-lg q-mb-lg">
          <div class="text-h6 text-white q-mb-md">Formula change & approval</div>
          <div id="formula-governance" class="font-mono text-caption text-grey-4">
            <div>Version {{ detail.formula_governance?.version_number || '—' }} ({{ detail.formula_governance?.source || 'snapshot' }})</div>
            <div>Modified at {{ formatTs(detail.formula_governance?.formula_modified_at) }}</div>
            <div id="formula-modified-by">Modified by {{ detail.formula_governance?.formula_modified_by_label || '—' }}</div>
            <div>Approved at {{ formatTs(detail.formula_governance?.formula_approved_at) }}</div>
            <div id="formula-approved-by">Approved by {{ detail.formula_governance?.formula_approved_by_label || '—' }}</div>
            <div v-if="detail.formula_governance?.missing_reason" class="text-amber-4 q-mt-sm">
              {{ detail.formula_governance.missing_reason }}
            </div>
          </div>
        </q-card>
        <q-card class="bg-card-dark q-pa-lg q-mb-lg">
          <div class="text-h6 text-white q-mb-md">Immutable calculation snapshot</div>
          <pre id="calculation-snapshot" class="text-caption text-grey-4">{{ JSON.stringify(detail.calculation_snapshot, null, 2) }}</pre>
        </q-card>
        <q-card class="bg-card-dark q-pa-lg">
          <div class="text-h6 text-white q-mb-md">Immutable profile/config snapshot</div>
          <pre id="config-snapshot" class="text-caption text-grey-4">{{ JSON.stringify(detail.config_snapshot, null, 2) }}</pre>
        </q-card>
      </div>
      <div class="col-12 col-lg-5">
        <q-card class="bg-card-dark q-pa-lg">
          <div class="text-h6 text-white q-mb-md">Distribution</div>
          <div id="distribution-lines" class="font-mono text-caption text-grey-4">
            <div>PLATFORM_FEE {{ koboToNairaLabel(detail.distribution.PLATFORM_FEE) }}</div>
            <div>PROCESSOR_FEE {{ koboToNairaLabel(detail.distribution.PROCESSOR_FEE) }}</div>
            <div>SERVICE_FEE {{ koboToNairaLabel(detail.distribution.SERVICE_FEE) }}</div>
            <div>AGENT_FEE {{ koboToNairaLabel(detail.distribution.AGENT_FEE) }}</div>
            <div id="distribution-total" class="text-white q-mt-sm">
              Total distributed {{ koboToNairaLabel(detail.distribution.total_distributed_kobo) }}
            </div>
            <div :class="detail.distribution.matches_final_fee ? 'text-green-4' : 'text-red-4'">
              {{ detail.distribution.matches_final_fee ? 'Total equals final fee' : 'Total does not equal final fee' }}
            </div>
          </div>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { adminApi } from '../../api'
import { koboToNairaLabel } from '../../utils/platformFeePreview'

const route = useRoute()
const detail = ref(null)
const loadError = ref('')

const backTo = computed(() => {
  if (route.query.from === 'stakeholder' && route.query.stakeholderId) {
    return `/admin/platform-fees/stakeholders/${route.query.stakeholderId}`
  }
  return '/admin/platform-fees/assessments'
})

const backLabel = computed(() => (route.query.from === 'stakeholder' ? 'Stakeholder' : 'Assessments'))

function formatTs(value) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString()
}

onMounted(async () => {
  try {
    const { data } = await adminApi.getPlatformFeeAssessment(String(route.params.assessmentId || ''))
    detail.value = data?.data
  } catch (e) {
    loadError.value = e?.response?.data?.error || 'Could not load assessment'
  }
})
</script>
