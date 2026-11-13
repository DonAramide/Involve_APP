<template>
  <article
    :class="faceClass(face.templateKey, side)"
    :style="cardStyle"
  >
    <div class="id-card-deco" aria-hidden="true">
      <span class="id-card-corner id-card-corner-tl"></span>
      <span class="id-card-corner id-card-corner-br"></span>
      <span class="id-card-wave id-card-wave-a"></span>
      <span class="id-card-wave id-card-wave-b"></span>
      <span class="id-card-wave id-card-wave-c"></span>
      <span class="id-card-hologram">{{ face.category }}</span>
    </div>

    <header class="id-card-band id-card-band-centered">
      <div class="id-card-logo">
        <img v-if="showLogo" :src="face.logoUrl" alt="" @error="logoFailed = true" />
        <span v-else>{{ schoolInitials }}</span>
      </div>
      <div class="id-card-band-copy">
        <div class="id-card-school">{{ face.schoolName }}</div>
        <div v-if="face.address" class="id-card-muted id-card-address">{{ face.address }}</div>
      </div>
    </header>

    <div v-if="side === 'front'" class="id-card-body">
      <div class="id-card-photo">
        <img v-if="showPhoto" :src="face.photoUrl" alt="" @error="photoFailed = true" />
        <span v-else>{{ face.initials || 'ID' }}</span>
      </div>
      <div class="id-card-identity">
        <div class="id-card-category">{{ face.category }}</div>
        <h2>{{ face.fullName }}</h2>
        <p class="id-card-role">{{ face.detail }}</p>
        <p v-if="face.statusLabel" class="id-card-muted">{{ face.statusLabel }}</p>
        <dl class="id-card-meta">
          <div>
            <dt>ID No</dt>
            <dd>{{ face.printedCode }}</dd>
          </div>
          <div v-if="face.detail">
            <dt>{{ face.category === 'STUDENT' ? 'Class' : 'Role' }}</dt>
            <dd>{{ face.detail }}</dd>
          </div>
          <div v-if="face.lostFoundPhone">
            <dt>Lost card</dt>
            <dd>{{ face.lostFoundPhone }}</dd>
          </div>
          <div v-if="face.lostFoundEmail">
            <dt>Lost email</dt>
            <dd>{{ face.lostFoundEmail }}</dd>
          </div>
          <div v-if="face.showIssueDate && face.issuedAt">
            <dt>Issued</dt>
            <dd>{{ issuedLabel }}</dd>
          </div>
          <div v-if="face.showExpiry && face.expiresAt">
            <dt>Expires</dt>
            <dd>{{ expiryLabel }}</dd>
          </div>
        </dl>
      </div>
    </div>

    <div v-else class="id-card-back-copy">
      <p class="id-card-back-title">Terms and conditions</p>
      <p class="id-card-disclaimer">{{ face.disclaimer }}</p>
      <p v-if="face.address" class="id-card-muted">{{ face.address }}</p>
      <p class="id-card-lost-found">
        If found, return this card to the school.
        <span v-if="face.lostFoundPhone || face.lostFoundEmail">
          Contact: {{ [face.lostFoundPhone, face.lostFoundEmail].filter(Boolean).join(' · ') }}
        </span>
      </p>
      <div class="id-card-signatory">
        <img v-if="showSignature" :src="face.signatureUrl" alt="" @error="signatureFailed = true" />
        <div>
          <strong>{{ face.signatoryName || 'Authorized signatory' }}</strong>
          <div class="id-card-muted">{{ face.signatoryDesignation || 'School administrator' }}</div>
        </div>
      </div>
    </div>

    <footer class="id-card-barcode">
      <div v-if="bars" class="id-card-bars" v-html="bars"></div>
      <div v-else class="id-card-bars id-card-bars-empty">Barcode is issued when the card is printed.</div>
      <div v-if="face.printedCode" class="id-card-barcode-caption">{{ face.printedCode }}</div>
      <div v-if="face.sample && side === 'front'" class="id-card-sample">Sample layout</div>
    </footer>
    <div class="id-card-footer-bar">{{ face.schoolName }}</div>
  </article>
</template>

<script>
import { barcodeSvg } from './code128'
import { accentVars, faceClass, templateLook } from './templates'

