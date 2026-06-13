<template>
  <q-page class="q-pa-lg text-white" style="background: #05070d; min-height: 100vh;">
    <div class="row items-center justify-between q-mb-xl">
      <div>
        <div class="row items-center op-gap-8 no-wrap">
          <q-icon name="admin_panel_settings" color="cyan-3" size="md" />
          <h1 class="text-h4 text-weight-bolder text-white q-my-none letter-spacing-1">Roles & Permissions</h1>
        </div>
        <div class="text-caption text-grey-5 q-mt-xs">
          Configure RBAC policies and governance capability matrices.
        </div>
      </div>
    </div>
    <!-- Content placeholder -->
    <div class="text-grey-5">RBAC matrix and role configurator logic to be implemented.</div>
  </q-page>
</template>

<script setup>
import { useTenantUsersStore } from '../stores/tenantUsersStore';
const store = useTenantUsersStore();
</script>

<style scoped>
.letter-spacing-1 { letter-spacing: 1px; }
</style>
