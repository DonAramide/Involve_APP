<template>
  <q-page padding class="bg-dark text-white">
    <div class="row items-center q-mb-lg">
      <q-icon name="mark_email_unread" size="md" color="indigo-4" class="q-mr-md" />
      <div class="col">
        <h1 class="text-h5 q-my-none text-weight-bold">Verification Log</h1>
        <div class="text-caption text-grey-4">
          Latest email and WhatsApp OTP sends. Codes are never shown here.
        </div>
      </div>
      <div class="col-auto">
        <q-btn
          flat
          color="grey-4"
          icon="security"
          label="Auth settings"
          no-caps
          to="/admin/settings/authentication"
        />
      </div>
    </div>

    <q-card class="bg-grey-10 q-mb-md border-indigo">
      <q-card-section class="row q-col-gutter-sm items-center">
        <div class="col-12 col-md-4">
          <q-input
            v-model="search"
            dark
            filled
            dense
            debounce="400"
            label="Search email or phone"
            @update:model-value="fetchRows"
          >
            <template v-slot:append>
              <q-icon name="search" />
            </template>
          </q-input>
        </div>
        <div class="col-12 col-sm-6 col-md-2">
          <q-select
            v-model="channel"
            :options="channelOptions"
            dark
            filled
            dense
            emit-value
            map-options
            label="Channel"
            @update:model-value="fetchRows"
          />
        </div>
        <div class="col-12 col-sm-6 col-md-2">
          <q-select
            v-model="status"
            :options="statusOptions"
            dark
            filled
            dense
            emit-value
            map-options
            label="Status"
            @update:model-value="fetchRows"
          />
        </div>
        <div class="col-12 col-sm-6 col-md-2">
          <q-select
            v-model="purpose"
            :options="purposeOptions"
            dark
            filled
            dense
            emit-value
            map-options
            label="Purpose"
            @update:model-value="fetchRows"
          />
        </div>
        <div class="col-auto">
          <q-toggle
            v-model="latestOnly"
            color="indigo"
            label="Latest per recipient"
            @update:model-value="fetchRows"
          />
        </div>
        <q-space />
        <q-btn flat class="col-auto text-grey-5" icon="refresh" @click="fetchRows" />
      </q-card-section>
    </q-card>

    <q-table
      :rows="rows"
      :columns="columns"
      row-key="id"
      :loading="loading"
      flat
      bordered
      dark
      class="bg-grey-10 shadow-2 rounded-borders"
      :pagination="{ rowsPerPage: 20 }"
    >
      <template v-slot:no-data>
        <div class="full-width row flex-center text-grey-5 q-pa-md">
          <q-icon size="2em" name="inbox" class="q-mr-sm" />
          <span>{{ errorMessage || 'No verification sends match these filters.' }}</span>
        </div>
      </template>

      <template v-slot:body-cell-recipient="props">
        <q-td :props="props">
          <div class="text-weight-medium">{{ props.row.recipient }}</div>
          <div class="text-caption text-grey-5">{{ props.row.channel }} · {{ formatPurpose(props.row.purpose) }}</div>
        </q-td>
      </template>

      <template v-slot:body-cell-displayStatus="props">
        <q-td :props="props">
          <q-badge :color="statusColor(props.row.displayStatus)" :label="props.row.displayStatus" />
        </q-td>
      </template>
    </q-table>
  </q-page>
</template>

<script>
import { defineComponent, onMounted, ref } from 'vue'
import { adminApi } from '../../api'

export default defineComponent({
  name: 'VerificationLogPage',
  setup () {
    const loading = ref(false)
    const rows = ref([])
    const errorMessage = ref('')
    const search = ref('')
    const channel = ref('')
    const status = ref('')
    const purpose = ref('')
    const latestOnly = ref(true)

    const channelOptions = [
      { label: 'All channels', value: '' },
      { label: 'Email', value: 'EMAIL' },
      { label: 'WhatsApp', value: 'WHATSAPP' }
    ]
    const statusOptions = [
      { label: 'All statuses', value: '' },
      { label: 'Pending', value: 'PENDING' },
      { label: 'Verified', value: 'VERIFIED' },
      { label: 'Expired', value: 'EXPIRED' },
      { label: 'Cancelled', value: 'CANCELLED' }
    ]
    const purposeOptions = [
      { label: 'All purposes', value: '' },
      { label: 'Signup', value: 'SIGNUP' },
      { label: 'Password reset', value: 'PASSWORD_RESET' },
      { label: 'Login', value: 'LOGIN' },
      { label: 'Phone change', value: 'PHONE_CHANGE' },
      { label: 'Email change', value: 'EMAIL_CHANGE' }
    ]

    const columns = [
      { name: 'recipient', label: 'Recipient', field: 'recipient', align: 'left', sortable: true },
      { name: 'displayStatus', label: 'Status', field: 'displayStatus', align: 'left', sortable: true },
      {
        name: 'createdAt',
        label: 'Sent',
        field: 'createdAt',
        align: 'left',
        sortable: true,
        format: (val) => formatWhen(val)
      },
      {
        name: 'expiresAt',
        label: 'Expires',
        field: 'expiresAt',
        align: 'left',
        format: (val) => formatWhen(val)
      },
      {
        name: 'verifiedAt',
        label: 'Verified',
        field: 'verifiedAt',
        align: 'left',
        format: (val) => formatWhen(val)
      },
      { name: 'attemptCount', label: 'Tries', field: 'attemptCount', align: 'right' }
    ]

    function formatWhen (val) {
      if (!val) return '—'
      const d = new Date(val)
      if (Number.isNaN(d.getTime())) return '—'
      return d.toLocaleString()
    }

    function formatPurpose (value) {
      return String(value || '').replace(/_/g, ' ').toLowerCase()
    }

    function statusColor (value) {
      if (value === 'VERIFIED') return 'positive'
      if (value === 'PENDING') return 'amber'
      if (value === 'EXPIRED') return 'grey-7'
      return 'negative'
    }

    async function fetchRows () {
      loading.value = true
      errorMessage.value = ''
      try {
        const { data } = await adminApi.getVerificationLog({
          q: search.value || undefined,
          channel: channel.value || undefined,
          status: status.value || undefined,
          purpose: purpose.value || undefined,
          latest: latestOnly.value ? '1' : '0',
          limit: 100
        })
        rows.value = data?.rows || []
      } catch (err) {
        rows.value = []
        errorMessage.value = err?.response?.data?.error || 'Could not load verification log'
      } finally {
        loading.value = false
      }
    }

    onMounted(fetchRows)

    return {
      loading,
      rows,
      errorMessage,
      search,
      channel,
      status,
      purpose,
      latestOnly,
      channelOptions,
      statusOptions,
      purposeOptions,
      columns,
      fetchRows,
      formatPurpose,
      statusColor
    }
  }
})
</script>

<style scoped>
.border-indigo {
  border: 1px solid rgba(99, 102, 241, 0.2);
}
</style>
