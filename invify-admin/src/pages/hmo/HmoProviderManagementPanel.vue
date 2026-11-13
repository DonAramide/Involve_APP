<template>
  <div class="column q-gutter-md">
    <div class="row items-start q-col-gutter-sm">
      <div v-for="card in statCards" :key="card.label" class="col-6 col-sm-4 col-md-3">
        <q-card flat bordered class="bg-card-dark q-pa-sm">
          <div class="text-caption text-grey-5">{{ card.label }}</div>
          <div class="text-h6">{{ card.value }}</div>
        </q-card>
      </div>
    </div>

    <div class="row q-gutter-sm items-center">
      <q-input v-model="search" :dark="isDark" outlined dense label="Search code, name, or licence" class="col" @keyup.enter="reload" />
      <q-select
        v-model="statusFilter"
        :options="statusFilters"
        emit-value
        map-options
        outlined
        dense
        :dark="isDark"
        label="Status"
        style="min-width: 180px"
        @update:model-value="reload"
      />
      <q-select
        v-model="channelFilter"
        :options="channelFilters"
        emit-value
        map-options
        outlined
        dense
        :dark="isDark"
        label="Channel"
        style="min-width: 180px"
        @update:model-value="reload"
      />
      <q-btn color="teal-8" no-caps label="Refresh" :loading="loadingList" @click="reload" />
      <q-btn color="primary" no-caps label="Register HMO" icon="add" @click="openRegister" />
    </div>

    <q-banner v-if="denial" dense rounded class="bg-amber-10 text-amber-2">
      <div>{{ denial }}</div>
      <q-btn flat dense color="amber-2" label="Open Platform Governance" no-caps to="/admin/health-insurance" />
    </q-banner>
    <q-banner v-else-if="listError" dense rounded class="bg-red-10 text-red-2">{{ listError }}</q-banner>

    <q-table
      v-else
      :rows="providers"
      :columns="columns"
      row-key="id"
      :dark="isDark"
      flat
      bordered
      :loading="loadingList"
      :pagination="pagination"
      @request="onRequest"
      no-data-label="No HMO providers match this filter."
      class="cursor-pointer"
      @row-click="(_e, row) => openDetail(row)"
    >
      <template #body-cell-status="props">
        <q-td :props="props">
          <q-badge :color="statusColor(props.row.integration_status)" :label="statusLabel(props.row.integration_status)" />
        </q-td>
      </template>
      <template #body-cell-channel="props">
        <q-td :props="props">
          <q-badge outline color="cyan-4" :label="channelLabel(props.row.registration_channel)" />
        </q-td>
      </template>
    </q-table>

    <q-card v-if="detail" flat bordered class="bg-card-dark q-pa-md">
      <div class="row items-center justify-between q-mb-sm">
        <div>
          <div class="text-subtitle1 text-weight-bold">{{ detail.provider.display_name }}</div>
          <div class="text-caption text-grey-4">
            {{ detail.provider.code }} ·
            <q-badge :color="statusColor(detail.provider.integration_status)" :label="statusLabel(detail.provider.integration_status)" />
          </div>
        </div>
        <div class="row q-gutter-xs">
          <q-btn dense flat no-caps color="grey-4" label="Close" @click="detail = null" />
        </div>
      </div>

      <q-tabs v-model="detailTab" dense align="left" class="text-grey-4" active-color="teal-4" indicator-color="teal-4">
        <q-tab name="overview" label="Overview" no-caps />
        <q-tab name="organisation" label="Organisation" no-caps />
        <q-tab name="contact" label="Contact" no-caps />
        <q-tab name="documents" label="Documents" no-caps />
        <q-tab name="plans" label="Plans" no-caps />
        <q-tab name="institutions" label="Linked institutions" no-caps />
        <q-tab name="banks" label="Bank relationships" no-caps />
        <q-tab name="audit" label="Activity" no-caps />
      </q-tabs>
      <q-separator />
      <q-tab-panels v-model="detailTab" animated class="bg-transparent">
        <q-tab-panel name="overview" class="q-px-none">
          <div class="text-caption text-grey-4">Licence: {{ detail.provider.licence_reference || 'Not recorded' }}</div>
          <div class="text-caption text-grey-4">Regulator: {{ detail.provider.regulator_type || '—' }}</div>
          <div class="text-caption text-grey-4">
            Registration channel:
            <q-badge outline color="cyan-4" :label="channelLabel(detail.provider.registration_channel)" />
          </div>
          <div class="text-caption text-grey-4">Assignable for new enrolments: {{ detail.provider.assignable ? 'Yes' : 'No' }}</div>
          <div class="text-caption text-grey-4">Linked tenants: {{ detail.provider.tenant_count ?? 0 }}</div>
          <div class="text-caption text-grey-5 q-mt-sm">{{ detail.provider.description || 'No description recorded.' }}</div>
          <div class="row q-gutter-sm q-mt-md">
            <q-btn dense no-caps color="teal-8" label="Edit" @click="openEdit" />
            <q-btn
              dense
              no-caps
              outline
              color="teal-4"
              label="View institute tenants"
              @click="emit('open-institution', detail.provider.id || detail.provider.code)"
            />
            <q-btn
              v-if="canApprove"
              dense
              no-caps
              color="positive"
              label="Approve"
              :loading="lifecycleBusy"
              @click="confirmLifecycle('approve')"
            />
            <q-btn
              v-if="canReject"
              dense
              no-caps
              color="negative"
              outline
              label="Reject"
              :loading="lifecycleBusy"
              @click="confirmLifecycle('reject')"
            />
            <q-btn
              v-if="canSuspend"
              dense
              no-caps
              color="warning"
              label="Suspend"
              :loading="lifecycleBusy"
              @click="confirmLifecycle('suspend')"
            />
            <q-btn
              v-if="canReactivate"
              dense
              no-caps
              color="teal-8"
              label="Reactivate"
              :loading="lifecycleBusy"
              @click="confirmLifecycle('reactivate')"
            />
          </div>
          <div v-if="detail.provider.status_reason" class="text-caption text-amber-3 q-mt-sm">
            Last status reason: {{ detail.provider.status_reason }}
          </div>
        </q-tab-panel>

        <q-tab-panel name="organisation" class="q-px-none">
          <div class="text-caption">Legal name: {{ detail.provider.legal_name || '—' }}</div>
          <div class="text-caption">Display name: {{ detail.provider.display_name }}</div>
          <div class="text-caption">Address: {{ detail.provider.head_office_address || '—' }}</div>
          <div class="text-caption">State / LGA: {{ detail.provider.state || '—' }} / {{ detail.provider.lga || '—' }}</div>
          <div class="text-caption">Website: {{ detail.provider.website_url || '—' }}</div>
        </q-tab-panel>

        <q-tab-panel name="contact" class="q-px-none">
          <div class="text-caption">Official email: {{ detail.provider.contact_email || '—' }}</div>
          <div class="text-caption">Phone: {{ detail.provider.contact_phone || '—' }}</div>
          <div class="text-caption">Support: {{ detail.provider.support_email || '—' }}</div>
          <div class="text-caption">Claims: {{ detail.provider.claims_email || '—' }}</div>
          <div class="text-caption">Contact person: {{ detail.provider.contact_person_name || '—' }}</div>
          <div class="text-caption">
            Person email / phone: {{ detail.provider.contact_person_email || '—' }} / {{ detail.provider.contact_person_phone || '—' }}
          </div>
        </q-tab-panel>

        <q-tab-panel name="documents" class="q-px-none">
          <div class="text-caption">Licence / registration: {{ detail.provider.licence_reference || 'Not recorded' }}</div>
          <div class="text-caption">Licence expiry: {{ detail.provider.licence_expiry || 'Not recorded' }}</div>
          <div class="text-caption q-mb-sm">Logo:</div>
          <q-avatar v-if="detail.provider.logo_url" size="64px" class="bg-panel">
            <img :src="detail.provider.logo_url" alt="Provider logo" />
          </q-avatar>
          <div v-else class="text-caption text-grey-5">No logo on file. Supporting document storage beyond logo/licence fields is not wired in this module.</div>
        </q-tab-panel>

        <q-tab-panel name="plans" class="q-px-none">
          <q-table
            dense
            flat
            bordered
            :dark="isDark"
            :rows="detail.plans || []"
            :columns="planColumns"
            row-key="id"
            :pagination="{ rowsPerPage: 8 }"
            no-data-label="No plans recorded for this HMO."
          />
        </q-tab-panel>

        <q-tab-panel name="institutions" class="q-px-none">
          <div class="text-caption text-grey-5 q-mb-sm">Tenant assignments and school links stay readable even if the provider is suspended or rejected.</div>
          <q-table
            dense
            flat
            bordered
            :dark="isDark"
            :rows="institutionRows"
            :columns="institutionColumns"
            row-key="key"
            :pagination="{ rowsPerPage: 8 }"
            no-data-label="No linked institutions recorded."
          />
        </q-tab-panel>

        <q-tab-panel name="banks" class="q-px-none">
          <q-banner v-if="detail.bankRelationships && detail.bankRelationships.supported === false" dense class="bg-amber-10 text-amber-2 q-mb-sm">
            Bank relationship data is unavailable: {{ detail.bankRelationships.note || 'schema dependency' }}
          </q-banner>
          <q-table
            v-else
            dense
            flat
            bordered
            :dark="isDark"
            :rows="detail.bankRelationships?.rows || []"
            :columns="bankColumns"
            row-key="id"
            :pagination="{ rowsPerPage: 8 }"
            no-data-label="No bank HMO offerings linked to this provider."
          />
        </q-tab-panel>

        <q-tab-panel name="audit" class="q-px-none">
          <q-table
            dense
            flat
            bordered
            :dark="isDark"
            :rows="detail.audit?.events || []"
            :columns="auditColumns"
            row-key="id"
            :pagination="{ rowsPerPage: 10 }"
            no-data-label="No provider audit events recorded yet."
          />
        </q-tab-panel>
      </q-tab-panels>
    </q-card>

    <q-dialog v-model="showRegister" persistent>
      <q-card class="hmo-dialog" style="min-width: min(560px, 96vw); max-width: 640px">
        <q-card-section class="text-subtitle1 text-weight-bold">Register HMO provider</q-card-section>
        <q-card-section class="q-gutter-sm" style="max-height: 70vh; overflow: auto">
          <div class="text-caption text-grey-5">New registrations start as Pending approval. They are not selectable for institution enrolments until approved.</div>
          <q-input v-model="form.displayName" outlined dense :dark="isDark" label="Display name *" />
          <q-input v-model="form.legalName" outlined dense :dark="isDark" label="Legal name" />
          <q-input v-model="form.code" outlined dense :dark="isDark" label="Code (optional, lowercase)" hint="Letters, digits, underscore" />
          <q-input v-model="form.licenceReference" outlined dense :dark="isDark" label="Registration / licence number" />
          <q-select v-model="form.regulatorType" :options="regulatorOptions" emit-value map-options outlined dense :dark="isDark" label="Regulator" />
          <q-select
            v-model="form.registrationChannel"
            :options="channelOptions"
            emit-value
            map-options
            outlined
            dense
            :dark="isDark"
            label="Registration channel *"
            hint="Platform = Super Admin; Self-service = HMO signed up as a service; Agent = institute/bank onboarded"
          />
          <q-input v-model="form.licenceExpiry" outlined dense :dark="isDark" label="Licence expiry (YYYY-MM-DD)" />
          <q-input v-model="form.contactEmail" outlined dense :dark="isDark" label="Official email" />
          <q-input v-model="form.contactPhone" outlined dense :dark="isDark" label="Phone" />
          <q-input v-model="form.websiteUrl" outlined dense :dark="isDark" label="Website" />
          <q-input v-model="form.headOfficeAddress" outlined dense :dark="isDark" type="textarea" autogrow label="Registered address" />
          <div class="row q-col-gutter-sm">
            <div class="col-6"><q-input v-model="form.state" outlined dense :dark="isDark" label="State" /></div>
            <div class="col-6"><q-input v-model="form.lga" outlined dense :dark="isDark" label="LGA" /></div>
          </div>
          <q-input v-model="form.contactPersonName" outlined dense :dark="isDark" label="Contact person" />
          <q-input v-model="form.contactPersonEmail" outlined dense :dark="isDark" label="Contact person email" />
          <q-input v-model="form.contactPersonPhone" outlined dense :dark="isDark" label="Contact person phone" />
          <q-input v-model="form.description" outlined dense :dark="isDark" type="textarea" autogrow label="Description" />
          <q-file
            v-model="logoFile"
            outlined
            dense
            :dark="isDark"
            label="Logo (PNG/JPEG/WebP, max 3MB)"
            accept="image/png,image/jpeg,image/webp"
            @update:model-value="onLogoSelected"
          />
          <div v-if="formError" class="text-negative text-caption">{{ formError }}</div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat no-caps label="Cancel" v-close-popup />
          <q-btn color="teal-8" no-caps label="Submit for approval" :loading="saving" @click="submitRegister" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="showEdit" persistent>
      <q-card class="hmo-dialog" style="min-width: min(520px, 96vw)">
        <q-card-section class="text-subtitle1 text-weight-bold">Edit provider</q-card-section>
        <q-card-section class="q-gutter-sm" style="max-height: 70vh; overflow: auto">
          <q-input v-model="form.displayName" outlined dense :dark="isDark" label="Display name *" />
          <q-input v-model="form.legalName" outlined dense :dark="isDark" label="Legal name" />
          <q-input v-model="form.licenceReference" outlined dense :dark="isDark" label="Licence / registration" />
          <q-select v-model="form.regulatorType" :options="regulatorOptions" emit-value map-options outlined dense :dark="isDark" label="Regulator" />
          <q-select
            v-model="form.registrationChannel"
            :options="channelOptions"
            emit-value
            map-options
            outlined
            dense
            :dark="isDark"
            label="Registration channel *"
          />
          <q-input v-model="form.contactEmail" outlined dense :dark="isDark" label="Official email" />
          <q-input v-model="form.contactPhone" outlined dense :dark="isDark" label="Phone" />
          <q-input v-model="form.websiteUrl" outlined dense :dark="isDark" label="Website" />
          <q-input v-model="form.headOfficeAddress" outlined dense :dark="isDark" type="textarea" autogrow label="Address" />
          <q-input v-model="form.contactPersonName" outlined dense :dark="isDark" label="Contact person" />
          <q-input v-model="form.contactPersonEmail" outlined dense :dark="isDark" label="Contact person email" />
          <q-input v-model="form.contactPersonPhone" outlined dense :dark="isDark" label="Contact person phone" />
          <q-input v-model="form.description" outlined dense :dark="isDark" type="textarea" autogrow label="Description" />
          <q-file
            v-model="logoFile"
            outlined
            dense
            :dark="isDark"
            label="Replace logo"
            accept="image/png,image/jpeg,image/webp"
            @update:model-value="onLogoSelected"
          />
          <div v-if="formError" class="text-negative text-caption">{{ formError }}</div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat no-caps label="Cancel" v-close-popup />
          <q-btn color="teal-8" no-caps label="Save" :loading="saving" @click="submitEdit" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="showLifecycle" persistent>
      <q-card class="hmo-dialog" style="min-width: 420px">
        <q-card-section class="text-subtitle1 text-weight-bold">{{ lifecycleTitle }}</q-card-section>
        <q-card-section>
          <div class="text-caption text-grey-4 q-mb-sm">{{ lifecycleHint }}</div>
          <q-input
            v-if="lifecycleNeedsReason"
            v-model="lifecycleReason"
            outlined
            dense
            type="textarea"
            autogrow
            :dark="isDark"
            label="Reason (required)"
          />
          <div v-if="formError" class="text-negative text-caption q-mt-sm">{{ formError }}</div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat no-caps label="Cancel" v-close-popup />
          <q-btn :color="lifecycleColor" no-caps :label="lifecycleConfirmLabel" :loading="lifecycleBusy" @click="runLifecycle" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { healthInsuranceApi } from 'src/api/healthInsuranceApi'
