<!-- invify-admin/src/pages/UsersPage.vue -->
<template>
  <q-page class="q-pa-lg bg-dark text-white">
    <!-- Header -->
    <div class="row items-center q-mb-lg">
      <div class="col">
        <h1 class="text-h4 text-weight-bolder q-ma-none text-white letter-spacing-1">Staff Management</h1>
        <div class="text-grey-6">Manage teachers, assign roles, and invite new colleagues.</div>
      </div>
      <div class="col-auto">
        <q-btn color="indigo-7" icon="person_add" label="Invite Teacher" @click="showInvite = true" class="q-px-md glossy" />
      </div>
      <div class="col-auto">
        <q-btn 
          color="indigo-7" 
          icon="person_add" 
          label="Add User" 
          class="q-px-md glossy" 
          @click="openModal()" 
        />
      </div>
    </div>

    <!-- Filters header -->
    <q-card class="bg-blue-grey-10 q-mb-lg shadow-2 border-indigo">
      <q-card-section class="row q-col-gutter-sm items-center">
         <div class="col-12 col-md-4">
            <q-input v-model="searchText" label="Search Name or Email" dark filled dense>
               <template v-slot:append><q-icon name="search" /></template>
            </q-input>
         </div>
         <div v-if="isSuperAdmin" class="col-12 col-md-3">
             <q-select
               v-model="selectedTenant"
               :options="tenantOptions"
               label="Filter by Tenant"
               dark filled dense emit-value map-options
               @update:model-value="fetchUsers"
             />
         </div>
         <div class="col-12 col-md-2">
            <q-select
               v-model="selectedRole"
               :options="roleOptions"
               label="Filter by Role"
               dark filled dense emit-value map-options
               @update:model-value="fetchUsers"
            />
         </div>
         <q-space />
         <q-btn flat class="col-auto text-grey-6" icon="refresh" @click="fetchUsers" />
      </q-card-section>
    </q-card>

    <!-- Users Table -->
    <q-table
      :rows="filteredUsers"
      :columns="columns"
      row-key="id"
      :loading="loading"
      flat bordered dark
      class="bg-blue-grey-10 shadow-2 rounded-borders"
      :pagination="{ rowsPerPage: 15 }"
    >
      <template v-slot:no-data>
        <div class="full-width row flex-center text-white q-pa-md bg-red-10 border-red rounded-borders" v-if="errorMessage">
          <q-icon size="2em" name="cloud_off" class="q-mr-sm" />
          <span class="text-weight-bold letter-spacing-1">{{ errorMessage }}</span>
        </div>
        <div class="full-width row flex-center text-grey-5 q-pa-md" v-else>
          <q-icon size="2em" name="warning" class="q-mr-sm" />
          <span>No staff access profiles available matching the current criteria.</span>
        </div>
      </template>

      <template v-slot:body-cell-name="props">
        <q-td :props="props">
          <div class="row items-center">
            <q-avatar size="sm" :color="props.row.is_active ? 'indigo-6' : 'grey-8'" class="q-mr-sm">
              {{ props.row.name.charAt(0).toUpperCase() }}
            </q-avatar>
            <div class="column">
               <span class="text-weight-bold">{{ props.row.name }}</span>
               <span class="text-caption text-grey-6">{{ props.row.email }}</span>
            </div>
          </div>
        </q-td>
      </template>

      <template v-slot:body-cell-role="props">
        <q-td :props="props" class="text-center">
          <q-chip 
            :color="roleColors[props.value] || 'grey-8'" 
            text-color="white" 
            size="sm" dense
          >
            {{ props.value.replace('_', ' ').toUpperCase() }}
          </q-chip>
        </q-td>
      </template>

      <template v-slot:body-cell-is_active="props">
        <q-td :props="props" class="text-center">
          <q-chip 
            :color="props.value ? 'green-10' : 'red-10'" 
            text-color="white" 
            size="sm" outline
          >
            {{ props.value ? 'ACTIVE' : 'DISABLED' }}
          </q-chip>
        </q-td>
      </template>

      <template v-slot:body-cell-actions="props">
        <q-td :props="props" class="text-right">
          <q-btn flat round dense color="amber-4" icon="lock_reset" @click="forceResetPassword(props.row)">
            <q-tooltip class="bg-indigo-10 text-white">Direct Admin Passphrase Reset (No OTP)</q-tooltip>
          </q-btn>
          <q-btn flat round dense color="indigo-3" icon="edit" @click="openModal(props.row)" />
          <q-btn 
            flat round dense 
            :color="props.row.is_active ? 'red-4' : 'green-4'" 
            :icon="props.row.is_active ? 'block' : 'check_circle'" 
            @click="toggleStatus(props.row)"
          />
        </q-td>
      </template>
    </q-table>

    <!-- User Management Modal -->
    <q-dialog v-model="modalVisible" persistent>
      <q-card style="width: 450px" class="bg-blue-grey-10 text-white border-indigo">
        <q-card-section>
          <div class="text-h6 text-weight-bold">{{ isEditing ? 'Edit User Identity' : 'Register New User' }}</div>
          <div class="text-caption text-grey-6">Ensure the user ID matches the Supabase Auth ID.</div>
        </q-card-section>

        <q-card-section class="q-gutter-md">
          <q-input v-model="form.id" label="Auth ID (UUID)" dark filled dense :readonly="isEditing">
            <template v-slot:append v-if="!isEditing">
              <q-btn flat round dense icon="autorenew" color="amber-5" @click="form.id = generateUUID()">
                <q-tooltip class="bg-indigo-10 text-white">Auto-generate random development UUID</q-tooltip>
              </q-btn>
            </template>
          </q-input>
          <q-input v-model="form.name" label="Full Name" dark filled dense />
          <q-input v-model="form.email" label="Email Address" dark filled dense :readonly="isEditing" />
          
          <div class="row q-col-gutter-sm">
             <div class="col-6">
                <q-select
                  v-model="form.role"
                  :options="roleOptions.filter(o => o.value !== 'all')"
                  label="Assign Role"
                  dark filled dense emit-value map-options
                />
             </div>
             <div class="col-6">
                <q-select
                  v-model="form.tenantId"
                  :options="tenantOptions"
                  label="Assign Tenant"
                  dark filled dense emit-value map-options
                  :disable="form.role === 'super_admin'"
                />
             </div>
          </div>
        </q-card-section>

        <q-card-actions align="right" class="q-pb-md q-px-md">
          <q-btn flat label="Cancel" v-close-popup color="grey-6" />
          <q-btn :label="isEditing ? 'Save Changes' : 'Create Access'" color="indigo-7" class="q-px-md glossy" @click="saveUser" :loading="saving" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Invite Teacher Modal -->
    <q-dialog v-model="showInvite" persistent>
      <q-card style="width: 450px" class="bg-blue-grey-10 text-white border-indigo">
        <q-card-section>
          <div class="text-h6 text-weight-bold">Invite Teacher</div>
          <div class="text-caption text-grey-6">Generate a secure ACCEPT invitation link for new staff.</div>
        </q-card-section>

        <q-card-section class="q-gutter-md">
          <q-input v-model="inviteEmail" label="Email Address" dark filled dense />
          <q-input v-if="lastInviteLink" v-model="lastInviteLink" label="Generated Invitation Link" dark filled dense readonly class="font-mono text-cyan-4" />
        </q-card-section>

        <q-card-actions align="right" class="q-pb-md q-px-md">
          <q-btn flat label="Close" v-close-popup color="grey-6" @click="inviteEmail = ''; lastInviteLink = ''" />
          <q-btn label="Send Invite" color="indigo-7" class="q-px-md glossy" @click="inviteMember" :loading="sending" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useQuasar } from 'quasar'
