export const ID_CARD_TEMPLATES = [
  { key: 'classic_school', name: 'Classic School', description: 'Formal institutional band and a serif name.' },
  { key: 'modern_corporate', name: 'Modern Corporate', description: 'Contemporary layout with a structured side accent.' },
  { key: 'minimal_white', name: 'Minimal White', description: 'Clean layout that uses less ink.' },
  { key: 'academic_blue', name: 'Academic Blue', description: 'Education-focused blue header.' },
  { key: 'premium_identity', name: 'Premium Identity', description: 'Polished branded header and accent line.' },
  { key: 'compact_barcode', name: 'Compact Barcode', description: 'Clear identity details with a prominent barcode.' }
]

export const DEFAULT_DISCLAIMER = 'This card remains the property of the issuing institution. It must be presented when requested by authorized school personnel. If found, please return it to the issuing institution. Unauthorized use, alteration, or transfer is prohibited.'

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
    accentColor: '#1F4B99',
    cardWidthMm: 85.6,
    cardHeightMm: 53.98,
    paperSize: 'A4',
    showIssueDate: false,
    showExpiry: false,
    sample: true
  }
}