import {
  emptyProviderRegistrationForm,
  PROVIDER_CHANNEL_FILTERS,
  PROVIDER_STATUS_FILTERS,
  REGISTRATION_CHANNEL_OPTIONS,
  REGULATOR_OPTIONS,
  providerChannelLabel,
  providerGovernanceLabel,
  providerStatusColor
} from 'src/hmo/providerLifecycle'
import { platformHttpDenial } from 'src/hmo/overviewState'

const props = defineProps({
  isDark: { type: Boolean, default: true },
  reason: { type: Function, required: true }
})

const emit = defineEmits(['providers-changed', 'open-institution'])
const $q = useQuasar()

const search = ref('')
const statusFilter = ref('')
const channelFilter = ref('')
const statusFilters = PROVIDER_STATUS_FILTERS
const channelFilters = PROVIDER_CHANNEL_FILTERS
const regulatorOptions = REGULATOR_OPTIONS
const channelOptions = REGISTRATION_CHANNEL_OPTIONS
const providers = ref([])
const stats = ref(null)
const loadingList = ref(false)
const denial = ref('')
const listError = ref('')
const pagination = ref({ page: 1, rowsPerPage: 10, rowsNumber: 0 })

const detail = ref(null)
const detailTab = ref('overview')
const showRegister = ref(false)
const showEdit = ref(false)
const showLifecycle = ref(false)
const form = ref(emptyProviderRegistrationForm())
const logoFile = ref(null)
const formError = ref('')
const saving = ref(false)
const lifecycleBusy = ref(false)
const lifecycleAction = ref('')
const lifecycleReason = ref('')

