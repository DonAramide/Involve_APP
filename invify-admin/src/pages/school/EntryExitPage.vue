<template>
  <q-page class="q-pa-md">
    <div class="text-h5 text-weight-bold text-indigo-9">Entry and Exit</div>
    <div class="text-caption text-grey-7 q-mb-md">Gate sessions for this school. Classroom attendance is a separate report.</div>

    <q-banner v-if="schemaUnapplied" class="bg-amber-2 q-mb-md" rounded>
      Gate history is not available from the server yet. Scans are not saved until school-gate persistence is enabled.
    </q-banner>
    <q-banner v-if="errorMessage" class="bg-red-1 q-mb-md" rounded>{{ errorMessage }}</q-banner>

    <div class="row q-gutter-sm q-mb-md">
      <q-btn-toggle v-model="state" toggle-color="primary" :options="stateOptions" @update:model-value="load" />
      <q-btn outline color="primary" label="Refresh" :loading="loading" @click="load" />
    </div>

    <q-table
      flat
      bordered
      row-key="id"
      :rows="sessions"
      :columns="columns"
      :loading="loading"
      v-model:pagination="pagination"
      @request="onRequest"
    >
      <template #body-cell-notifications="props">
        <q-td :props="props">
          <span v-if="!props.row.notifications.length">No notification row</span>
          <span v-for="note in props.row.notifications" :key="note.direction + note.status">
            {{ note.direction }}: {{ note.status }}<span v-if="note.skipReason"> ({{ note.skipReason }})</span>
          </span>
        </q-td>
      </template>
    </q-table>
  </q-page>
</template>

<script>
import { schoolGateApi } from '../../api/schoolGate'

export default {
  name: 'EntryExitPage',
  data () {
    return {
      loading: false,
      schemaUnapplied: false,
      errorMessage: '',
      state: 'all',
      sessions: [],
      stateOptions: [
        { label: 'All', value: 'all' },
        { label: 'Open', value: 'open' }
      ],
      pagination: { page: 1, rowsPerPage: 25, rowsNumber: 0 },
      columns: [
        { name: 'printedName', label: 'Person', field: 'printedName', align: 'left' },
        { name: 'printedCode', label: 'Code', field: 'printedCode', align: 'left' },
        { name: 'subjectType', label: 'Type', field: 'subjectType', align: 'left' },
        { name: 'state', label: 'Direction state', field: 'state', align: 'left' },
        { name: 'openedAt', label: 'Arrived', field: 'openedAt', align: 'left' },
        { name: 'closedAt', label: 'Departed', field: 'closedAt', align: 'left' },
        { name: 'notifications', label: 'Notification', field: 'notifications', align: 'left' }
      ]
    }
  },
  mounted () {
    this.load()
  },
  methods: {
    async load () {
      await this.onRequest({ pagination: this.pagination })
    },
    async onRequest ({ pagination }) {
      this.loading = true
      this.errorMessage = ''
      this.schemaUnapplied = false
      const offset = (pagination.page - 1) * pagination.rowsPerPage
      try {
        const response = await schoolGateApi.sessions({
          limit: pagination.rowsPerPage,
          offset,
          state: this.state
        })
        const body = response.data || {}
        this.sessions = body.sessions || []
        this.pagination = {
          ...pagination,
          rowsNumber: body.total || 0
        }
      } catch (error) {
        const code = error?.response?.data?.code
        this.sessions = []
        if (code === 'SCHOOL_GATE_SCHEMA_UNAPPLIED') this.schemaUnapplied = true
        else if (code === 'FORBIDDEN') this.errorMessage = 'Entry and exit history is limited to the school owner and a tenant administrator.'
        else this.errorMessage = 'Entry and exit history could not be loaded.'
      } finally {
        this.loading = false
      }
    }
  }
}
</script>
