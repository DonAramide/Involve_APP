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
            :options="['school', 'retail', 'service']"
            label="Business Type"
            dark filled
            emit-value
            map-options
            :rules="[val => !!val || 'Type is required']"
          />

          <q-select
            v-model="form.plan"
            :options="['free', 'basic', 'premium', 'enterprise']"
            label="Subscription Plan"
            dark filled
            emit-value
            map-options
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
                <q-input 
                  v-model="form.support_phone" 
                  label="Agent Phone" 
                  dark filled dense
                  placeholder="+234..."
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

const props = defineProps({
  tenant: { type: Object, default: null },
  isEdit: { type: Boolean, default: false }
})

defineEmits([...useDialogPluginComponent.emits])

const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent()

const loading = ref(false)
const form = ref({
  name: '',
  type: 'school',
  plan: 'free',
  status: 'active',
  support_phone: '',
  support_email: '',
  support_whatsapp: ''
})

onMounted(() => {
  if (props.isEdit && props.tenant) {
    form.value = { ...props.tenant }
  }
})

const onSubmit = () => {
  loading.value = true
  // Emit the form data back to the parent to handle the API call
  onDialogOK(form.value)
}
</script>