const columns = [
  { name: 'display_name', label: 'Provider', field: 'display_name', align: 'left' },
  { name: 'code', label: 'Code', field: 'code', align: 'left' },
  { name: 'licence', label: 'Licence', field: (r) => r.licence_reference || '—', align: 'left' },
  { name: 'status', label: 'Status', field: 'integration_status', align: 'left' },
  { name: 'channel', label: 'Channel', field: 'registration_channel', align: 'left' },
  { name: 'tenants', label: 'Tenants', field: (r) => r.tenant_count ?? 0, align: 'right' }
]

const planColumns = [
  { name: 'name', label: 'Plan', field: 'name', align: 'left' },
  { name: 'code', label: 'Code', field: 'code', align: 'left' },
  { name: 'status', label: 'Status', field: 'status', align: 'left' }
]

const institutionColumns = [
  { name: 'tenant', label: 'Tenant / institution', field: 'label', align: 'left' },
  { name: 'source', label: 'Source', field: 'source', align: 'left' },
  { name: 'status', label: 'Status', field: 'status', align: 'left' }
]

const bankColumns = [
  { name: 'agent', label: 'Bank agent', field: 'agent_id', align: 'left' },
  { name: 'plan', label: 'Plan version', field: 'plan_version_id', align: 'left' },
  { name: 'active', label: 'Active', field: (r) => (r.is_active ? 'yes' : 'no'), align: 'left' }
]

