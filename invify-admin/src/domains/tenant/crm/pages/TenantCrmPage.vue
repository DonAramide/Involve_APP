<template>
  <q-page class="q-pa-lg text-white" style="background: #05070d; min-height: 100vh;">
    <!-- Top Header -->
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="row items-center op-gap-8 no-wrap">
          <q-icon name="contacts" color="green-4" size="md" />
          <h1 class="text-h4 text-weight-bolder text-white q-my-none letter-spacing-1">{{ entityPluralLabel }} Directory</h1>
        </div>
        <div class="text-caption text-grey-5 q-mt-xs">
          Manage your unified {{ entityPluralLabel.toLowerCase() }}, profiles, and associated records.
        </div>
      </div>
      <div>
        <q-btn 
          unelevated 
          color="green-9" 
          text-color="black" 
          icon="person_add" 
          :label="`Onboard ${entitySingularLabel}`"
          @click="showAddDialog = true" 
          class="text-weight-bold text-caption text-black"
        />
      </div>
    </div>

    <!-- Metrics Bar -->
    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-12 col-md-3">
        <q-card class="bg-card-dark border-grey-9 q-pa-md">
          <div class="text-caption text-grey-5 text-uppercase">Total {{ entityPluralLabel }}</div>
          <div class="text-h4 text-weight-bold text-white q-mt-xs font-mono">{{ crmStore.customers.length }}</div>
        </q-card>
      </div>
    </div>

    <!-- Data Grid -->
    <q-card class="bg-card-dark border-grey-9 q-pa-lg">
      <q-table
        :rows="crmStore.customers"
        :columns="columns"
        row-key="id"
        dark
        flat
        bordered
        class="bg-card-dark"
        :loading="crmStore.loading"
      >
        <template v-slot:body-cell-status="props">
          <q-td :props="props">
            <q-chip 
              :color="props.value === 'ACTIVE' ? 'green-10' : 'grey-9'"
              :text-color="props.value === 'ACTIVE' ? 'green-3' : 'grey-4'"
              size="sm"
              class="font-mono text-weight-bold"
            >
              {{ props.value }}
            </q-chip>
          </q-td>
        </template>
        <template v-slot:body-cell-actions="props">
          <q-td :props="props">
            <q-btn flat round color="cyan-4" icon="visibility" size="sm" @click="viewProfile(props.row)">
              <q-tooltip class="bg-black text-cyan-4 border-cyan font-mono">VIEW PROFILE</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCrmStore } from '../../../../stores/crm.store'

const route = useRoute()
const router = useRouter()
const crmStore = useCrmStore()

const showAddDialog = ref(false)

// Projection Labels based on industry/query
const entityType = computed(() => route.query.type || 'CUSTOMER')

const entityPluralLabel = computed(() => {
  const type = entityType.value.toUpperCase()
  if (type === 'STUDENT') return 'Students'
  if (type === 'GUARDIAN') return 'Guardians'
  if (type === 'PATIENT') return 'Patients'
  if (type === 'GUEST') return 'Guests'
  return 'Customers'
})

const entitySingularLabel = computed(() => {
  const type = entityType.value.toUpperCase()
  if (type === 'STUDENT') return 'Student'
  if (type === 'GUARDIAN') return 'Guardian'
  if (type === 'PATIENT') return 'Patient'
  if (type === 'GUEST') return 'Guest'
  return 'Customer'
})

const columns = [
  { name: 'name', label: 'NAME', align: 'left', field: row => `${row.first_name} ${row.last_name}`, sortable: true },
  { name: 'email', label: 'EMAIL', align: 'left', field: 'email', sortable: true },
  { name: 'phone', label: 'PHONE', align: 'left', field: 'phone', sortable: true },
  { name: 'status', label: 'STATUS', align: 'left', field: 'status', sortable: true },
  { name: 'actions', label: 'ACTIONS', align: 'right' }
]

const loadData = () => {
  const tenantId = localStorage.getItem('tenant_id') || 'demo-tenant'
  crmStore.loadCustomers(tenantId, entityType.value)
}

onMounted(() => {
  loadData()
})

watch(() => route.query.type, () => {
  loadData()
})

const viewProfile = (customer) => {
  router.push(`/tenant/users/${customer.id}`)
}
</script>

<style scoped>
.bg-card-dark {
  background: rgba(255, 255, 255, 0.02);
}
.border-grey-9 {
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.text-operator-title {
  text-transform: uppercase;
}
</style>
