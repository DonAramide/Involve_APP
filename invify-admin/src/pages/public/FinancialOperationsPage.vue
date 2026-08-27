<template>
  <q-page class="financial-operations-page bg-white text-dark">
    <section class="public-hero--compact public-section--muted text-center">
      <div class="public-container public-container--narrow">
        <div class="public-eyebrow">From invoice to reporting</div>
        <h1 class="public-page-title">{{ t('financialOperations.title') }}</h1>
        <p class="public-lead text-grey-7">{{ t('financialOperations.subtitle') }}</p>
      </div>
    </section>

    <div class="financial-lifecycle q-py-xl q-px-md">
      <q-timeline :dark="false" layout="dense" color="primary" class="text-dark">
        <q-timeline-entry
          v-for="step in lifecycleSteps"
          :key="step.title"
          :icon="step.icon"
          :color="step.color"
          class="lifecycle-entry"
        >
          <q-card :dark="false" flat bordered class="lifecycle-card bg-white text-dark">
            <q-card-section>
              <div class="lifecycle-card__title text-h6 text-weight-bold q-mb-xs">
                {{ step.title }}
              </div>
              <div class="text-body1 text-grey-8">
                {{ step.description }}
              </div>
            </q-card-section>
          </q-card>
        </q-timeline-entry>
      </q-timeline>
    </div>

    <section class="public-cta">
      <div class="public-cta__content">
        <h2>Make financial activity easier to follow</h2>
        <p>Bring billing, payment records, reconciliation, and reporting into one connected operating flow.</p>
        <div class="public-cta-actions">
          <q-btn unelevated color="white" text-color="primary" no-caps to="/register" label="Get Started" />
          <q-btn outline color="white" no-caps to="/contact" label="Discuss Your Workflow" />
        </div>
      </div>
    </section>
  </q-page>
</template>

<script setup>
import { computed } from 'vue'
import { usePublicLocale } from '../../composables/usePublicLocale'

const { t } = usePublicLocale()

const lifecycleSteps = computed(() => [
  {
    title: t('financialOperations.invoiceTitle'),
    icon: 'receipt',
    color: 'primary',
    description: t('financialOperations.invoiceBody')
  },
  {
    title: t('financialOperations.paymentTitle'),
    icon: 'payment',
    color: 'secondary',
    description: t('financialOperations.paymentBody')
  },
  {
    title: t('financialOperations.transactionTitle'),
    icon: 'swap_horiz',
    color: 'accent',
    description: t('financialOperations.transactionBody')
  },
  {
    title: t('financialOperations.walletTitle'),
    icon: 'account_balance_wallet',
    color: 'info',
    description: t('financialOperations.walletBody')
  },
  {
    title: t('financialOperations.reconciliationTitle'),
    icon: 'rule',
    color: 'warning',
    description: t('financialOperations.reconciliationBody')
  },
  {
    title: t('financialOperations.reportingTitle'),
    icon: 'analytics',
    color: 'positive',
    description: t('financialOperations.reportingBody')
  }
])
</script>

<style scoped>
.financial-operations-page {
  min-height: auto;
}

.financial-lifecycle {
  max-width: 900px;
  margin: 0 auto;
}

.financial-lifecycle :deep(.q-timeline__title) {
  color: #18212b !important;
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 8px;
}

.financial-lifecycle :deep(.q-timeline__content) {
  color: #263238 !important;
}

:global(.body--dark) .financial-lifecycle :deep(.q-timeline__title) {
  color: #f4f7fa !important;
}

:global(.body--dark) .financial-lifecycle :deep(.q-timeline__content) {
  color: #d1d8df !important;
}

.lifecycle-entry {
  padding-bottom: 8px;
}

.lifecycle-card {
  border-color: #dfe4ea;
  border-radius: 10px;
}

.lifecycle-card .q-card__section {
  line-height: 1.65;
}

@media (max-width: 599px) {
  .financial-lifecycle {
    padding-top: 28px;
    padding-bottom: 32px;
  }
}
</style>
