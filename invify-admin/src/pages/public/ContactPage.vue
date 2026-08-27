<template>
  <q-page class="contact-page bg-white text-dark">
    <section class="public-hero--compact public-section--muted text-center">
      <div class="public-container public-container--narrow">
        <div class="public-eyebrow">Contact Invify</div>
        <h1 class="public-page-title">Talk to our team</h1>
        <p class="public-lead text-grey-7">Ask about onboarding, product fit, support, or a rollout for your organization.</p>
      </div>
    </section>

    <section class="public-section">
      <div class="public-container">
        <div class="contact-actions">
          <q-card flat class="contact-call-card">
            <q-card-section>
              <span class="public-card-icon"><q-icon name="call" size="27px" /></span>
              <h2 class="text-h4 text-weight-bold q-mt-none q-mb-sm">Call Invify</h2>
              <p class="text-body1 text-grey-7 q-mt-none q-mb-lg">Choose either number to speak with the team.</p>
              <div class="contact-phone-actions">
                <q-btn unelevated color="primary" no-caps icon="call" href="tel:+2348023552282" label="0802 355 2282" />
                <q-btn outline color="primary" no-caps icon="call" href="tel:+2349027033748" label="0902 703 3748" />
              </div>
            </q-card-section>
          </q-card>
          <div>
            <div class="public-eyebrow">Visit us</div>
            <h2 class="text-h4 text-weight-bold q-mt-none q-mb-sm">Lagos offices</h2>
            <p class="text-body1 text-grey-7 q-mt-none">Find the location that is most convenient for you.</p>
          </div>
        </div>

        <div class="office-grid q-mt-xl">
          <q-card v-for="office in offices" :key="office.name" flat class="public-card">
            <q-card-section>
              <span class="public-card-icon"><q-icon name="location_on" size="27px" /></span>
              <h3 class="text-h6 text-weight-bold q-my-none">{{ office.name }}</h3>
              <address class="contact-address text-grey-8 q-mt-sm">{{ office.address }}</address>
            </q-card-section>
          </q-card>
        </div>
      </div>
    </section>
  </q-page>
</template>

<script setup>
const offices = [
  { name: 'Owutu Agric Office', address: '57D TOS Benson Estate, Owutu Agric, Ikorodu, Lagos.' },
  { name: 'Owode Onirin Office', address: 'Line 9, Office 8, Owode Onirin Market, Ikorodu Road, Lagos.' },
  { name: 'Ikeja Office', address: '47 Obafemi Awolowo Way, Ikeja, Lagos.' }
]
</script>

<style scoped>
.contact-actions {
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  gap: clamp(32px, 6vw, 72px);
  align-items: center;
}

.contact-call-card {
  padding: 12px;
  border: 1px solid rgba(25, 118, 210, 0.25);
  border-radius: 18px;
  background: rgba(25, 118, 210, 0.05);
}

.contact-phone-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.contact-phone-actions .q-btn {
  min-height: 48px;
}

.office-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.contact-address {
  font-style: normal;
  line-height: 1.7;
}

@media (max-width: 599px) {
  .contact-phone-actions {
    flex-direction: column;
  }
}

@media (max-width: 767px) {
  .contact-actions,
  .office-grid {
    grid-template-columns: 1fr;
  }
}
</style>
