<template>
  <article
    :class="faceClass(face.templateKey, side)"
    :style="cardStyle"
  >
    <header class="id-card-band" :style="{ textAlign: face.logoPlacement }">
      <div class="id-card-logo">
        <img v-if="showLogo" :src="face.logoUrl" alt="" @error="logoFailed = true" />
        <span v-else>{{ schoolInitials }}</span>
      </div>
      <div>
        <div class="id-card-school">{{ face.schoolName }}</div>
        <div v-if="side === 'front' && face.address" class="id-card-muted">{{ face.address }}</div>
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
        <p>{{ face.printedCode }}</p>
        <p v-if="face.detail" class="id-card-muted">{{ face.detail }}</p>
        <p v-if="face.statusLabel" class="id-card-muted">{{ face.statusLabel }}</p>
        <p v-if="face.showIssueDate && face.issuedAt" class="id-card-muted">Issued {{ issuedLabel }}</p>
        <p v-if="face.showExpiry && face.expiresAt" class="id-card-muted">Expires {{ expiryLabel }}</p>
      </div>
    </div>

    <div v-else class="id-card-back-copy">
      <p>{{ face.disclaimer }}</p>
      <p v-if="face.address" class="id-card-muted">{{ face.address }}</p>
      <p class="id-card-muted">If found, return this card to the school.</p>
      <p v-if="face.lostFoundPhone || face.lostFoundEmail" class="id-card-muted">
        {{ face.lostFoundPhone }} {{ face.lostFoundEmail }}
      </p>
      <div class="id-card-signatory">
        <img v-if="showSignature" :src="face.signatureUrl" alt="" @error="signatureFailed = true" />
        <div>
          <strong>{{ face.signatoryName || 'Authorized signatory' }}</strong>
          <div class="id-card-muted">{{ face.signatoryDesignation || 'School administrator' }}</div>
        </div>
      </div>
    </div>

    <footer v-if="side === 'front'" class="id-card-barcode">
      <div v-if="bars" class="id-card-bars" v-html="bars"></div>
      <div v-else class="id-card-bars id-card-bars-empty">Barcode is issued when the card is printed.</div>
      <div v-if="face.sample" class="id-card-sample">Sample layout</div>
    </footer>
    <footer v-else class="id-card-side-label">Back</footer>
  </article>
</template>

<script>
import { barcodeSvg } from './code128'
import { faceClass } from './templates'

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
      return {
        width: `${this.face.cardWidthMm || 85.6}mm`,
        height: `${this.face.cardHeightMm || 53.98}mm`,
        '--id-accent': this.face.accentColor || '#1F4B99'
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
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 0.4mm solid #1a1a1a;
  background: #fff;
  color: #111;
  font-family: Arial, sans-serif;
}
.id-card-band {
  display: flex;
  gap: 2mm;
  align-items: center;
  padding: 1.6mm 2.4mm;
  background: var(--id-accent);
  color: #fff;
}
.id-card-logo {
  width: 8mm;
  height: 8mm;
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
.id-card-body { display: flex; gap: 2.4mm; padding: 2mm 2.4mm 0; flex: 1; }
.id-card-photo {
  width: 16mm;
  height: 20mm;
  background: #e8eef6;
  color: #1f4b99;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}
.id-card-identity h2 { margin: 0; font-size: 10pt; line-height: 1.15; }
.id-card-identity p { margin: 0.4mm 0 0; font-size: 8pt; }
.id-card-category { font-size: 7pt; letter-spacing: 0.08em; font-weight: 700; }
.id-card-barcode { padding: 1mm 2.4mm 1.4mm; }
.id-card-bars { height: 12mm; background: #fff; }
.id-card-bars :deep(svg) { width: 100%; height: 12mm; display: block; }
.id-card-bars-empty { font-size: 6.5pt; color: #333; display: flex; align-items: center; }
.id-card-sample { font-size: 6.5pt; letter-spacing: 0.06em; text-transform: uppercase; }
.id-card-back-copy { padding: 2mm 2.4mm; font-size: 6.5pt; line-height: 1.3; flex: 1; }
.id-card-back-copy p { margin: 0 0 1mm; }
.id-card-signatory { display: flex; gap: 2mm; align-items: center; margin-top: 1mm; }
.id-card-signatory img { width: 18mm; height: 8mm; object-fit: contain; background: #fff; }
.id-card-side-label { font-size: 6.5pt; text-align: right; padding: 0 2mm 1mm; color: #444; }
.id-card-classic_school .id-card-identity h2 { font-family: Georgia, serif; }
.id-card-modern_corporate { border-left: 2.2mm solid var(--id-accent); }
.id-card-modern_corporate .id-card-band { background: #fff; color: #172033; }
.id-card-minimal_white .id-card-band { background: #fff; color: #111; border-bottom: 0.3mm solid #111; }
.id-card-academic_blue .id-card-band { background: #0b3a75; }
.id-card-premium_identity .id-card-band { background: #1b1b1b; }
.id-card-premium_identity { box-shadow: inset 0 -0.8mm 0 var(--id-accent); }
.id-card-compact_barcode .id-card-photo { width: 12mm; height: 15mm; }
.id-card-compact_barcode .id-card-bars { height: 16mm; }
.id-card-compact_barcode .id-card-bars :deep(svg) { height: 16mm; }
</style>
