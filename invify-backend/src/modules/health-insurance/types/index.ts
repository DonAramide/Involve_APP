// invify-backend/src/modules/health-insurance/types/index.ts

export type HealthMemberCategory = 
  | 'student' 
  | 'teaching_staff' 
  | 'non_teaching_staff' 
  | 'dependant' 
  | 'retail_employee' 
  | 'services_member';

export type HealthMode = 'school' | 'retail' | 'services';

export type EnrolmentStatus = 
  | 'draft'
  | 'enrolment_pending'
  | 'awaiting_verification'
  | 'awaiting_premium_payment'
  | 'awaiting_insurer_activation'
  | 'active'
  | 'suspended'
  | 'expired'
  | 'cancelled'
  | 'rejected';

export type PolicyStatus = 
  | 'pending'
  | 'active'
  | 'suspended'
  | 'expired'
  | 'cancelled'
  | 'rejected_by_provider';

export type InvoiceStatus = 
  | 'draft'
  | 'issued'
  | 'partially_paid'
  | 'paid'
  | 'void'
  | 'refunded';

export type PaymentStatus = 
  | 'initiated'
  | 'pending'
  | 'successful'
  | 'failed'
  | 'reversed'
  | 'refunded';

export type GuardianLinkStatus = 
  | 'invited'
  | 'pending_verification'
  | 'verified'
  | 'rejected'
  | 'revoked'
  | 'expired';

export type HealthPermission = 
  | 'health.settings.manage'
  | 'health.plans.manage'
  | 'health.members.read'
  | 'health.members.manage'
  | 'health.students.access'
  | 'health.staff.access'
  | 'health.hr_admin'
  | 'health.enrolments.manage'
  | 'health.enrolments.verify'
  | 'health.guardians.manage'
  | 'health.billing.read'
  | 'health.billing.manage'
  | 'health.reports.read'
  | 'health.exports.run'
  | 'health.audit.read'
  | 'health.claims.read'
  | 'health.claims.manage';

export type PlatformHealthPermission = 
  | 'platform.providers.manage'
  | 'platform.plans.manage'
  | 'platform.tenants.onboard'
  | 'platform.integration.health'
  | 'platform.tenant_access'
  | 'platform.finance.view'
  | 'platform.finance.manage'
  | 'platform.agreements.approve'
  | 'platform.statements.approve'
  | 'platform.finance.reconcile';

/** Permissions that may be issued via platform grant APIs once DB CHECK allows them. */
export const PLATFORM_GRANTABLE_PERMISSIONS: PlatformHealthPermission[] = [
  'platform.providers.manage',
  'platform.plans.manage',
  'platform.tenants.onboard',
  'platform.integration.health',
  'platform.tenant_access',
  'platform.finance.view',
  'platform.finance.manage',
  'platform.agreements.approve',
  'platform.statements.approve',
  'platform.finance.reconcile'
];

export interface HealthContext {
  tenantId: string;
  userId: string;
  userEmail?: string;
  permissions: string[];
  isPlatformOperator: boolean;
  isGuardian: boolean;
  guardianStudentIds?: string[];
  platformReason?: string;
}
