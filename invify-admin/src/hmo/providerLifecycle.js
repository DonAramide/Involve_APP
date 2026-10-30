/** Maps hw_providers.integration_status to Super Admin governance labels. */
export const PROVIDER_STATUS_LABELS = {
  none: 'DRAFT',
  pending_verification: 'PENDING_APPROVAL',
  verified: 'ACTIVE',
  rejected: 'REJECTED',
  suspended: 'SUSPENDED',
  sandbox: 'SANDBOX'
}

export const PROVIDER_STATUS_COLORS = {
  none: 'grey-7',
  pending_verification: 'amber-8',
  verified: 'teal-8',
  rejected: 'red-8',
  suspended: 'orange-9',
  sandbox: 'blue-grey-7'
}

export function providerGovernanceLabel(status) {
  const key = String(status || 'none')
  return PROVIDER_STATUS_LABELS[key] || key.toUpperCase()
}

export function providerStatusColor(status) {
  return PROVIDER_STATUS_COLORS[String(status || 'none')] || 'grey-7'
}

export function isProviderAssignable(status) {
  return String(status || '') === 'verified'
}

export function emptyProviderRegistrationForm() {
  return {
    code: '',
    displayName: '',
    legalName: '',
    licenceReference: '',
    regulatorType: 'NHIA',
    licenceExpiry: '',
    contactEmail: '',
    contactPhone: '',
    websiteUrl: '',
    headOfficeAddress: '',
    state: '',
    lga: '',
    contactPersonName: '',
    contactPersonEmail: '',
    contactPersonPhone: '',
    description: '',
    logoImage: ''
  }
}

export const REGULATOR_OPTIONS = [
  { label: 'NHIA', value: 'NHIA' },
  { label: 'NAICOM', value: 'NAICOM' },
  { label: 'State HMO', value: 'STATE_HMO' },
  { label: 'Other', value: 'OTHER' }
]

export const PROVIDER_STATUS_FILTERS = [
  { label: 'All statuses', value: '' },
  { label: 'Draft', value: 'none' },
  { label: 'Pending approval', value: 'pending_verification' },
  { label: 'Active', value: 'verified' },
  { label: 'Suspended', value: 'suspended' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Sandbox', value: 'sandbox' }
]
