<template>
  <q-page class="bg-white text-dark">
    <section class="security-hero public-hero--compact text-center">
      <div class="public-container public-container--narrow">
        <div class="public-eyebrow text-blue-2">Security by design</div>
        <h1 class="public-page-title text-white">Controls for sensitive business operations</h1>
        <p class="public-lead security-hero__lead">Invify combines identity checks, scoped access, tenant-aware data handling, and operational auditability.</p>
      </div>
    </section>

    <section class="public-section">
      <div class="public-container security-grid">
        <q-card v-for="control in controls" :key="control.title" flat class="public-card">
          <q-card-section>
            <span class="public-card-icon"><q-icon :name="control.icon" size="27px" /></span>
            <h2 class="text-h6 text-weight-bold q-my-none">{{ control.title }}</h2>
            <p class="text-body2 text-grey-8 q-mt-sm q-mb-none">{{ control.body }}</p>
          </q-card-section>
        </q-card>
      </div>
    </section>

    <section class="public-section public-section--muted">
      <div class="public-container public-container--narrow text-center">
        <div class="public-eyebrow">Responsible access</div>
        <h2 class="text-h4 text-weight-bold q-mt-none q-mb-md">The right portal for the right user</h2>
        <p class="text-body1 text-grey-7 q-mb-lg">Business users and platform administrators use distinct sign-in routes. Operational areas remain behind authentication and authorization checks.</p>
        <div class="public-hero-actions">
          <q-btn outline color="primary" no-caps to="/tenant/login" label="Business Sign In" />
          <q-btn outline color="primary" no-caps to="/admin/login" label="Super Admin Sign In" />
        </div>
      </div>
    </section>
  </q-page>
</template>

<script setup>
const controls = [
  { icon: 'verified_user', title: 'Multi-factor authentication', body: 'Additional identity verification protects sensitive administrative access.' },
  { icon: 'manage_accounts', title: 'Role-based permissions', body: 'Access is assigned according to defined business and operational responsibilities.' },
  { icon: 'domain', title: 'Tenant-aware isolation', body: 'Tenant context is carried through protected workflows to keep business access scoped.' },
  { icon: 'history', title: 'Audit visibility', body: 'Important administrative and financial operations can be reviewed through audit records.' },
  { icon: 'devices', title: 'Device controls', body: 'Device identity and activation checks support controlled access to operational services.' },
  { icon: 'policy', title: 'Protected routes', body: 'Fleet, finance, governance, tenant, and admin workspaces require authenticated access.' }
]
</script>

<style scoped>
.security-hero {
  background: linear-gradient(135deg, #10233f, #0d47a1);
}

.security-hero__lead {
  color: rgba(255, 255, 255, 0.86);
}

.security-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.public-card p {
  line-height: 1.65;
}

@media (max-width: 899px) {
  .security-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 599px) {
  .security-grid {
    grid-template-columns: 1fr;
  }
}
</style>
