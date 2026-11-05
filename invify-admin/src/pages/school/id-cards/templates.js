export const ID_CARD_TEMPLATES = [
  { key: 'classic_school', name: 'Classic School', description: 'Landscape school card with a gold header, photo, fields, and a barcode.' },
  { key: 'modern_corporate', name: 'Modern Corporate', description: 'Portrait badge with navy corners, a large name, and a barcode footer.' },
  { key: 'minimal_white', name: 'Minimal White', description: 'Landscape proof-style card with a pale field, photo, and barcode strip.' },
  { key: 'academic_blue', name: 'Academic Blue', description: 'Portrait card with blue wave panels, identity details, and a barcode.' },
  { key: 'premium_identity', name: 'Premium Identity', description: 'Portrait lanyard badge with a blue chevron header and barcode.' },
  { key: 'compact_barcode', name: 'Compact Barcode', description: 'Portrait holder card with a circular mark and a prominent barcode.' }
]

export const DEFAULT_DISCLAIMER = 'This card remains the property of the issuing institution. It must be presented when requested by authorized school personnel. If found, please return it to the issuing institution. Unauthorized use, alteration, or transfer is prohibited.'

const PORTRAIT_KEYS = new Set(['modern_corporate', 'academic_blue', 'premium_identity', 'compact_barcode'])

const TEMPLATE_LOOK = {
  classic_school: { accentColor: '#E8B923', cardWidthMm: 85.6, cardHeightMm: 53.98 },
  modern_corporate: { accentColor: '#1B4F9C', cardWidthMm: 53.98, cardHeightMm: 85.6 },
  minimal_white: { accentColor: '#3D5A80', cardWidthMm: 85.6, cardHeightMm: 53.98 },
  academic_blue: { accentColor: '#0B3D91', cardWidthMm: 53.98, cardHeightMm: 85.6 },
  premium_identity: { accentColor: '#1565D8', cardWidthMm: 53.98, cardHeightMm: 85.6 },
  compact_barcode: { accentColor: '#F5C518', cardWidthMm: 53.98, cardHeightMm: 85.6 }
}

export function templateLook(templateKey) {
  return TEMPLATE_LOOK[templateKey] || TEMPLATE_LOOK.classic_school
}

function hexRgb(value) {
  const hex = normalizeAccent(value).slice(1)
  return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)]
}

function mixHex(value, other, amount) {
  const left = hexRgb(value)
  const right = hexRgb(other)
  const channel = (index) => Math.round(left[index] * (1 - amount) + right[index] * amount)
  return `#${[channel(0), channel(1), channel(2)].map((part) => part.toString(16).padStart(2, '0')).join('').toUpperCase()}`
}

export function normalizeAccent(value, fallback = '#1F4B99') {
  const match = String(value || '').trim().match(/^#?([0-9a-fA-F]{6})$/)
  if (!match) return fallback
  return `#${match[1].toUpperCase()}`
}

export function accentInk(value) {
  const [red, green, blue] = hexRgb(value)
  return (0.299 * red + 0.587 * green + 0.114 * blue) / 255 > 0.58 ? '#111111' : '#FFFFFF'
}

export function accentVars(value, fallback) {
  const accent = normalizeAccent(value, fallback)
  return {
    accent,
    ink: accentInk(accent),
    lift: mixHex(accent, '#FFFFFF', 0.28),
    soft: mixHex(accent, '#FFFFFF', 0.72),
    deep: mixHex(accent, '#05070D', 0.45)
  }
}

export function isPortraitTemplate(templateKey) {
  return PORTRAIT_KEYS.has(templateKey)
}

export function faceClass(templateKey, side) {
  if (!ID_CARD_TEMPLATES.some((template) => template.key === templateKey)) {
    throw new Error('Unknown ID card template.')
  }
  if (side !== 'front' && side !== 'back') throw new Error('A card has a front and a back.')
  return `id-card-face id-card-${templateKey} id-card-${side}`
}

export function sampleFace(templateKey, category = 'STUDENT') {
  const detail = category === 'STUDENT' ? 'JSS 2' : category === 'STAFF' ? 'Teacher' : 'School administrator'
  const code = category === 'STUDENT' ? 'ADM-2041' : category === 'STAFF' ? 'STF-18' : 'ADMIN'
  const name = category === 'STUDENT' ? 'Amaka Okonkwo' : category === 'STAFF' ? 'Ibrahim Musa' : 'School administrator'
  const look = templateLook(templateKey)
  return {
    pairId: `sample-${category.toLowerCase()}`,
    templateKey,
    schoolName: 'Sample Secondary School',
    logoUrl: null,
    address: '12 Harbour Road, Lagos',
    phone: '08000000000',
    photoUrl: null,
    initials: category === 'ADMIN' ? 'SA' : name.split(' ').map((part) => part[0]).join(''),
    fullName: name,
    printedCode: code,
    detail,
    category,
    statusLabel: category === 'STUDENT' ? null : 'Active',
    barcodeValue: null,
    barcodeState: 'not_issued',
    sampleBarcode: 'SAMPLE-NOT-A-TOKEN',
    issuedAt: null,
    expiresAt: null,
    disclaimer: DEFAULT_DISCLAIMER,
    signatoryName: null,
    signatoryDesignation: null,
    signatureUrl: null,
    lostFoundPhone: '08000000000',
    lostFoundEmail: 'office@sample-school.test',
    logoPlacement: 'left',
    accentColor: look.accentColor,
    cardWidthMm: look.cardWidthMm,
    cardHeightMm: look.cardHeightMm,
    paperSize: 'A4',
    showIssueDate: false,
    showExpiry: false,
    sample: true
  }
}