const auditColumns = [
  { name: 'occurred', label: 'When', field: 'occurred_at', align: 'left' },
  { name: 'action', label: 'Action', field: 'action', align: 'left' },
  { name: 'reason', label: 'Platform reason', field: (r) => r.platform_reason || r.changes?.statusReason || '—', align: 'left' }
]

const statusLabel = providerGovernanceLabel
const statusColor = providerStatusColor
const channelLabel = providerChannelLabel

const statCards = computed(() => {
  const s = stats.value || {}
  return [
    { label: 'Registered', value: formatStat(s.totalRegistered) },
    { label: 'Active', value: formatStat(s.active) },
    { label: 'Pending approval', value: formatStat(s.pendingApproval) },
    { label: 'Suspended', value: formatStat(s.suspended) },
    { label: 'Rejected', value: formatStat(s.rejected) },
    { label: 'Linked tenants', value: formatStat(s.linkedTenantAssignments) },
    { label: 'Plans', value: formatStat(s.totalPlans) },
    { label: 'Catalogue offerings', value: s.totalCatalogueOfferings == null ? '—' : formatStat(s.totalCatalogueOfferings) }
  ]
})

const institutionRows = computed(() => {
  if (!detail.value) return []
  const rows = []
  for (const link of detail.value.schoolLinks || []) {
    rows.push({
      key: `link-${link.id || link.tenant_id}`,
      label: link.institution_id || link.tenant_id || '—',
      source: 'school_link',
      status: link.onboarding_status || '—'
    })
  }
  for (const asg of detail.value.tenantAssignments || []) {
    rows.push({
      key: `asg-${asg.tenant_id}`,
      label: asg.tenant_id,
      source: asg.assignment_source || 'assignment',
      status: 'assigned'
    })
  }
  return rows
})