import { adminApi } from '../api'
import axios from 'axios'

const $q = useQuasar()

// Auth Context Mock (To be replaced by real auth store)
const isSuperAdmin = ref(true) 

const loading = ref(false)
const saving = ref(false)
const users = ref([])
const tenants = ref([])
const modalVisible = ref(false)
const isEditing = ref(false)
const searchText = ref('')
const selectedTenant = ref(null)
const selectedRole = ref('all')
const errorMessage = ref('')

const showInvite = ref(false)
const inviteEmail = ref('')
const sending = ref(false)
const lastInviteLink = ref('')

const form = ref({ id: '', name: '', email: '', role: 'staff', tenantId: null })

const generateUUID = () => {
  try {
    return crypto.randomUUID()
  } catch (e) {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

const columns = [
  { name: 'name', label: 'USER IDENTITY', field: 'name', align: 'left', sortable: true },
  { name: 'role', label: 'ACCESS LEVEL', field: 'role', align: 'center', sortable: true },
  { name: 'tenant', label: 'TENANT', field: row => row.tenants?.name || 'Platform', align: 'left' },
  { name: 'is_active', label: 'STATUS', field: 'is_active', align: 'center' },
  { name: 'actions', label: 'CONTROLS', field: 'id', align: 'right' }
]

const roleOptions = [
  { label: 'All Roles', value: 'all' },
  { label: 'Super Admin', value: 'super_admin' },
  { label: 'Tenant Admin', value: 'tenant_admin' },
  { label: 'Staff', value: 'staff' }
]

const roleColors = {
  'super_admin': 'deep-orange-10',
  'tenant_admin': 'indigo-10',
  'staff': 'blue-grey-8'
}

const filteredUsers = computed(() => {
  return users.value.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchText.value.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchText.value.toLowerCase());
    const matchesRole = selectedRole.value === 'all' || u.role === selectedRole.value;
    return matchesSearch && matchesRole;
  });
})

