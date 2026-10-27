<!-- invify-admin/src/components/modals/TenantModal.vue -->
<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" persistent>
    <q-card class="q-dialog-plugin bg-blue-grey-10 text-white" style="min-width: 400px">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">{{ isEdit ? 'Edit Tenant' : 'Register New Tenant' }}</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-form @submit="onSubmit">
        <q-card-section class="q-gutter-md">
          <q-input 
            v-model="form.name" 
            label="Organization Name" 
            dark filled 
            placeholder="e.g. Heritage High School"
            :rules="[val => !!val || 'Name is required']"
          />

          <q-select
            v-model="form.type"
            :options="typeOptions"
            label="Business Type"
            dark filled
            emit-value
            map-options
            :rules="[val => !!val || 'Type is required']"
          />

          <q-select
            v-model="form.plan"
            :options="planOptions"
            label="Subscription Plan"
            dark filled
            emit-value
            map-options
          />

          <q-input
            v-model="form.plan_expires_at"
            label="Plan expiry (leave empty for Permanent)"
            dark filled
            type="date"
            hint="New self-serve signups should be trial with a 3-day expiry."
          />

          <q-toggle
            v-if="isEdit"
            v-model="form.status"
            label="Account Active"
            true-value="active"
            false-value="suspended"
            color="green"
            dark
          />

          <q-expansion-item
            icon="support_agent"
            label="Dedicated Support Agent Contacts"
            caption="Optional. Overrides global settings for this tenant's devices."
            dark
            header-class="bg-blue-grey-9 text-white rounded-borders"
            class="q-mt-md"
          >
            <q-card class="bg-blue-grey-10">
              <q-card-section class="q-gutter-sm">
                <q-select
                  v-model="selectedAgent"
                  :options="agentOptions"
                  label="Select Support Agent"
                  dark filled dense
                  class="q-mb-sm"
                  @update:model-value="onAgentSelected"
                >
                  <template v-slot:no-option>
                    <q-item>
                      <q-item-section class="text-grey">No agents available</q-item-section>
                    </q-item>
                  </template>
                </q-select>

                <q-input 
                  v-model="form.support_phone" 
                  label="Agent Phone" 
                  type="tel"
                  dark filled dense
                  placeholder="+234..."
                  maxlength="13"
                  counter
                />
                <q-input 
                  v-model="form.support_email" 
                  label="Agent Email" 
                  dark filled dense
                  placeholder="agent@domain.com"
                />
                <q-input 
                  v-model="form.support_whatsapp" 
                  label="Agent WhatsApp" 
                  dark filled dense
                  placeholder="+234..."
                />
              </q-card-section>
            </q-card>
          </q-expansion-item>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancel" color="grey-6" v-close-popup />
          <q-btn 
            unelevated 
            :label="isEdit ? 'Save Changes' : 'Create Organization'" 
            color="indigo-7" 
            type="submit" 
            :loading="loading"
          />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useDialogPluginComponent } from 'quasar'
import { adminApi } from '../../api'

const props = defineProps({
  tenant: { type: Object, default: null },
  isEdit: { type: Boolean, default: false }
})

defineEmits([...useDialogPluginComponent.emits])

const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent()

const loading = ref(false)
const agentOptions = ref([])
const selectedAgent = ref(null)

const typeOptions = [
  { label: 'School', value: 'school' },
  { label: 'Retail', value: 'retail' },
  { label: 'Services', value: 'services' },
]

const planOptions = [
  { label: 'Trial (3-day)', value: 'trial' },
  { label: 'Free trial', value: 'free_trial' },
  { label: 'Free', value: 'free' },
  { label: 'Basic', value: 'basic' },
  { label: 'Standard', value: 'standard' },
  { label: 'Premium', value: 'premium' },
  { label: 'Enterprise', value: 'enterprise' },
]

function normalizeType(value) {
  const raw = String(value || '').trim().toLowerCase()
  if (raw === 'service' || raw === 'invify_services' || raw === 'hospitality') return 'services'
  if (raw === 'education' || raw === 'invify_school') return 'school'
  if (raw === 'invify_retail') return 'retail'
  return raw || 'school'
}

const form = ref({
  name: '',
  type: 'school',
  plan: 'trial',
  plan_expires_at: defaultTrialExpiry(),
  status: 'active',
  support_phone: '',
  support_email: '',
  support_whatsapp: ''
})

function defaultTrialExpiry() {
  const d = new Date()
  d.setDate(d.getDate() + 3)
  return d.toISOString().slice(0, 10)
}

function toDateInput(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

onMounted(async () => {
  if (props.isEdit && props.tenant) {
    form.value = {
      name: props.tenant.name || '',
      type: normalizeType(props.tenant.type),
      plan: props.tenant.plan || 'trial',
      plan_expires_at: toDateInput(props.tenant.plan_expires_at),
      status: props.tenant.status || 'active',
      support_phone: props.tenant.support_phone || '',
      support_email: props.tenant.support_email || '',
      support_whatsapp: props.tenant.support_whatsapp || ''
    }
  }

  try {
    const { data } = await adminApi.getUsers();
    agentOptions.value = (data.data || data || []).map(u => ({
      label: `${u.full_name || u.email} (${u.role})`,
      value: u.id,
      user: u
    }));
  } catch (err) {
    console.warn('Failed to fetch agents for dropdown', err);
  }
})

const onAgentSelected = (opt) => {
  if (opt && opt.user) {
    form.value.support_phone = opt.user.phone || ''
    form.value.support_email = opt.user.email || ''
    form.value.support_whatsapp = opt.user.phone || ''
  }
}

const onSubmit = () => {
  loading.value = true
  const payload = {
    name: form.value.name,
    type: normalizeType(form.value.type),
    plan: form.value.plan,
    status: form.value.status,
    support_phone: form.value.support_phone,
    support_email: form.value.support_email,
    support_whatsapp: form.value.support_whatsapp,
    plan_expires_at: form.value.plan_expires_at
      ? new Date(`${form.value.plan_expires_at}T23:59:59.000Z`).toISOString()
      : null,
  }
  onDialogOK(payload)
}
</script>