const canApprove = computed(() =>
  ['pending_verification', 'none', 'rejected'].includes(String(detail.value?.provider?.integration_status || ''))
)
const canReject = computed(() =>
  ['pending_verification', 'none'].includes(String(detail.value?.provider?.integration_status || ''))
)
const canSuspend = computed(() =>
  ['verified', 'sandbox', 'pending_verification'].includes(String(detail.value?.provider?.integration_status || ''))
)
const canReactivate = computed(() => String(detail.value?.provider?.integration_status || '') === 'suspended')

const lifecycleNeedsReason = computed(() => ['reject', 'suspend'].includes(lifecycleAction.value))
const lifecycleTitle = computed(() => {
  switch (lifecycleAction.value) {
    case 'approve': return 'Approve provider'
    case 'reject': return 'Reject provider'
    case 'suspend': return 'Suspend provider'
    case 'reactivate': return 'Reactivate provider'
    default: return 'Confirm'
  }
})
const lifecycleHint = computed(() => {
  switch (lifecycleAction.value) {
    case 'approve': return 'This marks the HMO as verified/active. Institutions may then select it for new enrolments.'
    case 'reject': return 'Rejection requires a recorded reason. The provider will not be selectable.'
    case 'suspend': return 'Suspension requires a recorded reason. Historical enrolments remain readable.'
    case 'reactivate': return 'Reactivation restores active (verified) status.'
    default: return ''
  }
})
const lifecycleConfirmLabel = computed(() => {
  switch (lifecycleAction.value) {
    case 'approve': return 'Confirm approve'
    case 'reject': return 'Confirm reject'
    case 'suspend': return 'Confirm suspend'
    case 'reactivate': return 'Confirm reactivate'
    default: return 'Confirm'
  }
})
const lifecycleColor = computed(() => {
  if (lifecycleAction.value === 'reject') return 'negative'
  if (lifecycleAction.value === 'suspend') return 'warning'
  return 'teal-8'
})

