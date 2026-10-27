import fs from 'fs'
import path from 'path'
import { barcodeSvg, code128PatternCount, encodeCode128B } from '../src/pages/school/id-cards/code128'
import { buildPrintPlan, pairsStayWithTheSamePerson } from '../src/pages/school/id-cards/print-plan'
import { faceClass, ID_CARD_TEMPLATES, sampleFace } from '../src/pages/school/id-cards/templates'

describe('school ID card templates and print layout', () => {
  test('all six templates render a front and a back', () => {
    expect(ID_CARD_TEMPLATES.map((template) => template.key)).toEqual([
      'classic_school',
      'modern_corporate',
      'minimal_white',
      'academic_blue',
      'premium_identity',
      'compact_barcode'
    ])
    ID_CARD_TEMPLATES.forEach((template) => {
      expect(faceClass(template.key, 'front')).toContain(template.key)
      expect(faceClass(template.key, 'back')).toContain('id-card-back')
      const face = sampleFace(template.key, 'STUDENT')
      expect(face.photoUrl).toBeNull()
      expect(face.initials).toBe('AO')
      expect(face.barcodeValue).toBeNull()
    })
  })

  test('front and back pages stay paired and each sheet can break', () => {
    const people = [
      sampleFace('classic_school', 'STUDENT'),
      sampleFace('modern_corporate', 'STAFF'),
      sampleFace('premium_identity', 'ADMIN')
    ]
    const duplex = buildPrintPlan(people, 'duplex')
    const manual = buildPrintPlan(people, 'manual')
    expect(duplex.pages).toHaveLength(6)
    expect(manual.pages).toHaveLength(6)
    expect(pairsStayWithTheSamePerson(duplex)).toBe(true)
    expect(pairsStayWithTheSamePerson(manual)).toBe(true)
    expect(manual.pages.filter((page) => page.pass === 2).map((page) => page.pairId)).toEqual(
      manual.pages.filter((page) => page.pass === 1).map((page) => page.pairId)
    )
    expect(duplex.pages[0].pairId).toBe(duplex.pages[1].pairId)
    expect(duplex.pages[0].side).toBe('front')
    expect(duplex.pages[1].side).toBe('back')
    expect(duplex.instruction.toLowerCase()).toContain('flip on the long edge')
    expect(duplex.instruction.toLowerCase()).toContain('varies')
    expect(manual.pages.filter((page) => page.pass === 2)).toHaveLength(3)
    expect(manual.pages.every((page) => page.person.pairId === page.pairId)).toBe(true)
    const swapped = {
      mode: 'manual',
      pages: [
        { pairId: people[0].pairId, sequence: 0, side: 'front', pass: 1, person: people[0] },
        { pairId: people[1].pairId, sequence: 0, side: 'back', pass: 2, person: people[1] }
      ]
    }
    expect(pairsStayWithTheSamePerson(swapped)).toBe(false)
  })

  test('Code 128 bars are high contrast and do not print the token as text', () => {
    expect(code128PatternCount()).toBe(107)
    const secret = 'SAMPLE-NOT-A-TOKEN'
    const svg = barcodeSvg(secret)
    expect(svg).toContain('fill="#000000"')
    expect(svg).toContain('fill="#ffffff"')
    expect(svg).not.toContain(secret)
    expect(encodeCode128B(secret)[0]).toBe(104)
    expect(encodeCode128B(secret)[encodeCode128B(secret).length - 1]).toBe(106)
  })

  test('the management page hides non-print controls and does not send a tenant id', () => {
    const page = fs.readFileSync(path.join(__dirname, '../src/pages/school/IdCardManagementPage.vue'), 'utf8')
    const face = fs.readFileSync(path.join(__dirname, '../src/pages/school/id-cards/IdCardFace.vue'), 'utf8')
    const api = fs.readFileSync(path.join(__dirname, '../src/api/schoolIdCards.js'), 'utf8')
    expect(page).toContain('@media print')
    expect(page).toContain('id-card-no-print')
    expect(page).toContain('id-print-sheet')
    expect(page).toContain('break-after: page')
    expect(page).toContain('page-break-after: always')
    expect(page).toContain('.q-header')
    expect(page).toContain('.q-drawer')
    expect(page).toContain('.q-footer')
    expect(page).toContain('Duplex sheet')
    expect(page).toContain('Pass ${page.pass}')
    expect(page).not.toContain('attendance')
    expect(face).toContain('@error="photoFailed = true"')
    expect(face).toContain('face.initials')
    expect(face).toContain('height: 12mm')
    expect(face).toContain('height: 16mm')
    const barcode = fs.readFileSync(path.join(__dirname, '../src/pages/school/id-cards/code128.js'), 'utf8')
    expect(barcode).toContain('fill="#000000"')
    expect(barcode).toContain('height = 60')
    expect(face).toContain('@error="signatureFailed = true"')
    expect(face).not.toContain('pairId')
    ID_CARD_TEMPLATES.forEach((template) => expect(face).toContain(template.key))
    expect(api).not.toContain('tenantId')
    expect(api).not.toContain('X-Tenant-ID')
  })
})
