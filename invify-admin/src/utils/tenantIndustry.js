export function tenantIndustry(raw = typeof localStorage !== 'undefined' ? localStorage.getItem('tenant_type') : '') {
  const mode = String(raw || '').toLowerCase()
  if (mode.includes('school') || mode.includes('education')) return 'school'
  if (mode.includes('service') || mode.includes('hospitality')) return 'services'
  if (mode.includes('retail') || mode.includes('order') || mode.includes('pos')) return 'retail'
  return mode || 'retail'
}

export function industryLabel(raw) {
  const mode = tenantIndustry(raw)
  if (mode === 'school') return 'SCHOOL'
  if (mode === 'services') return 'SERVICE'
  if (mode === 'retail') return 'RETAIL'
  return mode.toUpperCase()
}

export function industryWorkplace(raw) {
  const mode = tenantIndustry(raw)
  if (mode === 'school') return 'school'
  if (mode === 'services') return 'service business'
  return 'retail business'
}