function formatStat(v) {
  if (v == null) return '—'
  return String(v)
}

function platformReason() {
  return typeof props.reason === 'function' ? props.reason() : ''
}

async function loadStats() {
  try {
    const res = await healthInsuranceApi.getPlatformProviderStatistics(platformReason())
    stats.value = res?.data?.data || res?.data || null
  } catch (err) {
    const denialInfo = platformHttpDenial(err?.response?.status, err?.response?.data)
    if (denialInfo.state === 'access_denied' || denialInfo.state === 'reason_required') {
      denial.value = denialInfo.message
    }
  }
}

async function loadList(page = pagination.value.page) {
  loadingList.value = true
  denial.value = ''
  listError.value = ''
  try {
    const limit = pagination.value.rowsPerPage || 10
    const offset = (Math.max(page, 1) - 1) * limit
    const res = await healthInsuranceApi.getPlatformRegistry(platformReason(), {
      search: search.value,
      status: statusFilter.value,
      channel: channelFilter.value,
      limit,
      offset
    })
    const payload = res?.data?.data || res?.data || {}
    providers.value = payload.providers || []
    pagination.value = {
      ...pagination.value,
      page,
      rowsNumber: payload.total ?? providers.value.length
    }
  } catch (err) {
    const denialInfo = platformHttpDenial(err?.response?.status, err?.response?.data)
    if (denialInfo.state === 'access_denied' || denialInfo.state === 'reason_required') {
      denial.value = denialInfo.message
      providers.value = []
    } else {
      listError.value = err?.response?.data?.error?.message || err?.message || 'Failed to list providers'
    }
  } finally {
    loadingList.value = false
  }
}

function reload() {
  loadStats()
  return loadList(1)
}

function onRequest(propsReq) {
  const { page, rowsPerPage } = propsReq.pagination
  pagination.value.page = page
  pagination.value.rowsPerPage = rowsPerPage
  loadList(page)
}

async function openDetail(row) {
  detailTab.value = 'overview'
  try {
    const res = await healthInsuranceApi.getPlatformProviderDetail(row.id, platformReason())
    detail.value = res?.data?.data || res?.data || null
  } catch (err) {
    $q.notify({ type: 'negative', message: err?.response?.data?.error?.message || err?.message || 'Failed to load provider' })
  }
}

