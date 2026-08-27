<template>
  <q-page class="bg-white text-dark">
    <section class="about-hero public-hero--compact text-center">
      <div class="public-container public-container--narrow">
        <div class="public-eyebrow text-blue-2">About Invify</div>
        <h1 class="public-page-title text-white">{{ t('about.title') }}</h1>
        <p class="public-lead about-hero__lead">{{ t('about.subtitle') }}</p>
      </div>
    </section>

    <section class="public-section">
      <div class="public-container about-content">
        <div>
          <div class="public-eyebrow">Our purpose</div>
          <h2 class="text-h3 text-weight-bold q-mt-none">Make complex operations easier to run</h2>
        </div>
        <div>
          <p class="text-body1 text-grey-8 about-copy">{{ t('about.mission') }}</p>
          <p class="text-body1 text-grey-8 about-copy">We focus on practical connections between invoicing, payment records, inventory, devices, people, and reporting—so teams can work from a clearer operational picture.</p>
        </div>
      </div>
    </section>

    <section class="public-section public-section--muted">
      <div class="public-container">
        <div class="public-section-heading">
          <div class="public-eyebrow">How we build</div>
          <h2>Designed around operational clarity</h2>
        </div>
        <div class="about-values">
          <q-card v-for="value in values" :key="value.title" flat class="public-card">
            <q-card-section>
              <span class="public-card-icon"><q-icon :name="value.icon" size="27px" /></span>
              <h3 class="text-h6 text-weight-bold q-my-none">{{ value.title }}</h3>
              <p class="text-body2 text-grey-8 q-mt-sm q-mb-none">{{ value.body }}</p>
            </q-card-section>
          </q-card>
        </div>
      </div>
    </section>

    <section class="public-cta">
      <div class="public-cta__content">
        <h2>See whether Invify fits your workflow</h2>
        <p>Explore the platform or speak with the team about your organization’s operating needs.</p>
        <div class="public-cta-actions">
          <q-btn unelevated color="white" text-color="primary" no-caps to="/platform" label="Explore Platform" />
          <q-btn outline color="white" no-caps to="/contact" label="Contact Us" />
        </div>
      </div>
    </section>
  </q-page>
</template>
<script setup>
import { usePublicLocale } from '../../composables/usePublicLocale'

const { t } = usePublicLocale()

const values = [
  { icon: 'visibility', title: 'Clarity', body: 'Make important business activity easier for the right teams to understand.' },
  { icon: 'hub', title: 'Connection', body: 'Reduce gaps between operational and financial workflows.' },
  { icon: 'verified_user', title: 'Control', body: 'Keep sensitive work behind defined identity and access boundaries.' }
]
</script>

<style scoped>
.about-hero {
  background: linear-gradient(135deg, #10233f, #1565c0);
}

.about-hero__lead {
  color: rgba(255, 255, 255, 0.86);
}

.about-content {
  display: grid;
  grid-template-columns: 0.85fr 1.15fr;
  gap: clamp(36px, 7vw, 88px);
  align-items: start;
}

.about-copy {
  margin-top: 0;
  font-size: 1.08rem;
  line-height: 1.8;
}

.about-values {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

@media (max-width: 767px) {
  .about-content,
  .about-values {
    grid-template-columns: 1fr;
  }
}
</style>