export default {
  name: 'IdCardFace',
  props: {
    face: { type: Object, required: true },
    side: { type: String, required: true }
  },
  data() {
    return { logoFailed: false, photoFailed: false, signatureFailed: false }
  },
  computed: {
    cardStyle() {
      const look = templateLook(this.face.templateKey)
      const tones = accentVars(this.face.accentColor, look.accentColor)
      return {
        width: `${look.cardWidthMm}mm`,
        height: `${look.cardHeightMm}mm`,
        '--id-accent': tones.accent,
        '--id-accent-ink': tones.ink,
        '--id-accent-lift': tones.lift,
        '--id-accent-soft': tones.soft,
        '--id-accent-deep': tones.deep
      }
    },
    schoolInitials() {
      return String(this.face.schoolName || 'School').split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase()
    },
    showLogo() {
      return Boolean(this.face.logoUrl && String(this.face.logoUrl).startsWith('https://') && !this.logoFailed)
    },
    showPhoto() {
      return Boolean(this.face.photoUrl && String(this.face.photoUrl).startsWith('https://') && !this.photoFailed)
    },
    showSignature() {
      return Boolean(this.face.signatureUrl && String(this.face.signatureUrl).startsWith('https://') && !this.signatureFailed)
    },
    bars() {
      const value = this.face.sample ? this.face.sampleBarcode : this.face.barcodeValue
      if (!value) return ''
      try {
        return barcodeSvg(value)
      } catch (error) {
        return ''
      }
    },
    issuedLabel() {
      return this.face.issuedAt ? String(this.face.issuedAt).slice(0, 10) : ''
    },
    expiryLabel() {
      return this.face.expiresAt ? String(this.face.expiresAt).slice(0, 10) : ''
    }
  },
  methods: { faceClass }
}
</script>