const tenantOptions = computed(() => [
  { label: 'Platform (No Tenant)', value: null },
  ...tenants.value.map(t => ({ label: t.name, value: t.id }))
])

const fetchUsers = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const { data } = await adminApi.getUsers({ tenantId: selectedTenant.value })
    users.value = data
  } catch (error) {
    if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
      errorMessage.value = 'SYSTEM_HALT: Backend telemetry server is offline or unreachable. Please verify port configuration.'
    } else {
      errorMessage.value = error.response?.data?.error || error.message || 'Unknown error occurred while fetching users.'
    }
  } finally {
    loading.value = false
  }
}

const inviteMember = async () => {
  sending.value = true
  try {
    const { data } = await adminApi.sendInvite({ email: inviteEmail.value })
    if (data.inviteLink) {
      lastInviteLink.value = data.inviteLink
    }
    // We don't automatically close the modal if they need the link in dev mode
    if (!data.inviteLink) {
       showInvite.value = false
       inviteEmail.value = ''
    }
    fetchUsers()
  } finally {
    sending.value = false
  }
}

const openModal = (user = null) => {
  if (user) {
    isEditing.value = true
    form.value = { ...user }
  } else {
    isEditing.value = false
    form.value = { id: '', name: '', email: '', role: 'staff', tenantId: null }
  }
  modalVisible.value = true
}

const saveUser = async () => {
  saving.value = true
  try {
    if (isEditing.value) {
      await adminApi.updateUser(form.value.id, { 
        name: form.value.name, 
        role: form.value.role, 
        tenant_id: form.value.role === 'super_admin' ? null : form.value.tenantId 
      })
    } else {
      await adminApi.createUser(form.value)
    }
    modalVisible.value = false
    fetchUsers()
  } finally {
    saving.value = false
  }
}

const toggleStatus = async (user) => {
  try {
    await adminApi.updateUser(user.id, { is_active: !user.is_active })
    fetchUsers()
  } catch (error) {}
}

const forceResetPassword = (user) => {
  $q.dialog({
    title: 'Direct Passphrase Reset',
    message: `Enter the new secure passphrase for ${user.name} (${user.email}). No OTP verification code required.`,
    prompt: {
      model: '',
      type: 'password',
      placeholder: '••••••••••••'
    },
    cancel: true,
    dark: true,
    persistent: true
  }).onOk(async (newPassword) => {
    if (!newPassword || newPassword.length < 6) {
      $q.notify({ type: 'negative', message: 'Passphrase must be at least 6 characters.' })
      return
    }
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3004'
      await axios.post(`${API_BASE}/api/auth/reset-password`, {
        userId: user.id,
        newPassword: newPassword
      })
      $q.notify({ type: 'positive', message: `Password for ${user.name} has been successfully force-reset.` })
    } catch (err) {
      $q.notify({ type: 'negative', message: 'Failed to reset passphrase directly.' })
    }
  })
}

onMounted(async () => {
  fetchUsers()
  const tRes = await adminApi.getTenants()
  tenants.value = tRes.data
})
</script>

<style scoped>
.border-indigo { border-left: 5px solid #3f51b5; }
.bg-blue-grey-10 { background: #1c262b; }
.italic { font-style: italic; }
.border-red { border: 1px solid #ff5252; }
.letter-spacing-1 { letter-spacing: 1px; }
</style>
