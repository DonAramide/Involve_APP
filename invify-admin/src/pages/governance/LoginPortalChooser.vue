<!-- Portal picker: /login → Admin Ops vs Tenant Console -->
<template>
  <q-layout class="bg-main text-main row items-center justify-center fit relative-position" style="min-height: 100vh;">
    <div class="absolute-top-right q-pa-md z-max">
      <q-btn
        flat
        round
        dense
        :icon="prefs.isDarkMode ? 'light_mode' : 'dark_mode'"
        class="text-muted"
        @click="toggleTheme"
      />
    </div>

    <q-page-container class="fit row items-center justify-center q-pa-md">
      <div class="auth-card bg-panel enterprise-panel q-pa-xl column op-gap-24 shadow-2" style="width: 100%; max-width: 460px;">
        <div class="column items-center text-center">
          <div class="row items-center justify-center op-gap-8 no-wrap q-mb-sm">
            <img :src="logoImg" alt="Invify Logo" style="height: 40px; width: auto;" />
            <span class="text-h5 text-main text-weight-bold tracking-wide">INVIFY</span>
          </div>
          <div class="text-caption text-muted">Choose your sign-in portal</div>
        </div>

        <div class="column op-gap-12">
          <q-btn
            unelevated
            color="blue-5"
            class="full-width text-weight-bold q-py-md"
            label="Admin / Ops Login"
            icon="admin_panel_settings"
            to="/admin/login"
          />
          <q-btn
            outline
            color="blue-5"
            class="full-width text-weight-bold q-py-md"
            label="Tenant Login"
            icon="storefront"
            to="/tenant/login"
          />
        </div>

        <div class="border-top q-pt-md text-center text-metric-sm text-muted">
          Operators use Admin. School / business owners use Tenant.
        </div>
      </div>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import logoImg from '../../assets/logo_transparent.png'
import { useOperatorPreferences } from '../../composables/useOperatorPreferences'

const { prefs, toggleTheme } = useOperatorPreferences()
</script>

<style scoped>
.auth-card {
  border-radius: 12px;
}
</style>
