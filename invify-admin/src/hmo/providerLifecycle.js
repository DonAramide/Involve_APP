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

export const PROVIDER_CHANNEL_LABELS = {
  platform: 'Platform',
  self_service: 'Self-service',
  agent: 'Agent / institute'
}

export function providerChannelLabel(channel) {
  const key = String(channel || 'platform')
  return PROVIDER_CHANNEL_LABELS[key] || key
}

export function emptyProviderRegistrationForm() {
  return {
    code: '',
    displayName: '',
    legalName: '',
    licenceReference: '',
    regulatorType: 'NHIA',
    registrationChannel: 'platform',
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

export const REGISTRATION_CHANNEL_OPTIONS = [
  { label: 'Platform (Super Admin)', value: 'platform' },
  { label: 'Self-service HMO', value: 'self_service' },
  { label: 'Agent / institute onboarded', value: 'agent' }
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

export const PROVIDER_CHANNEL_FILTERS = [
  { label: 'All channels', value: '' },
  { label: 'Platform', value: 'platform' },
  { label: 'Self-service', value: 'self_service' },
  { label: 'Agent / institute', value: 'agent' }
]