<style scoped>
.id-card-face {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 0.4mm solid #1a1a1a;
  background: #fff;
  color: #111;
  font-family: Arial, Helvetica, sans-serif;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.id-card-deco {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}
.id-card-corner,
.id-card-wave,
.id-card-hologram { display: none; }
.id-card-band,
.id-card-body,
.id-card-back-copy,
.id-card-barcode,
.id-card-footer-bar { position: relative; z-index: 1; }
.id-card-band {
  display: flex;
  gap: 2mm;
  align-items: center;
  padding: 1.6mm 2.4mm;
  background: var(--id-accent);
  color: var(--id-accent-ink);
}
.id-card-band-centered {
  position: relative;
  justify-content: center;
  text-align: center;
}
.id-card-band-centered .id-card-logo {
  position: absolute;
  left: 2.4mm;
  top: 50%;
  transform: translateY(-50%);
}
.id-card-band-centered .id-card-band-copy {
  width: 100%;
  padding: 0 10mm;
}
.id-card-band-centered .id-card-school,
.id-card-band-centered .id-card-address {
  text-align: center;
}
.id-card-logo {
  width: 8mm;
  height: 8mm;
  flex: 0 0 auto;
  border-radius: 1mm;
  background: #fff;
  color: #123;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 8pt;
  font-weight: 700;
  overflow: hidden;
}
.id-card-logo img,
.id-card-photo img,
.id-card-signatory img { width: 100%; height: 100%; object-fit: cover; }
.id-card-school { font-size: 8pt; font-weight: 700; line-height: 1.15; }
.id-card-muted { font-size: 6.5pt; line-height: 1.2; opacity: 0.85; }
.id-card-body { display: flex; gap: 2.4mm; padding: 2mm 2.4mm 0; flex: 1; min-height: 0; }
.id-card-photo {
  width: 16mm;
  height: 20mm;
  flex: 0 0 auto;
  background: var(--id-accent-soft);
  color: var(--id-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  overflow: hidden;
}
.id-card-identity { min-width: 0; flex: 1; }
.id-card-identity h2 { margin: 0; font-size: 10pt; line-height: 1.15; }
.id-card-identity p { margin: 0.4mm 0 0; font-size: 8pt; }
.id-card-category {
  display: inline-block;
  font-size: 6.5pt;
  letter-spacing: 0.08em;
  font-weight: 700;
  text-transform: uppercase;
}
.id-card-role { display: none; }
.id-card-meta {
  margin: 1mm 0 0;
  display: grid;
  gap: 0.3mm;
}
.id-card-meta > div { display: grid; grid-template-columns: 12mm 1fr; gap: 1mm; align-items: baseline; }
.id-card-meta dt {
  margin: 0;
  font-size: 6pt;
  font-weight: 700;
  color: #334;
}
.id-card-meta dd {
  margin: 0;
  font-size: 6.5pt;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.id-card-barcode { padding: 1mm 2.4mm 1.4mm; flex-shrink: 0; }
.id-card-bars { height: 12mm; background: #fff; }
.id-card-bars svg,
.id-card-bars :deep(svg) { width: 100%; height: 12mm; display: block; }
.id-card-bars-empty { font-size: 6.5pt; color: #333; display: flex; align-items: center; }
.id-card-barcode-caption { font-size: 6pt; letter-spacing: 0.08em; margin-top: 0.4mm; }
.id-card-sample { font-size: 6pt; letter-spacing: 0.06em; text-transform: uppercase; }
.id-card-back-title { font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
.id-card-back-copy { padding: 2.2mm 2.6mm; font-size: 7.2pt; line-height: 1.35; flex: 1; min-height: 0; overflow: hidden; }
.id-card-back-copy p { margin: 0 0 1.2mm; }
.id-card-back-title { font-size: 7.5pt; }
.id-card-disclaimer { font-size: 7pt; line-height: 1.35; }
.id-card-signatory { display: flex; gap: 2mm; align-items: center; margin-top: 1mm; }
.id-card-signatory img { width: 18mm; height: 8mm; object-fit: contain; background: #fff; }
.id-card-footer-bar { display: none; flex-shrink: 0; }

/* Classic School — gold header landscape, Vision Academy style */
.id-card-classic_school .id-card-band {
  background: linear-gradient(180deg, var(--id-accent-lift) 0%, var(--id-accent) 100%);
  color: var(--id-accent-ink);
}
.id-card-classic_school .id-card-school {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 10pt;
  color: var(--id-accent-ink);
}
.id-card-classic_school .id-card-address { color: #3a3a3a; opacity: 1; }
.id-card-classic_school .id-card-identity h2 {
  font-family: Georgia, 'Times New Roman', serif;
  color: var(--id-accent);
  font-size: 11pt;
}
.id-card-classic_school .id-card-body { padding-top: 1.2mm; }
.id-card-classic_school .id-card-photo { height: 18mm; border: 0.35mm solid var(--id-accent); }
.id-card-classic_school .id-card-category { color: var(--id-accent); }
.id-card-classic_school .id-card-meta > div:nth-child(n+3) { display: none; }
.id-card-classic_school .id-card-barcode { padding: 0.5mm 2.4mm 0.8mm; }
.id-card-classic_school.id-card-back .id-card-band { min-height: 8mm; }
.id-card-classic_school.id-card-back .id-card-disclaimer {
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.id-card-lost-found { font-weight: 600; }

/* Modern Corporate — portrait, navy corners, Ingoude style */
.id-card-modern_corporate {
  border-radius: 2.4mm;
  padding-top: 1mm;
  background: #fff;
}
.id-card-modern_corporate .id-card-corner { display: block; position: absolute; }
.id-card-modern_corporate .id-card-corner-tl {
  top: 0;
  left: 0;
  width: 16mm;
  height: 16mm;
  background: linear-gradient(135deg, var(--id-accent) 52%, transparent 53%);
}
.id-card-modern_corporate .id-card-corner-br {
  right: 0;
  bottom: 0;
  width: 22mm;
  height: 16mm;
  background: linear-gradient(-45deg, var(--id-accent) 50%, transparent 51%);
}
.id-card-modern_corporate .id-card-band {
  background: transparent;
  color: var(--id-accent);
  justify-content: flex-end;
  padding-top: 3mm;
}
.id-card-modern_corporate .id-card-address { display: none; }
.id-card-modern_corporate .id-card-body { flex-direction: column; }
.id-card-modern_corporate .id-card-photo {
  width: 28mm;
  height: 30mm;
  border-radius: 2.4mm;
}
.id-card-modern_corporate .id-card-identity h2 {
  font-size: 13pt;
  color: var(--id-accent);
  margin-top: 1mm;
}
.id-card-modern_corporate .id-card-category {
  background: var(--id-accent);
  color: var(--id-accent-ink);
  border-radius: 1.2mm;
  padding: 0.6mm 2mm;
  margin: 1.2mm 0 1mm;
}
.id-card-modern_corporate .id-card-role { display: none; }
.id-card-modern_corporate .id-card-meta > div { grid-template-columns: 11mm 1fr; }
.id-card-modern_corporate .id-card-barcode { padding-bottom: 4mm; }
.id-card-modern_corporate.id-card-back .id-card-band { justify-content: flex-start; }

/* Minimal White — landscape proof card, CitizenCard style */
.id-card-minimal_white {
  background:
    radial-gradient(circle at 78% 42%, rgba(255, 255, 255, 0.85) 0, rgba(255, 255, 255, 0) 36%),
    repeating-linear-gradient(45deg, #e4edf7 0 1.2mm, #dce6f2 1.2mm 2.4mm);
  border-color: #9aa8bc;
}
.id-card-minimal_white .id-card-hologram {
  display: flex;
  position: absolute;
  right: 3mm;
  top: 14mm;
  width: 22mm;
  height: 16mm;
  align-items: center;
  justify-content: center;
  font-size: 9pt;
  font-weight: 800;
  letter-spacing: 0.12em;
  color: #fff;
  background: linear-gradient(135deg, var(--id-accent-lift), var(--id-accent) 40%, var(--id-accent-soft) 70%, var(--id-accent));
  border: 0.3mm solid #cfd8e4;
  z-index: 1;
}
.id-card-minimal_white .id-card-band {
  background: transparent;
  color: #111;
  border-bottom: 0;
  padding-bottom: 0;
}
.id-card-minimal_white .id-card-school {
  font-size: 11pt;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.id-card-minimal_white .id-card-address { display: none; }
.id-card-minimal_white .id-card-photo { width: 18mm; height: 22mm; background: #cfd8e4; }
.id-card-minimal_white .id-card-identity h2 { font-size: 11pt; }
.id-card-minimal_white .id-card-meta > div { grid-template-columns: 14mm 1fr; }
.id-card-minimal_white .id-card-meta > div:nth-child(n+3) { display: none; }
.id-card-minimal_white .id-card-barcode { padding: 0.5mm 26mm 0.8mm 2.4mm; }
.id-card-minimal_white.id-card-back .id-card-hologram { display: none; }

/* Academic Blue — portrait waves, Graphics Family style */
.id-card-academic_blue { background: #f7fbff; }
.id-card-academic_blue .id-card-wave {
  display: block;
  position: absolute;
  border-radius: 50%;
}
.id-card-academic_blue .id-card-wave-a {
  top: -12mm;
  right: -14mm;
  width: 42mm;
  height: 34mm;
  background: var(--id-accent);
}
.id-card-academic_blue .id-card-wave-b {
  top: 4mm;
  right: -10mm;
  width: 28mm;
  height: 22mm;
  background: var(--id-accent-lift);
  opacity: 0.9;
}
.id-card-academic_blue .id-card-wave-c {
  left: -12mm;
  bottom: -10mm;
  width: 36mm;
  height: 24mm;
  background: var(--id-accent);
}
.id-card-academic_blue .id-card-band {
  background: transparent;
  color: var(--id-accent);
  padding-top: 3mm;
}
.id-card-academic_blue .id-card-school { max-width: 28mm; }
.id-card-academic_blue .id-card-address { display: none; }
.id-card-academic_blue .id-card-meta > div:nth-child(n+3) { display: none; }
.id-card-academic_blue .id-card-body { flex-direction: column; align-items: center; text-align: center; }
.id-card-academic_blue .id-card-photo {
  width: 22mm;
  height: 24mm;
  border-radius: 1.6mm;
  border: 0.4mm solid var(--id-accent);
}
.id-card-academic_blue .id-card-identity { width: 100%; }
.id-card-academic_blue .id-card-identity h2 { color: var(--id-accent); font-size: 11pt; margin-top: 1.4mm; }
.id-card-academic_blue .id-card-category { color: var(--id-accent-lift); }
.id-card-academic_blue .id-card-meta > div { grid-template-columns: 12mm 1fr; text-align: left; }
.id-card-academic_blue .id-card-barcode { padding-bottom: 5mm; }
.id-card-academic_blue.id-card-back {
  background: #111820;
  color: #eef4ff;
}
.id-card-academic_blue.id-card-back .id-card-band { color: #fff; }
.id-card-academic_blue.id-card-back .id-card-wave-a { background: var(--id-accent-lift); }
.id-card-academic_blue.id-card-back .id-card-bars { background: #fff; }

/* Premium Identity — portrait chevron header, Adi Barbu style */
.id-card-premium_identity { background: #fff; }
.id-card-premium_identity .id-card-band {
  background: var(--id-accent);
  color: var(--id-accent-ink);
  min-height: 18mm;
  align-items: flex-start;
  padding-bottom: 7mm;
  clip-path: polygon(0 0, 100% 0, 100% 68%, 50% 100%, 0 68%);
}
.id-card-premium_identity .id-card-address { display: none; }
.id-card-premium_identity .id-card-body { flex-direction: column; align-items: center; text-align: center; margin-top: -2mm; }
.id-card-premium_identity .id-card-photo {
  width: 20mm;
  height: 22mm;
  border: 0.45mm solid var(--id-accent);
  background: var(--id-accent-soft);
}
.id-card-premium_identity .id-card-identity h2 {
  color: var(--id-accent);
  text-transform: uppercase;
  font-size: 11pt;
  margin-top: 1.5mm;
}
.id-card-premium_identity .id-card-role {
  display: block;
  color: var(--id-accent);
  font-size: 7.5pt;
  font-weight: 700;
}
.id-card-premium_identity .id-card-category { display: none; }
.id-card-premium_identity .id-card-meta { text-align: left; }
.id-card-premium_identity .id-card-barcode { padding-bottom: 0.4mm; }
.id-card-premium_identity .id-card-footer-bar {
  display: block;
  background: var(--id-accent);
  color: var(--id-accent-ink);
  text-align: center;
  font-size: 6pt;
  font-weight: 700;
  padding: 1.2mm 2mm;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.id-card-premium_identity.id-card-back .id-card-band {
  clip-path: none;
  min-height: 10mm;
  padding-bottom: 1.6mm;
}

/* Compact Barcode — portrait holder, CL Speed style */
.id-card-compact_barcode { background: #fff; }
.id-card-compact_barcode .id-card-band {
  background: var(--id-accent-deep);
  color: #fff;
  flex-direction: column;
  justify-content: center;
  text-align: center;
  padding: 1.6mm 2mm 1.2mm;
  gap: 1mm;
}
.id-card-compact_barcode .id-card-logo {
  width: 11mm;
  height: 11mm;
  border-radius: 50%;
  border: 0.55mm solid var(--id-accent);
  color: var(--id-accent-deep);
}
.id-card-compact_barcode .id-card-school { font-size: 7pt; letter-spacing: 0.04em; }
.id-card-compact_barcode .id-card-address { display: none; }
.id-card-compact_barcode .id-card-body {
  flex-direction: column;
  align-items: center;
  text-align: center;
}
.id-card-compact_barcode .id-card-photo {
  width: 18mm;
  height: 20mm;
  border-radius: 1mm;
}
.id-card-compact_barcode .id-card-identity h2 {
  font-size: 12pt;
  text-transform: uppercase;
  margin-top: 1.4mm;
}
.id-card-compact_barcode .id-card-category { color: var(--id-accent-deep); }
.id-card-compact_barcode .id-card-meta { display: none; }
.id-card-compact_barcode .id-card-role { display: block; font-weight: 700; color: var(--id-accent-deep); }
.id-card-compact_barcode .id-card-bars { height: 16mm; }
.id-card-compact_barcode .id-card-bars svg,
.id-card-compact_barcode .id-card-bars :deep(svg) { height: 16mm; }
.id-card-compact_barcode .id-card-footer-bar {
  display: block;
  background: var(--id-accent);
  color: var(--id-accent-ink);
  text-align: center;
  font-size: 7pt;
  font-weight: 800;
  padding: 1.4mm 2mm;
  letter-spacing: 0.04em;
}
.id-card-compact_barcode.id-card-back .id-card-band { flex-direction: row; }
.id-card-compact_barcode.id-card-back .id-card-meta { display: grid; }
</style>