function openRegister() {
  form.value = emptyProviderRegistrationForm()
  logoFile.value = null
  formError.value = ''
  showRegister.value = true
}

function openEdit() {
  const p = detail.value?.provider
  if (!p) return
  form.value = {
    ...emptyProviderRegistrationForm(),
    displayName: p.display_name || '',
    legalName: p.legal_name || '',
    licenceReference: p.licence_reference || '',
    regulatorType: p.regulator_type || 'NHIA',
    registrationChannel: p.registration_channel || 'platform',
    licenceExpiry: p.licence_expiry || '',
    contactEmail: p.contact_email || '',
    contactPhone: p.contact_phone || '',
    websiteUrl: p.website_url || '',
    headOfficeAddress: p.head_office_address || '',
    state: p.state || '',
    lga: p.lga || '',
    contactPersonName: p.contact_person_name || '',
    contactPersonEmail: p.contact_person_email || '',
    contactPersonPhone: p.contact_person_phone || '',
    description: p.description || '',
    logoImage: ''
  }
  logoFile.value = null
  formError.value = ''
  showEdit.value = true
}

function onLogoSelected(file) {
  form.value.logoImage = ''
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => {
    form.value.logoImage = String(e.target?.result || '')
  }
  reader.readAsDataURL(file)
}

async function submitRegister() {
  formError.value = ''
  if (!String(form.value.displayName || '').trim()) {
    formError.value = 'Display name is required.'
    return
  }
  saving.value = true
  try {
    await healthInsuranceApi.registerPlatformProvider({ ...form.value }, platformReason())
    $q.notify({ type: 'positive', message: 'Provider registered and pending approval.' })
    showRegister.value = false
    emit('providers-changed')
    await reload()
  } catch (err) {
    formError.value = err?.response?.data?.error?.message || err?.message || 'Registration failed'
  } finally {
    saving.value = false
  }
}

async function submitEdit() {
  formError.value = ''
  if (!detail.value?.provider?.id) return
  if (!String(form.value.displayName || '').trim()) {
    formError.value = 'Display name is required.'
    return
  }
  saving.value = true
  try {
    const payload = { ...form.value }
    if (!payload.logoImage) delete payload.logoImage
    await healthInsuranceApi.updatePlatformProvider(detail.value.provider.id, payload, platformReason())
    $q.notify({ type: 'positive', message: 'Provider updated.' })
    showEdit.value = false
    await openDetail(detail.value.provider)
    emit('providers-changed')
    await reload()
  } catch (err) {
    formError.value = err?.response?.data?.error?.message || err?.message || 'Update failed'
  } finally {
    saving.value = false
  }
}

function confirmLifecycle(action) {
  lifecycleAction.value = action
  lifecycleReason.value = ''
  formError.value = ''
  showLifecycle.value = true
}

async function runLifecycle() {
  formError.value = ''
  const id = detail.value?.provider?.id
  if (!id) return
  if (lifecycleNeedsReason.value && String(lifecycleReason.value || '').trim().length < 5) {
    formError.value = 'A reason of at least 5 characters is required.'
    return
  }
  lifecycleBusy.value = true
  try {
    const reason = platformReason()
    const body = { reason: lifecycleReason.value }
    if (lifecycleAction.value === 'approve') await healthInsuranceApi.approvePlatformProvider(id, reason)
    else if (lifecycleAction.value === 'reject') await healthInsuranceApi.rejectPlatformProvider(id, body, reason)
    else if (lifecycleAction.value === 'suspend') await healthInsuranceApi.suspendPlatformProvider(id, body, reason)
    else if (lifecycleAction.value === 'reactivate') await healthInsuranceApi.reactivatePlatformProvider(id, body, reason)
    $q.notify({ type: 'positive', message: 'Provider status updated.' })
    showLifecycle.value = false
    await openDetail({ id })
    emit('providers-changed')
    await reload()
  } catch (err) {
    formError.value = err?.response?.data?.error?.message || err?.message || 'Status change failed'
  } finally {
    lifecycleBusy.value = false
  }
}

watch(search, () => {
  // debounce-lite: reload on clear
  if (!search.value) reload()
})

onMounted(() => {
  reload()
})

defineExpose({ reload })
</script>
